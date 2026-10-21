"""Validate the static portfolio and preserve the independent C-1N deployment."""

from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import sys

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets = []
        self.links = []
        self.titles = []
        self.in_title = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "title":
            self.in_title = True
        if tag in {"script", "img", "source"} and attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("href"):
            if attrs.get("rel") in {"stylesheet", "modulepreload", "preload", "icon"}:
                self.assets.append(attrs["href"])
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.titles.append(data)


def local_target(href: str, document: Path) -> Path | None:
    url = urlsplit(href)
    if url.scheme or url.netloc or not url.path:
        return None
    target = ROOT / unquote(url.path.lstrip("/")) if url.path.startswith("/") else document.parent / unquote(url.path)
    return target / "index.html" if target.is_dir() else target


def validate_integrated_portfolio() -> None:
    homepage = (ROOT / "index.html").read_text(encoding="utf-8")
    parser = AssetParser()
    parser.feed(homepage)
    require("".join(parser.titles) == "Mohammad Haider — Software Engineer", "homepage must give software engineering top billing")
    require("vinext.navigationRuntime" in homepage, "homepage must retain its complete hydration bootstrap")
    require("/_next/static/" in homepage, "homepage must load its versioned client assets")
    require("portfolioredo." not in homepage and ".chatgpt.site" not in homepage, "homepage must not point at a prototype host")
    require('href="https://c1n.mhaider.dev/"' in homepage, "homepage must link to the independent C-1N deployment")
    for href in parser.assets + parser.links:
        target = local_target(href, ROOT / "index.html")
        if target is not None:
            require(target.is_file(), f"homepage has a missing local target: {href}")
    from sync_resumes import RESUMES
    resume_page = AssetParser()
    resume_page.feed((ROOT / "resume.html").read_text(encoding="utf-8"))
    for resume in RESUMES:
        pdf = ROOT / "resumes" / resume.filename
        require(pdf.is_file() and pdf.read_bytes().startswith(b"%PDF-"), f"missing or invalid synced resume: {resume.filename}")
        require(f"/resumes/{resume.filename}" in resume_page.links, f"resume chooser must link to {resume.filename}")
    for relative_path in ("about.html", "available.html", "projects.html", "notes.html", "resume.html", "contact.html", "robotics/index.html"):
        require((ROOT / relative_path).is_file(), f"published route must remain available: {relative_path}")
    require((ROOT / "legacy/field/index.html").is_file(), "preserve the historical field route")
    legacy = (ROOT / "legacy/field/index.html").read_text(encoding="utf-8")
    require('name="robots" content="noindex, nofollow"' in legacy, "historical field route must remain unindexed")
    require((ROOT / "legacy/field/field.js").is_file(), "preserve the historical field controller")


