"""啟動獨立 Windows 外部檢視器。"""
import argparse
from jx3probe.app import main

parser = argparse.ArgumentParser(description='JX3 x64 外部資料檢視器 / 驗證用樣機')
parser.add_argument('--demo', action='store_true', help='不連線遊戲，只顯示可重現的測試資料')
parser.add_argument('--enable-target-write', action='store_true',
                    help='實驗性雙槽目標寫入（未經目前實機驗證；預設關閉）')
args = parser.parse_args()
main(args.demo, args.enable_target_write)