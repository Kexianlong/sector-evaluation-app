const app = getApp();
const { canPickStudents, isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo } = require('../../utils/roles.js');
const { MOCK_SECTORS } = require('../../utils/mockData.js');

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
    allStudentScores: []
  },
  _drawing: false,
  _refreshing: false,
  _launchTime: 0,

  async onLoad() {
    let userInfo = getUserInfo();
    const isInstructor = userInfo && canPickStudents(userInfo.role);
    const roleLabel = navRoleCaption(userInfo);
    const levelLabel = userInfo && userInfo.role === 'student' ? (userInfo.studentLevel || '') : '';
    this.setData({ userInfo, isInstructor, roleLabel, levelLabel, myReminders: [] });

    if (isInstructor) this.loadStudents();
    await this.loadSectors();
    this.loadMyReminders();

    const targetId = this.data.selectedStudent || (userInfo ? userInfo.userId : '');
    if (targetId) {
      this.loadAllStudentScores(targetId);
    }
    this._launchTime = Date.now();
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
      const sector = this.data.currentSector || (list[0] ? list[0].id : '') || '';
      this.setData({ sectors: list, currentSector: sector || '' });
      return;
    } catch (e) {
      console.log('[radar] 扇区列表加载失败，使用模拟数据');
    }
    // 降级：使用 MOCK_SECTORS
    const mockList = (MOCK_SECTORS || []).map(s => ({ id: s.sectorId, name: s.name || s.sectorId }));
    const fallback = mockList.length > 0 ? mockList : FALLBACK_SECTORS;
    this.setData({ sectors: fallback, currentSector: this.data.currentSector || fallback[0].id });
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
      const { MOCK_STUDENTS } = require('../../utils/mockData.js');
      this.setData({ students: MOCK_STUDENTS || [] });
    }
  },


  onStudentChange(e) {
    const student = this.data.students[e.detail.value];
    if (!student) return;
    this.setData({ selectedStudent: student.userId, selectedStudentName: student.name });
    this.loadStudentScore(this.data.currentSector, student.userId);
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
    } catch (e) {
      this.setData({ allStudentScores: [], scoreHistory: [] });
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
      const self = this;
      setTimeout(function() { self.retryDrawRadar(3); }, 100);
    } else {
      this.setData({ categories: [], totalScore: 0, maxScore: 100, grade: getGrade(0), rawScores: null });
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
    if (!sectorConfig) {
      const mockSector = (MOCK_SECTORS || []).find(function(s) { return s.sectorId === sectorId; });
      if (mockSector) sectorConfig = { categories: mockSector.categories, totalScore: mockSector.totalScore };
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
    if (userInfo) {
      let _lv2 = '';
      if (userInfo.role === 'student') _lv2 = userInfo.studentLevel || '';
      else if (userInfo.role === 'instructor') _lv2 = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
      const levelLabel = _lv2;
      this.setData({ roleLabel: navRoleCaption(userInfo), levelLabel });
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
    const sector = e.currentTarget.dataset.sector;
    if (sector === this.data.currentSector) return;
    this.setData({ currentSector: sector });
    // 从已加载的全部评分中过滤，不需要重新请求
    this.filterScoresBySector();
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

  showDetail(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.categories[index];
    if (!category) { this.setData({ showDetailPopup: true, selectedCategory: '', detailItems: [] }); return; }
    const catName = category.name;
    let items = [];
    const _scfg = this.data.sectorConfig;
    if (_scfg && _scfg.categories) {
      const _ccat = _scfg.categories.find(function(c) { return c.name === catName; });
      if (_ccat && _ccat.items) items = _ccat.items.map(function(it) { return { id: it.id, name: it.name, maxScore: it.maxScore || 0, deductionTemplate: (it.deductionReason || it.description || '').trim() }; });
    }
    if (!items.length && category.items && category.items.length) items = category.items.map(function(it) { return { id: it.id || it.itemId, name: it.name, score: it.score, maxScore: it.maxScore || 0, deductionTemplate: (it.deductionReason || it.description || '').trim(), hasScore: 'score' in it }; });
    if (this.data.rawScores) {
      if (this.data.rawScores.itemDetails && this.data.rawScores.itemDetails.length) {
        items = items.map(it => {
          const m = this.data.rawScores.itemDetails.find(function(d) { return (it.id && d.itemId === it.id) || d.itemName === it.name; });
          if (m && 'score' in m) {
            return Object.assign({}, it, { score: m.score, maxScore: m.maxScore !== undefined ? m.maxScore : it.maxScore, deductionReason: (m.reason || '').trim(), hasScore: true });
          }
          return it;
        });
      } else if (this.data.rawScores.scores) {
        const sc = this.data.rawScores.scores.find(s => s.categoryName === catName);
        if (sc && sc.items) {
          items = items.map(it => {
            const si = sc.items.find(function(x) { return x.name === it.name; });
            if (si && 'score' in si) {
              return Object.assign({}, it, { score: si.score, maxScore: si.maxScore !== undefined ? si.maxScore : it.maxScore, deductionReason: (si.reason || '').trim(), hasScore: true });
            }
            return it;
          });
        }
      }
    }
    items = items.map(function(it) {
      const base = 'hasScore' in it ? it : Object.assign({}, it, { hasScore: false });
      const isDeducted = base.hasScore && Number(base.maxScore) > 0 && Number(base.score) < Number(base.maxScore);
      return Object.assign({}, base, { isDeducted: isDeducted, deductKey: catName + '_' + (base.id || base.name) });
    });
    this.setData({ showDetailPopup: true, selectedCategory: catName, detailItems: items, expandedDeductKey: '' });
  },

  hideDetail() { this.setData({ showDetailPopup: false, expandedDeductKey: '' }); },
  preventHide() { /* stopPropagation */ },
  toggleDeductExpand(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.detailItems.find(it => it.deductKey === key);
    if (!item || !item.isDeducted) return;
    this.setData({ expandedDeductKey: this.data.expandedDeductKey === key ? '' : key });
  }
});
