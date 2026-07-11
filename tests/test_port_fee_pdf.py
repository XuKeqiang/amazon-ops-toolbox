import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.ops_toolbox.port_fee_pdf import batch


SAMPLE_TEXT = """Century Distribution Systems (Shenzhen) Ltd.
INVOICE
HENGLITONG TRADING LIMITED
INVOICE NO.: VIVN691169SZ1
ISSUE DATE: 06/18/2026 REPRINTED 06/21/2026
REF NO. : 603N003421SZ1
CONSIGNEE : Amazon FBA US
VESSEL : KYOTO EXPRESS VOYAGE: 2528E
ETD DATE : 06/03/2026 DESTINATION: New York
LOAD PORT : Yantian DISCHARGE PORT: New York
TOTAL : 74 (3.003 CBM)
MASTER B/L : HLCUSZX2605DKYW0
FCR NO. : FBAN427641SZ126
Invoice Amount: CNY 325.04
Remark: AL0-RHS223GW44TZE
Prepared By: Kate Huang
"""


def word(top, x0, text):
    return {"top": top, "x0": x0, "text": text}


class FakePage:
    def extract_words(self, **kwargs):
        return [
            word(325, 36, "PORT"),
            word(325, 64, "SECURITY"),
            word(325, 115, "PRO-RATE"),
            word(325, 167, "(CBM)"),
            word(325, 198, "(HLBU2871438)"),
            word(326, 321, "3.003"),
            word(326, 382, "CBM"),
            word(325, 461, "0.6000"),
            word(326, 531, "1.80"),
            word(386, 36, "(SHOLRBTUIN28G7"),
            word(386, 82, "1C4H3A8)RGES"),
            word(388, 131, "(HLBU2871438)"),
            word(389, 321, "3.003"),
            word(389, 382, "CBM"),
            word(388, 456, "30.3600"),
            word(389, 526, "91.17"),
            word(400, 369, "Invoice"),
            word(400, 402, "Amount:"),
            word(401, 523, "325.04"),
        ]


class PortFeePdfBatchTest(unittest.TestCase):
    def test_extract_header_fields_from_century_invoice(self):
        fields = batch._extract_header_fields(SAMPLE_TEXT)

        self.assertEqual(fields["invoice_no"], "VIVN691169SZ1")
        self.assertEqual(fields["issue_date"], "06/18/2026")
        self.assertEqual(fields["reprinted_date"], "06/21/2026")
        self.assertEqual(fields["ref_no"], "603N003421SZ1")
        self.assertEqual(fields["consignee"], "Amazon FBA US")
        self.assertEqual(fields["vessel"], "KYOTO EXPRESS")
        self.assertEqual(fields["voyage"], "2528E")
        self.assertEqual(fields["destination"], "New York")
        self.assertEqual(fields["total_cartons"], "74")
        self.assertEqual(fields["total_cbm"], "3.003")
        self.assertEqual(fields["currency"], "CNY")
        self.assertEqual(fields["invoice_amount"], "325.04")

    def test_extract_detail_lines_uses_columns_and_marks_garbled_description(self):
        details = batch._extract_detail_lines(FakePage())

        self.assertEqual(len(details), 2)
        self.assertEqual(details[0]["费用描述"], "PORT SECURITY PRO-RATE (CBM) (HLBU2871438)")
        self.assertEqual(details[0]["Quantity"], "3.003")
        self.assertEqual(details[0]["Unit"], "CBM")
        self.assertEqual(details[0]["Unit Price"], "0.6000")
        self.assertEqual(details[0]["Amount"], "1.80")
        self.assertEqual(details[1]["费用描述"], "SORTING CHARGES (HLBU2871438)")
        self.assertEqual(details[1]["备注"], "")

    def test_process_port_fee_folder_writes_excel(self):
        invoice = {
            "summary": {
                "来源文件": "invoice.pdf",
                "Invoice No.": "VIVN691169SZ1",
                "Issue Date": "06/18/2026",
                "Reprinted Date": "",
                "Ref No.": "603N003421SZ1",
                "Consignee": "Amazon FBA US",
                "Vessel": "KYOTO EXPRESS",
                "Voyage": "2528E",
                "ETD Date": "06/03/2026",
                "Destination": "New York",
                "Load Port": "Yantian",
                "Discharge Port": "New York",
                "Total Cartons": "74",
                "Total CBM": "3.003",
                "Master B/L": "HLCUSZX2605DKYW0",
                "FCR No.": "FBAN427641SZ126",
                "Remark": "AL0-RHS223GW44TZE",
                "Prepared By": "Kate Huang",
                "Currency": "CNY",
                "Invoice Amount": "325.04",
                "费用明细行数": 1,
                "状态": "通过",
                "问题说明": "",
            },
            "details": [
                {
                    "来源文件": "invoice.pdf",
                    "Invoice No.": "VIVN691169SZ1",
                    "Remark": "AL0-RHS223GW44TZE",
                    "费用描述": "PORT SECURITY PRO-RATE (CBM) (HLBU2871438)",
                    "柜号/箱号": "HLBU2871438",
                    "Quantity": "3.003",
                    "Unit": "CBM",
                    "Unit Price": "0.6000",
                    "Currency": "CNY",
                    "Amount": "1.80",
                    "备注": "",
                }
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "invoice.pdf").write_text("placeholder", encoding="utf-8")
            with patch.object(batch, "extract_port_fee_invoice", return_value=invoice):
                job = batch.process_port_fee_folder(root, root / "out", "job001", "港杂费付款申请")

            self.assertEqual(job.summary["source_files"], 1)
            self.assertEqual(job.summary["warnings"], 0)
            self.assertTrue(job.output_path.exists())
            self.assertEqual(job.rows[0]["Invoice No."], "VIVN691169SZ1")


if __name__ == "__main__":
    unittest.main()
