const app = getApp();
const { isStudentRole, canUseManagerScoreTools, navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { canScore: canScorePerm } = require('../../utils/permission.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function tabBarInit(page) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().init();
  }
}

function computeAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';

function getAvatarUrl(userInfo) {
  if (!userInfo) return AVATAR_DEFAULT;
  if (userInfo.photoUrl) return userInfo.photoUrl;
  if (userInfo.gender === '女') return AVATAR_FEMALE;
  if (userInfo.gender === '男') return AVATAR_MALE;
  return AVATAR_DEFAULT;
}

/** 简易防抖：延迟执行，重复调用时重置计时器 */
function debounce(fn, wait) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, wait);
  };
}

const SECTOR_CONFIGS = {
  ACC02_32: {
    name: 'ACC02、ACC32扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '保证与掌控间隔能力', maxScore: 10, minScore: 7, items: [
        { id: 'i1', name: '不违反间隔标准', maxScore: 0, description: '小于区管中心间隔标准直接判定"不合格"' },
        { id: 'i2', name: '不浪费间隔', maxScore: 5, description: '引导过大或调速不当导致间隔浪费，如调配后进港间隔>30km、侧向/顺向穿越>30km等逐次扣分' },
        { id: 'i3', name: '正确理解并运用间隔规定', maxScore: 5, description: 'SHZ以北进港航班同航线或分散>15km两机无影响，其余按日常工作规定，违反间隔规定逐次扣分' }
      ]},
      { id: 'c2', name: '调配能力和管制意识', maxScore: 20, minScore: 14, items: [
        { id: 'i4', name: '满足管制协议和限制', maxScore: 6, description: '进港高度偏高或间隔不够、违反移交协议、民航限制等逐个扣分' },
        { id: 'i5', name: '主动管制，及时准确合理调配冲突不造成被动局面', maxScore: 8, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i6', name: '扇区边界意识，扇区边界引导或改变高度提前通报', maxScore: 1, description: '带冲突移交扣分，不提前通报2次含以上扣分' },
        { id: 'i7', name: '管制指令的优先级次序', maxScore: 3, description: '能够平衡好冲突调配，脱波移交等指令之间的优先次序' },
        { id: 'i8', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i9', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c3', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i10', name: '及时识别接收或转频脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i11', name: '时刻保持对于航空器动态的监控', maxScore: 4, description: '及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）' },
        { id: 'i12', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）' },
        { id: 'i13', name: '及时发现其他活动或不明活动', maxScore: 2, description: '制作TAG，利用技防手段进行冲突提醒' },
        { id: 'i14', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' }
      ]},
      { id: 'c4', name: '指令效率和到位率', maxScore: 4, minScore: 2, items: [
        { id: 'i15', name: '完全不必要的指令不要过多', maxScore: 2, description: '' },
        { id: 'i16', name: '指令到位率要高', maxScore: 2, description: '未及时改变高度、调速或者给定合理的下降上升率而产生不良后果扣分' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i17', name: '雷达引导准确性', maxScore: 4, description: '航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分' },
        { id: 'i18', name: '调速合理性且不频繁增减', maxScore: 4, description: '调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分' },
        { id: 'i19', name: '熟知航空器的性能', maxScore: 2, description: '合理控制航空器水平速度、垂直速率' }
      ]},
      { id: 'c6', name: '管制预案', maxScore: 8, minScore: 5, items: [
        { id: 'i20', name: '管制预案合理且有安全余度', maxScore: 6, description: '逐次扣分' },
        { id: 'i21', name: '不频繁更改预案', maxScore: 2, description: '正确地改变预案除外，逐次扣分' }
      ]},
      { id: 'c7', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i22', name: '不发布未考虑安全余度的指令', maxScore: 5, description: '可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）' },
        { id: 'i23', name: '及时避免可能产生的安全隐患', maxScore: 3, description: '通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）' },
        { id: 'i24', name: '落实"双间隔"运用', maxScore: 2, description: '对于"三航一公"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度' }
      ]},
      { id: 'c8', name: '刚性规定和工作程序', maxScore: 17, minScore: 11, items: [
        { id: 'i25', name: '正确执行"一到六"程序', maxScore: 1, description: '' },
        { id: 'i26', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i27', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分，2次不含以上未及时取消扣分' },
        { id: 'i28', name: '合理防止TCAS告警', maxScore: 2, description: '逐次扣分' },
        { id: 'i29', name: '相似航班号防范措施', maxScore: 1, description: '逐个扣分' },
        { id: 'i30', name: '正确实施标牌高亮颜色、同色等', maxScore: 1, description: '逐个扣分' },
        { id: 'i31', name: '正确执行机组证实管制指令的工作程序', maxScore: 2, description: '' },
        { id: 'i32', name: '正确执行脱波程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i33', name: '正确执行航班识别程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i34', name: '正确执行AIDC工作程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i35', name: '正确执行主副班协同工作程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i36', name: '及时更新标牌备注栏', maxScore: 1, description: '' },
        { id: 'i37', name: '迅速发现并纠正机组复诵错误', maxScore: 2, description: '通话用语正确（逐个扣分）' }
      ]},
      { id: 'c9', name: '团队协作意识', maxScore: 6, minScore: 3, items: [
        { id: 'i38', name: '主动与ACC18管制员交流管制预案和移交高度', maxScore: 2, description: '' },
        { id: 'i39', name: '主动为相邻管制扇区提供调配便利', maxScore: 2, description: '' },
        { id: 'i40', name: '及时准确向外传递或者接收外部的信息或者需求', maxScore: 2, description: '' }
      ]},
      { id: 'c10', name: '设备操作', maxScore: 5, minScore: 3, items: [
        { id: 'i41', name: '雷达屏幕设置', maxScore: 1, description: '有遗漏或错误逐个扣分' },
        { id: 'i42', name: '规范使用电子进程单窗口和DAP窗口', maxScore: 1, description: '' },
        { id: 'i43', name: '规范使用频率和选择适当的台站', maxScore: 1, description: '' },
        { id: 'i44', name: '雷达标牌摆放合理', maxScore: 1, description: '避免交叉或重叠（逐次扣分）' },
        { id: 'i45', name: '正确规范使用ATC防护系统', maxScore: 1, description: '' }
      ]}
    ]
  },
  ACC08: {
    name: 'ACC08扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '通话及监听复诵', maxScore: 15, minScore: 10, items: [
        { id: 'i1', name: '规范使用中英文标准陆空通话用语', maxScore: 5, description: '发音标准口齿清晰，无感叹词，管制指令内容完整，无歧义' },
        { id: 'i2', name: '迅速并恰当更正自身错误指令、口误', maxScore: 2, description: '逐个扣分' },
        { id: 'i3', name: '合理掌握指令发布时机', maxScore: 4, description: '顺序恰当，根据空中不同情况控制节奏、语音、语速、语调' },
        { id: 'i4', name: '首次联系和脱波呼号规范', maxScore: 1, description: '首次联系时带本单位呼号，脱波时指明下一扇区或管制单位呼号（逐个扣分）' },
        { id: 'i5', name: '雷达引导及调速指明原因', maxScore: 1, description: '逐个扣分' },
        { id: 'i6', name: '迅速发现并纠正机组复诵错误', maxScore: 2, description: '通话用语正确（逐个扣分）' }
      ]},
      { id: 'c2', name: '刚性规定和工作程序', maxScore: 15, minScore: 10, items: [
        { id: 'i7', name: '正确执行"一到六"程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i8', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i9', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分，2次不含以上未及时取消扣分' },
        { id: 'i10', name: '合理防止TCAS告警', maxScore: 2, description: '逐次扣分' },
        { id: 'i11', name: '相似航班号防范措施', maxScore: 1, description: '逐个扣分' },
        { id: 'i12', name: '正确实施标牌高亮颜色、同色等', maxScore: 1, description: '逐个扣分' },
        { id: 'i13', name: '正确执行机组证实管制指令的工作程序', maxScore: 2, description: '' },
        { id: 'i14', name: '及时更新标牌备注栏', maxScore: 1, description: '' },
        { id: 'i15', name: '正确执行脱波程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i16', name: '正确执行航班识别程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i17', name: '正确执行AIDC工作程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i18', name: '正确执行主副班协同工作程序', maxScore: 1, description: '逐个扣分' }
      ]},
      { id: 'c3', name: '管制间隔和管制意识', maxScore: 20, minScore: 12, items: [
        { id: 'i19', name: '不违反间隔标准、正确理解并运用间隔', maxScore: 3, description: '小于区管中心间隔标准直接判定"不合格"' },
        { id: 'i20', name: '不浪费间隔', maxScore: 3, description: '引导过大或调速不当导致间隔浪费，调配后侧向、顺向穿越>30km等逐次扣分' },
        { id: 'i21', name: '满足管制协议和限制，高度安排合理', maxScore: 5, description: '逐个扣分，违反军方活动限制直接判定"不合格"' },
        { id: 'i22', name: '主动管制，及时准确合理调配冲突不造成被动局面', maxScore: 5, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i23', name: '不带冲突移交', maxScore: 1, description: '' },
        { id: 'i24', name: '扇区边界引导或改变高度提前通报', maxScore: 1, description: '带冲突移交扣分，不提前通报2次含以上扣分' },
        { id: 'i25', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i26', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c4', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i27', name: '及时识别和脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i28', name: '时刻保持对于航空器动态的监控', maxScore: 3, description: '及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）' },
        { id: 'i29', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）' },
        { id: 'i30', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' },
        { id: 'i31', name: '及时发现不明飞行', maxScore: 3, description: '制作TAG，正确处置不明飞行与航空器的冲突' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i32', name: '雷达引导准确性', maxScore: 2, description: '航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分' },
        { id: 'i33', name: '调速合理性且不频繁增减', maxScore: 1, description: '调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分' },
        { id: 'i34', name: '合理控制航空器垂直速率', maxScore: 1, description: '逐次扣分' },
        { id: 'i35', name: '管制预案合理且有安全余度', maxScore: 3, description: '逐次扣分' },
        { id: 'i36', name: '熟知航空器的性能', maxScore: 1, description: '管制决策考虑航空器性能及机载设备的性能限制' },
        { id: 'i37', name: '不频繁更改预案', maxScore: 2, description: '正确地改变预案除外，逐次扣分' }
      ]},
      { id: 'c6', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i38', name: '发布未考虑安全余度的指令', maxScore: 5, description: '可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）' },
        { id: 'i39', name: '及时避免可能产生的安全隐患', maxScore: 3, description: '通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）' },
        { id: 'i40', name: '落实"双间隔"运用', maxScore: 2, description: '对于"三航一公"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度' }
      ]},
      { id: 'c7', name: '团队协作意识', maxScore: 7, minScore: 4, items: [
        { id: 'i41', name: '主动与ACC18管制员交流管制预案和移交高度', maxScore: 2, description: '' },
        { id: 'i42', name: '主动与协调席管制员交流', maxScore: 1, description: '' },
        { id: 'i43', name: '主动为相邻管制扇区提供调配便利', maxScore: 2, description: '' },
        { id: 'i44', name: '及时准确向外传递或者接收外部的信息或者需求', maxScore: 2, description: '' }
      ]},
      { id: 'c8', name: '设备操作', maxScore: 5, minScore: 3, items: [
        { id: 'i45', name: '雷达屏幕设置', maxScore: 1, description: '有遗漏或错误逐个扣分' },
        { id: 'i46', name: '规范使用电子进程单窗口和DAP窗口', maxScore: 1, description: '' },
        { id: 'i47', name: '规范使用频率和选择适当的台站', maxScore: 1, description: '' },
        { id: 'i48', name: '正确规范使用ATC防护系统', maxScore: 1, description: '' },
        { id: 'i49', name: '雷达标牌摆放合理', maxScore: 1, description: '避免交叉或重叠（逐次扣分）' }
      ]},
      { id: 'c9', name: '应急处置', maxScore: 8, minScore: 5, items: [
        { id: 'i50', name: '冲突解脱时迅速判明形势', maxScore: 3, description: '指令恰当、及时' },
        { id: 'i51', name: '特情处置程序、方法符合手册流程', maxScore: 3, description: '' },
        { id: 'i52', name: '能迅速从紧急情况中恢复管制秩序', maxScore: 2, description: '' }
      ]}
    ]
  },
  ACC18_28: {
    name: 'ACC18、ACC28扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '保证与掌控间隔能力', maxScore: 10, minScore: 7, items: [
        { id: 'i1', name: '不违反间隔标准', maxScore: 0, description: '小于区管中心间隔标准直接判定"不合格"' },
        { id: 'i2', name: '不浪费间隔', maxScore: 5, description: '引导过大或调速不当导致间隔浪费，如调配后同高度间隔>40km、侧向/顺向穿越>30km等逐次扣分' },
        { id: 'i3', name: '正确理解并运用间隔规定', maxScore: 5, description: '间隔按照日常工作规定，违反间隔规定逐次扣分，对间隔把握不准确等逐次扣分' }
      ]},
      { id: 'c2', name: '调配能力和管制意识', maxScore: 20, minScore: 14, items: [
        { id: 'i4', name: '满足管制协议和限制', maxScore: 6, description: 'DST高架桥、航线高度限制、移交协议、民航限制等逐个扣分' },
        { id: 'i5', name: '主动管制，及时准确合理调配冲突不造成被动局面', maxScore: 8, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i6', name: '扇区边界意识，扇区边界引导或改变高度提前通报', maxScore: 1, description: '带冲突移交扣分，不提前通报2次含以上扣分' },
        { id: 'i7', name: '管制指令的优先级次序', maxScore: 3, description: '能够平衡好冲突调配，脱波移交等指令之间的优先次序' },
        { id: 'i8', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i9', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c3', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i10', name: '及时识别和脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i11', name: '时刻保持对于航空器动态的监控', maxScore: 4, description: '及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）' },
        { id: 'i12', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）' },
        { id: 'i13', name: '及时发现不明飞行活动', maxScore: 2, description: '制作TAG，利用技防手段进行冲突提醒' },
        { id: 'i14', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' }
      ]},
      { id: 'c4', name: '复诵监听能力', maxScore: 4, minScore: 2, items: [
        { id: 'i15', name: '未及时发现并处置机组误听误答', maxScore: 2, description: '按航班个数每个扣1分，造成调配被动或者周边扇区调配被动扣2分' },
        { id: 'i16', name: '监听复诵过程中发现问题未及时采取措施', maxScore: 2, description: '信号明显干扰或者断续、复诵不完整不清晰未及时采取有效措施（每次扣分）' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i17', name: '雷达引导准确性', maxScore: 4, description: '航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分' },
        { id: 'i18', name: '调速合理性且不频繁增减', maxScore: 4, description: '调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分' },
        { id: 'i19', name: '熟知航空器的性能', maxScore: 2, description: '合理控制航空器水平速度、垂直速率' }
      ]},
      { id: 'c6', name: '管制预案', maxScore: 10, minScore: 7, items: [
        { id: 'i20', name: '管制预案合理且有安全余度', maxScore: 8, description: '' },
        { id: 'i21', name: '不频繁更改预案', maxScore: 2, description: '正确地改变预案除外，逐次扣分' }
      ]},
      { id: 'c7', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i22', name: '不发布未考虑安全余度的指令', maxScore: 5, description: '可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）' },
        { id: 'i23', name: '及时避免可能产生的安全隐患', maxScore: 3, description: '通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）' },
        { id: 'i24', name: '落实"双间隔"运用', maxScore: 2, description: '对于"三航一公"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度' }
      ]},
      { id: 'c8', name: '刚性规定和工作程序', maxScore: 15, minScore: 10, items: [
        { id: 'i25', name: '正确执行"一到六"程序', maxScore: 1, description: '' },
        { id: 'i26', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i27', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分，2次不含以上未及时取消扣分' },
        { id: 'i28', name: '合理防止TCAS告警', maxScore: 2, description: '逐次扣分' },
        { id: 'i29', name: '相似航班号防范措施', maxScore: 1, description: '逐个扣分' },
        { id: 'i30', name: '正确实施标牌高亮颜色、同色等', maxScore: 1, description: '逐个扣分' },
        { id: 'i31', name: '正确执行机组证实管制指令的工作程序', maxScore: 2, description: '' },
        { id: 'i32', name: '正确执行脱波程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i33', name: '正确执行航班识别程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i34', name: '正确执行AIDC工作程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i35', name: '正确执行主副班协同工作程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i36', name: '及时更新标牌备注栏', maxScore: 1, description: '' }
      ]},
      { id: 'c9', name: '团队协作意识', maxScore: 6, minScore: 3, items: [
        { id: 'i37', name: '主动与ACC02/ACC08管制员交流管制预案和移交高度', maxScore: 2, description: '' },
        { id: 'i38', name: '主动为相邻管制扇区提供调配便利', maxScore: 2, description: '' },
        { id: 'i39', name: '及时准确向外传递或者接收外部的信息或者需求', maxScore: 2, description: '' }
      ]},
      { id: 'c10', name: '设备操作', maxScore: 5, minScore: 3, items: [
        { id: 'i40', name: '雷达屏幕设置', maxScore: 1, description: '有遗漏或错误逐个扣分' },
        { id: 'i41', name: '规范使用电子进程单窗口和DAP窗口', maxScore: 1, description: '' },
        { id: 'i42', name: '规范使用频率和选择适当的台站', maxScore: 1, description: '' },
        { id: 'i43', name: '雷达标牌摆放合理', maxScore: 1, description: '避免交叉或重叠（逐次扣分）' },
        { id: 'i44', name: '正确规范使用ATC防护系统', maxScore: 1, description: '' }
      ]}
    ]
  }
};

const STUDENT_COLORS = ['#00d26a', '#60a5fa', '#ffaa00', '#ff4d4f', '#a78bfa', '#f472b6'];

function getGrade(total) {
  if (total >= 95) return { text: '优秀', color: '#00d26a' };
  if (total >= 90) return { text: '良好', color: '#ffaa00' };
  if (total >= 85) return { text: '合格', color: '#60a5fa' };
  return { text: '不合格', color: '#ff4d4f' };
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// 生成单个学员的模拟评分历史
function generateMockScores(studentId, studentName, sectorId, sectorConfigs) {
  const config = (sectorConfigs && sectorConfigs[sectorId]) || SECTOR_CONFIGS[sectorId];
  if (!config) return [];

  const rand = seededRandom(studentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const baseLevel = 0.62 + rand() * 0.25;
  const offsets = config.categories.map(() => (rand() - 0.5) * 0.28);
  const count = 5 + Math.floor(rand() * 4);
  const scores = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 10 - Math.floor(rand() * 5));
    const dateStr = date.toISOString().split('T')[0];
    const trend = ((count - i) / count) * 0.12;

    const catScores = config.categories.map((cat, idx) => {
      let ratio = baseLevel + trend + offsets[idx] + (rand() - 0.5) * 0.12;
      ratio = Math.min(0.98, Math.max(0.35, ratio));
      const score = Math.round(cat.maxScore * ratio);
      return { categoryId: cat.id, categoryName: cat.name, score, maxScore: cat.maxScore };
    });

    const totalScore = Math.round(catScores.reduce((s, c) => s + c.score, 0));
    scores.push({ date: dateStr, totalScore, scores: catScores });
  }
  return scores;
}

Page({
  data: {
    userInfo: null,
    canScore: false,
    isManager: false,
    students: [],
    _scoreInputTimer: null,
    _reasonInputTimer: null,

    // 教员评分
    selectedStudent: '',
    selectedStudentName: '',
    sector: 'ACC02_32',
    sectorConfig: null,
    sectorConfigLoading: false,
    sectorConfigs: {},
    sectorConfigKeys: Object.keys(SECTOR_CONFIGS),
    sectorConfigNames: Object.keys(SECTOR_CONFIGS).reduce((o, k) => { o[k] = SECTOR_CONFIGS[k].name; return o; }, {}),
    scores: {},
    scoreReasons: {},
    _reasonLengths: {},
    categoryScores: {},
    categoryColors: {},
    catRates: {},
    catRatePass: {},
    catRateWeak: {},
    weakCategories: [],
    strongCategories: [],
    totalProgressPct: 0,
    totalScore: 0,
    gradeText: '合格',
    gradeColor: '#60a5fa',
    submitting: false,
    expandedCategory: 'ALL',
    showAnalysis: false,
    showHistoryRef: false,
    historyRefData: null,
    levelLabel: '',
    avatarUrl: '',
    age: null,
    gender: '',
    groupEntryDate: '',
    icaoExpiry: '',
    medicalExpiry: '',

    // 历史评分
    scoreHistory: [],
    historyLoading: false,
    historyError: '',
    editingScoreId: '',
    toast: '',

    // ===== 数据分析 =====
    showFilterPanel: true,
    showStudentPicker: false,
    showStudentPanel: false,
    studentSearchQuery: '',
    filteredStudents: [],

    analysisConfig: {
      selectedStudentIds: [],
      selectedStudentNames: [],
      timeRange: 'all',
      startDate: '',
      endDate: '',
      stageFilter: 'all',
      sector: 'ACC02_32',
      chartType: 'radar',
      compareDimension: 'student'
    },

    timeRangeOptions: [
      { value: 'all', label: '全部时间' },
      { value: '30days', label: '最近30天' },
      { value: '90days', label: '最近90天' },
      { value: 'custom', label: '自定义' }
    ],
    stageOptions: ['全部阶段', '初阶一段', '初阶二段', '初阶三段', '中阶一段', '中阶二段', '中阶三段', '高阶一段', '高阶二段', '高阶三段'],

    pickerStudents: [],
    selectedStudentCount: 0,
    timeRangeLabel: '全部时间',
    stageFilterLabel: '全部阶段',

    analysisDatasets: [],
    chartData: null,
    insightCards: [],

    _drawingChart: false,
    roleLabel: '',
    showSubmitConfirm: false,
    confirmDeductions: [],
    confirmCategorySummary: [],

    // 评分流程
    showScoreFlow: false,
    scoreStep: 0,
    scoringCategoryIndex: 0
  },

  _refreshing: false,
  _launchTime: 0,

  onLoad(options) {
    let userInfo = getUserInfo() || {};
    const canScore = canScorePerm(userInfo);
    const isManager = userInfo && canUseManagerScoreTools(userInfo.role);
    const roleLabel = getRoleLabel(userInfo.role);
    const levelLabel = normalizeInstructorLevel(userInfo && (userInfo.instructorLevel || userInfo.level));

    const lastSector = wx.getStorageSync('lastSelectedSectorId');
    const lastStudent = wx.getStorageSync('lastSelectedStudentId');
    const initialSector = lastSector || 'ACC02_32';

    this.setData({
      userInfo,
      canScore,
      isManager,
      roleLabel,
      levelLabel,
      avatarUrl: getAvatarUrl(userInfo),
      age: computeAge(userInfo && userInfo.birthDate),
      gender: (userInfo && userInfo.gender) || '',
      groupEntryDate: formatDate(userInfo && userInfo.groupEntryDate),
      icaoExpiry: formatDate(userInfo && userInfo.icaoExpiry),
      medicalExpiry: formatDate(userInfo && userInfo.medicalExpiry),
      sector: initialSector
    });

    if (canScore || isManager) {
      this.loadStudents().then(() => {
        if (lastStudent) {
          const student = this.data.students.find(s => s.userId === lastStudent);
          if (student) {
            this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
            if (canScore) this.loadHistory();
          }
        }
      });
    }
    if (canScore) {
      this.loadSectorConfigs();
      this.loadHistory();
    }
    if (isManager) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      this.setData({
        'analysisConfig.sector': 'ACC02_32',
        'analysisConfig.startDate': thirtyDaysAgo.toISOString().split('T')[0],
        'analysisConfig.endDate': today
      });
    }
    this._launchTime = Date.now();
    if (options && options.preselectStudent) this._preselectStudent = options.preselectStudent;
    if (options && options.preselectSector) this._preselectSector = options.preselectSector;
  },

  onChooseAvatar(e) {
    const tempUrl = e.detail.avatarUrl;
    if (!tempUrl) return;
    wx.showLoading({ title: '上传中' });
    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl || ''}/upload/avatar`,
      filePath: tempUrl,
      name: 'file',
      header: {
        'Authorization': wx.getStorageSync('token') || ''
      },
      success: (upRes) => {
        let data = upRes.data;
        try { data = JSON.parse(data); } catch (err) {}
        if (data && data.url) {
          const u = this.data.userInfo || {};
          u.photoUrl = data.url;
          this.setData({ avatarUrl: data.url, userInfo: u });
          wx.showToast({ title: '上传成功', icon: 'success' });
        } else {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
      complete: () => wx.hideLoading()
    });
  },

  onShow() {
    const userInfo = app.globalData.userInfo;
    if (userInfo && isStudentRole(userInfo.role)) {
      wx.switchTab({ url: '/pages/mygrades/mygrades' });
      return;
    }
    try { wx.enableAlertBeforeUnload({ message: '评分数据将丢失，确定退出？' }); } catch (e) {}
    tabBarInit(this);

    // 处理从其他页面通过 switchTab 传递的参数
    const pending = app.globalData.pendingTabParams;
    if (pending) {
      app.globalData.pendingTabParams = null;
      if (pending.preselectStudent && this.data.students && this.data.students.length) {
        const student = this.data.students.find(s => s.userId === pending.preselectStudent);
        if (student) {
          this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
          this.loadHistory();
        }
      }
      if (pending.preselectSector && this.data.sectorConfigs) {
        const sectorExists = this.data.sectorConfigs[pending.preselectSector];
        if (sectorExists) {
          this.setData({ sector: pending.preselectSector });
          wx.setStorageSync('lastSelectedSectorId', pending.preselectSector);
        }
      }
    }

    // 防抖 + 启动保护（onLoad 完成后2秒内不重复加载）
    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    if (this.data.canScore || this.data.isManager) {
      const self = this;
      this._refreshing = true;
      (this.loadSectorConfigs() || Promise.resolve()).finally(function () { self._refreshing = false; });
    }
  },

  async loadStudents() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/students' }));
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (res && Array.isArray(res.data)) list = res.data;
      else if (res && Array.isArray(res.items)) list = res.items;
      this.setData({ students: list });
    } catch (e) {
      this.setData({ students: [] });
    }
    if (this._preselectStudent) {
      const student = this.data.students.find(s => s.userId === this._preselectStudent);
      if (student) {
        this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
        this.loadHistory();
      }
      this._preselectStudent = null;
    }
  },

  preprocessConfig(config) {
    if (!config || !config.categories) return config;
    const r = Object.assign({}, config);
    r.categories = config.categories.map(function(cat) {
      const o = Object.assign({}, cat);
      o.items = (cat.items || []).map(function(item) {
        const quick = [];
        for (let qi = 0; qi <= item.maxScore; qi++) quick.push(qi);
        const r2 = Object.assign({}, item, { _quickScores: quick });
        return r2;
      });
      return o;
    });
    return r;
  },

  async loadSectorConfigs() {
    this.setData({ sectorConfigLoading: true });
    let configs = {};
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        res.data.forEach(s => { configs[s.sectorId] = this.preprocessConfig(s); });
      } else if (res && res.success && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
        res.data.items.forEach(s => { configs[s.sectorId] = this.preprocessConfig(s); });
      }
    } catch (e) {
      console.error('加载扇区配置失败', e);
    }
    if (Object.keys(configs).length === 0) {
      Object.keys(SECTOR_CONFIGS).forEach(k => {
        configs[k] = this.preprocessConfig(SECTOR_CONFIGS[k]);
      });
    }
    const keys = Object.keys(configs);
    const names = keys.reduce((o, k) => { o[k] = configs[k].name; return o; }, {});
    const sectorConfig = configs[this.data.sector] || configs[keys[0]];
    this.setData({ sectorConfigs: configs, sectorConfigKeys: keys, sectorConfigNames: names, sectorConfig, sectorConfigLoading: false });
    this.updateTotal();
    if (this._preselectSector && configs[this._preselectSector]) {
      const sector = this._preselectSector;
      const config = configs[sector] || this.preprocessConfig(SECTOR_CONFIGS[sector]);
      this.setData({ sector, sectorConfig: config, scores: {}, scoreReasons: {}, _reasonLengths: {}, expandedCategory: null, weakCategories: [], strongCategories: [], editingScoreId: '' });
      this.updateTotal();
      this.loadHistory();
      this._preselectSector = null;
    }
  },

  // ============ 教员评分方法 ============
  onStudentChange(e) {
    const student = this.data.students[e.detail.value];
    this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
    wx.setStorageSync('lastSelectedStudentId', student.userId);
    this.loadHistory();
  },
  switchSector(e) {
    const sector = e.currentTarget.dataset.sector;
    const config = this.data.sectorConfigs[sector] || this.preprocessConfig(SECTOR_CONFIGS[sector]);
    this.setData({ sector, sectorConfig: config, scores: {}, scoreReasons: {}, _reasonLengths: {}, expandedCategory: null, weakCategories: [], strongCategories: [], editingScoreId: '' });
    wx.setStorageSync('lastSelectedSectorId', sector);
    this.updateTotal();
    this.loadHistory();
  },
  openStudentPanel() {
    this.setData({ showStudentPanel: true, studentSearchQuery: '', filteredStudents: this.data.students });
  },
  closeStudentPanel() {
    this.setData({ showStudentPanel: false, studentSearchQuery: '', filteredStudents: [] });
  },
  onStudentSearch(e) {
    const query = (e.detail.value || '').trim().toLowerCase();
    const students = this.data.students;
    const filtered = query ? students.filter(s => (s.name || '').toLowerCase().indexOf(query) > -1) : students;
    this.setData({ studentSearchQuery: e.detail.value || '', filteredStudents: filtered });
  },
  selectStudentFromPanel(e) {
    const studentId = e.currentTarget.dataset.id;
    const student = this.data.students.find(s => s.userId === studentId);
    if (!student) return;
    this.setData({
      selectedStudent: student.userId,
      selectedStudentName: student.name,
      showStudentPanel: false,
      studentSearchQuery: '',
      filteredStudents: []
    });
    wx.setStorageSync('lastSelectedStudentId', student.userId);
    this.loadHistory();
  },

  // ========== 评分流程 ==========
  startScoreFlow() {
    this.setData({
      showScoreFlow: true,
      scoreStep: 1,
      selectedStudent: '',
      selectedStudentName: '',
      scores: {},
      scoreReasons: {},
      _reasonLengths: {},
      expandedCategory: null,
      weakCategories: [],
      strongCategories: [],
      editingScoreId: '',
      scoringCategoryIndex: 0
    }, () => this.updateTotal());
  },
  closeScoreFlow() {
    this.setData({ showScoreFlow: false, scoreStep: 0, scoringCategoryIndex: 0 });
  },
  nextStep() {
    const step = this.data.scoreStep;
    if (step === 1 && !this.data.selectedStudent) {
      wx.showToast({ title: '请先选择学员', icon: 'none' });
      return;
    }
    if (step === 2 && !this.data.sector) {
      wx.showToast({ title: '请先选择扇区', icon: 'none' });
      return;
    }
    if (step === 3) {
      const categories = this.data.sectorConfig ? this.data.sectorConfig.categories || [] : [];
      const idx = this.data.scoringCategoryIndex;
      if (idx < categories.length - 1) {
        this.setData({ scoringCategoryIndex: idx + 1 });
      }
      return;
    }
    if (step < 3) {
      this.setData({ scoreStep: step + 1, scoringCategoryIndex: 0 });
    }
  },
  prevStep() {
    const step = this.data.scoreStep;
    if (step === 3) {
      const idx = this.data.scoringCategoryIndex;
      if (idx > 0) {
        this.setData({ scoringCategoryIndex: idx - 1 });
        return;
      }
    }
    if (step > 1) {
      this.setData({ scoreStep: step - 1 });
    }
  },
  selectStudentInFlow(e) {
    const studentId = e.currentTarget.dataset.id;
    const student = this.data.students.find(s => s.userId === studentId);
    if (!student) return;
    this.setData({
      selectedStudent: student.userId,
      selectedStudentName: student.name
    });
    wx.setStorageSync('lastSelectedStudentId', student.userId);
    this.loadHistory();
  },
  selectSectorInFlow(e) {
    const sector = e.currentTarget.dataset.sector;
    const config = this.data.sectorConfigs[sector] || this.preprocessConfig(SECTOR_CONFIGS[sector]);
    this.setData({
      sector,
      sectorConfig: config,
      scores: {},
      scoreReasons: {},
      _reasonLengths: {},
      expandedCategory: null,
      weakCategories: [],
      strongCategories: [],
      editingScoreId: ''
    });
    wx.setStorageSync('lastSelectedSectorId', sector);
    this.updateTotal();
    this.loadHistory();
  },
  onScoreInput(e) {
    const { cat, item, max } = e.currentTarget.dataset;
    let val = parseInt(e.detail.value, 10);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > max) val = max;
    if (this._scoreInputTimer) clearTimeout(this._scoreInputTimer);
    this._scoreInputTimer = setTimeout(() => {
      const _sd = {};
      _sd['scores.' + cat + '_' + item] = val;
      this.setData(_sd, () => this.updateTotal());
      this._scoreInputTimer = null;
    }, 150);
  },
  onQuickScore(e) {
    const { cat, item, max, val } = e.currentTarget.dataset;
    let deduction = parseInt(val, 10);
    if (isNaN(deduction)) deduction = 0;
    if (deduction < 0) deduction = 0;
    let maxVal = parseInt(max, 10);
    if (isNaN(maxVal)) maxVal = 0;
    if (deduction > maxVal) deduction = maxVal;
    const actualScore = maxVal - deduction;
    const _sd2 = {};
    _sd2['scores.' + cat + '_' + item] = actualScore;
    this.setData(_sd2, () => this.updateTotal());
  },
  quickScoreItem(e) {
    const { cat, item, val } = e.currentTarget.dataset;
    const _sd = {};
    _sd['scores.' + cat + '_' + item] = parseInt(val, 10);
    this.setData(_sd, () => this.updateTotal());
  },
  onReasonInput(e) {
    const { cat, item } = e.currentTarget.dataset;
    const val = e.detail.value || '';
    if (this._reasonInputTimer) clearTimeout(this._reasonInputTimer);
    this._reasonInputTimer = setTimeout(() => {
      const _sd3 = {};
      _sd3['scoreReasons.' + cat + '_' + item] = val;
      _sd3['_reasonLengths.' + cat + '_' + item] = val.length;
      this.setData(_sd3);
      this._reasonInputTimer = null;
    }, 200);
  },
  toggleCategory(e) {
    const catId = e.currentTarget.dataset.cat;
    const current = this.data.expandedCategory;
    const isExpanded = current === 'ALL' || current === catId;
    this.setData({ expandedCategory: isExpanded ? null : catId });
  },
  toggleAnalysis() {
    this.setData({ showAnalysis: !this.data.showAnalysis });
  },
  toggleHistoryRef() {
    this.setData({ showHistoryRef: !this.data.showHistoryRef });
  },
  computeHistoryRef(studentId) {
    const history = this.data.scoreHistory;
    if (!history || history.length === 0) {
      this.setData({ historyRefData: null });
      return;
    }
    const recent3 = history.slice(0, 3);
    const recentScores = recent3.map(h => h.totalScore).reverse().join('→');
    const avgScore = Math.round(history.reduce((s, h) => s + h.totalScore, 0) / history.length * 10) / 10;
    let weakCategory = '';
    const latest = history[0];
    if (latest && latest.scores && latest.scores.length > 0) {
      let minRate = 1;
      latest.scores.forEach(s => {
        if (s.maxScore > 0) {
          const rate = s.score / s.maxScore;
          if (rate < minRate) {
            minRate = rate;
            weakCategory = s.categoryName;
          }
        }
      });
    }
    this.setData({ historyRefData: { recentScores, avgScore, weakCategory } });
  },
  getCategoryScore(cat) {
    return cat.items.reduce((sum, item) => sum + (this.data.scores[`${cat.id}_${item.id}`] || 0), 0);
  },
  updateTotal() {
    const config = this.data.sectorConfig;
    if (!config) return;
    const categoryScores = {};
    const categoryColors = {};
    const catRates = {};
    const catRatePass = {};
    const catRateWeak = {};
    const weakCategories = [];
    const strongCategories = [];
    let total = 0;
    config.categories.forEach(cat => {
      const score = cat.items.reduce((sum, item) => sum + (this.data.scores[`${cat.id}_${item.id}`] || 0), 0);
      categoryScores[cat.id] = score;
      total += score;
      const rate = cat.maxScore > 0 ? Math.round((score / cat.maxScore) * 100) : 0;
      catRates[cat.id] = rate;
      const isPass = cat.minScore != null ? score >= cat.minScore : score >= cat.maxScore * 0.75;
      catRatePass[cat.id] = isPass;
      catRateWeak[cat.id] = rate < 60;
      if (rate < 60) {
        weakCategories.push({ id: cat.id, name: cat.name, score, maxScore: cat.maxScore, minScore: cat.minScore, rate });
      }
      if (rate >= 90) {
        strongCategories.push({ id: cat.id, name: cat.name, score, maxScore: cat.maxScore, rate });
      }
      let color;
      if (cat.minScore != null) {
        color = score >= cat.minScore ? '#00d26a' : '#ff4d4f';
      } else {
        if (score >= cat.maxScore * 0.9) color = '#00d26a';
        else if (score >= cat.maxScore * 0.75) color = '#ffaa00';
        else color = '#60a5fa';
      }
      categoryColors[cat.id] = color;
    });
    const g = getGrade(total);
    const totalProgressPct = config.totalScore ? Math.max(0, Math.min(100, Math.round((total / config.totalScore) * 100))) : 0;
    let totalItemCount = 0;
    let scoredItemCount = 0;
    config.categories.forEach(cat => {
      cat.items.forEach(item => {
        totalItemCount++;
        const key = cat.id + '_' + item.id;
        if (this.data.scores[key] !== undefined && this.data.scores[key] !== null && this.data.scores[key] !== '') {
          scoredItemCount++;
        }
      });
    });
    const maxTotalScore = config.totalScore || 100;
    const scoredPct = totalItemCount > 0 ? Math.round((scoredItemCount / totalItemCount) * 100) : 0;
    this.setData({ totalScore: total, gradeText: g.text, gradeColor: g.color, categoryScores, categoryColors, catRates, catRatePass, catRateWeak, weakCategories, strongCategories, totalProgressPct, scoredItemCount, totalItemCount, maxTotalScore, scoredPct });
  },
  async submitScore() {
    if (this.data.submitting) {
      wx.showToast({ title: '提交中，请稍候', icon: 'none' });
      return;
    }
    if (!this.data.selectedStudent) {
      wx.pageScrollTo({ selector: '.score-card-gradient', duration: 300 });
      wx.showToast({ title: '请先选择学员', icon: 'none' });
      return;
    }
    const config = this.data.sectorConfig;
    for (const cat of config.categories) {
      for (const item of cat.items) {
        if (!item.maxScore || item.maxScore <= 0) continue;
        const key = `${cat.id}_${item.id}`;
        const itemScore = this.data.scores[key] || 0;
        if (itemScore < item.maxScore) {
          const reason = String(this.data.scoreReasons[key] || '').trim();
          if (!reason) {
            this.setData({ expandedCategory: cat.id });
            wx.showToast({ title: `请填写【${cat.name} - ${item.name}】的扣分说明`, icon: 'none', duration: 3000 });
            return;
          }
        }
      }
    }
    const deductions = [];
    const catSummary = [];
    config.categories.forEach(cat => {
      const catScore = this.getCategoryScore(cat);
      catSummary.push({ name: cat.name, score: catScore, maxScore: cat.maxScore, rate: cat.maxScore > 0 ? Math.round(catScore / cat.maxScore * 100) : 0 });
      (cat.items || []).forEach(item => {
        const key = cat.id + '_' + item.id;
        const score = this.data.scores[key];
        if (score !== undefined && score < item.maxScore) {
          deductions.push({ name: item.name, deduct: item.maxScore - score, reason: this.data.scoreReasons[key] || '' });
        }
      });
    });
    this.setData({ showSubmitConfirm: true, confirmDeductions: deductions, confirmCategorySummary: catSummary });
  },

  cancelSubmit() {
    this.setData({ showSubmitConfirm: false });
  },

  async confirmSubmit() {
    this.setData({ showSubmitConfirm: false });
    const config = this.data.sectorConfig;
    const totalScore = config.categories.reduce((sum, cat) => sum + this.getCategoryScore(cat), 0);
    const grade = getGrade(totalScore);
    const student = this.data.students.find(s => s.userId === this.data.selectedStudent);
    const payload = {
      studentId: this.data.selectedStudent,
      studentName: student && student.name,
      sectorId: this.data.sector,
      sectorName: config.name,
      instructorId: this.data.userInfo && this.data.userInfo.userId,
      instructorName: this.data.userInfo && this.data.userInfo.name,
      date: formatDate(new Date()),
      scores: config.categories.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        score: this.getCategoryScore(cat),
        maxScore: cat.maxScore
      })),
      itemDetails: config.categories.flatMap(cat =>
        (cat.items || []).map(item => {
          const key = `${cat.id}_${item.id}`;
          const itemScore = this.data.scores[key] || 0;
          const reason = String(this.data.scoreReasons[key] || '').trim();
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            itemId: item.id,
            itemName: item.name,
            score: itemScore,
            maxScore: item.maxScore
          };
        })
      ),
      totalScore,
      grade: grade.text
    };
    this.setData({ submitting: true });
    try {
      if (this.data.editingScoreId) {
        await app.request({
          url: `/scores/${this.data.editingScoreId}`,
          method: 'PUT',
          data: {
            scores: payload.scores,
            itemDetails: payload.itemDetails,
            date: payload.date
          }
        });
        this.setData({ editingScoreId: '' });
      } else {
        await app.request({ url: '/scores', method: 'POST', data: payload });
      }
      const deductionItems = [];
      const categories = this.data.sectorConfig ? this.data.sectorConfig.categories || [] : [];
      categories.forEach(cat => {
        (cat.items || []).forEach(item => {
          const score = this.data.scores[cat.id + '_' + item.id];
          if (score !== undefined && score < item.maxScore) {
            deductionItems.push({ name: item.name, deduct: item.maxScore - score });
          }
        });
      });

      const totalScore = this.data.totalScore || 0;
      const comparison = this.data.scoreComparison;
      wx.redirectTo({
        url: `/pages/score-result/score-result?score=${totalScore}&categories=${encodeURIComponent(JSON.stringify(this.data.categoryScores || []))}&deductions=${encodeURIComponent(JSON.stringify(deductionItems))}&comparison=${comparison ? encodeURIComponent(JSON.stringify(comparison)) : ''}`
      });
    } catch (e) {
      wx.showToast({ title: this.data.editingScoreId ? '修改失败' : '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ============ 历史评分 ============
  async loadHistory() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.userId) return;
    this.setData({ historyLoading: true, historyError: '' });
    try {
      const res = normalizeApiResponse(await app.request({ url: `/scores/instructor/${userInfo.userId}/history` }));
      let rows = [];
      if (Array.isArray(res)) {
        rows = res;
      } else if (res && res.success && Array.isArray(res.data)) {
        rows = res.data;
      } else if (res && res.success && res.data && Array.isArray(res.data.items)) {
        rows = res.data.items;
      }
      rows = rows
        .filter(r => (this.data.selectedStudent ? r.studentId === this.data.selectedStudent : true))
        .filter(r => (this.data.sector ? r.sectorId === this.data.sector : true))
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      this.setData({ scoreHistory: rows });
    } catch (e) {
      this.setData({ scoreHistory: [], historyError: '' });
    } finally {
      this.setData({ historyLoading: false });
      this.computeHistoryRef(this.data.selectedStudent);
    }
  },

  handleStartEdit(e) {
    const scoreId = e.currentTarget.dataset.scoreId;
    const record = this.data.scoreHistory.find(r => r.scoreId === scoreId);
    if (!record || !record.scoreId) return;
    if (Number(record.editCount || 0) >= 1) {
      this.setData({ toast: '该评分已修改过一次，不能再次修改' });
      setTimeout(() => this.setData({ toast: '' }), 2500);
      return;
    }
    const nextScores = {};
    const nextReasons = {};
    const nextReasonLengths = {};
    (record.itemDetails || []).forEach(d => {
      const key = `${d.categoryId}_${d.itemId}`;
      nextScores[key] = Number(d.score || 0);
      nextReasons[key] = String(d.reason || '');
      nextReasonLengths[key] = String(d.reason || '').length;
    });
    // 切换扇区到记录对应的扇区
    const sector = record.sectorId || this.data.sector;
    const sectorConfig = this.data.sectorConfigs[sector] || this.preprocessConfig(SECTOR_CONFIGS[sector]);
    this.setData({
      scores: nextScores,
      scoreReasons: nextReasons,
      _reasonLengths: nextReasonLengths,
      selectedStudent: record.studentId || '',
      selectedStudentName: record.studentName || '',
      sector,
      sectorConfig,
      editingScoreId: record.scoreId,
      expandedCategory: 'ALL',
      toast: '已载入历史评分，可修改并提交（仅可修改一次）'
    }, () => {
      this.updateTotal();
    });
    setTimeout(() => this.setData({ toast: '' }), 2500);
  },

  cancelEdit() {
    this.setData({
      scores: {},
      scoreReasons: {},
      _reasonLengths: {},
      editingScoreId: '',
      expandedCategory: 'ALL',
      weakCategories: [],
      strongCategories: []
    }, () => {
      this.updateTotal();
    });
  },

  // ============ 数据分析 UI 控制 ============
  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel });
  },
  openStudentPicker() {
    const { students, analysisConfig } = this.data;
    const selectedIds = analysisConfig.selectedStudentIds;
    const pickerStudents = students.map(function(s) { const o = Object.assign({}, s); o.selected = selectedIds.indexOf(s.userId) > -1; return o; });
    const selectedCount = pickerStudents.filter(p => p.selected).length;
    this.setData({ showStudentPicker: true, pickerStudents, selectedStudentCount: selectedCount });
  },
  closeStudentPicker() {
    this.setData({ showStudentPicker: false });
  },
  preventClose() {
    // 阻止冒泡
  },
  toggleStudentSelection(e) {
    const { id } = e.currentTarget.dataset;
    let selectedCount = this.data.selectedStudentCount;
    const pickerStudents = this.data.pickerStudents.map(s => {
      if (s.userId === id) {
        if (!s.selected && selectedCount >= 6) {
          wx.showToast({ title: '最多选择6个学员', icon: 'none' });
          return s;
        }
        selectedCount += s.selected ? -1 : 1;
        const r3 = Object.assign({}, s, { selected: !s.selected });
        return r3;
      }
      return s;
    });
    this.setData({ pickerStudents, selectedStudentCount: selectedCount });
  },
  confirmStudentSelection() {
    const selected = this.data.pickerStudents.filter(p => p.selected);
    this.setData({
      'analysisConfig.selectedStudentIds': selected.map(s => s.userId),
      'analysisConfig.selectedStudentNames': selected.map(s => s.name),
      showStudentPicker: false
    });
  },
  removeStudent(e) {
    const idx = e.currentTarget.dataset.index;
    const ids = this.data.analysisConfig.selectedStudentIds.slice();
    const names = this.data.analysisConfig.selectedStudentNames.slice();
    ids.splice(idx, 1);
    names.splice(idx, 1);
    this.setData({
      'analysisConfig.selectedStudentIds': ids,
      'analysisConfig.selectedStudentNames': names
    });
  },
  onTimeRangeChange(e) {
    const option = this.data.timeRangeOptions[e.detail.value];
    this.setData({ 'analysisConfig.timeRange': option.value, timeRangeLabel: option.label });
  },
  onStartDateChange(e) {
    this.setData({ 'analysisConfig.startDate': e.detail.value });
  },
  onEndDateChange(e) {
    this.setData({ 'analysisConfig.endDate': e.detail.value });
  },
  onStageFilterChange(e) {
    const stage = this.data.stageOptions[e.detail.value];
    this.setData({ 'analysisConfig.stageFilter': stage, stageFilterLabel: stage });
  },
  switchAnalysisSector(e) {
    const sector = e.currentTarget.dataset.sector;
    // 扇区切换后必须重新拉取数据，清空旧图表防止数据不匹配
    this.setData({
      'analysisConfig.sector': sector,
      analysisDatasets: [],
      chartData: null,
      insightCards: []
    });
  },
  switchChartType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 'analysisConfig.chartType': type }, () => this.rebuildAnalysis());
  },
  switchCompareDimension(e) {
    const dim = e.currentTarget.dataset.dim;
    this.setData({ 'analysisConfig.compareDimension': dim }, () => this.rebuildAnalysis());
  },

  // 基于已有的 analysisDatasets 重新构建图表（切换图表类型/维度时复用，避免重复请求）
  rebuildAnalysis() {
    const { analysisDatasets, analysisConfig } = this.data;
    if (analysisDatasets.length === 0) return;
    const chartData = this.buildChartData(analysisDatasets, analysisConfig);
    const insightCards = this.buildInsights(analysisDatasets, analysisConfig);
    this.setData({ chartData, insightCards }, () => {
      wx.nextTick(() => this.drawChart());
    });
  },

  // ============ 数据分析核心逻辑 ============
  async generateAnalysis() {
    const { analysisConfig, students } = this.data;
    if (analysisConfig.selectedStudentIds.length === 0) {
      wx.showToast({ title: '请至少选择一个学员', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '分析中...', mask: true });

    try {
      const datasets = [];
      for (const studentId of analysisConfig.selectedStudentIds) {
        const student = students.find(s => s.userId === studentId);
        if (!student) continue;
        let scores = await this.fetchStudentScores(studentId, analysisConfig.sector);
        if (scores.length === 0) {
          scores = generateMockScores(studentId, student.name, analysisConfig.sector, this.data.sectorConfigs);
        }
        scores = this.filterByTimeRange(scores, analysisConfig);
        if (scores.length > 0) {
          datasets.push({ student, scores });
        }
      }

      // 阶段筛选
      let filtered = datasets;
      if (analysisConfig.stageFilter !== 'all' && analysisConfig.stageFilter !== '全部阶段') {
        filtered = datasets.filter(ds => ds.student.level === analysisConfig.stageFilter);
      }

      if (filtered.length === 0) {
        wx.showToast({ title: '没有符合条件的数据', icon: 'none' });
        this.setData({ analysisDatasets: [], chartData: null, insightCards: [] });
        wx.hideLoading();
        return;
      }

      const chartData = this.buildChartData(filtered, analysisConfig);
      const insightCards = this.buildInsights(filtered, analysisConfig);

      this.setData({
        analysisDatasets: filtered,
        chartData,
        insightCards,
        showFilterPanel: false
      }, () => {
        wx.nextTick(() => this.drawChart());
      });
    } catch (e) {
      console.error('generateAnalysis error', e);
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async fetchStudentScores(studentId, sectorId) {
    try {
      const res = normalizeApiResponse(await app.request({ url: `/scores?studentId=${studentId}&sectorId=${sectorId}` }));
      if (res && res.success && res.data && res.data.items) {
        return res.data.items.map(item => ({
          date: item.date,
          totalScore: item.totalScore,
          scores: (item.scores || []).map(s => ({
            categoryId: s.categoryId,
            categoryName: s.categoryName,
            score: s.score,
            maxScore: s.maxScore
          }))
        }));
      }
    } catch (e) {}
    return [];
  },

  filterByTimeRange(scores, config) {
    if (config.timeRange === 'all') return scores;
    const now = new Date();
    let cutoff = new Date(0);
    if (config.timeRange === '30days') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (config.timeRange === '90days') {
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (config.timeRange === 'custom' && config.startDate) {
      cutoff = new Date(config.startDate);
    }
    return scores.filter(s => new Date(s.date) >= cutoff);
  },

  buildChartData(datasets, config) {
    const { chartType, compareDimension, sector } = config;
    const sectorCfg = (this.data.sectorConfigs && this.data.sectorConfigs[sector]) || SECTOR_CONFIGS[sector];
    if (!sectorCfg) return null;

    if (chartType === 'radar') {
      return {
        type: 'radar',
        datasets: datasets.map((ds, idx) => ({
          name: ds.student.name,
          color: STUDENT_COLORS[idx % STUDENT_COLORS.length],
          scores: this._getOrderedScores(ds.scores[ds.scores.length - 1], sectorCfg)
        }))
      };
    }

    if (chartType === 'bar') {
      if (compareDimension === 'student') {
        const categories = sectorCfg.categories;
        return {
          type: 'bar',
          xLabels: categories.map(c => c.name),
          yMax: Math.max.apply(null, categories.map(function(c) { return c.maxScore; })),
          datasets: datasets.map(function(ds, idx) { return {
            name: ds.student.name,
            color: STUDENT_COLORS[idx % STUDENT_COLORS.length],
            values: this._getOrderedScores(ds.scores[ds.scores.length - 1], sectorCfg).map(function(s) { return s.score; })
          }})
        };
      }
      if (compareDimension === 'time') {
        // 每个学员的总分随时间变化，用柱状图显示
        const allDates = Array.from(new Set(datasets.flatMap(ds => ds.scores.map(s => s.date)))).sort();
        return {
          type: 'bar',
          xLabels: allDates.map(d => d.slice(5)),
          yMax: 100,
          datasets: datasets.map((ds, idx) => ({
            name: ds.student.name,
            color: STUDENT_COLORS[idx % STUDENT_COLORS.length],
            values: allDates.map(date => {
              const sc = ds.scores.find(s => s.date === date);
              return sc ? sc.totalScore : null;
            })
          }))
        };
      }
      if (compareDimension === 'category') {
        // 显示每个分类在所有学员中的平均分
        const categories = sectorCfg.categories;
        return {
          type: 'bar',
          xLabels: categories.map(function(c) { return c.name; }),
          yMax: Math.max.apply(null, categories.map(function(c) { return c.maxScore; })),
          datasets: [{
            name: '平均分',
            color: '#60a5fa',
            values: categories.map(cat => {
              let sum = 0, count = 0;
              datasets.forEach(ds => {
                const latest = ds.scores[ds.scores.length - 1];
                const s = latest.scores.find(sc => sc.categoryId === cat.id);
                if (s) { sum += s.score; count++; }
              });
              return count > 0 ? Math.round(sum / count * 10) / 10 : 0;
            })
          }]
        };
      }
    }

    if (chartType === 'line') {
      if (compareDimension === 'student' || compareDimension === 'time') {
        const allDates = Array.from(new Set(datasets.flatMap(ds => ds.scores.map(s => s.date)))).sort();
        return {
          type: 'line',
          xLabels: allDates.map(d => d.slice(5)),
          yMax: 100,
          datasets: datasets.map((ds, idx) => ({
            name: ds.student.name,
            color: STUDENT_COLORS[idx % STUDENT_COLORS.length],
            values: allDates.map(date => {
              const sc = ds.scores.find(s => s.date === date);
              return sc ? sc.totalScore : null;
            })
          }))
        };
      }
      if (compareDimension === 'category') {
        // 各分类在所有学员中的平均分随时间变化
        const allDates = Array.from(new Set(datasets.flatMap(ds => ds.scores.map(s => s.date)))).sort();
        const categories = sectorCfg.categories;
        return {
          type: 'line',
          xLabels: allDates.map(function(d) { return d.slice(5); }),
          yMax: Math.max.apply(null, categories.map(function(c) { return c.maxScore; })),
          datasets: categories.slice(0, 4).map(function(cat, idx) { return {
            name: cat.name,
            color: STUDENT_COLORS[idx % STUDENT_COLORS.length],
            values: allDates.map(date => {
              let sum = 0, count = 0;
              datasets.forEach(ds => {
                const sc = ds.scores.find(s => s.date === date);
                if (sc) {
                  const c = sc.scores.find(s => s.categoryId === cat.id);
                  if (c) { sum += c.score; count++; }
                }
              });
              return count > 0 ? Math.round(sum / count * 10) / 10 : null;
            })
          }})
        };
      }
    }

    return null;
  },

  _getOrderedScores(scoreRecord, sectorCfg) {
    if (!scoreRecord || !scoreRecord.scores) {
      return sectorCfg.categories.map(cat => ({
        categoryId: cat.id, categoryName: cat.name, score: 0, maxScore: cat.maxScore
      }));
    }
    return sectorCfg.categories.map(cat => {
      const s = scoreRecord.scores.find(sc => sc.categoryId === cat.id);
      return s || { categoryId: cat.id, categoryName: cat.name, score: 0, maxScore: cat.maxScore };
    });
  },

  buildInsights(datasets, config) {
    const insightCards = [];
    const sectorCfg = (this.data.sectorConfigs && this.data.sectorConfigs[config.sector]) || SECTOR_CONFIGS[config.sector];

    // 1. 总体概览
    const overviewItems = datasets.map(ds => {
      const latest = ds.scores[ds.scores.length - 1];
      const first = ds.scores[0];
      const progressVal = latest && first ? (latest.totalScore - first.totalScore) : 0;
      const progress = progressVal.toFixed(1);
      const avg = ds.scores.length > 0
        ? (ds.scores.reduce((s, sc) => s + sc.totalScore, 0) / ds.scores.length).toFixed(1)
        : '0';
      return `${ds.student.name}: 最新 ${latest ? latest.totalScore : 0} 分 | 平均 ${avg} 分 | 变化 ${progressVal > 0 ? '+' : ''}${progress}`;
    });
    insightCards.push({
      icon: '\uD83D\uDCCA',
      title: '总体概览',
      items: overviewItems
    });

    // 2. 薄弱项（汇总）
    if (sectorCfg && datasets.length > 0) {
      const weakMap = {};
      datasets.forEach(ds => {
        const latest = ds.scores[ds.scores.length - 1];
        if (!latest) return;
        const ordered = this._getOrderedScores(latest, sectorCfg);
        ordered.forEach(cat => {
          const ratio = cat.score / cat.maxScore;
          if (ratio < 0.75) {
            if (!weakMap[cat.categoryName]) weakMap[cat.categoryName] = { count: 0, totalRatio: 0 };
            weakMap[cat.categoryName].count++;
            weakMap[cat.categoryName].totalRatio += ratio;
          }
        });
      });
      const weakList = Object.entries(weakMap)
        .map(([name, data]) => ({
          name,
          avgRatio: Math.round(data.totalRatio / data.count * 100),
          count: data.count
        }))
        .sort((a, b) => a.avgRatio - b.avgRatio)
        .slice(0, 5);
      if (weakList.length > 0) {
        insightCards.push({
          icon: '\u26A0\uFE0F',
          title: '共性薄弱项（需重点关注）',
          items: weakList.map(w => `${w.name}: 平均得分率 ${w.avgRatio}%（${w.count}/${datasets.length} 人）`)
        });
      }
    }

    // 3. 学员对比（如果多选）
    if (datasets.length >= 2) {
      const latestScores = datasets.map(ds => ({
        name: ds.student.name,
        score: ds.scores[ds.scores.length - 1] ? ds.scores[ds.scores.length - 1].totalScore : 0
      })).sort((a, b) => b.score - a.score);
      const best = latestScores[0];
      const worst = latestScores[latestScores.length - 1];
      const diff = (best.score - worst.score).toFixed(1);
      insightCards.push({
        icon: '\uD83D\uDD0D',
        title: '学员横向对比',
        items: [
          `最高分: ${best.name} ${best.score} 分`,
          `最低分: ${worst.name} ${worst.score} 分`,
          `分差: ${diff} 分`
        ]
      });
    }

    // 4. 训练指导建议
    const guideItems = [];
    if (sectorCfg) {
      const catAvgs = sectorCfg.categories.map(cat => {
        let sum = 0, count = 0;
        datasets.forEach(ds => {
          const latest = ds.scores[ds.scores.length - 1];
          if (!latest) return;
          const s = latest.scores.find(sc => sc.categoryId === cat.id);
          if (s) { sum += s.score / s.maxScore; count++; }
        });
        return { name: cat.name, avgRatio: count > 0 ? sum / count : 1 };
      }).sort((a, b) => a.avgRatio - b.avgRatio);

      const weakest = catAvgs[0];
      if (weakest.avgRatio < 0.75) {
        guideItems.push(`全组「${weakest.name}」平均得分率仅 ${Math.round(weakest.avgRatio * 100)}%，建议安排专项强化训练`);
      }
      const safetyCat = catAvgs.find(c => c.name.includes('安全') && c.avgRatio < 0.85);
      if (safetyCat) {
        guideItems.push(`「${safetyCat.name}」整体偏弱，建议增加安全案例教学`);
      }
      if (guideItems.length === 0) {
        guideItems.push('该组学员整体表现良好，建议保持当前训练计划');
      }
    }
    insightCards.push({
      icon: '\uD83D\uDD2C',
      title: '训练指导建议',
      items: guideItems
    });

    return insightCards;
  },

  // ============ Canvas 绘制 ============
  drawChart(retryCount = 0) {
    if (this.data._drawingChart) return;
    const { chartData } = this.data;
    if (!chartData) return;
    this.setData({ _drawingChart: true });

    const query = wx.createSelectorQuery().in(this);
    query.select('#analysisChartCanvas').fields({ node: true, size: true }).exec((res) => {
      // Canvas 2D 被 wx:if 包裹时，首次渲染节点可能还没创建，需要重试
      if (!res || !res[0] || !res[0].node) {
        this.setData({ _drawingChart: false });
        if (retryCount < 5) {
          this._chartRetryTimer = setTimeout(() => this.drawChart(retryCount + 1), 120);
        } else {
          console.error('Canvas 节点获取失败，重试次数已耗尽');
        }
        return;
      }

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      let dpr = 1;
      if (typeof wx.getWindowInfo === 'function') {
        dpr = wx.getWindowInfo().pixelRatio;
      } else {
        dpr = wx.getSystemInfoSync().pixelRatio;
      }
      const cssWidth = res[0].width;
      const cssHeight = res[0].height;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      try {
        if (chartData.type === 'radar') {
          this._drawRadarChart(ctx, cssWidth, cssHeight, chartData);
        } else if (chartData.type === 'bar') {
          this._drawBarChart(ctx, cssWidth, cssHeight, chartData);
        } else if (chartData.type === 'line') {
          this._drawLineChart(ctx, cssWidth, cssHeight, chartData);
        }
      } catch (e) {
        console.error('Canvas 绘制异常', e);
      } finally {
        this.setData({ _drawingChart: false });
      }
    });
  },

  _drawRadarChart(ctx, width, height, data) {
    const cx = width / 2;
    const cy = height / 2 - 5;
    const radius = Math.min(width, height) / 2 - 45;
    const datasets = data.datasets;
    if (!datasets || datasets.length === 0) return;

    const firstDs = datasets[0];
    const sides = firstDs.scores.length;
    if (!sides || sides === 0) return;
    const angleStep = (Math.PI * 2) / sides;

    // 网格
    for (let level = 1; level <= 5; level++) {
      const r = radius * level / 5;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(30, 58, 95, ${0.25 + level * 0.08})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 轴线与标签
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const labelR = radius + 22;
      ctx.fillStyle = '#8a9bb0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const name = firstDs.scores[i].categoryName;
      ctx.fillText(name.length > 4 ? name.substring(0, 4) : name, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
    }

    // 数据集
    datasets.forEach((ds, dsIdx) => {
      const isDashed = dsIdx > 0;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const idx = i % sides;
        const angle = idx * angleStep - Math.PI / 2;
        const s = ds.scores[idx];
        const ratio = s && s.maxScore > 0 ? s.score / s.maxScore : 0;
        const r = radius * ratio;
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fillStyle = ds.color + '15';
      ctx.fill();
      if (isDashed) ctx.setLineDash([5, 4]);
      else ctx.setLineDash([]);
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const s = ds.scores[i];
        const ratio = s && s.maxScore > 0 ? s.score / s.maxScore : 0;
        const r = radius * ratio;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1628';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ds.color;
        ctx.stroke();
      }
    });
  },

  _drawBarChart(ctx, width, height, data) {
    const padding = { top: 30, right: 15, bottom: 55, left: 38 };
    const cw = width - padding.left - padding.right;
    const ch = height - padding.top - padding.bottom;
    const { xLabels, yMax, datasets } = data;
    if (!xLabels || xLabels.length === 0) return;

    const groupCount = xLabels.length;
    const dsCount = datasets.length;
    const groupW = cw / groupCount;
    const barW = groupW / (dsCount + 1) * 0.72;
    const gap = groupW / (dsCount + 1) * 0.28;
    const maxVal = yMax || 100;

    // Y轴网格与标签
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#4a5d75';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + ch * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(Math.round(maxVal * i / 5).toString(), padding.left - 5, y + 3);
    }

    // 柱子
    xLabels.forEach((label, gIdx) => {
      const groupCX = padding.left + gIdx * groupW + groupW / 2;
      const groupStartX = groupCX - (dsCount * barW + (dsCount - 1) * gap) / 2;

      datasets.forEach((ds, dIdx) => {
        const val = ds.values[gIdx];
        if (val === null || val === undefined) return;
        const barH = (val / maxVal) * ch;
        const bx = groupStartX + dIdx * (barW + gap);
        const by = padding.top + ch - barH;

        ctx.fillStyle = ds.color + '60';
        ctx.fillRect(bx, by, barW, barH);
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
      });

      // X标签
      ctx.fillStyle = '#8a9bb0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      const short = label.length > 4 ? label.substring(0, 4) : label;
      ctx.fillText(short, groupCX, height - padding.bottom + 14);
    });
  },

  _drawLineChart(ctx, width, height, data) {
    const padding = { top: 30, right: 15, bottom: 40, left: 38 };
    const cw = width - padding.left - padding.right;
    const ch = height - padding.top - padding.bottom;
    const { xLabels, yMax, datasets } = data;
    if (!xLabels || xLabels.length === 0) return;

    const maxVal = yMax || 100;
    const xStep = xLabels.length > 1 ? cw / (xLabels.length - 1) : cw;

    // Y轴网格
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#4a5d75';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + ch * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(Math.round(maxVal * i / 5).toString(), padding.left - 5, y + 3);
    }

    // X轴标签
    ctx.fillStyle = '#8a9bb0';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    xLabels.forEach((label, idx) => {
      const x = padding.left + idx * xStep;
      ctx.fillText(label, x, height - padding.bottom + 14);
    });

    // 折线
    datasets.forEach(ds => {
      ctx.beginPath();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      let first = true;
      ds.values.forEach((val, idx) => {
        if (val === null || val === undefined) { first = true; return; }
        const x = padding.left + idx * xStep;
        const y = padding.top + ch * (1 - val / maxVal);
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      });
      ctx.stroke();

      // 数据点
      ds.values.forEach((val, idx) => {
        if (val === null || val === undefined) return;
        const x = padding.left + idx * xStep;
        const y = padding.top + ch * (1 - val / maxVal);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1628';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ds.color;
        ctx.stroke();
      });
    });
  },

  onUnload() {
    this.setData({ _drawingChart: false });
    if (this._scoreInputTimer) { clearTimeout(this._scoreInputTimer); this._scoreInputTimer = null; }
    if (this._reasonInputTimer) { clearTimeout(this._reasonInputTimer); this._reasonInputTimer = null; }
    if (this._chartRetryTimer) { clearTimeout(this._chartRetryTimer); this._chartRetryTimer = null; }
    try { wx.disableAlertBeforeUnload(); } catch (e) {}
  },

  _hasUnsavedScores() {
    const scores = this.data.scores;
    if (!scores || Object.keys(scores).length === 0) return false;
    return Object.values(scores).some(v => v !== undefined && v !== null && v !== '');
  },

  onNavigateBack() {
    if (this._hasUnsavedScores()) {
      wx.showModal({
        title: '确认退出',
        content: '评分数据将丢失，确定退出？',
        confirmText: '退出',
        confirmColor: '#ef4444',
        cancelText: '继续评分',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack({ delta: 1 });
          }
        }
      });
    } else {
      wx.navigateBack({ delta: 1 });
    }
  },

  onPullDownRefresh() {
    const promises = [];
    if (this.data.canScore || this.data.isManager) {
      promises.push(this.loadStudents());
    }
    if (this.data.canScore) {
      promises.push(this.loadSectorConfigs());
      promises.push(this.loadHistory());
    }
    Promise.all(promises).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  logout() {
    getApp().logout();
  }
});