def main() -> int:
    c1n = (ROOT / "c1n" / "index.html").read_text(encoding="utf-8")
    spider_redirect = (ROOT / "spider" / "index.html").read_text(encoding="utf-8")
    manifest = (ROOT / "spider" / "manifest.json").read_text(encoding="utf-8")
    nginx = (ROOT / "railway-nginx.conf.template").read_text(encoding="utf-8")
    vercel = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))

    required_files = (
        "Dockerfile",
        "railway.json",
        "railway-nginx.conf.template",
        "vercel.json",
        "c1n/index.html",
        "spider/index.html",
        "spider/spider.js",
        "spider/model/spider.xml",
        "spider/model/shuffle.xml",
        "spider/model/stand.xml",
        "spider/vendor/mujoco/mujoco.js",
        "spider/vendor/mujoco/mujoco.wasm",
    )
    for relative_path in required_files:
        require((ROOT / relative_path).is_file(), f"missing required file: {relative_path}")

    require('<base href="/spider/">' in c1n, "C-1N must resolve runtime assets from /spider/")
    require('value="v0.0"' in c1n and 'value="v0.2"' in c1n, "C-1N must expose SPAWN and STAND")
    require('"v0.0"' in manifest and '"v0.1"' in manifest and '"v0.2"' in manifest, "manifest must preserve every C-1N checkpoint")
    require('33 declared external-disturbance cases' in c1n and 'current recovery frontier' in c1n, "C-1N must expose the STAND disturbance frontier")
    require('data-model-mass' in c1n and 'data-model-gravity' in c1n, "C-1N must show current model constants")
    require('data-perturbation-force' in c1n, "C-1N must show the current force-pulse calculation")
    require('data-perturbation-magnitude' in c1n and 'data-perturbation-direction' in c1n and 'data-perturbation-run' in c1n, "C-1N must provide compact perturbation controls")
    for relative_path in ("index.html", "about.html", "available.html", "projects.html", "robotics/index.html"):
        portfolio_page = (ROOT / relative_path).read_text(encoding="utf-8")
        require('href="https://c1n.mhaider.dev/"' in portfolio_page, f"{relative_path} must link directly to the canonical C-1N host")
        require('href="/c1n/"' not in portfolio_page, f"{relative_path} must not rely on the legacy C-1N redirect")
    for destination in (
        "https://mhaider.dev/",
        "https://mhaider.dev/about.html",
        "https://mhaider.dev/projects.html",
        "https://mhaider.dev/robotics/",
        "https://mhaider.dev/notes.html",
        "https://mhaider.dev/resume.html",
        "https://mhaider.dev/contact.html",
    ):
        require(f'href="{destination}"' in c1n, f"C-1N must link directly to {destination}")
    require(spider_redirect.count("https://c1n.mhaider.dev/") == 4, "legacy Spider route must hand off directly to the canonical C-1N host")
    runtime = (ROOT / "spider" / "spider.js").read_text(encoding="utf-8")
    require('const PULSE_SECONDS = 0.2' in runtime and 'const OBSERVATION_SECONDS = 1' in runtime and 'const PERTURBATION_CASE_SECONDS = PULSE_SECONDS + OBSERVATION_SECONDS' in runtime, "C-1N must retain immediate 200 ms force pulses with one-second observation")
    require("application/wasm" in nginx, "Railway must serve Wasm with application/wasm")
    require("'unsafe-eval'" in nginx, "Railway CSP must allow the generated MuJoCo JavaScript runtime")
    require("'wasm-unsafe-eval'" in nginx, "Railway CSP must allow WebAssembly compilation")
    require("location = /c1n {" in nginx and "location = /c1n/ {" in nginx, "Railway must match both C-1N route forms")
    require(nginx.count("return 308 https://c1n.mhaider.dev/;") == 2, "Railway must redirect both C-1N route forms to Vercel")
    root_route = vercel.get("routes", [{}])[0]
    require(root_route.get("src") == "^/$" and root_route.get("dest") == "/c1n/index.html", "Vercel must serve the C-1N document at the subdomain root")
    c1n_host = [{"type": "host", "value": "c1n.mhaider.dev"}]
    require(root_route.get("has") == c1n_host, "only the C-1N host may replace the portfolio homepage")
    require("wasm-unsafe-eval" in root_route.get("headers", {}).get("Content-Security-Policy", ""), "Vercel CSP must allow WebAssembly compilation")
    portfolio_roots = [route for route in vercel["routes"] if route.get("src") == "^/$" and not route.get("has")]
    require(len(portfolio_roots) == 1 and portfolio_roots[0].get("dest") == "/index.html", "Vercel must serve the unchanged portfolio at its root and preview URLs")
    global_headers = [route for route in vercel["routes"] if route.get("src") == "^/.*$" and route.get("continue")]
    require(len(global_headers) == 1, "Vercel must apply the portfolio CSP to all static documents")
    policy = global_headers[0].get("headers", {}).get("Content-Security-Policy", "")
    for directive in ("connect-src 'self' https://formspree.io", "form-action 'self' https://formspree.io", "'unsafe-eval'", "'wasm-unsafe-eval'"):
        require(directive in policy, f"Vercel CSP must preserve {directive}")
    compatibility = [route for route in vercel["routes"] if route.get("src") == "^/c1n/?$"]
    require(len(compatibility) == 1 and compatibility[0].get("missing") == c1n_host and compatibility[0].get("status") == 308 and compatibility[0].get("headers", {}).get("Location") == "https://c1n.mhaider.dev/", "both portfolio C-1N route forms must redirect without changing the C-1N host")
    wasm_routes = [route for route in vercel["routes"] if route.get("src") == r"^/.*\.wasm$"]
    require(len(wasm_routes) == 1 and wasm_routes[0].get("headers", {}).get("Content-Type") == "application/wasm", "Vercel must serve the existing Wasm runtime with its MIME type")
    redirect_routes = {
        route.get("src"): (route.get("status"), route.get("headers", {}).get("Location"))
        for route in vercel.get("routes", [])
        if route.get("status")
    }
    expected_redirects = {
        r"^/index\.html$": "https://mhaider.dev/",
        r"^/about\.html$": "https://mhaider.dev/about.html",
        r"^/available\.html$": "https://mhaider.dev/available.html",
        r"^/projects\.html$": "https://mhaider.dev/projects.html",
        r"^/robotics/?$": "https://mhaider.dev/robotics/",
        r"^/notes\.html$": "https://mhaider.dev/notes.html",
        r"^/resume\.html$": "https://mhaider.dev/resume.html",
        r"^/contact\.html$": "https://mhaider.dev/contact.html",
    }
    for source, destination in expected_redirects.items():
        require(redirect_routes.get(source) == (308, destination), f"Vercel must permanently redirect {source} to {destination}")
        matching = [route for route in vercel["routes"] if route.get("src") == source]
        require(len(matching) == 1 and matching[0].get("has") == c1n_host, f"{source} must redirect only on C-1N, avoiding portfolio redirect loops")

    validate_integrated_portfolio()

    print("site integrity: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"site integrity: failed: {error}", file=sys.stderr)
        raise SystemExit(1)
