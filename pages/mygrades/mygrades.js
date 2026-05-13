const app = getApp();
const { isStudentRole, isInstructorRole, isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { normalizeScoreHistoryRecords } = require('../../utils/scoreHistory.js');
const { normalizeApiResponse } = require('../../utils/api.js');
const { buildCategoryTrend, buildDetailItems, computeRate } = require('../../utils/categoryDetail.js');

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

function getGradeText(pct) {
  if (pct >= 95) return '优秀';
  if (pct >= 90) return '良好';
  if (pct >= 85) return '合格';
  return '不合格';
}

function getGradeClass(pct) {
  if (pct >= 95) return 'score-excellent';
  if (pct >= 90) return 'score-good';
  if (pct >= 85) return 'score-pass';
  return 'score-fail';
}

function enrichRecord(record, studentName, hideInstructor) {
  if (!record) return null;
  const pct = record.maxTotal > 0 ? Math.round((record.total / record.maxTotal) * 100) : 0;
  record._grade = getGradeText(pct);
  record._gradeClass = getGradeClass(pct);
  record._pct = pct;
  record.studentName = studentName || record.studentName || '未命名';
  if (hideInstructor) {
    record.instructorName = '';
  }

  const scoresArr = record.scoresArray || [];
  record._scorePairs = scoresArr.map(function(s) {
    return {
      name: s.categoryName || s.name || '评分项',
      score: Number(s.score || 0),
      maxScore: Number(s.maxScore || 100)
    };
  });

  let deductItems = (record.itemDetails || [])
    .filter(function(d) { return Number(d.maxScore) > Number(d.score); })
    .map(function(d) {
      return {
        itemId: d.itemId || d.id,
        itemName: d.itemName || d.name || '评分项',
        deductVal: Number(d.maxScore) - Number(d.score),
        score: d.score,
        maxScore: d.maxScore,
        reason: String(d.reason || '').trim()
      };
    });

  if (deductItems.length === 0 && scoresArr.length > 0) {
    deductItems = scoresArr
      .filter(function(s) { return Number(s.maxScore) > Number(s.score); })
      .map(function(s, idx) {
        return {
          itemId: 'cat_' + (s.categoryId || idx),
          itemName: s.categoryName || '评分项',
          deductVal: Number(s.maxScore || 0) - Number(s.score || 0),
          score: s.score,
          maxScore: s.maxScore,
          reason: '',
          isFallback: true
        };
      });
  }
  record._deductItems = deductItems;
  return record;
}

Page({
  data: {
    userInfo: null,
    roleLabel: '',
    levelLabel: '',
    avatarUrl: '',
    age: null,
    groupEntryDate: '',
    icaoExpiry: '',
    medicalExpiry: '',
    canViewAll: false,
    students: [],
    sectors: [],
    latestScores: [],
    filteredScores: [],
    loading: true,
    loadError: '',
    nameFilter: '',
    sectorFilter: '',
    sortBy: 'score_desc',
    sectorFilterNames: ['全部扇区'],
    sectorFilterIndex: 0,
    sortNames: ['分数从高到低', '分数从低到高', '按姓名排序'],
    sortIndex: 0,

    showHistoryPopup: false,
    detailStudent: null,
    studentHistory: [],
    detailLoading: false,
    detailExpandedId: null,
    detailExpandedDeductId: '',
    historyStats: { count: 0, avgScore: 0, bestSector: '-', bestGrade: '-' },
    studentHistoryMap: {},
    allStudentTrendData: {},

    // 分类详情弹窗
    showCategoryPopup: false,
    categoryPopupTitle: '',
    categoryPopupTrend: [],
    categoryPopupItems: [],
    categoryPopupIndex: -1,
    categoryPopupRate: 0,
    categoryPopupRecord: null
  },

  _refreshing: false,
  _launchTime: 0,
  _drawing: false,

  onLoad() {
    let u = getUserInfo() || {};
    const canViewAll = isInstructorRole(u && u.role) || isManagerRole(u && u.role);
    const levelLabel = u.role === 'student' ? (u.studentLevel || u.level || '') : (u.role === 'instructor' ? normalizeInstructorLevel(u.instructorLevel || u.level) : '');
    this.setData({
      userInfo: u,
      roleLabel: getRoleLabel(u.role),
      levelLabel: levelLabel,
      canViewAll: canViewAll,
      avatarUrl: getAvatarUrl(u),
      age: computeAge(u.birthDate),
      gender: u.gender,
      studentLevel: u.studentLevel || u.level || '',
      groupEntryDate: formatDate(u.groupEntryDate),
      icaoExpiry: formatDate(u.icaoExpiry),
      medicalExpiry: formatDate(u.medicalExpiry)
    });
    this.loadData();
    this._launchTime = Date.now();
  },

  onShow() {
    tabBarInit(this);
    let u = getUserInfo() || {};
    const canViewAll = isInstructorRole(u && u.role) || isManagerRole(u && u.role);
    const levelLabel = u.role === 'student' ? (u.studentLevel || u.level || '') : (u.role === 'instructor' ? normalizeInstructorLevel(u.instructorLevel || u.level) : '');
    this.setData({
      userInfo: u,
      canViewAll: canViewAll,
      avatarUrl: getAvatarUrl(u),
      age: computeAge(u && u.birthDate),
      gender: (u && u.gender) || '',
      studentLevel: (u && (u.studentLevel || u.level)) || '',
      levelLabel: levelLabel,
      groupEntryDate: formatDate(u && u.groupEntryDate),
      icaoExpiry: formatDate(u && u.icaoExpiry),
      medicalExpiry: formatDate(u && u.medicalExpiry)
    });

    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    this._refreshing = true;
    const self = this;
    this.loadData().finally(function() { self._refreshing = false; });
  },

  async loadData() {
    await this.loadSectors();
    await this.loadStudents();
  },

  async loadSectors() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (res && Array.isArray(res.data)) list = res.data;
      const sectors = list.map(function(s) { return { id: s.sectorId, name: s.name || s.sectorId }; });
      this.setData({
        sectors: sectors,
        sectorFilterNames: ['全部扇区'].concat(sectors.map(function(s) { return s.name; }))
      });
    } catch (e) {
      this.setData({ sectors: [], sectorFilterNames: ['全部扇区'] });
    }
  },

  async loadStudents() {
    const canViewAll = this.data.canViewAll;
    const userInfo = this.data.userInfo;
    if (!canViewAll) {
      const list = userInfo && userInfo.userId ? [{ userId: userInfo.userId, name: userInfo.name || '我' }] : [];
      this.setData({ students: list });
      await this.loadLatestScores();
      return;
    }
    try {
      const params = isManagerRole(userInfo && userInfo.role) ? { includeReleased: 'true' } : {};
      const res = normalizeApiResponse(await app.request({ url: '/users/students', data: params }));
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (res && Array.isArray(res.data)) list = res.data;
      else if (res && Array.isArray(res.items)) list = res.items;
      this.setData({ students: list });
    } catch (e) {
      this.setData({ students: [] });
    }
    await this.loadLatestScores();
  },

  async loadLatestScores() {
    const students = this.data.students;
    if (students.length === 0) {
      this.setData({ latestScores: [], filteredScores: [], loading: false });
      return;
    }
    this.setData({ loading: true, loadError: '' });

    const results = [];
    const historyMap = {};
    const allTrendData = {};
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const res = normalizeApiResponse(await app.request({ url: '/scores/student/' + s.userId + '/history' }));
        const raw = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        const records = normalizeScoreHistoryRecords(raw);
        historyMap[s.userId] = records;
        allTrendData[s.userId] = this._buildSectorTrendData(records);
        if (records.length > 0) {
          const latest = enrichRecord(records[0], s.name, !this.data.canViewAll);
          if (latest) {
            latest.studentId = s.userId;
            latest.studentName = s.name || latest.studentName || '未命名';
            results.push(latest);
          }
        }
      } catch (e) {
        // skip
      }
    }

    this.setData({ latestScores: results, studentHistoryMap: historyMap, allStudentTrendData: allTrendData, loading: false });
    this.computeFilteredScores();
    const self = this;
    wx.nextTick(function() { self.drawAllTrends(); });
  },

  computeFilteredScores() {
    const latestScores = this.data.latestScores;
    const sectorFilter = this.data.sectorFilter;
    const nameFilter = this.data.nameFilter;
    const sortBy = this.data.sortBy;
    let result = latestScores.slice();
    if (sectorFilter) {
      result = result.filter(function(s) { return s.sectorId === sectorFilter; });
    }
    if (nameFilter) {
      const kw = nameFilter.toLowerCase();
      result = result.filter(function(s) { return (s.studentName || '').toLowerCase().indexOf(kw) >= 0; });
    }
    switch (sortBy) {
      case 'score_desc':
        result.sort(function(a, b) { return (b._pct || 0) - (a._pct || 0); });
        break;
      case 'score_asc':
        result.sort(function(a, b) { return (a._pct || 0) - (b._pct || 0); });
        break;
      case 'name':
        result.sort(function(a, b) { return (a.studentName || '').localeCompare(b.studentName || '', 'zh'); });
        break;
    }
    this.setData({ filteredScores: result });
    const self = this;
    wx.nextTick(function() { self.drawAllTrends(); });
  },

  drawAllTrends() {
    const data = this.data.allStudentTrendData;
    const self = this;
    Object.keys(data).forEach(function(studentId) {
      const trends = data[studentId];
      if (!trends || trends.length === 0) return;
      trends.forEach(function(sector, idx) {
        setTimeout(function() { self._drawSingleTrend(studentId, sector); }, idx * 100);
      });
    });
  },

  _buildSectorTrendData(scores) {
    const map = {};
    scores.forEach(function(sc) {
      const sid = sc.sectorId || 'unknown';
      if (!map[sid]) {
        map[sid] = { sectorId: sid, sectorName: sc.sectorName || sid, scores: [] };
      }
      map[sid].scores.push({
        date: sc.date || '',
        shortDate: (sc.date || '').slice(5, 10),
        totalScore: sc.totalScore || 0,
        grade: sc.grade || '',
        record: sc
      });
    });
    const result = Object.keys(map).map(function(key) {
      const item = map[key];
      item.scores.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
      const totals = item.scores.map(function(s) { return s.totalScore; });
      const sum = totals.reduce(function(a, b) { return a + b; }, 0);
      return {
        sectorId: item.sectorId,
        sectorName: item.sectorName,
        scores: item.scores,
        maxScore: totals.length > 0 ? Math.max.apply(null, totals) : 0,
        minScore: totals.length > 0 ? Math.min.apply(null, totals) : 0,
        avgScore: totals.length > 0 ? Math.round(sum / totals.length) : 0
      };
    });
    return result;
  },

  drawStudentTrends(studentId) {
    const data = this.data.expandedStudentTrendData[studentId];
    if (!data || data.length === 0) return;
    const self = this;
    data.forEach(function(sector, idx) {
      setTimeout(function() { self._drawSingleTrend(studentId, sector); }, idx * 100);
    });
  },

  _drawSingleTrend(studentId, sector) {
    const canvasId = 'trendCanvas_' + studentId + '_' + sector.sectorId;
    const query = wx.createSelectorQuery().in(this);
    query.select('#' + canvasId).fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
      const width = res[0].width;
      const height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const data = sector.scores;
      if (!data || data.length < 2) {
        ctx.clearRect(0, 0, width, height);
        if (data && data.length === 1) {
          const cx = width / 2;
          const cy = height / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(data[0].shortDate + ' ' + data[0].totalScore + '分', cx, cy + 24);
        }
        return;
      }

      const padL = 40, padR = 16, padT = 16, padB = 28;
      const chartW = width - padL - padR;
      const chartH = height - padT - padB;
      const scores = data.map(function(d) { return d.totalScore; });
      const minS = Math.min.apply(null, scores) - 5;
      const maxS = Math.max.apply(null, scores) + 5;
      const range = maxS - minS || 1;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#1e2d42';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(width - padR, y); ctx.stroke();
      }

      const points = data.map(function(d, i) {
        return {
          x: padL + (chartW / (data.length - 1)) * i,
          y: padT + chartH - ((d.totalScore - minS) / range) * chartH
        };
      });

      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
      ctx.beginPath();
      ctx.moveTo(points[0].x, padT + chartH);
      points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
      ctx.lineTo(points[points.length - 1].x, padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      points.forEach(function(p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();

      points.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#0f1724';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      data.forEach(function(d, i) {
        ctx.fillText(d.shortDate, points[i].x, height - 6);
      });

      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round(maxS - (range / 4) * i);
        const y = padT + (chartH / 4) * i;
        ctx.fillText(val, padL - 4, y + 3);
      }
    });
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

  goToSectorHistory(e) {
    const studentId = e.currentTarget.dataset.studentId;
    const sectorId = e.currentTarget.dataset.sectorId;
    const studentName = e.currentTarget.dataset.studentName || '';
    app.globalData.pendingTabParams = {
      studentId: studentId,
      sectorId: sectorId,
      studentName: studentName
    };
    wx.switchTab({ url: '/pages/radar/radar' });
  },

  goToRadarByScore(e) {
    const studentId = e.currentTarget.dataset.studentId;
    const sectorId = e.currentTarget.dataset.sectorId;
    const date = e.currentTarget.dataset.date;
    const studentName = e.currentTarget.dataset.studentName || '';
    app.globalData.pendingTabParams = {
      studentId: studentId,
      sectorId: sectorId,
      date: date,
      studentName: studentName
    };
    wx.switchTab({ url: '/pages/radar/radar' });
  },

  onNameFilterChange(e) {
    this.setData({ nameFilter: e.detail.value });
    this.computeFilteredScores();
  },

  onSectorFilterChange(e) {
    const idx = Number(e.detail.value);
    const sectors = this.data.sectors;
    this.setData({
      sectorFilterIndex: idx,
      sectorFilter: idx > 0 ? sectors[idx - 1].id : ''
    });
    this.computeFilteredScores();
  },

  onSortChange(e) {
    const idx = Number(e.detail.value);
    const sorts = ['score_desc', 'score_asc', 'name'];
    this.setData({ sortIndex: idx, sortBy: sorts[idx] || 'score_desc' });
    this.computeFilteredScores();
  },

  retry() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  openStudentHistory(e) {
    if (!this.data.canViewAll) return;
    const studentId = e.currentTarget.dataset.studentId;
    const studentName = e.currentTarget.dataset.studentName;
    this.setData({
      showHistoryPopup: true,
      detailStudent: { studentId: studentId, studentName: studentName },
      detailLoading: true,
      studentHistory: [],
      detailExpandedId: null,
      detailExpandedDeductId: '',
      historyStats: { count: 0, avgScore: 0, bestSector: '-', bestGrade: '-' }
    });
    this.loadStudentHistory(studentId);
  },

  async loadStudentHistory(studentId) {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/scores/student/' + studentId + '/history' }));
      const raw = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      const hideInst = !this.data.canViewAll;
      const records = normalizeScoreHistoryRecords(raw).map(function(h) { return enrichRecord(h, undefined, hideInst); });

      let avgScore = 0, bestSector = '-', bestGrade = '-';
      if (records.length > 0) {
        avgScore = Math.round(records.reduce(function(sum, h) {
          return sum + (h.maxTotal > 0 ? (h.total / h.maxTotal) * 100 : 0);
        }, 0) / records.length);
        const best = records.reduce(function(a, b) { return a.total > b.total ? a : b; }, records[0]);
        bestSector = best.sectorName || '-';
        bestGrade = best._grade || '-';
      }

      this.setData({
        studentHistory: records,
        detailLoading: false,
        historyStats: { count: records.length, avgScore: avgScore, bestSector: bestSector, bestGrade: bestGrade }
      });
    } catch (e) {
      this.setData({ studentHistory: [], detailLoading: false });
    }
  },

  closeHistoryPopup() {
    this.setData({ showHistoryPopup: false, detailStudent: null, detailExpandedId: null });
  },

  preventClose() {},

  toggleDetailExpand(e) {
    const id = e.currentTarget.dataset.id;
    const newId = this.data.detailExpandedId === id ? null : id;
    this.setData({ detailExpandedId: newId });
    if (newId) {
      const record = this.data.studentHistory.find(function(h) { return h.id === newId; });
      if (record) {
        const self = this;
        wx.nextTick(function() { self.drawRadarForRecord(record); });
      }
    }
  },

  toggleDetailDeductExpand(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ detailExpandedDeductId: this.data.detailExpandedDeductId === key ? '' : key });
  },

  showCategoryDetail(e) {
    const recordIndex = e.currentTarget.dataset.recordIndex;
    const scoreIndex = e.currentTarget.dataset.scoreIndex;
    const record = this.data.filteredScores[recordIndex];
    const sp = record && record._scorePairs ? record._scorePairs[scoreIndex] : null;
    if (!record || !sp) return;
    const catName = sp.name;
    const studentId = record.studentId;
    const historyRecords = this.data.studentHistoryMap[studentId] || [];
    const trend = buildCategoryTrend(historyRecords, catName);
    const latestRec = trend.length > 0 ? trend[trend.length - 1].record : record;
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

  drawRadarForRecord(record) {
    if (this._drawing) return;
    const scoresArr = record.scoresArray || [];
    if (scoresArr.length === 0) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('#historyRadarCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        const self = this;
        setTimeout(function() { self.drawRadarForRecord(record); }, 300);
        return;
      }
      this._drawing = true;
      try {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const categories = scoresArr.map(function(s) {
          return { name: s.categoryName, max: s.maxScore || 100, score: Number(s.score || 0) };
        });
        const count = categories.length;
        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) / 2 - 44;
        const angleStep = (Math.PI * 2) / count;

        for (let l = 1; l <= 5; l++) {
          ctx.beginPath();
          const rl = (radius / 5) * l;
          for (let i = 0; i <= count; i++) {
            const a = i * angleStep - Math.PI / 2;
            const x = cx + rl * Math.cos(a), y = cy + rl * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = l === 5 ? '#1e3a5f' : 'rgba(30,58,95,0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        for (let i2 = 0; i2 < count; i2++) {
          const a2 = i2 * angleStep - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + radius * Math.cos(a2), cy + radius * Math.sin(a2));
          ctx.strokeStyle = 'rgba(30,58,95,0.5)';
          ctx.stroke();
          const lr = radius + 22;
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#8a9bb0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const name = categories[i2].name;
          if (name.length > 4) {
            ctx.fillText(name.substring(0, 4), cx + lr * Math.cos(a2), cy + lr * Math.sin(a2) - 6);
            ctx.fillText(name.substring(4, 8) + (name.length > 8 ? '...' : ''), cx + lr * Math.cos(a2), cy + lr * Math.sin(a2) + 6);
          } else {
            ctx.fillText(name, cx + lr * Math.cos(a2), cy + lr * Math.sin(a2));
          }
        }

        ctx.beginPath();
        for (let i3 = 0; i3 <= count; i3++) {
          const idx = i3 % count;
          const a3 = idx * angleStep - Math.PI / 2;
          const r3 = radius * (categories[idx].score / categories[idx].max);
          const x3 = cx + r3 * Math.cos(a3), y3 = cy + r3 * Math.sin(a3);
          if (i3 === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,210,106,0.15)';
        ctx.fill();
        ctx.strokeStyle = '#00d26a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowColor = '#00d26a';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i4 = 0; i4 < count; i4++) {
          const a4 = i4 * angleStep - Math.PI / 2;
          const r4 = radius * (categories[i4].score / categories[i4].max);
          ctx.beginPath();
          ctx.arc(cx + r4 * Math.cos(a4), cy + r4 * Math.sin(a4), 4, 0, Math.PI * 2);
          ctx.fillStyle = '#0a1628';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#00d26a';
          ctx.stroke();
        }
      } catch (err) {
        console.error('雷达图绘制失败', err);
      }
      this._drawing = false;
    });
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  logout() {
    getApp().logout();
  }
});
