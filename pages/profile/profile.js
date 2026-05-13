const app = getApp();
const { navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel, isManagerRole, isInstructorRole, isStudentRole } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

const AVATAR_DEFAULT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFhMmQ0NSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjOGE5YmIwIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM4YTliYjAiLz48L3N2Zz4=';
const AVATAR_MALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzFlM2E1ZiIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjNjBhNWZhIi8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=';
const AVATAR_FEMALE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0OCIgZmlsbD0iIzNmMWUzYSIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTTI0IDc2YzAtMTMuMjU1IDEwLjc0NS0yNCAyNC0yNHMyNCAxMC43NDUgMjQgMjQiIGZpbGw9IiNmNDcyYjYiLz48L3N2Zz4=';

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

function getMedicalValidityYears(age) {
  return (age !== null && age >= 40) ? 1 : 2;
}

function formatDate(d) {
  if (!d) return '未设置';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '未设置';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getAvatarUrl(userInfo) {
  if (!userInfo) return AVATAR_DEFAULT;
  if (userInfo.photoUrl) return userInfo.photoUrl;
  if (userInfo.gender === '女') return AVATAR_FEMALE;
  if (userInfo.gender === '男') return AVATAR_MALE;
  return AVATAR_DEFAULT;
}

function homeTabPath(role) {
  if (isManagerRole(role)) return '/pages/overview/overview';
  return '/pages/radar/radar';
}

Page({
  data: {
    currentUser: null,
    userInfo: null,
    viewUserId: '',
    isSelf: true,
    canManage: false,
    avatarUrl: '',
    roleLabel: '',
    levelLabel: '',
    age: null,
    medicalYears: 2,
    icaoDate: '',
    medicalDate: '',
    groupEntryDate: '',
    department: '',
    loading: false,
    isEditing: false,
    editForm: {},
    fromLogin: false,
    evalCount: 0,
    scoreCount: 0,
    myReminders: [],
    showMyReminders: false,
    responsibleInstructorName: '',
    responsibleStudentsNames: [],
    instructorList: [],
    studentList: [],
    allInstructors: [],
    allStudents: [],
    editResponsibleInstructorIndex: 0,
    editResponsibleStudentIndex: 0
  },

  onLoad(options) {
    const currentUser = getUserInfo();
    if (!currentUser) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    this.setData({ currentUser });
    const targetId = options && options.userId;
    if (targetId && targetId !== currentUser.userId) {
      this.setData({ viewUserId: targetId, isSelf: false });
      this.loadTargetUser(targetId);
    } else {
      this.setData({ isSelf: true, canManage: true });
      this.refreshData(currentUser);
      this.loadProfileFromServer();
      if (options && options.mode === 'edit') {
        const u = currentUser || {};
        const studentsInfo = (u.responsibleStudents || []).map(uid => {
          const s = this.data.allStudents.find(x => x.userId === uid);
          return s || { userId: uid, name: uid };
        }).filter(Boolean);
        this.setData({
          isEditing: true,
          fromLogin: true,
          editForm: {
            name: u.name || '',
            gender: u.gender || '男',
            birthDate: u.birthDate || '',
            photoUrl: u.photoUrl || '',
            phone: u.phone || '',
            groupEntryDate: u.groupEntryDate || '',
            icaoDate: u.icaoDate || '',
            medicalDate: u.medicalDate || '',
            responsibleInstructor: u.responsibleInstructor || '',
            responsibleInstructorName: '',
            responsibleStudents: u.responsibleStudents || [],
            responsibleStudentsInfo: studentsInfo,
            responsibleStudentPickerLabel: studentsInfo.map(i => i.name).join('、')
          }
        });
        // 延迟加载列表并回填名称
        setTimeout(() => {
          if (isStudentRole(u.role)) this.loadInstructorList(u);
          if (isInstructorRole(u.role)) this.loadStudentList(u);
        }, 0);
      }
    }
  },

  onShow() {
    const userInfo = getUserInfo();
    if (userInfo) this.refreshData(userInfo);
  },

  refreshData(userInfo) {
    const age = computeAge(userInfo.birthDate);
    const levelLabel = userInfo.role === 'student'
      ? (userInfo.studentLevel || '')
      : (userInfo.role === 'instructor'
        ? normalizeInstructorLevel(userInfo.instructorLevel || userInfo.level)
        : getRoleLabel(userInfo.role));
    this.setData({
      userInfo,
      avatarUrl: getAvatarUrl(userInfo),
      roleLabel: getRoleLabel(userInfo.role),
      levelLabel,
      age,
      medicalYears: getMedicalValidityYears(age),
      icaoDate: userInfo.icaoDate || '',
      medicalDate: userInfo.medicalDate || '',
      groupEntryDate: userInfo.groupEntryDate || '',
      department: userInfo.department || ''
    });
    if (this.data.isSelf) {
      this.loadMyReminders(userInfo);
    } else {
      this.calcLocalReminders(userInfo);
    }
    this.loadResponsibleNames(userInfo);
    if (isStudentRole(userInfo.role)) {
      this.loadInstructorList(userInfo);
    }
    if (isInstructorRole(userInfo.role)) {
      this.loadStudentList(userInfo);
    }
    if (!this.data.isSelf) {
      wx.setNavigationBarTitle({ title: (userInfo.name || '用户') + ' 的资料' });
    }
  },

  async loadMyReminders(userInfo) {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/my-reminders' }));
      if (res && res.success && res.data) {
        const reminders = [];
        if (res.data.icao) {
          reminders.push({ type: 'icao', label: 'ICAO考试', ...res.data.icao });
        }
        if (res.data.medical) {
          reminders.push({ type: 'medical', label: '体检合格证', ...res.data.medical });
        }
        this.setData({ myReminders: reminders });
      }
    } catch (e) {
      // 静默失败，前端本地计算
      this.calcLocalReminders(userInfo);
    }
  },

  calcLocalReminders(userInfo) {
    const reminders = [];
    function calc(dateStr, validYears, label) {
      if (!dateStr) return null;
      const base = new Date(dateStr);
      if (isNaN(base.getTime())) return null;
      const expire = new Date(base);
      expire.setFullYear(expire.getFullYear() + validYears);
      const days = Math.ceil((expire - new Date()) / (1000 * 60 * 60 * 24));
      if (days < 0) return { type: label, label, status: 'expired', message: '已过期 ' + Math.abs(days) + ' 天', date: dateStr, expireDate: expire.toISOString().slice(0, 10) };
      if (days <= 90) return { type: label, label, status: 'warning', message: '剩余 ' + days + ' 天', date: dateStr, expireDate: expire.toISOString().slice(0, 10) };
      return null;
    }
    const icao = calc(userInfo.icaoDate, 3, 'ICAO考试');
    const medical = calc(userInfo.medicalDate, 2, '体检合格证');
    if (icao) reminders.push(icao);
    if (medical) reminders.push(medical);
    this.setData({ myReminders: reminders });
  },

  toggleMyReminders() {
    this.setData({ showMyReminders: !this.data.showMyReminders });
  },

  async loadResponsibleNames(userInfo) {
    if (isStudentRole(userInfo.role) && userInfo.responsibleInstructor) {
      try {
        const res = normalizeApiResponse(await app.request({ url: '/users/' + userInfo.responsibleInstructor }));
        if (res && res.success && res.data) {
          this.setData({ responsibleInstructorName: res.data.name || '—' });
        }
      } catch (e) {
        this.setData({ responsibleInstructorName: '—' });
      }
    }
    if (isInstructorRole(userInfo.role) && userInfo.responsibleStudents && userInfo.responsibleStudents.length > 0) {
      // 优先使用已加载的 allStudents，避免调用需要权限的 /users
      if (this.data.allStudents.length > 0) {
        const names = userInfo.responsibleStudents.map(uid => {
          const u = this.data.allStudents.find(item => item.userId === uid);
          return u ? u.name : uid;
        });
        this.setData({ responsibleStudentsNames: names });
      } else {
        try {
          const res = normalizeApiResponse(await app.request({ url: '/users/students' }));
          let students = [];
          if (Array.isArray(res)) students = res;
          else if (res && res.success && Array.isArray(res.data)) students = res.data;
          const names = userInfo.responsibleStudents.map(uid => {
            const u = students.find(item => item.userId === uid);
            return u ? u.name : uid;
          });
          this.setData({ responsibleStudentsNames: names });
        } catch (e) {
          this.setData({ responsibleStudentsNames: userInfo.responsibleStudents || [] });
        }
      }
    }
  },

  async loadInstructorList(userInfo) {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/instructors' }));
      let instructors = [];
      if (Array.isArray(res)) instructors = res;
      else if (res && res.success && Array.isArray(res.data)) instructors = res.data;
      const names = instructors.map(i => i.name || i.username);
      const idx = instructors.findIndex(i => i.userId === userInfo.responsibleInstructor);
      this.setData({
        allInstructors: instructors,
        instructorList: names.length ? names : ['暂无教员'],
        editResponsibleInstructorIndex: idx >= 0 ? idx : 0
      });
      if (this.data.isEditing && idx >= 0) {
        this.setData({
          'editForm.responsibleInstructorName': instructors[idx].name
        });
      }
    } catch (e) {
      this.setData({ instructorList: ['暂无教员'] });
    }
  },

  async loadStudentList(userInfo) {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/students' }));
      let students = [];
      if (Array.isArray(res)) students = res;
      else if (res && res.success && Array.isArray(res.data)) students = res.data;
      const names = students.map(s => s.name || s.username);
      this.setData({
        allStudents: students,
        studentList: names.length ? names : ['暂无学员']
      });
      if (this.data.isEditing) {
        const currentInfo = (userInfo.responsibleStudents || []).map(uid => {
          const s = students.find(x => x.userId === uid);
          return s || { userId: uid, name: uid };
        }).filter(Boolean);
        this.setData({
          'editForm.responsibleStudentsInfo': currentInfo,
          'editForm.responsibleStudentPickerLabel': currentInfo.map(i => i.name).join('、')
        });
      }
      // 学员列表加载完成后，更新责任学员显示名称
      if (isInstructorRole(userInfo.role) && userInfo.responsibleStudents && userInfo.responsibleStudents.length > 0) {
        const names = userInfo.responsibleStudents.map(uid => {
          const u = students.find(item => item.userId === uid);
          return u ? u.name : uid;
        });
        this.setData({ responsibleStudentsNames: names });
      }
    } catch (e) {
      this.setData({ studentList: ['暂无学员'] });
    }
  },

  onEditResponsibleInstructorChange(e) {
    const index = Number(e.detail.value);
    const instructor = this.data.allInstructors[index];
    if (instructor) {
      this.setData({
        'editForm.responsibleInstructor': instructor.userId,
        'editForm.responsibleInstructorName': instructor.name,
        editResponsibleInstructorIndex: index
      });
    }
  },

  onEditResponsibleStudentChange(e) {
    const index = Number(e.detail.value);
    const student = this.data.allStudents[index];
    if (!student) return;
    const current = (this.data.editForm.responsibleStudents || []).slice();
    const currentInfo = (this.data.editForm.responsibleStudentsInfo || []).slice();
    if (!current.includes(student.userId)) {
      current.push(student.userId);
      currentInfo.push(student);
      this.setData({
        'editForm.responsibleStudents': current,
        'editForm.responsibleStudentsInfo': currentInfo,
        'editForm.responsibleStudentPickerLabel': currentInfo.map(i => i.name).join('、')
      });
    }
  },

  removeEditResponsibleStudent(e) {
    const userId = e.currentTarget.dataset.id;
    const current = (this.data.editForm.responsibleStudents || []).filter(id => id !== userId);
    const currentInfo = (this.data.editForm.responsibleStudentsInfo || []).filter(s => s.userId !== userId);
    this.setData({
      'editForm.responsibleStudents': current,
      'editForm.responsibleStudentsInfo': currentInfo,
      'editForm.responsibleStudentPickerLabel': currentInfo.map(i => i.name).join('、')
    });
  },

  async loadProfileFromServer() {
    this.setData({ loading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/auth/me' }));
      if (res && res.success && res.data) {
        const serverUser = Object.assign({}, this.data.userInfo, res.data);
        app.globalData.userInfo = serverUser;
        wx.setStorageSync('userInfo', serverUser);
        this.refreshData(serverUser);
      }
      this.loadRoleStats();
    } catch (e) {
      console.log('[profile] 服务端同步失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadRoleStats() {
    this.loadRoleStatsForUser(this.data.userInfo);
  },

  async loadRoleStatsForUser(userInfo) {
    if (!userInfo || !userInfo.userId) return;
    try {
      if (userInfo.role === 'student') {
        const res = normalizeApiResponse(await app.request({ url: '/scores/student/' + userInfo.userId + '/history' }));
        let records = [];
        if (Array.isArray(res)) records = res;
        else if (res && res.success && Array.isArray(res.data)) records = res.data;
        else if (res && res.success && res.data && Array.isArray(res.data.items)) records = res.data.items;
        this.setData({ evalCount: records.length });
      } else if (userInfo.role === 'instructor' || userInfo.role === 'deputy_director' || userInfo.role === 'supervisor') {
        const res = normalizeApiResponse(await app.request({ url: '/scores/instructor/' + userInfo.userId + '/history' }));
        let records = [];
        if (Array.isArray(res)) records = res;
        else if (res && res.success && Array.isArray(res.data)) records = res.data;
        else if (res && res.success && res.data && Array.isArray(res.data.items)) records = res.data.items;
        this.setData({ scoreCount: records.length });
      }
    } catch (e) {
      console.log('[profile] 加载统计数据失败', e);
    }
  },

  onPullDownRefresh() {
    this.loadProfileFromServer().finally(() => wx.stopPullDownRefresh());
  },

  tapEdit() {
    if (!this.data.isSelf) {
      if (this.data.canManage) {
        wx.navigateTo({
          url: '/pages/users/users?editUserId=' + this.data.userInfo.userId,
          fail: (err) => wx.showToast({ title: '跳转失败', icon: 'none' })
        });
      }
      return;
    }
    const u = this.data.userInfo || {};
    const isInstructor = isInstructorRole(u.role);
    const isStudent = isStudentRole(u.role);
    const instIdx = this.data.allInstructors.findIndex(i => i.userId === u.responsibleInstructor);
    const studentsInfo = (u.responsibleStudents || []).map(uid => {
      const s = this.data.allStudents.find(x => x.userId === uid);
      return s || { userId: uid, name: uid };
    }).filter(Boolean);
    this.setData({
      isEditing: true,
      editForm: {
        name: u.name || '',
        gender: u.gender || '男',
        birthDate: u.birthDate || '',
        photoUrl: u.photoUrl || '',
        phone: u.phone || '',
        groupEntryDate: u.groupEntryDate || '',
        icaoDate: u.icaoDate || '',
        medicalDate: u.medicalDate || '',
        responsibleInstructor: u.responsibleInstructor || '',
        responsibleInstructorName: instIdx >= 0 ? this.data.allInstructors[instIdx].name : '',
        responsibleStudents: u.responsibleStudents || [],
        responsibleStudentsInfo: studentsInfo,
        responsibleStudentPickerLabel: studentsInfo.map(i => i.name).join('、')
      }
    });
  },

  cancelEdit() {
    this.setData({ isEditing: false });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`editForm.${field}`]: value });
  },

  onGenderChange(e) {
    const genders = ['男', '女'];
    this.setData({ 'editForm.gender': genders[e.detail.value] });
  },

  async saveProfile() {
    const form = this.data.editForm;
    if (!form.name.trim()) {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    if (!form.phone || form.phone.length < 11) {
      wx.showToast({ title: '请输入正确的手机号码', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中' });
    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate,
        photoUrl: form.photoUrl || '',
        phone: form.phone || '',
        groupEntryDate: form.groupEntryDate || '',
        icaoDate: form.icaoDate || '',
        medicalDate: form.medicalDate || ''
      };
      if (isStudentRole(this.data.userInfo.role)) {
        payload.responsibleInstructor = form.responsibleInstructor || '';
      }
      if (isInstructorRole(this.data.userInfo.role)) {
        payload.responsibleStudents = form.responsibleStudents || [];
      }
      const res = normalizeApiResponse(await app.request({
        url: '/auth/me',
        method: 'PUT',
        data: payload
      }));
      if (res && res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        const updated = Object.assign({}, this.data.userInfo, payload);
        app.globalData.userInfo = updated;
        wx.setStorageSync('userInfo', updated);
        this.setData({ isEditing: false });
        this.refreshData(updated);
      } else {
        wx.showToast({ title: res && res.message ? res.message : '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async onSaveProfile() {
    const form = this.data.editForm;
    if (!form.name.trim()) {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    if (!form.phone || form.phone.length < 11) {
      wx.showToast({ title: '请输入正确的手机号码', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中' });
    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate,
        photoUrl: form.photoUrl || '',
        phone: form.phone || '',
        groupEntryDate: form.groupEntryDate || '',
        icaoDate: form.icaoDate || '',
        medicalDate: form.medicalDate || ''
      };
      if (isStudentRole(this.data.userInfo.role)) {
        payload.responsibleInstructor = form.responsibleInstructor || '';
      }
      if (isInstructorRole(this.data.userInfo.role)) {
        payload.responsibleStudents = form.responsibleStudents || [];
      }
      const res = normalizeApiResponse(await app.request({
        url: '/auth/me',
        method: 'PUT',
        data: payload
      }));
      if (res && res.success) {
        const updated = Object.assign({}, this.data.userInfo, payload);
        app.globalData.userInfo = updated;
        wx.setStorageSync('userInfo', updated);
        wx.showToast({ title: '保存成功', icon: 'success' });
        if (this.data.fromLogin) {
          wx.switchTab({ url: homeTabPath(updated.role) });
        } else {
          this.setData({ isEditing: false });
          this.refreshData(updated);
        }
      } else {
        wx.showToast({ title: res && res.message ? res.message : '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async loadTargetUser(userId) {
    this.setData({ loading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/' + userId }));
      if (res && res.success && res.data) {
        const targetUser = res.data;
        const { canManageUser } = require('../../utils/permission.js');
        const canManage = canManageUser(this.data.currentUser, targetUser);
        this.setData({ canManage });
        this.refreshData(targetUser);
        this.loadRoleStatsForUser(targetUser);
      } else {
        wx.showToast({ title: '加载用户信息失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '加载用户信息失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  tapManageEdit() {
    wx.navigateTo({
      url: '/pages/users/users?editUserId=' + this.data.userInfo.userId,
      fail: (err) => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  async tapManageRelease() {
    const user = this.data.userInfo;
    if (!user || user.role !== 'student') return;
    const action = user.isReleased ? '取消放单' : '设置放单';
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: action + '确认',
        content: '确定要' + action + '该学员吗？',
        confirmColor: '#ff4d4f',
        success: (res) => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    wx.showLoading({ title: '处理中...' });
    try {
      const res = normalizeApiResponse(await app.request({
        url: '/users/' + user.userId + '/release',
        method: 'PUT',
        data: { isReleased: !user.isReleased }
      }));
      if (res && res.success) {
        wx.showToast({ title: user.isReleased ? '已取消放单' : '放单成功', icon: 'success' });
        this.loadTargetUser(user.userId);
      } else {
        wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  tapManageDelete() {
    const user = this.data.userInfo;
    wx.showModal({
      title: '确认删除',
      content: '确定删除用户 "' + (user.name || user.userId) + '" 吗？此操作不可恢复。',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({ url: '/users/' + user.userId, method: 'DELETE' });
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;
        wx.showLoading({ title: '处理中' });
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: tempFile.tempFilePath,
          encoding: 'base64',
          success: (readRes) => {
            const base64 = 'data:image/jpeg;base64,' + readRes.data;
            this.setData({ 'editForm.photoUrl': base64 });
            wx.showToast({ title: '设置成功', icon: 'success' });
          },
          fail: () => wx.showToast({ title: '读取图片失败', icon: 'none' }),
          complete: () => wx.hideLoading()
        });
      }
    });
  },

  useDefaultAvatar(e) {
    const gender = e.currentTarget.dataset.gender;
    const avatarUrl = gender === '女' ? AVATAR_FEMALE : AVATAR_MALE;
    this.setData({ 'editForm.photoUrl': '', 'editForm.gender': gender });
    this.setData({ avatarUrl: avatarUrl });
    wx.showToast({ title: '已选择默认头像', icon: 'none' });
  }
});