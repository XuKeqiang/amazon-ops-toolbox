from __future__ import annotations

import re
import traceback
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pandas as pd
import pdfplumber


@dataclass
class PortFeePdfJob:
    job_id: str
    source_label: str
    output_dir: Path
    output_path: Path
    summary: dict
    rows: list[dict]
    details: list[dict]


SUMMARY_COLUMNS = [
    "来源文件",
    "Invoice No.",
    "Issue Date",
    "Reprinted Date",
    "Ref No.",
    "Consignee",
    "Vessel",
    "Voyage",
    "ETD Date",
    "Destination",
    "Load Port",
    "Discharge Port",
    "Total Cartons",
    "Total CBM",
    "Master B/L",
    "FCR No.",
    "Remark",
    "Prepared By",
    "Currency",
    "Invoice Amount",
    "费用明细行数",
    "状态",
    "问题说明",
]

DETAIL_COLUMNS = [
    "来源文件",
    "Invoice No.",
    "Remark",
    "费用描述",
    "柜号/箱号",
    "Quantity",
    "Unit",
    "Unit Price",
    "Currency",
    "Amount",
    "备注",
]


def process_port_fee_folder(folder: Path, output_dir: Path, job_id: str, label: str | None = None) -> PortFeePdfJob:
    label = label or str(folder)
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_paths = sorted(path for path in folder.rglob("*") if path.is_file() and path.suffix.lower() == ".pdf")
    rows: list[dict] = []
    details: list[dict] = []

    for pdf_path in pdf_paths:
        try:
            invoice = extract_port_fee_invoice(pdf_path)
            rows.append(invoice["summary"])
            details.extend(invoice["details"])
        except Exception as exc:
            rows.append(
                {
                    "来源文件": pdf_path.name,
                    "Invoice No.": "",
                    "Issue Date": "",
                    "Reprinted Date": "",
                    "Ref No.": "",
                    "Consignee": "",
                    "Vessel": "",
                    "Voyage": "",
                    "ETD Date": "",
                    "Destination": "",
                    "Load Port": "",
                    "Discharge Port": "",
                    "Total Cartons": "",
                    "Total CBM": "",
                    "Master B/L": "",
                    "FCR No.": "",
                    "Remark": "",
                    "Prepared By": "",
                    "Currency": "",
                    "Invoice Amount": "",
                    "费用明细行数": 0,
                    "状态": "解析失败",
                    "问题说明": f"{exc}；{traceback.format_exc(limit=2)}",
                }
            )

    output_path = output_dir / f"港杂费发票汇总_{label_name(label)}.xlsx"
    write_port_fee_excel(rows, details, output_path)
    warning_rows = [row for row in rows if row.get("状态") != "通过"]
    summary = {
        "source_files": len(pdf_paths),
        "processed": len(rows) - sum(1 for row in rows if row.get("状态") == "解析失败"),
        "failed": sum(1 for row in rows if row.get("状态") == "解析失败"),
        "warnings": len(warning_rows),
        "detail_rows": len(details),
        "currency": _single_value(row.get("Currency") for row in rows),
        "total_amount": _sum_amounts(row.get("Invoice Amount") for row in rows),
        "output_filename": output_path.name,
    }
    return PortFeePdfJob(
        job_id=job_id,
        source_label=label,
        output_dir=output_dir,
        output_path=output_path,
        summary=summary,
        rows=rows,
        details=details,
    )


