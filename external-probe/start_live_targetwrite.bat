@echo off
cd /d "%~dp0"
echo WARNING: Experimental game-memory writes. Ensure consent and validate game version.
py -3 run.py --enable-target-write
pause