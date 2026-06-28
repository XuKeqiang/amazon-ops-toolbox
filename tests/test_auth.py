import tempfile
from pathlib import Path
from unittest import TestCase

from app.amazon_toolbox.auth import (
    ensure_user_store,
    hash_password,
    load_users,
    normalize_password,
    normalize_username,
    verify_password,
)


class AuthTest(TestCase):
    def test_ensure_user_store_creates_default_admin(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "users.json"

            ensure_user_store(path)
            users = load_users(path)

            self.assertEqual(len(users), 1)
            self.assertEqual(users[0]["username"], "admin")
            self.assertEqual(users[0]["role"], "admin")
            self.assertTrue(verify_password("admin123", users[0]["password_hash"]))

    def test_normalize_username(self) -> None:
        self.assertEqual(normalize_username("  AdminUser  "), "adminuser")

    def test_normalize_username_removes_embedded_format_controls(self) -> None:
        self.assertEqual(normalize_username("\u2060Adm\ufe0fin "), "admin")

    def test_password_hash_accepts_trimmed_login_value(self) -> None:
        encoded = hash_password("admin123")

        self.assertTrue(verify_password("admin123", encoded))
        self.assertTrue(verify_password(" admin123 ".strip(), encoded))

    def test_normalize_password_removes_invisible_and_full_width_chars(self) -> None:
        self.assertEqual(normalize_password("\u200b admin１２３ \ufeff"), "admin123")

    def test_normalize_password_removes_embedded_format_controls(self) -> None:
        self.assertEqual(normalize_password("adm\u2060in\ufe0f123"), "admin123")
