const app = getApp();
const { MANAGER_ROLES, ROLE_LABELS, getManageableRoles, getRoleLabel, navRoleCaption, getUserInfo } = require('../../utils/roles.js');
const { MOCK_USERS } = require('../../utils/mockData.js');
const { normalizeApiResponse } = require('../../utils/api.js');

const STUDENT_LEVEL_OPTIONS = [
  '初阶一段', '初阶二段', '初阶三段',
  '中阶一段', '中阶二段', '中阶三段',
  '高阶一段', '高阶二段', '高阶三段'
];

Page({
  data: {
    userInfo: null,
    users: [],
    loading: false,
    editing: false,
    isNew: false,
    editingUser: null,
    roleIndex: 0,
    manageableRoleList: [],
    manageableRoleValues: [],
    departmentIndex: 0,
    teamIndex: 0,
    instructorLevelIndex: 0,
    studentLevelIndex: 0,
    canRelease: false,
    roleFilter: 'all',
    releaseFilter: 'all',
    filteredUsers: [],
    toast: '',
    stats: {},
    studentLevels: [''].concat(STUDENT_LEVEL_OPTIONS),
    departments: ['', '区域一室', '区域二室', '区域三室', '区域四室', '区域五室', '区域六室', '区域七室', '行政'],
    teams: ['', '一组', '二组', '三组', '四组', '行政'],
    instructorLevels: ['', '初教', '中教', '高教'],
    reminders: [],
    reminderStats: { icaoExpired: 0, icaoWarning: 0, medicalExpired: 0, medicalWarning: 0 },
    showReminders: false
  },

  onLoad() {
    let userInfo = getUserInfo();
    if (!userInfo || !MANAGER_ROLES.includes(userInfo.role)) {
      wx.showToast({ title: '无权限', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/overview/overview' }), 1500);
      return;
    }
    const manageableRoles = getManageableRoles(userInfo.role);
    const canRelease = ['supervisor', 'deputy_director', 'department_head', 'center_director'].includes(userInfo.role);
    const isCenterDirector = userInfo.role === 'center_director';
    this.setData({
      userInfo,
      isCenterDirector: isCenterDirector,
      roleLabel: navRoleCaption(userInfo),
      manageableRoleList: manageableRoles.map(r => getRoleLabel(r)),
      manageableRoleValues: manageableRoles,
      canRelease
    });
    this.loadUsers();
    this.loadReminders();
  },

  // 计算到期状态
  calcExpiryStatus(dateStr, validYears, remindMonthsBefore) {
    if (!dateStr) return { status: 'unknown', daysLeft: null, message: '' };
    const base = new Date(dateStr);
    if (isNaN(base.getTime())) return { status: 'unknown', daysLeft: null, message: '' };
    const expireDate = new Date(base);
    expireDate.setFullYear(expireDate.getFullYear() + validYears);
    const now = new Date();
    const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
    const remindDays = remindMonthsBefore * 30;
    if (daysLeft < 0) return { status: 'expired', daysLeft: daysLeft, message: '已过期' + Math.abs(daysLeft) + '天' };
    if (daysLeft <= remindDays) return { status: 'warning', daysLeft: daysLeft, message: '剩余' + daysLeft + '天' };
    return { status: 'normal', daysLeft: daysLeft, message: '剩余' + daysLeft + '天' };
  },

  async loadReminders() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/reminders' }));
      if (res && res.success && res.data) {
        this.setData({
          reminders: res.data.reminders || [],
          reminderStats: res.data.stats || { icaoExpired: 0, icaoWarning: 0, medicalExpired: 0, medicalWarning: 0 }
        });
      }
    } catch (e) {
      // 静默失败
    }
  },

  toggleReminders() {
    this.setData({ showReminders: !this.data.showReminders });
  },

  _extractOptionsFromUsers(users) {
    const extract = function(key) {
      const vals = new Set();
      vals.add('');
      users.forEach(function(u) { if (u[key]) vals.add(u[key]); });
      return Array.from(vals);
    };
    // 始终合并预定义完整科室列表，确保下拉不会因数据不足而缺失选项
    const FULL_DEPTS = ['区域一室', '区域二室', '区域三室', '区域四室', '区域五室', '区域六室', '区域七室', '行政'];
    const FULL_TEAMS = ['一组', '二组', '三组', '四组', '行政'];
    const FULL_LEVELS = ['初教', '中教', '高教'];

    const depts = extract('department');
    const teams = extract('team');
    const levels = extract('instructorLevel');

    // 合并预定义列表到提取结果中，按预定义顺序排列
    function mergeFull(extracted, fullList) {
      const s = new Set(extracted);
      for (let i = 0; i < fullList.length; i++) s.add(fullList[i]);
      const r = Array.from(s);
      // 按预定义顺序排列，空字符在最前，其余项按 fullList 中的顺序
      r.sort(function(a, b) {
        if (!a) return -1;
        if (!b) return 1;
        const ia = fullList.indexOf(a);
        const ib = fullList.indexOf(b);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        // 不在预定义列表中的项按字母序
        return a.localeCompare(b);
      });
      return r;
    }

    return {
      departments: mergeFull(depts, FULL_DEPTS),
      teams: mergeFull(teams, FULL_TEAMS),
      instructorLevels: mergeFull(levels, FULL_LEVELS)
    };
  },

  async loadUsers() {
    this.setData({ loading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users' }));
      if (res && res.success && res.data && res.data.items) {
        const users = res.data.items;
        const opts = this._extractOptionsFromUsers(users);
        const _setData = Object.assign({ users: users }, opts);
        this.setData(_setData);
        this.updateFilteredUsers();
        this.updateStats();
      }
    } catch (e) {
      console.log('[users] 请求失败，使用模拟数据');
      const users = MOCK_USERS;
      const opts = this._extractOptionsFromUsers(users);
      const _setData2 = Object.assign({ users: users }, opts);
      this.setData(_setData2);
      this.updateFilteredUsers();
      this.updateStats();
    } finally {
      this.setData({ loading: false });
    }
  },

  updateStats() {
    const { users, manageableRoleValues } = this.data;
    const stats = {};
    manageableRoleValues.forEach(r => {
      stats[r] = users.filter(u => u.role === r).length;
    });
    stats.total = users.length;
    this.setData({ stats });
  },

  updateFilteredUsers() {
    const { users, roleFilter, releaseFilter } = this.data;
    const self = this;
    let result = users.slice();
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }
    if (releaseFilter === 'released') {
      result = result.filter(u => u.role === 'student' && u.isReleased);
    } else if (releaseFilter === 'not_released') {
      result = result.filter(u => u.role !== 'student' || !u.isReleased);
    }
    // 预处理放单时间短格式 + ICAO/体检到期状态
    result = result.map(function(u) {
      const o = Object.assign({}, u);
      o.releasedAtShort = u.releasedAt ? u.releasedAt.slice(0, 10) : '';
      // ICAO到期状态
      const icaoSt = self.calcExpiryStatus(u.icaoDate, 3, 6);
      o.icaoExpiry = icaoSt;
      // 体检到期状态
      const medSt = self.calcExpiryStatus(u.medicalDate, 2, 3);
      o.medicalExpiry = medSt;
      // 日期短格式
      o.icaoDateShort = u.icaoDate ? u.icaoDate.slice(0, 10) : '';
      o.medicalDateShort = u.medicalDate ? u.medicalDate.slice(0, 10) : '';
      return o;
    });
    this.setData({ filteredUsers: result });
  },

  setRoleFilter(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ roleFilter: role, releaseFilter: 'all' }, () => {
      this.updateFilteredUsers();
    });
  },

  setReleaseFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ releaseFilter: filter }, () => {
      this.updateFilteredUsers();
    });
  },

  async handleRelease(e) {
    const userId = e.currentTarget.dataset.id;
    const isReleased = e.currentTarget.dataset.released;
    const action = isReleased ? '取消放单' : '设置放单';
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: `${action}确认`,
        content: `确定要${action}该学员吗？${isReleased ? '取消后该学员将重新进入评分列表。' : '放单后该学员将从评分列表中移除，但历史数据将被保留。'}`,
        confirmColor: '#ff4d4f',
        success: (res) => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    wx.showLoading({ title: '处理中...' });
    try {
      // mock模式：直接修改本地数据
      if (app.globalData.mockMode) {
        let users = this.data.users.slice();
        for (let i = 0; i < users.length; i++) {
          if (users[i].userId === userId) {
            users[i] = Object.assign({}, users[i], { isReleased: !isReleased, releasedAt: !isReleased ? new Date().toISOString() : null });
            break;
          }
        }
        for (let j = 0; j < MOCK_USERS.length; j++) {
          if (MOCK_USERS[j].userId === userId) {
            Object.assign(MOCK_USERS[j], { isReleased: !isReleased, releasedAt: !isReleased ? new Date().toISOString() : null });
            break;
          }
        }
        this.setData({ users: users });
        this.updateFilteredUsers();
        wx.showToast({ title: isReleased ? '已取消放单' : '放单成功', icon: 'success' });
        wx.hideLoading();
        return;
      }
      const releaseRes = await app.request({
        url: `/users/${userId}/release`,
        method: 'PUT',
        data: { isReleased: !isReleased }
      });
      if (releaseRes && releaseRes.success) {
        wx.showToast({ title: isReleased ? '已取消放单' : '放单成功', icon: 'success' });
        this.loadUsers();
      } else {
        wx.showToast({ title: (releaseRes && releaseRes.message) || '操作失败，请重试', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '操作失败，网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 打开新增弹窗
  newUser() {
    const defaultRole = this.data.manageableRoleValues[0] || 'student';
    // 非中心主任自动设定科室
    const autoDept = this.data.isCenterDirector ? '' : (this.data.userInfo.department || '');
    let autoDeptIndex = autoDept ? this.data.departments.indexOf(autoDept) : 0;
    if (autoDeptIndex < 0) autoDeptIndex = 0;
    this.setData({
      editing: true,
      isNew: true,
      editingUser: {
        username: '',
        password: '',
        name: '',
        department: autoDept,
        team: '',
        role: defaultRole,
        studentLevel: '',
        instructorLevel: '',
        icaoDate: '',
        medicalDate: ''
      },
      roleIndex: 0,
      departmentIndex: autoDeptIndex,
      teamIndex: 0,
      instructorLevelIndex: 0,
      studentLevelIndex: 0
    });
  },

  editUser(e) {
    const userId = e.currentTarget.dataset.id;
    const user = this.data.users.find(u => u.userId === userId);
    if (!user) return;
    const roleIndex = this.data.manageableRoleValues.indexOf(user.role);
    const departmentIndex = this.data.departments.indexOf(user.department || '');
    const teamIndex = this.data.teams.indexOf(user.team || '');
    const instructorLevelIndex = this.data.instructorLevels.indexOf(user.instructorLevel || '');
    const studentLevelIndex = this.data.studentLevels.indexOf(user.studentLevel || '');
    this.setData({
      editing: true,
      isNew: false,
      editingUser: JSON.parse(JSON.stringify(user)),
      roleIndex: roleIndex >= 0 ? roleIndex : 0,
      departmentIndex: departmentIndex >= 0 ? departmentIndex : 0,
      teamIndex: teamIndex >= 0 ? teamIndex : 0,
      instructorLevelIndex: instructorLevelIndex >= 0 ? instructorLevelIndex : 0,
      studentLevelIndex: studentLevelIndex >= 0 ? studentLevelIndex : 0
    });
  },

  closeEdit() {
    this.setData({ editing: false, isNew: false, editingUser: null });
  },

  preventHide() {
    // 阻止冒泡
  },

  updateEditField(e) {
    const { field } = e.currentTarget.dataset;
    const _sd = {};
    _sd['editingUser.' + field] = e.detail.value;
    this.setData(_sd);
  },

  updateEditRole(e) {
    const index = e.detail.value;
    const role = this.data.manageableRoleValues[index];
    this.setData({
      'editingUser.role': role,
      roleIndex: index
    });
  },

  updateEditDepartment(e) {
    const index = e.detail.value;
    const department = this.data.departments[index];
    this.setData({
      'editingUser.department': department,
      departmentIndex: index
    });
  },

  updateEditTeam(e) {
    const index = e.detail.value;
    const team = this.data.teams[index];
    this.setData({
      'editingUser.team': team,
      teamIndex: index
    });
  },

  updateEditInstructorLevel(e) {
    const index = e.detail.value;
    const level = this.data.instructorLevels[index];
    this.setData({
      'editingUser.instructorLevel': level,
      instructorLevelIndex: index
    });
  },

  updateEditStudentLevel(e) {
    const index = e.detail.value;
    const level = this.data.studentLevels[index];
    this.setData({
      'editingUser.studentLevel': level,
      studentLevelIndex: index
    });
  },

  updateEditIcaoDate(e) {
    this.setData({
      'editingUser.icaoDate': e.detail.value
    });
  },

  updateEditMedicalDate(e) {
    this.setData({
      'editingUser.medicalDate': e.detail.value
    });
  },

  async saveUser() {
    const { editingUser, isNew } = this.data;
    if (!editingUser.name) {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    if (isNew && !editingUser.username) {
      wx.showToast({ title: '用户名不能为空', icon: 'none' });
      return;
    }
    if (isNew && !editingUser.password) {
      wx.showToast({ title: '密码不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const payload = {
        name: editingUser.name,
        username: editingUser.username,
        department: editingUser.department || '',
        team: editingUser.team || '',
        role: editingUser.role
      };
      if (editingUser.role === 'student') {
        payload.studentLevel = editingUser.studentLevel || '';
      }
      if (editingUser.role === 'instructor') {
        payload.instructorLevel = editingUser.instructorLevel || '';
      }
      if (editingUser.icaoDate !== undefined) {
        payload.icaoDate = editingUser.icaoDate || '';
      }
      if (editingUser.medicalDate !== undefined) {
        payload.medicalDate = editingUser.medicalDate || '';
      }
      if (editingUser.gender !== undefined) {
        payload.gender = editingUser.gender || '';
      }
      if (editingUser.birthDate !== undefined) {
        payload.birthDate = editingUser.birthDate || '';
      }
      if (editingUser.groupEntryDate !== undefined) {
        payload.groupEntryDate = editingUser.groupEntryDate || '';
      }
      if (editingUser.password) {
        payload.password = editingUser.password;
      }

      // mock模式：直接在本地数组上修改，避免loadUsers重新加载静态数据
      if (app.globalData.mockMode) {
        let users = this.data.users.slice();
        if (isNew) {
          const newUser = Object.assign({}, payload, { userId: 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) });
          users.push(newUser);
          MOCK_USERS.push(newUser);
        } else {
          let editIdx = -1;
          for (let i = 0; i < users.length; i++) {
            if (users[i].userId === editingUser.userId) { editIdx = i; break; }
          }
          if (editIdx >= 0) {
            users[editIdx] = Object.assign({}, users[editIdx], payload);
          }
          // 同步到 MOCK_USERS 源数组（让 loadUsers 也能读到更新）
          for (let j = 0; j < MOCK_USERS.length; j++) {
            if (MOCK_USERS[j].userId === editingUser.userId) {
              Object.assign(MOCK_USERS[j], payload);
              break;
            }
          }
        }
        const opts = this._extractOptionsFromUsers(users);
        this.setData({ users: users, editing: false, isNew: false, editingUser: null });
        this.updateFilteredUsers();
        this.updateStats();
        wx.showToast({ title: '保存成功', icon: 'success' });
        wx.hideLoading();
        return;
      }

      if (isNew) {
        await app.request({
          url: '/users',
          method: 'POST',
          data: payload
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      } else {
        await app.request({
          url: `/users/${editingUser.userId}`,
          method: 'PUT',
          data: payload
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      }
      this.setData({ editing: false, isNew: false, editingUser: null });
      this.loadUsers();
      this.loadReminders();
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUsers(),
      this.loadReminders()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  deleteUser(e) {
    const userId = e.currentTarget.dataset.id;
    const user = this.data.users.find(u => u.userId === userId);
    wx.showModal({
      title: '确认删除',
      content: '确定删除用户 "' + (user ? user.name : userId) + '" 吗？此操作不可恢复。',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            // mock模式：直接从本地数组删除
            if (app.globalData.mockMode) {
              const users = this.data.users.filter(function(u) { return u.userId !== userId; });
              for (let k = MOCK_USERS.length - 1; k >= 0; k--) {
                if (MOCK_USERS[k].userId === userId) { MOCK_USERS.splice(k, 1); break; }
              }
              const opts = this._extractOptionsFromUsers(users);
              this.setData({ users: users });
              this.updateFilteredUsers();
              this.updateStats();
              wx.showToast({ title: '删除成功', icon: 'success' });
              return;
            }
            await app.request({ url: `/users/${userId}`, method: 'DELETE' });
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadUsers();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
