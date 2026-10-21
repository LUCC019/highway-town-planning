import {renderOilMinigame as previousRender} from './gas-oil-readable-planning.js?v=20261013-v5';
import {escapeHtml as esc} from './site.js?v=20260923-7';
function table(heads,rows,widths){return '<div class="shop-table-scroll"><table class="shop-business-table oil-config-table"><colgroup>'+widths.map(w=>'<col style="width:'+w+'%">').join('')+'</colgroup><thead><tr>'+heads.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
export function renderOilMinigame(markdown,design){
 if(!design?.experience_revision)return previousRender(markdown,design);
 const doc=new DOMParser().parseFromString(previousRender(markdown,design),'text/html'),article=doc.querySelector('.oil-minigame-document'),sections=[...article.querySelectorAll(':scope > section')],section=n=>sections.find(s=>s.querySelector(':scope > h2')?.textContent.startsWith(n+'.'));
 const field=section(4);[...field.querySelectorAll('tbody tr')].find(tr=>tr.children[0]?.textContent==='board_ids').children[2].textContent='填写这个挑战包含的棋盘编号，按游玩顺序组成数组。普通、破局只填1个；连续只能填3个或5个。本版第6个挑战填[6,7,8]，依次游玩6、7、8号棋盘。这里是棋盘ID，不是挑战ID，顺序不可随机打乱。';
 const five=section(5);five.querySelectorAll(':scope > p')[0].textContent='本版保持20张固定棋盘、14个挑战入口、最高42星。第6个挑战提前开放3连，包含6、7、8号棋盘；第14个挑战为5连，包含16～20号棋盘。其余挑战各包含一张棋盘，连续子盘不再额外算奖励关。';
 five.querySelectorAll(':scope > p')[1].textContent='本轮按实机反馈调整：前4关增加实际补滴、引爆和回收过程，参考流程分别6、7、8、9次点击；后段普通关参考流程9～13次。三星门槛基于多条有效路线的余量留出容错，不要求参考解或全局最优。搜索样本用于证明多解成立，不代表已经枚举全部解法。';
 const six=section(6),extra=doc.createElement('div'),exported={version:design.version,rules:design.rules,challenges:design.challenges.map(({verification,complete_route_examples,...c})=>c),boards:design.boards.map(b=>({board_id:b.board_id,width:b.width,height:b.height,drops:b.drops}))};extra.className='oil-config-download';extra.style.marginTop='14px';const link=doc.createElement('a');link.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(exported,null,2));link.download='gas-oil-config-v6.json';link.textContent='下载本轮挑战表＋棋盘表配置';extra.append(link,doc.createTextNode(' · ID调整与程序交接见第9节。'));six.append(extra);
 article.querySelectorAll('.oil-board-card').forEach((card,i)=>{
  const b=design.boards[i],c=design.challenges.find(c=>c.board_ids.includes(b.board_id));
  const grade=card.querySelector('.oil-board-layout table.oil-config-table');if(grade){['油滴大小\ndrop_type','大小','格子编号\ncell_id'].forEach((label,j)=>grade.querySelectorAll('thead th')[j].textContent=label);[25,15,60].forEach((w,j)=>grade.querySelectorAll('col')[j].style.width=w+'%');}
  if(c.type!==2){const label=doc.createElement('h4');label.textContent='多种三星方案（不同点击位置，不只换先后）';card.append(label);card.insertAdjacentHTML('beforeend',table(['方案与首个引爆点','点击格号','点击次数','清盘余量'],b.multi_star_examples.map((v,j)=>['方案'+String.fromCharCode(65+j)+'；首爆'+v.first_burst_cell+'号',v.clicks.join(' → '),v.actions,v.remaining+'滴'],),[22,54,10,14]));
  const note=doc.createElement('p');note.textContent='本轮采样验算到'+b.solution_audit.unique_three_star_click_multisets+'种三星点击位置组合；按每格点击次数去重，不把同一组操作简单换序算成不同策略。这是已验证样本，不是全盘所有解法数量或最优解证明。';card.append(note);
  if(b.board_id<=4){const check=doc.createElement('p');check.textContent='另已穷举包括空格在内的四次及以下点击，没有清盘解；本版不是只增加进场油滴。参考流程为'+b.reference_clicks.length+'次，玩家仍可寻找其他合法方案。';card.append(check);}
 }});
 const continuous=doc.createElement('section');continuous.className='retail-document-section';continuous.innerHTML='<h2>9. 连续三星方案与程序交接</h2><p>连续关三星只看是否完成整组，不指定点击路线；以下每个方案都从整组第一盘开始、携带余量、不额外补满，完整复验通过。</p>';
 for(const c of design.challenges.filter(c=>c.type===2)){continuous.insertAdjacentHTML('beforeend','<h3>挑战'+c.challenge_id+'：'+c.board_ids.length+'连，初始'+c.initial_drops+'滴</h3>'+table(['方案','各盘点击顺序与余量','整组点击次数'],c.complete_route_examples.map((x,i)=>['方案'+String.fromCharCode(65+i),x.stages.map(s=>'棋盘'+s.board_id+'：'+s.clicks.join(' → ')+'；进入'+s.entering_drops+'滴，清盘剩'+s.remaining+'滴').join('\n'),x.total_actions]),[10,76,14]));}
 continuous.insertAdjacentHTML('beforeend','<h3>旧ID→新ID对照</h3>'+table(['记录类型','旧ID','新ID'],[...Object.entries(design.id_changes.boards).map(([a,b])=>['棋盘',a,b]),...Object.entries(design.id_changes.challenges).map(([a,b])=>['挑战',a,b])],[40,30,30])+'<p>未列出的ID保持不变。3连从旧挑战10移到新挑战6；旧6～8号普通棋盘移到新10～12号，并按本轮反馈重做。5连仍为挑战14，棋盘16～20。</p><p>本次是策划配置修订，没有直接更新已接入的客户端。程序需重新导入配置，并检查旧成绩、星级、奖励领取、解锁前置和入口编号的关联；若已有记录，按上表确定迁移方案，不能直接把旧ID当新ID使用，也不默认清档。</p>');
 article.append(continuous);return article.outerHTML;
}

