// Content is activated only by this page's saved draft/formal reference.
import { renderShopUiRulesCard } from "./editor-view.js?v=20261021-linked-navigation-v3";
export const WEEKLY_REF = "assets/wealth-hall-planning.js";
const rules = [
  ["scope", "系统定位与玩法循环", [
    ["定位", "名人周刊集中展示玩家通过限时活动获得的荣誉。活动决定谁获得封面头衔；周刊负责名人展示、每日支持、上榜快讯、名人回馈和荣誉收藏，不另开一套投票排名。"],
    ["一轮玩法", "参与限时活动获得封面头衔→自动进入对应专题的名人记录→其他玩家每日支持，获得即时奖励和当日读者福利；上榜者还可发布名人回馈，并积累头衔收藏与周刊纪念券。"],
    ["开放", "系统随主角身份开放，当前基准为身份12级。开放不要求自己先获得封面头衔；没有头衔的玩家也能参与每日支持、查看记录和领取符合条件的福利。"],
    ["包装范围", "刊名暂用《MAIN STREET WEEKLY》，系统名为【名人周刊】。本稿先用【每日支持】【读者福利】【上榜快讯】【新刊快讯礼】【名人回馈】【周刊纪念券】【封面收藏】；名称可再调整，不随改名改变获得条件或奖励。"]
  ]],
  ["titles", "封面头衔与人物展示", [
    ["获得", "通过对应限时活动的奖励获得封面头衔，自动纳入对应专题，无须再次报名或支付上榜费用。不同头衔分别统计获得次数；同一头衔可在后续活动再次获得。"],
    ["头衔与造型", "封面头衔是活动荣誉；封面造型是纪念品兑换的主角外观，两者不是同一对象。购买造型不能获得活动名次，也不能替代头衔的上榜资格。"],
    ["分级与专题", "头衔分荣誉等级与专题，同一等级可以有多个专题。展示只读取已投放且允许展示的头衔，按荣誉等级从高到低、同级按头衔优先序组织；不因为参考图有五张封面就把所有等级压成五个固定人选。"],
    ["人选与历史", "每个专题关联该头衔的获奖玩家记录。人物列表中同一玩家合并展示，按身份等级从高到低、同级按玩家编号从小到大；上榜快讯保留每次获奖记录，不合并成一次获奖。没有记录的专题不生成虚构名人。"],
    ["有效期", "头衔有效期由头衔定义决定，现有常规头衔为15天；历史获得次数与上榜记录不等于当前仍持有该头衔。重复获得时续期还是叠加时间，现有资料未证明，暂不另定。"],
    ["参考图名词", "【年度封面人物】【商业新星】【社区先锋】【文化之声】【公路传奇】先作为专题包装候选，尚未分配到具体活动和荣誉等级。【年度】不代表增加一年结算周期，【周刊】也不代表每周重新抽选人选。"]
  ]],
  ["daily", "每日支持与读者福利", [
    ["次数", "每名玩家每天可免费支持一次，次数为全系统共用，不按专题、头衔或人物分别计算。支持不选择某位名人，不累计竞选票数，也不改变谁获得封面头衔。参考图的【投票】暂按此功能理解，最终按钮名称待定。"],
    ["即时奖励", "支持成功获得一份基础货币奖励，并计入已生效的伙伴技能所提供的额外支持奖励。基础奖励是区间值，具体数值待配；不能把区间上限当成每次必得。"],
    ["当日福利", "支持成功后获得一项随机读者福利。福利与即时货币奖励分开：货币即时获得，福利在对应玩法满足触发条件时结算额外收益。每天获得一次福利，不通过退出或重进周刊重新抽取。"],
    ["福利类型", "当前四类为：伙伴谈心获得额外缘分收益、学徒结业额外获得书籍、指定餐饮订单获得额外订单币、指定经营收益领取额外获得对应成长资源。各自配置触发概率、收益倍率或增量、最多触发次数；具体玩法包装与资源名称尚未全部定名。"],
    ["触发与耗尽", "只有获得当日福利后，在其指定的玩法操作中才可能触发；未触发不能直接按倍率加奖。有效次数耗尽后不再产生该福利收益。成功触发是否为唯一扣次时机、批量操作如何计次，待结算依据补足，不擅自扩大收益。"],
    ["刷新", "每天0点重置支持资格并清除上一日福利，不能把未用次数累计到下一天。跨日不重置永久头衔收藏，也不因玩家重新进入页面额外发放一次支持奖励。"]
  ]],
  ["news", "上榜快讯与新刊快讯礼", [
    ["记录", "每个头衔分别记录获奖玩家及获奖时间。按获奖时间从新到旧排列；同时间按身份等级从高到低、玩家编号从小到大。获奖后三天内标为新晋，超过三天仍属于历史记录，不因新晋标记结束就删除。"],
    ["领取资格", "某头衔三天内有新晋记录时，符合领取资格的玩家可领该头衔的新刊快讯礼。奖励按头衔维度控制，不是每出现一位新人物就都能再领一次；查看记录本身不发奖。"],
    ["领取限制", "同一种头衔的新刊快讯礼每2天最多领取一次，和全系统每日支持分开计算。没有新晋记录、领取间隔未到或已无可领资格时不能领取。间隔的起算与跨日边界存在资料冲突，见【待核实项】，不能据此改成每日一次。"],
    ["奖励", "按荣誉等级的快讯奖励参数发放。当前五级参数相同，不能据此认定未来永远相同；每次实际领取只发一份，不将历史记录条数乘进奖励。"]
  ]],
  ["feedback", "名人回馈", [
    ["发布资格", "当前持有有效封面头衔的玩家，每天可发布一次名人回馈。持有多个头衔不增加次数，也不是每个专题各发一次；采用当前有效头衔中编号最大的一个作为本次回馈的关联头衔。没有有效头衔时不可发布。"],
    ["寄语", "发布时可使用默认封面寄语或自填寄语。长度上限按24个长度单位计算：汉字占2，其他字符占1；不能直接理解为24个汉字。发布后当日剩余发布次数归零。"],
    ["领取", "其他玩家可领取符合资格的名人回馈，领取他人回馈有每日次数上限，当前基准100次。达到上限后不能继续领取他人回馈；同一份回馈不得重复领取。发布者另有本人回馈领取分支，本人领取不计入上述他人回馈次数。"],
    ["奖励边界", "回馈发放的道具和数量以该份回馈的奖励为准。当前资料不能证明奖励随机分配、共享奖池规模及过期返还方式；不增加元宝投入、付费红包或邮件补领规则。发布动作未见玩家货币消耗，不为包装额外加费用。"],
    ["刷新与通知", "发布资格及领取他人回馈的次数按日更新，回馈到来与领取分开；关闭奖励表现不代表额外产生一份奖励。回馈有效时长的具体结算口径待核实。"]
  ]],
  ["collection", "封面收藏与纪念品", [
    ["头衔奖励", "每次获得常规封面头衔，增加该头衔的累计次数，并可领取对应周刊纪念券。可领纪念券＝该头衔每次奖励×尚未领取的获得次数；一次领取可结清该头衔积累的未领份额，不再次计算已经领取的次数。"],
    ["收藏成就", "同一荣誉等级的全部规定头衔均获得达到要求次数时，可领取对应收藏成就奖励。例：要求全部各2次，某一种获得10次也不能替代另一种只获得1次。各档成就各领一次，不按日重置。"],
    ["纪念陈列", "收藏成就可产出名人纪念摆件。摆件交给现有装修／城建体系处理，其使用范围和效果由对应家具规则决定；在周刊中领取不等于自动摆放，也不另外发一份属性奖励。具体本项目摆件条目待配。"],
    ["纪念品兑换", "消耗周刊纪念券兑换封面造型，商品分别配置价格、数量、限购与开放条件。资源不足或商品售罄不能购买；获得造型后的解锁、加成和进阶使用主角外观系统已有规则，不在周刊再造一套养成。"],
    ["红点", "每日可支持、存在可领快讯礼、本人可发布回馈、头衔纪念券未领、收藏成就可领、纪念品可兑换分别判断；查看页面不代替领取，领取后按剩余资格更新。"]
  ]],
  ["refresh", "刷新口径与待核实项", [
    ["按日刷新", "每天0点：每日支持资格、当日读者福利、每日回馈资格与领取次数。封面展示和上榜记录随活动发放头衔及其记录变化，不在0点或每周任意换人；永久收藏和已领成就不重置。"],
    ["快讯礼间隔", "规则文案与间隔参数均指向2天，但现有客户端领取间隔判断使用了不同时间参数，时间差的取值也异常。保留2天业务限制；精确边界及修正依据需补充结算侧或同版本运行证据后才能定稿。"],
    ["随机与回馈", "福利候选的第三列限制参数、候选过滤后如何处理权重、基础奖励区间的分布与端点、福利扣次、回馈600000毫秒参数的实际作用、回馈奖励算法，当前客户端资料不足。配置页保留实际结构并逐项标注缺口，不把未知值当0。"],
    ["包装与投放待配", "专题与活动、各级头衔名称、福利名称及对应资源、纪念品与摆件清单后续补齐。暂不新增票数竞争、周度抽选、年度结算或额外抽奖。界面规则另行编写，本稿不以概念图代替控件规则。"]
  ]]
];

