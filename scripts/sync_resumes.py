#!/usr/bin/env python3
"""Export and validate the two public-link Google Docs resume PDFs."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


MIN_PDF_BYTES = 10_000
MIN_TEXT_CHARACTERS = 500
EXPECTED_NAME = "Mohammad Haider"


@dataclass(frozen=True)
class Resume:
    label: str
    document_id_environment_variable: str
    filename: str


RESUMES = (
    Resume(
        label="Production Software Engineering",
        document_id_environment_variable="PRODUCTION_RESUME_DOC_ID",
        filename="Mohammad_Haider_Production_Software_Engineering_Resume.pdf",
    ),
    Resume(
        label="Simulation and Scientific Computing",
        document_id_environment_variable="SIMULATION_RESUME_DOC_ID",
        filename="Mohammad_Haider_Simulation_and_Scientific_Computing_Resume.pdf",
    ),
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def run_pdf_tool(*arguments: str) -> str:
    try:
        completed = subprocess.run(
            arguments,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as error:
        raise ValueError(f"required PDF tool is unavailable: {arguments[0]}") from error
    except subprocess.CalledProcessError as error:
        detail = error.stderr.strip() or error.stdout.strip() or "unknown error"
        raise ValueError(f"{arguments[0]} failed: {detail}") from error
    return completed.stdout


def download_pdf(document_id: str, destination: Path) -> None:
    encoded_id = quote(document_id, safe="")
    url = f"https://docs.google.com/document/d/{encoded_id}/export?format=pdf"
    request = Request(url, headers={"User-Agent": "mhaider.dev-resume-sync/1.0"})
    try:
        with urlopen(request, timeout=60) as response, destination.open("wb") as output:
            shutil.copyfileobj(response, output)
    except (HTTPError, URLError, TimeoutError) as error:
        raise ValueError(f"Google Docs export failed: {error}") from error


def validate_pdf(path: Path, label: str) -> None:
    require(path.is_file(), f"{label}: export was not created")
    require(path.stat().st_size >= MIN_PDF_BYTES, f"{label}: export is unexpectedly small")

    with path.open("rb") as pdf:
        require(pdf.read(5) == b"%PDF-", f"{label}: export is not a PDF")

    metadata = run_pdf_tool("pdfinfo", str(path))
    pages_match = re.search(r"^Pages:\s+(\d+)\s*$", metadata, flags=re.MULTILINE)
    require(pages_match is not None, f"{label}: could not determine page count")
    require(int(pages_match.group(1)) == 1, f"{label}: resume must remain exactly one page")

    extracted_text = run_pdf_tool("pdftotext", str(path), "-")
    normalized_text = " ".join(extracted_text.split())
    require(
        len(normalized_text) >= MIN_TEXT_CHARACTERS,
        f"{label}: export does not contain enough extractable text",
    )
    require(EXPECTED_NAME in normalized_text, f"{label}: expected name is missing")

    print(f"resume export: {label}: ok ({path.stat().st_size} bytes, 1 page)")


def export_resumes(output_directory: Path) -> None:
    document_ids: dict[Resume, str] = {}
    for resume in RESUMES:
        document_id = os.environ.get(resume.document_id_environment_variable, "").strip()
        require(
            bool(document_id),
            f"missing environment variable: {resume.document_id_environment_variable}",
        )
        document_ids[resume] = document_id

    output_directory.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix="resume-sync-",
        dir=output_directory.parent,
    ) as temporary_directory:
        temporary_path = Path(temporary_directory)

        for resume in RESUMES:
            destination = temporary_path / resume.filename
            download_pdf(document_ids[resume], destination)
            validate_pdf(destination, resume.label)

        output_directory.mkdir(parents=True, exist_ok=True)
        for resume in RESUMES:
            os.replace(temporary_path / resume.filename, output_directory / resume.filename)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_directory", type=Path)
    arguments = parser.parse_args()
    export_resumes(arguments.output_directory.resolve())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"resume export: failed: {error}", file=sys.stderr)
        raise SystemExit(1)
