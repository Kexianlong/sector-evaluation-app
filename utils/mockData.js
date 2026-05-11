// 统一模拟数据 - 小程序端与网页端保持一致
// 数据来源：frontend/src/utils/api.js 中的 MOCK_USERS / MOCK_SECTORS，以及基于扇区配置生成的完整评分记录

const mockUsers = [
  { userId: 'user_admin', username: 'admin', name: '系统管理员', role: 'center_director', department: '行政', team: '行政' },
  { userId: 'user_chenyj', username: 'chenyj', name: '陈育俭', role: 'department_head', department: '区域一室', team: '行政' },
  { userId: 'user_zhuwj', username: 'zhuwj', name: '朱文军', role: 'deputy_director', department: '区域一室', team: '二组' },
  { userId: 'user_wangq', username: 'wangq', name: '王强', role: 'supervisor', department: '区域一室', team: '一组' },
  { userId: 'user_gaozy', username: 'gaozy', name: '高泽宇', role: 'instructor', department: '区域一室', team: '三组', instructorLevel: '初教' },
  { userId: 'user_instructor', username: 'instructor', name: '教员', role: 'instructor', department: '区域二室', team: '二组', instructorLevel: '初教' },
  { userId: 'user_zhucq', username: 'zhucq', name: '朱承奇', role: 'instructor', department: '区域一室', team: '三组', instructorLevel: '初教' },
  { userId: 'user_zhaoyw', username: 'zhaoyw', name: '赵聿文', role: 'instructor', department: '区域一室', team: '二组', instructorLevel: '初教' },
  { userId: 'user_wangj', username: 'wangj', name: '王晶', role: 'instructor', department: '区域一室', team: '一组', instructorLevel: '初教' },
  { userId: 'user_sunmz', username: 'sunmz', name: '孙旻哲', role: 'instructor', department: '区域一室', team: '一组', instructorLevel: '中教' },
  { userId: 'user_kexl', username: 'kexl', name: '柯贤隆', role: 'instructor', department: '区域一室', team: '四组', instructorLevel: '初教' },
  { userId: 'user_liush', username: 'liush', name: '刘世豪', role: 'student', department: '区域一室', team: '三组', studentLevel: '高阶十段' },
  { userId: 'user_students', username: 'students', name: '学员', role: 'student', department: '区域一室', team: '一组', studentLevel: '初阶一段' },
  { userId: 'user_zhangyj', username: 'zhangyj', name: '张羽佳', role: 'student', department: '区域一室', team: '三组', studentLevel: '中阶一段' },
  { userId: 'user_hongjm', username: 'hongjm', name: '洪佳铭', role: 'student', department: '区域一室', team: '二组', studentLevel: '中阶三段' },
  { userId: 'user_wangyx', username: 'wangyx', name: '王宇轩', role: 'student', department: '区域一室', team: '一组', studentLevel: '初阶一段', isReleased: true, releasedAt: '2026-03-01' },
  { userId: 'user_xuebx', username: 'xuebx', name: '薛博轩', role: 'student', department: '区域一室', team: '四组', studentLevel: '初阶一段', isReleased: true, releasedAt: '2026-04-01' },
];

