from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = APP_ROOT / "static"
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "app-config.json"
DEFAULT_INPUT_ROOT = PROJECT_ROOT / "data" / "input"


@dataclass(frozen=True)
class AppConfig:
    config_path: Path
    host: str
    port: int
    data_root: Path
    upload_root: Path
    output_root: Path
    database_path: Path
    user_store: Path
    allowed_input_roots: tuple[Path, ...]
    max_upload_mb: int
    backup_root: Path
    backup_retention_days: int

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def load_config(config_path: Path | None = None) -> AppConfig:
    path = config_path or Path(os.environ.get("OPS_TOOLBOX_CONFIG", DEFAULT_CONFIG_PATH)).expanduser()
    raw = _read_json(path)

    server = raw.get("server", {})
    paths = raw.get("paths", {})
    limits = raw.get("limits", {})
    backups = raw.get("backups", {})

    data_root = _resolve_path(paths.get("data_root", "data"))
    upload_root = _resolve_path(paths.get("upload_root", data_root / "uploads"))
    output_root = _resolve_path(paths.get("output_root", data_root / "outputs"))
    database_path = _resolve_path(paths.get("database_path", data_root / "app.sqlite3"))
    user_store = _resolve_path(paths.get("user_store", data_root / "users.json"))
    backup_root = _resolve_path(backups.get("backup_root", data_root / "backups"))

    allowed_values = paths.get("allowed_input_roots")
    if not allowed_values:
        allowed_values = [str(DEFAULT_INPUT_ROOT)]
    allowed_input_roots = tuple(_resolve_path(value).resolve() for value in allowed_values)

    return AppConfig(
        config_path=path,
        host=str(server.get("host", os.environ.get("OPS_TOOLBOX_HOST", "127.0.0.1"))),
        port=int(server.get("port", os.environ.get("OPS_TOOLBOX_PORT", "8080"))),
        data_root=data_root,
        upload_root=upload_root,
        output_root=output_root,
        database_path=database_path,
        user_store=user_store,
        allowed_input_roots=allowed_input_roots,
        max_upload_mb=int(limits.get("max_upload_mb", os.environ.get("OPS_TOOLBOX_MAX_UPLOAD_MB", "500"))),
        backup_root=backup_root,
        backup_retention_days=int(backups.get("retention_days", os.environ.get("OPS_TOOLBOX_BACKUP_RETENTION_DAYS", "14"))),
    )


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"配置文件必须是 JSON 对象：{path}")
    return data


def _resolve_path(value: str | Path) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path
