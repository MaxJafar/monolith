"""Maintain one loopback SSH forward over the saved, pinned Tailscale connection."""
import json
import pathlib
import subprocess
import time

root = pathlib.Path.home() / ".monolith-ai"
settings = json.loads((root / "tunnel.json").read_text())
while True:
    try:
        subprocess.run([settings["ssh"], "-F", settings["config"], "-N", "-T",
            "-o", "ExitOnForwardFailure=yes", "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=3", "-L", "127.0.0.1:8771:127.0.0.1:8771",
            settings["alias"]], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except OSError:
        pass
    time.sleep(5)
