const app = getApp();
const { isStudentRole, isInstructorRole, isManagerRole, navRoleCaption, getUserInfo } = require('../../utils/roles.js');
const { normalizeScoreHistoryRecords } = require('../../utils/scoreHistory.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function tabBarInit(page) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().init();
  }
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

function enrichRecord(record, studentName) {
  if (!record) return null;
  const pct = record.maxTotal > 0 ? Math.round((record.total / record.maxTotal) * 100) : 0;
  record._grade = getGradeText(pct);
  record._gradeClass = getGradeClass(pct);
  record._pct = pct;
  record.studentName = studentName || record.studentName || '未命名';

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
    historyStats: { count: 0, avgScore: 0, bestSector: '-', bestGrade: '-' }
  },

  _refreshing: false,
  _launchTime: 0,
  _drawing: false,

  onLoad() {
    let u = getUserInfo();
    const canViewAll = isInstructorRole(u && u.role) || isManagerRole(u && u.role);
    this.setData({
      userInfo: u,
      roleLabel: navRoleCaption(u),
      canViewAll: canViewAll
    });
    this.loadData();
    this._launchTime = Date.now();
  },

  onShow() {
    tabBarInit(this);
    let u = getUserInfo();
    const canViewAll = isInstructorRole(u && u.role) || isManagerRole(u && u.role);
    this.setData({ userInfo: u, canViewAll: canViewAll });

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
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const res = normalizeApiResponse(await app.request({ url: '/scores/student/' + s.userId + '/history' }));
        const raw = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        const records = normalizeScoreHistoryRecords(raw);
        if (records.length > 0) {
          const latest = enrichRecord(records[0], s.name);
          if (latest) results.push(latest);
        }
      } catch (e) {
        // skip
      }
    }

    this.setData({ latestScores: results, loading: false });
    this.computeFilteredScores();
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

  onTestLogout() {
    getApp().logout();
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
      const records = normalizeScoreHistoryRecords(raw).map(function(h) { return enrichRecord(h); });

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
  }
});
