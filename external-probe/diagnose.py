"""Reproducible diagnostic runner. No gameplay automation, injection, or protection bypass.

Default: offline tests only. Optional --game performs the existing one-shot,
read-only client validation. Reports never include object/player/item names.
"""
import argparse
import ctypes
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
from datetime import datetime, timezone

BASE = Path(__file__).resolve().parent
USER_PATH = re.compile(r"(?i)(?:[A-Z]:\\Users\\|/home/)[^\\/\s]+")
MEMORY_ADDRESS = re.compile(r"(?i)0x[0-9a-f]{8,}")


def redact(text):
    return MEMORY_ADDRESS.sub("0x[REDACTED]", USER_PATH.sub("[USER-PATH-REDACTED]", str(text)))


def invoke(label, args, timeout):
    try:
        run = subprocess.run([sys.executable, *args], cwd=BASE, text=True,
                             capture_output=True, timeout=timeout, check=False)
        return {"name": label, "return_code": run.returncode,
                "status": "pass" if run.returncode == 0 else "fail",
                "stdout": redact(run.stdout)[-7500:],
                "stderr": redact(run.stderr)[-7500:]}
    except subprocess.TimeoutExpired:
        return {"name": label, "status": "timeout", "timeout_seconds": timeout}
    except OSError as exc:
        return {"name": label, "status": "error", "error": redact(exc)}


def main():
    parser = argparse.ArgumentParser(description="JX3 test report (read-only by default)")
    parser.add_argument("--game", action="store_true", help="Explicitly request one live read-only diagnostic")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    report = {
        "schema_version": 1,
        "timestamp_utc": now.isoformat(timespec="seconds"),
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_arch": platform.machine(),
        "python_version": platform.python_version(),
        "python_bits": ctypes.sizeof(ctypes.c_void_p) * 8,
        "game_test_requested": args.game,
        "game_test_result_is_proof_of_function": False,
        "stages": [invoke("offline_unit_and_windows_child_tests",
                          ["-m", "unittest", "discover", "-s", "tests", "-v"], 60)]
    }
    if args.game:
        if os.name == "nt":
            report["stages"].append(invoke("live_read_only_unverified",
                                           ["validate_live_readonly.py"], 45))
        else:
            report["stages"].append({"name": "live_read_only_unverified", "status": "skipped",
                                     "reason": "Windows only"})
    reports = BASE / "diagnostics"
    reports.mkdir(exist_ok=True)
    output = reports / ("jx3-diagnostic-" + now.strftime("%Y%m%dT%H%M%SZ") + ".json")
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    for step in report["stages"]:
        print(f"{step['name']}: {step['status']}")
    print(f"Saved diagnostic: {output.name} (in diagnostics folder)")
    return 0 if all(x["status"] in ("pass", "skipped") for x in report["stages"]) else 1


if __name__ == "__main__":
    sys.exit(main())