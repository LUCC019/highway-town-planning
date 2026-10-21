import {createCheckpointBoard,flowV01Systems,flowVersion} from './checkpoints-board.js';
// Only the system catalog and screenshot wall are exposed; saved legacy geometry stays intact.
export function createReadingView({state,escapeHtml:e,showImage,editor}) {
  const $=s=>document.querySelector(s);
  const kinds={screen:'整页',tab:'分页',popup:'弹窗',state:'状态图',text:'文字 / tips'};
  const main=$('#flow-reading');
  let documentId=null;
  const board=createCheckpointBoard({state,main,escapeHtml:e,showImage,editor,updateDirectory:directory});
  function directory(){
    const list=$('#node-list');
    if(!state.doc){list.innerHTML='';return;}
    list.innerHTML=Object.entries(kinds).map(([kind,title])=>{
      const nodes=state.doc.nodes.filter(n=>n.kind===kind);if(!nodes.length)return '';
      return '<details class="read-directory-group" open><summary>'+title+' <small>'+nodes.length+'</small></summary>'+nodes.map(n=>'<button class="node-link" data-focus="'+e(n.id)+'">'+e(n.name||'未命名节点')+'</button>').join('')+'</details>';
    }).join('');
  }
  function catalog(){
    const known=new Map(state.systems.map(s=>[s.id,s]));
    const cards=flowV01Systems.map(s=>({...s,...known.get(s.id),available:known.has(s.id)}));
    cards.push(...state.systems.filter(s=>!flowV01Systems.some(k=>k.id===s.id)).map(s=>({...s,available:true})));
    const groups=['0.1','0.2',...(cards.some(s=>flowVersion(s)==='未分组')?['未分组']:[])];
    return '<section class="flow-catalog"><header><div><p class="read-eyebrow">界面流程图</p><h2>按版本找到系统</h2><p>'+ (state.readOnly?'仅展示已发布的系统内容。':'先选系统，再整理截图、图名和说明。保存草稿不会自动发布。')+'</p></div><div class="catalog-actions"><button id="catalog-refresh">刷新系统列表</button>'+(!state.readOnly?'<button id="catalog-new" class="primary">＋ 新建系统</button>':'')+'</div></header>'+groups.map(version=>{
      const list=cards.filter(s=>flowVersion(s)===version);
      return '<section class="catalog-group" data-version="'+e(version)+'"><h3>'+(version==='未分组'?'未分组':'版本 '+version)+'</h3><div class="catalog-grid">'+list.map(s=>{
        const disabled=state.readOnly&&!s.available;
        return '<button class="catalog-card" data-system="'+e(s.id)+'"'+(disabled?' disabled':'')+'><h4>'+e(s.name)+'</h4><p>'+(!s.available?(state.readOnly?'尚未发布':'尚未整理 · 点击开始'):(s.nodes+' 个节点 · '+(state.readOnly?'已发布':'已保存草稿')))+'</p><span>'+(disabled?'等待发布':'进入系统 →')+'</span></button>';
      }).join('')+'</div>'+(!list.length?'<p class="catalog-empty">'+(version==='0.2'?(state.readOnly?'本版本暂无已发布内容。':'本版本暂未开始整理。'):'暂无系统。')+'</p>':'')+'</section>';
    }).join('')+'</section>';
  }
  function sync(){
    const catalogView=!state.doc;
    state.viewMode=catalogView?'catalog':'board';
    $('.flow-shell').dataset.view=state.viewMode;
    $('.flow-tools').hidden=catalogView||state.readOnly;
    $('.systems').hidden=catalogView;
    $('#catalog-back').hidden=catalogView;
    for(const id of ['save','publish','export'])$('#'+id).hidden=catalogView||state.readOnly&&id!=='export';
    main.hidden=false;
    $('#viewport').hidden=true;$('#inspector').hidden=true;
    for(const id of ['mark','pan','fit','zoom-out','zoom-in','zoom-value'])$('#'+id).hidden=true;
    $('.flow-tools .hint').textContent='改字 / 贴图后保存草稿';
  }
  function render(){
    if(state.doc?.id!==documentId){documentId=state.doc?.id;main.scrollTop=0;}
    sync();directory();
    if(!state.doc){main.innerHTML=catalog();return;}
    board.render();
  }
  function open(id){if(state.doc?.nodes.some(n=>n.id===id))board.focus(id);}
  // Existing callers cannot switch back into the retired canvas UI.
  function setView(){sync();}
  return {render,sync,open,setView,pickWallImages:board.pickNew,handleWallPaste:board.paste};
}
