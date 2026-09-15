#!/usr/bin/env python3
"""Publish the canonical C-1N checkpoint feed and its verified media."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen


DEFAULT_FEED_URL = (
    "https://raw.githubusercontent.com/haidmoham/spider/master/public/checkpoint.json"
)
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIRECTORY = ROOT / "assets" / "c1n"
SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")
SOURCE_COMMIT_PATTERN = re.compile(r"^[0-9a-fA-F]{40}$")
EVIDENCE_PREFIX = "https://github.com/haidmoham/spider/blob/"
MEDIA_PAIRS = (("url", "sha256"), ("poster_url", "poster_sha256"))
ALLOWED_MEDIA_PREFIXES = (
    "https://raw.githubusercontent.com/haidmoham/spider/master/public/",
    "https://c1n.mhaider.dev/assets/c1n/",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def require_text(value: Any, field: str) -> str:
    require(isinstance(value, str) and bool(value.strip()), f"{field} must be a nonempty string")
    return value.strip()


def require_https(value: Any, field: str) -> str:
    url = require_text(value, field)
    parsed = urlsplit(url)
    require(parsed.scheme == "https" and bool(parsed.netloc), f"{field} must be an HTTPS URL")
    require(not parsed.username and not parsed.password, f"{field} must not contain credentials")
    return url


def require_number(value: Any, field: str) -> int | float:
    require(
        isinstance(value, (int, float)) and not isinstance(value, bool),
        f"{field} must be a number",
    )
    require(math.isfinite(value) and value >= 0, f"{field} must be finite and nonnegative")
    return value


def validate_feed(value: Any) -> dict[str, Any]:
    require(isinstance(value, dict), "feed must be a JSON object")
    require(value.get("schema_version") == 1, "schema_version must be 1")

    checkpoint = value.get("checkpoint")
    require(isinstance(checkpoint, dict), "checkpoint must be an object")
    normalized_checkpoint = {
        field: require_text(checkpoint.get(field), f"checkpoint.{field}")
        for field in ("id", "label", "policy")
    }
    source_commit = require_text(checkpoint.get("source_commit"), "checkpoint.source_commit")
    require(bool(SOURCE_COMMIT_PATTERN.fullmatch(source_commit)), "checkpoint.source_commit must be a 40-character Git SHA")
    normalized_checkpoint["source_commit"] = source_commit.lower()
    evidence_url = require_https(
        checkpoint.get("evidence_url"), "checkpoint.evidence_url"
    )
    require(
        evidence_url.startswith(f"{EVIDENCE_PREFIX}{source_commit.lower()}/"),
        "checkpoint.evidence_url must use the canonical Spider repository and source commit",
    )
    normalized_checkpoint["evidence_url"] = evidence_url

    metrics = value.get("metrics")
    require(isinstance(metrics, dict), "metrics must be an object")
    normalized_metrics = {
        "mean_speed_m_s": require_number(metrics.get("mean_speed_m_s"), "metrics.mean_speed_m_s"),
        "sampled_mean_speed_m_s": require_number(
            metrics.get("sampled_mean_speed_m_s"), "metrics.sampled_mean_speed_m_s"
        ),
    }
    for field in ("falls", "evaluations"):
        item = metrics.get(field)
        require(isinstance(item, int) and not isinstance(item, bool) and item >= 0, f"metrics.{field} must be a nonnegative integer")
        normalized_metrics[field] = item
    require(normalized_metrics["evaluations"] > 0, "metrics.evaluations must be greater than zero")
    require(
        normalized_metrics["falls"] <= normalized_metrics["evaluations"],
        "metrics.falls must not exceed metrics.evaluations",
    )

    scope = require_text(value.get("scope"), "scope")
    limits = value.get("limits")
    require(isinstance(limits, list), "limits must be an array")
    normalized_limits = [require_text(item, f"limits[{index}]") for index, item in enumerate(limits)]

    normalized: dict[str, Any] = {
        "schema_version": 1,
        "checkpoint": normalized_checkpoint,
        "metrics": normalized_metrics,
        "scope": scope,
        "limits": normalized_limits,
    }

    copy = value.get("copy")
    require(isinstance(copy, dict), "copy must be an object")
    normalized["copy"] = {
        field: require_text(copy.get(field), f"copy.{field}")
        for field in ("title", "description", "summary")
    }

    media = value.get("media")
    require(isinstance(media, dict), "media must be an object")
    normalized_media: dict[str, str] = {}
    for url_field, hash_field in MEDIA_PAIRS:
        url = require_https(media.get(url_field), f"media.{url_field}")
        require(
            any(url.startswith(prefix) for prefix in ALLOWED_MEDIA_PREFIXES),
            f"media.{url_field} must use an approved C-1N publication path",
        )
        normalized_media[url_field] = url
        digest = require_text(media.get(hash_field), f"media.{hash_field}")
        require(bool(SHA256_PATTERN.fullmatch(digest)), f"media.{hash_field} must be a SHA-256 digest")
        normalized_media[hash_field] = digest.lower()
    normalized["media"] = normalized_media

    return normalized


def download(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "mhaider.dev-c1n-checkpoint-sync/1.0"})
    try:
        with urlopen(request, timeout=60) as response:
            final_url = response.geturl()
            require_https(final_url, "download redirect")
            return response.read()
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise ValueError(f"download failed for {url}: {error}") from error


def media_filename(url: str) -> str:
    filename = Path(unquote(urlsplit(url).path)).name
    require(filename not in {"", ".", "..", "checkpoint.json"}, "media URL must have a safe filename")
    require(filename == Path(filename).name, "media URL filename is invalid")
    return filename


def update_marked_element_text(document: str, marker: str, value: str) -> str:
    pattern = re.compile(
        rf"(<(?P<tag>[a-zA-Z][\w:-]*)\b[^>]*\b{re.escape(marker)}\b[^>]*>)(.*?)(</(?P=tag)\s*>)",
        flags=re.DOTALL,
    )
    matches = list(pattern.finditer(document))
    require(len(matches) == 1, f"index.html must contain exactly one {marker} element")
    require("<" not in matches[0].group(3), f"{marker} must mark a plain-text element")
    return pattern.sub(lambda match: match.group(1) + html.escape(value) + match.group(4), document)


def update_marked_attribute(document: str, marker: str, attribute: str, value: str) -> str:
    element_pattern = re.compile(
        rf"<(?P<tag>[a-zA-Z][\w:-]*)\b(?P<attrs>[^>]*\b{re.escape(marker)}\b[^>]*)>",
        flags=re.DOTALL,
    )
    matches = list(element_pattern.finditer(document))
    require(len(matches) == 1, f"index.html must contain exactly one {marker} element")
    match = matches[0]
    opening = match.group(0)
    escaped = html.escape(value, quote=True)
    attribute_pattern = re.compile(rf"(\b{re.escape(attribute)}\s*=\s*)([\"']).*?\2", flags=re.DOTALL)
    if attribute_pattern.search(opening):
        opening = attribute_pattern.sub(lambda item: f'{item.group(1)}"{escaped}"', opening, count=1)
    else:
        opening = opening[:-1] + f' {attribute}="{escaped}">'
    return document[: match.start()] + opening + document[match.end() :]


def render_homepage(document: str, feed: dict[str, Any], media_files: dict[str, bytes]) -> str:
    values = {
        "data-c1n-title": feed["copy"]["title"],
        "data-c1n-description": feed["copy"]["description"],
        "data-c1n-summary": feed["copy"]["summary"],
        "data-c1n-limits": " · ".join(feed["limits"]),
    }
    rendered = document
    for marker, value in values.items():
        rendered = update_marked_element_text(rendered, marker, value)

    if "data-c1n-checkpoint" in rendered:
        rendered = update_marked_element_text(rendered, "data-c1n-checkpoint", feed["checkpoint"]["policy"])

    video_path = f'/assets/c1n/{media_filename(feed["media"]["url"])}?v={feed["media"]["sha256"][:12]}'
    poster_path = f'/assets/c1n/{media_filename(feed["media"]["poster_url"])}?v={feed["media"]["poster_sha256"][:12]}'
    rendered = update_marked_attribute(rendered, "data-c1n-video", "poster", poster_path)
    rendered = update_marked_attribute(rendered, "data-c1n-source", "src", video_path)
    return rendered


def sync_checkpoint(feed_url: str, output_directory: Path) -> bool:
    feed_url = require_https(feed_url, "feed URL")
    try:
        raw_feed = download(feed_url)
        parsed_feed = json.loads(raw_feed.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"feed is not valid UTF-8 JSON: {error}") from error
    feed = validate_feed(parsed_feed)

    media_files: dict[str, bytes] = {}
    for url_field, hash_field in MEDIA_PAIRS:
        url = feed["media"][url_field]
        filename = media_filename(url)
        require(filename not in media_files, f"media URLs share the filename {filename}")
        content = download(url)
        digest = hashlib.sha256(content).hexdigest()
        require(digest == feed["media"][hash_field], f"SHA-256 mismatch for {filename}")
        require(bool(content), f"media file is empty: {filename}")
        media_files[filename] = content

    serialized_feed = (json.dumps(feed, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    desired_files = {**media_files, "checkpoint.json": serialized_feed}
    homepage = output_directory.parent.parent / "index.html"
    rendered_homepage: bytes | None = None
    if homepage.is_file():
        original_homepage = homepage.read_text(encoding="utf-8")
        if "data-c1n-" in original_homepage:
            rendered_homepage = render_homepage(original_homepage, feed, media_files).encode("utf-8")
    changed = any(
        not (output_directory / filename).is_file()
        or (output_directory / filename).read_bytes() != content
        for filename, content in desired_files.items()
    )
    if rendered_homepage is not None and homepage.read_bytes() != rendered_homepage:
        changed = True
    if not changed:
        return False

    output_directory.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="c1n-checkpoint-", dir=output_directory.parent) as directory:
        temporary = Path(directory)
        for filename, content in desired_files.items():
            (temporary / filename).write_bytes(content)
        if rendered_homepage is not None:
            (temporary / "index.html").write_bytes(rendered_homepage)
        # Publish the record last. Readers never see a record that names media which
        # has not completed validation and installation.
        for filename in media_files:
            os.replace(temporary / filename, output_directory / filename)
        if rendered_homepage is not None:
            os.replace(temporary / "index.html", homepage)
        os.replace(temporary / "checkpoint.json", output_directory / "checkpoint.json")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feed-url", default=DEFAULT_FEED_URL)
    parser.add_argument("--output-directory", type=Path, default=DEFAULT_OUTPUT_DIRECTORY)
    arguments = parser.parse_args()
    changed = sync_checkpoint(arguments.feed_url, arguments.output_directory.resolve())
    print(f"C-1N checkpoint sync: {'updated' if changed else 'already current'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"C-1N checkpoint sync: failed: {error}", file=sys.stderr)
        raise SystemExit(1)
