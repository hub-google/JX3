"""Tkinter 外部檢視器；所有記憶體存取皆透過獨立進程 API。"""
import json
import os
import queue
import threading
import time
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

from .core import ExternalProbe, ProbeError
from .demo import create_demo
from .winapi import WindowsProcessMemory, locate_process, module_base


def fmt_distance(value):
    return '—' if value is None else f'{value:.1f}'


class ProbeApp:
    def __init__(self, root, config, demo=False, enable_target_write=False):
        self.root = root
        self.root.title('JX3 外部資料檢視器 — 實驗版')
        self.root.geometry('1100x760')
        self.cfg = config
        self.demo = demo
        self.enable_target_write = enable_target_write
        self.events = queue.Queue(maxsize=3)
        self.stop = threading.Event()
        self.backend_lock = threading.RLock()
        self.backend = None
        self.last_snapshot = None
        self.self_id = 101 if demo else None
        self.inspect_id = None
        self.distance_max = 3000  # 遊戲距離單位 ~= 30m
        self.unit_map = {}
        self.selected_unit_id = None
        self.warning_accepted = False
        self._build()
        self.thread = threading.Thread(target=self._worker, name='jx3-reader', daemon=True)
        self.thread.start()
        self.root.after(200, self._drain)
        self.root.protocol('WM_DELETE_WINDOW', self._on_close)

    def _build(self):
        top = ttk.Frame(self.root, padding=10)
        top.pack(fill='x')
        ttk.Label(top, text='自己的 unitId').pack(side='left')
        self.self_var = tk.StringVar(value=str(self.self_id or ''))
        ttk.Entry(top, textvariable=self.self_var, width=14).pack(side='left', padx=(5,12))
        ttk.Button(top, text='套用', command=self._apply_self_id).pack(side='left')
        ttk.Button(top, text='將選取角色設為自己', command=self._set_self_selected).pack(side='left', padx=(6,14))
        ttk.Label(top, text='物資搜尋範圍').pack(side='left')
        self.radius_var = tk.StringVar(value='30')
        radius = ttk.Combobox(top, textvariable=self.radius_var,
                              values=('10','20','30','50','100','全部'), width=7, state='readonly')
        radius.pack(side='left', padx=5)
        radius.bind('<<ComboboxSelected>>', lambda _: self._radius_changed())
        target_button = ttk.Button(top, text='在遊戲內選中所選目標', command=self._select_target)
        target_button.pack(side='right')
        if not self.enable_target_write:
            target_button.state(['disabled'])

        self.note_var = tk.StringVar(value='離線展示資料' if self.demo else '連線中…')
        ttk.Label(self.root, textvariable=self.note_var, padding=(10,2)).pack(fill='x')
        splitter = ttk.Panedwindow(self.root, orient='vertical')
        splitter.pack(fill='both', expand=True, padx=10, pady=(5,10))
        upper = ttk.Panedwindow(splitter, orient='horizontal')
        splitter.add(upper, weight=4)

        unit_frame = ttk.LabelFrame(upper, text='角色／NPC 焦點列表（雙擊嘗試選中）', padding=5)
        upper.add(unit_frame, weight=5)
        self.units = self._make_tree(unit_frame,
                                    [('kind','種類',65), ('id','unitId',120), ('name','名稱',250),
                                     ('pos','座標 x / y / z',200), ('distance','距離（米）',100)])
        self.units.bind('<<TreeviewSelect>>', self._unit_changed)
        if self.enable_target_write:
            self.units.bind('<Double-1>', lambda _: self._select_target())

        loot_frame = ttk.LabelFrame(upper, text='場景物資（依自身距離過濾）', padding=5)
        upper.add(loot_frame, weight=5)
        self.loot = self._make_tree(loot_frame,
                                   [('id','物件ID',120), ('name','名稱',210), ('pos','座標 x / y / z',210),
                                    ('distance','距離（米）',95)])
        lower = ttk.Panedwindow(splitter, orient='horizontal')
        splitter.add(lower, weight=2)
        self_buff_frame = ttk.LabelFrame(lower, text='自己的 BUFF（待解析 ID／層數）', padding=5)
        target_buff_frame = ttk.LabelFrame(lower, text='目前檢視角色的 BUFF（待解析 ID／層數）', padding=5)
        lower.add(self_buff_frame, weight=1)
        lower.add(target_buff_frame, weight=1)
        buff_columns = [('index','nIndex',80),('end','結束時刻 tick',125),
                        ('caster','施加者 unitId',110),('handle','惰性句柄',140)]
        self.self_buffs = self._make_tree(self_buff_frame, buff_columns)
        self.inspect_buffs = self._make_tree(target_buff_frame, buff_columns)
        self.status_var = tk.StringVar(value='準備開始。')
        ttk.Label(self.root, textvariable=self.status_var, anchor='w', padding=(10,5),
                  relief='sunken').pack(fill='x')

    def _make_tree(self, parent, columns):
        frame = ttk.Frame(parent)
        frame.pack(fill='both', expand=True)
        tree = ttk.Treeview(frame, columns=[a for a,_,_ in columns], show='headings', selectmode='browse')
        for key, label, width in columns:
            tree.heading(key, text=label)
            tree.column(key, width=width, minwidth=50, stretch=True)
        sb = ttk.Scrollbar(frame, orient='vertical', command=tree.yview)
        tree.configure(yscrollcommand=sb.set)
        tree.pack(side='left', fill='both', expand=True)
        sb.pack(side='right', fill='y')
        return tree

    def _apply_self_id(self):
        value = self.self_var.get().strip()
        try:
            self.self_id = None if not value else int(value, 0)
            self.status_var.set(f'已更新自己的 unitId：{self.self_id or "未指定"}')
        except ValueError:
            messagebox.showerror('格式錯誤', 'unitId 需要整數，可用 101 或 0x65')

    def _set_self_selected(self):
        if self.selected_unit_id is None:
            messagebox.showinfo('尚未選取', '請先在角色列表選取自己的角色')
            return
        self.self_id = self.selected_unit_id
        self.self_var.set(str(self.self_id))
        self.status_var.set(f'以 unitId={self.self_id} 作為自己的角色，開始計算距離')

    def _radius_changed(self):
        value = self.radius_var.get()
        self.distance_max = float('inf') if value == '全部' else float(value)*100

    def _unit_changed(self, _event=None):
        selection = self.units.selection()
        if selection:
            try:
                self.selected_unit_id = int(selection[0])
                self.inspect_id = self.selected_unit_id
            except ValueError:
                pass

    def _select_target(self):
        target_id = self.selected_unit_id
        if target_id is None or self.self_id is None:
            messagebox.showwarning('無法選取', '請先在角色列表選擇目標，並設定自己的 unitId')
            return
        if not self.enable_target_write:
            messagebox.showwarning('唯讀模式', '預設不修改遊戲記憶體。請確認筆記版本、承擔風險後，使用 --enable-target-write 啟動')
            return
        if not self.warning_accepted:
            answer = messagebox.askyesno('實驗性功能',
                '外部記憶體雙槽寫入尚未經目前實際遊戲版本驗證。可能崩潰、被反作弊偵測或違反遊戲條款。\n\n'
                '僅可用於自己有權操作的進程。要繼續嗎？')
            if not answer:
                return
            self.warning_accepted = True
        try:
            with self.backend_lock:
                if self.backend is None:
                    raise ProbeError('尚未連上遊戲進程')
                result = self.backend.select_target(self.self_id, target_id)
            self.status_var.set(result)
        except (ProbeError, OSError) as exc:
            messagebox.showerror('選取失敗', str(exc))

    def _worker(self):
        last_loot = 0.0
        while not self.stop.is_set():
            try:
                with self.backend_lock:
                    if self.backend is None:
                        if self.demo:
                            mem, base, _ = create_demo(self.cfg)
                            self.backend = ExternalProbe(mem, base, self.cfg,
                                                         enable_target_write=self.enable_target_write)
                            label = '離線合成資料（非遊戲現場驗證）'
                        else:
                            name = self.cfg['process_name']
                            pid = locate_process(name)
                            if pid is None:
                                raise ProbeError(f'找不到 {name}；確認已啟動遊戲並使用 x64 Python')
                            base = module_base(pid, name)
                            mem = WindowsProcessMemory(pid, self.enable_target_write)
                            self.backend = ExternalProbe(mem, base, self.cfg,
                                                         enable_target_write=self.enable_target_write)
                            label = f'PID={pid}，模組基址 0x{base:X}'
                    need_loot = time.monotonic() - last_loot >= 8
                    data = self.backend.snapshot(self.self_id, self.inspect_id,
                                                 self.distance_max, scan_loot=need_loot)
                    if need_loot:
                        last_loot = time.monotonic()
                    self._queue('snapshot', (data, label))
            except (ProbeError, OSError) as exc:
                self._queue('error', str(exc))
                with self.backend_lock:
                    if self.backend is not None and not self.demo:
                        try:
                            self.backend.mem.close()
                        except Exception:
                            pass
                        self.backend = None
                self.stop.wait(3)
                continue
            except Exception as exc:
                self._queue('error', f'意外解析錯誤：{type(exc).__name__}: {exc}')
                self.stop.wait(3)
                continue
            self.stop.wait(1.5)

    def _queue(self, typ, payload):
        try:
            self.events.put_nowait((typ, payload))
        except queue.Full:
            try:
                self.events.get_nowait()
                self.events.put_nowait((typ,payload))
            except queue.Empty:
                pass

    def _drain(self):
        for _ in range(10):
            try:
                typ, payload = self.events.get_nowait()
            except queue.Empty:
                break
            if typ == 'error':
                self.status_var.set(payload)
                self.note_var.set('連線／解析失敗，請確認程式版本、偏移、讀取權限')
            else:
                data,label = payload
                self._render(data,label)
        if not self.stop.is_set():
            self.root.after(200, self._drain)

    @staticmethod
    def _replace_rows(tree, rows):
        selected = set(tree.selection())
        for item in tree.get_children():
            tree.delete(item)
        for key, values in rows:
            tree.insert('', 'end', iid=str(key), values=values)
        for key in selected:
            if tree.exists(key):
                tree.selection_set(key)

    def _render(self, data, label):
        self.last_snapshot = data
        self._replace_rows(self.units, [(u.unit_id,
            (u.kind, u.unit_id, u.name, f'{u.x} / {u.y} / {u.z}',fmt_distance(u.distance)))
                                       for u in data.units])
        self._replace_rows(self.loot, [(f'{d.ptr:X}',
            (f'0x{d.object_id:X}',d.name,f'{d.x} / {d.y} / {d.z}',fmt_distance(d.distance)))
                                       for d in data.loot])
        self._replace_rows(self.self_buffs,
            [(i,(b.index,b.end_tick,b.caster_id,f'0x{b.lazy_handle:X}')) for i,b in enumerate(data.self_buffs)])
        self._replace_rows(self.inspect_buffs,
            [(i,(b.index,b.end_tick,b.caster_id,f'0x{b.lazy_handle:X}')) for i,b in enumerate(data.inspect_buffs)])
        self.note_var.set(f'{label}；{data.note}')
        msg = f'角色/NPC：{len(data.units)}　物資：{len(data.loot)}　自身BUFF：{len(data.self_buffs)}'
        if data.game_target_id is not None:
            msg += f'　遊戲目前目標：{data.game_target_id}'
        if data.errors:
            msg += '　注意：'+'；'.join(data.errors[:2])
        self.status_var.set(msg)

    def _on_close(self):
        self.stop.set()
        with self.backend_lock:
            if self.backend is not None and not self.demo:
                self.backend.mem.close()
        self.root.destroy()


def main(demo=False, enable_target_write=False):
    path = Path(__file__).resolve().parent.parent / 'config.json'
    with path.open('r',encoding='utf-8') as f:
        cfg = json.load(f)
    root = tk.Tk()
    style = ttk.Style()
    if 'vista' in style.theme_names():
        style.theme_use('vista')
    ProbeApp(root, cfg, demo=demo, enable_target_write=enable_target_write)
    root.mainloop()