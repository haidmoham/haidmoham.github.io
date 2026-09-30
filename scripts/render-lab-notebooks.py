"""Render an explicitly approved, hash-pinned notebook set. Never executes cells."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import shutil

import bleach
import nbformat
from bs4 import BeautifulSoup
from nbconvert import HTMLExporter

ROOT = Path(__file__).resolve().parents[1]

def esc(value):
    return html.escape(str(value), quote=True)

def render(source, manifest_path):
    manifest = json.loads(manifest_path.read_text())
    if manifest.get('schema_version') != 1 or manifest.get('repository') != 'haidmoham/lmlab':
        raise ValueError('unrecognized publication manifest')
    revision = manifest['revision']
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('publication must pin a full commit')
    prepared = []
    for item in manifest['notebooks']:
        if item.get('publishable') is not True:
            continue
        if not re.fullmatch('[a-z0-9_]+', item['slug']):
            raise ValueError('invalid publication slug')
        path = (source / item['path']).resolve()
        if not path.is_relative_to(source.resolve()) or path.suffix != '.ipynb':
            raise ValueError('notebook must remain in source checkout')
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != item['sha256']:
            raise ValueError(f"publication hash mismatch: {item['path']}")
        notebook = nbformat.reads(raw.decode(), as_version=4)
        exporter = HTMLExporter(template_name='basic')
        exporter.sanitize_html = False
        exporter.embed_images = True
        body, _ = exporter.from_notebook_node(notebook)
        soup = BeautifulSoup(body, 'html.parser')
        # Public notebooks are evidence, never executable browser applications.
        for unsafe in soup.select('script, iframe, object, embed, form, input, button, link, style'):
            unsafe.decompose()
        for tag in soup.find_all(True):
            for attr in list(tag.attrs):
                if attr.lower().startswith('on'):
                    del tag[attr]
            for attr in ('src', 'href'):
                value = str(tag.get(attr, ''))
                if value.lower().startswith(('javascript:', 'vbscript:')):
                    del tag[attr]
            if tag.name == 'img' and not str(tag.get('src','')).startswith('data:image/'):
                tag.replace_with(soup.new_string('[external image omitted from the pinned export]'))
        safe = bleach.clean(str(soup), tags={'div','span','p','br','hr','pre','code','h1','h2','h3','h4','h5','h6','strong','em','b','i','u','s','sub','sup','blockquote','ul','ol','li','a','img','table','thead','tbody','tr','td','th','caption','dl','dt','dd'}, attributes={'*':['class','id','title'], 'a':['href'], 'img':['src','alt','width','height'], 'td':['colspan','rowspan'], 'th':['colspan','rowspan']}, protocols={'https','http','data'}, strip=True)
        soup = BeautifulSoup(safe, 'html.parser')
        for i, cell in enumerate(soup.select('.code_cell'), 1):
            code = cell.select_one('.input')
            if code:
                details = soup.new_tag('details', attrs={'class':'source-cell'})
                summary = soup.new_tag('summary')
                summary.string = f'inspect code · cell {i:02d}'
                details.append(summary)
                code.replace_with(details)
                details.append(code)
        toc=[]
        for i, heading in enumerate(soup.select('h1,h2,h3'), 1):
            heading['id']=f'section-{i}'
            toc.append(f'<li><a href="#section-{i}">{esc(heading.get_text(" ",strip=True).replace("¶",""))}</a></li>')
        outputs = sum(len(c.get('outputs',[])) for c in notebook.cells)
        status = f'{outputs} saved output blocks' if outputs else 'source only · no saved cell outputs'
        provenance=f'https://github.com/{manifest["repository"]}/blob/{revision}/{item["path"]}'
        page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(item['title'])} · lmlab · Mohammad Haider</title><meta name="description" content="{esc(item['description'])}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/portfolio-pages.css"><link rel="stylesheet" href="/labs/notebook.css"></head><body class="portfolio-page lab-reader"><nav class="portfolio-nav" aria-label="main"><a class="portfolio-name" href="/">mohammad haider <span>/ software engineer</span></a><div><a href="/projects.html">work</a><a href="/notes.html">lab notebooks</a><a href="/resume.html">resumes</a></div></nav><header class="lab-hero"><a href="/labs/lmlab/">← lmlab</a><p class="section-eyebrow">research notebook / {esc(item['slug'])}</p><h1>{esc(item['title'])}</h1><p class="lab-deck">{esc(item['subtitle'])}</p><p>{esc(item['description'])}</p><div class="lab-meta"><span>{status}</span><span>source {revision[:7]}</span><span>static export · never re-executed</span></div></header><main class="reader-layout"><aside class="reader-aside"><p class="section-eyebrow">in this notebook</p><ol>{''.join(toc) or '<li><a href="#notebook">implementation &amp; outputs</a></li>'}</ol><a href="{provenance}">pinned source ↗</a><a href="./source.ipynb" download>download notebook ↓</a></aside><article id="notebook" class="notebook-body"><div class="evidence-note"><strong>reading this record</strong><p>code is folded so the argument and saved outputs come first. expand any cell to inspect the implementation. saved outputs are historical evidence from the source notebook, not a new run or independent verification.</p></div>{soup}</article></main><footer class="portfolio-footer"><a href="/labs/lmlab/">← all lmlab notebooks</a><a href="{provenance}">source provenance ↗</a></footer></body></html>'''
        prepared.append((item,page,raw,status))
    # Validate the entire input set before changing any published file.
    for item,page,raw,status in prepared:
        dest=ROOT/'labs/lmlab'/item['slug']
        dest.mkdir(parents=True,exist_ok=True)
        (dest/'index.html').write_text(page)
        (dest/'source.ipynb').write_bytes(raw)
    return prepared

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--manifest',type=Path,default=ROOT/'labs/lmlab/publication.json')
    args=parser.parse_args()
    rendered=render(args.source,args.manifest)
    print(f'rendered {len(rendered)} explicitly publishable notebooks; no execution')
