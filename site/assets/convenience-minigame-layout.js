// Move existing planning nodes, keeping original selectors as read aliases.
// Saved legacy edits are not rewritten; future edits use stable element IDs.
const numberedSections={1:1,2:2,3:3,4:2,5:3,6:4,7:5,8:6,9:7,10:8,11:9,12:10};
function originalSelector(el,root){const parts=[];for(let n=el;n&&n!==root;n=n.parentElement){let index=1;for(let p=n.previousElementSibling;p;p=p.previousElementSibling)if(p.localName===n.localName)index++;parts.unshift(n.localName+':nth-of-type('+index+')');}return parts.join(' > ');}
function hash(value){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);}
function chapterReference(raw){const n=Number(raw.split('.')[0]),suffix=raw.includes('.')?raw.slice(raw.indexOf('.')):'';return {tab:n===4||n===5?'小游戏':'规则',number:String(numberedSections[n]||n)+suffix};}
export function normalizeLegacyRetailHtml(element,html){
 let text=String(html);const prefix=element.dataset.retailHeadingPrefix;
 if(prefix&&/^H[234]$/.test(element.tagName))text=text.replace(/^\d+(?:\.\d+)?\.?\s*/,prefix+' ');
 text=text.replace(/第\s*(\d+(?:\.\d+)?(?:、\d+(?:\.\d+)?)*)\s*节/g,(_,raw)=>{const refs=raw.split('、').map(chapterReference);return '【'+refs[0].tab+'】第'+refs.map(r=>r.number).join('、')+'节';});
 text=text.replace(/见(\d+\.\d+)节/g,(_,raw)=>{const r=chapterReference(raw);return '见【'+r.tab+'】第'+r.number+'节';});
 return text;
}
function markNew(el,id){el.dataset.retailEditId='retail-split-'+id;return el;}
function heading(document,text,id){const h=markNew(document.createElement('h2'),id);h.textContent=text;return h;}
export function splitConvenienceDocument(root){
 if(!root||root.dataset.retailSplitReady)return;
 const doc=root.ownerDocument,rules=root.querySelector('[data-shop-page-panel="rules"] .retail-document-card'),mini=root.querySelector('.retail-minigame-document');
 if(!rules||!mini)return;
 const sections=[...rules.children].filter(e=>e.matches('section.retaiL-document-section'.toLowerCase()));
 if(sections.length!==12)throw Error('Convenience source section structure changed');
 // Stamp BEFORE moving nodes so all existing draft/formal selectors still identify the same text.
 const used=new Set();
 for(const el of rules.querySelectorAll('h2,h3,h4,p,li,th,td')){const key=originalSelector(el,root),id='retail-v2-'+hash(key);if(used.has(id))throw Error('Retail editing ID collision');used.add(id);el.dataset.retailLegacySelector=key;el.dataset.retailEditId=id;}
 sections.forEach((section,index)=>{section.dataset.retailOriginalChapter=String(index+1);for(const h of section.querySelectorAll('h2,h3')){const m=h.textContent.match(/^(\d+)(\.\d+)?/);if(m)h.dataset.retailHeadingPrefix=String(numberedSections[index+1])+(m[2]|| (h.tagName==='H2'?'.':''));}});
 const daily=doc.createElement('section');daily.className='retail-document-section';daily.append(heading(doc,'1. 每日挑战开放与产出','daily-title'));
 const start=sections[1].querySelector('h3');let current=start;
 while(current){const next=current.nextSibling;if(current!==start&&current.nodeType===1&&current.tagName==='H3')break;daily.append(current);current=next;}
 start.dataset.retailHeadingPrefix='1.1';
 for(const h of sections[1].querySelectorAll('h3')){if(h.textContent.startsWith('2.2'))h.dataset.retailHeadingPrefix='2.1';else if(h.textContent.startsWith('2.3'))h.dataset.retailHeadingPrefix='2.2';}
 mini.append(daily,sections[3],sections[4]);
 const config=doc.createElement('section');config.className='retail-document-section';config.append(heading(doc,'4. 道具与星级奖励配置','config-title'));
 const note=markNew(doc.createElement('p'),'config-note');note.textContent='保留原有道具和奖励参数及数值结构说明；MATCH3仅为沿用的配置键前缀，不表示本项目使用三消。快速进货参数仍在【规则】分页。';config.append(note);
 const oldTable=sections[2].querySelector('table'),wrap=doc.createElement('div'),newTable=oldTable.cloneNode(false);wrap.className='shop-table-scroll';
 const cols=oldTable.querySelector('colgroup').cloneNode(true),head=oldTable.querySelector('thead').cloneNode(true);head.querySelectorAll('th').forEach((el,i)=>{el.removeAttribute('data-retail-legacy-selector');el.removeAttribute('data-retail-heading-prefix');markNew(el,'config-heading-'+i);});
 const body=doc.createElement('tbody');const movedKeys=new Set(['MATCH3_ITEM_USE_TIME','MATCH3_ITEM_COST','MATCH3_REWARD','MATCH3_FIRST_STAR_REWARD']);
 [...oldTable.querySelectorAll('tbody > tr')].forEach(row=>{if(movedKeys.has(row.cells[0].textContent.trim()))body.append(row);});
 newTable.append(cols,head,body);wrap.append(newTable);config.append(wrap);mini.append(config);
 const intro=sections[2].querySelectorAll(':scope > p')[1];if(intro)intro.textContent='以下为经营与快速进货配置，沿用程序现有键名；连连看的道具、星级及奖励配置移至【小游戏】分页，不改变原有数值。';
 const jump=markNew(doc.createElement('p'),'rules-jump');jump.textContent='每日挑战、配对规则、十天机制、塑封、道具、死局处理、计时评星及每日记星，统一查看右上角【小游戏】分页。';sections[1].insertBefore(jump,sections[1].querySelector('h3'));
 rules.classList.add('retail-business-document');
 for(const el of rules.querySelectorAll('[data-retail-legacy-selector]'))el.innerHTML=normalizeLegacyRetailHtml(el,el.innerHTML);
 for(const el of mini.querySelectorAll('[data-retail-legacy-selector]'))el.innerHTML=normalizeLegacyRetailHtml(el,el.innerHTML);
 const summary=root.querySelector('.shop-structure-grid section:last-child p');if(summary)summary.textContent='连连看作为进货小游戏；具体玩法、机制、道具和星级奖励统一查看【小游戏】分页。';
 root.dataset.retailSplitReady='true';
}
