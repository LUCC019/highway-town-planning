// Presentation-only catalog; never seeds or overwrites saved system documents.
export const flowV01Systems = [
  {id:'main-town',name:'主城'}, {id:'protagonists',name:'主角身份'},
  {id:'checkpoints',name:'关卡 / 市场调研'}, {id:'car-wash',name:'洗车行'},
  {id:'convenience-store',name:'便利店'}, {id:'talent-system',name:'人才'}
];
export const flowVersion = doc => flowV01Systems.some(s=>s.id===doc?.id)?'0.1':
  (String(doc?.name||'').match(/(?:^|[（(\s])v?(0\.[12])(?:[）)\s]|$)/i)?.[1]||'未分组');
export const isCheckpointPilot = state => Boolean(state.doc);
const order=['main','result','boss','battle','win','lose','strong_tip','weak_tip',
  'onekey_setup','onekey_active','onekey_summary','auto_active','entry','chat','currency',
  'talent','recruit','partner','gator'];
const kinds={screen:'界面',tab:'页签',popup:'弹窗',state:'状态',text:'文字节点'};

export function createCheckpointBoard({state,main,escapeHtml:e,showImage,editor,updateDirectory}) {
  const css=document.createElement('link');
  css.rel='stylesheet';css.href=new URL('./checkpoints-board.css',import.meta.url).href;
  document.head.append(css);
  const picker=document.createElement('input');
  picker.type='file';picker.accept='image/png,image/jpeg,image/webp';picker.hidden=true;
  picker.id='checkpoint-wall-file';picker.disabled=state.readOnly;document.body.append(picker);
  const active=()=>isCheckpointPilot(state)&&state.viewMode==='board';
  const editable=()=>active()&&!state.readOnly;
  const node=id=>state.doc?.nodes.find(n=>n.id===id);
  const rank=id=>order.includes(id)?order.indexOf(id):order.length;
  const textInput=el=>Boolean(el?.closest?.('input,textarea,[contenteditable]'));
  let ticket=null,loading=false,editSession=null;
  // Display-only cache: saved documents keep their original, lossless data URLs.
  const imageUrls=new Map();
  function displayImage(source){
    if(!/^data:image\/(?:png|jpeg|webp);base64,/.test(source))return source;
    if(imageUrls.has(source))return imageUrls.get(source);
    try{
      const comma=source.indexOf(','),binary=atob(source.slice(comma+1));
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:source.slice(5,source.indexOf(';'))}));
      imageUrls.set(source,url);return url;
    }catch{return source;}
  }
  function status(message){
    const el=main.querySelector('.cp-wall-status');if(el)el.textContent=message;
  }
  function pasteStatus(id){
    status(id?'已选中「'+(node(id)?.name||'未命名界面')+'」：Ctrl+V 贴图到此处':'空白处 Ctrl+V 新增；选中图框后 Ctrl+V 换图');
  }
  function item(n){
    const image=displayImage(n.image||'');
    if(state.readOnly)return '<figure class="cp-wall-item" data-board-node="'+e(n.id)+'" tabindex="-1"><h3>'+e(n.name||'未命名界面')+'</h3><p class="cp-wall-read-note">'+e(n.notes)+'</p>'+(n.image?'<button class="cp-wall-image" data-board-image="'+e(n.id)+'" aria-label="放大 '+e(n.name)+'"><img src="'+e(image)+'" alt="'+e(n.name)+'" width="'+n.imageWidth+'" height="'+n.imageHeight+'"></button>':'<div class="cp-wall-placeholder">暂无截图</div>')+'</figure>';
    return '<figure class="cp-wall-item" data-board-node="'+e(n.id)+'" tabindex="-1">'+
      '<textarea class="cp-wall-name" data-wall-field="name" rows="2" maxlength="200" aria-label="图名：'+e(n.name)+'" placeholder="点击填写图名"></textarea>'+
      '<textarea class="cp-wall-note" data-wall-field="notes" rows="2" maxlength="12000" aria-label="简短说明：'+e(n.name)+'" placeholder="点击填写简短说明（可选）"></textarea>'+
      '<div class="cp-wall-zone" data-wall-zone="'+e(n.id)+'" tabindex="0" aria-label="给 '+e(n.name)+' 粘贴或拖入截图">'+
      (n.image?'<button class="cp-wall-image" data-board-image="'+e(n.id)+'" aria-label="放大 '+e(n.name)+'"><img src="'+e(image)+'" alt="'+e(n.name)+'" width="'+n.imageWidth+'" height="'+n.imageHeight+'" draggable="false"></button>':
      '<div class="cp-wall-placeholder">'+e(kinds[n.kind]||'节点')+' · 暂无截图<br><small>点击后 Ctrl+V，或拖入图片</small></div>')+
      '<div class="cp-wall-image-tools"><button data-wall-pick="'+e(n.id)+'">'+(n.image?'更换图片':'添加图片')+'</button><button data-wall-paste-target="'+e(n.id)+'">粘贴到此处</button>'+
      (n.image?'<button data-wall-remove="'+e(n.id)+'" class="danger">移除图片</button>':'')+'</div></div></figure>';
  }
  function render(){
    if(!active())return;
    const scroll=main.scrollTop;editSession=null;
    const nodes=[...state.doc.nodes];
    const liveImages=new Set(nodes.map(n=>n.image));
    for(const [source,url] of imageUrls)if(!liveImages.has(source)){
      URL.revokeObjectURL(url);imageUrls.delete(source);
    }
    if(state.doc.id==='checkpoints')nodes.sort((a,b)=>rank(a.id)-rank(b.id));
    const pictures=nodes.filter(n=>n.image),text=nodes.filter(n=>!n.image);
    main.innerHTML='<section class="cp-wall" aria-label="'+e(state.doc.name)+'截图总览" data-loading="'+loading+'">'+
      '<div class="cp-wall-caption"><span>'+pictures.length+' 张截图 · '+(state.readOnly?'已发布内容 · 点击图片放大':'点击图名 / 说明直接修改')+'</span>'+(!state.readOnly?'<span>PNG / JPG / WebP · 单张 ≤ 12MB</span>':'')+'</div>'+
      (!state.readOnly?'<p class="cp-wall-status" role="status">空白处 Ctrl+V 新增；选中图框后 Ctrl+V 换图</p>':'')+
      '<div class="cp-wall-grid">'+pictures.map(item).join('')+
      (!state.readOnly?'<div class="cp-wall-add-zone" data-wall-add-zone tabindex="0" aria-label="粘贴或拖入新截图"><strong>＋ 新增截图</strong><button data-wall-add>选择图片</button><span>点击空白后 Ctrl+V，或拖入图片</span></div>':'')+'</div>'+
      (text.length?'<section class="cp-wall-text"><h2>文字 / 待补截图（名称与关联保留）</h2><div class="cp-wall-placeholders">'+text.map(item).join('')+'</div></section>':'')+'</section>';
    // Assign values directly so intentional leading newlines and empty text survive.
    main.querySelectorAll('[data-wall-field]').forEach(el=>{el.value=node(el.closest('[data-board-node]').dataset.boardNode)[el.dataset.wallField]||'';});
    main.scrollTop=scroll;
  }
  function focus(id){
    const card=[...main.querySelectorAll('[data-board-node]')].find(el=>el.dataset.boardNode===id);
    if(!card)return;
    main.scrollTo({top:main.scrollTop+card.getBoundingClientRect().top-main.getBoundingClientRect().top-18,behavior:'instant'});
    (card.querySelector('[data-wall-zone]')||card).focus({preventScroll:true});if(!state.readOnly)pasteStatus(id);
  }
  function pick(target=null){
    if(!editable()||state.busy||loading)return;
    ticket={doc:state.doc,target};picker.multiple=!target;picker.value='';picker.click();
  }
  function pickNew(){if(!editable())return false;pick();return true;}
  async function applyImages(files,target=null,expectedDoc=state.doc){
    if(!editable()||state.busy||loading||state.doc!==expectedDoc||!files.length)return;
    if(target&&files.length!==1){editor.toast('替换图片请一次只选一张。');return;}
    if(!target&&expectedDoc.nodes.length+files.length>300){editor.toast('单个系统最多 300 个节点。');return;}
    const original=node(target),originalImage=original?.image;
    if(target&&!original)return;
    loading=true;main.querySelector('.cp-wall')?.setAttribute('data-loading','true');status('正在读取截图…');
    try{
      const pictures=[];
      for(const file of files)pictures.push(await editor.readImage(file));
      if(!active()||state.busy||state.doc!==expectedDoc||target&&(!node(target)||node(target)!==original||node(target).image!==originalImage)){
        editor.toast('系统或内容已变化，本次贴图未应用，请重新选择。');return;
      }
      editor.checkpoint();let focusId=target;
      if(target){
        // Preserve name, notes, kind, coordinates, click regions and every edge.
        Object.assign(node(target),pictures[0]);
      }else{
        pictures.forEach((picture,index)=>{
          const name=(files[index].name||'新界面').replace(/\.[^.]+$/,'').slice(0,200)||'新界面';
          const n={id:crypto.randomUUID(),name,kind:'screen',...editor.position(),width:300,...picture,notes:'',regions:[]};
          state.doc.nodes.push(n);focusId=n.id;
        });
      }
      loading=false;editor.changed();editor.refresh();focus(focusId);
      editor.toast(target?'图片已更新，名称与关联保留；请保存草稿。':'截图已新增，可直接修改图名和说明，再保存草稿。');
    }catch(error){editor.toast(error.message||'图片读取失败');}
    finally{
      loading=false;main.querySelector('.cp-wall')?.setAttribute('data-loading','false');
      if(main.querySelector('.cp-wall-status')?.textContent==='正在读取截图…')pasteStatus(document.activeElement?.closest?.('[data-wall-zone]')?.dataset.wallZone);
    }
  }
  function removeImage(id){
    if(!editable()||state.busy||loading)return;
    const n=node(id);if(!n?.image)return;
    if(!confirm('只移除「'+(n.name||'未命名界面')+'」的图片？图名、说明、点击区域和关联全部保留，可撤销。'))return;
    editor.checkpoint();
    n.image='';n.imageWidth=0;n.imageHeight=0;
    editor.changed();editor.refresh();focus(id);
    editor.toast('仅移除了图片；节点与关联已保留在待补图片区，可撤销。');
  }
  function paste(event){
    if(!editable())return false;
    // Let native text paste run; never turn text-field pastes into new screenshots.
    if(textInput(event.target))return true;
    const files=[...(event.clipboardData?.items||[])].filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);
    if(!files.length)return true;
    event.preventDefault();
    if(document.querySelector('dialog[open]'))return true;
    const target=event.target.closest?.('[data-wall-zone]')?.dataset.wallZone||null;
    void applyImages(files,target);return true;
  }
  picker.addEventListener('change',()=>{
    const current=ticket,files=[...picker.files];ticket=null;picker.value='';
    if(current)void applyImages(files,current.target,current.doc);
  });
  picker.addEventListener('cancel',()=>{ticket=null;});
  main.addEventListener('focusin',event=>{
    if(!editable())return;
    if(event.target.matches('[data-wall-field]')){
      editSession=null;status('正在编辑文字 · Ctrl+V 粘贴文字，修改后保存草稿');
    }else pasteStatus(event.target.closest('[data-wall-zone]')?.dataset.wallZone);
  });
  main.addEventListener('beforeinput',event=>{
    if(editable()&&state.busy&&event.target.matches('[data-wall-field]'))event.preventDefault();
  });
  main.addEventListener('input',event=>{
    const el=event.target;
    if(!editable()||!el.matches('[data-wall-field]'))return;
    const n=node(el.closest('[data-board-node]').dataset.boardNode),field=el.dataset.wallField;
    if(state.busy){el.value=n[field]||'';return;}
    if(n[field]===el.value)return;
    if(!editSession||editSession.el!==el||editSession.doc!==state.doc||editSession.revision!==state.revision){
      editor.checkpoint();editSession={el,doc:state.doc,revision:state.revision};
    }
    n[field]=el.value;editor.changed();updateDirectory();
  });
  main.addEventListener('click',event=>{
    if(!active()||state.busy)return;
    const button=event.target.closest('button');
    if(button?.dataset.boardImage)showImage(node(button.dataset.boardImage));
    if(state.readOnly)return;
    if(button?.dataset.wallPick)pick(button.dataset.wallPick);
    if(button?.dataset.wallRemove)removeImage(button.dataset.wallRemove);
    if(button?.dataset.wallPasteTarget){
      const zone=button.closest('[data-wall-zone]');zone.focus();pasteStatus(zone.dataset.wallZone);
    }
    if(button?.hasAttribute('data-wall-add'))pick();
    if(!button&&!textInput(event.target)){
      const zone=event.target.closest('[data-wall-zone],[data-wall-add-zone]');if(zone)zone.focus();
    }
  });
  main.addEventListener('dragover',event=>{
    if(!editable()||![...(event.dataTransfer?.types||[])].includes('Files'))return;
    event.preventDefault();event.dataTransfer.dropEffect='copy';
    main.querySelectorAll('.cp-wall-dragging').forEach(el=>el.classList.remove('cp-wall-dragging'));
    event.target.closest('[data-wall-zone],[data-wall-add-zone]')?.classList.add('cp-wall-dragging');
  });
  main.addEventListener('dragleave',event=>{event.target.closest?.('.cp-wall-dragging')?.classList.remove('cp-wall-dragging');});
  main.addEventListener('drop',event=>{
    if(!editable()||!event.dataTransfer?.files.length)return;
    event.preventDefault();main.querySelectorAll('.cp-wall-dragging').forEach(el=>el.classList.remove('cp-wall-dragging'));
    if(textInput(event.target)){editor.toast('请把图片拖入图框或新增截图区域。');return;}
    const target=event.target.closest('[data-wall-zone]')?.dataset.wallZone||null;
    void applyImages([...event.dataTransfer.files],target);
  });
  return {render,focus,pickNew,paste};
}
