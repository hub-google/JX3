# upd.exe 靜態逆向分析與 External Probe 差異

日期：2026-10-27

## 原始參考檔案

- 檔案：`external-probe/upd.exe`（與 `run.py`、`config.json` 同層）
- 來源：`https://www.hostize.com/zh/s/ZYn3f-M9bB`
- 檔案大小：300,544 bytes
- SHA-256：`e9eeef05a8d917c237b573a00c8404a2bf11468574aba342aca2837516aae8db`，與原貼一致
- PE 架構：x86-64、Console subsystem、Rust 標準庫痕跡、PE timestamp 為 0
- 安全：**從未執行此檔案**；只在隔離的 GitHub Actions Linux Runner 做下載、雜湊、PE、字串、Capstone 靜態反組譯。樣本具有寫入其他進程記憶體的能力，請勿在個人或公司裝置任意執行。雜湊一致不代表程式安全。

## 已由反組譯確認的功能

1. 目標程序：`JX3ClientX64.exe`。名字的十二個字元存在 RVA `0x30651`，逐位元組 XOR `0x5A` 解碼成 `JX3ClientX64`，再補上 `.exe`。程式使用 `K32EnumProcesses`、`OpenProcess`、`QueryFullProcessImageNameW` 尋找匹配程序（RVA 約 `0x1505-0x17cf`）。
2. 記憶體特徵碼：RVA `0x30618` 的 24-byte 加密資料，使用位於 RVA `0x3063b` 的六個 XOR key `5A 3C 71 2E 9B 47`，每四個 byte 對應一個 key。解碼為：

   ```text
   1C 80 80 00 1A 40 00 00 16 80 00 80
   05 80 00 00 1A 40 00 00 16 40 00 80
   ```

   程式以 `VirtualQueryEx` 尋找適合的記憶體區段，以 `ReadProcessMemory` 分批讀取，逐位元組比較 24 bytes（RVA 約 `0x18cd-0x1d7b`）。
3. Patch 位置：程式在找到特徵碼後，檢查特徵起點**前 8 bytes**；透過 `cmp rdi, 7` 排除不足八個前置位元組的命中，且將掃描區塊基址先減 8 再加匹配偏移（RVA 約 `0x1b09`、`0x1c35`、`0x1c4a`）。
4. 兩組 8-byte 內容以 XOR `0x33` 內嵌於 RVA `0x30641` 與 `0x30649`：

   | 用途 | 反解後位元組 |
   | --- | --- |
   | 原始值（orig） | `05 00 00 00 06 40 40 00` |
   | 改寫值（patched） | `02 00 00 00 1E 00 00 01` |

   程式呼叫 RVA `0x121d` 與 `0x1246` 的 XOR 解碼 helper，以 8-byte 比對分類已讀取的內容（約 RVA `0x1c7b-0x1cae`）。
5. 模式：程式中有 `check only`、`apply`、`restore`、`orig`、`patched` 等格式文字。反組譯顯示 `restore` 分支選用原始 8 bytes（RVA `0x20fb-0x2118`）；其他套用路徑使用改寫 8 bytes。
6. 寫入：找到可修改位置後，用 `OpenProcess` 開啟具有 VM 寫入權限的程序；呼叫 `VirtualProtectEx` 將八個位元組所在頁暫時設成 `PAGE_EXECUTE_READWRITE`（`0x40`），以 `WriteProcessMemory` 寫入 **8 bytes**，再恢復先前頁面保護，並以 `ReadProcessMemory` 讀回，報告成功／失敗（RVA `0x2165-0x2276`）。這些是**程式內存在的操作路徑**，不代表本次已對真實客戶端執行成功。
7. 找不到特徵時顯示 `not found (plugin unloaded or version changed)`，表示依賴固定特徵，版本或目標記憶體內容改變可能無法工作。此字串不能單獨證明外掛注入的來源或遊戲內用途。

## 2026-10-28：確認它是 Lua 5.1 bytecode 補丁，而非一般數值或旗標

### 原始及修改後的 8 bytes 精確語義

| 位元組 | Lua 5.1 opcode | 意義 |
| --- | --- | --- |
| 05 00 00 00 | GETGLOBAL R0, K0 | 載入常數表 K0 所指定的全域物件 |
| 06 40 40 00 | GETTABLE R0, R0, K1 | 取該物件中 K1 指定的欄位 |
| **02 00 00 00** | **LOADBOOL R0, 0, 0** | **設定 R0 為 false** |
| **1E 00 00 01** | **RETURN R0, 2** | **從所在 Lua 函式立即回傳 R0（1 個回傳值，即 false）** |

