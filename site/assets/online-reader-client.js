export const onlineReaderRoot = 'https://lucc019.github.io/highway-town-planning/';
export const onlineReaderPage = page => onlineReaderRoot+'reader.html'+(page?'?page='+encodeURIComponent(page):'');
let host=null,timer=null,inflight=false,generation=0;
async function endpoint(path,method='GET'){
  const response=await fetch('/api/online-reader/'+path,{method,cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),...(method==='POST'?{body:'{}'}:{})});
  const result=await response.json();if(!response.ok)throw Error(result.message||'在线同步暂不可用');return result;
}
function display(status){
  if(!host)return;
  host.dataset.onlinePhase=status.phase;
  const quiet=status.phase==='idle'||status.phase==='succeeded';
  host.querySelector('[data-online-status-content]').hidden=quiet;
  host.querySelector('[data-online-message]').textContent=quiet?'':status.message;
  host.querySelector('[data-online-retry]').hidden=status.phase!=='failed';
}
async function poll(){
  if(inflight){clearTimeout(timer);timer=setTimeout(poll,500);return;}inflight=true;const currentGeneration=generation;
  let busy=false;
  try{const status=await endpoint('status');busy=status.busy;if(currentGeneration===generation)display(status);}
  catch{if(currentGeneration===generation)display({phase:'unavailable',message:'在线状态暂不可用，已上线内容仍可阅读'});}
  finally{inflight=false;if(currentGeneration===generation){clearTimeout(timer);timer=setTimeout(poll,busy?1500:10000);}}
}
export function mountOnlineReaderStatus(container){
  if(!container)return;
  host=container;host.style.cssText+=';font-size:12px;';
  host.innerHTML='<span data-online-status-content hidden><span data-online-message role="status" aria-live="polite"></span><button type="button" data-online-retry hidden style="font-size:12px;padding:3px 7px;margin-left:8px">重试同步</button></span>';
  host.querySelector('[data-online-retry]').addEventListener('click',()=>void startOnlineReaderSync().catch(()=>{}));
  void poll();
}
export async function startOnlineReaderSync(){
  generation++;clearTimeout(timer);
  display({phase:'queued',message:'本地已发布，正在启动在线同步'});
  try{const status=await endpoint('sync','POST');display(status);clearTimeout(timer);timer=setTimeout(poll,500);return status;}
  catch(error){display({phase:'failed',message:'本地已发布，在线同步未启动；可重试'});throw error;}
}
