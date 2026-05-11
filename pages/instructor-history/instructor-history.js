const app = getApp();
const { isStudentRole, canEnterScores, navRoleCaption, normalizeInstructorLevel, getUserInfo } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

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
    expandedDeductId: ''
  },

  onLoad() {
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
    const roleLabel = navRoleCaption(userInfo);
    const levelLabel = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
    this.setData({ userInfo, roleLabel, levelLabel });
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
      const userId = this.data.userInfo.userId;
      const res = normalizeApiResponse(await app.request({ url: `/scores/instructor/${userId}/history` }));
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
      this.setData({ history: rows, studentNames, studentPickerNames, reloadNonce: this.data.reloadNonce + 1 });
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
    const { history, studentFilter, sectorFilter, dateFilter } = this.data;
    let result = history.slice();
    if (studentFilter) {
      result = result.filter(h => h.studentName && h.studentName.includes(studentFilter));
    }
    if (sectorFilter !== 'all') {
      result = result.filter(h => h.sectorId === sectorFilter);
    }
    if (dateFilter) {
      result = result.filter(h => h.date === dateFilter);
    }
    const filteredWithMeta = result.map(h => {
      let maxTotal = h.maxTotal || 0;
      if (!maxTotal && h.scores && h.scores.length > 0) {
        maxTotal = h.scores.reduce((sum, s) => sum + (Number(s.maxScore) || 0), 0);
      }
      const pct = maxTotal > 0 ? Math.round(h.totalScore / maxTotal * 100) : 0;
      const gradeClass = pct >= 90 ? 'score-excellent' : pct >= 75 ? 'score-good' : pct >= 60 ? 'score-pass' : 'score-fail';

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

      return Object.assign({}, h, { percentage: pct, percentageStr: String(pct), gradeClass, scoresArray, maxTotal, deductItems });
    });
    const avgScore = filteredWithMeta.length > 0
      ? Math.round(filteredWithMeta.reduce((sum, h) => sum + h.percentage, 0) / filteredWithMeta.length)
      : 0;
    this.setData({ filtered: filteredWithMeta, avgScore });
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

  onDateFilterChange(e) {
    this.setData({ dateFilter: e.detail.value });
    this.applyFilters();
  },

  clearFilters() {
    this.setData({ studentFilter: '', sectorFilter: 'all', dateFilter: '' });
    this.applyFilters();
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

  onTestLogout() {
    app.logout();
  }
});
