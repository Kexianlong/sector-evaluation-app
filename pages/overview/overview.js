const app = getApp();
const { isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo } = require('../../utils/roles.js');
const { MOCK_SCORE_HISTORY, MOCK_USERS } = require('../../utils/mockData.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function computeLevelLabel(userInfo) {
  if (!userInfo) return '';
  if (userInfo.role === 'student') return userInfo.studentLevel || '';
  if (userInfo.role === 'instructor') return normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
  return '';
}

function tabBarInit(page) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().init();
  }
}

function normalizeScoresListResponse(data) {
  if (!data) return { items: [] };
  // 如果 data 是字符串（body 未解析），尝试解析 JSON
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return { items: [] }; }
  }
  // 如果 data.body 存在（云函数原始返回格式），解析 body
  if (data.body) {
    let body = data.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (body) {
      if (Array.isArray(body)) return { items: body };
      if (Array.isArray(body.items)) return { items: body.items };
      if (body.data && Array.isArray(body.data.items)) return { items: body.data.items };
      if (Array.isArray(body.data)) return { items: body.data };
      if (body.data && Array.isArray(body.data.scores)) return { items: body.data.scores };
    }
  }
  if (Array.isArray(data)) return { items: data };
  if (Array.isArray(data.items)) return { items: data.items };
  if (data.data && Array.isArray(data.data.items)) return { items: data.data.items };
  if (Array.isArray(data.data)) return { items: data.data };
  if (data.data && Array.isArray(data.data.scores)) return { items: data.data.scores };
  return { items: [] };
}

function recentScoreTone(totalScore) {
  if (totalScore >= 90) return 'high';
  if (totalScore >= 85) return 'mid';
  return 'low';
}

