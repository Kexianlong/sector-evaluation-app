const app = getApp();
const { navRoleCaption, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
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

Page({
  data: {
    userInfo: null,
    avatarUrl: '',
    roleLabel: '',
    levelLabel: '',
    age: null,
    medicalYears: 2,
    icaoExpiry: '',
    medicalExpiry: '',
    groupEntryDate: '',
    department: '',
    loading: false,
    isEditing: false,
    editForm: {}
  },

  onLoad() {
    const userInfo = getUserInfo();
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    this.refreshData(userInfo);
    this.loadProfileFromServer();
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
      roleLabel: navRoleCaption(userInfo) || userInfo.role,
      levelLabel,
      age,
      medicalYears: getMedicalValidityYears(age),
      icaoExpiry: userInfo.icaoExpiry || '',
      medicalExpiry: userInfo.medicalExpiry || '',
      groupEntryDate: userInfo.groupEntryDate || '',
      department: userInfo.department || ''
    });
  },

  async loadProfileFromServer() {
    this.setData({ loading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/me' }));
      if (res && res.success && res.data) {
        const serverUser = Object.assign({}, this.data.userInfo, res.data);
        app.globalData.userInfo = serverUser;
        wx.setStorageSync('userInfo', serverUser);
        this.refreshData(serverUser);
      }
    } catch (e) {
      console.log('[profile] 服务端同步失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadProfileFromServer().finally(() => wx.stopPullDownRefresh());
  },

  tapEdit() {
    const u = this.data.userInfo || {};
    this.setData({
      isEditing: true,
      editForm: {
        name: u.name || '',
        gender: u.gender || '男',
        birthDate: u.birthDate || '',
        photoUrl: u.photoUrl || '',
        groupEntryDate: u.groupEntryDate || '',
        icaoExpiry: u.icaoExpiry || '',
        medicalExpiry: u.medicalExpiry || ''
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
    wx.showLoading({ title: '保存中' });
    try {
      const res = normalizeApiResponse(await app.request({
        url: '/users/me',
        method: 'PUT',
        data: {
          name: form.name.trim(),
          gender: form.gender,
          birthDate: form.birthDate,
          photoUrl: form.photoUrl,
          groupEntryDate: form.groupEntryDate,
          icaoExpiry: form.icaoExpiry,
          medicalExpiry: form.medicalExpiry
        }
      }));
      if (res && res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        const updated = Object.assign({}, this.data.userInfo, form);
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

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;
        wx.showLoading({ title: '上传中' });
        wx.uploadFile({
          url: `${app.globalData.baseUrl || ''}/upload/avatar`,
          filePath: tempFile.tempFilePath,
          name: 'file',
          header: {
            'Authorization': wx.getStorageSync('token') || ''
          },
          success: (upRes) => {
            let data = upRes.data;
            try { data = JSON.parse(data); } catch (e) {}
            if (data && data.url) {
              this.setData({ 'editForm.photoUrl': data.url });
              wx.showToast({ title: '上传成功', icon: 'success' });
            } else {
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          },
          fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
          complete: () => wx.hideLoading()
        });
      }
    });
  }
});
