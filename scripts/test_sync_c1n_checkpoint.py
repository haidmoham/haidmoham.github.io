"""Verify atomic, hash-checked C-1N checkpoint publication."""

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("sync-c1n-checkpoint.py")
SPEC = importlib.util.spec_from_file_location("sync_c1n_checkpoint", MODULE_PATH)
sync = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(sync)


class Response(io.BytesIO):
    def __init__(self, content: bytes, url: str):
        super().__init__(content)
        self.url = url

    def geturl(self):
        return self.url

    def __enter__(self):
        return self

    def __exit__(self, *_arguments):
        self.close()


def feed(media: bytes, digest: str | None = None, poster: bytes = b"measured poster") -> bytes:
    record = {
        "schema_version": 1,
        "checkpoint": {
            "id": "c1n-03-stride",
            "label": "C-1N // 03 · STRIDE",
            "policy": "walk_fast_500",
            "source_commit": "a" * 40,
            "evidence_url": f"https://github.com/haidmoham/spider/blob/{'a' * 40}/docs/checkpoints/stride.md",
        },
        "metrics": {
            "mean_speed_m_s": 0.887987,
            "sampled_mean_speed_m_s": 0.821139,
            "falls": 0,
            "evaluations": 24,
        },
        "scope": "fixed five-second flat-ground evaluations",
        "limits": ["contact fragmentation", "foot slip"],
        "copy": {
            "title": "C-1N // 03 · STRIDE",
            "description": "A learned six-leg walking policy.",
            "summary": "24 fixed flat-ground evaluations with zero falls.",
        },
        "media": {
            "url": "https://raw.githubusercontent.com/haidmoham/spider/master/public/walking-comparison.mp4",
            "sha256": digest or hashlib.sha256(media).hexdigest(),
            "poster_url": "https://raw.githubusercontent.com/haidmoham/spider/master/public/walking-comparison.jpg",
            "poster_sha256": hashlib.sha256(poster).hexdigest(),
        },
    }
    return json.dumps(record).encode()


class CheckpointSyncTests(unittest.TestCase):
    def responses(self, feed_bytes: bytes, media: bytes, poster: bytes = b"measured poster"):
        def open_url(request, timeout=0):
            url = request.full_url
            if url.endswith("checkpoint.json"):
                content = feed_bytes
            elif url.endswith(".jpg"):
                content = poster
            else:
                content = media
            return Response(content, url)

        return open_url

    def test_valid_update_publishes_normalized_feed_and_media(self):
        media = b"measured replay"
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "assets" / "c1n"
            with patch.object(sync, "urlopen", side_effect=self.responses(feed(media), media)):
                self.assertTrue(sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output))

            published = json.loads((output / "checkpoint.json").read_text(encoding="utf-8"))
            self.assertEqual(published["checkpoint"]["policy"], "walk_fast_500")
            self.assertEqual((output / "walking-comparison.mp4").read_bytes(), media)
            self.assertEqual((output / "walking-comparison.jpg").read_bytes(), b"measured poster")

    def test_current_content_is_idempotent(self):
        media = b"measured replay"
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "assets" / "c1n"
            opener = self.responses(feed(media), media)
            with patch.object(sync, "urlopen", side_effect=opener):
                self.assertTrue(sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output))
            feed_mtime = (output / "checkpoint.json").stat().st_mtime_ns
            media_mtime = (output / "walking-comparison.mp4").stat().st_mtime_ns
            with patch.object(sync, "urlopen", side_effect=opener):
                self.assertFalse(sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output))
            self.assertEqual((output / "checkpoint.json").stat().st_mtime_ns, feed_mtime)
            self.assertEqual((output / "walking-comparison.mp4").stat().st_mtime_ns, media_mtime)

    def test_bad_hash_preserves_last_good_files(self):
        media = b"tampered replay"
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "assets" / "c1n"
            output.mkdir(parents=True)
            (output / "checkpoint.json").write_bytes(b"last good feed")
            (output / "walking-comparison.mp4").write_bytes(b"last good replay")
            (output / "walking-comparison.jpg").write_bytes(b"last good poster")
            invalid_feed = feed(media, "0" * 64)

            with patch.object(sync, "urlopen", side_effect=self.responses(invalid_feed, media)):
                with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                    sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output)

            self.assertEqual((output / "checkpoint.json").read_bytes(), b"last good feed")
            self.assertEqual((output / "walking-comparison.mp4").read_bytes(), b"last good replay")
            self.assertEqual((output / "walking-comparison.jpg").read_bytes(), b"last good poster")

    def test_invalid_evaluation_counts_preserve_last_good_feed(self):
        media = b"measured replay"
        invalid = json.loads(feed(media))
        invalid["metrics"]["falls"] = 2
        invalid["metrics"]["evaluations"] = 1
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "assets" / "c1n"
            output.mkdir(parents=True)
            (output / "checkpoint.json").write_bytes(b"last good feed")
            with patch.object(
                sync,
                "urlopen",
                side_effect=self.responses(json.dumps(invalid).encode(), media),
            ):
                with self.assertRaisesRegex(ValueError, "falls must not exceed"):
                    sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output)
            self.assertEqual((output / "checkpoint.json").read_bytes(), b"last good feed")

    def test_homepage_markers_receive_copy_and_local_media_paths(self):
        media = b"measured replay"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "assets" / "c1n"
            (root / "index.html").write_text(
                '<h2 data-c1n-title>old</h2><p data-c1n-description>old</p>'
                '<p data-c1n-summary>old</p><p data-c1n-limits>old</p>'
                '<video data-c1n-video poster="old"><source data-c1n-source src="old"></video>'
                ,
                encoding="utf-8",
            )
            with patch.object(sync, "urlopen", side_effect=self.responses(feed(media), media)):
                sync.sync_checkpoint(sync.DEFAULT_FEED_URL, output)
            homepage = (root / "index.html").read_text(encoding="utf-8")
            self.assertIn("C-1N // 03 · STRIDE", homepage)
            self.assertRegex(homepage, r'src="/assets/c1n/walking-comparison\.mp4\?v=[0-9a-f]{12}"')
            self.assertEqual(homepage.count('/assets/c1n/walking-comparison.jpg'), 1)


if __name__ == "__main__":
    unittest.main()
