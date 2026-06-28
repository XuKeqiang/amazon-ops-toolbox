from __future__ import annotations

import contextlib
import io
import json
from dataclasses import dataclass
from pathlib import Path

from . import process_payment_detail_reports as detail_processor


@dataclass
class TransactionCsvJob:
    job_id: str
    source_label: str
    output_dir: Path
    total_path: Path
    audit_xlsx_path: Path
    audit_json_path: Path
    summary: dict
    rows: list[dict]
    countries: list[dict]


def process_transaction_folder(
    folder: Path,
    output_dir: Path,
    job_id: str,
    label: str | None = None,
    include_country_files: bool = False,
    include_quarter_backup: bool = False,
) -> TransactionCsvJob:
    label = label or folder.name
    argv = [
        "--input-dir",
        str(folder),
        "--output-dir",
        str(output_dir),
        "--label",
        label,
    ]
    if include_country_files:
        argv.append("--include-country-files")
    if include_quarter_backup:
        argv.append("--include-quarter-backup")

    with contextlib.redirect_stdout(io.StringIO()):
        detail_processor.main(argv)

    audit_json_path = output_dir / "清洗审计报告.json"
    audit_xlsx_path = output_dir / "清洗审计报告.xlsx"
    audit = json.loads(audit_json_path.read_text("utf-8"))
    total_path = output_dir / f"亚马逊各国交易总表_{label}.xlsx"

    summary = {
        "source_files": audit.get("source_file_count", 0),
        "formats": audit.get("source_file_formats", {}),
        "source_valid_rows": audit.get("source_valid_rows", 0),
        "parsed_rows": audit.get("parsed_rows", 0),
        "total_rows": audit.get("total_rows", 0),
        "countries": len(audit.get("countries", {})),
        "date_parse_failures": audit.get("date_parse_failure_count", 0),
        "amount_failures": audit.get("amount_failure_count", 0),
        "unresolved_country_files": len(audit.get("unresolved_country_files", [])),
        "unsupported_files": len(audit.get("unsupported_files", [])),
        "country_files": len(audit.get("country_files", [])),
        "quarter_files": len(audit.get("quarter_files", [])),
        "output_filename": total_path.name,
        "audit_filename": audit_xlsx_path.name,
    }

    rows = [
        {
            "source_file": Path(item.get("file", "")).name or item.get("file", ""),
            "source_path": item.get("file", ""),
            "format": item.get("format", ""),
            "sheet": item.get("sheet", ""),
            "brand": item.get("brand", ""),
            "country": item.get("country", ""),
            "currency": item.get("currency", ""),
            "header_row": item.get("header_row", ""),
            "source_rows": item.get("source_rows", 0),
            "parsed_rows": item.get("parsed_rows", 0),
            "date_min": item.get("date_min", ""),
            "date_max": item.get("date_max", ""),
            "status": _file_status(item),
            "notes": _file_notes(item),
        }
        for item in audit.get("files", [])
    ]
    countries = [
        {
            "country": country,
            "rows": item.get("rows", 0),
            "date_min": item.get("date_min", ""),
            "date_max": item.get("date_max", ""),
        }
        for country, item in sorted(audit.get("countries", {}).items())
    ]
    return TransactionCsvJob(
        job_id=job_id,
        source_label=str(folder),
        output_dir=output_dir,
        total_path=total_path,
        audit_xlsx_path=audit_xlsx_path,
        audit_json_path=audit_json_path,
        summary=summary,
        rows=rows,
        countries=countries,
    )


def _file_status(item: dict) -> str:
    if not item.get("country"):
        return "需复核"
    if item.get("source_rows", 0) != item.get("parsed_rows", 0):
        return "需复核"
    return "通过"


def _file_notes(item: dict) -> str:
    notes = []
    if not item.get("country"):
        notes.append("国家未识别")
    if item.get("source_rows", 0) != item.get("parsed_rows", 0):
        notes.append("源行数与解析行数不一致")
    return "；".join(notes)
