import {renderOilMinigame as previousRender} from './gas-oil-config-planning.js?v=20261013-v4';
import {escapeHtml as esc} from './site.js?v=20260923-7';
function fields(rows){return '<div class="shop-table-scroll"><table class="shop-business-table oil-config-table"><colgroup><col style="width:24%"><col style="width:17%"><col style="width:59%"></colgroup><thead><tr><th>英文字段名</th><th>中文名称</th><th>使用说明</th></tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(text=>'<td>'+esc(text)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const boardFields=[
 ['board_id','棋盘ID','这张固定棋盘的唯一编号，供挑战表的“棋盘ID组”填写。当前编号1～20，例如10表示第10张棋盘。'],
 ['width','棋盘列数','棋盘横向有多少格，填写整数。本玩法固定填6；不是图片的像素宽度。'],
 ['height','棋盘行数','棋盘纵向有多少格，填写整数。本玩法固定填6；不是图片的像素高度。'],
 ['drops','棋盘初始油滴列表','填写初始有油滴格子的“位置＋大小”。每项由cell_id（格子编号）和drop_type（油滴大小）组成。例如 {cell_id:13, drop_type:3} 表示13号格放一个3级油滴。\n未填写的格子为空，同一格子编号不能重复。这里配置的是盘面，不是玩家可点击的油滴余额。'],
 ['cell_id','格子编号','填写油滴所在位置，范围1～36。从左上角开始，先从左到右、再从上到下编号：第一行1～6，第二行7～12，以此类推。编号不从0开始。'],
 ['drop_type','油滴大小类型','填写一个数字：1－小；2－中；3－大；4－满。\n满级油滴再获得1滴就爆炸，并向四个方向分流。这个字段只表示油滴大小，不是挑战类型。']
];
const challengeFields=[
 ['challenge_id','挑战ID','一个可进入的挑战关卡的唯一编号。通关成绩、历史星级和奖励领取记录都按此编号保存。当前14个挑战编号1～14，不要与20张棋盘的编号混用。'],
 ['type','挑战类型','对挑战使用的玩法类型分类，填写一个数字：1－普通；2－连续；3－破局。\n普通、破局使用一张棋盘；连续使用3张或5张棋盘，且共用一份油滴余额。'],
 ['board_ids','棋盘ID组','填写这个挑战包含的棋盘编号，按实际游玩顺序组成数组。\n普通、破局只填1个，例如[5]；连续只能填3个或5个，例如[10,11,12]，表示依次游玩10、11、12号棋盘。这里填的是棋盘ID，不是挑战ID；不得随机打乱顺序。'],
 ['initial_drops','初始可用油滴数量','玩家开始这个挑战时，发放多少滴可用于点击的油滴，填写一个整数。例如填5，进场就有5滴；点击扣1滴，连锁返滴会增加余额。\n普通、破局每次进场重新发放；连续只在整组开始时发一次，后续棋盘继承剩余数量，不重新补满。不是棋盘上摆了多少颗油滴。'],
 ['star_evaluation','星级评定设置','由两个子字段组成：mode（用什么方式评星）和params（各星级需要达到多少）。分别按下面两行填写。\n挑战结束后取达到的最高星级；历史记录只保留最高星，不把多次低星相加。'],
 ['star_evaluation.mode','星级评定方式','填写下面一种英文值：\nremaining_drops－按清盘后剩余油滴评星，普通、破局使用；剩余数量包含最后一次连锁返滴。\ncleared_boards－按完成棋盘数量评星，连续使用；不看剩余油滴。'],
 ['star_evaluation.params','星级评定门槛','填写数字数组，顺序固定：\n按剩余油滴：[2星门槛,3星门槛]。例如[4,5]表示清盘得1星，剩至少4滴得2星，剩至少5滴得3星。\n按完成棋盘数：[1星门槛,2星门槛,3星门槛]。3连填[1,2,3]；5连填[1,3,5]，分别表示至少完成对应数量的棋盘。'],
 ['reward_group_ids','各星级奖励组ID','固定填写3项，顺序为[1星奖励组ID,2星奖励组ID,3星奖励组ID]。每项引用奖励表中的一组奖励，不是直接填写奖励数量。\n下方配表拆成1、2、3星三列，合起来就是这个数组。未确定的项显示“待配置”（数据中为null）；正式接入前须填写有效奖励组ID。每档只领取一次，升星仅补领没领过的档位。'],
 ['unlock_condition_id','解锁条件ID','填写解锁表中一条条件记录的ID；进入挑战时查询该记录，判断其中的条件是否满足。不在挑战表重复填写条件详情。\n同时保留前一挑战历史至少1星的要求；第1个挑战没有前置挑战。未确定时显示“待配置”（数据中为null），不代表默认解锁。']
];
function setHeaders(table,labels){[...table.querySelectorAll('thead th')].forEach((th,i)=>th.textContent=labels[i]);}
export function renderOilMinigame(markdown,design){
 if(design?.config_readability!=='zh-v1')return previousRender(markdown,design);
 const doc=new DOMParser().parseFromString(previousRender(markdown,design),'text/html'),article=doc.querySelector('.oil-minigame-document'),sections=[...article.querySelectorAll(':scope > section')],section=n=>sections.find(s=>s.querySelector(':scope > h2')?.textContent.startsWith(n+'.'));
 article.style.minWidth='0';article.style.width='100%';article.style.maxWidth='100%';article.style.boxSizing='border-box';
 const four=section(4),grid=four.querySelector(':scope > .shop-table-scroll').outerHTML;
 four.innerHTML='<h2>4. 编号与配表格式</h2><p>格子从左上角开始，按行从左到右编号。第一行1～6、第二行7～12，最后一行31～36；对应如下。</p>'+grid+'<h3>棋盘表字段说明</h3>'+fields(boardFields)+'<h3>挑战表字段说明</h3>'+fields(challengeFields)+'<p>挑战ID表示一个可进入的关卡入口；棋盘ID表示一张固定盘面。一个挑战可以包含一张或多张棋盘。棋盘表只配置布局；类型、进场油滴、星级、奖励和解锁统一在挑战表配置。</p><p>本页的参考操作、设计说明和验算结果用于检查关卡是否可完成，不要求玩家照做。</p>';
 const six=section(6),challengeTable=six.querySelector('table');
 setHeaders(challengeTable,['挑战ID','挑战类型','棋盘ID组\n游玩顺序','初始可用油滴\n进场发放','星级评定\n门槛说明','1星奖励组ID','2星奖励组ID','3星奖励组ID','解锁条件ID']);
 [...challengeTable.querySelectorAll('tbody tr')].forEach((tr,i)=>{
  const c=design.challenges[i],p=c.star_evaluation.params;
  tr.children[1].textContent=c.type+'－'+{1:'普通',2:'连续',3:'破局'}[c.type];
  tr.children[3].textContent=c.initial_drops+'滴';
  tr.children[4].textContent=c.type===2?'按完成棋盘数：\n至少清'+p[0]+'盘＝1星\n至少清'+p[1]+'盘＝2星\n至少清'+p[2]+'盘＝3星':'按剩余油滴：\n清盘＝1星\n剩至少'+p[0]+'滴＝2星\n剩至少'+p[1]+'滴＝3星';
 });
 const explanations=[
 '下表列出每个挑战的具体设置；英文字段名和填写要求见第4节。奖励组和解锁条件ID尚未确定，暂标“待配置”。',
 '普通、破局：清盘得1星，清盘后再按剩余油滴达到的门槛升到2星或3星。连续：按完成了几张棋盘评星，不看油滴余额。达到多个档位时取最高星。',
 '“初始可用油滴”是玩家进场时的点击预算，不是盘面有油滴格子的数量。连续挑战只在整组开始发放一次；后续子盘继承余额，不补满。',
 '1、2、3星奖励组分别引用奖励表中的一组奖励；解锁条件ID引用解锁表中的一条条件记录。解锁时还需前一挑战历史至少1星，第1个挑战没有前置挑战。“待配置”不是无条件开放，也不是正式奖励，接入前须补齐有效ID。'
 ];
 [...six.querySelectorAll(':scope > p')].forEach((el,i)=>el.textContent=explanations[i]);
 const seven=section(7);setHeaders(seven.querySelector('table'),['棋盘ID','棋盘列数','棋盘行数','初始有油滴格数','所属挑战ID','设计说明']);
 seven.querySelector(':scope > p').textContent='每盘的油滴位置和大小见下一节的格号图与分组表。“初始有油滴格数”是盘面上有多少格放了油滴，不是玩家的可点击余额。“所属挑战ID”由挑战表对应关系查出，仅供阅读对照。';
 article.querySelectorAll('.oil-board-card').forEach((card,i)=>{
  const b=design.boards[i];card.querySelector(':scope > .shop-table-scroll').outerHTML=fields([['board_id','棋盘ID',b.board_id],['width','棋盘列数',b.width],['height','棋盘行数',b.height],['drops','初始油滴列表',b.drops.length+'项；位置和大小见下方格号图与分组表']]).replace('<th>使用说明</th>','<th>本盘配置</th>');
  const grade=card.querySelector('.oil-board-layout table.oil-config-table');if(grade)setHeaders(grade,['油滴大小类型（drop_type）','中文大小','对应格子编号（cell_id）']);
 });
 return article.outerHTML;
}

