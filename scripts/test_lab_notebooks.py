"""Regression checks for publication gating and inert notebook exports."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import nbformat
from bs4 import BeautifulSoup
spec=importlib.util.spec_from_file_location('renderer',Path(__file__).with_name('render-lab-notebooks.py'))
renderer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)

class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.source=self.root/'source'
        self.source.mkdir()
        self.output=self.root/'site'
        self.output.mkdir()
        self.raw=nbformat.writes(nbformat.v4.new_notebook(cells=[nbformat.v4.new_markdown_cell('# actual heading'),nbformat.v4.new_code_cell('raise RuntimeError("must never execute")',outputs=[nbformat.v4.new_output('display_data',data={'text/html':'<script>alert(1)</script><p>saved evidence</p>'})])])).encode()
        (self.source/'test.ipynb').write_bytes(self.raw)
        self.manifest={'schema_version':1,'repository':'haidmoham/lmlab','revision':'a'*40,'notebooks':[{'slug':'test','path':'test.ipynb','title':'test','subtitle':'test','description':'test','publishable':True,'sha256':renderer.hashlib.sha256(self.raw).hexdigest()}]}
        self.path=self.root/'manifest.json'
    def tearDown(self): self.temp.cleanup()
    def render(self):
        self.path.write_text(json.dumps(self.manifest))
        with patch.object(renderer,'ROOT',self.output): return renderer.render(self.source,self.path)
    def test_no_execution_and_saved_output_retained(self):
        self.render()
        page=(self.output/'labs/lmlab/test/index.html').read_text()
        self.assertIn('saved evidence',page)
        self.assertTrue(any('actual heading' in h.get_text() for h in BeautifulSoup(page,'html.parser').find_all('h1')))
        self.assertIn('must never execute',page)
        self.assertFalse(BeautifulSoup(page,'html.parser').select('script'))
        self.assertEqual((self.output/'labs/lmlab/test/source.ipynb').read_bytes(),self.raw)
    def test_withdrawn_publication_removes_only_owned_projection(self):
        self.render()
        old=self.output/'labs/lmlab/publication.json'
        old.write_text(json.dumps(self.manifest))
        keep=self.output/'labs/lmlab/test/editorial.txt';keep.write_text('keep')
        self.manifest['notebooks'][0]['publishable']=False
        self.render()
        self.assertFalse((self.output/'labs/lmlab/test/index.html').exists())
        self.assertTrue(keep.exists())
    def test_unmarked_notebook_excluded(self):
        self.manifest['notebooks'][0]['publishable']=False
        self.assertEqual(self.render(),[])
    def test_changed_hash_fails_before_writing(self):
        self.manifest['notebooks'][0]['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'hash mismatch'): self.render()
        self.assertFalse((self.output/'labs').exists())
    def test_path_escape_rejected(self):
        self.manifest['notebooks'][0]['path']='../test.ipynb'
        with self.assertRaisesRegex(ValueError,'remain in source'): self.render()
    def test_mutable_reference_rejected(self):
        self.manifest['revision']='main'
        with self.assertRaisesRegex(ValueError,'full commit'): self.render()
    def test_all_inputs_checked_before_publication(self):
        self.manifest['notebooks'].append(dict(self.manifest['notebooks'][0],slug='bad',sha256='0'*64))
        with self.assertRaises(ValueError): self.render()
        self.assertFalse((self.output/'labs').exists())

if __name__=='__main__': unittest.main()
