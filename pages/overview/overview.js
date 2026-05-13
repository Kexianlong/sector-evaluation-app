const app = getApp();
const { isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { normalizeApiResponse, normalizeArrayPayload } = require('../../utils/api.js');

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
    actionItems: [],
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
    expandedDeductId: '',
    managerReminder: '',
    attentionItems: []
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
      studentId: r.studentId || '',
      instructorId: r.instructorId || '',
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
      roleLabel: getRoleLabel(userInfo.role),
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
        var reminders = res.data.reminders || [];
        var stats = res.data.stats || { icaoExpired: 0, icaoWarning: 0, medicalExpired: 0, medicalWarning: 0 };
        var managerReminder = '';
        var expiredCount = stats.icaoExpired + stats.medicalExpired;
        var warningCount = stats.icaoWarning + stats.medicalWarning;
        if (expiredCount > 0 && warningCount > 0) {
          managerReminder = expiredCount + '人证件已过期，' + warningCount + '人即将到期，请及时处理';
        } else if (expiredCount > 0) {
          managerReminder = expiredCount + '人证件已过期，请及时处理';
        } else if (warningCount > 0) {
          managerReminder = warningCount + '人证件即将到期，请关注';
        }
        this.setData({
          reminders: reminders,
          reminderStats: stats,
          managerReminder: managerReminder
        });
        this.computeAttentionItems();
      }
    } catch (e) {
      // 静默失败
    }
  },

  toggleReminders() {
    this.setData({ showReminders: !this.data.showReminders });
  },

  expandReminderPanel() {
    this.setData({ showReminders: true });
  },

  async loadOverview() {
    this._refreshing = true;
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
      // 响应数据调试
      const items = normalizeArrayPayload(scoresRes);
      // 已标准化数据项数
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
        this.setData({ records: [], scoreStats: { totalScores: 0, scoredStudents: 0 }, studentPickerNames: ['全部学员'], instructorPickerNames: ['全部教员'] });
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
        this._computeActionItems();
      }
    } catch (e) {
      console.log('[overview] 请求失败', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      this.computeAttentionItems();
      this._refreshing = false;
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

  onSectorTabTap(e) {
    const sectorId = e.currentTarget.dataset.sector;
    const index = sectorId ? this.data.sectors.findIndex(s => s.sectorId === sectorId) + 1 : 0;
    this.setData({ sectorFilterIndex: index, sectorFilter: sectorId }, () => this.updateFilteredRecords());
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

  computeAttentionItems() {
    const items = [];
    const records = this.data.records || [];
    const now = Date.now();
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

    var studentLastEval = {};
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.studentId && r.date) {
        var d = new Date(r.date).getTime();
        if (!studentLastEval[r.studentId] || d > studentLastEval[r.studentId]) {
          studentLastEval[r.studentId] = d;
        }
      }
    }
    var staleCount = 0;
    var keys = Object.keys(studentLastEval);
    for (var j = 0; j < keys.length; j++) {
      if (now - studentLastEval[keys[j]] > FOURTEEN_DAYS) staleCount++;
    }
    if (staleCount > 0) {
      items.push({
        id: 'stale',
        icon: '🔴',
        text: staleCount + '名学员超过14天未评估',
        subtext: '点击查看详情',
        action: 'goToUsers',
        params: {}
      });
    }

    var stats = this.data.reminderStats || {};
    var expiringCount = (stats.icaoWarning || 0) + (stats.medicalWarning || 0);
    if (expiringCount > 0) {
      items.push({
        id: 'expiring',
        icon: '🟡',
        text: expiringCount + '名学员证件即将到期',
        subtext: '点击查看详情',
        action: 'goToReminders',
        params: {}
      });
    }

    var studentScores = {};
    for (var k = 0; k < records.length; k++) {
      var rec = records[k];
      if (rec.studentId && !rec.released) {
        if (!studentScores[rec.studentId]) studentScores[rec.studentId] = [];
        studentScores[rec.studentId].push(rec.totalScore);
      }
    }
    var releaseReady = 0;
    var sKeys = Object.keys(studentScores);
    for (var m = 0; m < sKeys.length; m++) {
      var scores = studentScores[sKeys[m]];
      if (scores.length >= 3 && scores.every(function(s) { return s >= 90; })) {
        releaseReady++;
      }
    }
    if (releaseReady > 0) {
      items.push({
        id: 'release',
        icon: '🟢',
        text: releaseReady + '名学员达到放单标准',
        subtext: '点击查看详情',
        action: 'goToUsers',
        params: {}
      });
    }

    this.setData({ attentionItems: items });
  },

  onRecordTap(e) {
    const { studentId, instructorId } = e.currentTarget.dataset;
    if (studentId) {
      app.globalData.pendingTabParams = { studentId: studentId };
      wx.switchTab({ url: '/pages/radar/radar' });
    }
  },

  goToUsers() {
    // 跳转用户管理
    wx.navigateTo({
      url: '/pages/users/users',
      success: () => {},
      fail: (err) => {
        console.error('[overview] navigateTo users fail:', err);
        wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' });
      }
    });
  },
  goToConfig() {
    // 跳转系统配置
    wx.navigateTo({
      url: '/pages/config/config',
      success: () => {},
      fail: (err) => {
        console.error('[overview] navigateTo config fail:', err);
        wx.showToast({ title: '跳转失败:' + (err.errMsg || '未知错误'), icon: 'none' });
      }
    });
  },
  onAdminGridTap(e) {
    const action = e.currentTarget.dataset.action;
    if (!action) return;
    const map = {
      users: 'goToUsers',
      config: 'goToConfig',
      scoreConfig: 'goToScoreConfig',
      analysis: 'goToAnalysis',
      reminders: 'goToReminders',
      export: 'goToExport'
    };
    const method = map[action];
    if (method && typeof this[method] === 'function') {
      this[method]();
    } else {
      console.warn('[overview] unknown admin action:', action);
    }
  },

  goToScoreConfig() {
    wx.navigateTo({
      url: '/pages/score-config/score-config',
      fail: (err) => wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' })
    });
  },
  goToReminders() {
    wx.navigateTo({
      url: '/pages/reminders/reminders',
      fail: (err) => wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' })
    });
  },
  goToAnalysis() {
    wx.navigateTo({
      url: '/pages/instructor-history/instructor-history',
      fail: (err) => wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' })
    });
  },
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile',
      fail: (err) => wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' })
    });
  },
  goToExport() {
    wx.navigateTo({
      url: '/pages/export/export',
      fail: (err) => wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' })
    });
  },

  goToStudentProfile(e) {
    const studentId = e.currentTarget.dataset.id || e.currentTarget.dataset.studentid;
    if (studentId) {
      wx.navigateTo({ url: '/pages/student-profile/student-profile?studentId=' + studentId });
    }
  },

  goToInstructorHistory(e) {
    const instructorId = e.currentTarget.dataset.instructorid;
    if (instructorId) {
      wx.navigateTo({ url: '/pages/instructor-history/instructor-history?instructorId=' + instructorId });
    }
  },

  _computeActionItems() {
    const actionItems = [];
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const records = this.data.records || [];
    const studentLastScore = {};
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const sid = r.studentId;
      if (!sid) continue;
      const d = new Date(r.date || 0).getTime();
      if (!studentLastScore[sid] || d > studentLastScore[sid].date) {
        studentLastScore[sid] = { date: d, name: r.studentName, studentId: sid };
      }
    }
    for (const sid in studentLastScore) {
      const s = studentLastScore[sid];
      const daysSince = now - s.date;
      if (daysSince > fourteenDays) {
        actionItems.push({
          id: 'overdue_' + sid,
          level: 'danger',
          text: s.name + ' 超过14天未评估',
          sub: '上次评估: ' + new Date(s.date).toISOString().slice(0, 10),
          studentId: sid,
          action: 'goToStudentProfile'
        });
      }
    }
    try {
      const reminderData = this.data.reminderStudents || [];
      for (let j = 0; j < reminderData.length; j++) {
        const stu = reminderData[j];
        if (stu.icaoDate) {
          const d = new Date(stu.icaoDate).getTime();
          if (d - now < thirtyDays && d > now) {
            actionItems.push({
              id: 'icao_' + stu.userId,
              level: 'warning',
              text: stu.name + ' ICAO英语即将到期',
              sub: '到期日: ' + stu.icaoDate,
              userId: stu.userId,
              action: 'goToStudentProfile'
            });
          }
        }
        if (stu.medicalDate) {
          const d = new Date(stu.medicalDate).getTime();
          if (d - now < thirtyDays && d > now) {
            actionItems.push({
              id: 'medical_' + stu.userId,
              level: 'warning',
              text: stu.name + ' 体检合格证即将到期',
              sub: '到期日: ' + stu.medicalDate,
              userId: stu.userId,
              action: 'goToStudentProfile'
            });
          }
        }
      }
    } catch (e) { /* ignore */ }
    actionItems.sort((a, b) => {
      const order = { danger: 0, warning: 1, success: 2 };
      return (order[a.level] || 2) - (order[b.level] || 2);
    });
    this.setData({ actionItems: actionItems.slice(0, 10) });
  },
  logout() { getApp().logout(); },

  onPullDownRefresh() {
    this.loadOverview().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
