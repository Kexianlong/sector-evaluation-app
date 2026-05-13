const app = getApp();
const { isStudentRole, isManagerRole, canEnterScores, navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');
const { buildCategoryTrend, buildDetailItems, computeRate } = require('../../utils/categoryDetail.js');

function getGradeColor(pct) {
  if (pct >= 90) return '#00d26a';
  if (pct >= 75) return '#ffaa00';
  return '#ff4d4f';
}

function getScoreClass(pct) {
  if (pct >= 90) return 'score-excellent';
  if (pct >= 75) return 'score-good';
  if (pct >= 60) return 'score-pass';
  return 'score-fail';
}

Page({
  data: {
    userInfo: null,
    roleLabel: '',
    levelLabel: '',
    isAdmin: false,
    history: [],
    filtered: [],
    sectors: [],
    loading: true,
    loadError: '',
    reloadNonce: 0,
    studentFilter: '',
    sectorFilter: 'all',
    sectorFilterName: '全部扇区',
    dateFilter: '',
    studentNames: [],
    studentPickerNames: ['全部学员'],
    avgScore: 0,
    expandedId: null,
    expandedDeductId: '',

    // 管理员增强筛选
    instructorFilter: '',
    instructorNames: [],
    instructorPickerNames: ['全部教员'],
    startDate: '',
    endDate: '',
    includeReleased: false,
    showAll: false,
    _filteredTotal: 0,

    // 删除
    deleteConfirmId: '',
    deleting: false,

    // 分类详情弹窗
    showCategoryPopup: false,
    categoryPopupTitle: '',
    categoryPopupTrend: [],
    categoryPopupItems: [],
    categoryPopupIndex: -1,
    categoryPopupRate: 0,
    categoryPopupRecord: null
  },

  onLoad(options) {
    let userInfo = getUserInfo();
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    if (isStudentRole(userInfo.role)) {
      wx.switchTab({ url: '/pages/radar/radar' });
      return;
    }
    const roleLabel = getRoleLabel(userInfo.role);
    const levelLabel = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
    const isAdmin = isManagerRole(userInfo.role);
    const initialFilter = {};
    if (options && options.instructorId && isAdmin) {
      initialFilter.instructorFilter = options.instructorId;
    }
    this.setData({
      userInfo, roleLabel, levelLabel, isAdmin,
      pageTitle: isAdmin ? '评估记录' : '评分历史',
      pageSubtitle: isAdmin ? '查看所有评分记录' : '查看您的所有评分记录',
      ...initialFilter
    });
    this.loadHistory();
    this.loadSectors();
  },

  onShow() {
    const userInfo = app.globalData.userInfo;
    if (userInfo && isStudentRole(userInfo.role)) {
      wx.switchTab({ url: '/pages/radar/radar' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  async loadHistory() {
    this.setData({ loading: true, loadError: '' });
    try {
      const isAdmin = this.data.isAdmin;
      const userId = this.data.userInfo.userId;
      const url = isAdmin ? '/scores?includeReleased=true' : `/scores/instructor/${userId}/history`;
      const res = normalizeApiResponse(await app.request({ url }));
      let rows = [];
      if (Array.isArray(res)) {
        rows = res;
      } else if (res && res.success && Array.isArray(res.data)) {
        rows = res.data;
      } else if (res && res.success && res.data && Array.isArray(res.data.items)) {
        rows = res.data.items;
      }
      rows = rows.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const studentNames = Array.from(new Set(rows.map(h => h.studentName).filter(Boolean)));
      const studentPickerNames = ['全部学员'].concat(studentNames);
      const instructorNames = isAdmin ? Array.from(new Set(rows.map(h => h.instructorName).filter(Boolean))) : [];
      const instructorPickerNames = isAdmin ? ['全部教员'].concat(instructorNames) : ['全部教员'];
      this.setData({
        history: rows,
        studentNames, studentPickerNames,
        instructorNames, instructorPickerNames,
        reloadNonce: this.data.reloadNonce + 1
      });
      this.applyFilters();
    } catch (e) {
      this.setData({ history: [], filtered: [], loadError: e.message || '加载失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadSectors() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      let rows = [];
      if (Array.isArray(res)) {
        rows = res;
      } else if (res && res.success && Array.isArray(res.data)) {
        rows = res.data;
      }
      const sectorNames = rows.map(s => s.name || s.sectorId);
      const sectorPickerNames = ['全部扇区'].concat(sectorNames);
      this.setData({ sectors: rows, sectorNames, sectorPickerNames });
    } catch {
      this.setData({ sectors: [], sectorNames: [] });
    }
  },

  applyFilters() {
    const {
      history, studentFilter, sectorFilter, dateFilter,
      instructorFilter, startDate, endDate, includeReleased, isAdmin
    } = this.data;
    let result = history.slice();
    if (!includeReleased) {
      result = result.filter(r => !r.released);
    }
    if (studentFilter) {
      result = result.filter(h => h.studentName && h.studentName.includes(studentFilter));
    }
    if (isAdmin && instructorFilter) {
      result = result.filter(h => h.instructorName === instructorFilter);
    }
    if (sectorFilter !== 'all') {
      result = result.filter(h => h.sectorId === sectorFilter);
    }
    if (dateFilter) {
      result = result.filter(h => h.date === dateFilter);
    }
    if (startDate) {
      result = result.filter(h => h.date >= startDate);
    }
    if (endDate) {
      result = result.filter(h => h.date <= endDate);
    }
    const filteredWithMeta = result.map(h => {
      let maxTotal = h.maxTotal || 0;
      if (!maxTotal && h.scores && h.scores.length > 0) {
        maxTotal = h.scores.reduce((sum, s) => sum + (Number(s.maxScore) || 0), 0);
      }
      const pct = maxTotal > 0 ? Math.round(h.totalScore / maxTotal * 100) : 0;
      const gradeClass = getScoreClass(pct);
      const gradeText = pct >= 90 ? '优秀' : pct >= 75 ? '良好' : pct >= 60 ? '合格' : '不合格';
      const tone = pct >= 90 ? 'high' : pct >= 85 ? 'mid' : 'low';

      const scoresArray = (h.scores || []).map(s => {
        const catScore = Number(s.score || 0);
        const catMax = Number(s.maxScore || 0);
        const catPct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
        const barColor = catPct >= 90 ? '#00d26a' : catPct >= 75 ? '#ffaa00' : '#60a5fa';
        return Object.assign({}, s, { catScore, catMax, pct: catPct, barColor });
      });

      const recordId = h.scoreId || h.id;
      const deductItems = (h.itemDetails || [])
        .filter(d => Number(d.maxScore) > Number(d.score))
        .map(d => ({
          itemId: d.itemId || d.id,
          itemName: d.itemName || d.name || '评分项',
          itemScore: d.score,
          itemMax: d.maxScore,
          deductVal: Number(d.maxScore) - Number(d.score),
          reason: String(d.reason || '').trim(),
          categoryId: d.categoryId,
          deductKey: recordId + '_' + (d.itemId || d.id)
        }));

      return Object.assign({}, h, {
        percentage: pct, percentageStr: String(pct), gradeClass, gradeText, tone,
        scoresArray, maxTotal, deductItems
      });
    });
    const avgScore = filteredWithMeta.length > 0
      ? Math.round(filteredWithMeta.reduce((sum, h) => sum + h.percentage, 0) / filteredWithMeta.length)
      : 0;
    const displayRecords = this.data.showAll ? filteredWithMeta : filteredWithMeta.slice(0, 10);
    this.setData({ filtered: displayRecords, _filteredTotal: filteredWithMeta.length, avgScore });
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

  showCategoryDetail(e) {
    const recordId = e.currentTarget.dataset.recordId;
    const catName = e.currentTarget.dataset.catName;
    const studentId = e.currentTarget.dataset.studentId;
    if (!recordId || !catName || !studentId) return;
    const studentRecords = (this.data.history || []).filter(function(h) { return h.studentId === studentId; });
    const trend = buildCategoryTrend(studentRecords, catName);
    const currentRec = this.data.filtered.find(function(f) { return f.scoreId === recordId || f.id === recordId; });
    const latestRec = trend.length > 0 ? trend[trend.length - 1].record : (currentRec || null);
    const items = buildDetailItems(null, catName, latestRec);
    const rate = trend.length > 0 && trend[trend.length - 1].maxScore > 0 ? computeRate(trend[trend.length - 1].score, trend[trend.length - 1].maxScore) : 0;
    this.setData({
      showCategoryPopup: true,
      categoryPopupTitle: catName,
      categoryPopupTrend: trend,
      categoryPopupItems: items,
      categoryPopupIndex: trend.length > 0 ? trend.length - 1 : -1,
      categoryPopupRate: rate,
      categoryPopupRecord: latestRec
    });
  },

  hideCategoryPopup() {
    this.setData({ showCategoryPopup: false, categoryPopupIndex: -1, categoryPopupRecord: null, categoryPopupItems: [] });
  },

  onCategoryTrendTap(e) {
    const index = e.currentTarget.dataset.index;
    const trend = this.data.categoryPopupTrend[index];
    if (!trend || !trend.record) return;
    const rate = trend.maxScore > 0 ? computeRate(trend.score, trend.maxScore) : 0;
    const items = buildDetailItems(null, this.data.categoryPopupTitle, trend.record);
    this.setData({
      categoryPopupIndex: index,
      categoryPopupRate: rate,
      categoryPopupRecord: trend.record,
      categoryPopupItems: items
    });
  },

  onStudentFilterChange(e) {
    const index = e.detail.value;
    const name = index > 0 ? this.data.studentNames[index - 1] : '';
    this.setData({ studentFilter: name });
    this.applyFilters();
  },

  onSectorFilterChange(e) {
    const index = e.detail.value;
    const sectorFilter = index > 0 ? this.data.sectors[index - 1].sectorId : 'all';
    const sectorFilterName = index > 0 ? (this.data.sectors[index - 1].name || sectorFilter) : '全部扇区';
    this.setData({ sectorFilter, sectorFilterName });
    this.applyFilters();
  },

  onSectorTabTap(e) {
    const sectorId = e.currentTarget.dataset.sector;
    const sectorFilter = sectorId === 'all' ? 'all' : sectorId;
    const sectorFilterName = sectorId === 'all' ? '全部扇区' : (this.data.sectors.find(s => s.sectorId === sectorId) || {}).name || sectorId;
    this.setData({ sectorFilter, sectorFilterName });
    this.applyFilters();
  },

  onDateFilterChange(e) {
    this.setData({ dateFilter: e.detail.value });
    this.applyFilters();
  },

  onInstructorFilterChange(e) {
    const index = e.detail.value;
    const name = index > 0 ? this.data.instructorNames[index - 1] : '';
    this.setData({ instructorFilter: name });
    this.applyFilters();
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    this.applyFilters();
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
    this.applyFilters();
  },

  toggleIncludeReleased() {
    const next = !this.data.includeReleased;
    this.setData({ includeReleased: next }, () => {
      this.applyFilters();
      const releasedCount = this.data.history.filter(r => r.released).length;
      wx.showToast({
        title: next ? '已包含 ' + releasedCount + ' 条放单学员记录' : '已隐藏放单学员记录',
        icon: 'none',
        duration: 1200
      });
    });
  },

  toggleShowAll() {
    const next = !this.data.showAll;
    this.setData({ showAll: next }, () => this.applyFilters());
  },

  clearFilters() {
    this.setData({
      studentFilter: '', sectorFilter: 'all', dateFilter: '',
      instructorFilter: '', startDate: '', endDate: '', includeReleased: false
    });
    this.applyFilters();
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
      this.loadHistory();
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
      this.setData({ deleting: false });
    }
  },

  goToInstructorHistory(e) {
    const instructorId = e.currentTarget.dataset.instructorid;
    if (instructorId) {
      wx.navigateTo({ url: '/pages/instructor-history/instructor-history?instructorId=' + instructorId });
    }
  },

  goToScoreDetail(e) {
    const scoreId = e.currentTarget.dataset.scoreId;
    if (!scoreId) return;
    wx.navigateTo({
      url: '/pages/score-detail/score-detail?scoreId=' + scoreId,
      fail: function(err) {
        wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' });
      }
    });
  },

  goToProfile(e) {
    const userId = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({ url: '/pages/student-profile/student-profile?studentId=' + userId });
    } else {
      wx.navigateTo({ url: '/pages/profile/profile' });
    }
  },

  retryLoad() {
    this.loadHistory();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadHistory(),
      this.loadSectors()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

});
