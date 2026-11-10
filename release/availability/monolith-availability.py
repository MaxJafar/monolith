#!/usr/bin/env python3
# SPDX-License-Identifier: 0BSD
"""Bounded recovery for a Tailscale-exposed Monolith host."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request


BUSY_PHASES = {"checking", "downloading", "verifying", "installing", "restarting", "rollingBack", "recovering"}
DEFAULTS = {
    "public_url": "https://optiplex-server.tail8320dd.ts.net:8459",
    "local_health_url": "http://127.0.0.1:18110/healthz",
    "failure_threshold": 3,
    "cooldown_seconds": 600,
    "max_recoveries_per_hour": 3,
    "updater_config": "/etc/monolith-updater/config.json",
    "updater_state": "/var/lib/monolith-updater",
    "state_dir": "/var/lib/monolith-availability",
    "pause_file": "/run/monolith-availability.pause",
}


def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)


class Host:
    def __init__(self, config):
        self.config = config

    def command(self, args, timeout=12):
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True).stdout

    def http(self, url, headers=None):
        request = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(request, timeout=8) as response:
            if response.status != 200:
                raise ValueError("Unexpected health status")
            return json.loads(response.read(1024 * 1024))

    def snapshot(self):
        try:
            health = self.http(self.config["local_health_url"])
            app_ok = health.get("status") == "ok" and health.get("apiHealthy") is True
        except Exception:
            app_ok = False
        try:
            status = json.loads(self.command(["tailscale", "status", "--json"]))
            backend = status.get("BackendState", "unknown")
            tail_ok = backend == "Running" and status.get("Self", {}).get("Online") is True
            detail = "online" if tail_ok else backend
        except Exception:
            backend, tail_ok, detail = "unavailable", False, "daemon unavailable"
        # A working local backend but broken HTTPS route also needs network recovery.
        if tail_ok and app_ok:
            try:
                public = self.http(self.config["public_url"].rstrip("/") + "/healthz")
                tail_ok = public.get("status") == "ok" and public.get("apiHealthy") is True
            except Exception:
                tail_ok = False
            if not tail_ok:
                detail = "public HTTPS health failed"
        return {
            "tailscale": {"ok": tail_ok, "detail": detail, "backend": backend},
            "monolith": {"ok": app_ok, "detail": "healthy" if app_ok else "local API health failed"},
        }

    def maintenance(self):
        if Path(self.config["pause_file"]).exists():
            return True
        if Path(self.config["updater_state"], "pending.json").exists():
            return True
        try:
            if self.command(["systemctl", "is-active", "monolith-updater"]).strip() != "active":
                return True
            config = json.loads(Path(self.config["updater_config"]).read_text())
            token = Path(config["tokenFile"]).read_text().strip()
            state = self.http("http://" + config["listen"] + "/status", {"Authorization": "Bearer " + token})
            return state.get("phase") in BUSY_PHASES or "phase" not in state
        except Exception:
            # Unknown updater state must never cause a competing container restart.
            return True

    def container(self, service):
        data = json.loads(self.command(["docker", "inspect", "monolith-" + service + "-1"]))[0]
        labels = data.get("Config", {}).get("Labels", {})
        if labels.get("com.docker.compose.project") != "monolith" or labels.get("com.docker.compose.service") != service:
            raise ValueError("Unexpected container ownership")
        return data

    def can_recover(self, component, observation):
        if component == "tailscale":
            if observation.get("backend") in {"NeedsLogin", "NeedsMachineAuth", "Stopped"}:
                return False, "Tailscale requires operator sign-in or was paused"
            try:
                # Do not repeatedly restart a daemon during an actual internet outage.
                self.command(["curl", "--silent", "--show-error", "--fail", "--connect-timeout", "4", "--max-time", "8", "--output", "/dev/null", "https://controlplane.tailscale.com/"])
                return True, "internet reachable"
            except Exception:
                return False, "internet unavailable; waiting for connectivity"
        if self.maintenance():
            return False, "updater active, unavailable, or maintenance paused"
        try:
            database = self.container("db")["State"]
            if not database.get("Running") or database.get("Health", {}).get("Status") != "healthy":
                return False, "database unhealthy; preserving database for operator diagnosis"
            self.container("server")
            self.container("gateway")
            return True, "database healthy and updater idle"
        except Exception:
            return False, "could not validate managed containers"

    def recover(self, component):
        if component == "tailscale":
            self.command(["systemctl", "restart", "tailscaled"], timeout=30)
            return
        # Use immutable container IDs and recheck the updater before each operation.
        containers = [self.container(service)["Id"] for service in ("server", "gateway")]
        for container_id in containers:
            if self.maintenance():
                raise RuntimeError("Update or maintenance started; recovery deferred")
            self.command(["docker", "restart", "--time", "20", container_id], timeout=40)


def cycle(config, state, host, now):
    observations = host.snapshot()
    events = []
    for component, observation in observations.items():
        saved = state.setdefault(component, {"failures": 0, "recoveries": []})
        saved["recoveries"] = [stamp for stamp in saved["recoveries"] if now - stamp < 3600]
        saved["failures"] = 0 if observation["ok"] else saved["failures"] + 1
        saved["last_checked"] = now
        saved["last_healthy"] = now if observation["ok"] else saved.get("last_healthy")
        event = {"component": component, **observation, "failures": saved["failures"]}
        if saved["failures"] >= config["failure_threshold"]:
            attempts = saved["recoveries"]
            if attempts and now - attempts[-1] < config["cooldown_seconds"]:
                event["deferred"] = "recovery cooldown"
            elif len(attempts) >= config["max_recoveries_per_hour"]:
                event["deferred"] = "hourly recovery limit"
            else:
                allowed, reason = host.can_recover(component, observation)
                if not allowed:
                    event["deferred"] = reason
                else:
                    # Count failed recovery commands too, so failures cannot create a restart loop.
                    attempts.append(now)
                    saved["failures"] = 0
                    try:
                        host.recover(component)
                        event["recovery"] = "requested"
                    except Exception:
                        event["recovery"] = "failed; see service/container journal"
        events.append(event)
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="/etc/monolith-availability.json")
    parser.add_argument("--check", action="store_true", help="Read-only health report; never changes recovery state")
    args = parser.parse_args()
    config = {**DEFAULTS, **json.loads(Path(args.config).read_text())}
    host = Host(config)
    if args.check:
        emit(host.snapshot())
        return
    if os.geteuid() != 0:
        raise PermissionError("Recovery must run as the system service")
    if Path(config["pause_file"]).exists():
        emit({"event": "paused for maintenance"})
        return
    import fcntl

    folder = Path(config["state_dir"])
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (folder / "lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        target = folder / "state.json"
        state = json.loads(target.read_text()) if target.exists() else {}
        for event in cycle(config, state, host, time.time()):
            emit(event)
        temporary = folder / "state.json.next"
        temporary.write_text(json.dumps(state, indent=2) + "\n")
        temporary.chmod(0o600)
        temporary.replace(target)


if __name__ == "__main__":
    os.umask(0o077)
    main()