// Four semantic columns for every configuration structure; no positional relabelling.
const tables = [
  ["appearance", "封面头衔与造型表 AppearanceCfg", "头衔使用Type=4，常规专题使用ChildType=1；当前可查到10条常规专题头衔（两个荣誉等级），另1条特殊头衔ChildType=0。兑换造型使用Type=1、ChildType=2。头衔、造型共用此表，不混用各分支Param的语义。", [
    ["Id", "外观／头衔ID", "int，唯一", "与同ID道具关联；活动奖励、上榜记录、收藏和商品奖励均引用该ID。"],
    ["ModelId", "模型资源ID", "int → 模型资源", "头衔表现或造型模型；不是玩家ID，也不是封面人物获奖次数。"],
    ["Type", "外观类型", "int／枚举", "本系统读取4=荣誉头衔；纪念品读取1=主角外观。"],
    ["ChildType", "外观子类型", "int／枚举", "常规专题头衔为1，特殊头衔为0；特殊头衔不能直接并入常规收藏全套。兑换造型为2。"],
    ["name", "名称", "string／多语言文本", "头衔或造型名称，本项目填写周刊包装名称。"],
    ["desc", "获得／有效期说明", "string／多语言文本", "显示来源、期限等说明；文字不能替代实际活动奖励与TimeLimit。"],
    ["Param", "分支参数", "int[]", "头衔分支下详见下一表；不同Type不得复用同一套数组解释。"],
    ["Sort", "通用排序", "int", "通用外观列表顺序；周刊专题分组优先使用Param[0]与Param[3]，不可只按Sort重排。"],
    ["EffectType", "效果类型组", "int[]／效果枚举", "兑换造型等外观的属性效果；常规头衔当前为空。与EffectParam逐项对应。"],
    ["EffectParam", "效果参数组", "int[][]", "各效果的参数；不能把此数组当每日福利触发参数。"],
    ["TimeLimit", "有效时长", "long／毫秒", "常规头衔当前1296000000毫秒，即15天；兑换造型当前0表示永久。重复获得的续期算法仍待核实。"],
    ["UpgradeScheme", "造型进阶方案", "int → 进阶方案", "兑换造型可关联方案；常规头衔为0。非0时交给主角外观成长处理。"]
  ]],
  ["title-param", "头衔参数结构 AppearanceCfg.Param（Type=4）", "数组下标从0开始。完整保留已读取结构，未查实语义的槽位明确保留，不依据示例值猜奖励算法。", [
    ["Param[0]", "荣誉等级", "int，等级枚举", "专题分组、等级显示及收藏任务分组；当前有效常规记录为1、2，通用参数中预留5级不代表5级头衔均已投放。"],
    ["Param[1]", "头衔参数槽1（待核）", "int", "现有两个等级分别出现10、20。当前未找到本系统客户端读取点，不能直接认定为回馈奖励下限。"],
    ["Param[2]", "头衔参数槽2（待核）", "int", "现有两个等级分别出现20、30。当前未找到本系统客户端读取点，不能直接认定为回馈奖励上限。"],
    ["Param[3]", "同级展示优先序", "int，升序", "同一荣誉等级内由小到大排序；决定专题主次，不代表票数。特殊头衔使用0。"],
    ["Param[4]", "单次头衔纪念券", "int／道具数量", "每次获得该头衔可领的100069数量；可领量＝此值×未领取的获得次数。特殊头衔当前缺此位，不能补作常规奖励。"]
  ]],
  ["game-config", "全局参数表 GameConfigCfg", "以Param名称检索Value；Value按具体参数定义解析，不新增同义参数替代已采用的名称。", [
    ["Id", "参数行ID", "int，唯一", "配置行标识。"],
    ["Param", "参数名称", "string，唯一键", "下表各TEMPLE_*标识保留为采用的配置键。"],
    ["Value", "参数内容", "string", "单值、竖线数组或分号分组；结构与单位见下表。不得将未填写写成0。"]
  ]],
  ["params", "周刊全局参数字段", "这里只列参数结构、作用与查证边界，不将参考数值当成本项目已配完的投放表。", [
    ["TEMPLE_THUMBS_UP_DAILY_REWARD", "每日支持基础奖励", "下限|上限，int[2]", "基础货币区间，另加有效伙伴技能加成。参考为25|50；具体随机分布与端点尚未取得结算依据。"],
    ["TEMPLE_THUMBS_UP_DAILY_EFFECT_CONFIG", "每日福利候选", "技能ID|权重|限制参数；以;分组", "现有四组，权重30、30、20、20；限制值依次0、19、7、0。19、7与系统编号相符，但过滤语义、0的含义和过滤后重分配规则待核，不能直接写成固定最终概率。"],
    ["TEMPLE_THUMBS_UP_REWARD", "快讯礼等级奖励", "int[]，竖线分隔", "当前5项均为50；按等级准备奖励结构。现有快讯页固定展示第1项，非等值时的展示与结算对应需复核。"],
    ["TEMPLE_THUMBS_UP_TIME", "新晋窗口参数", "long／毫秒", "参考259200000（3天），与新晋三天规则对应；现有快讯页另写固定三天值，领取判断却也读取此参数，存在错用待核。不能把改此值视为已同步所有逻辑。"],
    ["TEMPLE_THUMBS_UP_LIMIT_TIME", "同头衔快讯礼间隔", "long／毫秒", "参考172800000（2天），与业务文案一致；当前客户端读取链不完整，精确起算方式待核。"],
    ["TEMPLE_SEND_MONEY_MAX_GET_TIME", "每日领取他人回馈上限", "int／次", "参考100；不是本人每日可发布100次。本人回馈领取不计入此计数。"],
    ["TEMPLE_SEND_MONEY_TIME_LIMIT", "回馈时间限制参数（待核）", "long／毫秒", "参考600000（10分钟）；未查明是可领取时长还是其他限制，不先写成发布冷却、必定过期或邮件补发。"],
    ["TEMPLE_TITLE_POINT_CONFIG", "头衔积分参数（待核）", "int[]，竖线分隔", "参考5项100、200、300、400、500；本系统客户端未查到有效读取点，不据此新增周刊积分或积分商城。"]
  ]],
  ["skill", "读者福利及支持加成表 CommonSkillCfg", "当日福利引用1050001—1050004，额外支持货币读取伙伴效果51008。技能名称使用本项目包装，参数语义不能随改名改变。", [
    ["Id", "技能ID", "int，唯一", "福利候选引用此ID；伙伴技能也可引用此表的支持加成技能。"],
    ["Type", "技能类型", "int／枚举", "当前福利及相关伙伴技能为10；不得与SkillEffect效果编号混淆。"],
    ["Icon", "技能图标", "string／资源key", "福利与技能表现。"],
    ["Quality", "品质", "int／枚举", "通用技能品质，当前福利为0；不是封面荣誉等级。"],
    ["name", "福利／技能名称", "string／多语言文本", "填写读者福利或伙伴技能的新包装名称。"],
    ["desc", "效果描述", "string／带占位文本", "按Params展开收益与触发次数，显示值必须与实际效果一致。"],
    ["SkillEffect", "效果类型组", "int[]", "当前福利52001—52004分别对应伙伴缘分、结业书籍、餐饮订单币、指定经营成长资源；支持额外货币效果为51008。"],
    ["Params", "基础效果参数", "int[][]", "按效果类型解释；福利行第1组的[0]是倍率或增量，[1]是触发概率值，[2]是最多触发次数，[3]及更多位置按该效果保留。下表逐项说明。"],
    ["UpgradeParams", "每级增量", "int[][]", "福利当前无成长增量；相关伙伴技能可随等级增加支持奖励，不能把伙伴成长搬到每日福利。"],
    ["MaxLevel", "最高等级", "int", "当日福利当前1级；相关伙伴技能有独立上限。"],
    ["UpdateCost", "升级消耗方案", "int／方案ID", "福利当前0，不提供周刊内升级；有成长的技能由所属系统维护。"],
    ["UnlockId", "解锁关联", "int", "当前福利为0；不得据此覆盖候选中的限制参数。"],
    ["Sort", "技能排序", "int", "通用排序；不能用来替代候选抽取权重。"]
  ]],
  ["skill-params", "福利参数分支 CommonSkillCfg.Params", "参数下标从0开始，当前记录中的概率以10000为满值。具体候选过滤与扣次算法尚待核实，不能直接把权重作为触发概率。", [
    ["1050001 / 52001", "伙伴缘分福利", "[倍率,触发概率,次数上限,保留位]", "参考[2,2000,5,0]；伙伴谈心的对应缘分收益触发时变为2倍，参考触发率20%、最多5次。并非把伙伴心意次数翻倍。"],
    ["1050002 / 52002", "结业书籍福利", "[额外书籍量,触发概率,次数上限,保留位]", "参考[50,2000,5,0]；学徒结业触发时额外获得书籍。书籍道具与新包装另配，不改成所有结业收益翻倍。"],
    ["1050003 / 52003", "订单收益福利", "[收益倍率,触发概率,次数上限,保留位]", "参考[2,5000,1,0]；指定餐饮订单币触发时变为2倍，参考触发率50%、最多1次。不加倍所有订单奖励。"],
    ["1050004 / 52004", "经营成长福利", "[额外资源量,触发概率,次数上限,保留位…]", "参考[1,5000,50,0,0]；指定经营收益领取触发时额外增加对应成长资源，不把货币和全部资源一起加倍。目标系统新名称待配。"],
    ["51008（效果类型）", "伙伴支持奖励加成", "Params及UpgradeParams按技能等级计算", "为每日支持增加固定货币值；不是福利候选，也不增加每日支持次数。相关已查技能1060014，数值由伙伴技能成长决定。"]
  ]],
  ["task", "封面收藏成就表 GameTaskCfg", "使用Type=8的收藏任务，当前有效10条；条件原始值10058，读取后的业务条件类型为58。当前两级各5档，不因通用显示支持5级就补造后3级任务。", [
    ["Id", "成就ID", "int，唯一", "每档奖励独立领取。当前范围800011—800015、800021—800025。"],
    ["Type", "任务类型", "int／枚举", "8=本系统收藏任务。"],
    ["ChildType", "任务子类", "int", "当前与荣誉等级对应；实际列表分组读取Param[1]，两者应保持一致。"],
    ["PreTask", "前置任务", "int → 任务ID", "现有收藏任务为0，无前置链。不能自动要求先领取上一档。"],
    ["NextTask", "后续任务", "int[]", "现有为[0]，无后续链；各档通过条件分别判断。"],
    ["condType", "成就条件", "int／条件编号", "填表10058，业务条件58：同一等级全部头衔达到指定获得次数。"],
    ["Param", "条件参数", "次数门槛|荣誉等级|保留位|保留位", "当前次数门槛1—5；全部规定头衔分别满足门槛，不按所有头衔次数求和。"],
    ["Reward", "成就奖励", "int[][]，[[道具ID,数量],…]", "当前产出纪念摆件道具；引用ItemCfg，不将城建对象ID直接当道具ID。"],
    ["Refresh", "刷新类型", "int／枚举", "当前0；本系统成就为长期累计，不随每日支持刷新。"],
    ["PlotTriggerType", "剧情触发类型", "int", "当前0，本系统任务不绑定新增剧情触发。"],
    ["PlotId", "剧情ID", "int", "当前0；没有配置不补造剧情。"],
    ["JumpId", "跳转入口", "int／入口编号", "任务前往目标；现有为58。不是每日支持次数或荣誉等级。"],
    ["ExtendParam", "扩展参数", "string", "当前0，保留结构，不作为新积分或玩家领取状态。"]
  ]],
  ["mall", "周刊纪念品表 MallCfg", "使用ShopType=125，当前2条商品125141000、125141100；价格使用道具100069。完整字段如下，示例内容不是本项目最终商品清单。", [
    ["Id", "商品ID", "int，唯一", "标识一个可购买条目，与奖励外观ID分开。"],
    ["name", "商品名称", "string／多语言文本", "本项目造型商品名称。"],
    ["ShopType", "商店类型", "int／枚举", "125=周刊纪念品商店。"],
    ["Param", "商店扩展参数", "string", "现有为空；不新增随机货架或刷新费用。"],
    ["Reward", "购买所得", "string，道具ID=数量", "当前均为主角造型道具，引用ItemCfg及AppearanceCfg。"],
    ["Category", "商品类别", "int", "现有为0，按通用商城类别处理。"],
    ["Price", "支付内容", "string，道具ID=数量", "当前使用100069；资源不足不可购买。"],
    ["OldPrice", "原价", "string", "现有0，无另列折前价；不能据此认定免费。"],
    ["RechargeId", "充值关联", "string", "现有0，不启用充值商品分支。"],
    ["IsDouble", "翻倍标记", "int", "现有0，不加首次购买翻倍。"],
    ["Tag", "商品标签", "int", "通用标签；现有0。"],
    ["BuyLimitType", "限购周期类型", "int／商城枚举", "与BuyLimit共同决定可购数量；当前0，不凭此自定每日重置。"],
    ["BuyLimit", "限购量", "int／次数", "当前每条3次；剩余次数由实际购买情况决定，不能在退出页面后补满。"],
    ["UnlockLimit", "开放限制", "int／通用商城限制", "现有0；本系统另受系统开放资格限制。"],
    ["Sort", "商品排序", "int", "决定商品列表顺序。"],
    ["PriceAdd", "价格递增参数", "int", "现有0，不附加随购买次数涨价规则。"]
  ]],
  ["item", "周刊道具表 ItemCfg", "本系统使用基础奖励货币、100069周刊纪念券、头衔道具、兑换造型与收藏摆件。只填道具定义，不在配置里填写玩家库存和已领取次数。", [
    ["Id", "道具ID", "int，唯一", "各奖励、价格及外观关联的主键。"],
    ["name", "道具名称", "string／多语言文本", "填写本项目货币、纪念券、头衔、造型和摆件名称。"],
    ["desc", "道具说明", "string／多语言文本", "描述用途和来源，不替代奖励资格。"],
    ["Icon", "图标资源", "string／资源key", "道具与奖励显示。"],
    ["Quality", "道具品质", "int／枚举", "不是头衔荣誉等级；二者不能按名称混用。"],
    ["Type", "道具类型", "int／枚举", "当前头衔与造型13、纪念摆件15、纪念券1；按各道具实际类别填写。"],
    ["GetWay", "获取途径", "int[]／入口ID", "不足或来源查询使用，不能代替活动实际发奖。"],
    ["UseWay", "使用方式", "int", "通用背包使用规则。"],
    ["Param", "道具类型参数", "int[]", "按道具类型解释，不套用AppearanceCfg.Param；摆件道具关联装修内容。"],
    ["IsHidden", "隐藏标记", "int", "控制通用背包显示，不表示未投放或无收藏资格。"],
    ["Sort", "道具排序", "int", "通用道具顺序。"],
    ["MaxNum", "数量限制参数", "int", "按道具通用定义处理，不能作为每日领取回馈上限。"],
    ["MaxUseNum", "使用数量限制", "int", "通用道具使用限制，不是支持次数。"],
    ["Reward", "使用奖励关联", "int", "通用道具使用分支引用；不能替代任务Reward。"],
    ["TimeLimit", "道具时效", "long／毫秒", "与外观生效时长分开；头衔有效时长读取外观TimeLimit，不能只看道具此值为0就判永久。"],
    ["AutoUse", "自动使用", "int", "当前头衔／造型为1；普通纪念券和摆件按各自定义。"],
    ["System", "使用系统关联", "int", "通用关联字段，不等于头衔等级。"],
    ["BatchUse", "批量使用标记", "int", "通用背包批量能力，不增加本系统奖励份数。"]
  ]],
  ["system", "系统开放表 GameSystemCfg", "本系统条目Id=35。结构保留，名称、图标与引导资源换为周刊包装；当前开放条件是身份达到12级。", [
    ["Id", "系统ID", "int，唯一", "35为本系统标识，非开放等级。"],
    ["name", "系统名称", "string／多语言文本", "名人周刊。"],
    ["desc", "系统说明", "string／多语言文本", "系统功能预告说明。"],
    ["Icon", "入口图标", "int／资源ID", "采用本项目周刊资源。"],
    ["Type", "系统类型", "int／枚举", "当前1，沿用对应系统类别。"],
    ["Sort", "入口排序", "int", "系统入口的排序值。"],
    ["Reward", "系统预告奖励", "int[][]／道具奖励组", "通用系统预告使用，非每日点赞奖励；是否有可领奖励依对应系统开放流程。"],
    ["UnlockReward", "开放时道具奖励", "int[][]／可空", "现有为空，不新增周刊开放礼包。"],
    ["UnlockType", "开放条件类型", "int[]／条件类型", "现有[10002]，身份条件。"],
    ["UnlockParam", "开放条件参数", "int[][]", "与UnlockType逐项对应，当前[[12,0,0,0]]。"],
    ["Notice", "预告标记", "int", "控制通用系统预告。"],
    ["Display", "显示标记", "int", "控制通用入口显示。"],
    ["Guide", "引导ID", "int／引导资源", "系统开放引导；不表示每次进入都播放引导。"],
    ["Light", "入口表现参数", "int", "按通用入口效果使用，不参与奖励结算。"]
  ]],
  ["language", "文案表 LanguageWordCfg", "用于规则、快讯、寄语、成就名称等。文案与资源可以换包装，不改变条件编号和业务含义。", [
    ["Name", "文案键", "string，唯一", "现有规则键Game_Rule_3501与Game_Rule_11，回馈默认语使用Temple_Send_Money_Text-*，任务标题使用Task_Title_Desc-{成就ID}。"],
    ["Name_zh_0", "中文文案内容", "string／带占位文本", "本项目周刊名词、默认寄语、条件说明。其他语言按现有语言系统维护，不硬编码人物身份或额外奖励。"]
  ]],
  ["links", "跨表关联与投放边界", "以下仍采用同一四列表头，列出引用路径和未取得的内容，不增加自拟投放表。", [
    ["活动奖励 → ItemCfg.Id", "头衔投放", "活动奖励道具引用", "活动发放头衔道具，再关联同ID AppearanceCfg。具体活动到专题的投放表本轮尚未取齐，不能用全服常驻RankCfg替代限时活动奖励。"],
    ["GameTaskCfg.Reward → ItemCfg.Id", "收藏摆件", "奖励组引用", "当前10条收藏任务对应摆件道具，再由装修表引用道具；本项目具体摆件名称与资源待配。"],
    ["CityBuildingCfg.Item → ItemCfg.Id", "摆件落地接口", "int／道具ID关联", "已查到摆件15300101等对应城建对象300101等。周刊只负责产出道具；本项目旅馆／装修体系的适配位置、效果和资源在其配置维护，不在此照抄一套旧城建表。"],
    ["MallCfg.Reward → AppearanceCfg.Id", "兑换造型", "奖励道具ID关联", "当前造型1001004、1001005；AppearanceCfg.UpgradeScheme再关联外观进阶方案。周刊不决定通用造型进阶消耗。"],
    ["AppearanceUpgradeCfg.Scheme", "造型进阶方案关联", "int／分组ID", "对应AppearanceCfg.UpgradeScheme；相关行以Id、Scheme、name、UnlockLevel、ModelId定义阶段资源。具体成长数值由主角外观系统整理，不将其误写为封面头衔成长。"],
    ["支持次数／新晋天数／寄语长度", "未独立落表的常量", "1次／日；3天；24长度单位", "当前分别为业务限定或客户端常量，未找到独立配置字段；不伪造英文配置名。新晋天数另有同值全局参数，但不是所有读取点都使用参数。"],
    ["回馈奖励与福利候选限制", "结算证据缺口", "待补同版本结算依据", "回馈奖池／分配、10分钟参数用途、福利第三列过滤与扣次、快讯礼精确冷却边界仍待核实，不以参考数值或猜测填成正式算法。"]
  ]]
];

