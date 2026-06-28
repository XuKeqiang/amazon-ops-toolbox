#!/usr/bin/env python3
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SKIP_DIRS = {"scripts", "outputs", "detail_backup", ".git", "__pycache__"}

MONTHS = {
    "jan": 1,
    "janv": 1,
    "janvier": 1,
    "ene": 1,
    "enero": 1,
    "januar": 1,
    "gen": 1,
    "gennaio": 1,
    "sty": 1,
    "stycznia": 1,
    "feb": 2,
    "févr": 2,
    "fevr": 2,
    "febrero": 2,
    "februar": 2,
    "febbraio": 2,
    "lut": 2,
    "lutego": 2,
    "mar": 3,
    "mrt": 3,
    "mars": 3,
    "marzo": 3,
    "mär": 3,
    "marz": 3,
    "marzec": 3,
    "marca": 3,
    "apr": 4,
    "abr": 4,
    "avr": 4,
    "abril": 4,
    "april": 4,
    "aprile": 4,
    "kwie": 4,
    "kwi": 4,
    "kwietnia": 4,
    "may": 5,
    "mei": 5,
    "mai": 5,
    "mayo": 5,
    "mag": 5,
    "maggio": 5,
    "maj": 5,
    "maja": 5,
    "jun": 6,
    "juin": 6,
    "junio": 6,
    "juni": 6,
    "giugno": 6,
    "giu": 6,
    "cze": 6,
    "czerwca": 6,
    "jul": 7,
    "juil": 7,
    "juillet": 7,
    "julio": 7,
    "juli": 7,
    "lug": 7,
    "luglio": 7,
    "lip": 7,
    "lipca": 7,
    "aug": 8,
    "août": 8,
    "aout": 8,
    "agosto": 8,
    "august": 8,
    "ago": 8,
    "sierpnia": 8,
    "sie": 8,
    "sep": 9,
    "sept": 9,
    "septiembre": 9,
    "september": 9,
    "set": 9,
    "settembre": 9,
    "wrz": 9,
    "września": 9,
    "wrzesnia": 9,
    "oct": 10,
    "octobre": 10,
    "octubre": 10,
    "okt": 10,
    "ott": 10,
    "ottobre": 10,
    "paź": 10,
    "paz": 10,
    "października": 10,
    "pazdziernika": 10,
    "nov": 11,
    "novembre": 11,
    "noviembre": 11,
    "november": 11,
    "lis": 11,
    "listopada": 11,
    "dec": 12,
    "déc": 12,
    "decembre": 12,
    "décembre": 12,
    "diciembre": 12,
    "dez": 12,
    "dic": 12,
    "dicembre": 12,
    "gru": 12,
    "grudnia": 12,
}


def clean_cell(value):
    return (value or "").replace("\ufeff", "").replace("\xa0", " ").strip()


def norm_header(value):
    value = clean_cell(value).lower()
    value = re.sub(r"\s+", " ", value)
    return value.strip(" :")


def find_header(rows):
    for i, row in enumerate(rows[:30]):
        normalized = [norm_header(c) for c in row]
        joined = " | ".join(normalized)
        if (
            any(h in normalized for h in ("date/time", "date/heure", "fecha/hora", "fecha y hora", "datum/uhrzeit", "data/ora", "datum/tijd"))
            or "datum/zeit" in joined
            or "data/godzina" in joined
            or "datum/tid" in joined
        ) and any("type" == h or "tipo" == h or "typ" == h for h in normalized):
            return i
    raise ValueError("Could not find structured header row")


def parse_date(value):
    raw = clean_cell(value)
    if not raw:
        return None
    s = raw.lower().replace("\xa0", " ")
    s = s.replace(",", " ").replace(".", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\b(a|p)\s*m\s*\b", lambda m: f"{m.group(1)}m", s)
    tokens = s.split()
    tz_tokens = {"utc", "pst", "pdt", "cet", "cest", "gmt", "bst", "mst", "mdt", "est", "edt"}
    tokens = [t for t in tokens if t not in tz_tokens]

    # Month-name based formats seen in Amazon reports:
    # Jan 2 2025 1:58:11 am / 1 janv 2025 16:56:37 / 2025 jan 2 ...
    month_idx = next((i for i, t in enumerate(tokens) if t in MONTHS), None)
    if month_idx is not None:
        month = MONTHS[tokens[month_idx]]
        year = None
        day = None
        for t in tokens:
            if re.fullmatch(r"\d{4}", t):
                year = int(t)
                break
        numeric = [int(t) for t in tokens if re.fullmatch(r"\d{1,2}", t)]
        if month_idx == 0 and len(tokens) > 1 and re.fullmatch(r"\d{1,2}", tokens[1]):
            day = int(tokens[1])
        elif month_idx > 0 and re.fullmatch(r"\d{1,2}", tokens[month_idx - 1]):
            day = int(tokens[month_idx - 1])
        elif numeric:
            day = numeric[0]
        if year and day:
            return datetime(year, month, day)

    # Numeric fallbacks.
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw[:10], fmt)
        except ValueError:
            pass
    return None


