import {renderOilMinigame as legacyRender} from './gas-oil-planning.js?v=20261013-v2';
import {escapeHtml as esc} from './site.js?v=20260923-7';
const types={1:'普通',2:'连续',3:'破局'};
function table(heads,rows,widths,wide=false){return '<div class="shop-table-scroll"><table class="shop-business-table oil-config-table"'+(wide?' style="min-width:1450px"':'')+'>'+(widths?'<colgroup>'+widths.map(w=>'<col style="width:'+w+'%">').join('')+'</colgroup>':'')+'<thead><tr>'+heads.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const pending=x=>x==null?'待配置':String(x);
export function renderOilMinigame(markdown,design){
 if(design?.config_schema!=='challenge-board-v1')return legacyRender(markdown,design);
 const view=structuredClone(design);
 view.challenges=view.challenges.map(c=>({...c,remaining_star_thresholds:c.star_evaluation.mode==='remaining_drops'?c.star_evaluation.params:null,cleared_star_thresholds:c.star_evaluation.mode==='cleared_boards'?c.star_evaluation.params:null}));
 view.boards=view.boards.map(b=>({...b,type:view.challenges.find(c=>c.board_ids.includes(b.board_id)).type}));
 const doc=new DOMParser().parseFromString(legacyRender(markdown,view),'text/html'),article=doc.querySelector('.oil-minigame-document');
 const sections=[...article.querySelectorAll(':scope > section')],section=n=>sections.find(s=>s.querySelector(':scope > h2')?.textContent.startsWith(n+'.'));
 const boardFields=[['board_id','1～20','棋盘唯一编号'],['width／height','6／6','长宽格数'],['drops','[{cell_id,drop_type}, …]','各格初始油滴；未列出的格子默认为0'],['cell_id','1～36，不重复','左上开始，按行编号'],['drop_type','1／2／3／4','油滴大小；不是挑战类型']];
 const challengeFields=[
 ['challenge_id','1～14','关卡入口唯一编号；成绩与奖励按此记录'],
 ['type','1／2／3','普通／连续／破局；只配置在挑战表'],
 ['board_ids','有序棋盘ID列表','普通／破局1张；连续3张或5张；不可随机排序'],
 ['initial_drops','逐挑战给定','单盘进场发放；连续整组只发一次'],
 ['star_evaluation.mode','remaining_drops／cleared_boards','剩余油滴／清盘数量；剩余油滴包含返滴'],
 ['star_evaluation.params','剩余模式[二星,三星]；清盘模式[一星,二星,三星]','普通／破局清盘即一星；3连[1,2,3]，5连[1,3,5]'],
 ['reward_group_ids','[一星奖励组ID,二星奖励组ID,三星奖励组ID]','固定三项，引用奖励表；未定用null，不是奖励数量'],
 ['unlock_condition_id','解锁条件表中的ID；当前null','引用解锁表，不重复展开条件；null表示待配置，不是无条件开放']
 ];
 section(4).innerHTML='<h2>4. 编号与配表格式</h2><p>格号cell_id＝（行号−1）×6＋列号。行、列均从1开始，从左上按行编号。</p>'+table(['第1列','第2列','第3列','第4列','第5列','第6列'],Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>r*6+c+1)))+'<h3>棋盘表：配置布局</h3>'+table(['字段','结构／当前值','含义'],boardFields,[22,32,46])+'<h3>挑战表：配置玩法、评星与引用</h3>'+table(['字段','结构／当前值','含义'],challengeFields,[22,32,46])+'<p>一个challenge_id对应一张或多张棋盘，board_ids是棋盘ID组，不是挑战ID组。棋盘表不重复配置类型、预算、星级、奖励和解锁；“所属挑战”由挑战表反查。参考解、验证结果和设计意图属于验算资料，不是玩家必须照做的运行配置。</p>';
 const rows=design.challenges.map(c=>[c.challenge_id,c.type+'（'+types[c.type]+'）',JSON.stringify(c.board_ids),c.initial_drops,c.star_evaluation.mode+'\n'+JSON.stringify(c.star_evaluation.params),pending(c.reward_group_ids[0]),pending(c.reward_group_ids[1]),pending(c.reward_group_ids[2]),pending(c.unlock_condition_id)]);
 section(6).innerHTML='<h2>6. 挑战配表（14个入口）</h2><p>类型、棋盘ID组、预算和星级数值沿用现有设计。奖励组与解锁条件ID仅预留，不编造正式数值。</p>'+table(['挑战ID\nchallenge_id','类型\ntype','棋盘ID组\nboard_ids','初始油滴\ninitial_drops','星级评定\nstar_evaluation','1星奖励组ID','2星奖励组ID','3星奖励组ID','解锁条件ID\nunlock_condition_id'],rows,[8,9,12,8,23,8,8,8,16],true)+'<p>remaining_drops：清盘即1星，参数依次为2星、3星的剩余油滴门槛；返滴后取达到的最高档。cleared_boards：参数依次为1星、2星、3星的清盘数量，不读取剩余油滴。</p><p>开放须同时满足解锁条件ID引用的条件，以及前一挑战历史至少1星；第1个挑战没有前置挑战。解锁条件本体由解锁表维护，奖励内容由奖励表维护。“待配置”对应null，只是设计占位；上线前必须填有效ID，不可当作默认解锁或正式奖励。</p><p>各星档奖励分别只领一次；升星只补领未领取的档位。连续组只在进场发一次初始油滴，子盘继承余量，不额外补满。</p>';
 section(7).innerHTML='<h2>7. 棋盘配表总览（20块）</h2>'+table(['棋盘ID\nboard_id','宽\nwidth','高\nheight','drops条数','所属挑战\n关联结果','设计重点（验算说明）'],design.boards.map(b=>[b.board_id,b.width,b.height,b.drops.length,design.challenges.find(c=>c.board_ids.includes(b.board_id)).challenge_id,b.intent]),[10,6,6,10,12,56])+'<p>完整drops配置见下一节的格号图与等级分组表。所属挑战仅用于阅读对照，不在棋盘表重复录入challenge_id。</p>';
 article.querySelectorAll('.oil-board-card').forEach((card,i)=>{const b=design.boards[i],c=design.challenges.find(c=>c.board_ids.includes(b.board_id));card.querySelector(':scope > .shop-table-scroll').outerHTML=table(['棋盘表字段','值'],[['board_id',b.board_id],['width',b.width],['height',b.height],['drops条数',b.drops.length]],[28,72])+'<p>关联挑战'+c.challenge_id+'（'+types[c.type]+'）；类型、预算、评星、奖励和解锁以挑战表为准。参考进入余量及清盘结果见验证参考解，不能另配冲突的挑战规则。</p>';});
 return article.outerHTML;
}

