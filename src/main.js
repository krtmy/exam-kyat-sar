import './style.css';
import {getDocument,GlobalWorkerOptions,TextLayer} from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import DOMPurify from 'dompurify';
import {createSearch,snippet} from './search.js';
GlobalWorkerOptions.workerSrc=worker;
const app=document.querySelector('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let documents,search,query='',savedScroll=0,current=null,pdf=null,page=1,zoom=1,fileQuery='',renderToken=0;
let fileHits=[],hitIndex=0;
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const mark=(text,q)=>{const terms=q.trim().split(/\s+/).filter(Boolean).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));if(!terms.length)return escape(text);return text.split(new RegExp(`(${terms.join('|')})`,'ig')).map((t,i)=>i%2?`<mark>${escape(t)}</mark>`:escape(t)).join('');};
function home(){
  current=null;renderToken++;if(pdf){pdf.destroy();pdf=null;}
  app.innerHTML=`<header class="mast"><a href="#" class="brand" aria-label="Exam Kyat Sar home"><span class="logo">E<span>k</span></span>EXAM KYAT SAR</a><span class="local">Your exam files. One search.</span></header><main class="home"><div class="intro"><span class="eyebrow">LESS LOOKING. MORE LEARNING.</span><h1>Remember a little.<br><span>Find the whole thing.</span></h1><p>One search for every question, formula, and forgotten page.</p></div><form id="search-form" class="searchbox">${icon}<input id="query" aria-label="Search all exam files" placeholder="Search anything from my exam files…" autocomplete="off" value="${escape(query)}" autofocus><kbd>Ctrl K</kbd><button type="submit" class="primary">Search <span>↗</span></button></form><div class="examples"><span>Try a topic</span>${['project success','rational agent','decision making','TCP','question 42'].map(t=>`<button data-query="${t}">${t}</button>`).join('')}</div><section id="results" aria-live="polite"></section><details class="library"><summary>All files <span>${documents.length} original documents</span></summary><div>${documents.map(d=>`<button class="file-row" data-doc="${d.id}"><span class="filetype ${d.type}">${d.type.toUpperCase()}</span><span>${escape(d.filename)}</span><span class="row-end">${d.type==='pdf'?`${d.units.length} pages`:'Word document'} ↗</span></button>`).join('')}</div></details><footer>Search inside PDFs & Word documents <span>•</span> No account. Search runs in your browser.</footer></main>`;
  document.querySelector('#search-form').onsubmit=e=>{e.preventDefault();query=document.querySelector('#query').value.trim();results();};
  document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{query=b.dataset.query;document.querySelector('#query').value=query;results();});
  document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>openDoc(b.dataset.doc,1,''));
  document.querySelector('.brand').onclick=e=>{e.preventDefault();query='';home();};
  results();document.querySelector('#query').focus();requestAnimationFrame(()=>window.scrollTo(0,savedScroll));
}
function results(){
  const target=document.querySelector('#results');if(!query){target.innerHTML='';return;}
  const hits=search(query), groups=new Map();for(const h of hits){if(!groups.has(h.docId))groups.set(h.docId,[]);groups.get(h.docId).push(h);}
  target.innerHTML=`<div class="result-heading"><h2>${groups.size?`${groups.size} ${groups.size===1?'file':'files'} found`:'No matching content'}</h2><span>for “${escape(query)}”</span></div>${!hits.length?'<p class="empty">Try a shorter phrase, a different spelling, or a question number.</p>':''}${[...groups].map(([id,hs])=>{const d=documents.find(x=>x.id===id);return `<article class="result"><div class="result-title"><span class="filetype ${d.type}">${d.type.toUpperCase()}</span><h3>${escape(d.filename)}</h3><span>${hs.length} matching ${d.type==='pdf'?'pages':'sections'}</span></div>${hs.slice(0,3).map(h=>matchRow(d,h)).join('')}${hs.length>3?`<details class="more"><summary>Show ${hs.length-3} more matches</summary>${hs.slice(3).map(h=>matchRow(d,h)).join('')}</details>`:''}</article>`;}).join('')}`;
  target.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDoc(b.dataset.open,Number(b.dataset.location),query));
}
function matchRow(d,h){return `<button class="match" data-open="${d.id}" data-location="${h.location}"><span class="match-label">${d.type==='pdf'?'Page':'Section'} ${h.location}<span>Open ↗</span></span><span class="snippet">${mark(snippet(h.text,query),query)}</span></button>`;}
async function openDoc(id,location,q){
  savedScroll=window.scrollY;current=documents.find(d=>d.id===id);page=location;zoom=1;fileQuery=q;
  app.innerHTML=`<header class="reader-head"><button id="back">← Back to Search</button><div><span class="filetype ${current.type}">${current.type.toUpperCase()}</span><h1>${escape(current.filename)}</h1></div><a href="${current.path}" download>Original ↓</a></header><div class="reader-tools"><form id="file-form">${icon}<input id="file-query" aria-label="Search this file" placeholder="Search this file…" value="${escape(q)}"><button>Find</button></form><div class="hit-controls"><button id="prev-hit" aria-label="Previous match">↑</button><span id="hit-status"></span><button id="next-hit" aria-label="Next match">↓</button></div>${current.type==='pdf'?`<div class="pages"><button id="prev-page" aria-label="Previous page">←</button><label>Page <input id="page" type="number" min="1" max="${current.units.length}" value="${page}" aria-label="Jump to page"> / ${current.units.length}</label><button id="next-page" aria-label="Next page">→</button><button id="zoom-out" aria-label="Zoom out">−</button><span id="zoom">100%</span><button id="zoom-in" aria-label="Zoom in">+</button></div>`:''}</div><main id="reader"><p class="loading">Opening original document…</p></main>`;
  document.querySelector('#back').onclick=home;
  document.querySelector('#file-form').onsubmit=e=>{e.preventDefault();fileQuery=document.querySelector('#file-query').value.trim();updateHits();jumpHit(0);};
  document.querySelector('#prev-hit').onclick=()=>jumpHit(hitIndex-1);document.querySelector('#next-hit').onclick=()=>jumpHit(hitIndex+1);
  updateHits();
  try{
    if(current.type==='pdf'){
      const openingId=current.id;const loaded=await getDocument(current.path).promise;if(current?.id!==openingId){loaded.destroy();return;}pdf=loaded;
      document.querySelector('#prev-page').onclick=()=>goPage(page-1);document.querySelector('#next-page').onclick=()=>goPage(page+1);
      document.querySelector('#page').onchange=e=>goPage(Number(e.target.value));
      document.querySelector('#zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.2);renderPDF();};document.querySelector('#zoom-in').onclick=()=>{zoom=Math.min(3,zoom+.2);renderPDF();};await renderPDF();
    }else{
      const openingId=current.id;const response=await fetch(current.htmlPath);if(!response.ok)throw Error('Cannot load Word document');const html=await response.text();if(current?.id!==openingId)return;
      document.querySelector('#reader').innerHTML=`<article class="word">${DOMPurify.sanitize(html)}</article>`;
      highlightWord();scrollWord(location);
    }
  }catch(e){const r=document.querySelector('#reader');if(r)r.innerHTML=`<p class="error">This document could not be displayed. ${escape(e.message)} <a href="${current.path}" download>Download the original</a></p>`;}
}
function updateHits(){fileHits=search(fileQuery,current.id).sort((a,b)=>a.location-b.location);hitIndex=0;document.querySelector('#hit-status').textContent=fileQuery?`${fileHits.length} matching ${current.type==='pdf'?'pages':'sections'}`:'';document.querySelector('#prev-hit').disabled=document.querySelector('#next-hit').disabled=!fileHits.length;}
function jumpHit(i){if(!fileHits.length){if(current.type==='docx')highlightWord();else renderPDF();return;}hitIndex=(i+fileHits.length)%fileHits.length;document.querySelector('#hit-status').textContent=`${hitIndex+1} / ${fileHits.length}`;if(current.type==='pdf')goPage(fileHits[hitIndex].location);else{highlightWord();scrollWord(fileHits[hitIndex].location);}}
function goPage(n){page=Math.max(1,Math.min(current.units.length,Math.round(n)||1));renderPDF();}
async function renderPDF(){
  if(!pdf)return;const token=++renderToken;const p=await pdf.getPage(page);if(token!==renderToken)return;
  const reader=document.querySelector('#reader');const base=p.getViewport({scale:1});const viewport=p.getViewport({scale:Math.min(1.35,(reader.clientWidth-56)/base.width)*zoom});reader.innerHTML='<div class="pdf-sheet"><canvas></canvas><div class="textLayer"></div></div>';
  const sheet=reader.querySelector('.pdf-sheet');sheet.style.width=`${viewport.width}px`;sheet.style.height=`${viewport.height}px`;sheet.style.setProperty('--scale-factor',viewport.scale);
  const canvas=sheet.querySelector('canvas'),ratio=window.devicePixelRatio||1;canvas.width=viewport.width*ratio;canvas.height=viewport.height*ratio;canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
  document.querySelector('#page').value=page;document.querySelector('#prev-page').disabled=page<=1;document.querySelector('#next-page').disabled=page>=current.units.length;document.querySelector('#zoom').textContent=`${Math.round(zoom*100)}%`;
  await p.render({canvasContext:canvas.getContext('2d'),viewport,transform:[ratio,0,0,ratio,0,0]}).promise;
  if(token!==renderToken)return;const layer=new TextLayer({textContentSource:await p.getTextContent(),container:sheet.querySelector('.textLayer'),viewport});await layer.render();
  if(token!==renderToken)return;const terms=fileQuery.toLowerCase().split(/\s+/).filter(Boolean);sheet.querySelectorAll('.textLayer span').forEach(s=>{if(terms.some(t=>s.textContent.toLowerCase().includes(t)))s.classList.add('pdf-highlight');});reader.scrollTop=0;
}
function highlightWord(){const root=document.querySelector('.word');if(!root)return;root.querySelectorAll('mark').forEach(m=>m.replaceWith(document.createTextNode(m.textContent)));root.normalize();if(!fileQuery)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){const html=mark(n.textContent,fileQuery);if(html.includes('<mark>')){const span=document.createElement('span');span.innerHTML=html;n.replaceWith(span);}}}
function scrollWord(location){const wanted=current.units.find(u=>u.location===location)?.text.replace(/\s+/g,' ').trim();const blocks=[...document.querySelectorAll('.word p,.word li,.word h1,.word h2,.word h3,.word td')];const block=blocks.find(b=>b.textContent.replace(/\s+/g,' ').trim()===wanted)||blocks.find(b=>wanted&&b.textContent.replace(/\s+/g,' ').includes(wanted.slice(0,70)))||document.querySelector('.word mark');block?.scrollIntoView({block:'center'});}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'||e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();document.querySelector(current?'#file-query':'#query')?.focus();}if(e.key==='Escape'&&current)home();});
try{const response=await fetch('./search-index.json');if(!response.ok)throw Error('Search index is missing');({documents}=await response.json());documents=documents.map(d=>({...d,path:'.'+d.path,htmlPath:d.htmlPath?'.'+d.htmlPath:undefined}));search=createSearch(documents);home();}catch(e){app.innerHTML=`<p class="error">Could not open the library: ${escape(e.message)}. Please restart the local app.</p>`;}