const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const field = (tag, key, text) => `<${tag} data-retail-edit-id="weekly-${key}">${esc(text)}</${tag}>`;
export function weeklyActions() {
  return '<nav class="shop-page-tabs" data-weekly-tabs aria-label="名人周刊分页"><button type="button" data-weekly-tab="rules">系统规则</button><button type="button" data-weekly-tab="config">配置表</button><button type="button" data-weekly-tab="interface">界面规则</button></nav>';
}
export function renderWeeklyPlanning() {
  const section = ([id,title,rows], i) => `<section class="retail-document-section" id="weekly-rule-${id}">${field("h2",`rule-${id}-title`,`${String(i+1).padStart(2,"0")} ${title}`)}<ol>${rows.map(([label,text],r)=>`<li data-retail-edit-id="weekly-rule-${id}-${r}"><strong>${esc(label)}：</strong>${esc(text)}</li>`).join("")}</ol></section>`;
  const table = ([id,title,desc,rows], i) => `<article class="detail-card checkpoint-rule-config" id="weekly-table-${id}">${field("h2",`table-${id}-title`,`${String(i+1).padStart(2,"0")} ${title}`)}${field("p",`table-${id}-desc`,desc)}${id === "appearance" ? '<div data-weekly-title-names></div>' : ""}<div class="checkpoint-rule-config-scroll"><table><colgroup><col style="width:23%"><col style="width:17%"><col style="width:23%"><col style="width:37%"></colgroup><thead><tr>${["英文字段","中文名称","类型 / 结构","使用说明"].map((v,c)=>field("th",`table-${id}-head-${c}`,v)).join("")}</tr></thead><tbody>${rows.map((row,r)=>`<tr>${row.map((v,c)=>field("td",`table-${id}-${r}-${c}`,v)).join("")}</tr>`).join("")}</tbody></table></div></article>`;
  return `<div data-weekly-document>
    <section class="shop-page-panel is-active" data-weekly-panel="rules"><article class="detail-card retail-document-card">${field("h1","rules-title","名人周刊｜系统规则")}${field("p","rules-intro","活动荣誉展示、每日支持与福利、上榜快讯、名人回馈、封面收藏和纪念品兑换。名称为暂定包装，不增设人物投票竞争。")}${rules.map(section).join("")}<div data-weekly-rules-extra></div></article></section>
    <section class="shop-page-panel" data-weekly-panel="config" hidden><article class="detail-card">${field("h1","config-title","名人周刊｜配置表")}${field("p","config-intro","按本系统采用的实际表结构列出字段、中文名、类型和用途。参考数值用于说明单位与结构，并非本项目已完成的投放配置；待配内容和未查实语义分别标明。")}</article>${tables.map(table).join("")}<div data-weekly-config-extra></div></section>
    <section class="shop-page-panel" data-weekly-panel="interface" hidden><article class="detail-card" data-weekly-reference-only>${field("h1","interface-title","名人周刊｜界面规则")}${field("p","interface-note","界面规则暂未编写。下图仅为包装参考，不代表按钮、布局与交互已经定稿。")}</article><article class="detail-card" data-weekly-reference-only><h2>包装参考</h2><figure class="scene-concept"><a href="assets/wealth-hall-concepts/main-street-weekly-display.png" target="_blank" rel="noopener"><img src="assets/wealth-hall-concepts/main-street-weekly-display.png" alt="名人周刊展示柜包装参考" style="max-height:760px;max-width:100%;object-fit:contain"></a></figure></article><div data-weekly-ui-data hidden>{"id":"wealth-hall","title":"名人周刊主界面","uiRules":[]}</div><article class="detail-card shop-ui-rules-card editor-rules-card" data-shop-ui-rules hidden></article></section>
  </div>`;
}
export function installWeeklyPlanning(root) {
  const doc = root.querySelector("[data-weekly-document]");
  if (!doc) return;
  root.querySelector(".surface > .page-head")?.setAttribute("hidden", "");
  const buttons = [...root.querySelectorAll("[data-weekly-tab]")];
  const show = (name, update=false) => {
    const active = ["rules","config","interface"].includes(name) ? name : "rules";
    doc.querySelectorAll("[data-weekly-panel]").forEach(el => {el.hidden=el.dataset.weeklyPanel!==active;el.classList.toggle("is-active",!el.hidden);});
    buttons.forEach(el=>{const selected=el.dataset.weeklyTab===active;el.classList.toggle("is-active",selected);el.setAttribute("aria-pressed",String(selected));});
    if(update){const url=new URL(location.href);if(active==="rules")url.searchParams.delete("shopTab");else url.searchParams.set("shopTab",active);history.replaceState(null,"",url);window.scrollTo(0,0);document.dispatchEvent(new Event("gas-shop-page-change"));}
  };
  buttons.forEach(button=>button.addEventListener("click",()=>show(button.dataset.weeklyTab,true)));
  show(new URLSearchParams(location.search).get("shopTab"));
  if (window.parent === window) {
    let source;try {source=JSON.parse(doc.querySelector("[data-weekly-ui-data]").textContent);} catch {return;}
    if (!source.uiRules?.length) return;
    const style=document.createElement("link");style.rel="stylesheet";style.href="assets/editor.css?v=20261030-weekly-ui";document.head.append(style);
    doc.querySelectorAll("[data-weekly-reference-only]").forEach(el=>{el.hidden=true;});
    const card=doc.querySelector("[data-shop-ui-rules]");card.hidden=false;
    let screenId="main",selectedId=1,expandedPopupKey="",expandedNestedPopupKey="";
    const render=()=>renderShopUiRulesCard(card,source,{editable:false,screenId,selectedId,expandedPopupKey,expandedNestedPopupKey,
      onSelectScreen(id,jump={}){screenId=id;selectedId=jump.ruleId||1;expandedPopupKey=jump.popupKey||"";expandedNestedPopupKey=jump.nestedPopupKey||"";render();},
      onSelect(id){selectedId=id;expandedPopupKey="";expandedNestedPopupKey="";render();},
      onTogglePopup(key){expandedPopupKey=expandedPopupKey===key?"":key;expandedNestedPopupKey="";render();},
      onToggleNestedPopup(key){expandedNestedPopupKey=expandedNestedPopupKey===key?"":key;render();}
    });render();
  }
}
