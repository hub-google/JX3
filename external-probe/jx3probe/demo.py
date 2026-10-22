"""離線合成記憶體，供 UI 展示、解析器單元測試使用；不是真實遊戲資料。"""
import struct
from .core import MemoryFault


class SyntheticMemory:
    PAGE = 4096

    def __init__(self):
        self.pages = {}

    def map(self, addr: int, size: int):
        start = addr // self.PAGE
        end = (addr + size - 1) // self.PAGE
        for page in range(start, end+1):
            self.pages.setdefault(page, bytearray(self.PAGE))

    def read(self, address: int, size: int):
        out = bytearray()
        while size:
            page, offset = divmod(address, self.PAGE)
            if page not in self.pages:
                raise MemoryFault(f"synthetic unmapped address 0x{address:X}")
            n = min(size, self.PAGE-offset)
            out.extend(self.pages[page][offset:offset+n])
            size -= n
            address += n
        return bytes(out)

    def write(self, address: int, data: bytes):
        self.map(address, len(data))
        i = 0
        while i < len(data):
            page, offset = divmod(address+i, self.PAGE)
            n = min(len(data)-i, self.PAGE-offset)
            self.pages[page][offset:offset+n] = data[i:i+n]
            i += n

    def read_u64(self, addr):
        return int.from_bytes(self.read(addr, 8), 'little')

    def read_u32(self, addr):
        return int.from_bytes(self.read(addr, 4), 'little')

    def read_i32(self, addr):
        return int.from_bytes(self.read(addr, 4), 'little', signed=True)

    def put(self, addr, fmt, *values):
        self.write(addr, struct.pack(fmt, *values))

    def string(self, addr, string):
        self.write(addr, string.encode('gbk') + b'\x00')


def create_demo(config):
    """回傳 (mem, module_base, self_unit_id)，與讀取筆記使用相同欄位偏移。"""
    m = SyntheticMemory()
    base = 0x140000000
    world = 0x1A00000000
    manager = 0x1B00000000
    head = 0x1B00001000
    a, b, c = 0x1B00002000, 0x1B00003000, 0x1B00004000
    self_ptr = 0x2000000000
    npc_ptr = 0x2000001000
    scene = 0x2000002000
    grid = 0x2100000000
    cell = 0x2200000000
    chain = 0x2300000000
    doodad = 0x2300001000
    bufflist = 0x2400000000
    sentinel = 0x2400001000
    buff_node = 0x2400002000
    for p in (world, manager, head, a,b,c, self_ptr,npc_ptr,scene,cell,chain,doodad,bufflist,sentinel,buff_node):
        m.map(p,4096)
    m.map(grid, 0x11000)
    m.put(base+int(config['kworld_rva'],0),'<Q',world)
    m.put(world+int(config['manager_offset'],0),'<Q',manager)
    m.put(world+4,'<I',50)
    m.put(manager+0x38,'<Q',head)
    m.put(head+0x19,'<B',1)
    m.put(head+0x08,'<Q',a)
    # Root: key 101 (self). left = 50 (scene). right = 0x40000001 (NPC).
    for node,key,value,left,right in (
        (a,101,self_ptr,b,c),
        (b,50,scene,head,head),
        (c,0x40000001,npc_ptr,head,head),
    ):
        m.put(node+0x19,'<B',0)
        m.put(node+0x00,'<Q',left)
        m.put(node+0x10,'<Q',right)
        m.put(node+0x20,'<I',key)
        m.put(node+0x28,'<Q',value)
    for ptr,uid,name,xyz in (
        (self_ptr,101,'測試玩家·伺服器',(1000,2000,160)),
        (npc_ptr,0x40000001,'測試 NPC',(1700,2000,160)),
    ):
        m.put(ptr+0x08,'<I',uid)
        m.string(ptr+0x88,name)
        m.put(ptr+0x10,'<iii',*xyz)
    m.put(self_ptr+0xD60,'<Q',bufflist)
    m.put(bufflist+0x08,'<Q',sentinel)
    m.put(bufflist+0x10,'<I',1)
    m.put(sentinel,'<Q',buff_node)
    m.put(buff_node,'<Q',sentinel)
    m.put(buff_node+0x14,'<I',83)
    m.put(buff_node+0x1C,'<I',12345678)
    m.put(buff_node+0x28,'<Q',0x2500000000)
    m.put(buff_node+0x40,'<I',101)
    m.put(scene+0x60,'<Q',grid)
    m.put(grid+0x790,'<II',64,64)
    m.put(grid+0x7A8+(2*128+3)*8,'<Q',cell)
    m.put(cell+0x98,'<Q',chain)
    m.put(chain+0x18,'<Q',doodad)
    m.put(doodad+0x08,'<I',0x88880000)
    m.string(doodad+0x8C,'二階裝備')
    m.put(doodad+0x10,'<iii',2500,2000,160)
    return m,base,101