const app = getApp();
const { canPickStudents, isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function tabBarInit(page) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().init();
  }
}

const ROLE_LABELS = {
  student: '学员',
  instructor: '教员',
  deputy_director: '科室副主任',
  supervisor: '培训主管',
  department_head: '科室主任',
  center_director: '中心主任',
};

const FALLBACK_SECTORS = [
  { id: 'ACC02_32', name: 'ACC02/32' },
  { id: 'ACC08', name: 'ACC08' },
  { id: 'ACC18_28', name: 'ACC18/28' }
];

function getGrade(total) {
  if (total >= 95) return { text: '优秀', color: '#00d26a', class: 'score-excellent' };
  if (total >= 90) return { text: '良好', color: '#ffaa00', class: 'score-good' };
  if (total >= 85) return { text: '合格', color: '#60a5fa', class: 'score-pass' };
  return { text: '不合格', color: '#ff4d4f', class: 'score-fail' };
}

Page({
  data: {
    currentSector: '',
    sectors: [],
    categories: [],
    totalScore: 0,
    maxScore: 100,
    grade: { text: '合格', color: '#60a5fa', class: 'score-pass' },
    showDetailPopup: false,
    selectedCategory: '',
    detailItems: [],
    expandedDeductKey: '',
    userInfo: null,
    roleLabel: '',
    levelLabel: '',
    students: [],
    selectedStudent: '',
    selectedStudentName: '',
    isInstructor: false,
    sectorConfig: null,
    rawScores: null,
    // 评分历史
    scoreHistory: [],
    selectedScoreIndex: -1,
    allStudentScores: [],
    personalReminder: '',
    scoreComparison: null,
    showStudentPanel: false,
    progressTrend: [],
    rankInfo: null,
    categoryTrend: [],
    selectedTrendIndex: -1,
    selectedTrendRate: 0,
    selectedTrendRecord: null,
    selectedTrendItems: []
  },
  _drawing: false,
  _refreshing: false,
  _launchTime: 0,

  async onLoad(options) {
    let userInfo = getUserInfo();
    const isInstructor = userInfo && canPickStudents(userInfo.role);
    const roleLabel = getRoleLabel(userInfo.role);
    const levelLabel = userInfo && userInfo.role === 'student' ? (userInfo.studentLevel || '') : '';

    const externalStudentId = options && options.studentId;
    const externalSectorId = options && options.sectorId;
    const externalDate = options && options.date;
    const externalStudentName = options && options.studentName;

    this.setData({
      userInfo,
      isInstructor,
      roleLabel,
      levelLabel,
      myReminders: [],
      selectedStudent: externalStudentId || '',
      selectedStudentName: externalStudentName || ''
    });

    if (isInstructor) await this.loadStudents();
    await this.loadSectors();

    if (externalSectorId) {
      const sectorExists = this.data.sectors.find(function(s) { return s.id === externalSectorId; });
      if (sectorExists) {
        this.setData({ currentSector: externalSectorId });
        wx.setStorageSync('lastSelectedSectorId', externalSectorId);
      }
    }

    this.loadMyReminders();
    this.computePersonalReminder(userInfo);

    const targetId = this.data.selectedStudent || (userInfo ? userInfo.userId : '');
    if (targetId) {
      await this.loadAllStudentScores(targetId);
      if (externalDate) {
        const self = this;
        wx.nextTick(function() { self._selectScoreByDate(externalDate); });
      }
    }
    this._launchTime = Date.now();
  },

  _selectScoreByDate(date) {
    const history = this.data.scoreHistory || [];
    const index = history.findIndex(function(h) { return h.date === date; });
    if (index >= 0) {
      this.selectScoreHistory(index, false);
    }
  },

  async loadMyReminders() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/my-reminders' }));
      if (res && res.success && res.data && res.data.reminders) {
        this.setData({ myReminders: res.data.reminders });
      }
    } catch (e) {
      // 静默失败
    }
  },

  async loadSectors() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      let sectors = [];
      if (Array.isArray(res)) sectors = res;
      else if (res && res.data && Array.isArray(res.data)) sectors = res.data;
      const list = sectors.map(s => ({ id: s.sectorId, name: s.name || s.sectorId }));
      const lastSector = wx.getStorageSync('lastSelectedSectorId');
      const sector = lastSector && list.find(s => s.id === lastSector) ? lastSector : (this.data.currentSector || (list[0] ? list[0].id : '') || '');
      this.setData({ sectors: list, currentSector: sector || '' });
      return;
    } catch (e) {
      console.log('[radar] 扇区列表加载失败，使用模拟数据');
    }
    const fallback = FALLBACK_SECTORS;
    const lastSector2 = wx.getStorageSync('lastSelectedSectorId');
    const defaultSector = lastSector2 && fallback.find(s => s.id === lastSector2) ? lastSector2 : (this.data.currentSector || fallback[0].id);
    this.setData({ sectors: fallback, currentSector: defaultSector });
  },

  async loadStudents() {
    try {
      const _ui2 = this.data.userInfo;
      const params = isManagerRole(_ui2 && _ui2.role) ? { includeReleased: 'true' } : {};
      const res = normalizeApiResponse(await app.request({ url: '/users/students', data: params }));
      let students = [];
      if (Array.isArray(res)) students = res;
      else if (res && Array.isArray(res.data)) students = res.data;
      else if (res && Array.isArray(res.items)) students = res.items;
      this.setData({ students: students.length > 0 ? students : [] });
    } catch {
      this.setData({ students: [] });
    }
    const lastStudentId = wx.getStorageSync('lastSelectedStudentId');
    if (lastStudentId && this.data.isInstructor) {
      const student = this.data.students.find(s => s.userId === lastStudentId);
      if (student) {
        this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
        this.loadStudentScore(this.data.currentSector, student.userId);
      }
    }
  },


  onStudentChange(e) {
    const student = this.data.students[e.detail.value];
    if (!student) return;
    this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
    this.loadStudentScore(this.data.currentSector, student.userId);
  },

  openStudentPanel() {
    this.setData({
      showStudentPanel: true
    });
  },

  closeStudentPanel() {
    this.setData({ showStudentPanel: false });
  },

  pickStudent(e) {
    const studentId = e.currentTarget.dataset.id;
    const studentName = e.currentTarget.dataset.name;
    this.setData({
      selectedStudent: studentId,
      selectedStudentName: studentName,
      showStudentPanel: false
    });
    wx.setStorageSync('lastSelectedStudentId', studentId);
    this.loadStudentScore(this.data.currentSector, studentId);
  },

  // 加载学员当前扇区的全部评分记录
  async loadAllStudentScores(studentId) {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/trends/student/' + studentId }));
      let allScores = [];
      if (res && res.success && res.data && res.data.scores) allScores = res.data.scores;
      else if (Array.isArray(res)) allScores = res;
      else if (res && Array.isArray(res.data)) allScores = res.data;
      this.setData({ allStudentScores: allScores });
      this.filterScoresBySector();
      this._computeRank(studentId);
    } catch (e) {
      this.setData({ allStudentScores: [], scoreHistory: [] });
    }
  },

  _computeRank(studentId) {
    const students = this.data.students;
    if (!students || students.length === 0) { this.setData({ rankInfo: null }); return; }
    const allScores = this.data.allStudentScores || [];
    const sectorId = this.data.currentSector;
    const studentScores = {};
    for (let i = 0; i < allScores.length; i++) {
      const s = allScores[i];
      if (sectorId && s.sectorId !== sectorId) continue;
      const sid = s.studentId;
      if (!studentScores[sid] || new Date(s.date) > new Date(studentScores[sid].date)) {
        studentScores[sid] = { total: s.totalScore || 0, date: s.date };
      }
    }
    const ranked = Object.keys(studentScores).sort((a, b) => studentScores[b].total - studentScores[a].total);
    const rank = ranked.indexOf(studentId) + 1;
    if (rank > 0) {
      this.setData({ rankInfo: { rank: rank, total: ranked.length } });
    } else {
      this.setData({ rankInfo: null });
    }
  },

  // 根据当前扇区过滤评分历史
  filterScoresBySector() {
    const allScores = this.data.allStudentScores || [];
    const sectorId = this.data.currentSector;
    const filtered = [];
    for (let i = 0; i < allScores.length; i++) {
      if (!sectorId || allScores[i].sectorId === sectorId) {
        filtered.push(allScores[i]);
      }
    }
    // 按日期降序
    filtered.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    // 为每条加上等级
    for (let j = 0; j < filtered.length; j++) {
      const scoreItem = filtered[j];
      scoreItem._grade = getGrade(scoreItem.totalScore || 0);
      scoreItem._index = j;
    }
    this.setData({ scoreHistory: filtered });
    const progressTrend = filtered.slice(0, 6).reverse().map(function(s) {
      return { date: (s.date || '').slice(5, 10), total: s.totalScore || 0 };
    });
    this.setData({ progressTrend: progressTrend });
    setTimeout(() => this.drawProgressTrend(), 300);
    // 默认选中最近一条
    if (filtered.length > 0) {
      this.selectScoreHistory(0, false);
    } else {
      this._displayScore(null);
      this.setData({ selectedScoreIndex: -1 });
    }
  },

  // 选择历史评分（兼容 bindtap 事件和直接调用）
  selectScoreHistory(e, loadConfig) {
    let index;
    // bindtap 事件对象
    if (e && typeof e === 'object' && e.currentTarget) {
      index = Number(e.currentTarget.dataset.index);
    } else {
      index = Number(e);
      if (loadConfig === undefined) loadConfig = true;
    }
    if (isNaN(index)) return;
    const history = this.data.scoreHistory;
    if (index < 0 || index >= history.length) return;
    const score = history[index];
    this.setData({ selectedScoreIndex: index });
    this._displayScore(score, loadConfig !== false ? true : false);
  },

  // 展示某条评分
  computeScoreComparison(scoreData) {
    var history = this.data.scoreHistory;
    if (!history || history.length < 2 || !scoreData) {
      this.setData({ scoreComparison: null });
      return;
    }
    var currentIdx = this.data.selectedScoreIndex;
    var nextIdx = currentIdx + 1;
    if (nextIdx >= history.length) {
      this.setData({ scoreComparison: null });
      return;
    }
    var prevScore = history[nextIdx];
    var currTotal = scoreData.totalScore || 0;
    var prevTotal = prevScore.totalScore || 0;
    var totalDiff = currTotal - prevTotal;
    var totalTrend = totalDiff > 0 ? '↑+' + totalDiff : totalDiff < 0 ? '↓' + totalDiff : '→0';
    var categories = [];
    var currScores = scoreData.scores || [];
    var prevScores = prevScore.scores || [];
    for (var i = 0; i < currScores.length; i++) {
      var cat = currScores[i];
      var prevCat = null;
      for (var j = 0; j < prevScores.length; j++) {
        if (prevScores[j].categoryName === cat.categoryName) {
          prevCat = prevScores[j];
          break;
        }
      }
      if (prevCat) {
        var diff = (cat.score || 0) - (prevCat.score || 0);
        var trend = diff > 0 ? '↑+' + diff : diff < 0 ? '↓' + diff : '→0';
        categories.push({ name: cat.categoryName, diff: diff, trend: trend });
      }
    }
    this.setData({
      scoreComparison: {
        totalDiff: totalDiff,
        totalTrend: totalTrend,
        categories: categories
      }
    });
  },

  _displayScore(scoreData, loadSectorConfig) {
    const sectorId = this.data.currentSector;
    if (loadSectorConfig !== false && sectorId) this.loadSectorConfigForDisplay(sectorId);

    if (scoreData && scoreData.scores && scoreData.scores.length > 0) {
      const categories = scoreData.scores.map(function(s) {
        return {
          name: s.categoryName, max: s.maxScore || 100, score: s.score || 0, items: s.items || []
        };
      });
      const total = scoreData.totalScore || 0;
      let maxScore = 0;
      for (let ci = 0; ci < categories.length; ci++) maxScore += categories[ci].max || 100;
      if (maxScore === 0) maxScore = 100;
      this.setData({
        categories: categories, totalScore: total, maxScore: maxScore,
        grade: getGrade(total), rawScores: scoreData, showDetailPopup: false,
        selectedCategory: '', detailItems: [], expandedDeductKey: ''
      });
      this.computeScoreComparison(scoreData);
      const self = this;
      setTimeout(function() { self.retryDrawRadar(3); }, 100);
    } else {
      this.setData({ categories: [], totalScore: 0, maxScore: 100, grade: getGrade(0), rawScores: null, scoreComparison: null });
      this.clearRadar();
    }
  },

  // 异步加载扇区配置
  async loadSectorConfigForDisplay(sectorId) {
    let sectorRes;
    try { sectorRes = normalizeApiResponse(await app.request({ url: '/sectors/' + sectorId })); } catch(e) {}
    let sectorConfig = null;
    if (sectorRes) {
      const sd = sectorRes.data;
      sectorConfig = sectorRes.categories ? sectorRes : (sd && sd.categories ? sd : null);
    }
    
    if (sectorConfig) this.setData({ sectorConfig: sectorConfig });
  },

  // 原有的 loadStudentScore 改为委托到新方法
  async loadStudentScore(sectorId, studentId) {
    const targetId = studentId || (this.data.userInfo && this.data.userInfo.role === 'student' ? this.data.userInfo.userId : '');
    if (targetId) this.loadAllStudentScores(targetId);
  },

  clearRadar() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio);
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  },

  onShow() {
    tabBarInit(this);
    const userInfo = app.globalData.userInfo;

    // 处理从其他页面通过 switchTab 传递的参数
    const pending = app.globalData.pendingTabParams;
    if (pending) {
      app.globalData.pendingTabParams = null;
      const updates = {};
      if (pending.studentId) {
        updates.selectedStudent = pending.studentId;
        updates.selectedStudentName = pending.studentName || '';
      }
      if (pending.sectorId && this.data.sectors && this.data.sectors.length) {
        const sectorExists = this.data.sectors.find(function(s) { return s.id === pending.sectorId; });
        if (sectorExists) {
          updates.currentSector = pending.sectorId;
          wx.setStorageSync('lastSelectedSectorId', pending.sectorId);
        }
      }
      if (Object.keys(updates).length) {
        this.setData(updates);
      }
      if (pending.studentId) {
        const self = this;
        this.loadAllStudentScores(pending.studentId).then(function() {
          if (pending.date) self._selectScoreByDate(pending.date);
        });
      }
    }

    if (userInfo) {
      let _lv2 = '';
      if (userInfo.role === 'student') _lv2 = userInfo.studentLevel || '';
      else if (userInfo.role === 'instructor') _lv2 = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
      const levelLabel = _lv2;
      this.setData({ roleLabel: getRoleLabel(userInfo.role), levelLabel });
      this.computePersonalReminder(userInfo);
    }
    // 防抖 + 启动保护（onLoad 完成后2秒内不重复加载）
    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    this._refreshing = true;
    const self = this;
    // 切回时重新加载扇区数据和评分（确保与配置页联动）
    if (this.data.sectors.length > 0) {
      this.loadSectors().then(function () {
        if (self.data.currentSector) {
          const targetId = self.data.selectedStudent || (userInfo ? userInfo.userId : '');
          if (targetId) self.loadAllStudentScores(targetId);
          self._drawn = false; // 重置标记，触发重绘
        }
      }).catch(function () {}).finally(function () {
        self._refreshing = false;
      });
    } else if (!this._drawn && this.data.rawScores) {
      // 首次且数据就绪时重绘
      this._drawn = true;
      this.retryDrawRadar(3);
      this._refreshing = false;
    } else {
      this._refreshing = false;
    }
  },

  onReady() {
    if (this.data.rawScores && !this._drawn) {
      this._drawn = true;
      this.retryDrawRadar(3);
    }
  },

  switchSector(e) {
    const sector = e.currentTarget.dataset.id || e.currentTarget.dataset.sector;
    if (sector === this.data.currentSector) return;
    this.setData({ currentSector: sector });
    wx.setStorageSync('lastSelectedSectorId', sector);
    this.filterScoresBySector();
  },

  scrollToHistory() {
    wx.createSelectorQuery().in(this).select('#historySection').boundingClientRect(function(rect) {
      if (rect) {
        wx.pageScrollTo({ scrollTop: rect.top + (wx.getWindowInfo ? wx.getWindowInfo().windowHeight : wx.getSystemInfoSync().windowHeight) * 0.15, duration: 300 });
      }
    }).exec();
  },

  retryDrawRadar(retries) {
    if (retries <= 0 || this._drawing) return;
    const doQuery = () => {
      if (this._drawing) return;
      const query = wx.createSelectorQuery().in(this);
      query.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (retries > 1) setTimeout(() => this.retryDrawRadar(retries - 1), 400);
          return;
        }
        this._drawing = true;
        // 使用 requestAnimationFrame 避免阻塞主线程
        const draw = () => {
          try { this.doDrawRadar(res[0]); } catch (e) { console.error('[radar] draw error', e); }
          this._drawing = false;
          this._drawn = true;
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(draw);
        else draw();
      });
    };
    wx.nextTick ? wx.nextTick(doQuery) : doQuery();
  },

  drawProgressTrend() {
    const data = this.data.progressTrend;
    if (!data || data.length < 2) return;
    const query = wx.createSelectorQuery().in(this);
    query.select('#progressCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const w = res[0].width;
      const h = res[0].height;
      const padL = 36, padR = 16, padT = 16, padB = 28;
      const chartW = w - padL - padR;
      const chartH = h - padT - padB;
      const scores = data.map(d => d.total);
      const minS = Math.min(...scores) - 5;
      const maxS = Math.max(...scores) + 5;
      const range = maxS - minS || 1;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#1e2d42';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      }
      const points = data.map((d, i) => ({
        x: padL + (chartW / (data.length - 1)) * i,
        y: padT + chartH - ((d.total - minS) / range) * chartH
      }));
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
      ctx.beginPath();
      ctx.moveTo(points[0].x, padT + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      points.forEach(p => {
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
      data.forEach((d, i) => {
        ctx.fillText(d.date, points[i].x, h - 6);
      });
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round(maxS - (range / 4) * i);
        const y = padT + (chartH / 4) * i;
        ctx.fillText(val, padL - 4, y + 3);
      }
    });
  },

  doDrawRadar(canvasRes) {
    try {
      const canvas = canvasRes.node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio);
      const width = canvasRes.width;
      const height = canvasRes.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      const categories = this.data.categories;
      if (!categories || categories.length === 0) return;
      const count = categories.length;
      const cx = width / 2, cy = height / 2;
      const radius = Math.min(width, height) / 2 - 44;
      const angleStep = (Math.PI * 2) / count;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let l = 1; l <= 5; l++) {
        ctx.beginPath();
        const r = (radius / 5) * l;
        for (let i = 0; i <= count; i++) {
          const a = i * angleStep - Math.PI / 2;
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = l === 5 ? '#1e3a5f' : 'rgba(30, 58, 95, 0.4)';
        ctx.stroke();
      }
      for (let i = 0; i < count; i++) {
        const a = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.5)';
        ctx.stroke();
        const lr = radius + 22;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#8a9bb0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = categories[i].name;
        if (name.length > 4) {
          ctx.fillText(name.substring(0, 4), cx + lr * Math.cos(a), cy + lr * Math.sin(a) - 6);
          ctx.fillText(name.substring(4, 8) + (name.length > 8 ? '...' : ''), cx + lr * Math.cos(a), cy + lr * Math.sin(a) + 6);
        } else ctx.fillText(name, cx + lr * Math.cos(a), cy + lr * Math.sin(a));
      }
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const idx = i % count, a = idx * angleStep - Math.PI / 2;
        const r = radius * (categories[idx].score / categories[idx].max);
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 210, 106, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#00d26a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowColor = '#00d26a';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let i = 0; i < count; i++) {
        const a = i * angleStep - Math.PI / 2;
        const r = radius * (categories[i].score / categories[i].max);
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1628';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00d26a';
        ctx.stroke();
      }
    } catch (err) { console.error('[radar] 绘制失败:', err); }
  },

  _buildDetailItems(catName, record) {
    let items = [];
    const _scfg = this.data.sectorConfig;
    if (_scfg && _scfg.categories) {
      const _ccat = _scfg.categories.find(function(c) { return c.name === catName; });
      if (_ccat && _ccat.items) items = _ccat.items.map(function(it) { return { id: it.id, name: it.name, maxScore: it.maxScore || 0, deductionTemplate: (it.deductionReason || it.description || '').trim() }; });
    }
    if (record) {
      if (record.itemDetails && record.itemDetails.length) {
        items = items.map(it => {
          const m = record.itemDetails.find(function(d) { return (it.id && d.itemId === it.id) || d.itemName === it.name; });
          if (m && 'score' in m) {
            return Object.assign({}, it, { score: m.score, maxScore: m.maxScore !== undefined ? m.maxScore : it.maxScore, deductionReason: (m.reason || '').trim(), hasScore: true });
          }
          return it;
        });
      } else if (record.scores) {
        const sc = record.scores.find(s => s.categoryName === catName);
        if (sc && sc.items) {
          items = items.map(it => {
            const si = sc.items.find(function(x) { return x.name === it.name; });
            if (si && 'score' in si) {
              return Object.assign({}, it, { score: si.score, maxScore: si.maxScore !== undefined ? si.maxScore : it.maxScore, deductionReason: (si.reason || '').trim(), hasScore: true });
            }
            return it;
          });
        } else if (sc) {
          // 降级：有分类得分但无子项数据时，按分类得分比例分配子项分数
          const catScore = sc.score || 0;
          const catMax = sc.maxScore || 0;
          items = items.map(it => {
            const itemMax = it.maxScore || 0;
            let itemScore = itemMax;
            if (catMax > 0 && itemMax > 0) {
              itemScore = Math.round(itemMax * catScore / catMax);
            }
            itemScore = Math.min(itemScore, itemMax);
            const isDeducted = itemScore < itemMax;
            return Object.assign({}, it, {
              score: itemScore,
              maxScore: itemMax,
              hasScore: true,
              deductionReason: isDeducted ? ((it.deductionTemplate || '该项未获得满分').trim()) : ''
            });
          });
        }
      }
    }
    items = items.map(function(it) {
      const base = 'hasScore' in it ? it : Object.assign({}, it, { hasScore: false });
      const isDeducted = base.hasScore && Number(base.maxScore) > 0 && Number(base.score) < Number(base.maxScore);
      return Object.assign({}, base, { isDeducted: isDeducted, deductKey: catName + '_' + (base.id || base.name) });
    });
    return items;
  },

  showDetail(e) {
    let index;
    // 兼容 bindtap 事件对象和直接传入数字索引
    if (e && typeof e === 'object' && e.currentTarget) {
      index = Number(e.currentTarget.dataset.index);
    } else {
      index = Number(e);
    }
    if (isNaN(index)) return;
    const category = this.data.categories[index];
    if (!category) { this.setData({ showDetailPopup: true, selectedCategory: '', detailItems: [], categoryTrend: [], selectedTrendRecord: null, selectedTrendItems: [] }); return; }
    const catName = category.name;
    const history = this.data.scoreHistory || [];
    const catTrend = [];
    for (let hi = Math.min(history.length - 1, 5); hi >= 0; hi--) {
      const rec = history[hi];
      if (!rec || !rec.scores) continue;
      const catScore = rec.scores.find(function(s) { return s.categoryName === catName; });
      if (catScore) {
        catTrend.push({ date: (rec.date || '').slice(5, 10), score: catScore.score || 0, maxScore: catScore.maxScore || 0, recordIndex: hi, fullDate: rec.date });
      }
    }
    // 默认显示最新记录的扣分项
    const latestRec = catTrend.length > 0 ? history[catTrend[catTrend.length - 1].recordIndex] : (this.data.rawScores || null);
    const items = this._buildDetailItems(catName, latestRec);
    this.setData({
      showDetailPopup: true,
      selectedCategory: catName,
      detailItems: items,
      expandedDeductKey: '',
      categoryTrend: catTrend,
      selectedTrendIndex: catTrend.length > 0 ? catTrend.length - 1 : -1,
      selectedTrendRate: catTrend.length > 0 && catTrend[catTrend.length - 1].maxScore > 0 ? Math.round(catTrend[catTrend.length - 1].score / catTrend[catTrend.length - 1].maxScore * 100) : 0,
      selectedTrendRecord: latestRec,
      selectedTrendItems: items
    });
  },

  hideDetail() { this.setData({ showDetailPopup: false, expandedDeductKey: '', selectedTrendIndex: -1, selectedTrendRecord: null, selectedTrendItems: [] }); },
  preventHide() { /* stopPropagation */ },

  showTrendDetail(e) {
    const index = Number(e.currentTarget.dataset.index);
    const trend = this.data.categoryTrend[index];
    if (!trend) return;
    const rate = trend.maxScore > 0 ? Math.round(trend.score / trend.maxScore * 100) : 0;
    const history = this.data.scoreHistory || [];
    const record = history[trend.recordIndex];
    const items = record ? this._buildDetailItems(this.data.selectedCategory, record) : this.data.selectedTrendItems;
    this.setData({
      selectedTrendIndex: index,
      selectedTrendRate: rate,
      selectedTrendRecord: record,
      selectedTrendItems: items,
      expandedDeductKey: ''
    });
  },

  // Canvas 雷达图点击 → 角度命中检测，触发指标详情
  onRadarTap(e) {
    const categories = this.data.categories;
    if (!categories || categories.length === 0) return;
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!touch) return;
    const self = this;
    const query = wx.createSelectorQuery().in(this);
    query.select('#radarCanvas').boundingClientRect().exec(function(res) {
      const rect = res && res[0];
      if (!rect) return;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 半径与 doDrawRadar 对齐：min(w,h)/2 - 44
      const radius = Math.min(rect.width, rect.height) / 2 - 44;
      // 忽略中心区域和外圈标签区
      if (dist < 20 || dist > radius + 36) return;

      // 角度：atan2(dx, -dy) 使 0=正上方，与 doDrawRadar 的 -PI/2 起始偏移对齐
      let angle = Math.atan2(dx, -dy);
      if (angle < 0) angle += Math.PI * 2;

      const count = categories.length;
      const angleStep = (Math.PI * 2) / count;
      const nearestIndex = Math.round(angle / angleStep) % count;

      self.showDetail(nearestIndex);
    });
  },

  scrollToRadar() {
    if (!this.data.rawScores) return;
    wx.pageScrollTo({ selector: '#radarCanvas', duration: 300 });
  },
  toggleDeductExpand(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.detailItems.find(it => it.deductKey === key);
    if (!item || !item.isDeducted) return;
    this.setData({ expandedDeductKey: this.data.expandedDeductKey === key ? '' : key });
  },

  computePersonalReminder(userInfo) {
    if (!userInfo) return;
    var skipTs = wx.getStorageSync('personalReminderSkip');
    if (skipTs && Date.now() - Number(skipTs) < 86400000) {
      this.setData({ personalReminder: '' });
      return;
    }
    var now = new Date();
    var parts = [];
    var icaoDate = userInfo.icaoDate;
    if (icaoDate) {
      var days = Math.ceil((new Date(icaoDate) - now) / 86400000);
      if (days < 0) parts.push('ICAO英语已过期' + Math.abs(days) + '天');
      else if (days <= 30) parts.push('ICAO英语即将到期（剩余' + days + '天）');
    }
    var medicalDate = userInfo.medicalDate;
    if (medicalDate) {
      var mdays = Math.ceil((new Date(medicalDate) - now) / 86400000);
      if (mdays < 0) parts.push('体检合格证已过期' + Math.abs(mdays) + '天');
      else if (mdays <= 30) parts.push('体检合格证即将到期（剩余' + mdays + '天）');
    }
    this.setData({ personalReminder: parts.length > 0 ? parts.join('；') : '' });
  },

  dismissPersonalReminder() {
    wx.setStorageSync('personalReminderSkip', Date.now());
    this.setData({ personalReminder: '' });
  },

  logout() {
    getApp().logout();
  }
});