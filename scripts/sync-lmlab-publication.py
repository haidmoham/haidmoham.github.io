"""Import only lmlab's explicit public publication manifest; never execute cells."""
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import urllib.request
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
FEED='https://raw.githubusercontent.com/haidmoham/lmlab/main/public/portfolio-notebooks.json'

def get(url):
    with urllib.request.urlopen(url,timeout=30) as response:
        raw=response.read(8_000_001)
    if len(raw)>8_000_000: raise ValueError('publication input exceeds size bound')
    return raw

def sync():
    manifest=json.loads(get(FEED))
    if manifest.get('repository')!='haidmoham/lmlab' or manifest.get('schema_version')!=1:
        raise ValueError('unexpected publication source')
    revision=manifest.get('revision','')
    if not re.fullmatch('[0-9a-f]{40}',revision):raise ValueError('source must pin full revision')
    if len(manifest.get('notebooks',[]))>100:raise ValueError('unexpected publication size')
    # CUDA is excluded from this portfolio by the owner's editorial choice.
    manifest['notebooks']=[n for n in manifest['notebooks'] if 'cuda' not in n.get('slug','').lower()]
    with tempfile.TemporaryDirectory() as temp:
        temp=Path(temp)
        for item in manifest['notebooks']:
            if item.get('publishable') is not True:continue
            path=Path(item['path'])
            if path.is_absolute() or '..' in path.parts or path.suffix!='.ipynb':raise ValueError('unsafe notebook path')
            dest=temp/path;dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(get(f'https://raw.githubusercontent.com/haidmoham/lmlab/{revision}/{quote(path.as_posix(),safe="/")}'))
        candidate=temp/'manifest.json';candidate.write_text(json.dumps(manifest,indent=2)+'\n')
        spec=importlib.util.spec_from_file_location('renderer',ROOT/'scripts/render-lab-notebooks.py')
        renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
        renderer.render(temp,candidate)
        # A failed download, hash check, or export never advances the publication manifest.
        (ROOT/'labs/lmlab/publication.json').write_bytes(candidate.read_bytes())
    print('imported approved lmlab publication; no notebook execution')

if __name__=='__main__':sync()
