// 人才界面资料：沿用洗车行 / 关卡的 uiRules + uiScreens + rule.popup 模型。
// 参考图来自用户的《美术相关.xlsx》；图内旧名不是新项目文案。
import { talentScreens } from "./talent-system-data.js";

const sources = Object.fromEntries(talentScreens.map((screen) => [screen.id, screen]));
const image = (number) => `assets/talent-reference/${String(number).padStart(2, "0")}.jpeg`;
const entry = (label, text, popup) => ({ label, text, ...(popup ? { popup } : {}) });
const area = (id, title, summary, x, y, rules) => ({ id, title, summary, x, y, rules });
const sourceRule = (screenId, label, popup, ruleLabel = "显示与交互") => {
  const found = sources[screenId].rules.find((rule) => rule[0] === label);
  if (!found) throw new Error(`人才界面规则缺少：${screenId}/${label}`);
  return entry(ruleLabel, found[1], popup);
};
const popupFrom = (screenId, number, nested = {}) => {
  const source = sources[screenId];
  return {
    id: screenId,
    title: source.title.replace("（名称待确认）", "（待确认）"),
    summary: source.intro,
    image: image(number),
    rules: source.rules.map(([label, text]) => entry(label, text, nested[label])),
  };
};

const trainingSkill = popupFrom("training-skill", 10);
const starSuccess = popupFrom("star-success", 11);
const trainingTalent = popupFrom("training-talent", 9, {
  "技能分页": trainingSkill,
  "进修消耗": starSuccess,
});
const story = popupFrom("story", 13);
const bond = popupFrom("bond", 14);
const attributes = popupFrom("attributes", 15);
const clothingHalo = popupFrom("clothing-halo", 18);
const skillDescription = {
  id: "skill-description",
  title: "人才技能说明",
  summary: "点击详情页底部的技能图标后，在图标上方向上展开当前技能说明。截图中的旧称只供定位。",
  image: "assets/talent-reference/19-skill-description.png",
  rules: [
    entry("技能名称与等级", "展示所选技能图标、名称和当前等级；数据取当前人才已拥有的技能及原技能配置。截图示例的旧人物名、旧技能名不作为新项目文案。"),
    entry("技能效果", "展示该技能当前等级的适用对象、触发条件及加成数值；按原技能配置读取和计算。原图中的“门客”在本项目显示为“人才”，不把截图示例的百分比写成固定值。"),
  ],
};

const listRules = [
  area(1, "标题与说明", "显示人才列表入口及规则说明。", 33, 3, [
    entry("显示内容", "界面标题固定显示【人才列表】；标题为显示信息，不承担筛选或排序。"),
    sourceRule("list", "说明入口"),
  ]),
  area(2, "排序", "选择人才卡片的排列方式。", 18, 7, [sourceRule("list", "排序与显示")]),
  area(3, "人才总赚钱", "展示已拥有人才的赚钱汇总。", 56, 7, [sourceRule("list", "人才总赚钱")]),
  area(4, "人才卡片", "同一列表区域呈现已拥有与未拥有状态。", 52, 40, [
    sourceRule("list", "已拥有人才卡片", null, "已拥有状态"),
    sourceRule("list", "未拥有人才卡片", null, "未拥有状态"),
  ]),
  area(5, "类别筛选", "单字人才类别筛选，不改店铺类别。", 54, 85, [sourceRule("list", "类别筛选")]),
  area(6, "底部导航", "保留原系统的列表返回与其他主导航位置。", 49, 96, [
    entry("点击反馈", "点击其他主导航入口离开人才列表；返回人才列表时重新读取当前人才、排序与筛选状态，具体记忆方式沿用原实现。"),
  ]),
];