def extract_port_fee_invoice(path: Path) -> dict:
    with pdfplumber.open(path) as pdf:
        page_texts = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(page_texts)
        details = []
        for page in pdf.pages:
            details.extend(_extract_detail_lines(page))

    fields = _extract_header_fields(text)
    notes = []
    for key, label in (
        ("invoice_no", "Invoice No."),
        ("issue_date", "Issue Date"),
        ("currency", "Currency"),
        ("invoice_amount", "Invoice Amount"),
    ):
        if not fields.get(key):
            notes.append(f"缺少 {label}")
    if not details:
        notes.append("未识别到费用明细")

    amount_total = _decimal(fields.get("invoice_amount"))
    detail_total = sum((_decimal(item.get("Amount")) or Decimal("0")) for item in details)
    if amount_total is not None and details and abs(detail_total - amount_total) > Decimal("0.02"):
        notes.append(f"费用明细合计 {detail_total} 与发票金额 {amount_total} 不一致")
    summary = {
        "来源文件": path.name,
        "Invoice No.": fields.get("invoice_no", ""),
        "Issue Date": fields.get("issue_date", ""),
        "Reprinted Date": fields.get("reprinted_date", ""),
        "Ref No.": fields.get("ref_no", ""),
        "Consignee": fields.get("consignee", ""),
        "Vessel": fields.get("vessel", ""),
        "Voyage": fields.get("voyage", ""),
        "ETD Date": fields.get("etd_date", ""),
        "Destination": fields.get("destination", ""),
        "Load Port": fields.get("load_port", ""),
        "Discharge Port": fields.get("discharge_port", ""),
        "Total Cartons": fields.get("total_cartons", ""),
        "Total CBM": fields.get("total_cbm", ""),
        "Master B/L": fields.get("master_bl", ""),
        "FCR No.": fields.get("fcr_no", ""),
        "Remark": fields.get("remark", ""),
        "Prepared By": fields.get("prepared_by", ""),
        "Currency": fields.get("currency", ""),
        "Invoice Amount": fields.get("invoice_amount", ""),
        "费用明细行数": len(details),
        "状态": "需复核" if notes else "通过",
        "问题说明": "；".join(notes),
    }
    detail_rows = [
        {
            "来源文件": path.name,
            "Invoice No.": fields.get("invoice_no", ""),
            "Remark": fields.get("remark", ""),
            **item,
            "Currency": fields.get("currency", ""),
        }
        for item in details
    ]
    return {"summary": summary, "details": detail_rows}