const mockSectors = [
  {
    sectorId: 'ACC02_32',
    name: 'ACC02、ACC32扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '保证与掌控间隔能力', maxScore: 10, minScore: 7, items: [
        { id: 'i1', name: '不违反间隔标准', maxScore: 0, description: '小于区管中心间隔标准直接判定"不合格"' },
        { id: 'i2', name: '不浪费间隔', maxScore: 5, description: '引导过大或者调速不当导致间隔浪费' },
        { id: 'i3', name: '正确理解并运用间隔规定', maxScore: 5, description: 'SHZ以北进港航班同航线或分散大于15公里' }
      ]},
      { id: 'c2', name: '调配能力和管制意识', maxScore: 20, minScore: 14, items: [
        { id: 'i4', name: '满足管制协议和限制', maxScore: 6, description: '进港高度偏高或间隔不够、违反移交协议' },
        { id: 'i5', name: '主动管制，及时、准确、合理的调配冲突', maxScore: 8, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i6', name: '扇区边界意识', maxScore: 1, description: '带冲突移交扣分' },
        { id: 'i7', name: '管制指令的优先级次序', maxScore: 3, description: '能够平衡好冲突调配，脱波移交等指令之间的优先次序' },
        { id: 'i8', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i9', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c3', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i10', name: '及时识别接收或转频脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i11', name: '时刻保持对于航空器动态的监控', maxScore: 4, description: '及时发现需要调配的冲突并发布合理的管制指令' },
        { id: 'i12', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控' },
        { id: 'i13', name: '及时发现其他活动或不明活动', maxScore: 2, description: '制作TAG，利用技防手段进行冲突提醒' },
        { id: 'i14', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' }
      ]},
      { id: 'c4', name: '指令效率和到位率', maxScore: 4, minScore: 2, items: [
        { id: 'i15', name: '完全不必要的指令不要过多', maxScore: 2, description: '' },
        { id: 'i16', name: '指令到位率要高', maxScore: 2, description: '未及时改变高度、调速或者给定合理的下降上升率而产生不良后果扣分' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i17', name: '雷达引导准确性', maxScore: 4, description: '航向不精准、雷达引导不及时归航' },
        { id: 'i18', name: '调速合理性且不频繁增减', maxScore: 4, description: '调速不准确导致间隔过大或过小' },
        { id: 'i19', name: '熟知航空器的性能', maxScore: 2, description: '合理控制航空器水平速度、垂直速率' }
      ]},
      { id: 'c6', name: '管制预案', maxScore: 8, minScore: 5, items: [
        { id: 'i20', name: '管制预案合理且有安全余度', maxScore: 6, description: '逐次扣分' },
        { id: 'i21', name: '不频繁更改预案', maxScore: 2, description: '正确地改变预案除外，逐次扣分' }
      ]},
      { id: 'c7', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i22', name: '不发布未考虑安全余度的指令', maxScore: 5, description: '可能造成小于间隔或管制被动的指令' },
        { id: 'i23', name: '及时避免可能产生的安全隐患', maxScore: 3, description: '通过更正指令、减小上升下降率、偏置等方式' },
        { id: 'i24', name: '落实"双间隔"运用', maxScore: 2, description: '对于"三航一公"或军机等需要特殊关注航班' }
      ]},
      { id: 'c8', name: '刚性规定和工作程序', maxScore: 17, minScore: 11, items: [
        { id: 'i25', name: '正确执行"一到六"程序', maxScore: 1, description: '' },
        { id: 'i26', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i27', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分' },
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
  {
    sectorId: 'ACC08',
    name: 'ACC08扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '通话及监听复诵', maxScore: 15, minScore: 10, items: [
        { id: 'i1', name: '规范使用中英文标准陆空通话用语', maxScore: 5, description: '发音标准口齿清晰，无感叹词，管制指令内容完整，无歧义' },
        { id: 'i2', name: '迅速并恰当更正自身错误指令、口误', maxScore: 2, description: '逐个扣分' },
        { id: 'i3', name: '合理掌握指令发布时机', maxScore: 4, description: '顺序恰当，根据空中不同情况控制节奏、语音、语速、语调' },
        { id: 'i4', name: '首次联系和脱波呼号规范', maxScore: 1, description: '首次联系时带本单位呼号，脱波时指明下一扇区或管制单位呼号' },
        { id: 'i5', name: '雷达引导及调速指明原因', maxScore: 1, description: '逐个扣分' },
        { id: 'i6', name: '迅速发现并纠正机组复诵错误', maxScore: 2, description: '通话用语正确（逐个扣分）' }
      ]},
      { id: 'c2', name: '刚性规定和工作程序', maxScore: 15, minScore: 10, items: [
        { id: 'i7', name: '正确执行"一到六"程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i8', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i9', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分' },
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
        { id: 'i20', name: '不浪费间隔', maxScore: 3, description: '引导过大或者调速不当导致间隔浪费' },
        { id: 'i21', name: '满足管制协议和限制，高度安排合理', maxScore: 5, description: '逐个扣分，违反军方活动限制直接判定"不合格"' },
        { id: 'i22', name: '主动管制，及时、准确、合理的调配冲突', maxScore: 5, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i23', name: '不带冲突移交', maxScore: 1, description: '' },
        { id: 'i24', name: '扇区边界引导或改变高度提前通报', maxScore: 1, description: '带冲突移交扣分，不提前通报2次含以上扣分' },
        { id: 'i25', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i26', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c4', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i27', name: '及时识别和脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i28', name: '时刻保持对于航空器动态的监控', maxScore: 3, description: '及时发现需要调配的冲突并发布合理的管制指令' },
        { id: 'i29', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）' },
        { id: 'i30', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' },
        { id: 'i31', name: '及时发现不明飞行', maxScore: 3, description: '制作TAG，正确处置不明飞行与航空器的冲突' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i32', name: '雷达引导准确性', maxScore: 2, description: '航向不精准、雷达引导不及时归航' },
        { id: 'i33', name: '调速合理性且不频繁增减', maxScore: 1, description: '调速不准确导致间隔过大或过小' },
        { id: 'i34', name: '熟知航空器的性能', maxScore: 2, description: '合理控制航空器水平速度、垂直速率' }
      ]},
      { id: 'c6', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i35', name: '发布未考虑安全余度或者可能造成小于间隔或管制被动的指令', maxScore: 5, description: '且未第一时间更正（逐次扣分）' },
        { id: 'i36', name: '及时通过更正指令、减小上升下降率、偏置、活动通报等方式避免可能产生的安全隐患', maxScore: 3, description: '（逐次扣分）' },
        { id: 'i37', name: '安全意识落实双间隔运用', maxScore: 2, description: '' }
      ]},
      { id: 'c7', name: '团队协作意识', maxScore: 7, minScore: 4, items: [
        { id: 'i38', name: '主动与ACC18管制员交流管制预案和移交高度', maxScore: 2, description: '' },
        { id: 'i39', name: '主动与协调席管制员交流', maxScore: 1, description: '' },
        { id: 'i40', name: '主动为相邻管制扇区提供调配便利', maxScore: 2, description: '' },
        { id: 'i41', name: '及时准确向外传递或者接收外部的信息或者需求', maxScore: 2, description: '' }
      ]},
      { id: 'c8', name: '设备操作', maxScore: 5, minScore: 3, items: [
        { id: 'i42', name: '雷达屏幕设置', maxScore: 1, description: '有遗漏或错误逐个扣分' },
        { id: 'i43', name: '规范使用电子进程单窗口和DAP窗口', maxScore: 1, description: '' },
        { id: 'i44', name: '规范使用频率和选择适当的台站', maxScore: 1, description: '' },
        { id: 'i45', name: '雷达标牌摆放合理', maxScore: 1, description: '避免交叉或重叠（逐次扣分）' },
        { id: 'i46', name: '正确规范使用ATC防护系统', maxScore: 1, description: '' }
      ]},
      { id: 'c9', name: '应急处置', maxScore: 8, minScore: 5, items: [
        { id: 'i47', name: '冲突解脱时迅速判明形势，指令恰当、及时', maxScore: 3, description: '' },
        { id: 'i48', name: '特情处置程序、方法符合手册流程', maxScore: 3, description: '' },
        { id: 'i49', name: '信息通报及时准确', maxScore: 2, description: '' }
      ]}
    ]
  },
  {
    sectorId: 'ACC18_28',
    name: 'ACC18、ACC28扇区',
    totalScore: 100,
    categories: [
      { id: 'c1', name: '保证与掌控间隔能力', maxScore: 10, minScore: 7, items: [
        { id: 'i1', name: '不违反间隔标准', maxScore: 0, description: '小于区管中心间隔标准直接判定"不合格"' },
        { id: 'i2', name: '不浪费间隔', maxScore: 5, description: '引导过大或者调速不当导致间隔浪费' },
        { id: 'i3', name: '正确理解并运用间隔规定', maxScore: 5, description: 'SHZ以北进港航班同航线或分散大于15公里' }
      ]},
      { id: 'c2', name: '调配能力和管制意识', maxScore: 20, minScore: 14, items: [
        { id: 'i4', name: '满足管制协议和限制', maxScore: 6, description: 'DST高架桥、航线高度限制、移交协议' },
        { id: 'i5', name: '主动管制，及时、准确、合理的调配冲突', maxScore: 8, description: '发布冲突指令且未第一时间更正直接判定"不合格"' },
        { id: 'i6', name: '扇区边界意识', maxScore: 1, description: '带冲突移交扣分' },
        { id: 'i7', name: '管制指令的优先级次序', maxScore: 3, description: '能够平衡好冲突调配，脱波移交等指令之间的优先次序' },
        { id: 'i8', name: '及时进行标准的活动通报', maxScore: 1, description: '' },
        { id: 'i9', name: '有需要及时协调', maxScore: 1, description: '' }
      ]},
      { id: 'c3', name: '监控能力', maxScore: 10, minScore: 7, items: [
        { id: 'i10', name: '及时识别和脱波', maxScore: 2, description: '进入或离开管制责任区域5分钟含以上未发现直接判定"不合格"' },
        { id: 'i11', name: '时刻保持对于航空器动态的监控', maxScore: 4, description: '及时发现需要调配的冲突并发布合理的管制指令' },
        { id: 'i12', name: '保持对于扇区边界附近航班的动态监控', maxScore: 1, description: '水平、垂直附近航班的动态监控' },
        { id: 'i13', name: '及时发现其他活动或不明活动', maxScore: 2, description: '制作TAG，利用技防手段进行冲突提醒' },
        { id: 'i14', name: '及时处理各类告警', maxScore: 1, description: '逐次扣分' }
      ]},
      { id: 'c4', name: '复诵监听能力', maxScore: 4, minScore: 2, items: [
        { id: 'i15', name: '未及时发现并处置机组误听误答', maxScore: 2, description: '按航班个数每个扣1分，造成调配被动扣2分' },
        { id: 'i16', name: '监听复诵过程中有信号明显干扰', maxScore: 2, description: '复诵不完整不清晰未及时采取有效措施（每次扣分）' }
      ]},
      { id: 'c5', name: '管制基本功', maxScore: 10, minScore: 7, items: [
        { id: 'i17', name: '雷达引导准确性', maxScore: 4, description: '航向不精准、雷达引导不及时归航' },
        { id: 'i18', name: '调速合理性且不频繁增减', maxScore: 4, description: '调速不准确导致间隔过大或过小' },
        { id: 'i19', name: '熟知航空器的性能', maxScore: 2, description: '合理控制航空器水平速度、垂直速率' }
      ]},
      { id: 'c6', name: '管制预案', maxScore: 10, minScore: 7, items: [
        { id: 'i20', name: '管制预案合理且有安全余度', maxScore: 8, description: '' },
        { id: 'i21', name: '不频繁更改预案', maxScore: 2, description: '正确地改变预案除外，逐次扣分' }
      ]},
      { id: 'c7', name: '安全意识', maxScore: 10, minScore: 7, items: [
        { id: 'i22', name: '不发布未考虑安全余度的指令', maxScore: 5, description: '可能造成小于间隔或管制被动的指令' },
        { id: 'i23', name: '及时避免可能产生的安全隐患', maxScore: 3, description: '通过更正指令、减小上升下降率、偏置等方式' },
        { id: 'i24', name: '落实"双间隔"运用', maxScore: 2, description: '对于"三航一公"或军机等需要特殊关注航班' }
      ]},
      { id: 'c8', name: '刚性规定和工作程序', maxScore: 15, minScore: 10, items: [
        { id: 'i25', name: '正确执行"一到六"程序', maxScore: 1, description: '' },
        { id: 'i26', name: '合理及时执行偏置程序', maxScore: 1, description: '逐个扣分' },
        { id: 'i27', name: '及时合理使用取消BRL线', maxScore: 2, description: '穿越未及时使用逐次扣分' },
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
        { id: 'i38', name: '主动与ACC02/ACC08管制员交流管制预案和移交高度', maxScore: 2, description: '' },
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
  }
];

// ============================================================
// 季度评估数据：每名学员每个季度被不同教员评估
// 季度划分：Q2(4-6月)、Q3(7-9月)、Q4(10-12月)、Q1(1-3月)
// ============================================================

// ACC02_32扇区评分数据模板（简化版，无itemDetails，扣分最小单位1分）
const acc02Scores = (total) => ({
  totalScore: total,
  scores: [
    { categoryId: 'c1', categoryName: '保证与掌控间隔能力', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c2', categoryName: '调配能力和管制意识', score: Math.round(total * 0.20), maxScore: 20 },
    { categoryId: 'c3', categoryName: '监控能力', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c4', categoryName: '指令效率和到位率', score: Math.round(total * 0.04), maxScore: 4 },
    { categoryId: 'c5', categoryName: '管制基本功', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c6', categoryName: '管制预案', score: Math.round(total * 0.08), maxScore: 8 },
    { categoryId: 'c7', categoryName: '安全意识', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c8', categoryName: '刚性规定和工作程序', score: Math.round(total * 0.17), maxScore: 17 },
    { categoryId: 'c9', categoryName: '团队协作意识', score: Math.round(total * 0.06), maxScore: 6 },
    { categoryId: 'c10', categoryName: '设备操作', score: Math.round(total * 0.05), maxScore: 5 }
  ]
});

// ACC08扇区评分数据模板（扣分最小单位1分）
const acc08Scores = (total) => ({
  totalScore: total,
  scores: [
    { categoryId: 'c1', categoryName: '通话及监听复诵', score: Math.round(total * 0.15), maxScore: 15 },
    { categoryId: 'c2', categoryName: '刚性规定和工作程序', score: Math.round(total * 0.15), maxScore: 15 },
    { categoryId: 'c3', categoryName: '管制间隔和管制意识', score: Math.round(total * 0.20), maxScore: 20 },
    { categoryId: 'c4', categoryName: '监控能力', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c5', categoryName: '管制基本功', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c6', categoryName: '安全意识', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c7', categoryName: '团队协作意识', score: Math.round(total * 0.07), maxScore: 7 },
    { categoryId: 'c8', categoryName: '设备操作', score: Math.round(total * 0.05), maxScore: 5 },
    { categoryId: 'c9', categoryName: '应急处置', score: Math.round(total * 0.08), maxScore: 8 }
  ]
});

// ACC18_28扇区评分数据模板（扣分最小单位1分）
const acc18Scores = (total) => ({
  totalScore: total,
  scores: [
    { categoryId: 'c1', categoryName: '保证与掌控间隔能力', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c2', categoryName: '调配能力和管制意识', score: Math.round(total * 0.20), maxScore: 20 },
    { categoryId: 'c3', categoryName: '监控能力', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c4', categoryName: '复诵监听能力', score: Math.round(total * 0.04), maxScore: 4 },
    { categoryId: 'c5', categoryName: '管制基本功', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c6', categoryName: '管制预案', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c7', categoryName: '安全意识', score: Math.round(total * 0.10), maxScore: 10 },
    { categoryId: 'c8', categoryName: '刚性规定和工作程序', score: Math.round(total * 0.15), maxScore: 15 },
    { categoryId: 'c9', categoryName: '团队协作意识', score: Math.round(total * 0.06), maxScore: 6 },
    { categoryId: 'c10', categoryName: '设备操作', score: Math.round(total * 0.05), maxScore: 5 }
  ]
});

// 获取等级
const getGrade = (score) => {
  if (score >= 95) return '优秀';
  if (score >= 90) return '良好';
  if (score >= 85) return '合格';
  return '不合格';
};

// 根据扇区配置和分类分数生成 itemDetails
const generateItemDetails = (sectorId, scores) => {
  const sector = mockSectors.find(s => s.sectorId === sectorId);
  if (!sector || !sector.categories) return [];
  const itemDetails = [];
  scores.forEach(catScore => {
    const configCat = sector.categories.find(c => c.id === catScore.categoryId || c.name === catScore.categoryName);
    if (!configCat || !configCat.items) return;
    const catMax = catScore.maxScore || configCat.items.reduce((sum, it) => sum + (it.maxScore || 0), 0);
    const catActualScore = catScore.score || 0;
    configCat.items.forEach(it => {
      const itemMax = it.maxScore || 0;
      let itemScore = itemMax;
      if (catMax > 0 && itemMax > 0) {
        itemScore = Math.round(itemMax * catActualScore / catMax);
      }
      itemScore = Math.min(itemScore, itemMax);
      itemDetails.push({
        categoryId: catScore.categoryId,
        categoryName: catScore.categoryName,
        itemId: it.id,
        itemName: it.name,
        score: itemScore,
        maxScore: itemMax,
        reason: itemScore < itemMax ? '模拟扣分' : ''
      });
    });
  });
  return itemDetails;
};

// 生成季度评分记录
const generateQuarterlyScore = (id, studentId, studentName, instructorId, instructorName, sectorId, sectorName, date, totalScore, released) => {
  const scoreData = sectorId === 'ACC02_32' ? acc02Scores(totalScore) : sectorId === 'ACC08' ? acc08Scores(totalScore) : acc18Scores(totalScore);
  const itemDetails = generateItemDetails(sectorId, scoreData.scores);
  const obj = {
    scoreId: id,
    studentId: studentId,
    studentName: studentName,
    instructorId: instructorId,
    instructorName: instructorName,
    sectorId: sectorId,
    sectorName: sectorName,
    date: date,
    grade: getGrade(totalScore),
    comment: '',
    editCount: 0,
    editedAt: '',
    createdAt: date + 'T08:00:00.000Z',
    released: !!released
  };
  Object.assign(obj, scoreData);
  obj.itemDetails = itemDetails;
  return obj;
};

// 学员 (user_students, 初阶一段) - 5个季度，不同教员
const studentScores = [
  generateQuarterlyScore('sq1', 'user_students', '学员', 'user_gaozy', '高泽宇', 'ACC02_32', 'ACC02、ACC32扇区', '2025-05-15', 78),
  generateQuarterlyScore('sq2', 'user_students', '学员', 'user_zhaoyw', '赵聿文', 'ACC08', 'ACC08扇区', '2025-08-20', 82),
  generateQuarterlyScore('sq3', 'user_students', '学员', 'user_wangj', '王晶', 'ACC18_28', 'ACC18、ACC28扇区', '2025-11-18', 85),
  generateQuarterlyScore('sq4', 'user_students', '学员', 'user_zhucq', '朱承奇', 'ACC02_32', 'ACC02、ACC32扇区', '2026-02-22', 88),
  generateQuarterlyScore('sq5', 'user_students', '学员', 'user_sunmz', '孙旻哲', 'ACC08', 'ACC08扇区', '2026-04-28', 90),
];

// 刘世豪 (user_liush, 高阶十段) - 5个季度
const liushScores = [
  generateQuarterlyScore('sq6', 'user_liush', '刘世豪', 'user_zhucq', '朱承奇', 'ACC02_32', 'ACC02、ACC32扇区', '2025-05-18', 85),
  generateQuarterlyScore('sq7', 'user_liush', '刘世豪', 'user_gaozy', '高泽宇', 'ACC08', 'ACC08扇区', '2025-08-25', 88),
  generateQuarterlyScore('sq8', 'user_liush', '刘世豪', 'user_wangj', '王晶', 'ACC18_28', 'ACC18、ACC28扇区', '2025-11-22', 91),
  generateQuarterlyScore('sq9', 'user_liush', '刘世豪', 'user_zhaoyw', '赵聿文', 'ACC02_32', 'ACC02、ACC32扇区', '2026-02-28', 93),
  generateQuarterlyScore('sq10', 'user_liush', '刘世豪', 'user_sunmz', '孙旻哲', 'ACC08', 'ACC08扇区', '2026-04-30', 95),
];

// 张羽佳 (user_zhangyj, 中阶一段) - 5个季度
const zhangyjScores = [
  generateQuarterlyScore('sq11', 'user_zhangyj', '张羽佳', 'user_wangj', '王晶', 'ACC02_32', 'ACC02、ACC32扇区', '2025-06-10', 80),
  generateQuarterlyScore('sq12', 'user_zhangyj', '张羽佳', 'user_sunmz', '孙旻哲', 'ACC08', 'ACC08扇区', '2025-09-15', 83),
  generateQuarterlyScore('sq13', 'user_zhangyj', '张羽佳', 'user_kexl', '柯贤隆', 'ACC18_28', 'ACC18、ACC28扇区', '2025-12-20', 86),
  generateQuarterlyScore('sq14', 'user_zhangyj', '张羽佳', 'user_gaozy', '高泽宇', 'ACC02_32', 'ACC02、ACC32扇区', '2026-03-15', 89),
  generateQuarterlyScore('sq15', 'user_zhangyj', '张羽佳', 'user_zhucq', '朱承奇', 'ACC08', 'ACC08扇区', '2026-04-25', 91),
];

// 洪佳铭 (user_hongjm, 中阶三段) - 5个季度
const hongjmScores = [
  generateQuarterlyScore('sq16', 'user_hongjm', '洪佳铭', 'user_kexl', '柯贤隆', 'ACC02_32', 'ACC02、ACC32扇区', '2025-06-12', 82),
  generateQuarterlyScore('sq17', 'user_hongjm', '洪佳铭', 'user_zhucq', '朱承奇', 'ACC08', 'ACC08扇区', '2025-09-18', 85),
  generateQuarterlyScore('sq18', 'user_hongjm', '洪佳铭', 'user_gaozy', '高泽宇', 'ACC18_28', 'ACC18、ACC28扇区', '2025-12-25', 87),
  generateQuarterlyScore('sq19', 'user_hongjm', '洪佳铭', 'user_wangj', '王晶', 'ACC02_32', 'ACC02、ACC32扇区', '2026-03-20', 90),
  generateQuarterlyScore('sq20', 'user_hongjm', '洪佳铭', 'user_zhaoyw', '赵聿文', 'ACC08', 'ACC08扇区', '2026-04-26', 92),
];

// 王宇轩 (user_wangyx, 初阶一段, 已放单) - 5个季度
const wangyxScores = [
  generateQuarterlyScore('sq21', 'user_wangyx', '王宇轩', 'user_sunmz', '孙旻哲', 'ACC02_32', 'ACC02、ACC32扇区', '2025-06-15', 76, true),
  generateQuarterlyScore('sq22', 'user_wangyx', '王宇轩', 'user_wangj', '王晶', 'ACC08', 'ACC08扇区', '2025-09-22', 80, true),
  generateQuarterlyScore('sq23', 'user_wangyx', '王宇轩', 'user_zhaoyw', '赵聿文', 'ACC18_28', 'ACC18、ACC28扇区', '2025-12-28', 83, true),
  generateQuarterlyScore('sq24', 'user_wangyx', '王宇轩', 'user_kexl', '柯贤隆', 'ACC02_32', 'ACC02、ACC32扇区', '2026-03-25', 86, true),
  generateQuarterlyScore('sq25', 'user_wangyx', '王宇轩', 'user_gaozy', '高泽宇', 'ACC08', 'ACC08扇区', '2026-04-27', 88, true),
];

// 薛博轩 (user_xuebx, 初阶一段, 已放单) - 5个季度
const xuebxScores = [
  generateQuarterlyScore('sq26', 'user_xuebx', '薛博轩', 'user_gaozy', '高泽宇', 'ACC02_32', 'ACC02、ACC32扇区', '2025-06-18', 77, true),
  generateQuarterlyScore('sq27', 'user_xuebx', '薛博轩', 'user_kexl', '柯贤隆', 'ACC08', 'ACC08扇区', '2025-09-25', 81, true),
  generateQuarterlyScore('sq28', 'user_xuebx', '薛博轩', 'user_sunmz', '孙旻哲', 'ACC18_28', 'ACC18、ACC28扇区', '2025-12-30', 84, true),
  generateQuarterlyScore('sq29', 'user_xuebx', '薛博轩', 'user_wangj', '王晶', 'ACC02_32', 'ACC02、ACC32扇区', '2026-03-28', 87, true),
  generateQuarterlyScore('sq30', 'user_xuebx', '薛博轩', 'user_zhucq', '朱承奇', 'ACC08', 'ACC08扇区', '2026-04-29', 89, true),
];

/** 懒加载评分历史，避免启动时一次性生成大量数据 */
let _mockScoreHistoryCache = null;
function getMockScoreHistory() {
  if (_mockScoreHistoryCache) return _mockScoreHistoryCache;
  const all = [
    ...studentScores,
    ...liushScores,
    ...zhangyjScores,
    ...hongjmScores,
    ...wangyxScores,
    ...xuebxScores
  ];
  _mockScoreHistoryCache = all;
  return all;
}
const mockScoreHistory = getMockScoreHistory();

// 简化版评分数据（用于图表等）
const mockScores = {
  ACC02_32: {
    categories: [
      { name: '保证与掌控间隔能力', max: 10 },
      { name: '调配能力和管制意识', max: 20 },
      { name: '监控能力', max: 10 },
      { name: '指令效率和到位率', max: 4 },
      { name: '管制基本功', max: 10 },
      { name: '管制预案', max: 8 },
      { name: '安全意识', max: 10 },
      { name: '刚性规定和工作程序', max: 17 },
      { name: '团队协作意识', max: 6 },
      { name: '设备操作', max: 5 },
    ],
    series: [{ sectorId: 'ACC02_32', values: [9, 18, 8, 3, 9, 7, 9, 15, 5, 4] }],
  },
  ACC08: {
    categories: [
      { name: '通话及监听复诵', max: 15 },
      { name: '刚性规定和工作程序', max: 15 },
      { name: '管制间隔和管制意识', max: 20 },
      { name: '监控能力', max: 10 },
      { name: '管制基本功', max: 10 },
      { name: '安全意识', max: 10 },
      { name: '团队协作意识', max: 7 },
      { name: '设备操作', max: 5 },
      { name: '应急处置', max: 8 },
    ],
    series: [{ sectorId: 'ACC08', values: [13, 14, 17, 9, 8, 9, 6, 4, 7] }],
  },
  ACC18_28: {
    categories: [
      { name: '保证与掌控间隔能力', max: 10 },
      { name: '调配能力和管制意识', max: 20 },
      { name: '监控能力', max: 10 },
      { name: '复诵监听能力', max: 4 },
      { name: '管制基本功', max: 10 },
      { name: '管制预案', max: 10 },
      { name: '安全意识', max: 10 },
      { name: '刚性规定和工作程序', max: 15 },
      { name: '团队协作意识', max: 6 },
      { name: '设备操作', max: 5 },
    ],
    series: [{ sectorId: 'ACC18_28', values: [8, 16, 9, 3, 9, 8, 9, 13, 5, 4] }],
  },
};

module.exports = {
  mockUsers,
  mockSectors,
  mockScoreHistory,
  mockScores,
  MOCK_SECTORS: mockSectors,
  MOCK_STUDENTS: mockUsers.filter(function(u) { return u.role === 'student' && !u.isReleased; }),
  MOCK_USERS: mockUsers,
  MOCK_SCORE_HISTORY: mockScoreHistory,
};
