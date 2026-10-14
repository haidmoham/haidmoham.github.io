// Import a validated static snapshot. Production remains ordinary nginx-served files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyPortfolioIdentity} from './portfolio-identity.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]);
const response=await fetch(process.argv[3]);
if(!response.ok)throw Error('Homepage export failed: '+response.status);
let html=await response.text();
if(!html.includes('software')||!html.includes('/_next/static/')||!html.includes('vinext.navigationRuntime'))throw Error('Incomplete production HTML');
if(html.includes('/@vite/')||html.includes('/@react-refresh'))throw Error('Development HTML cannot be published');
html=applyPortfolioIdentity(html,{canonicalUrl:'https://mhaider.dev/'});
for(const folder of ['_next','fonts','work','labs','notebooks','robotics','assets','resumes','archive']){
 const from=path.join(source,folder);
 if(fs.existsSync(from))fs.cpSync(from,path.join(root,folder),{recursive:true});
}
const pages=['about.html','available.html','projects.html','notes.html','resume.html','contact.html','404.html'];
// The deployment repository owns its identity assets. An older companion
// snapshot must not replace its current favicon with an unrelated version.
for(const name of [...pages,'profile.jpg','portfolio-page-base.css','portfolio-pages.css','portfolio-notebook.css','contact-form.js']){
 fs.copyFileSync(path.join(source,name),path.join(root,name));
}
function normalizePage(relative){
 const file=path.join(root,relative);
 const contents=fs.readFileSync(file,'utf8');
 if(/<meta\b[^>]*http-equiv=["']refresh["']/i.test(contents))return;
 const canonicalUrl='https://mhaider.dev/'+relative.replace(/index\.html$/,'');
 fs.writeFileSync(file,applyPortfolioIdentity(contents,{canonicalUrl}));
}
function normalizeDirectory(relative){
 const directory=path.join(root,relative);
 if(!fs.existsSync(directory))return;
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const name=path.posix.join(relative,entry.name);
  if(entry.isDirectory())normalizeDirectory(name);
  else if(entry.isFile()&&entry.name.endsWith('.html'))normalizePage(name);
 }
}
for(const name of pages)normalizePage(name);
// Preserve historical archive/notebook evidence and the independent C-1N site.
for(const directory of ['work','labs','robotics'])normalizeDirectory(directory);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Imported complete static homepage and integrated pages. Hosting and C-1N files are untouched.');