Page({
  data: {
    userInfo: null,
    isStudent: false,
    isManager: false,
    roleLabel: '',
    levelLabel: '',
    avatarUrl: '',
    departmentLabel: '',
    stats: { total: 0, student: 0, instructor: 0, deputy_director: 0, supervisor: 0, department_head: 0, center_director: 0 },
    scoreStats: { totalScores: 0, scoredStudents: 0 },
    pendingTasks: 0,
    records: [],
    filteredRecords: [],
    sectors: [],
    sectorPickerNames: ['全部扇区'],
    loading: true,
    loadError: '',
    reloadNonce: 0,

    // 筛选条件
    studentFilter: '',
    studentFilterIndex: 0,
    studentPickerNames: ['全部学员'],
    instructorFilter: '',
    instructorFilterIndex: 0,
    instructorPickerNames: ['全部教员'],
    sectorFilter: '',
    sectorFilterIndex: 0,
    startDate: '',
    endDate: '',
    includeReleased: false,
    showAll: false,

    // 删除
    deleteConfirmId: '',
    deleting: false,

    // 展开详情
    expandedId: null,
    expandedDeductId: ''
  },

  _refreshing: false,
  _launchTime: 0,

  _enrichRecord(r) {
    if (!r || typeof r !== 'object') return r;
    const scoresArr = Array.isArray(r.scores) ? r.scores : [];
    const maxTotal = scoresArr.length
      ? scoresArr.reduce((s, x) => s + (Number(x.maxScore) || 0), 0)
      : (Number(r.maxTotal) || 100);
    const enrichedScores = scoresArr.map((cat) => {
      const catScore = Number(cat.score || 0);
      const catMax = Number(cat.maxScore || 0);
      const pct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
      const barColor = pct >= 90 ? '#00d26a' : pct >= 75 ? '#ffaa00' : '#60a5fa';
      return { categoryId: cat.categoryId, categoryName: cat.categoryName || cat.name, catScore: catScore, catMax: catMax, pct: pct, barColor: barColor };
    });
    const recordId = r.scoreId || r.id;
    const deductItems = (r.itemDetails || [])
      .filter((d) => Number(d.maxScore) > Number(d.score))
      .map((d) => ({
        itemId: d.itemId || d.id,
        itemName: d.itemName || d.name || '评分项',
        itemScore: d.score,
        itemMax: d.maxScore,
        deductVal: Number(d.maxScore) - Number(d.score),
        reason: String(d.reason || '').trim(),
        categoryId: d.categoryId,
        deductKey: recordId + '_' + (d.itemId || d.id)
      }));
    // 只保留模板需要的字段，丢弃原始的 scores/itemDetails 等大数据
    return {
      scoreId: r.scoreId || r.id,
      studentName: r.studentName || '',
      instructorName: r.instructorName || '',
      sectorName: r.sectorName || '',
      sectorId: r.sectorId || '',
      date: r.date || '',
      totalScore: Number(r.totalScore) || 0,
      maxTotal: maxTotal,
      grade: r.grade || '',
      tone: r.tone || '',
      released: !!(r.released || (this._releasedStudentIds && this._releasedStudentIds[r.studentId])),
      scoresArray: enrichedScores,
      deductItems: deductItems
    };
  },

  onLoad() {
    let userInfo = getUserInfo();
    this.setData({ userInfo });
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    if (!isManagerRole(userInfo.role)) {
      wx.switchTab({ url: '/pages/radar/radar' });
      return;
    }
    const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
    const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
    const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';
    const avatarUrl = userInfo.photoUrl || (userInfo.gender === '女'
      ? AVATAR_FEMALE
      : (userInfo.gender === '男' ? AVATAR_MALE : AVATAR_DEFAULT));
    this.setData({
      isStudent: userInfo.role === 'student',
      isManager: true,
      roleLabel: navRoleCaption(userInfo) || userInfo.role,
      levelLabel: computeLevelLabel(userInfo),
      avatarUrl,
      departmentLabel: userInfo.department || '',
      reminders: [],
      reminderStats: { icaoExpired: 0, icaoWarning: 0, medicalExpired: 0, medicalWarning: 0 },
      showReminders: false
    });
    this.loadOverview();
    this.loadReminders();
    this._launchTime = Date.now();
  },

  onShow() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !isManagerRole(userInfo.role)) {
      wx.switchTab({ url: '/pages/radar/radar' });
      return;
    }
    tabBarInit(this);
    // 启动保护：onLoad 完成后2秒内不重复加载
    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    // 每次切回来都重新加载，确保放单状态等数据同步
    this.loadOverview();
  },

  async loadReminders() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/reminders' }));
      if (res && res.success && res.data) {
        this.setData({
          reminders: res.data.reminders || [],
          reminderStats: res.data.stats || { icaoExpired: 0, icaoWarning: 0, medicalExpired: 0, medicalWarning: 0 }
        });
      }
    } catch (e) {
      // 静默失败
    }
  },

  toggleReminders() {
    this.setData({ showReminders: !this.data.showReminders });
  },

  async loadOverview() {
    this.setData({ loading: true, loadError: '' });
    try {
      // 先加载放单学员列表，用于标记 score 记录的 released 状态
      const releasedStudentIds = {};
      try {
        const stuRes = await app.request({ url: '/users/students?includeReleased=true' });
        let stuList = [];
        if (Array.isArray(stuRes)) stuList = stuRes;
        else if (stuRes && stuRes.data && Array.isArray(stuRes.data)) stuList = stuRes.data;
        for (let si = 0; si < stuList.length; si++) {
          if (stuList[si].isReleased && stuList[si].userId) {
            releasedStudentIds[stuList[si].userId] = true;
          }
        }
      } catch (e) { console.log('[overview] students请求失败', e); }
      this._releasedStudentIds = releasedStudentIds;

      const params = [];
      params.push('_t=' + Date.now());
      const scoresRes = await app.request({ url: '/scores?page=1&limit=100&includeReleased=true&' + params.join('&') });
      console.log('[overview] /scores raw response type:', typeof scoresRes, 'keys:', scoresRes ? Object.keys(scoresRes).join(',') : 'null');
      const { items } = normalizeScoresListResponse(scoresRes);
      console.log('[overview] normalized items count:', items.length);
      if (items.length > 0) {
        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const scoredStudents = new Set(items.map(s => s.studentId).filter(Boolean)).size;
        const studentPickerNames = ['全部学员'].concat(Array.from(new Set(items.map(r => r.studentName).filter(Boolean))));
        const instructorPickerNames = ['全部教员'].concat(Array.from(new Set(items.map(r => r.instructorName).filter(Boolean))));
        const records = [];
        for (let k = 0; k < items.length; k++) {
          try {
            records.push(this._enrichRecord(Object.assign({}, items[k], { tone: recentScoreTone(items[k].totalScore) })));
          } catch (enrichErr) {
            const _rel = !!(items[k].released || (this._releasedStudentIds && this._releasedStudentIds[items[k].studentId]));
            records.push({ scoreId: items[k].scoreId || items[k].id, studentName: items[k].studentName || '', instructorName: items[k].instructorName || '', sectorName: items[k].sectorName || '', sectorId: items[k].sectorId || '', date: items[k].date || '', totalScore: Number(items[k].totalScore) || 0, maxTotal: 100, grade: items[k].grade || '', tone: recentScoreTone(items[k].totalScore), released: _rel, scoresArray: [], deductItems: [] });
          }
        }
        this.setData({ records, scoreStats: { totalScores: items.length, scoredStudents }, studentPickerNames, instructorPickerNames });
        // 延迟调用，避免 setData 回调在超时时未执行
        setTimeout(() => { this.updateFilteredRecords(); }, 50);
      } else {
        // 真实 API 返回空数据时，使用 mock 数据 fallback
        console.log('[overview] API returned 0 items, using mock fallback');
        const fallbackRecords = [];
        for (let fk = 0; fk < MOCK_SCORE_HISTORY.length; fk++) {
          try {
            fallbackRecords.push(this._enrichRecord(Object.assign({}, MOCK_SCORE_HISTORY[fk], { tone: recentScoreTone(MOCK_SCORE_HISTORY[fk].totalScore) })));
          } catch (fbErr) {
            const fkItem = MOCK_SCORE_HISTORY[fk];
            const _fbRel = !!(fkItem.released || (this._releasedStudentIds && this._releasedStudentIds[fkItem.studentId]));
            fallbackRecords.push({ scoreId: fkItem.scoreId || fkItem.id, studentName: fkItem.studentName || '', instructorName: fkItem.instructorName || '', sectorName: fkItem.sectorName || '', sectorId: fkItem.sectorId || '', date: fkItem.date || '', totalScore: Number(fkItem.totalScore) || 0, maxTotal: 100, grade: fkItem.grade || '', tone: recentScoreTone(fkItem.totalScore), released: _fbRel, scoresArray: [], deductItems: [] });
          }
        }
        const fbScoredStudents = new Set(fallbackRecords.map(s => s.studentName).filter(Boolean)).size;
        const fbStudentPickerNames = ['全部学员'].concat(Array.from(new Set(fallbackRecords.map(r => r.studentName).filter(Boolean))));
        const fbInstructorPickerNames = ['全部教员'].concat(Array.from(new Set(fallbackRecords.map(r => r.instructorName).filter(Boolean))));
        this.setData({
          records: fallbackRecords,
          scoreStats: { totalScores: fallbackRecords.length, scoredStudents: fbScoredStudents },
          studentPickerNames: fbStudentPickerNames,
          instructorPickerNames: fbInstructorPickerNames
        });
        setTimeout(() => { this.updateFilteredRecords(); }, 50);
      }
      try {
        const sectorsRes = await app.request({ url: '/sectors' });
        let sectors = [];
        if (Array.isArray(sectorsRes)) sectors = sectorsRes;
        else if (sectorsRes && sectorsRes.data && Array.isArray(sectorsRes.data)) sectors = sectorsRes.data;
        const sectorPickerNames = ['全部扇区'].concat(sectors.map(s => s.name || s.sectorId));
        this.setData({ sectors, sectorPickerNames });
      } catch (sectorErr) { console.log('[overview] sectors请求失败', sectorErr); /* ignore */ }
      if (this.data.isManager) {
        try {
          const usersRes = await app.request({ url: '/users' });
          if (usersRes && usersRes.success && usersRes.data && usersRes.data.stats) {
            this.setData({ stats: usersRes.data.stats });
          }
        } catch (userErr) { console.log('[overview] users请求失败', userErr); /* ignore */ }
        try {
          const pendingRes = await app.request({ url: '/score-config/pending-count' });
          if (pendingRes && pendingRes.success && typeof pendingRes.data === 'number') {
            this.setData({ pendingTasks: pendingRes.data });
          }
        } catch (pendingErr) { console.log('[overview] pending-count请求失败', pendingErr); /* ignore */ }
      }
    } catch (e) {
      console.log('[overview] 请求失败，使用模拟数据', e);
      // 无论 mockMode 状态如何，请求失败时都使用 mock 数据 fallback
      const mockRecords = [];
      for (let mk = 0; mk < MOCK_SCORE_HISTORY.length; mk++) {
        try {
          mockRecords.push(this._enrichRecord(Object.assign({}, MOCK_SCORE_HISTORY[mk], { tone: recentScoreTone(MOCK_SCORE_HISTORY[mk].totalScore) })));
        } catch (enrichErr2) {
          const mkItem = MOCK_SCORE_HISTORY[mk];
          const _mkRel = !!(mkItem.released || (this._releasedStudentIds && this._releasedStudentIds[mkItem.studentId]));
          mockRecords.push({ scoreId: mkItem.scoreId || mkItem.id, studentName: mkItem.studentName || '', instructorName: mkItem.instructorName || '', sectorName: mkItem.sectorName || '', sectorId: mkItem.sectorId || '', date: mkItem.date || '', totalScore: Number(mkItem.totalScore) || 0, maxTotal: 100, grade: mkItem.grade || '', tone: recentScoreTone(mkItem.totalScore), released: _mkRel, scoresArray: [], deductItems: [] });
        }
      }
      const scoredStudents = new Set(mockRecords.map(s => s.studentName).filter(Boolean)).size;
      const studentPickerNames = ['全部学员'].concat(Array.from(new Set(mockRecords.map(r => r.studentName).filter(Boolean))));
      const instructorPickerNames = ['全部教员'].concat(Array.from(new Set(mockRecords.map(r => r.instructorName).filter(Boolean))));
      this.setData({
        loadError: '',
        records: mockRecords,
        scoreStats: { totalScores: mockRecords.length, scoredStudents },
        studentPickerNames,
        instructorPickerNames
      });
      setTimeout(() => { this.updateFilteredRecords(); }, 50);
      // 如果当前不在 mock 模式，提示用户后端不可用
      if (!app.globalData.mockMode) {
        app.enableMockMode();
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  getFilteredRecords() {
    const records = this.data.records;
    const _data = this.data;
    const { studentFilter, instructorFilter, sectorFilter, sectorFilterIndex, sectors, startDate, endDate, includeReleased } = _data;
    let result = records;
    // 放单学员过滤：默认（includeReleased=false）隐藏已放单学员的记录
    if (!includeReleased) {
      result = result.filter(function(r) { return !r.released; });
    }
    if (studentFilter) result = result.filter(r => r.studentName === studentFilter);
    if (instructorFilter) result = result.filter(r => r.instructorName === instructorFilter);
    if (sectorFilter) {
      const sector = sectors && sectors[sectorFilterIndex - 1];
      if (sector) result = result.filter(r => r.sectorId === sector.sectorId || r.sectorName === sector.name);
    }
    if (startDate) result = result.filter(r => r.date >= startDate);
    if (endDate) result = result.filter(r => r.date <= endDate);
    return result || [];
  },

  updateFilteredRecords() {
    const filtered = this.getFilteredRecords();
    // 默认只传前10条到渲染层，减少setData传输量；showAll时显示全部
    const displayRecords = this.data.showAll ? filtered : filtered.slice(0, 10);
    this.setData({ filteredRecords: displayRecords, _filteredTotal: filtered.length });
  },

  onStudentFilterChange(e) {
    const index = Number(e.detail.value || 0);
    const name = index > 0 ? this.data.studentPickerNames[index] : '';
    this.setData({ studentFilterIndex: index, studentFilter: name }, () => this.updateFilteredRecords());
  },

  onInstructorFilterChange(e) {
    const index = Number(e.detail.value || 0);
    const name = index > 0 ? this.data.instructorPickerNames[index] : '';
    this.setData({ instructorFilterIndex: index, instructorFilter: name }, () => this.updateFilteredRecords());
  },

  onSectorFilterChange(e) {
    const index = Number(e.detail.value || 0);
    const sector = index > 0 ? this.data.sectors[index - 1] : null;
    this.setData({ sectorFilterIndex: index, sectorFilter: sector ? sector.sectorId : '' }, () => this.updateFilteredRecords());
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value }, () => this.updateFilteredRecords());
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value }, () => this.updateFilteredRecords());
  },

  toggleIncludeReleased() {
    const next = !this.data.includeReleased;
    this.setData({ includeReleased: next }, () => {
      this.updateFilteredRecords();
      // 显示操作反馈
      let releasedCount = 0;
      const records = this.data.records;
      for (let i = 0; i < records.length; i++) {
        if (records[i].released) releasedCount++;
      }
      if (next) {
        wx.showToast({ title: '已包含 ' + releasedCount + ' 条放单学员记录', icon: 'none', duration: 1500 });
      } else {
        wx.showToast({ title: '已隐藏放单学员记录', icon: 'none', duration: 1200 });
      }
    });
  },

  toggleShowAll() {
    const next = !this.data.showAll;
    this.setData({ showAll: next }, () => this.updateFilteredRecords());
  },

  clearFilters() {
    this.setData({
      studentFilter: '',
      studentFilterIndex: 0,
      instructorFilter: '',
      instructorFilterIndex: 0,
      sectorFilter: '',
      sectorFilterIndex: 0,
      startDate: '',
      endDate: ''
    }, () => this.updateFilteredRecords());
  },

  onDeleteTap(e) {
    this.setData({ deleteConfirmId: e.currentTarget.dataset.id });
  },

  cancelDelete() {
    this.setData({ deleteConfirmId: '' });
  },

  async confirmDelete(e) {
    const scoreId = e.currentTarget.dataset.id;
    if (!scoreId) return;
    this.setData({ deleting: true });
    try {
      await app.request({ url: `/scores/${scoreId}`, method: 'DELETE' });
      this.setData({ deleteConfirmId: '', deleting: false });
      this.loadOverview();
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
      this.setData({ deleting: false });
    }
  },

  onRetryLoad() {
    this.setData({ reloadNonce: this.data.reloadNonce + 1 });
    this.loadOverview();
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  },

  toggleDeductExpand(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      expandedDeductId: this.data.expandedDeductId === key ? '' : key
    });
  },

  goToUsers() {
    console.log('[overview] goToUsers clicked');
    wx.navigateTo({
      url: '/pages/users/users',
      success: () => console.log('[overview] navigateTo users success'),
      fail: (err) => {
        console.error('[overview] navigateTo users fail:', err);
        wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' });
      }
    });
  },
  goToConfig() {
    console.log('[overview] goToConfig clicked');
    wx.navigateTo({
      url: '/pages/config/config',
      success: () => console.log('[overview] navigateTo config success'),
      fail: (err) => {
        console.error('[overview] navigateTo config fail:', err);
        wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' });
      }
    });
  },
  goToScoreConfig() {
    wx.navigateTo({
      url: '/pages/score-config/score-config',
      fail: (err) => wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' })
    });
  },
  goToReminders() {
    wx.navigateTo({
      url: '/pages/reminders/reminders',
      fail: (err) => wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' })
    });
  },
  goToExport() {
    wx.showToast({ title: '数据导出功能开发中', icon: 'none' });
  },
  logout() { getApp().logout(); },

  onPullDownRefresh() {
    this.loadOverview().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
