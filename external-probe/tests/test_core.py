import json
from pathlib import Path
import struct
import unittest

from jx3probe.core import ExternalProbe, ProbeError
from jx3probe.demo import create_demo

CONFIG = json.loads((Path(__file__).resolve().parents[1]/'config.json').read_text(encoding='utf-8'))


class ProbeTests(unittest.TestCase):
    def setUp(self):
        self.mem, self.base, self.self_id = create_demo(CONFIG)
        self.probe = ExternalProbe(self.mem, self.base, CONFIG)

    def test_parse_world_units_loot_buffs(self):
        shot = self.probe.snapshot(101,0x40000001, 3000)
        self.assertEqual(shot.errors, [])
        self.assertEqual(len(shot.units), 2)
        self.assertEqual(shot.units[0].name, '測試玩家·伺服器')
        self.assertEqual(shot.units[1].distance, 7.0)
        self.assertEqual(len(shot.loot),1)
        self.assertEqual(shot.loot[0].name,'二階裝備')
        self.assertEqual(shot.loot[0].distance,15.0)
        self.assertEqual(len(shot.self_buffs),1)
        self.assertEqual(shot.self_buffs[0].index,83)
        self.assertIsNone(shot.self_buffs[0].buff_id)

    def test_loot_radius(self):
        self.probe.snapshot(101,None, 3000)
        shot = self.probe.snapshot(101,None, 1000,scan_loot=False)
        self.assertEqual(len(shot.loot),0)

    def test_target_write_requires_optin(self):
        with self.assertRaises(ProbeError):
            self.probe.select_target(101, 0x40000001)

    def test_target_write_20_bytes_two_slots(self):
        self.probe.write_enabled = True
        result = self.probe.select_target(101,0x40000001)
        obj_ptr = 0x2000000000
        target_ptr = 0x2000001000
        payload = struct.pack('<IIQI',4,0x40000001,target_ptr,0)
        self.assertEqual(len(payload),20)
        self.assertEqual(self.mem.read(obj_ptr+0xC2C,20),payload)
        self.assertEqual(self.mem.read(obj_ptr+0xC40,20),payload)
        self.assertIn('已送出',result)

    def test_ban_selection(self):
        self.mem.put(0x2000000000+0xC0C,'<I',1)
        self.probe.write_enabled = True
        with self.assertRaises(ProbeError):
            self.probe.select_target(101,0x40000001)

    def test_missing_world(self):
        self.mem.put(self.base+int(CONFIG['kworld_rva'],0),'<Q',0)
        with self.assertRaises(ProbeError):
            self.probe.snapshot(101,None)


if __name__ == '__main__':
    unittest.main()