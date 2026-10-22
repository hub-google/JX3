# JX3 外部資料檢視器（原型 v0.1.2）

這是根據使用者提供的《JX3 客戶端逆向筆記》（2026-10-22）製作的**獨立 Windows 工具原型**，不是遊戲伺服器，也不是 Lua 插件。使用 `OpenProcess` + `ReadProcessMemory`，不注入 DLL、不修改遊戲檔案，也沒有任何反作弊規避邏輯。

> **驗證狀態：已完成離線合成記憶體的單元測試，尚未在真實《劍網 3》客戶端驗證。** 文章中的偏移不代表你目前版本必定有效。執行外部讀／寫可能受到遊戲條款和反作弊機制限制，請自行確認授權；本工具不保證安全、不保證遊戲內有效。

## 包含哪些功能

- 依文章偏移從 `JX3ClientX64.exe` 定位 KWorld，走紅黑樹列舉角色與 NPC，顯示 GBK 名稱、座標及相對距離。
- 從場景 64×64 格網取得道具鏈。為繞過文章未公開的「世界座標→格網索引」映射，採每 8 秒批次掃描完整場景網格，再以自己的座標依距離過濾；避免臆造座標換算。
- 解析自己的 BUFF 與選中的角色 BUFF：提供 `nIndex`、結束 tick、施加者 ID、惰性句柄的**原始值**。文章未公開惰性句柄到鍵句柄的解參照規則，因而**無法可靠還原 buffID、層數或剩餘秒數**。
- `--enable-target-write` 提供**實驗性**目標選取：先根據最新單位表校驗自己的角色和目標、檢查禁選計數器，才嘗試在兩個槽位分別寫入 20 位元組句柄。預設完全唯讀。
- 預設顯示外部視窗，並非遊戲內渲染的透視畫面；沒有施放技能／一鍵連招。

## 需求

- Windows 10/11 x64、Python 3.10+ **64 位元**；標準函式庫即可，不必 pip install 依賴。
- 執行遊戲 `JX3ClientX64.exe`。若因權限／反作弊無法讀取，工具不會幫忙繞過。
- 原始筆記的偏移與當前遊戲版本一致，才有可能取得真實資訊。

## 啟動

1. 雙擊 `start_demo.bat`：使用完全合成、可重現的離線資料示範介面。
2. 雙擊 `start_live_readonly.bat`：尋找真正的遊戲進程，以唯讀模式啟動。也可以執行 `py -3 run.py`。
3. 先在焦點列表選擇自己的角色，按「將選取角色設為自己」，才能計算距離、顯示附近物資。
4. 選擇其他角色即可檢視其 BUFF。
5. **實驗性選中目標（有崩潰、封號等風險）**：必須自行明確以 `py -3 run.py --enable-target-write` 啟動，設定自己的 unitId 後在列表雙擊其他單位。首次操作另有明確確認對話框。

### 測試與回報（v0.1.2）

先雙擊 `run_diagnostics.bat`（不接觸遊戲），再執行 `start_demo.bat` 確認介面。
確認授權及風險後，才使用 `run_diagnostics_game_readonly.bat` 進行一次性遊戲唯讀診斷。
輸出在 `diagnostics/jx3-diagnostic-*.json`，保留測試結果與必要錯誤碼，不保存玩家名字或記憶體 dump。

指令方式：

```powershell
py -3 -m unittest discover -s tests -v
py -3 diagnose.py
py -3 diagnose.py --game  # 僅明確同意風險的合法測試場景
```

請看 [docs/VALIDATION.md](docs/VALIDATION.md) 的停止條件、實測比對門檻和回報格式。

### Windows 打包 EXE（需在 Windows 上進行）

```powershell
py -3 -m pip install pyinstaller
py -3 -m PyInstaller --noconfirm --onefile --windowed --name JX3ExternalProbe --add-data "config.json;." run.py
```

**注意**：原型以原始碼 + BAT 交付，未在本環境交叉編譯 Windows `.exe`，不聲稱已產出／實測可用的 EXE。

## 已查出的文檔問題和未完成驗證

1. 文章宣稱 `TargetHandle` 是 **16B**，但 `DWORD type`(4) + `DWORD unitId`(4) + `KCharacter* ptr`(8) + `DWORD pad`(4) 共 **20B**；而 C2C 至 C40 相隔 **0x14=20B**。此原型採 20B，但必須實機驗證。兩次寫入不是原子操作，也不等價於遊戲正式選取函式的完整流程（例如 UI 通知）。
2. 紅黑樹文檔缺失 `parent` 偏移：假設 `head+0x08` 是 root；應用程式讀取時會做 nil、訪問上限、指標檢查。
3. BUFF 文檔未給出「惰性句柄解析到鍵句柄」的邏輯，並未提供可用的當前時間基準。因此不能假裝已還原 buffID/層數或剩餘秒數。
4. 道具鏈／BUFF 鏈的 `next` 偏移原文未寫；此原型推定 `+0x00`，需要實機校驗。
5. 文章把 `KWorld+0x5673D8` 的紅黑樹作為角色管理器及場景索引，若真實版本不是同一容器，需更新 `core.py`。
6. 所有偏移均是文章作者採集時的版本，升級後應重新核對；本工具沒有自動特徵掃描和保護繞過。
7. 角色資訊來自客戶端現有可見資料；這**不等於能列出遊戲伺服器上所有隱藏角色**。

## 路線

目前先解決**可驗證的資料讀取及 GUI**。若要達到文章所指的全部功能，仍需以合法測試環境驗證真實指標結構、惰性句柄解算、場景鏈表與讀取權限；不能憑文章片段保證「完整吃雞透視」或「一鍵連招」已完成。工具不包含反作弊繞過。

## 驗證補充（v0.1.1）

請先看 [docs/VALIDATION.md](docs/VALIDATION.md)。新增 `tests/test_winapi_integration.py`，用自己的 Windows 子行程測試實際 `ReadProcessMemory`/`WriteProcessMemory`，**不是拿遊戲來做測試**；新增 `validate_live_readonly.py` 輸出不含玩家姓名的唯讀診斷報告。這些不能代替官方遊戲的人工對照驗證。

## 2026-10-22 實測狀態

已在 Linux Python 3.13 跑過 6 項合成測試；Windows 自有子行程測試因非 Windows 環境而跳過。尚未在 Windows 或真正 JX3 客戶端完成本機實測。參考 `TEST_RESULTS.txt`。