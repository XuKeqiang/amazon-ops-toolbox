from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.ops_toolbox import server


class SystemUpdateTest(unittest.TestCase):
    def test_check_reports_remote_update(self) -> None:
        values = {
            ("branch", "--show-current"): "main",
            ("status", "--short"): "",
            ("rev-parse", "HEAD"): "local-full",
            ("rev-parse", "--short", "HEAD"): "local1",
            ("fetch", "--prune", "origin"): "",
            ("rev-parse", "origin/main"): "remote-full",
            ("rev-parse", "--short", "origin/main"): "remote2",
            ("rev-list", "--count", "HEAD..origin/main"): "2",
            ("rev-list", "--count", "origin/main..HEAD"): "0",
        }
        with patch.object(server, "_run_git", side_effect=lambda *args, **kwargs: values[args]):
            result = server._check_system_update()
        self.assertTrue(result["update_available"])
        self.assertEqual(result["behind"], 2)
        self.assertFalse(result["dirty"])

    def test_check_surfaces_local_changes(self) -> None:
        values = {
            ("branch", "--show-current"): "main",
            ("status", "--short"): " M config/local.json",
            ("rev-parse", "HEAD"): "same-full",
            ("rev-parse", "--short", "HEAD"): "same1",
            ("fetch", "--prune", "origin"): "",
            ("rev-parse", "origin/main"): "same-full",
            ("rev-parse", "--short", "origin/main"): "same1",
            ("rev-list", "--count", "HEAD..origin/main"): "0",
            ("rev-list", "--count", "origin/main..HEAD"): "0",
        }
        with patch.object(server, "_run_git", side_effect=lambda *args, **kwargs: values[args]):
            result = server._check_system_update()
        self.assertTrue(result["dirty"])
        self.assertEqual(result["changes"], [" M config/local.json"])

    def test_update_status_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            status_path = Path(temp_dir) / "status.json"
            with patch.object(server, "UPDATE_STATUS_PATH", status_path):
                server._write_update_status({"token": "secret", "phase": "queued"})
                self.assertEqual(server._read_update_status()["phase"], "queued")


if __name__ == "__main__":
    unittest.main()
