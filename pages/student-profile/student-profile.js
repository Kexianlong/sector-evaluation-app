const app = getApp();
const { normalizeArrayPayload } = require('../../utils/api.js');
const { buildCategoryTrend, buildDetailItems, computeRate } = require('../../utils/categoryDetail.js');

Page({
  data: {
    studentId: '',
    student: null,
    scores: [],
    loading: true,
    activeTab: 'overview',
    expiringItems: [],
    expandedScoreId: null,
    sectorTrendData: [],

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
    const studentId = options.studentId || options.id;
    if (studentId) {
      this.setData({ studentId });
      this.loadStudentInfo(studentId);
      this.loadStudentScores(studentId);
    }
  },

  async loadStudentInfo(studentId) {
    try {
      const res = await app.request({ url: `/users/${studentId}` });
      const student = res.data || res;
      const expiringItems = this.checkExpiring(student);
      this.setData({ student, expiringItems });
    } catch (e) {
      wx.showToast({ title: '加载学员信息失败', icon: 'none' });
    }
  },

  async loadStudentScores(studentId) {
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: `/scores/student/${studentId}/history` });
      const scores = normalizeArrayPayload(res);
      const sectorTrendData = this._buildSectorTrendData(scores || []);
      this.setData({ scores: scores || [], loading: false, sectorTrendData });
      if (this.data.activeTab === 'trend') {
        this.drawSectorTrends();
      }
    } catch (e) {
      this.setData({ loading: false, sectorTrendData: [] });
    }
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'trend') {
      const self = this;
      wx.nextTick(function() { self.drawSectorTrends(); });
    }
  },

  checkExpiring(student) {
    const items = [];
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (student.icaoDate) {
      const d = new Date(student.icaoDate);
      if (d - now < thirtyDays && d > now) items.push({ label: 'ICAO英语到期', date: student.icaoDate, urgent: d - now < 7 * 24 * 60 * 60 * 1000 });
      else if (d <= now) items.push({ label: 'ICAO英语已过期', date: student.icaoDate, urgent: true });
    }
    if (student.medicalDate) {
      const d = new Date(student.medicalDate);
      if (d - now < thirtyDays && d > now) items.push({ label: '体检合格证到期', date: student.medicalDate, urgent: d - now < 7 * 24 * 60 * 60 * 1000 });
      else if (d <= now) items.push({ label: '体检合格证已过期', date: student.medicalDate, urgent: true });
    }
    return items;
  },

  goToRadar() {
    app.globalData.pendingTabParams = { studentId: this.data.studentId };
    wx.switchTab({ url: '/pages/radar/radar' });
  },

  goToRadarByScore(e) {
    const sectorId = e.currentTarget.dataset.sectorId;
    const date = e.currentTarget.dataset.date;
    const studentName = (this.data.student && this.data.student.name) || '';
    app.globalData.pendingTabParams = {
      studentId: this.data.studentId,
      sectorId: sectorId,
      date: date,
      studentName: studentName
    };
    wx.switchTab({ url: '/pages/radar/radar' });
  },

  drawSectorTrends() {
    const data = this.data.sectorTrendData;
    if (!data || data.length === 0) return;
    const self = this;
    data.forEach(function(sector, idx) {
      setTimeout(function() { self._drawSingleTrend(sector, idx); }, idx * 100);
    });
  },

  _drawSingleTrend(sector) {
    const canvasId = 'trendCanvas_' + sector.sectorId;
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
        // 单条数据时画一个点
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
      // 网格线
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

      // 填充区域
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

      // 折线
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      points.forEach(function(p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();

      // 数据点
      points.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#0f1724';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // X轴日期
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      data.forEach(function(d, i) {
        ctx.fillText(d.shortDate, points[i].x, height - 6);
      });

      // Y轴刻度
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round(maxS - (range / 4) * i);
        const y = padT + (chartH / 4) * i;
        ctx.fillText(val, padL - 4, y + 3);
      }
    });
  },

  goToScore() {
    app.globalData.pendingTabParams = {
      preselectStudent: this.data.studentId
    };
    wx.switchTab({ url: '/pages/score/score' });
  },

  goToEditUser() {
    wx.navigateTo({
      url: '/pages/users/users?editUserId=' + this.data.studentId
    });
  },

  toggleScoreExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedScoreId: this.data.expandedScoreId === id ? null : id });
  },

  showCategoryDetail(e) {
    const catName = e.currentTarget.dataset.catName;
    const recordId = e.currentTarget.dataset.recordId;
    if (!catName) return;
    const records = this.data.scores || [];
    const trend = buildCategoryTrend(records, catName);
    const currentRec = records.find(function(r) { return r._id === recordId || r.scoreId === recordId || r.id === recordId; });
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
  }
});