這是 Lua 5.1 的 32-bit little-endian VM 指令編碼，非任意整數微調。補丁的已證明語義是讓程式執行到這個位置時提前 return false，後續 Lua 判斷與其他流程不再執行；但是單靠此檔案不能判定是哪一個具名遊戲功能。

### 它怎麼知道在哪裡修改

程式不使用寫死的進程絕對地址：首先定位 JX3ClientX64.exe，再用 VirtualQueryEx + ReadProcessMemory 掃描各個可讀記憶體區域，尋找以下六條相鄰的 Lua 5.1 指令構成的 24-byte 特徵：

| 特徵位元組 | Lua 5.1 opcode |
| --- | --- |
| 1C 80 80 00 | CALL R0, 1, 2（零參數呼叫，收一個結果） |
| 1A 40 00 00 | TEST R0, 1 |
| 16 80 00 80 | JMP +3 |
| 05 80 00 00 | GETGLOBAL R0, K2 |
| 1A 40 00 00 | TEST R0, 1 |
| 16 40 00 80 | JMP +2 |

找到該 24-byte 指令特徵後，程式往前 8 bytes 檢查該處是否等於原值或已修改值；套用時替換成 LOADBOOL + RETURN，還原時寫回 GETGLOBAL + GETTABLE。原始字串中 K0/K1/K2 是 Lua Proto 常數表的索引，不是全域變數或函式的實際名稱。

**證實範圍：** Lua 5.1 指令的語義及 EXE 中的掃描、比對、寫入路徑已靜態確認。**未證實範圍：** 被修改的是哪個具名 Lua 函式、它檢查哪件事，以及遊戲真實執行時能否命中/產生何種效果。要知道函式名稱，需對照實際載入的 Lua chunk/Proto 常數表、插件原始碼或可信記憶體樣本；upd.exe 本身未包含那些文字常數。若客戶端 VM 對 Lua opcode 做了自訂變更，也要另行校核。

Lua 官方依據：https://www.lua.org/source/5.1/lopcodes.h.html 、https://www.lua.org/source/5.1/lopcodes.c.html 、https://www.lua.org/source/5.1/lvm.c.html 。

## 與既有 External Probe v0.1.2 的實質差異

| 項目 | 原始 `upd.exe` | `external-probe/` 原型 |
| --- | --- | --- |
| 程式語言 | Rust 的 Windows x64 原生 EXE | Python 原始碼 + BAT；README 未宣稱已打包可用 EXE |
| 目標程序 | XOR 解碼 `JX3ClientX64.exe` | 設定檔指定 `JX3ClientX64.exe` |
| 目標定位 | 24-byte 特徵掃描，找尋其前方 8 bytes 的可補丁內容 | `kworld_rva` 與多層固定偏移指標 |
| 主要目的 | 對指定記憶體的八位元組進行檢查、套用或還原 | 枚舉遊戲物件、顯示玩家 NPC、道具座標和 BUFF 原始值 |
| 記憶體寫入 | 以 `VirtualProtectEx` + `WriteProcessMemory` 改寫 8 bytes，含還原及讀回驗證 | 僅實驗性雙槽目標句柄寫入，兩處各 20 bytes；預設關閉 |
| 外部介面 | Console 訊息（PE subsystem 3），未發現物件列表 GUI 證據 | 已製作外部 GUI 與示範資料 |
| 測試狀態 | 原始檔案、雜湊與靜態反組譯已檢查；未動態執行 | Linux 合成記憶體測試通過，未在真實 JX3 驗證 |

## 靜態分析不能憑空確定的資訊

- 已確認這 8 bytes 是 Lua 5.1 指令，作用是讓目標函式提前回傳 false；但尚未確認所屬 Lua 函式名稱、常數表 K0/K1/K2 的實際文字及具體遊戲內影響。
- 真實遊戲版本是否存在符合該特徵的可讀記憶體、補丁寫入是否成功、遊戲內效果是否存在。
- 是否完全不存在惡意後台或其他動態行為；未做動態分析，不提供安全保證。

## 可稽核證據

- 參考檔案保存：[external-probe/upd.exe](upd.exe)
- 已完成的 GitHub Actions 靜態分析：`40479476993`（保存 + 雜湊 + PE 字串）、`40479696398`（Capstone x64 反組譯）。
- 本專案程式對照：[README.md](README.md)、[jx3probe/core.py](jx3probe/core.py)、[jx3probe/winapi.py](jx3probe/winapi.py)。
