from __future__ import annotations

import io
import unittest

from app.ops_toolbox.server import AmazonToolboxHandler


class MultipartUploadParsingTest(unittest.TestCase):
    def test_read_multipart_files_preserves_relative_filenames(self):
        boundary = "----amazon-toolbox-test"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="files"; filename="brand/us/report.csv"\r\n'
            "Content-Type: text/csv\r\n\r\n"
            "a,b\n1,2\n"
            f"\r\n--{boundary}\r\n"
            'Content-Disposition: form-data; name="files"; filename="walmart.xlsx"\r\n'
            "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n"
            "xlsx-bytes"
            f"\r\n--{boundary}--\r\n"
        ).encode("utf-8")
        handler = object.__new__(AmazonToolboxHandler)
        handler.rfile = io.BytesIO(body)

        files = handler._read_multipart_files(
            f"multipart/form-data; boundary={boundary}",
            len(body),
        )

        self.assertEqual([item.filename for item in files], ["brand/us/report.csv", "walmart.xlsx"])
        self.assertEqual(files[0].content, b"a,b\n1,2\n")
        self.assertEqual(files[1].content, b"xlsx-bytes")

    def test_read_multipart_files_keeps_chinese_filename(self):
        boundary = "----amazon-toolbox-test-cn"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="files"; filename="品牌/加拿大/汇总报告.pdf"\r\n'
            "Content-Type: application/pdf\r\n\r\n"
            "%PDF-1.4"
            f"\r\n--{boundary}--\r\n"
        ).encode("utf-8")
        handler = object.__new__(AmazonToolboxHandler)
        handler.rfile = io.BytesIO(body)

        files = handler._read_multipart_files(
            f"multipart/form-data; boundary={boundary}",
            len(body),
        )

        self.assertEqual(files[0].filename, "品牌/加拿大/汇总报告.pdf")
        self.assertEqual(files[0].content, b"%PDF-1.4")


if __name__ == "__main__":
    unittest.main()
