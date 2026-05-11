const app = getApp();
const { canPickStudents, isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo } = require('../../utils/roles.js');
const { MOCK_SECTORS } = require('../../utils/mockData.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function tabBarInit(page) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().init();
  }
}

function getGradeClass(score) {
  if (score >= 95) return 'score-excellent';
  if (score >= 90) return 'score-good';
  if (score >= 85) return 'score-pass';
  return 'score-fail';
}

function getGradeText(score) {
  if (score >= 95) return '优秀';
  if (score >= 90) return '良好';
  if (score >= 85) return '合格';
  return '不合格';
}

Page({
  data: {
    currentSector: '',
    sectors: [],
    trendData: [],
    userInfo: null,
    students: [],
    isInstructor: false,
    roleLabel: '',
    levelLabel: '',
    loading: false,
    loadError: '',
    sectorDetail: null,
    detailStudent: null,
    studentHistory: [],
    detailLoading: false,
    detailExpandedId: null,
    detailExpandedDeductId: ''
  },

  _refreshing: false,
  _launchTime: 0,

  async onLoad() {
    let userInfo = getUserInfo();
    const isInstructor = userInfo && canPickStudents(userInfo.role);
    const roleLabel = navRoleCaption(userInfo);
    let _lv = '';
    if (userInfo) {
      if (userInfo.role === 'student') _lv = userInfo.studentLevel || '';
      else if (userInfo.role === 'instructor') _lv = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
    }
    const levelLabel = _lv;
    const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
    const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
    const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';
    const avatarUrl = userInfo && (userInfo.photoUrl || (userInfo.gender === '女'
      ? AVATAR_FEMALE
      : (userInfo.gender === '男' ? AVATAR_MALE : AVATAR_DEFAULT)));
    this.setData({ userInfo, isInstructor, roleLabel, levelLabel, avatarUrl });

    await this.loadStudents();
    await this.loadSectors();
    this._launchTime = Date.now();
  },

  onShow() {
    tabBarInit(this);
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      let _lv2 = '';
      if (userInfo.role === 'student') _lv2 = userInfo.studentLevel || '';
      else if (userInfo.role === 'instructor') _lv2 = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
      const levelLabel = _lv2;
      const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
      const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
      const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';
      const avatarUrl = userInfo.photoUrl || (userInfo.gender === '女'
        ? AVATAR_FEMALE
        : (userInfo.gender === '男' ? AVATAR_MALE : AVATAR_DEFAULT));
      this.setData({ userInfo, levelLabel, avatarUrl });
    }
    // 防抖 + 启动保护（onLoad 完成后2秒内不重复加载）
    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    this._refreshing = true;
    // 切回时重新加载扇区数据（确保与配置页联动）
    const self = this;
    (this.loadSectors() || Promise.resolve()).finally(function () {
      self._refreshing = false;
    });
  },

  onReady() {
    if (this.data.trendData.length > 0) {
      setTimeout(() => this.drawMiniRadar(), 300);
    }
  },

  onTestLogout() {
    getApp().logout();
  },

  /* ==================== 数据加载 ==================== */

  async loadStudents() {
    if (!this.data.isInstructor) {
      // 学员端：只需当前用户
      const userInfo = this.data.userInfo;
      const students = (userInfo && userInfo.userId)
        ? [{ userId: userInfo.userId, name: userInfo.name || '我' }]
        : [];
      this.setData({ students });
      return;
    }
    // 教员/管理端：加载所有学员
    try {
      const userInfo = app.globalData.userInfo;
      const isManager = userInfo && isManagerRole(userInfo.role);
      const rawRes = await app.request({
        url: '/users/students'
      });
      const res = normalizeApiResponse(rawRes);
      // mock 模式返回 {success:true, data:[...]}，真实接口可能返回 {success:true, data:{items:[...]}}
      let students = [];
      if (res && Array.isArray(res.data)) {
        students = res.data;
      } else if (res && res.data && Array.isArray(res.data.items)) {
        students = res.data.items;
      } else if (Array.isArray(res)) {
        students = res;
      } else if (res && Array.isArray(res)) {
        students = res;
      }
      if (students.length > 0) {
        this.setData({ students: students });
      } else {
        this.setData({ students: [] });
      }
    } catch (e) {
      this.setData({ students: [] });
    }
  },

  async loadSectors() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      if (res && res.success && res.data && res.data.length > 0) {
        const sectors = res.data.map(s => ({ id: s.sectorId, name: s.name || s.sectorId }));
        this.setData({ sectors });
        const sector = this.data.currentSector || sectors[0].id;
        this.setData({ currentSector: sector });
        await this.loadSectorDetail(sector);
        await this.loadTrend(sector);
        return;
      }
    } catch (e) {
      console.log('[trend] 扇区列表加载失败，使用模拟数据');
    }
    // 降级：使用 MOCK_SECTORS
    const fallback = (MOCK_SECTORS || []).map(s => ({ id: s.sectorId, name: s.name || s.sectorId }));
    if (fallback.length === 0) {
      fallback.push(
        { id: 'ACC02_32', name: 'ACC02/32' },
        { id: 'ACC08', name: 'ACC08' },
        { id: 'ACC18_28', name: 'ACC18/28' }
      );
    }
    this.setData({ sectors: fallback, currentSector: this.data.currentSector || fallback[0].id });
    await this.loadSectorDetail(this.data.currentSector);
    await this.loadTrend(this.data.currentSector);
  },

  async loadSectorDetail(sectorId) {
    try {
      const res = normalizeApiResponse(await app.request({ url: `/sectors/${sectorId}` }));
      if (res && res.success && res.data) {
        const categories = res.data.categories || [];
        // 即使 API 成功返回，若 categories 为空则尝试从 MOCK_SECTORS 补充
        if (categories.length > 0) {
          this.setData({
            sectorDetail: {
              sectorId: res.data.sectorId || sectorId,
              categories,
              totalScore: res.data.totalScore || 100
            }
          });
          return;
        }
      }
    } catch (e) {
      console.log('[trend] 扇区详情加载失败');
    }
    // 降级（API 失败或 categories 为空）：从 MOCK_SECTORS 查找完整数据
    const mockSector = (MOCK_SECTORS || []).find(s => s.sectorId === sectorId);
    if (mockSector) {
      this.setData({
        sectorDetail: {
          sectorId: mockSector.sectorId,
          categories: mockSector.categories || [],
          totalScore: mockSector.totalScore || 100
        }
      });
    } else {
      this.setData({ sectorDetail: null });
    }
  },

  // 限制并发请求数，避免同时发起过多请求导致阻塞
  async _concurrentMap(array, concurrency, mapper) {
    const results = [];
    const executing = [];
    for (let i = 0; i < array.length; i++) {
      const p = Promise.resolve().then(() => mapper(array[i], i));
      results.push(p);
      if (array.length >= concurrency) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= concurrency) await Promise.race(executing);
      }
    }
    return Promise.all(results);
  },

  async loadTrend(sectorId) {
    if (!sectorId) return;
    this.setData({ loading: true, loadError: '' });

    const { students, isInstructor, sectorDetail } = this.data;
    const targetStudents = students.length > 0 ? students.slice() : [];
    if (targetStudents.length === 0) {
      const userInfo = this.data.userInfo;
      if (userInfo && userInfo.userId) {
        targetStudents.push({ userId: userInfo.userId, name: userInfo.name || '我' });
      }
    }

    if (targetStudents.length === 0) {
      this.setData({ loading: false, trendData: [] });
      return;
    }

    const categories = (sectorDetail && sectorDetail.categories) || [];

    try {
      const allRows = await this._concurrentMap(targetStudents, 3, async (s) => {
        try {
          if (isInstructor) {
            // 教员/管理端：获取每个学员最近一次评分
            const res = normalizeApiResponse(await app.request({ url: `/scores/student/${s.userId}/sector/${sectorId}` }));
            if (res && res.success && res.data && res.data.scores && res.data.scores.length > 0) {
              return [this._enhanceRecord(res.data, s, sectorId)];
            }
          } else {
            // 学员端：获取所有历史记录
            const res = normalizeApiResponse(await app.request({ url: `/trends/student/${s.userId}`, data: { sectorId } }));
            let records = [];
            if (res && res.data) {
              if (Array.isArray(res.data)) {
                records = res.data;
              } else if (Array.isArray(res.data.scores)) {
                records = res.data.scores;
              } else if (Array.isArray(res.data.items)) {
                records = res.data.items;
              }
            }
            if (records.length > 0) {
              return records.map(r => this._enhanceRecord(r, s, sectorId));
            }
          }
        } catch (e) {
          console.log('[trend] 学员评分加载失败:', s.userId, e);
        }
        // API 降级：生成模拟数据
        return this._generateMockRecords(s, sectorId, categories);
      });

      let normalized = allRows.flat().filter(Boolean);
      normalized.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

      this.setData({ trendData: normalized, loading: false }, () => {
        setTimeout(() => this.drawMiniRadar(), 300);
      });
    } catch (err) {
      this.setData({
        loadError: err.message || '数据加载失败',
        loading: false,
        trendData: []
      });
    }
  },

  /* ==================== 数据增强 ==================== */

  _enhanceRecord(record, student, sectorId) {
    const scores = record.scores || [];
    const itemDetails = record.itemDetails || [];

    // 用于雷达图的分类得分
    const computedScores = scores.map(s => ({
      name: s.categoryName || s.name || '',
      score: Number(s.score || 0),
      maxScore: Number(s.maxScore || 100)
    }));

    // 扣分项计算
    let deductItems = itemDetails
      .filter(d => Number(d.maxScore) > Number(d.score))
      .map(d => ({
        itemName: d.itemName || d.name || '扣分项',
        deduct: Number(d.maxScore) - Number(d.score),
        score: Number(d.score || 0),
        maxScore: Number(d.maxScore || 0),
        reason: String(d.reason || '').trim()
      }));

    // 无 itemDetails 时降级使用 scores 差额
    if (deductItems.length === 0) {
      deductItems = scores
        .filter(s => Number(s.maxScore || 100) > Number(s.score || 0))
        .map(s => ({
          itemName: s.categoryName || s.name || '项',
          deduct: Number(s.maxScore || 100) - Number(s.score || 0),
          score: Number(s.score || 0),
          maxScore: Number(s.maxScore || 0),
          reason: ''
        }));
    }

    const totalScore = Number(record.totalScore || 0);

    const result = Object.assign({}, record);
    result.studentId = student.userId || record.studentId || '';
    result.studentName = student.name || record.studentName || '学员';
    result.date = record.date || new Date().toISOString().slice(0, 10);
    result.totalScore = totalScore;
    result.grade = record.grade || getGradeText(totalScore);
    result.gradeClass = getGradeClass(totalScore);
    result.computedScores = computedScores;
    result.computedDeductItems = deductItems;
    return result;
  },

  _generateMockRecords(student, sectorId, categories) {
    // 如果传入的 categories 为空，主动从 MOCK_SECTORS 动态查询
    let effectiveCategories = (categories && categories.length > 0) ? categories : null;
    if (!effectiveCategories) {
      const mockSector = (MOCK_SECTORS || []).find(function(s) { return s.sectorId === sectorId; });
      if (mockSector && mockSector.categories && mockSector.categories.length > 0) {
        effectiveCategories = mockSector.categories;
      }
    }

    if (!effectiveCategories || effectiveCategories.length === 0) {
      // 最终兜底：使用通用分类名称（与具体扇区无关的 fallback）
      const stubScores = [
        { name: '间隔', score: 82, maxScore: 100 },
        { name: '冲突', score: 78, maxScore: 100 },
        { name: '通波', score: 90, maxScore: 100 }
      ];
      const total = stubScores.reduce((s, x) => s + x.score, 0);
      return [this._enhanceRecord({
        scores: stubScores.map(s => ({ categoryName: s.name, score: s.score, maxScore: s.maxScore })),
        itemDetails: [],
        totalScore: total,
        date: new Date().toISOString().slice(0, 10)
      }, student, sectorId)];
    }

    if (this.data.isInstructor) {
      // 教员/管理端：每个学员一条记录
      const scores = effectiveCategories.map(cat => ({
        categoryName: cat.name,
        score: Math.round(Number(cat.maxScore || 100) * (0.65 + Math.random() * 0.25)),
        maxScore: Number(cat.maxScore || 100)
      }));
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      return [this._enhanceRecord({
        scores,
        itemDetails: [],
        totalScore,
        date: new Date().toISOString().slice(0, 10)
      }, student, sectorId)];
    }

    // 学员端：多条历史记录
    return [1, 2, 3, 4].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const scores = effectiveCategories.map(cat => ({
        categoryName: cat.name,
        score: Math.round(Number(cat.maxScore || 100) * (0.6 + Math.random() * 0.3)),
        maxScore: Number(cat.maxScore || 100)
      }));
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      return this._enhanceRecord({
        scores,
        itemDetails: [],
        totalScore,
        date: d.toISOString().slice(0, 10)
      }, student, sectorId);
    });
  },

  /* ==================== 页面交互 ==================== */

  async switchSector(e) {
    const sector = e.currentTarget.dataset.sector;
    if (sector === this.data.currentSector) return;
    this.setData({ currentSector: sector, trendData: [] });
    await this.loadSectorDetail(sector);
    await this.loadTrend(sector);
  },

  onRetryLoad() {
    this.loadTrend(this.data.currentSector);
  },

  /* ==================== 学员详情弹窗 ==================== */

  showStudentDetail(e) {
    const { studentid, name } = e.currentTarget.dataset;
    if (!studentid) return;
    this.setData({ detailStudent: { studentId: studentid, studentName: name }, detailExpandedId: null, detailExpandedDeductId: '' });
    this.loadStudentHistory(studentid);
  },

  closeStudentDetail() {
    this.setData({ detailStudent: null, studentHistory: [], detailExpandedId: null, detailExpandedDeductId: '' });
  },

  async loadStudentHistory(studentId) {
    this.setData({ detailLoading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: `/scores/student/${studentId}/history` }));
      let raw = [];
      if (res && res.success && res.data) {
        if (Array.isArray(res.data)) {
          raw = res.data;
        } else if (Array.isArray(res.data.items)) {
          raw = res.data.items;
        }
      }
      const history = this._enrichHistory(normalizeScoreHistoryRecords(raw));
      const stats = this._calcHistoryStats(history);
      this.setData({ studentHistory: history, detailLoading: false, ...stats });
    } catch (e) {
      this.setData({ studentHistory: [], detailLoading: false, avgScore: 0, bestSector: '-', bestGrade: '-' });
    }
  },

  _calcHistoryStats(history) {
    let avgScore = 0;
    let bestSector = '-';
    let bestGrade = '-';
    if (history.length > 0) {
      avgScore = Math.round(history.reduce((sum, h) => sum + (h.total / h.maxTotal) * 100, 0) / history.length);
      const best = history.reduce((a, b) => (a.total > b.total ? a : b), history[0]);
      bestSector = best.sectorName || '-';
      bestGrade = best.grade || '-';
    }
    return { avgScore, bestSector, bestGrade };
  },

  _enrichHistory(rows) {
    return rows.map((h) => {
      const pct = h.maxTotal > 0 ? Math.round((h.total / h.maxTotal) * 100) : 0;
      const grade = getGradeText(h.total);
      const gradeClass = getGradeClass(h.total);
      const scorePairs = Object.entries(h.scores || {}).map(([name, score]) => ({ name, score }));
      const computedScores = (h.scoresArray || []).map((s) => ({
        name: s.categoryName || s.name || '',
        score: Number(s.score || 0),
        maxScore: Number(s.maxScore || 100),
      }));
      const deductItems = (h.itemDetails || [])
        .filter((d) => Number(d.maxScore) > Number(d.score))
        .map((d) => ({
          itemId: d.itemId || d.id,
          itemName: d.itemName || d.name || '评分项',
          itemScore: d.score,
          itemMax: d.maxScore,
          deductVal: Number(d.maxScore) - Number(d.score),
          reason: String(d.reason || '').trim(),
          deductKey: (h.id || h.scoreId) + '_' + (d.itemId || d.id)
        }));
      const result = h ? Object.assign({}, h) : {};
      result.grade = grade;
      result.gradeClass = gradeClass;
      result.scorePairs = scorePairs;
      result.computedScores = computedScores;
      result.deductItems = deductItems;
      return result;
    });
  },

  toggleDetailExpand(e) {
    const id = e.currentTarget.dataset.id;
    const nextExpanded = this.data.detailExpandedId === id ? null : id;
    this.setData({ detailExpandedId: nextExpanded });
    if (nextExpanded != null) {
      setTimeout(() => this.drawDetailRadar(nextExpanded), 80);
    }
  },

  drawDetailRadar(recordId) {
    const { studentHistory } = this.data;
    const record = (studentHistory || []).find((h) => h.id === recordId || h.scoreId === recordId);
    if (!record) return;
    this._drawRadarCanvas('#detailRadar_' + recordId, record.computedScores || []);
  },

  toggleDetailDeductExpand(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ detailExpandedDeductId: this.data.detailExpandedDeductId === key ? '' : key });
  },

  preventBubble() {
    // 阻止弹窗内容点击冒泡到遮罩层
  },

  /* ==================== 迷你雷达图绘制 ==================== */

  _drawRadarCanvas(selector, scores) {
    if (!scores || scores.length < 3) return;
    const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
    const query = wx.createSelectorQuery().in(this);
    query.select(selector).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;

      if (width <= 0 || height <= 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 2 - 22;

      const sides = scores.length;
      const angleStep = (Math.PI * 2) / sides;

      // 网格（4层）
      for (let level = 1; level <= 4; level++) {
        const r = radius * level / 4;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const angle = i * angleStep - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 轴线与标签
      scores.forEach((s, i) => {
        const angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const label = (s.name || '').length > 4 ? (s.name || '').substring(0, 4) : (s.name || '');
        ctx.fillStyle = '#8a9bb0';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx + Math.cos(angle) * (radius + 14), cy + Math.sin(angle) * (radius + 14));
      });

      // 数据多边形
      const dataColor = '#60a5fa';
      ctx.beginPath();
      scores.forEach((s, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const ratio = s.maxScore > 0 ? Math.min(1, Math.max(0, s.score / s.maxScore)) : 0;
        const r = radius * ratio;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = dataColor + '18';
      ctx.fill();
      ctx.strokeStyle = dataColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 数据点
      scores.forEach((s, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const ratio = s.maxScore > 0 ? Math.min(1, Math.max(0, s.score / s.maxScore)) : 0;
        const r = radius * ratio;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1628';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = dataColor;
        ctx.stroke();
      });
    });
  },

  drawMiniRadar() {
    const { trendData, sectorDetail } = this.data;
    if (!trendData.length || !sectorDetail) return;

    const categories = sectorDetail.categories || [];
    if (categories.length < 3) return;

    // 分批调用绘制，每帧绘制一个，避免同时绘制多个 Canvas 阻塞主线程
    let current = 0;
    const batchDraw = () => {
      if (current >= trendData.length) return;
      const record = trendData[current];
      this._drawRadarCanvas('#miniRadar_' + current, record.computedScores || []);
      current++;
      if (current < trendData.length) {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(batchDraw);
        else setTimeout(batchDraw, 16);
      }
    };
    batchDraw();
  }
});
