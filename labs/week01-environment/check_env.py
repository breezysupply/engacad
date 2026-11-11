#!/usr/bin/env python3
"""EngAcad Week 01 environment check.

Verifies that a real terminal has a usable Python 3 and Git. Safe to run:
it reads version information, writes one temporary file and deletes it again.
No network access, no credentials, no sudo.

Usage:  python3 labs/week01-environment/check_env.py
"""

import os
import platform
import shutil
import subprocess
import sys
import tempfile

MIN_PYTHON = (3, 11)
results = []


def report(name, ok, detail, fix=""):
    results.append(ok)
    mark = "OK  " if ok else "FIX "
    print(f"[{mark}] {name}: {detail}")
    if not ok and fix:
        print(f"       -> {fix}")


def main():
    print("EngAcad environment check\n")

    version = sys.version_info
    version_text = f"{version.major}.{version.minor}.{version.micro}"
    report(
        "Python version",
        version >= MIN_PYTHON,
        version_text,
        "Install Python 3.11+ from python.org or with `brew install python@3.12`.",
    )

    report("Python executable", True, sys.executable)

    in_venv = sys.prefix != getattr(sys, "base_prefix", sys.prefix)
    report("Virtual environment", True, "active" if in_venv else "not active (fine for this lab)")

    git = shutil.which("git")
    git_version = ""
    if git:
        try:
            git_version = subprocess.run([git, "--version"], capture_output=True, text=True, timeout=10).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            git_version = ""
    report("Git", bool(git_version), git_version or "not found", "Install Git (macOS: `xcode-select --install`).")

    try:
        with tempfile.NamedTemporaryFile("w+", suffix=".txt", delete=False) as handle:
            handle.write("beacon-api is reachable\n")
            path = handle.name
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        os.remove(path)
        report("File read/write", text == "beacon-api is reachable\n", "temporary file written, read and removed")
    except OSError as exc:
        report("File read/write", False, str(exc), "Check permissions on your temporary directory.")

    system = platform.system().lower() or "unknown"
    codespace = "yes" if os.environ.get("CODESPACES") == "true" else "no"
    status = "PASS" if all(results) else "FAIL"
    print()
    print(f"Platform: {platform.platform()}")
    print(f"Result: {status} ({sum(results)}/{len(results)} checks OK)")
    print()
    # Single summary line read by the EngAcad lab page. EngAcad stores it as
    # self-reported evidence: a static website cannot verify where it ran.
    print(
        f"ENGACAD-ENV-CHECK v1 python={version_text} platform={system} "
        f"codespace={codespace} git={'yes' if git_version else 'no'} status={status}"
    )
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