def rows_from_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def main():
    files = sorted(
        p
        for p in ROOT.rglob("*.csv")
        if p.relative_to(ROOT).parts[0] not in SKIP_DIRS
    )
    country_stats = defaultdict(lambda: {
        "files": 0,
        "rows": 0,
        "headers": Counter(),
        "type_description": Counter(),
        "date_min": None,
        "date_max": None,
        "date_parse_failures": 0,
        "sample_dates": [],
    })
    file_stats = []

    for path in files:
        country = path.relative_to(ROOT).parts[0]
        rows = rows_from_csv(path)
        try:
            header_idx = find_header(rows)
        except ValueError as exc:
            preview = [" | ".join(clean_cell(c) for c in row[:8]) for row in rows[:14]]
            raise ValueError(f"{exc}: {path.relative_to(ROOT)}\n" + "\n".join(preview)) from exc
        headers = [clean_cell(c) for c in rows[header_idx]]
        data = rows[header_idx + 1 :]
        lower_map = {norm_header(h): i for i, h in enumerate(headers)}
        date_idx = next(i for i, h in enumerate(headers) if norm_header(h) in {"date/time", "date/heure", "fecha/hora", "fecha y hora", "datum/uhrzeit", "data/ora", "datum/tijd"} or "datum" in norm_header(h) or "data/godzina" in norm_header(h))
        type_idx = next((i for i, h in enumerate(headers) if norm_header(h) in {"type", "tipo", "typ"}), None)
        desc_idx = next((i for i, h in enumerate(headers) if norm_header(h) in {"description", "descripción", "beschreibung", "descrizione", "opis"}), None)

        parsed_dates = []
        for row in data:
            if not any(clean_cell(c) for c in row):
                continue
            dt = parse_date(row[date_idx] if date_idx < len(row) else "")
            if dt:
                parsed_dates.append(dt)
            else:
                country_stats[country]["date_parse_failures"] += 1
            if type_idx is not None and desc_idx is not None:
                typ = clean_cell(row[type_idx] if type_idx < len(row) else "")
                desc = clean_cell(row[desc_idx] if desc_idx < len(row) else "")
                country_stats[country]["type_description"][(typ, desc)] += 1

        stats = country_stats[country]
        stats["files"] += 1
        stats["rows"] += len([r for r in data if any(clean_cell(c) for c in r)])
        stats["headers"].update(headers)
        if parsed_dates:
            mn, mx = min(parsed_dates), max(parsed_dates)
            stats["date_min"] = mn if stats["date_min"] is None else min(stats["date_min"], mn)
            stats["date_max"] = mx if stats["date_max"] is None else max(stats["date_max"], mx)
        stats["sample_dates"].extend([clean_cell(r[date_idx]) for r in data[:3] if date_idx < len(r)])
        file_stats.append({
            "country": country,
            "file": str(path.relative_to(ROOT)),
            "header_row_1_based": header_idx + 1,
            "data_rows": len(data),
            "columns": len(headers),
            "date_min": min(parsed_dates).date().isoformat() if parsed_dates else None,
            "date_max": max(parsed_dates).date().isoformat() if parsed_dates else None,
        })

    summary = {
        "files": file_stats,
        "countries": {},
    }
    for country, stats in sorted(country_stats.items()):
        top_combos = [
            {"type": k[0], "description": k[1], "count": v}
            for k, v in stats["type_description"].most_common(40)
        ]
        summary["countries"][country] = {
            "files": stats["files"],
            "rows": stats["rows"],
            "date_min": stats["date_min"].date().isoformat() if stats["date_min"] else None,
            "date_max": stats["date_max"].date().isoformat() if stats["date_max"] else None,
            "date_parse_failures": stats["date_parse_failures"],
            "column_count_union": len(stats["headers"]),
            "sample_dates": stats["sample_dates"][:6],
            "top_type_description": top_combos,
        }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
