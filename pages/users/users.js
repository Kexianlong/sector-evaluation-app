const app = getApp();
const { MANAGER_ROLES, ROLE_LABELS, getManageableRoles, getRoleLabel, navRoleCaption, getUserInfo } = require('../../utils/roles.js');
const { canManageUser, canRelease: canReleasePerm } = require('../../utils/permission.js');
const { normalizeApiResponse } = require('../../utils/api.js');

const STUDENT_LEVEL_OPTIONS = [
  '初阶一段', '初阶二段', '初阶三段',
  '中阶一段', '中阶二段', '中阶三段',
  '高阶一段', '高阶二段', '高阶三段'
];

const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';

function getAvatarUrl(user) {
  if (!user) return AVATAR_DEFAULT;
  if (user.photoUrl) return user.photoUrl;
  if (user.gender === '女') return AVATAR_FEMALE;
  if (user.gender === '男') return AVATAR_MALE;
  return AVATAR_DEFAULT;
}

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

  onLoad(options) {
    let userInfo = getUserInfo();
    if (!userInfo || !MANAGER_ROLES.includes(userInfo.role)) {
      wx.showToast({ title: '无权限', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/overview/overview' }), 1500);
      return;
    }
    const manageableRoles = getManageableRoles(userInfo.role);
    const canRelease = canReleasePerm(userInfo);
    const isCenterDirector = userInfo.role === 'center_director';
    this.setData({
      userInfo,
      isCenterDirector: isCenterDirector,
      roleLabel: getRoleLabel(userInfo.role),
      manageableRoleList: manageableRoles.map(r => getRoleLabel(r)),
      manageableRoleValues: manageableRoles,
      canRelease
    });
    this.loadUsers();
    this.loadReminders();
    // 支持从 profile 页面传入 editUserId 自动打开编辑弹窗
    if (options && options.editUserId) {
      const editUserId = options.editUserId;
      const tryOpenEdit = () => {
        const user = this.data.users.find(u => u.userId === editUserId);
        if (user) {
          this.editUser({ currentTarget: { dataset: { id: editUserId } } });
        } else if (this.data.loading) {
          setTimeout(tryOpenEdit, 300);
        }
      };
      setTimeout(tryOpenEdit, 300);
    }
  },

  goToProfile(e) {
    const userId = e.currentTarget.dataset.id;
    const role = e.currentTarget.dataset.role;
    if (!userId) return;
    // 学员跳转到专门的学员详情页（含成绩概览、曲线图等）
    if (role === 'student') {
      wx.navigateTo({ url: '/pages/student-profile/student-profile?studentId=' + userId });
    } else {
      wx.navigateTo({ url: '/pages/profile/profile?userId=' + userId });
    }
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

  goToScore(e) {
    const userId = e.currentTarget.dataset.id;
    if (!userId) return;
    app.globalData.pendingTabParams = { preselectStudent: userId };
    wx.switchTab({ url: '/pages/score/score' });
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
      console.log('[users] 请求失败', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
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
    // 预处理放单时间短格式 + ICAO/体检到期状态 + 待关注标记
    result = result.map(function(u) {
      const o = Object.assign({}, u);
      o.releasedAtShort = u.releasedAt ? u.releasedAt.slice(0, 10) : '';
      // ICAO到期状态
      const icaoSt = self.calcExpiryStatus(u.icaoDate, 3, 6);
      o.icaoExpiry = icaoSt;
      // 体检到期状态：40岁以上有效期1年，其余2年
      let medicalValidYears = 2;
      if (u.birthDate) {
        const birth = new Date(u.birthDate);
        const age = new Date().getFullYear() - birth.getFullYear();
        if (age >= 40) medicalValidYears = 1;
      }
      const medSt = self.calcExpiryStatus(u.medicalDate, medicalValidYears, 3);
      o.medicalExpiry = medSt;
      // 日期短格式
      o.icaoDateShort = u.icaoDate ? u.icaoDate.slice(0, 10) : '';
      o.medicalDateShort = u.medicalDate ? u.medicalDate.slice(0, 10) : '';
      // 待关注标记
      const attentionReasons = [];
      if (o.role === 'student' && !o.isReleased) attentionReasons.push('未放单');
      if (icaoSt.status === 'expired') attentionReasons.push('ICAO过期');
      if (icaoSt.status === 'warning') attentionReasons.push('ICAO即将到期');
      if (medSt.status === 'expired') attentionReasons.push('体检过期');
      if (medSt.status === 'warning') attentionReasons.push('体检即将到期');
      o.attentionReasons = attentionReasons;
      o.needsAttention = attentionReasons.length > 0;
      o.avatarUrl = getAvatarUrl(u);
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

  updateEditGender(e) {
    const genders = ['男', '女'];
    this.setData({
      'editingUser.gender': genders[Number(e.detail.value)]
    });
  },

  updateEditBirthDate(e) {
    this.setData({
      'editingUser.birthDate': e.detail.value
    });
  },

  updateEditGroupEntryDate(e) {
    this.setData({
      'editingUser.groupEntryDate': e.detail.value
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
