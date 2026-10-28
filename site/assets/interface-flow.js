import { mountOnlineReaderStatus, startOnlineReaderSync } from './online-reader-client.js?v=20261021-v1';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Snapshot mutable containers while sharing immutable screenshot strings.
const clone = v => Array.isArray(v) ? v.map(clone) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).map(([key,value])=>[key,clone(value)])) : v;
const uid = () => crypto.randomUUID();
const kinds = {screen:'整页',popup:'弹窗',tab:'分页',state:'状态图',text:'文字 / tips'};
const state = {readOnly:false,doc:null,revision:null,systems:[],selected:null,dirty:false,busy:false,mode:'select',undo:[],redo:[],gesture:null,space:false,viewMode:'overview',lineScope:'selected',camera:null};
let reading;
const camera = () => state.camera ||= clone(state.doc?.viewport || {x:40,y:40,zoom:1});
const HEADER = 40;
const nodeHeight = n => HEADER + (n.image ? n.width * n.imageHeight / n.imageWidth : 140);
const nodeById = id => state.doc?.nodes.find(n=>n.id === id);
const regionById = (n,id) => n?.regions.find(r=>r.id === id);
let toastTimer;
function toast(message){$('#flow-toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#flow-toast').textContent='',4500);}
async function api(url,options={}){
  const response=await fetch(url,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.message || '操作未完成'),{status:response.status});
  return data;
}
function isTextInput(el){return el?.matches('input,textarea,select,[contenteditable=true]');}
function checkpoint(){state.undo.push(clone(state.doc));if(state.undo.length>12)state.undo.shift();state.redo=[];}
function dirty(){state.dirty=true;toolbar();}
function toolbar(){
  $('#flow-status').textContent=state.readOnly?'已发布 · 只读':state.busy?'正在处理…':!state.doc?'选择系统后继续整理':state.dirty?'有未保存修改':state.revision?'草稿已保存':'尚未整理 · 未写入草稿';
  $('#flow-title').textContent=state.doc?.name || '界面流程图';
  $('#save').disabled=!state.doc || !state.dirty || state.busy;
  $('#publish').disabled=!state.doc || state.busy;
  $('#undo').disabled=!state.undo.length || state.busy;
  $('#redo').disabled=!state.redo.length || state.busy;
  $('#export').disabled=!state.doc;
  $('#zoom-value').textContent=Math.round(camera().zoom*100)+'%';
  $('#flow-app').classList.toggle('is-busy',state.busy);
  $('#mark').classList.toggle('active',state.mode === 'region');
  $('#pan').classList.toggle('active',state.mode === 'pan');
  for(const id of ['add-image','add-text','mark'])$('#'+id).disabled=!state.doc;
  reading?.sync();
}
function shell(){
  $('#flow-app').innerHTML='<div class="flow-shell'+(state.readOnly?' readonly':'')+'"><header class="flow-top"><h1 id="flow-title">界面流程图</h1><span id="flow-status" class="status"></span><button id="save" data-edit>保存草稿</button><button id="publish" data-edit class="primary">发布此系统</button><button id="export">导出结构化 JSON</button></header><div class="flow-tools"><button id="add-image" data-edit>＋ 截图 / Ctrl+V</button><button id="add-text" data-edit>＋ 文字节点</button><button id="mark" data-edit>框选点击区</button><button id="pan">平移画布</button><button id="undo" data-edit>撤销</button><button id="redo" data-edit>重做</button><button id="fit">查看全图</button><button id="zoom-out" aria-label="缩小画布">−</button><span id="zoom-value">100%</span><button id="zoom-in" aria-label="放大画布">＋</button><span class="hint">滚轮缩放 · 空白拖动平移 · 双击截图放大</span></div><div class="flow-body"><aside class="systems"><h2>按系统整理</h2><button id="new-system" data-edit class="primary">＋ 新建系统</button><div id="system-list"></div><hr><h2>本系统节点</h2><div id="node-list"></div></aside><main id="viewport" class="viewport" tabindex="0" aria-label="界面流程图画布"><div id="world" class="world"></div><div id="empty" class="empty-canvas"></div></main><aside id="inspector" class="inspector"></aside></div></div><input id="image-files" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden><dialog id="new-dialog" class="flow-dialog"><form id="new-form"><h2>这是什么系统的界面？</h2><p class="muted">不同系统分别保存，后续可以随时回来继续整理。</p><label>系统名称<input id="system-name" required maxlength="120" placeholder="例如：员工培养 / 汽车旅馆"></label><div class="dialog-actions"><button type="button" id="cancel-new">取消</button><button type="submit" class="primary">创建流程</button></div></form></dialog><dialog id="image-dialog" class="flow-dialog image-dialog"><header><strong id="image-title"></strong><button id="image-fit">适应窗口</button><button id="image-actual">原始大小</button><button id="image-close">关闭</button></header><div class="image-scroll"><img id="full-image" alt="界面截图"></div></dialog><div id="flow-toast" class="toast" role="status" aria-live="polite"></div>';
  if(state.readOnly)document.querySelectorAll('[data-edit]').forEach(el=>el.hidden=true);
  const back=document.createElement('button');back.id='catalog-back';back.textContent='← 返回系统总览';$('.flow-top').prepend(back);
  const version=document.createElement('label');version.innerHTML='所属版本<select id="system-version"><option value="0.1">0.1</option><option value="0.2">0.2</option><option value="0.3">0.3</option><option value="">未分组</option></select><small>版本标记保存在系统名称中。</small>';
  $('#new-form .dialog-actions').before(version);
  const readPanel=document.createElement('main');
  readPanel.id='flow-reading';readPanel.className='flow-reading';
  $('#viewport').before(readPanel);
  reading=createReadingView({state,escapeHtml:esc,showImage,editNode:focusNode,refreshCanvas:canvas,editor:{checkpoint,changed:dirty,refresh:render,readImage:readFlowImage,position:newPosition,toast}});
  bind();toolbar();render();
  if(!state.readOnly){const online=document.createElement('span');$('.flow-top').append(online);mountOnlineReaderStatus(online);}
}
async function listSystems(){
  const result=await api('/api/flows/'+(state.readOnly?'published':'draft'));
  state.systems=result.systems;
  renderSystems();
  if(!state.doc)reading?.render();
}
function renderSystems(){
  $('#system-list').innerHTML=state.systems.map(s=>'<button class="system-link '+(s.id===state.doc?.id?'active':'')+'" data-system="'+esc(s.id)+'">'+esc(s.name)+'<small>'+s.nodes+' 个节点</small></button>').join('') || '<p class="muted">'+(state.readOnly?'还没有已发布的系统流程。':'点击上方新建第一个系统。')+'</p>';
  $('#node-list').innerHTML=(state.doc?.nodes || []).map(n=>'<button class="node-link" data-focus="'+esc(n.id)+'">'+esc(n.name || '未命名节点')+' · '+kinds[n.kind]+'</button>').join('');
}
function canLeave(){return !state.busy&&(!state.dirty || confirm('当前流程有未保存修改。确定离开并放弃这些修改吗？'));}
window.interfaceFlowCanLeave=canLeave;
async function openSystem(id){
  if(state.busy || !canLeave())return;
  state.busy=true;toolbar();
  try{
    let result;
    try{result=await api('/api/flows/'+(state.readOnly?'published':'draft')+'/'+encodeURIComponent(id));}
    catch(error){
      const planned=flowV01Systems.find(s=>s.id===id);
      if(state.readOnly||!planned||error.status!==404)throw error;
      result={document:{schemaVersion:1,id,name:planned.name+'（0.1）',notes:'',nodes:[],edges:[],viewport:{x:40,y:40,zoom:1}},revision:null};
    }
    state.doc=result.document;state.revision=result.revision;state.dirty=false;state.selected=null;state.undo=[];state.redo=[];state.mode='select';state.camera=clone(state.doc.viewport);
    history.replaceState(null,'','flow.html?'+new URLSearchParams({mode:state.readOnly?'reader':'edit',system:id}));
    render();
  }finally{state.busy=false;toolbar();}
}
async function openCatalog(){
  if(!canLeave())return;
  state.doc=null;state.revision=null;state.dirty=false;state.selected=null;state.undo=[];state.redo=[];state.camera=null;
  history.replaceState(null,'','flow.html?mode='+(state.readOnly?'reader':'edit'));
  render();
  try{await listSystems();}catch(error){toast(error.message);}
}
async function save(){
  if(state.readOnly || !state.doc || state.busy)return false;
  state.busy=true;toolbar();
  try{
    const result=await api('/api/flows/draft/'+state.doc.id,{method:'PUT',body:JSON.stringify({baseRevision:state.revision,document:state.doc})});
    state.doc=result.document;state.revision=result.revision;state.dirty=false;
    await listSystems();toast('草稿已保存，刷新后可以继续整理。');return true;
  }catch(e){toast(e.message);return false;}finally{state.busy=false;toolbar();}
}
async function publish(){
  if(state.readOnly || !state.doc || state.busy)return;
  if(!confirm('将「'+state.doc.name+'」的当前流程发布到阅读版？只发布这一个系统。'))return;
  if(state.dirty && !await save())return;
  state.busy=true;toolbar();
  try{await api('/api/flows/draft/'+state.doc.id+'/publish',{method:'POST',headers:{'Content-Type':'application/json','X-Online-Publish-Batch':'1'},body:JSON.stringify({baseRevision:state.revision})});
    try{await startOnlineReaderSync();toast('此系统已发布，正在同步在线阅读版。');}catch(e){toast('本地已发布，在线同步未启动；请点击重试同步。');}}
  catch(e){toast(e.message);}finally{state.busy=false;toolbar();}
}
function render(){renderSystems();reading?.render();canvas();inspector();toolbar();}
function transform(){if(state.doc){const v=camera();$('#world').style.transform='translate('+v.x+'px,'+v.y+'px) scale('+v.zoom+')';}toolbar();}
function anchor(n,region){
  if(region&&n.image&&n.imageWidth>0&&n.imageHeight>0)return {x:n.x+n.width*(region.x+region.width),y:n.y+HEADER+n.width*n.imageHeight/n.imageWidth*(region.y+region.height/2)};
  return {x:n.x+n.width,y:n.y+20};
}
function wirePath(a,b){const mid=(a.x+b.x)/2;return 'M '+a.x+' '+a.y+' H '+mid+' V '+b.y+' H '+b.x;}
function relationshipPath(a,b,n,t){
  const exit=n.x+n.width+24,entry=t.x-24;
  if(entry>exit)return 'M '+a.x+' '+a.y+' H '+exit+' H '+((exit+entry)/2)+' V '+b.y+' H '+b.x;
  const lane=Math.min(n.y,t.y)-55;
  return 'M '+a.x+' '+a.y+' H '+exit+' V '+lane+' H '+entry+' V '+b.y+' H '+b.x;
}
function selectedEdges(){
  const s=state.selected;if(!s)return [];
  if(s.type==='edge')return state.doc.edges.filter(e=>e.id===s.id);
  if(s.type==='region')return state.doc.edges.filter(e=>e.source===s.node&&e.region===s.id);
  return state.doc.edges.filter(e=>e.source===s.id||e.target===s.id);
}
function canvas(){
  if(state.viewMode!=='canvas'){$('#world').innerHTML='';return;}
  const doc=state.doc;
  $('#empty').innerHTML=!doc?'<strong>把界面串成一份清晰的流程</strong>'+(state.readOnly?'从左侧选择已发布的系统。':'先输入系统名称，再直接 Ctrl+V 粘贴截图。'):!doc.nodes.length?'<strong>'+(state.readOnly?'此流程暂时没有节点':'在这里粘贴第一张截图')+'</strong>'+(state.readOnly?'':'Ctrl+V 或点击「＋ 截图」；简单提示可以用文字节点。'):'';
  if(!doc){$('#world').innerHTML='';return;}
  const related=selectedEdges(),relatedIds=new Set(related.map(e=>e.id)),nearNodes=new Set(related.flatMap(e=>[e.source,e.target]));
  const visibleEdges=state.lineScope==='none'?[]:state.lineScope==='all'?doc.edges:related;
  const wires=visibleEdges.map(e=>{
    const n=nodeById(e.source), target=nodeById(e.target), region=regionById(n,e.region);if(!n||!target)return '';
    const a=anchor(n,region), b={x:target.x,y:target.y+20}, d=relationshipPath(a,b,n,target), label=[e.action,e.condition&&'［'+e.condition+'］'].filter(Boolean).join(' ');
    return '<g data-edge="'+esc(e.id)+'" class="'+(state.selected&&!relatedIds.has(e.id)?'unrelated-wire':'')+'"><title>'+esc(label||'未写触发动作')+'</title><path class="wire '+(relatedIds.has(e.id)?'selected':'')+'" d="'+d+'" marker-end="url(#arrow)"/><path class="wire-hit" d="'+d+'"/></g>';
  }).join('');
  const ghost=state.gesture?.kind==='connect'?'<path class="wire" d="'+wirePath(state.gesture.anchor,state.gesture.end)+'" marker-end="url(#arrow)"/>':'';
  $('#world').innerHTML='<svg class="wires"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#44847d"/></marker></defs>'+wires+ghost+'</svg>'+doc.nodes.map(n=>{
    const selected=state.selected?.node===n.id || state.selected?.type==='node'&&state.selected.id===n.id;
    const regions=n.regions.map(r=>'<div class="region '+(state.selected?.id===r.id?'selected':'')+'" data-region="'+esc(r.id)+'" style="left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.width*100+'%;height:'+r.height*100+'%"><span class="region-name">'+esc(r.name || '点击区')+'</span>'+(!state.readOnly?'<button class="connector" data-connect="'+esc(r.id)+'" aria-label="从此点击区拖到目标界面" title="拖到目标界面，建立连接"></button><button class="region-resize" aria-label="调整点击区大小"></button>':'')+'</div>').join('');
    let drawing='';
    if(state.gesture?.kind==='draw' && state.gesture.node===n.id){const r=state.gesture.rect;drawing='<div class="drawing" style="left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.width*100+'%;height:'+r.height*100+'%"></div>';}
    return '<article class="node '+(selected?'selected':'')+'" data-node="'+esc(n.id)+'" style="left:'+n.x+'px;top:'+n.y+'px;width:'+n.width+'px"><header class="node-head"><strong>'+esc(n.name || '未命名节点')+'</strong><span>'+kinds[n.kind]+'</span>'+(!state.readOnly?'<button class="connector node-port" data-connect="" aria-label="从节点连接到目标" title="拖到目标界面"></button>':'')+'</header>'+(n.image?'<div class="shot"><img src="'+n.image+'" alt="'+esc(n.name || '截图')+'">'+regions+drawing+'</div>':'<div class="text-card">'+esc(n.notes || '选择节点，在右侧填写提示或结果。')+'</div>')+(!state.readOnly?'<button class="resize" aria-label="缩放节点"></button>':'')+'</article>';
  }).join('');
  if(state.selected)$('#world').querySelectorAll('[data-node]').forEach(el=>el.classList.toggle('distant',!nearNodes.has(el.dataset.node)&&el.dataset.node!==(state.selected.node||state.selected.id)));
  transform();
}
function gaps(){
  if(!state.doc)return [];
  const result=[];
  for(const n of state.doc.nodes){
    if(!n.name.trim())result.push({node:n.id,label:'未命名的'+kinds[n.kind]});
    for(const r of n.regions)if(!state.doc.edges.some(e=>e.source===n.id&&e.region===r.id))result.push({node:n.id,region:r.id,label:(n.name||'未命名节点')+'：'+(r.name||'点击区')+' 尚无目标'});
  }
  return result;
}
function field(label,key,value,{area=false,options=null}={}){
  if(state.readOnly)return '<label>'+esc(label)+'</label><div class="inspect-read">'+esc(options?.[value] || value || '—')+'</div>';
  return '<label>'+esc(label)+(options?'<select data-field="'+key+'">'+Object.entries(options).map(([k,v])=>'<option value="'+esc(k)+'"'+(k===value?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select>':area?'<textarea data-field="'+key+'">'+esc(value)+'</textarea>':'<input data-field="'+key+'" value="'+esc(value)+'" maxlength="'+(key==='name'?'120':'500')+'">')+'</label>';
}
function selectedObject(){
  const s=state.selected;if(!s)return state.doc;
  if(s.type==='node')return nodeById(s.id);
  if(s.type==='region')return regionById(nodeById(s.node),s.id);
  return state.doc.edges.find(e=>e.id===s.id);
}
function inspector(){
  const panel=$('#inspector');if(!state.doc){panel.innerHTML='<h2>从截图开始</h2><p class="muted">为按钮框选点击区，拖动绿色圆点连接到目标界面。目标可复用；没有截图的提示可用文字节点。</p>';return;}
  const s=state.selected, obj=selectedObject();if(!obj){state.selected=null;return inspector();}
  let html='';
  if(!s){html='<h2>系统说明</h2>'+field('系统名称','name',obj.name)+field('整体规则 / 备注','notes',obj.notes,{area:true});}
  else if(s.type==='edge'){
    html='<h2>连接规则</h2><p class="muted">'+esc(nodeById(obj.source)?.name||'未命名')+' → '+esc(nodeById(obj.target)?.name||'未命名')+'</p>'+field('触发动作','action',obj.action)+field('成立条件','condition',obj.condition,{area:true})+field('补充规则','notes',obj.notes,{area:true})+field('目标界面','target',obj.target,{options:Object.fromEntries(state.doc.nodes.map(n=>[n.id,n.name||'未命名节点']))})+'<button data-jump="'+esc(obj.target)+'">定位目标界面 →</button>';
  }else{
    html='<h2>'+(s.type==='region'?'点击区域':'界面节点')+'</h2>'+field('名称','name',obj.name);
    if(s.type==='node')html+=field('类型','kind',obj.kind,{options:kinds});
    html+=field(s.type==='node'&&obj.kind==='text'?'提示 / 结果文字':'规则 / 备注','notes',obj.notes,{area:true});
    if(s.type==='node'&&obj.image)html+='<button id="inspect-image">放大查看截图</button>';
    if(!state.readOnly){
      if(s.type==='region')html+='<p class="muted">拖动框体移动，拖动右下角调整大小。右侧绿色圆点可直接拖向目标图。</p>';
      html+='<hr><label>连接到<select id="target-choice"><option value="">请选择目标界面</option>'+state.doc.nodes.map(n=>'<option value="'+esc(n.id)+'">'+esc(n.name||'未命名节点')+'</option>').join('')+'</select></label><button id="connect-selected">添加连接</button>';
    }
    const source=s.type==='node'?s.id:s.node;
    const edges=state.doc.edges.filter(e=>e.source===source&&(s.type!=='region'||e.region===s.id));
    html+='<hr><h2>从这里出发</h2>'+ (edges.map(e=>'<div class="relation"><button data-edge-select="'+esc(e.id)+'">'+esc(e.action||'查看连接')+' → '+esc(nodeById(e.target)?.name||'未命名')+'</button><div>'+esc(e.condition)+'</div></div>').join('')||'<p class="muted">还没有连接。</p>');
    if(s.type==='node'){
      const incoming=state.doc.edges.filter(e=>e.target===s.id);
      html+='<hr><h2>进入此界面的入口</h2>'+incoming.map(e=>'<div class="relation"><button data-edge-select="'+esc(e.id)+'">'+esc(nodeById(e.source)?.name||'未命名')+' → '+esc(e.action||'查看连接')+'</button></div>').join('');
    }
  }
  if(s&&!state.readOnly)html+='<div class="inspect-actions"><button id="delete-selected" class="danger">删除'+(s.type==='node'?'节点':s.type==='region'?'点击区':'连接')+'</button><button id="deselect">系统说明</button></div>';
  else if(s)html+='<hr><button id="deselect">系统说明</button>';
  const missing=gaps();
  html+='<hr><h2>整理提醒 · '+missing.length+'</h2><p class="muted">仅检查已录入内容，不阻止保存，也不能发现尚未录入的全部界面。</p>'+missing.map(m=>'<button class="gap" data-gap-node="'+m.node+'" data-gap-region="'+(m.region||'')+'">'+esc(m.label)+'</button>').join('');
  panel.innerHTML=html;
  panel.querySelectorAll('[data-field]').forEach(el=>{
    el.addEventListener('focus',()=>{if(!state.readOnly)checkpoint();},{once:true});
    el.addEventListener('input',()=>{if(state.readOnly||state.busy)return;selectedObject()[el.dataset.field]=el.value;dirty();canvas();renderSystems();});
  });
}
function select(selection){state.selected=selection;canvas();inspector();}
function focusNode(id,region){
  const n=nodeById(id);if(!n)return;const v=camera(),box=$('#viewport').getBoundingClientRect();
  v.zoom=Math.min(1,(box.height-70)/nodeHeight(n));v.zoom=Math.max(.05,v.zoom);v.x=box.width/2-(n.x+n.width/2)*v.zoom;v.y=box.height/2-(n.y+nodeHeight(n)/2)*v.zoom;
  select(region?{type:'region',id:region,node:id}:{type:'node',id});
}
function fit(){
  if(!state.doc?.nodes.length)return;
  const nodes=state.doc.nodes,box=$('#viewport').getBoundingClientRect(),minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y)),maxX=Math.max(...nodes.map(n=>n.x+n.width)),maxY=Math.max(...nodes.map(n=>n.y+nodeHeight(n)));
  const zoom=Math.max(.05,Math.min(1.4,(box.width-100)/(maxX-minX),(box.height-100)/(maxY-minY)));
  state.camera={zoom,x:box.width/2-(minX+maxX)/2*zoom,y:box.height/2-(minY+maxY)/2*zoom};transform();
}
function zoom(factor,x,y){
  if(!state.doc)return;const box=$('#viewport').getBoundingClientRect(),v=camera();
  x??=box.width/2;y??=box.height/2;const z=Math.max(.05,Math.min(3,v.zoom*factor)),ratio=z/v.zoom;
  v.x=x-(x-v.x)*ratio;v.y=y-(y-v.y)*ratio;v.zoom=z;transform();
}
function point(event){const b=$('#viewport').getBoundingClientRect(),v=camera();return {x:(event.clientX-b.left-v.x)/v.zoom,y:(event.clientY-b.top-v.y)/v.zoom};}
function imagePoint(n,p){return {x:Math.min(1,Math.max(0,(p.x-n.x)/n.width)),y:Math.min(1,Math.max(0,(p.y-n.y-HEADER)/(n.width*n.imageHeight/n.imageWidth)))};}
function addEdge(source,region,target){
  checkpoint();const e={id:uid(),source,region:region||null,target,action:'',condition:'',notes:''};state.doc.edges.push(e);state.mode='select';dirty();select({type:'edge',id:e.id});$('#inspector [data-field="action"]')?.focus();
}
function deleteSelected(){
  if(state.readOnly||state.busy||!state.selected)return;
  const s=state.selected;if(!confirm('删除所选'+(s.type==='node'?'节点及关联连线':s.type==='region'?'点击区及关联连线':'连线')+'？可以撤销。'))return;
  checkpoint();
  if(s.type==='node'){state.doc.nodes=state.doc.nodes.filter(n=>n.id!==s.id);state.doc.edges=state.doc.edges.filter(e=>e.source!==s.id&&e.target!==s.id);}
  else if(s.type==='region'){const n=nodeById(s.node);n.regions=n.regions.filter(r=>r.id!==s.id);state.doc.edges=state.doc.edges.filter(e=>e.region!==s.id);}
  else state.doc.edges=state.doc.edges.filter(e=>e.id!==s.id);
  state.selected=null;dirty();render();
}
function newPosition(){
  const nodes=state.doc.nodes;
  if(nodes.length)return {x:Math.max(...nodes.map(n=>n.x+n.width))+120,y:Math.min(...nodes.map(n=>n.y))};
  const b=$('#viewport').getBoundingClientRect(),v=camera();
  return {x:(b.width*.35-v.x)/v.zoom,y:(70-v.y)/v.zoom};
}
async function readFlowImage(file){
  if(!/^image\/(png|jpeg|webp)$/.test(file?.type||''))throw new Error('支持 PNG、JPG、WebP 截图。');
  if(file.size>12*1024*1024)throw new Error('单张截图不能超过 12MB。');
  const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('图片读取失败'));r.readAsDataURL(file);});
  const img=new Image();img.src=image;
  try{await img.decode();}catch{throw new Error('无法读取这张图片，请换一张有效的 PNG、JPG 或 WebP。');}
  return {image,imageWidth:img.naturalWidth,imageHeight:img.naturalHeight};
}
async function addImages(files){
  if(state.readOnly||state.busy)return;if(!state.doc){toast('请先新建或打开一个系统，再粘贴截图。');return;}
  const targetId=state.doc.id;
  reading.setView('canvas');
  for(const file of files){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){toast('支持 PNG、JPG、WebP 截图。');continue;}
    if(file.size>12*1024*1024){toast('单张截图不能超过 12MB。');continue;}
    const picture=await readFlowImage(file);
    if(state.doc?.id!==targetId || state.busy){toast('系统已切换，请在当前系统重新粘贴。');return;}
    checkpoint();const n={id:uid(),name:'',kind:'screen',...newPosition(),width:300,...picture,notes:'',regions:[]};
    state.doc.nodes.push(n);state.selected={type:'node',id:n.id};dirty();render();focusNode(n.id);$('#inspector [data-field="name"]')?.focus();
  }
}
function showImage(n){
  if(!n?.image)return;$('#image-title').textContent=n.name||'未命名截图';$('#full-image').src=n.image;$('#image-dialog').showModal();fitImage();
}
function fitImage(){const el=$('#full-image'),box=$('.image-scroll');el.style.width=Math.min(el.naturalWidth||1000,box.clientWidth-20)+'px';}
function exportJson(){
  if(!state.doc)return;
  const blob=new Blob([JSON.stringify(state.doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=state.doc.name.replace(/[\\/:*?"<>|]/g,'-')+'-界面流程.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function pointerDown(e){
  if(!state.doc||state.busy||e.button!==0)return;
  const viewport=$('#viewport'),p=point(e),nodeEl=e.target.closest('[data-node]'),n=nodeById(nodeEl?.dataset.node),regionEl=e.target.closest('[data-region]'),r=regionById(n,regionEl?.dataset.region),connector=e.target.closest('[data-connect]');
  if(state.space||state.mode==='pan'||!nodeEl&&!e.target.closest('[data-edge]')){
    state.gesture={kind:'pan',clientX:e.clientX,clientY:e.clientY,viewport:{...camera()}};if(!state.space&&state.mode!=='pan')select(null);
  }else if(e.target.closest('[data-edge]')){select({type:'edge',id:e.target.closest('[data-edge]').dataset.edge});return;}
  else if(!state.readOnly&&connector){state.gesture={kind:'connect',node:n.id,region:connector.dataset.connect||null,anchor:anchor(n,r),end:p};}
  else if(!state.readOnly&&state.mode==='region'&&n.image&&e.target.closest('.shot')){
    checkpoint();const start=imagePoint(n,p);state.gesture={kind:'draw',node:n.id,start,rect:{...start,width:0,height:0}};
  }else if(r){
    select({type:'region',node:n.id,id:r.id});if(!state.readOnly){checkpoint();state.gesture={kind:e.target.closest('.region-resize')?'region-resize':'region-move',node:n.id,region:r.id,start:p,original:{...r}};}
  }else{
    select({type:'node',id:n.id});
    if(!state.readOnly&&e.target.closest('.resize')){checkpoint();state.gesture={kind:'resize',node:n.id,start:p,width:n.width};}
    else if(!state.readOnly&&e.target.closest('.node-head')){checkpoint();state.gesture={kind:'move',node:n.id,start:p,x:n.x,y:n.y};}
    else return;
  }
  viewport.setPointerCapture(e.pointerId);e.preventDefault();canvas();
}
function pointerMove(e){
  const g=state.gesture;if(!g)return;const p=point(e),n=nodeById(g.node);
  if(g.kind==='pan'){camera().x=g.viewport.x+e.clientX-g.clientX;camera().y=g.viewport.y+e.clientY-g.clientY;transform();return;}
  if(g.kind==='connect')g.end=p;
  else if(g.kind==='move'){n.x=g.x+p.x-g.start.x;n.y=g.y+p.y-g.start.y;}
  else if(g.kind==='resize')n.width=Math.min(2400,Math.max(140,g.width+p.x-g.start.x));
  else if(g.kind==='draw'){const end=imagePoint(n,p);g.rect={x:Math.min(g.start.x,end.x),y:Math.min(g.start.y,end.y),width:Math.abs(end.x-g.start.x),height:Math.abs(end.y-g.start.y)};}
  else{
    const r=regionById(n,g.region),o=g.original,dx=(p.x-g.start.x)/n.width,dy=(p.y-g.start.y)/(n.width*n.imageHeight/n.imageWidth);
    if(g.kind==='region-move'){r.x=Math.max(0,Math.min(1-o.width,o.x+dx));r.y=Math.max(0,Math.min(1-o.height,o.y+dy));}
    else{r.width=Math.max(.01,Math.min(1-o.x,o.width+dx));r.height=Math.max(.01,Math.min(1-o.y,o.height+dy));}
  }
  canvas();
}
function pointerUp(e){
  const g=state.gesture;if(!g)return;
  if($('#viewport').hasPointerCapture(e.pointerId))$('#viewport').releasePointerCapture(e.pointerId);
  state.gesture=null;
  if(g.kind==='connect'){
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node;
    if(target){addEdge(g.node,g.region,target);return;}toast('把连线拖到目标截图或文字节点上。');
  }else if(g.kind==='draw'&&g.rect.width>.008&&g.rect.height>.008){
    const n=nodeById(g.node),r={id:uid(),name:'点击区 '+(n.regions.length+1),...g.rect,notes:''};n.regions.push(r);state.selected={type:'region',id:r.id,node:n.id};state.mode='select';dirty();
  }else if(!state.readOnly&&g.kind!=='pan')dirty();
  render();
}
function bind(){
  $('#catalog-back').onclick=openCatalog;
  $('#new-system').onclick=()=>{if(!state.readOnly&&!state.busy){$('#system-name').value='';$('#system-version').value='0.1';$('#new-dialog').showModal();$('#system-name').focus();}};
  $('#cancel-new').onclick=()=>$('#new-dialog').close();
  $('#new-form').onsubmit=async e=>{e.preventDefault();if(state.readOnly||!canLeave())return;const label=$('#system-name').value.trim(),version=$('#system-version').value;if(!label)return;const name=version?label.replace(/\s*[（(]v?0\.[123][）)]\s*$/i,'').slice(0,114)+'（'+version+'）':label;state.doc={schemaVersion:1,id:uid(),name,notes:'',nodes:[],edges:[],viewport:{x:40,y:40,zoom:1}};state.revision=null;state.selected=null;state.undo=[];state.redo=[];state.dirty=true;history.replaceState(null,'','flow.html?mode=edit&system='+state.doc.id);$('#new-dialog').close();render();await save();};
  $('#save').onclick=save;$('#publish').onclick=publish;$('#export').onclick=exportJson;
  $('#add-image').onclick=()=>{if(!reading?.pickWallImages())$('#image-files').click();};
  $('#image-files').onchange=async e=>{try{await addImages([...e.target.files]);}catch(err){toast(err.message);}e.target.value='';};
  $('#add-text').onclick=()=>{if(!state.doc||state.readOnly||state.busy)return;checkpoint();const n={id:uid(),name:'',kind:'text',...newPosition(),width:270,notes:'',image:'',imageWidth:0,imageHeight:0,regions:[]};state.doc.nodes.push(n);dirty();render();reading.open(n.id);[...document.querySelectorAll('[data-board-node]')].find(el=>el.dataset.boardNode===n.id)?.querySelector('[data-wall-field="name"]')?.focus();};
  $('#mark').onclick=()=>{state.mode=state.mode==='region'?'select':'region';toolbar();if(state.mode==='region')toast('在截图内按住鼠标拖出矩形点击区。');};
  $('#pan').onclick=()=>{state.mode=state.mode==='pan'?'select':'pan';toolbar();};
  $('#fit').onclick=fit;$('#zoom-in').onclick=()=>zoom(1.2);$('#zoom-out').onclick=()=>zoom(1/1.2);
  const undo=redo=>{if(state.readOnly||state.busy)return;const from=redo?state.redo:state.undo,to=redo?state.undo:state.redo;if(!from.length)return;to.push(clone(state.doc));state.doc=from.pop();state.selected=null;dirty();render();};
  $('#undo').onclick=()=>undo(false);$('#redo').onclick=()=>undo(true);
  $('#flow-app').addEventListener('click',async e=>{
    const t=e.target.closest('button');if(!t||state.busy)return;
    try{
      if(t.id==='catalog-new')$('#new-system').click();
      if(t.id==='catalog-refresh')await listSystems();
      if(t.dataset.system)await openSystem(t.dataset.system);
      if(t.dataset.focus){if(state.viewMode==='canvas')focusNode(t.dataset.focus);else reading.open(t.dataset.focus);}
      if(t.dataset.jump)focusNode(t.dataset.jump);
      if(t.dataset.edgeSelect)select({type:'edge',id:t.dataset.edgeSelect});
      if(t.dataset.gapNode)focusNode(t.dataset.gapNode,t.dataset.gapRegion);
      if(t.id==='deselect')select(null);
      if(t.id==='delete-selected')deleteSelected();
      if(t.id==='inspect-image')showImage(nodeById(state.selected?.id));
      if(t.id==='connect-selected'&&!state.readOnly){const target=$('#target-choice').value;if(!target)return toast('请先选择目标。');const s=state.selected;addEdge(s.type==='node'?s.id:s.node,s.type==='region'?s.id:null,target);}
    }catch(err){toast(err.message);}
  });
  $('#viewport').addEventListener('pointerdown',pointerDown);
  $('#viewport').addEventListener('pointermove',pointerMove);
  $('#viewport').addEventListener('pointerup',pointerUp);
  $('#viewport').addEventListener('pointercancel',()=>{state.gesture=null;canvas();});
  $('#viewport').addEventListener('dblclick',e=>showImage(nodeById(e.target.closest('[data-node]')?.dataset.node)));
  $('#viewport').addEventListener('wheel',e=>{if(!state.doc||state.busy)return;e.preventDefault();const b=$('#viewport').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.001),e.clientX-b.left,e.clientY-b.top);},{passive:false});
  $('#viewport').addEventListener('dragover',e=>e.preventDefault());
  $('#viewport').addEventListener('drop',e=>{e.preventDefault();addImages([...e.dataTransfer.files]).catch(err=>toast(err.message));});
  document.addEventListener('paste',e=>{
    if(state.readOnly)return;
    if(reading?.handleWallPaste(e))return;
    const files=[...(e.clipboardData?.items||[])].filter(item=>item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
    if(files.length){e.preventDefault();addImages(files).catch(err=>toast(err.message));}
  });
  document.addEventListener('keydown',e=>{
    if(state.busy)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();return;}
    if(isTextInput(e.target)||$('dialog[open]'))return;
    if(e.code==='Space'){e.preventDefault();state.space=true;}
    if(e.key==='Escape'){state.gesture=null;state.mode='select';select(null);}
    if(state.viewMode==='canvas'&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();deleteSelected();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space')state.space=false;});
  window.addEventListener('blur',()=>state.space=false);
  window.addEventListener('beforeunload',e=>{if(state.dirty&&!state.readOnly){e.preventDefault();e.returnValue='';}});
  $('#image-close').onclick=()=>$('#image-dialog').close();$('#image-fit').onclick=fitImage;
  $('#image-actual').onclick=()=>$('#full-image').style.width=$('#full-image').naturalWidth+'px';
  $('#full-image').onload=fitImage;
}
async function boot(){
  try{
    const params=new URLSearchParams(location.search),probe=await api('/api/flows/published');
    state.readOnly=probe.readOnly||params.get('mode')==='reader';
    shell();await listSystems();
    const id=params.get('system');
    if(id){
      try{await openSystem(id);}catch(error){toast(error.status===404?(state.readOnly?'此系统尚未发布，请从总览选择已发布系统。':'未找到此系统，请从总览选择。'):error.message);}
    }
  }catch(e){$('#flow-app').innerHTML='<div class="flow-error"><h2>流程图暂时无法载入</h2><p>'+esc(e.message)+'</p><button onclick="location.reload()">重新载入</button></div>';}
}
boot();
import { createReadingView } from './interface-flow-reading.js';
import { flowV01Systems } from './checkpoints-board.js';

