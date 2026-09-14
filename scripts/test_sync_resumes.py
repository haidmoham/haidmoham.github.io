"""Protect the all-or-nothing publication of the three Drive PDFs."""

from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import sync_resumes


class ResumeSyncTests(unittest.TestCase):
    def test_failed_download_preserves_all_published_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "resumes"
            output.mkdir()
            for resume in sync_resumes.RESUMES:
                (output / resume.filename).write_bytes(b"previous PDF")

            def download(file_id, destination):
                if file_id == sync_resumes.RESUMES[-1].file_id:
                    raise ValueError("Drive access denied")
                destination.write_bytes(b"new PDF")

            with patch.object(sync_resumes, "download_pdf", side_effect=download), patch.object(sync_resumes, "validate_pdf"):
                with self.assertRaisesRegex(ValueError, "Drive access denied"):
                    sync_resumes.export_resumes(output)
            for resume in sync_resumes.RESUMES:
                self.assertEqual((output / resume.filename).read_bytes(), b"previous PDF")

    def test_private_drive_html_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "resume.pdf"
            path.write_bytes(b"<html>Sign in</html>" * 1000)
            with self.assertRaisesRegex(ValueError, "not a PDF"):
                sync_resumes.validate_pdf(path, "private file")

    def test_download_uses_stored_pdf_endpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "resume.pdf"
            with patch.object(sync_resumes, "urlopen") as request:
                request.return_value.__enter__.return_value.read.side_effect = [b"%PDF-1.7", b""]
                sync_resumes.download_pdf("release-id", path)
            self.assertEqual(request.call_args.args[0].full_url, "https://drive.google.com/uc?export=download&id=release-id")
            self.assertEqual(path.read_bytes(), b"%PDF-1.7")


if __name__ == "__main__":
    unittest.main()
