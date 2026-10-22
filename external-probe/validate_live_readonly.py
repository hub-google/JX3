"""Read-only validation report for a *running* JX3 process; prints no player names.

All offsets originate from a third-party note and remain unverified for current JX3.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from jx3probe.core import ExternalProbe, ProbeError
from jx3probe.winapi import WindowsProcessMemory, locate_process, module_base


def main():
    cfg = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
    report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only",
        "offset_profile": cfg.get("profile"),
        "status": "unverified",
        "windows_os": sys.platform == "win32",
        "game_client_confirmed": False,
    }
    mem = None
    try:
        pid = locate_process(cfg["process_name"])
        if pid is None:
            raise ProbeError("Game process not found")
        base = module_base(pid, cfg["process_name"])
        mem = WindowsProcessMemory(pid, allow_write=False)
        probe = ExternalProbe(mem, base, cfg, enable_target_write=False)
        snap = probe.snapshot(None, None, scan_loot=True)
        report.update({
            "pid": pid,
            "status": "parsed_unverified" if len(snap.units) > 0 else "indeterminate_empty_units",
            "units_count": len(snap.units),
            "loot_count": len(snap.loot),
            "warnings": snap.errors,
        })
        # Counts alone are not proof that the decoded objects are correct.
        # game_client_confirmed must be set only after independent in-game comparison.
    except (ProbeError, OSError, ValueError) as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
    finally:
        if mem is not None:
            mem.close()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "parsed_unverified" else 1


if __name__ == "__main__":
    sys.exit(main())