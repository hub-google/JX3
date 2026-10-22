@echo off
cd /d "%~dp0"
echo Read-only game test. Anti-cheat detection and penalties are still possible.
echo Do NOT use this on an account or environment you are unwilling to risk.
py -3 diagnose.py --game
pause