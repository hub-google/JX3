"""Test actual Windows cross-process memory access against a child process we own.

This tests the OS adapter, NOT access to JX3 or anti-cheat compatibility.
"""
import os
import subprocess
import sys
import unittest

from jx3probe.winapi import WindowsProcessMemory, module_base


@unittest.skipUnless(os.name == "nt", "Windows-only OS integration test")
class CrossProcessTests(unittest.TestCase):
    def test_read_write_own_child_process(self):
        code = (
            "import ctypes,sys\n"
            "b=ctypes.create_string_buffer(b'JX3TEST!')\n"
            "print(ctypes.addressof(b),flush=True)\n"
            "sys.stdin.readline()\n"
        )
        child = subprocess.Popen(
            [sys.executable, "-u", "-c", code],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            address = int(child.stdout.readline().strip())
            self.assertTrue(address > 0)
            # Also confirm Windows Toolhelp module enumeration succeeds.
            base = module_base(child.pid, os.path.basename(sys.executable))
            self.assertTrue(base > 0)
            memory = WindowsProcessMemory(child.pid, allow_write=True)
            try:
                self.assertEqual(memory.read(address, 8), b"JX3TEST!")
                memory.write(address, b"JX3PASS!")
                self.assertEqual(memory.read(address, 8), b"JX3PASS!")
            finally:
                memory.close()
        finally:
            if child.stdin and not child.stdin.closed:
                try:
                    child.stdin.write("\n")
                    child.stdin.flush()
                except BrokenPipeError:
                    pass
            child.communicate(timeout=10)


if __name__ == "__main__":
    unittest.main()