const detailRules = [
  area(1, "人才立绘与切换", "展示当前人才立绘，左右切换其他人才。", 50, 43, [sourceRule("detail", "人物信息")]),
  area(2, "故事", "打开当前人才的故事弹窗。", 91, 9, [sourceRule("detail", "故事", story, "点击弹窗")]),
  area(3, "缘分", "打开当前人才的伙伴缘分弹窗。", 91, 16, [sourceRule("detail", "缘分", bond, "点击弹窗")]),
  area(4, "进修", "升星与天赋、技能预览入口。", 11, 55, [sourceRule("detail", "进修", trainingTalent, "点击弹窗")]),
  area(5, "赚钱、等级与潜力", "显示当前养成属性，属性数据统一取原计算。", 29, 75, [
    entry("显示内容", "展示当前赚钱、等级与潜力；数值随养成成功结算刷新，不使用截图数值作为默认值。"),
  ]),
  area(6, "属性详情", "由潜力旁的放大镜打开分项属性。", 46, 78, [sourceRule("detail", "属性详情", attributes, "点击弹窗")]),
  area(7, "升级操作", "显示升级消耗与批量选项。", 84, 79, [sourceRule("detail", "升级")]),
  area(8, "养成分页", "升级、技能、专长与光环切换。", 59, 96, [sourceRule("detail", "养成分页")]),
  area(9, "人才名称与星级", "独立标出姓名、品质、类别及星级展示区。", 18, 24, [
    entry("名称与类别", "左侧竖排显示当前人才的名称、品质与类别标识；内容取当前人才配置，切换人才后同步刷新。截图中的旧人物名不作为新项目文案。"),
    entry("星级状态", "名称旁按当前人才星级点亮对应星位，未达到的星位保持未点亮状态；星级与上限沿用原进修配置，进修成功后刷新。"),
  ]),
  area(10, "携带咬咬鳄", "显示当前人才携带的咬咬鳄，并关联幸运屋列表。", 10, 65, [
    entry("携带展示", "显示当前人才携带的咬咬鳄图标及图标上的等级、状态标识；携带关系和显示数据以【咬咬鳄幸运屋】系统为准，本页不另算。未携带时的占位表现待确认。"),
    entry("点击关联", "点击图标弹出咬咬鳄列表。列表的查看、选择、替换和携带规则关联【咬咬鳄幸运屋】系统；此处只定义入口及关闭列表后返回当前人才详情，不重复编写列表内部规则。"),
  ]),
  area(11, "人才技能图标", "展示当前人才的技能，并向上展开所选技能说明。", 29, 85, [
    entry("图标展示", "底部横排显示当前人才已拥有的技能图标及其等级、状态；数据沿用原技能与人才养成配置，相关养成成功后刷新。"),
    entry("点击展开", "点击任一技能图标，在图标区域上方向上展开当前所选技能的说明层；说明内容跟随所选图标更新。同一时刻只显示一个说明层；再次点击或点击空白处的收起方式待确认。", skillDescription),
  ]),
];

const skillRules = [
  area(1, "技能图标区", "选择技能并显示星级解锁状态。", 49, 68, [sourceRule("skill", "技能选择"), sourceRule("skill", "解锁状态")]),
  area(2, "技能效果", "显示当前等级效果与下一等级预览。", 44, 81, [entry("效果数据", "当前与下一等级的效果读取原技能与技能升级配置；锁定技能只展示解锁条件。")]),
  area(3, "升级", "按配置扣除道具并升级选中技能。", 82, 87, [sourceRule("skill", "升级操作")]),
  area(4, "底部分页", "切换升级、专长和光环。", 56, 96, [sourceRule("skill", "分页切换")]),
];

const specialtyRules = [
  area(1, "专长图标区", "旧百业技能组，显示已解锁专长。", 30, 68, [sourceRule("specialty", "专长列表")]),
  area(2, "潜力效果", "展示当前与下一级专长的潜力变化。", 34, 81, [entry("显示内容", "展示选中专长的当前潜力效果与下一级效果；数值仍按原技能配置，不因分页改名而另算。")]),
  area(3, "升级", "消耗原配置道具，支持原十连操作。", 82, 87, [sourceRule("specialty", "专长升级")]),
  area(4, "暂定名称", "玩家可见名词尚待确认。", 72, 96, [sourceRule("specialty", "命名边界")]),
];

const haloRules = [
  area(1, "光环列表", "显示当前人才对应光环。", 15, 68, [sourceRule("halo", "光环条目")]),
  area(2, "解锁条件", "按皮肤或光环条件区分激活状态。", 48, 82, [sourceRule("halo", "解锁提示")]),
  area(3, "底部分页", "光环页与其他养成页互相切换。", 88, 96, [entry("切换反馈", "点击底部其他分页只切换下方养成内容，顶部当前人才与属性保持同步。")]),
];

