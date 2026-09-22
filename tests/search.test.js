import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSearch,normalize} from '../src/search.js';
const {documents}=JSON.parse(fs.readFileSync(new URL('../public/search-index.json',import.meta.url)));
const search=createSearch(documents);
test('all nine originals are indexed, including all 64 PDF pages',()=>{
  assert.equal(documents.length,9);
  assert.equal(documents.filter(d=>d.type==='pdf').reduce((n,d)=>n+d.units.length,0),64);
  for(const d of documents){assert.ok(fs.existsSync(new URL('../public'+decodeURIComponent(d.path),import.meta.url)));assert.ok(d.units.some(u=>u.text.length>100));}
});
test('question aliases find the exact numbered question without fuzzy number substitution',()=>{
  for(const query of ['question 42','Q42','R42']){const hits=search(query);assert.ok(hits.some(h=>h.filename.startsWith('CST-4404')&&h.location===21));assert.ok(hits.every(h=>/\b(?:r|q|question)\s*42\b/i.test(h.text)));}
  assert.equal(search('question 99999').length,0);
  assert.ok(search('question 40').some(h=>h.filename.startsWith('CST-4404')&&h.location===19));
});
test('searches actual content of every document',()=>{
  for(const d of documents){const unit=d.units.find(u=>u.text.length>100);const term=unit.text.match(/[A-Za-z]{6,}/)[0];assert.ok(search(term,d.id).some(h=>h.location===unit.location),`${d.filename}: ${term}`);}
});
test('case, typo tolerance, phrase ranking, and empty queries',()=>{
  assert.deepEqual(search('TCP').map(h=>h.id),search('tcp').map(h=>h.id));
  assert.ok(search('managemant').length>0);
  assert.ok(normalize(search('project success')[0].text).includes('project success'));
  assert.equal(search(' ').length,0);
});
test('Word renders preserve both original embedded images',()=>{
  const html=documents.filter(d=>d.type==='docx').map(d=>fs.readFileSync(new URL('../public'+d.htmlPath,import.meta.url),'utf8')).join('');
  assert.equal((html.match(/<img/g)||[]).length,2);
});
