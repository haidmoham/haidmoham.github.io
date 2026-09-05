// Import a validated static snapshot. Production remains ordinary nginx-served files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]);
const response=await fetch(process.argv[3]);
if(!response.ok)throw Error('Homepage export failed: '+response.status);
const html=await response.text();
if(!html.includes('software')||!html.includes('/_next/static/')||!html.includes('vinext.navigationRuntime'))throw Error('Incomplete production HTML');
if(html.includes('/@vite/')||html.includes('/@react-refresh'))throw Error('Development HTML cannot be published');
for(const folder of ['_next','fonts','work','labs','notebooks','robotics','assets','resumes','archive']){
 const from=path.join(source,folder);
 if(fs.existsSync(from))fs.cpSync(from,path.join(root,folder),{recursive:true});
}
for(const name of ['about.html','available.html','projects.html','notes.html','resume.html','contact.html','404.html','favicon.svg','profile.jpg','portfolio-page-base.css','portfolio-pages.css','portfolio-notebook.css','contact-form.js']){
 fs.copyFileSync(path.join(source,name),path.join(root,name));
}
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Imported complete static homepage and integrated pages. Hosting and C-1N files are untouched.');
