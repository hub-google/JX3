"""64-bit Windows Toolhelp + Read/WriteProcessMemory。未實作注入或保護規避。"""
import ctypes
import os
from ctypes import wintypes

from .core import MemoryFault, ProbeError

TH32CS_SNAPPROCESS = 0x00000002
TH32CS_SNAPMODULE = 0x00000008
TH32CS_SNAPMODULE32 = 0x00000010
PROCESS_VM_OPERATION = 0x0008
PROCESS_VM_READ = 0x0010
PROCESS_VM_WRITE = 0x0020
PROCESS_QUERY_INFORMATION = 0x0400
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
MAX_PATH = 260


class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", wintypes.WCHAR * MAX_PATH),
    ]


class MODULEENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("th32ModuleID", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("GlblcntUsage", wintypes.DWORD),
        ("ProccntUsage", wintypes.DWORD),
        ("modBaseAddr", ctypes.c_void_p),
        ("modBaseSize", wintypes.DWORD),
        ("hModule", ctypes.c_void_p),
        ("szModule", wintypes.WCHAR * 256),
        ("szExePath", wintypes.WCHAR * MAX_PATH),
    ]


def _kernel32():
    if os.name != 'nt':
        raise ProbeError("即時遊戲進程模式只能在 64 位元 Windows 上執行")
    if ctypes.sizeof(ctypes.c_void_p) != 8:
        raise ProbeError("需要 64 位元 Python，不能用 32 位元 Python 讀取 x64 遊戲")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel.CreateToolhelp32Snapshot.restype = ctypes.c_void_p
    kernel.Process32FirstW.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESSENTRY32W)]
    kernel.Process32FirstW.restype = wintypes.BOOL
    kernel.Process32NextW.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESSENTRY32W)]
    kernel.Process32NextW.restype = wintypes.BOOL
    kernel.Module32FirstW.argtypes = [ctypes.c_void_p, ctypes.POINTER(MODULEENTRY32W)]
    kernel.Module32FirstW.restype = wintypes.BOOL
    kernel.Module32NextW.argtypes = [ctypes.c_void_p, ctypes.POINTER(MODULEENTRY32W)]
    kernel.Module32NextW.restype = wintypes.BOOL
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    kernel.CloseHandle.restype = wintypes.BOOL
    kernel.ReadProcessMemory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                                         ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
    kernel.ReadProcessMemory.restype = wintypes.BOOL
    kernel.WriteProcessMemory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                                          ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
    kernel.WriteProcessMemory.restype = wintypes.BOOL
    return kernel


def locate_process(name: str):
    k = _kernel32()
    snap = k.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snap in (None, INVALID_HANDLE_VALUE):
        raise ProbeError(f"列舉進程失敗：Windows 錯誤碼 {ctypes.get_last_error()}")
    try:
        entry = PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)
        ok = k.Process32FirstW(snap, ctypes.byref(entry))
        while ok:
            if entry.szExeFile.lower() == name.lower():
                return int(entry.th32ProcessID)
            ok = k.Process32NextW(snap, ctypes.byref(entry))
        return None
    finally:
        k.CloseHandle(snap)


def module_base(pid: int, module_name: str):
    k = _kernel32()
    snap = k.CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid)
    if snap in (None, INVALID_HANDLE_VALUE):
        raise ProbeError(f"列舉模組失敗：Windows 錯誤碼 {ctypes.get_last_error()}")
    try:
        entry = MODULEENTRY32W()
        entry.dwSize = ctypes.sizeof(MODULEENTRY32W)
        ok = k.Module32FirstW(snap, ctypes.byref(entry))
        while ok:
            if entry.szModule.lower() == module_name.lower():
                return int(entry.modBaseAddr)
            ok = k.Module32NextW(snap, ctypes.byref(entry))
        raise ProbeError(f"在進程 PID={pid} 中找不到模組 {module_name}")
    finally:
        k.CloseHandle(snap)


class WindowsProcessMemory:
    def __init__(self, pid: int, allow_write=False):
        self.kernel = _kernel32()
        access = PROCESS_QUERY_INFORMATION | PROCESS_VM_READ
        if allow_write:
            access |= PROCESS_VM_WRITE | PROCESS_VM_OPERATION
        self.handle = self.kernel.OpenProcess(access, False, pid)
        if not self.handle:
            raise ProbeError(f"OpenProcess({pid}) 失敗，錯誤碼 {ctypes.get_last_error()}；可能沒有權限或被遊戲保護阻止")
        self.pid = pid
        self.allow_write = allow_write

    def close(self):
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None

    def read(self, address: int, size: int) -> bytes:
        if size < 0 or size > 1048576:
            raise MemoryFault("超過單次安全讀取長度")
        if size == 0:
            return b""
        buf = ctypes.create_string_buffer(size)
        n = ctypes.c_size_t()
        ok = self.kernel.ReadProcessMemory(self.handle, ctypes.c_void_p(address),
                                            buf, size, ctypes.byref(n))
        if not ok or n.value != size:
            raise MemoryFault(f"ReadProcessMemory 0x{address:X} ({size}B) 失敗：{ctypes.get_last_error()}")
        return buf.raw

    def read_u64(self, address: int) -> int:
        return int.from_bytes(self.read(address, 8), "little")

    def read_u32(self, address: int) -> int:
        return int.from_bytes(self.read(address, 4), "little")

    def read_i32(self, address: int) -> int:
        return int.from_bytes(self.read(address, 4), "little", signed=True)

    def write(self, address: int, data: bytes):
        if not self.allow_write:
            raise ProbeError("唯讀模式不允許寫入")
        buffer = ctypes.create_string_buffer(data)
        n = ctypes.c_size_t()
        ok = self.kernel.WriteProcessMemory(self.handle, ctypes.c_void_p(address),
                                             buffer, len(data), ctypes.byref(n))
        if not ok or n.value != len(data):
            raise MemoryFault(f"WriteProcessMemory 0x{address:X} 失敗：{ctypes.get_last_error()}")