def write_port_fee_excel(rows: list[dict], details: list[dict], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(rows, columns=SUMMARY_COLUMNS).to_excel(writer, sheet_name="发票汇总", index=False)
        pd.DataFrame(details, columns=DETAIL_COLUMNS).to_excel(writer, sheet_name="费用明细", index=False)
    return output_path


def label_name(label: str) -> str:
    cleaned = Path(label).name if "/" in label or "\\" in label else label
    cleaned = re.sub(r'[<>:"/\\|?*]', "-", cleaned.strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .-")
    return cleaned or "批次"


def _extract_header_fields(text: str) -> dict:
    fields = {
        "invoice_no": _match(text, r"INVOICE\s+NO\.\s*:\s*([A-Z0-9-]+)"),
        "issue_date": _match(text, r"ISSUE\s+DATE\s*:\s*(\d{2}/\d{2}/\d{4})"),
        "reprinted_date": _match(text, r"REPRINTED\s+(\d{2}/\d{2}/\d{4})"),
        "ref_no": _match(text, r"REF\s+NO\.\s*:\s*([A-Z0-9-]+)"),
        "consignee": _match(text, r"CONSIGNEE\s*:\s*(.+)"),
        "master_bl": _match(text, r"MASTER\s+B/L\s*:\s*([A-Z0-9-]+)"),
        "fcr_no": _match(text, r"FCR\s+NO\.\s*:\s*([A-Z0-9-]+)"),
        "remark": _match(text, r"Remark\s*:\s*([A-Z0-9-]+)"),
        "prepared_by": _match(text, r"Prepared\s+By\s*:\s*(.+)"),
        "currency": _match(text, r"Invoice\s+Amount\s*:\s*([A-Z]{3})\s*[-\d,.]+"),
        "invoice_amount": _match(text, r"Invoice\s+Amount\s*:\s*[A-Z]{3}\s*([-\d,.]+)"),
    }
    vessel_line = _match(text, r"VESSEL\s*:\s*(.+)")
    if vessel_line:
        vessel_match = re.search(r"(.+?)\s+VOYAGE\s*:\s*(.+)$", vessel_line)
        if vessel_match:
            fields["vessel"] = vessel_match.group(1).strip()
            fields["voyage"] = vessel_match.group(2).strip()
        else:
            fields["vessel"] = vessel_line
            fields["voyage"] = ""
    etd_line = _match(text, r"ETD\s+DATE\s*:\s*(.+)")
    if etd_line:
        etd_match = re.search(r"(.+?)\s+DESTINATION\s*:\s*(.+)$", etd_line)
        if etd_match:
            fields["etd_date"] = etd_match.group(1).strip()
            fields["destination"] = etd_match.group(2).strip()
    port_line = _match(text, r"LOAD\s+PORT\s*:\s*(.+)")
    if port_line:
        port_match = re.search(r"(.+?)\s+DISCHARGE\s+PORT\s*:\s*(.+)$", port_line)
        if port_match:
            fields["load_port"] = port_match.group(1).strip()
            fields["discharge_port"] = port_match.group(2).strip()
    total_match = re.search(r"TOTAL\s*:\s*([\d,]+)\s*\(([-\d,.]+)\s*CBM\)", text)
    if total_match:
        fields["total_cartons"] = total_match.group(1).replace(",", "")
        fields["total_cbm"] = total_match.group(2).replace(",", "")
    return fields


def _extract_detail_lines(page) -> list[dict]:
    words = page.extract_words(x_tolerance=1, y_tolerance=3, keep_blank_chars=False)
    rows = _group_words_by_line(words)
    details = []
    for row in rows:
        top = row[0]["top"]
        if top < 320:
            continue
        row_text = " ".join(word["text"] for word in row)
        if "Invoice Amount" in row_text:
            break
        desc_words = [word["text"] for word in row if word["x0"] < 285]
        qty_words = [word["text"] for word in row if 285 <= word["x0"] < 360]
        unit_words = [word["text"] for word in row if 360 <= word["x0"] < 430]
        price_words = [word["text"] for word in row if 430 <= word["x0"] < 505]
        amount_words = [word["text"] for word in row if word["x0"] >= 505]
        if not desc_words or not amount_words:
            continue
        amount = _last_decimal_text(amount_words)
        if amount is None:
            continue
        description, note = _normalize_description(" ".join(desc_words))
        containers = sorted(set(re.findall(r"[A-Z]{4}\d{7}", description)))
        details.append(
            {
                "费用描述": description,
                "柜号/箱号": "、".join(containers),
                "Quantity": _first_decimal_text(qty_words) or "",
                "Unit": " ".join(unit_words),
                "Unit Price": _first_decimal_text(price_words) or "",
                "Amount": amount,
                "备注": note,
            }
        )
    return details


def _group_words_by_line(words: list[dict]) -> list[list[dict]]:
    grouped: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not grouped or abs(grouped[-1][0]["top"] - word["top"]) > 3:
            grouped.append([word])
        else:
            grouped[-1].append(word)
    return [sorted(row, key=lambda item: item["x0"]) for row in grouped]


def _normalize_description(description: str) -> tuple[str, str]:
    cleaned = re.sub(r"\s+", " ", description).strip()
    container = _match(cleaned, r"([A-Z]{4}\d{7})")
    suffix = f" ({container})" if container else ""
    if cleaned.startswith("(CHFMS") and "CHARGE (CBM)" in cleaned:
        return f"CFS RECEIVING CHARGE (CBM){suffix}", ""
    if "SHOLR" in cleaned and "RGES" in cleaned:
        return f"SORTING CHARGES{suffix}", ""
    return cleaned, ""


def _match(text: str, pattern: str) -> str:
    matched = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    return matched.group(1).strip() if matched else ""


def _first_decimal_text(values: list[str]) -> str | None:
    for value in values:
        if _decimal(value) is not None:
            return value.replace(",", "")
    return None


def _last_decimal_text(values: list[str]) -> str | None:
    for value in reversed(values):
        if _decimal(value) is not None:
            return value.replace(",", "")
    return None


def _decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _sum_amounts(values) -> str:
    total = Decimal("0")
    for value in values:
        total += _decimal(value) or Decimal("0")
    return f"{total:.2f}"


def _single_value(values) -> str:
    items = sorted({str(value) for value in values if value})
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return "多币种"
