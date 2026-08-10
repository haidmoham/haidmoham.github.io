"""Validate files and hosting rules required by the static portfolio."""

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> int:
    c1n = (ROOT / "c1n" / "index.html").read_text(encoding="utf-8")
    manifest = (ROOT / "spider" / "manifest.json").read_text(encoding="utf-8")
    nginx = (ROOT / "railway-nginx.conf.template").read_text(encoding="utf-8")

    required_files = (
        "Dockerfile",
        "railway.json",
        "railway-nginx.conf.template",
        "c1n/index.html",
        "spider/spider.js",
        "spider/model/spider.xml",
        "spider/model/shuffle.xml",
        "spider/vendor/mujoco/mujoco.js",
        "spider/vendor/mujoco/mujoco.wasm",
    )
    for relative_path in required_files:
        require((ROOT / relative_path).is_file(), f"missing required file: {relative_path}")

    require('<base href="/spider/">' in c1n, "C-1N must resolve runtime assets from /spider/")
    require('value="v0.0"' in c1n and 'value="v0.1"' in c1n, "C-1N must expose SPAWN and SHUFFLE")
    require('"v0.0"' in manifest and '"v0.1"' in manifest, "manifest must preserve both checkpoints")
    require("application/wasm" in nginx, "Railway must serve Wasm with application/wasm")
    require("'wasm-unsafe-eval'" in nginx, "Railway CSP must allow WebAssembly compilation")
    require("location = /c1n/" in nginx and 'Cache-Control "no-cache"' in nginx, "C-1N HTML must revalidate")

    print("site integrity: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"site integrity: failed: {error}", file=sys.stderr)
        raise SystemExit(1)
