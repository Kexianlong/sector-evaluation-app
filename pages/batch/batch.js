const app = getApp();
const { isManagerRole, navRoleCaption, normalizeInstructorLevel, getUserInfo } = require('../../utils/roles.js');
const { MOCK_SECTORS, MOCK_STUDENTS } = require('../../utils/mockData.js');

function normalizeUserListResponse(data) {
  if (!data) return [];
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return []; }
  }
  if (data.body) {
    let body = data.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (body) {
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.items)) return body.items;
      if (Array.isArray(body.data)) return body.data;
    }
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

Page({
  data: {
    userInfo: null,
    isManager: false,
    userDisplayText: '',
    roleLabel: '',
    levelLabel: '',

    sector: '',
    sectors: [],
    students: [],
    selectedStudents: [],
    scores: {},

    currentSectorName: '',
    currentSectorTotal: 0,
    categories: [],
    categoryCountText: '',
    studentNameMap: {},
    studentTotals: {},

    bootLoading: true,
    bootError: '',
    loading: false,
    result: null
  },

  onLoad() {
    let userInfo = getUserInfo();
    const isManager = userInfo && isManagerRole(userInfo.role);

    const _ui = userInfo;
    let userDisplayText = (_ui && _ui.name) || '未登录';
    if (_ui && _ui.role === 'instructor') {
      const level = normalizeInstructorLevel((_ui && _ui.instructorLevel) || (_ui && _ui.level));
      userDisplayText = ((_ui && _ui.name) || '未登录') + ' / ' + level;
    }

    const roleLabel = navRoleCaption(userInfo);
    let _lv = '';
    if (userInfo) {
      if (userInfo.role === 'student') _lv = userInfo.studentLevel || '';
      else if (userInfo.role === 'instructor') _lv = normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level);
    }
    const levelLabel = _lv;
    this.setData({ userInfo, isManager, userDisplayText, roleLabel, levelLabel });
    this.loadData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  updateDerivedData(dataChanges) {
    const { sector, sectors, students, selectedStudents, scores } = dataChanges || this.data;
    const currentSector = sectors.find(s => s.sectorId === sector);
    const _cs2 = currentSector;
    const categories = (_cs2 && _cs2.categories) || [];
    const currentSectorName = (_cs2 && _cs2.name) || '';
    const currentSectorTotal = (_cs2 && _cs2.totalScore) || 0;
    const categoryCountText = categories.length > 0 ? `${categories.length} 项分类` : '';

    const studentNameMap = {};
    students.forEach(s => {
      studentNameMap[s.userId] = s.name;
    });

    const studentTotals = {};
    selectedStudents.forEach(id => {
      let total = 0;
      Object.keys(scores).forEach(key => {
        if (key.startsWith(id + '_')) {
          const v = parseInt(scores[key], 10);
          if (!isNaN(v)) total += v;
        }
      });
      studentTotals[id] = total;
    });

    const studentsWithSelected = students.map(s => Object.assign({}, s, { isSelected: selectedStudents.indexOf(s.userId) >= 0 }));
    this.setData({ categories, currentSectorName, currentSectorTotal, categoryCountText, studentNameMap, studentTotals, students: studentsWithSelected });
  },

  async loadData() {
    this.setData({ bootLoading: true, bootError: '', result: null });
    try {
      let sectorsData = null;
      let studentsData = null;

      try {
        sectorsData = await app.request({ url: '/sectors' });
      } catch (e) {
        console.log('扇区接口失败，使用mock数据', e);
      }

      try {
        studentsData = await app.request({ url: '/users/students' });
      } catch (e) {
        console.log('学员接口失败，使用mock数据', e);
      }

      let sectors = [];
      if (sectorsData) {
        let raw = sectorsData;
        if (raw.body) {
          let body = raw.body;
          if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = null; }
          }
          if (body) raw = body;
        }
        if (Array.isArray(raw)) {
          sectors = raw;
        } else if (Array.isArray(raw.data)) {
          sectors = raw.data;
        } else if (raw.data && Array.isArray(raw.data.items)) {
          sectors = raw.data.items;
        } else if (Array.isArray(raw.items)) {
          sectors = raw.items;
        }
      }
      if (sectors.length === 0) {
        sectors = MOCK_SECTORS;
      }

      let students = normalizeUserListResponse(studentsData);
      if (students.length === 0 && !studentsData && app.globalData.mockMode) {
        students = MOCK_STUDENTS;
      }

      let sector = this.data.sector;
      if (!sector || !sectors.some(s => s.sectorId === sector)) {
        sector = sectors[0] ? sectors[0].sectorId : '';
      }

      this.setData({ sectors, students, sector, selectedStudents: [], scores: {}, bootLoading: false }, () => {
        this.updateDerivedData();
      });
    } catch (e) {
      this.setData({
        bootError: e.message || '扇区或学员列表加载失败',
        bootLoading: false,
        sectors: MOCK_SECTORS,
        students: MOCK_STUDENTS,
        sector: MOCK_SECTORS[0] ? MOCK_SECTORS[0].sectorId : '',
        selectedStudents: [],
        scores: {}
      }, () => {
        this.updateDerivedData();
      });
    }
  },

  retryLoad() {
    this.loadData();
  },

  onSectorChange(e) {
    const idx = e.detail.value;
    const sector = this.data.sectors[idx] ? this.data.sectors[idx].sectorId : '';
    this.setData({ sector, scores: {}, result: null }, () => {
      this.updateDerivedData();
    });
  },

  toggleStudent(e) {
    const studentId = e.currentTarget.dataset.id;
    const selected = this.data.selectedStudents;
    let nextSelected;
    if (selected.includes(studentId)) {
      nextSelected = selected.filter(id => id !== studentId);
    } else {
      nextSelected = selected.concat([studentId]);
    }
    this.setData({ selectedStudents: nextSelected, result: null }, () => {
      this.updateDerivedData();
    });
  },

  selectAll() {
    const { students, selectedStudents } = this.data;
    let nextSelected;
    if (selectedStudents.length === students.length && students.length > 0) {
      nextSelected = [];
    } else {
      nextSelected = students.map(s => s.userId);
    }
    this.setData({ selectedStudents: nextSelected, result: null }, () => {
      this.updateDerivedData();
    });
  },

  onScoreInput(e) {
    const { studentId, categoryId, max } = e.currentTarget.dataset;
    const raw = e.detail.value;
    const scores = Object.assign({}, this.data.scores);
    const key = `${studentId}_${categoryId}`;

    if (raw === '' || raw === undefined || raw === null) {
      delete scores[key];
    } else {
      let val = parseInt(raw, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      const maxVal = parseInt(max, 10);
      if (!isNaN(maxVal) && val > maxVal) val = maxVal;
      scores[key] = val;
    }

    this.setData({ scores }, () => {
      this.updateDerivedData();
    });
  },

  async handleSubmit() {
    const { selectedStudents, students, sector, sectors, scores } = this.data;
    if (selectedStudents.length === 0) {
      this.setData({ result: { success: false, message: '请至少选择一个学员' } });
      return;
    }

    const currentSector = sectors.find(s => s.sectorId === sector);
    const _cs3 = currentSector;
    const categories = (_cs3 && _cs3.categories) || [];
    if (categories.length === 0) {
      this.setData({ result: { success: false, message: '当前扇区暂无评分维度配置' } });
      return;
    }

    this.setData({ loading: true, result: null });

    try {
      const evaluations = selectedStudents.map(studentId => {
        const student = students.find(s => s.userId === studentId);
        return {
          studentId,
          studentName: (student && student.name) || '',
          sectorId: sector,
          sectorName: (currentSector && currentSector.name) || '',
          date: new Date().toISOString().split('T')[0],
          scores: categories.map(cat => ({
            categoryId: cat.id,
            categoryName: cat.name,
            score: scores[`${studentId}_${cat.id}`] || 0,
            maxScore: cat.maxScore
          })),
          comment: ''
        };
      });

      if (app.globalData.mockMode) {
        await new Promise(r => setTimeout(r, 800));
        this.setData({
          result: {
            success: true,
            data: { created: evaluations.length, failed: 0 },
            message: `成功为 ${evaluations.length} 位学员评分`
          },
          scores: {},
          selectedStudents: []
        }, () => {
          this.updateDerivedData();
        });
      } else {
        const res = await app.request({ url: '/batch', method: 'POST', data: { evaluations } });
        this.setData({
          result: res,
          scores: {},
          selectedStudents: []
        }, () => {
          this.updateDerivedData();
        });
      }
    } catch (err) {
      this.setData({
        result: { success: false, message: err.message || '提交失败' }
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onTestLogout() {
    app.logout();
  }
});
