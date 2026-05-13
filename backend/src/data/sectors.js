export const sectorData = [
  {
    sectorId: "ACC02_32",
    name: "ACC02、ACC32扇区",
    totalScore: 100,
    categories: [
      {
        id: "c1",
        name: "保证与掌控间隔能力",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i1", name: "不违反间隔标准", maxScore: 0, description: "小于区管中心间隔标准直接判定\"不合格\"" },
          { id: "i2", name: "不浪费间隔", maxScore: 5, description: "引导过大或者调速不当导致间隔浪费，如调配后的进港间隔大于30公里，调配后的侧向、顺向穿越大于30公里等逐次扣分" },
          { id: "i3", name: "正确理解并运用间隔规定", maxScore: 5, description: "SHZ以北进港航班同航线或分散大于15公里两机无影响，其余间隔按照日常工作规定，违反间隔规定逐次扣分，对间隔把握不准确等逐次扣分" }
        ]
      },
      {
        id: "c2",
        name: "调配能力和管制意识",
        maxScore: 20,
        minScore: 14,
        items: [
          { id: "i4", name: "满足管制协议和限制", maxScore: 6, description: "进港高度偏高或间隔不够、违反移交协议、民航限制等逐个扣分" },
          { id: "i5", name: "主动管制，及时、准确、合理的调配冲突不造成被动局面", maxScore: 8, description: "发布冲突指令且未第一时间更正直接判定\"不合格\"" },
          { id: "i6", name: "扇区边界意识，扇区边界引导或改变高度提前通报", maxScore: 1, description: "带冲突移交扣分，不提前通报2次含以上扣分" },
          { id: "i7", name: "管制指令的优先级次序", maxScore: 3, description: "能够平衡好冲突调配，脱波移交等指令之间的优先次序" },
          { id: "i8", name: "及时进行标准的活动通报", maxScore: 1, description: "" },
          { id: "i9", name: "有需要及时协调", maxScore: 1, description: "" }
        ]
      },
      {
        id: "c3",
        name: "监控能力",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i10", name: "及时识别接收或转频脱波", maxScore: 2, description: "进入或离开管制责任区域5分钟含以上未发现直接判定\"不合格\"" },
          { id: "i11", name: "时刻保持对于航空器动态的监控", maxScore: 4, description: "及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）" },
          { id: "i12", name: "保持对于扇区边界附近航班的动态监控", maxScore: 1, description: "水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）" },
          { id: "i13", name: "及时发现其他活动或不明活动", maxScore: 2, description: "制作TAG，利用技防手段进行冲突提醒" },
          { id: "i14", name: "及时处理各类告警", maxScore: 1, description: "逐次扣分" }
        ]
      },
      {
        id: "c4",
        name: "指令效率和到位率",
        maxScore: 4,
        minScore: 2,
        items: [
          { id: "i15", name: "完全不必要的指令不要过多", maxScore: 2, description: "" },
          { id: "i16", name: "指令到位率要高", maxScore: 2, description: "未及时改变高度、调速或者给定合理的下降上升率而产生不良后果扣分" }
        ]
      },
      {
        id: "c5",
        name: "管制基本功",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i17", name: "雷达引导准确性", maxScore: 4, description: "航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分" },
          { id: "i18", name: "调速合理性且不频繁增减", maxScore: 4, description: "调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分" },
          { id: "i19", name: "熟知航空器的性能", maxScore: 2, description: "合理控制航空器水平速度、垂直速率" }
        ]
      },
      {
        id: "c6",
        name: "管制预案",
        maxScore: 8,
        minScore: 5,
        items: [
          { id: "i20", name: "管制预案合理且有安全余度", maxScore: 6, description: "逐次扣分" },
          { id: "i21", name: "不频繁更改预案", maxScore: 2, description: "正确地改变预案除外，逐次扣分" }
        ]
      },
      {
        id: "c7",
        name: "安全意识",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i22", name: "不发布未考虑安全余度的指令", maxScore: 5, description: "可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）" },
          { id: "i23", name: "及时避免可能产生的安全隐患", maxScore: 3, description: "通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）" },
          { id: "i24", name: "落实\"双间隔\"运用", maxScore: 2, description: "对于\"三航一公\"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度" }
        ]
      },
      {
        id: "c8",
        name: "刚性规定和工作程序",
        maxScore: 17,
        minScore: 11,
        items: [
          { id: "i25", name: "正确执行\"一到六\"程序", maxScore: 1, description: "" },
          { id: "i26", name: "合理及时执行偏置程序", maxScore: 1, description: "逐个扣分" },
          { id: "i27", name: "及时合理使用取消BRL线", maxScore: 2, description: "穿越未及时使用逐次扣分，2次不含以上未及时取消扣分" },
          { id: "i28", name: "合理防止TCAS告警", maxScore: 2, description: "逐次扣分" },
          { id: "i29", name: "相似航班号防范措施", maxScore: 1, description: "逐个扣分" },
          { id: "i30", name: "正确实施标牌高亮颜色、同色等", maxScore: 1, description: "逐个扣分" },
          { id: "i31", name: "正确执行机组证实管制指令的工作程序", maxScore: 2, description: "" },
          { id: "i32", name: "正确执行脱波程序", maxScore: 1, description: "逐个扣分" },
          { id: "i33", name: "正确执行航班识别程序", maxScore: 1, description: "逐个扣分" },
          { id: "i34", name: "正确执行AIDC工作程序", maxScore: 1, description: "逐个扣分" },
          { id: "i35", name: "正确执行主副班协同工作程序", maxScore: 1, description: "逐个扣分" },
          { id: "i36", name: "及时更新标牌备注栏", maxScore: 1, description: "" },
          { id: "i37", name: "迅速发现并纠正机组复诵错误", maxScore: 2, description: "通话用语正确（逐个扣分）" }
        ]
      },
      {
        id: "c9",
        name: "团队协作意识",
        maxScore: 6,
        minScore: 3,
        items: [
          { id: "i38", name: "主动与ACC18管制员交流管制预案和移交高度", maxScore: 2, description: "" },
          { id: "i39", name: "主动为相邻管制扇区提供调配便利", maxScore: 2, description: "" },
          { id: "i40", name: "及时准确向外传递或者接收外部的信息或者需求", maxScore: 2, description: "" }
        ]
      },
      {
        id: "c10",
        name: "设备操作",
        maxScore: 5,
        minScore: 3,
        items: [
          { id: "i41", name: "雷达屏幕设置", maxScore: 1, description: "有遗漏或错误逐个扣分" },
          { id: "i42", name: "规范使用电子进程单窗口和DAP窗口", maxScore: 1, description: "" },
          { id: "i43", name: "规范使用频率和选择适当的台站", maxScore: 1, description: "" },
          { id: "i44", name: "雷达标牌摆放合理", maxScore: 1, description: "避免交叉或重叠（逐次扣分）" },
          { id: "i45", name: "正确规范使用ATC防护系统", maxScore: 1, description: "" }
        ]
      }
    ]
  },
  {
    sectorId: "ACC08",
    name: "ACC08扇区",
    totalScore: 100,
    categories: [
      {
        id: "c1",
        name: "通话及监听复诵",
        maxScore: 15,
        minScore: 10,
        items: [
          { id: "i1", name: "规范使用中英文标准陆空通话用语", maxScore: 5, description: "发音标准口齿清晰，无感叹词，管制指令内容完整，无歧义" },
          { id: "i2", name: "迅速并恰当更正自身错误指令、口误", maxScore: 2, description: "逐个扣分" },
          { id: "i3", name: "合理掌握指令发布时机", maxScore: 4, description: "顺序恰当，根据空中不同情况控制节奏、语音、语速、语调" },
          { id: "i4", name: "首次联系和脱波呼号规范", maxScore: 1, description: "首次联系时带本单位呼号，脱波时指明下一扇区或管制单位呼号（逐个扣分）" },
          { id: "i5", name: "雷达引导及调速指明原因", maxScore: 1, description: "逐个扣分" },
          { id: "i6", name: "迅速发现并纠正机组复诵错误", maxScore: 2, description: "通话用语正确（逐个扣分）" }
        ]
      },
      {
        id: "c2",
        name: "刚性规定和工作程序",
        maxScore: 15,
        minScore: 10,
        items: [
          { id: "i7", name: "正确执行\"一到六\"程序", maxScore: 1, description: "逐个扣分" },
          { id: "i8", name: "合理及时执行偏置程序", maxScore: 1, description: "逐个扣分" },
          { id: "i9", name: "及时合理使用取消BRL线", maxScore: 2, description: "穿越未及时使用逐次扣分，2次不含以上未及时取消扣分" },
          { id: "i10", name: "合理防止TCAS告警", maxScore: 2, description: "逐次扣分" },
          { id: "i11", name: "相似航班号防范措施", maxScore: 1, description: "逐个扣分" },
          { id: "i12", name: "正确实施标牌高亮颜色、同色等", maxScore: 1, description: "逐个扣分" },
          { id: "i13", name: "正确执行机组证实管制指令的工作程序", maxScore: 2, description: "" },
          { id: "i14", name: "及时更新标牌备注栏", maxScore: 1, description: "" },
          { id: "i15", name: "正确执行脱波程序", maxScore: 1, description: "逐个扣分" },
          { id: "i16", name: "正确执行航班识别程序", maxScore: 1, description: "逐个扣分" },
          { id: "i17", name: "正确执行AIDC工作程序", maxScore: 1, description: "逐个扣分" },
          { id: "i18", name: "正确执行主副班协同工作程序", maxScore: 1, description: "逐个扣分" }
        ]
      },
      {
        id: "c3",
        name: "管制间隔和管制意识",
        maxScore: 20,
        minScore: 12,
        items: [
          { id: "i19", name: "不违反间隔标准、正确理解并运用间隔", maxScore: 3, description: "小于区管中心间隔标准直接判定\"不合格\"" },
          { id: "i20", name: "不浪费间隔", maxScore: 3, description: "引导过大或者调速不当导致间隔浪费，调配后的侧向、顺向穿越大于30公里等逐次扣分" },
          { id: "i21", name: "满足管制协议和限制，高度安排合理", maxScore: 5, description: "逐个扣分，违反军方活动限制直接判定\"不合格\"" },
          { id: "i22", name: "主动管制，及时、准确、合理的调配冲突不造成被动局面", maxScore: 5, description: "发布冲突指令且未第一时间更正直接判定\"不合格\"" },
          { id: "i23", name: "不带冲突移交", maxScore: 1, description: "" },
          { id: "i24", name: "扇区边界引导或改变高度提前通报", maxScore: 1, description: "带冲突移交扣分，不提前通报2次含以上扣分" },
          { id: "i25", name: "及时进行标准的活动通报", maxScore: 1, description: "" },
          { id: "i26", name: "有需要及时协调", maxScore: 1, description: "" }
        ]
      },
      {
        id: "c4",
        name: "监控能力",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i27", name: "及时识别和脱波", maxScore: 2, description: "进入或离开管制责任区域5分钟含以上未发现直接判定\"不合格\"" },
          { id: "i28", name: "时刻保持对于航空器动态的监控", maxScore: 3, description: "及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）" },
          { id: "i29", name: "保持对于扇区边界附近航班的动态监控", maxScore: 1, description: "水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）" },
          { id: "i30", name: "及时处理各类告警", maxScore: 1, description: "逐次扣分" },
          { id: "i31", name: "及时发现不明飞行", maxScore: 3, description: "制作TAG，正确处置不明飞行与航空器的冲突" }
        ]
      },
      {
        id: "c5",
        name: "管制基本功",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i32", name: "雷达引导准确性", maxScore: 2, description: "航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分" },
          { id: "i33", name: "调速合理性且不频繁增减", maxScore: 1, description: "调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分" },
          { id: "i34", name: "合理控制航空器垂直速率", maxScore: 1, description: "逐次扣分" },
          { id: "i35", name: "管制预案合理且有安全余度", maxScore: 3, description: "逐次扣分" },
          { id: "i36", name: "熟知航空器的性能", maxScore: 1, description: "管制决策考虑航空器性能及机载设备的性能限制" },
          { id: "i37", name: "不频繁更改预案", maxScore: 2, description: "正确地改变预案除外，逐次扣分" }
        ]
      },
      {
        id: "c6",
        name: "安全意识",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i38", name: "发布未考虑安全余度的指令", maxScore: 5, description: "可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）" },
          { id: "i39", name: "及时避免可能产生的安全隐患", maxScore: 3, description: "通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）" },
          { id: "i40", name: "落实\"双间隔\"运用", maxScore: 2, description: "对于\"三航一公\"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度" }
        ]
      },
      {
        id: "c7",
        name: "团队协作意识",
        maxScore: 7,
        minScore: 4,
        items: [
          { id: "i41", name: "主动与ACC18管制员交流管制预案和移交高度", maxScore: 2, description: "" },
          { id: "i42", name: "主动与协调席管制员交流", maxScore: 1, description: "" },
          { id: "i43", name: "主动为相邻管制扇区提供调配便利", maxScore: 2, description: "" },
          { id: "i44", name: "及时准确向外传递或者接收外部的信息或者需求", maxScore: 2, description: "" }
        ]
      },
      {
        id: "c8",
        name: "设备操作",
        maxScore: 5,
        minScore: 3,
        items: [
          { id: "i45", name: "雷达屏幕设置", maxScore: 1, description: "有遗漏或错误逐个扣分" },
          { id: "i46", name: "规范使用电子进程单窗口和DAP窗口", maxScore: 1, description: "" },
          { id: "i47", name: "规范使用频率和选择适当的台站", maxScore: 1, description: "" },
          { id: "i48", name: "正确规范使用ATC防护系统", maxScore: 1, description: "" },
          { id: "i49", name: "雷达标牌摆放合理", maxScore: 1, description: "避免交叉或重叠（逐次扣分）" }
        ]
      },
      {
        id: "c9",
        name: "应急处置",
        maxScore: 8,
        minScore: 5,
        items: [
          { id: "i50", name: "冲突解脱时迅速判明形势", maxScore: 3, description: "指令恰当、及时" },
          { id: "i51", name: "特情处置程序、方法符合手册流程", maxScore: 3, description: "" },
          { id: "i52", name: "能迅速从紧急情况中恢复管制秩序", maxScore: 2, description: "" }
        ]
      }
    ]
  },
  {
    sectorId: "ACC18_28",
    name: "ACC18、ACC28扇区",
    totalScore: 100,
    categories: [
      {
        id: "c1",
        name: "保证与掌控间隔能力",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i1", name: "不违反间隔标准", maxScore: 0, description: "小于区管中心间隔标准直接判定\"不合格\"" },
          { id: "i2", name: "不浪费间隔", maxScore: 5, description: "引导过大或者调速不当导致间隔浪费，如调配后的同高度间隔大于40公里，调配后的侧向、顺向穿越大于30公里等逐次扣分" },
          { id: "i3", name: "正确理解并运用间隔规定", maxScore: 5, description: "间隔按照日常工作规定，违反间隔规定逐次扣分，对间隔把握不准确等逐次扣分" }
        ]
      },
      {
        id: "c2",
        name: "调配能力和管制意识",
        maxScore: 20,
        minScore: 14,
        items: [
          { id: "i4", name: "满足管制协议和限制", maxScore: 6, description: "DST高架桥、航线高度限制、移交协议、民航限制等逐个扣分" },
          { id: "i5", name: "主动管制，及时、准确、合理的调配冲突不造成被动局面", maxScore: 8, description: "发布冲突指令且未第一时间更正直接判定\"不合格\"" },
          { id: "i6", name: "扇区边界意识，扇区边界引导或改变高度提前通报", maxScore: 1, description: "带冲突移交扣分，不提前通报2次含以上扣分" },
          { id: "i7", name: "管制指令的优先级次序", maxScore: 3, description: "能够平衡好冲突调配，脱波移交等指令之间的优先次序" },
          { id: "i8", name: "及时进行标准的活动通报", maxScore: 1, description: "" },
          { id: "i9", name: "有需要及时协调", maxScore: 1, description: "" }
        ]
      },
      {
        id: "c3",
        name: "监控能力",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i10", name: "及时识别和脱波", maxScore: 2, description: "进入或离开管制责任区域5分钟含以上未发现直接判定\"不合格\"" },
          { id: "i11", name: "时刻保持对于航空器动态的监控", maxScore: 4, description: "及时发现需要调配的冲突并发布合理的管制指令，注意力分配和指令顺序合理（逐次扣分）" },
          { id: "i12", name: "保持对于扇区边界附近航班的动态监控", maxScore: 1, description: "水平、垂直附近航班的动态监控，及时点高亮（逐次扣分）" },
          { id: "i13", name: "及时发现不明飞行活动", maxScore: 2, description: "制作TAG，利用技防手段进行冲突提醒" },
          { id: "i14", name: "及时处理各类告警", maxScore: 1, description: "逐次扣分" }
        ]
      },
      {
        id: "c4",
        name: "复诵监听能力",
        maxScore: 4,
        minScore: 2,
        items: [
          { id: "i15", name: "未及时发现并处置机组误听误答", maxScore: 2, description: "按航班个数每个扣1分，造成调配被动或者周边扇区调配被动扣2分" },
          { id: "i16", name: "监听复诵过程中发现问题未及时采取措施", maxScore: 2, description: "信号明显干扰或者断续、复诵不完整不清晰未及时采取有效措施（每次扣分）" }
        ]
      },
      {
        id: "c5",
        name: "管制基本功",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i17", name: "雷达引导准确性", maxScore: 4, description: "航向不精准、雷达引导不及时归航或归航过早导致间隔不足二次调配等逐次扣分" },
          { id: "i18", name: "调速合理性且不频繁增减", maxScore: 4, description: "调速不准确导致间隔过大或过小，调速未及时恢复等逐次扣分" },
          { id: "i19", name: "熟知航空器的性能", maxScore: 2, description: "合理控制航空器水平速度、垂直速率" }
        ]
      },
      {
        id: "c6",
        name: "管制预案",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i20", name: "管制预案合理且有安全余度", maxScore: 8, description: "" },
          { id: "i21", name: "不频繁更改预案", maxScore: 2, description: "正确地改变预案除外，逐次扣分" }
        ]
      },
      {
        id: "c7",
        name: "安全意识",
        maxScore: 10,
        minScore: 7,
        items: [
          { id: "i22", name: "不发布未考虑安全余度的指令", maxScore: 5, description: "可能造成小于间隔或管制被动的指令，且未第一时间更正（逐次扣分）" },
          { id: "i23", name: "及时避免可能产生的安全隐患", maxScore: 3, description: "通过更正指令、减小上升下降率、偏置、活动通报等方式（逐次扣分）" },
          { id: "i24", name: "落实\"双间隔\"运用", maxScore: 2, description: "对于\"三航一公\"或军机等需要特殊关注航班在有条件使用但未使用双间隔扩大裕度" }
        ]
      },
      {
        id: "c8",
        name: "刚性规定和工作程序",
        maxScore: 15,
        minScore: 10,
        items: [
          { id: "i25", name: "正确执行\"一到六\"程序", maxScore: 1, description: "" },
          { id: "i26", name: "合理及时执行偏置程序", maxScore: 1, description: "逐个扣分" },
          { id: "i27", name: "及时合理使用取消BRL线", maxScore: 2, description: "穿越未及时使用逐次扣分，2次不含以上未及时取消扣分" },
          { id: "i28", name: "合理防止TCAS告警", maxScore: 2, description: "逐次扣分" },
          { id: "i29", name: "相似航班号防范措施", maxScore: 1, description: "逐个扣分" },
          { id: "i30", name: "正确实施标牌高亮颜色、同色等", maxScore: 1, description: "逐个扣分" },
          { id: "i31", name: "正确执行机组证实管制指令的工作程序", maxScore: 2, description: "" },
          { id: "i32", name: "正确执行脱波程序", maxScore: 1, description: "逐个扣分" },
          { id: "i33", name: "正确执行航班识别程序", maxScore: 1, description: "逐个扣分" },
          { id: "i34", name: "正确执行AIDC工作程序", maxScore: 1, description: "逐个扣分" },
          { id: "i35", name: "正确执行主副班协同工作程序", maxScore: 1, description: "逐个扣分" },
          { id: "i36", name: "及时更新标牌备注栏", maxScore: 1, description: "" }
        ]
      },
      {
        id: "c9",
        name: "团队协作意识",
        maxScore: 6,
        minScore: 3,
        items: [
          { id: "i37", name: "主动与ACC02/ACC08管制员交流管制预案和移交高度", maxScore: 2, description: "" },
          { id: "i38", name: "主动为相邻管制扇区提供调配便利", maxScore: 2, description: "" },
          { id: "i39", name: "及时准确向外传递或者接收外部的信息或者需求", maxScore: 2, description: "" }
        ]
      },
      {
        id: "c10",
        name: "设备操作",
        maxScore: 5,
        minScore: 3,
        items: [
          { id: "i40", name: "雷达屏幕设置", maxScore: 1, description: "有遗漏或错误逐个扣分" },
          { id: "i41", name: "规范使用电子进程单窗口和DAP窗口", maxScore: 1, description: "" },
          { id: "i42", name: "规范使用频率和选择适当的台站", maxScore: 1, description: "" },
          { id: "i43", name: "雷达标牌摆放合理", maxScore: 1, description: "避免交叉或重叠（逐次扣分）" },
          { id: "i44", name: "正确规范使用ATC防护系统", maxScore: 1, description: "" }
        ]
      }
    ]
  }
];
