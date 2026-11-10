# SPDX-License-Identifier: 0BSD
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("availability", Path(__file__).with_name("monolith-availability.py"))
availability = importlib.util.module_from_spec(spec)
spec.loader.exec_module(availability)


class FakeHost:
    def __init__(self):
        self.ok = False
        self.allowed = True
        self.actions = []
        self.raise_recovery = False

    def snapshot(self):
        return {"tailscale": {"ok": self.ok, "backend": "Running"}}

    def can_recover(self, component, observation):
        return self.allowed, "internet unavailable"

    def recover(self, component):
        self.actions.append(component)
        if self.raise_recovery:
            raise RuntimeError("restart failed")


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.host = FakeHost()
        self.state = {}
        self.config = {**availability.DEFAULTS}

    def tick(self, now):
        return availability.cycle(self.config, self.state, self.host, now)

    def test_three_consecutive_failures_then_recovery(self):
        self.tick(1000)
        self.tick(1060)
        self.assertEqual(self.host.actions, [])
        self.assertEqual(self.tick(1120)[0]["recovery"], "requested")
        self.assertEqual(self.host.actions, ["tailscale"])

    def test_healthy_probe_resets_the_failure_streak(self):
        self.tick(1000)
        self.tick(1060)
        self.host.ok = True
        self.tick(1120)
        self.host.ok = False
        self.tick(1180)
        self.assertEqual(self.host.actions, [])
        self.assertEqual(self.state["tailscale"]["failures"], 1)

    def test_cooldown_applies_after_failed_restart_too(self):
        self.host.raise_recovery = True
        for now in [1000, 1060, 1120, 1180, 1240, 1300]:
            self.tick(now)
        self.assertEqual(self.host.actions, ["tailscale"])
        self.assertEqual(self.tick(1360)[0]["deferred"], "recovery cooldown")

    def test_missing_internet_defers_recovery(self):
        self.host.allowed = False
        for now in [1000, 1060, 1120, 1180]:
            self.tick(now)
        self.assertEqual(self.host.actions, [])
        self.host.allowed = True
        self.tick(1240)
        self.assertEqual(self.host.actions, ["tailscale"])

    def test_hourly_cap_and_expiry(self):
        self.state["tailscale"] = {"failures": 2, "recoveries": [1000, 1600, 2200]}
        self.assertEqual(self.tick(2900)[0]["deferred"], "hourly recovery limit")
        self.tick(4601)
        self.assertEqual(self.host.actions, ["tailscale"])

    def test_operator_signin_is_not_restarted(self):
        host = availability.Host(self.config)
        with patch.object(host, "command") as command:
            allowed, _ = host.can_recover("tailscale", {"backend": "NeedsLogin"})
        self.assertFalse(allowed)
        command.assert_not_called()

    def test_update_or_uncertain_updater_blocks_container_restart(self):
        host = availability.Host(self.config)
        with patch.object(host, "maintenance", return_value=True), patch.object(host, "container") as container:
            allowed, _ = host.can_recover("monolith", {})
        self.assertFalse(allowed)
        container.assert_not_called()

    def test_unhealthy_database_is_not_restarted(self):
        host = availability.Host(self.config)
        with patch.object(host, "maintenance", return_value=False), patch.object(host, "container", return_value={"State": {"Running": True, "Health": {"Status": "unhealthy"}}}):
            allowed, _ = host.can_recover("monolith", {})
        self.assertFalse(allowed)

    def test_update_started_during_recovery_aborts_container_restart(self):
        host = availability.Host(self.config)
        with patch.object(host, "container", return_value={"Id": "immutable-id"}), patch.object(host, "maintenance", return_value=True), patch.object(host, "command") as command:
            with self.assertRaises(RuntimeError):
                host.recover("monolith")
        command.assert_not_called()

    def test_broken_app_does_not_trigger_network_recovery(self):
        host = availability.Host(self.config)
        with patch.object(host, "http", side_effect=OSError), patch.object(host, "command", return_value='{"BackendState":"Running","Self":{"Online":true}}'):
            result = host.snapshot()
        self.assertTrue(result["tailscale"]["ok"])
        self.assertFalse(result["monolith"]["ok"])


if __name__ == "__main__":
    unittest.main()
