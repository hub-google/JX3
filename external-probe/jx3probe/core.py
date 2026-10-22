"""依據用戶提供的 2026-10-22 逆向筆記，做外部進程讀取與受控目標寫入。"""
import math
import struct
import threading
from dataclasses import replace
from typing import Optional

from .models import Buff, Loot, Snapshot, Unit


class ProbeError(Exception):
    pass


class MemoryFault(ProbeError):
    pass


class ExternalProbe:
    def __init__(self, memory, module_base: int, config: dict, enable_target_write=False):
        self.mem = memory
        self.base = module_base
        self.cfg = config
        self.write_enabled = enable_target_write
        self.lock = threading.RLock()
        self.max_units = 4096
        self.max_loot = 2048
        self._cached_loot: list[Loot] = []
        self._grid_key = None

    def off(self, key):
        return int(self.cfg[key], 0) if isinstance(self.cfg[key], str) else int(self.cfg[key])

    def ptr(self, address: int) -> int:
        return self.mem.read_u64(address)

    def i32(self, address: int) -> int:
        return self.mem.read_i32(address)

    def u32(self, address: int) -> int:
        return self.mem.read_u32(address)

    def world(self) -> int:
        addr = self.ptr(self.base + self.off("kworld_rva"))
        if not is_pointer(addr):
            raise ProbeError("無法定位 KWorld：遊戲未載入、權限不足或偏移版本已失效")
        return addr

    def manager(self, world: int) -> int:
        mgr = self.ptr(world + self.off("manager_offset"))
        if not is_pointer(mgr):
            raise ProbeError("KWorld 單位管理器指標無效，可能需要重新校驗偏移")
        return mgr

    def nodes(self, manager: int):
        """文章描述的類 STL 紅黑樹。缺少 parent 描述，預設 head+8 是 root。"""
        head = None
        root = None
        for candidate_off in (self.off("map_head_primary"), self.off("map_head_fallback")):
            try:
                p = self.ptr(manager + candidate_off)
                if not is_pointer(p):
                    continue
                r = self.ptr(p + 0x08)
                if r == p:
                    return
                if is_pointer(r):
                    head, root = p, r
                    break
            except (MemoryFault, OSError):
                continue
        if root is None:
            raise ProbeError("無法判定紅黑樹根節點（head/root 結構未通過校驗）")
        visited = set()
        todo = [root]
        while todo:
            node = todo.pop()
            if not is_pointer(node) or node == head or node in visited:
                continue
            visited.add(node)
            if len(visited) > self.max_units + 64:
                raise ProbeError("紅黑樹節點超過安全上限，停止遍歷")
            try:
                nil = self.mem.read(node + 0x19, 1)[0]
                if nil != 0:
                    continue
                key = self.u32(node + 0x20)
                val = self.ptr(node + 0x28)
                left = self.ptr(node + 0x00)
                right = self.ptr(node + 0x10)
            except (MemoryFault, OSError):
                continue
            yield key, val
            todo.extend((left, right))

    def text(self, address: int, limit=72) -> str:
        data = self.mem.read(address, limit)
        raw = data.split(b"\x00", 1)[0]
        output = raw.decode("gbk", errors="replace")
        return "".join(c for c in output if c.isprintable())[:70]

    def read_unit(self, key: int, addr: int) -> Optional[Unit]:
        if not is_pointer(addr):
            return None
        try:
            uid = self.u32(addr + 0x08)
            if uid != key:
                return None  # 場景節點等可能共用管理器；避免誤識別
            name = self.text(addr + self.off("unit_name_offset"))
            if not name:
                return None
            x, y, z = (self.i32(addr + a) for a in (0x10, 0x14, 0x18))
            return Unit(uid, name, "玩家" if uid < 0x40000000 else "NPC", x, y, z, addr)
        except (MemoryFault, OSError, UnicodeError):
            return None

    def buffs(self, unit_ptr: int) -> list[Buff]:
        """只讀文檔已明確的欄位；buffID/層數要額外逆向惰性句柄解析器。"""
        if not is_pointer(unit_ptr):
            return []
        try:
            buff_list = self.ptr(unit_ptr + self.off("buff_list_offset"))
            if not is_pointer(buff_list):
                return []
            count = self.u32(buff_list + 0x10)
            if not count:
                return []
            if count > 1024:
                return []
            sentinel = self.ptr(buff_list + 0x08)
            if not is_pointer(sentinel):
                return []
            node = self.ptr(sentinel)  # 文章未列 next 偏移；依鏈結串列常見 next=+0 推定
        except (MemoryFault, OSError):
            return []
        result = []
        visited = set()
        while is_pointer(node) and node != sentinel and node not in visited and len(result) < min(count, 1024):
            visited.add(node)
            try:
                result.append(Buff(
                    index=self.u32(node + 0x14),
                    end_tick=self.u32(node + 0x1C),
                    caster_id=self.u32(node + 0x40),
                    lazy_handle=self.ptr(node + 0x28),
                ))
                node = self.ptr(node)
            except (MemoryFault, OSError):
                break
        return result

    def _loot_chain(self, start: int, seen: set):
        found = []
        cur = start
        visited = set()
        while is_pointer(cur) and cur not in visited and len(visited) < 128:
            visited.add(cur)
            try:
                obj = self.ptr(cur + 0x18)
                nxt = self.ptr(cur + 0x00)
                if is_pointer(obj) and obj not in seen:
                    obj_id = self.u32(obj + 0x08)
                    name = self.text(obj + self.off("loot_name_offset"))
                    if name:
                        x, y, z = (self.i32(obj + v) for v in (0x10, 0x14, 0x18))
                        seen.add(obj)
                        found.append(Loot(obj_id, name, x, y, z, obj))
            except (MemoryFault, OSError):
                return found
            cur = nxt
        return found

    def scan_loot(self, world: int, entries: list[tuple[int, int]]) -> list[Loot]:
        scene_key = self.u32(world + 4)
        scene = next((p for key, p in entries if key == scene_key), None)
        if not is_pointer(scene or 0):
            raise ProbeError("找不到目前場景 key 對應的場景物件；物資資料無法解析")
        grid = self.ptr(scene + self.off("scene_grid_offset"))
        if not is_pointer(grid):
            raise ProbeError("場景空間網格指標不存在")
        width = self.u32(grid + self.off("grid_width_offset"))
        height = self.u32(grid + self.off("grid_height_offset"))
        if not (0 < width <= 64 and 0 < height <= 64):
            raise ProbeError(f"場景網格尺寸不合理：{width}×{height}")
        self._grid_key = (scene_key, grid)
        seen = set()
        items = []
        pitch = self.off("grid_row_stride")
        # 逐列批次讀取，避免每格單獨 ReadProcessMemory 造成嚴重延遲。
        for gx in range(width):
            row_addr = grid + self.off("grid_cells_offset") + gx * pitch * 8
            try:
                row_data = self.mem.read(row_addr, height * 8)
            except (MemoryFault, OSError):
                continue
            for gy in range(height):
                cell = struct.unpack_from("<Q", row_data, gy * 8)[0]
                if not is_pointer(cell):
                    continue
                try:
                    chain = self.ptr(cell + self.off("cell_loot_offset"))
                    if is_pointer(chain):
                        items.extend(self._loot_chain(chain, seen))
                except (MemoryFault, OSError):
                    continue
                if len(items) >= self.max_loot:
                    return items[:self.max_loot]
        return items

    @staticmethod
    def distance(a, b) -> float:
        return math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + ((a.z-b.z)/8)**2)

    def snapshot(self, self_id: Optional[int], inspect_id: Optional[int],
                 distance_max: float = 3000, scan_loot: bool = True) -> Snapshot:
        with self.lock:
            snapshot = Snapshot(self_id=self_id, inspect_id=inspect_id)
            world = self.world()
            entries = list(self.nodes(self.manager(world)))
            units = [x for key, p in entries if (x := self.read_unit(key, p)) is not None]
            # 假設玩家 unitId <0x40000000；根據筆記，吃雞玩家段也符合。
            unit_index = {u.unit_id: u for u in units}
            me = unit_index.get(self_id) if self_id is not None else None
            if self_id is not None and me is None:
                snapshot.errors.append("未在目前單位表找到自己的 unitId，距離與目標寫入暫不可用")
            snapshot.units = [replace(u, distance=self.distance(me, u)/100 if me else None)
                              for u in units]
            snapshot.units.sort(key=lambda u: (u.distance is None, u.distance or 0, u.name))
            if me:
                snapshot.self_buffs = self.buffs(me.ptr)
                try:
                    if self.u32(me.ptr + self.off("target_slot_1")) in (3, 4, 5):
                        snapshot.game_target_id = self.u32(me.ptr + self.off("target_slot_1") + 4)
                except (MemoryFault, OSError):
                    pass
            inspect = unit_index.get(inspect_id) if inspect_id is not None else None
            if inspect:
                snapshot.inspect_buffs = self.buffs(inspect.ptr)
            if scan_loot:
                try:
                    self._cached_loot = self.scan_loot(world, entries)
                except (ProbeError, MemoryFault, OSError) as e:
                    snapshot.errors.append(str(e))
                    self._cached_loot = []
            cached = self._cached_loot
            snapshot.loot = [replace(d, distance=self.distance(me, d)/100 if me else None)
                             for d in cached
                             if me is None or self.distance(me, d) <= distance_max]
            snapshot.loot.sort(key=lambda d: (d.distance is None, d.distance or 0, d.name))
            if me is None:
                snapshot.note = "請在角色列表選取自己的角色，按「設為自己」，才能按距離篩選物資"
            else:
                snapshot.note = "距離單位為推估公尺（遊戲距離 ÷100），不是經官方確認的精準公尺值"
            return snapshot

    def select_target(self, self_id: int, target_id: int):
        if not self.write_enabled:
            raise ProbeError("未啟用寫入。請在確認版本與風險後，使用 --enable-target-write 啟動")
        with self.lock:
            world = self.world()
            entries = list(self.nodes(self.manager(world)))
            units = {u.unit_id: u for key, p in entries if (u := self.read_unit(key, p))}
            me, target = units.get(self_id), units.get(target_id)
            if me is None or target is None:
                raise ProbeError("自己或目標已不在單位表，拒絕寫入過期指標")
            if self.u32(me.ptr + self.off("selection_ban_counter")) > 0:
                raise ProbeError("引擎標記禁止選中，已拒絕寫入")
            # 注意：論文說 16B，但 type(4)+id(4)+ptr(8)+pad(4)=20B，且雙槽偏移差 0x14。
            slot1, slot2 = self.off("target_slot_1"), self.off("target_slot_2")
            if slot2 - slot1 != 20:
                raise ProbeError("目標槽間距不是 20B，拒絕可能破壞客戶端的寫入")
            payload = struct.pack("<IIQI", 4, target.unit_id, target.ptr, 0)
            if len(payload) != 20:
                raise ProbeError("目標句柄長度校驗失敗")
            self.mem.write(me.ptr + slot1, payload)
            self.mem.write(me.ptr + slot2, payload)
            # 非原子雙寫入；只對明確授權的自身進程使用，不保證 UI 通知回調等價。
            return "已送出目標句柄寫入；是否生效須在遊戲內確認"


def is_pointer(value: int) -> bool:
    return isinstance(value, int) and 0x10000 <= value < 0x0000800000000000