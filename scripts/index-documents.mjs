import fs from 'node:fs/promises';
import path from 'node:path';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

const root = path.resolve('public/documents');
const documents = [];
for (const [i, filename] of (await fs.readdir(root)).filter(f => /\.(pdf|docx)$/i.test(f)).entries()) {
  const type = path.extname(filename).slice(1).toLowerCase();
  const file = path.join(root,filename);
  const doc = {id:`doc-${i+1}`,filename,type,path:`/documents/${encodeURIComponent(filename)}`,units:[]};
  if(type === 'pdf') {
    const pdf = await getDocument({data:new Uint8Array(await fs.readFile(file)),useSystemFonts:true}).promise;
    for(let page=1;page<=pdf.numPages;page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = content.items.map(x => x.str + (x.hasEOL?'\n':' ')).join('').trim();
      doc.units.push({location:page,text});
    }
    await pdf.destroy();
  } else {
    const result = await mammoth.convertToHtml({path:file});
    doc.warnings=result.messages;
    await fs.mkdir('public/rendered',{recursive:true});
    await fs.writeFile(`public/rendered/${doc.id}.html`,result.value);
    // Use the same block ordering as the browser viewer, including table cells.
    const {value} = await mammoth.extractRawText({path:file});
    doc.units = value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map((text,i)=>({location:i+1,text}));
    doc.htmlPath=`/rendered/${doc.id}.html`;
  }
  documents.push(doc);
  console.log(JSON.stringify({filename,units:doc.units.length,characters:doc.units.reduce((n,u)=>n+u.text.length,0),lowTextPages:doc.units.filter(u=>u.text.length<40).map(u=>u.location),warnings:doc.warnings}));
}
await fs.writeFile('public/search-index.json',JSON.stringify({documents}));
