"""Validate files and hosting rules required by the static portfolio."""

from pathlib import Path
from html.parser import HTMLParser
import sys


ROOT = Path(__file__).resolve().parents[1]

FIELD_PAGES = (
    Path("404.html"),
    Path("about.html"),
    Path("available.html"),
    Path("contact.html"),
    Path("index.html"),
    Path("notes.html"),
    Path("notes/the-loop-must-terminate-in-reality.html"),
    Path("projects.html"),
    Path("resume.html"),
)
INTERACTIVE_TAGS = {"a", "button", "form", "input", "label", "select", "summary", "textarea"}
EXCLUDED_REGIONS = {"nav", "footer", "article-prose"}
TYPOGRAPHIC_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "strong"}
TYPOGRAPHIC_DIV_CLASSES = {
    "dates",
    "org",
    "professional-record-meta",
    "project-date",
    "project-tag",
    "resume-block-title",
}


class Element:
    def __init__(self, tag: str, attributes: list[tuple[str, str | None]], parent: "Element | None") -> None:
        self.tag = tag
        self.attributes = dict(attributes)
        self.parent = parent
        self.children: list[Element] = []
        self.text_parts: list[str] = []

    @property
    def classes(self) -> set[str]:
        return set(self.attributes.get("class", "").split())

    @property
    def text(self) -> str:
        parts = list(self.text_parts)
        parts.extend(child.text for child in self.children)
        return " ".join(" ".join(parts).split())

    def ancestors(self):
        node: Element | None = self
        while node is not None:
            yield node
            node = node.parent


class DocumentParser(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document", [], None)
        self.stack = [self.root]
        self.elements: list[Element] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        element = Element(tag, attributes, self.stack[-1])
        self.stack[-1].children.append(element)
        self.elements.append(element)
        if tag not in self.VOID_TAGS:
            self.stack.append(element)

    def handle_startendtag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attributes)
        if tag not in self.VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.stack[-1].text_parts.append(data)


def parse_document(path: Path) -> DocumentParser:
    parser = DocumentParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def in_excluded_region(element: Element) -> bool:
    return any(
        ancestor.tag in INTERACTIVE_TAGS | {"nav", "footer"}
        or bool(ancestor.classes & EXCLUDED_REGIONS)
        for ancestor in element.ancestors()
    )


def eligible_field_element(element: Element) -> bool:
    text = element.text
    is_typographic = element.tag in TYPOGRAPHIC_TAGS or (
        element.tag == "div" and bool(element.classes & TYPOGRAPHIC_DIV_CLASSES)
    )
    return is_typographic and bool(text) and len(text) <= 160 and not in_excluded_region(element)


def validate_field_coverage() -> None:
    for relative_path in FIELD_PAGES:
        parser = parse_document(ROOT / relative_path)
        targets = [element for element in parser.elements if "data-field-target" in element.attributes]
        eligible = [element for element in parser.elements if eligible_field_element(element)]

        for target in targets:
            require(len(target.text) <= 160, f"{relative_path}: field target exceeds 160 characters: {target.text[:48]!r}")
            require(not in_excluded_region(target), f"{relative_path}: field target is inside an interactive or excluded region: {target.text[:48]!r}")
            require(
                not any("data-field-target" in ancestor.attributes for ancestor in list(target.ancestors())[1:]),
                f"{relative_path}: nested field targets are not allowed: {target.text[:48]!r}",
            )

        eligible_targets = sum(target in eligible for target in targets)
        ratio = eligible_targets / len(eligible) if eligible else 0
        require(ratio >= 0.40, f"{relative_path}: field coverage {eligible_targets}/{len(eligible)} ({ratio:.1%}) is below 40%")
        print(f"field coverage: {relative_path}: {eligible_targets}/{len(eligible)} ({ratio:.1%})")

    for robotics_page in (ROOT / "robotics").rglob("*.html"):
        require("data-field-target" not in robotics_page.read_text(encoding="utf-8"), f"robotics page must not contain field targets: {robotics_page.relative_to(ROOT)}")


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
    runtime = (ROOT / "spider" / "spider.js").read_text(encoding="utf-8")
    require('const PULSE_SECONDS = 0.2' in runtime and 'const OBSERVATION_SECONDS = 1' in runtime and 'const PERTURBATION_CASE_SECONDS = PULSE_SECONDS + OBSERVATION_SECONDS' in runtime, "C-1N must retain immediate 200 ms force pulses with one-second observation")
    require("application/wasm" in nginx, "Railway must serve Wasm with application/wasm")
    require("'unsafe-eval'" in nginx, "Railway CSP must allow the generated MuJoCo JavaScript runtime")
    require("'wasm-unsafe-eval'" in nginx, "Railway CSP must allow WebAssembly compilation")
    require("location = /c1n/" in nginx and 'Cache-Control "no-cache"' in nginx, "C-1N HTML must revalidate")

    validate_field_coverage()

    print("site integrity: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"site integrity: failed: {error}", file=sys.stderr)
        raise SystemExit(1)
