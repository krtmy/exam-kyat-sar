import MiniSearch from 'minisearch';
export const normalize = value => value.toLowerCase().normalize('NFKC').replace(/\b(?:question|ques|q|r)\s*[.:-]?\s*(\d(?:[ \t]*\d)*)/g,(_,digits)=>'question'+digits.replace(/\s/g,'')).replace(/(^|\n)\s*(\d+)\s*\./g,'$1question$2 ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function createSearch(documents) {
  const rows=documents.flatMap(d=>d.units.map(u=>({id:`${d.id}:${u.location}`,docId:d.id,filename:d.filename,text:u.text,location:u.location})));
  const index=new MiniSearch({fields:['text','filename'],storeFields:['docId','location','text','filename'],tokenize:text=>normalize(text).split(/\s+/).filter(Boolean)});
  index.addAll(rows);
  return (query,docId) => {
    if(!normalize(query)) return [];
    const hits=index.search(query,{prefix:term=>!/[0-9]/.test(term),fuzzy:term=>term.length>4&&!/[0-9]/.test(term)?0.2:false,combineWith:'AND',boost:{text:2},filter:r=>!docId||r.docId===docId});
    const phrase=normalize(query);
    return hits.map(h=>({...h,score:h.score*(normalize(h.text).includes(phrase)?4:1)})).sort((a,b)=>b.score-a.score);
  };
}
export function snippet(text,query) {
  const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
  const question=query.match(/\b(?:question|ques|q|r)\s*[.:-]?\s*(\d+)/i);
  const questionPosition=question?text.search(new RegExp(`\\b(?:question|ques|q|r)\\s*[.:-]?\\s*${question[1].split('').join('\\s*')}\\b`,'i')):-1;
  const positions=questionPosition>=0?[questionPosition]:terms.map(t=>text.toLowerCase().indexOf(t)).filter(i=>i>=0);
  const start=Math.max(0,(positions.length?Math.min(...positions):0)-75);
  return (start?'…':'')+text.slice(start,start+260).replace(/\s+/g,' ')+(text.length>start+260?'…':'');
}