const unownedRules = [
  area(1, "人才预览", "未拥有时展示人物形象、品质和类别。", 38, 26, [sourceRule("unowned", "基础预览")]),
  area(2, "潜力与获取途径", "展示初始潜力及具体获得方式。", 43, 55, [sourceRule("unowned", "获取途径")]),
  area(3, "招募", "条件满足时执行原招募流程。", 84, 49, [sourceRule("unowned", "招募")]),
  area(4, "天赋与技能预览", "未拥有状态仅预览，不执行养成。", 47, 80, [entry("状态边界", "天赋与技能图标可以展示基础资料；未拥有前不提供升级和进修扣费操作。")]),
];

const skinBasicRules = [
  area(1, "当前外观", "立绘和效果说明随选中皮肤变化。", 50, 37, [sourceRule("skin-basic", "皮肤选择")]),
  area(2, "皮肤列表", "显示默认与已获得皮肤的穿戴状态。", 29, 81, [entry("状态显示", "默认外观与已获得皮肤显示可选择状态；当前穿戴的皮肤加状态标识。未获得皮肤展示原获取条件。")]),
  area(3, "穿戴", "无效果皮肤只改变外观。", 50, 95, [sourceRule("skin-basic", "穿戴"), sourceRule("skin-basic", "效果区")]),
  area(4, "返回", "返回当前人才详情。", 8, 95, [sourceRule("skin-basic", "返回")]),
];

const skinEffectRules = [
  area(1, "当前皮肤", "具备属性效果的外观与穿戴状态。", 43, 35, [sourceRule("skin-effect", "穿戴与升级")]),
  area(2, "升级效果", "展示当前与下一级效果及强化等级。", 51, 66, [sourceRule("skin-effect", "效果预览")]),
  area(3, "皮肤选择", "切换默认或有效果皮肤。", 27, 80, [entry("选择反馈", "点击皮肤缩略图后，立绘、穿戴状态、当前效果与升级消耗同步切换到该皮肤。")]),
  area(4, "升级", "消耗重复皮肤材料提升效果。", 51, 95, [sourceRule("skin-effect", "穿戴与升级", null, "消耗与反馈")]),
  area(5, "服装光环", "查看当前皮肤的阶段光环效果。", 91, 53, [sourceRule("skin-effect", "服装光环", clothingHalo, "点击弹窗")]),
  area(6, "主题羁绊", "跨时尚中心入口，规则待联动。", 91, 45, [sourceRule("skin-effect", "主题羁绊")]),
];

const makeScreen = (id, title, number, rules) => ({
  id, title, uiScreenTitle: title, uiRulesTitle: `${title}｜界面规则`,
  uiRuleIntro: `左侧为《赘婿》原界面参考图；点击图上编号或右侧编号查看对应区域。图中文字不作为《破产双胞胎》的最终包装。`,
  uiRuleImage: image(number), uiRuleImageHasLabels: false, uiRules: rules,
});

export const talentUiDocument = {
  id: "talent-system",
  title: "人才系统",
  summary: "原门客养成结构与交互，按《破产双胞胎》人才包装呈现；底层配置不改。",
  uiRuleImage: image(1),
  uiRulesTitle: "人才列表｜界面规则",
  uiRuleIntro: "左侧为《赘婿》原人才列表参考图；点击图上编号或右侧编号查看对应区域。原图旧名只作定位参考。",
  uiRuleImageHasLabels: false,
  uiRules: listRules,
  uiScreens: [
    makeScreen("detail", "人才详情·升级", 2, detailRules),
    makeScreen("skill", "技能", 6, skillRules),
    makeScreen("specialty", "专长（待确认）", 7, specialtyRules),
    makeScreen("halo", "光环", 8, haloRules),
    makeScreen("unowned", "人才详情·未拥有", 12, unownedRules),
    makeScreen("skin-basic", "皮肤·无效果", 16, skinBasicRules),
    makeScreen("skin-effect", "皮肤·有效果", 17, skinEffectRules),
  ],
};
