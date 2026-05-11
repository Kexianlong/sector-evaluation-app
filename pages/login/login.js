const app = getApp();
const { isManagerRole, isInstructorRole } = require('../../utils/roles.js');
const { mockUsers } = require('../../utils/mockData.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function homeTabPath(role) {
  if (isManagerRole(role)) return '/pages/overview/overview';
  if (isInstructorRole(role)) return '/pages/trend/trend';
  return '/pages/radar/radar';
}

function inferMockRoleFromUsername(username) {
  const u = (username || '').trim().toLowerCase();
  if (u === 'admin') return 'center_director';
  if (u === 'students' || u === 'student') return 'student';
  if (u === 'instructor') return 'instructor';
  return 'student';
}

const MOCK_DISPLAY_NAMES = {
  admin: '系统管理员',
  students: '学员',
  instructor: '教员',
};

function buildMockUserMap() {
  const map = {};
  mockUsers.forEach(u => {
    map[u.username] = u;
    if (u.username === 'students') map['student'] = u;
  });
  return map;
}

Page({
  data: {
    username: 'admin',
    password: 'hdkg2007',
    loading: false,
    error: '',
    showPasswordModal: false,
    showPasswordForm: false,
    oldPassword: 'hdkg2007',
    newPassword: '',
    confirmPassword: '',
    passwordError: '',
    passwordSuccess: '',
    pendingToken: null,
    showProfileModal: false,
    profileModalUser: null
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      app.globalData.token = token;
      app.globalData.userInfo = userInfo;
      wx.switchTab({ url: homeTabPath(userInfo.role) });
      return;
    }
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onInputOldPassword(e) {
    this.setData({ oldPassword: e.detail.value });
  },

  onInputNewPassword(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onInputConfirmPassword(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  _inferRole(username) {
    return inferMockRoleFromUsername(username);
  },

  async handleLogin() {
    if (this.data.loading) return;
    const username = this.data.username;
    const password = this.data.password;

    if (!username || !password) {
      this.setData({ error: '请输入账号和密码' });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const res = normalizeApiResponse(await app.request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password }
      }));

      if (res && res.success && res.data && res.data.token) {
        const loginedUser = res.data.userInfo || res.data.user || {};
        const requirePasswordChange = (res.data && res.data.requirePasswordChange);
        wx.setStorageSync('userInfo', loginedUser);
        app.globalData.userInfo = loginedUser;
        if (requirePasswordChange) {
          this.setData({
            showPasswordModal: true,
            showPasswordForm: false,
            pendingToken: res.data.token,
            oldPassword: password,
            newPassword: '',
            confirmPassword: '',
            passwordError: '',
            passwordSuccess: '',
            loading: false
          });
        } else {
          wx.setStorageSync('token', res.data.token);
          wx.setStorageSync('userInfo', loginedUser);
          app.globalData.token = res.data.token;
          app.globalData.userInfo = loginedUser;
          this.setData({ loading: false });
          this.checkProfileCompletion(loginedUser);
        }
      } else {
        const errMsg = (res && res.message) || '';
        // 已放单拦截
        if (errMsg && errMsg.indexOf('已经放单') !== -1) {
          this.setData({ error: errMsg, loading: false });
          return;
        }
        // 后端明确返回了业务失败（success === false 且带有 message）：说明后端是在线的，不要降级到 mock
        if (res && res.success === false && errMsg) {
          this.setData({ error: errMsg, loading: false });
          return;
        }
        // 认证类错误关键词兜底
        if (errMsg && (errMsg.indexOf('登录') !== -1 || errMsg.indexOf('密码') !== -1 || errMsg.indexOf('认证') !== -1 || errMsg.indexOf('Unauthorized') !== -1 || errMsg.indexOf('401') !== -1)) {
          this.setData({ error: errMsg || '登录失败，请检查账号密码', loading: false });
          return;
        }
        // 其余情况（后端不可用、网络错误等）降级到离线 mock 模式
        this.enterMockMode(username);
      }
    } catch (err) {
      const msg = (err && err.message) || '';
      if (msg.includes('密码已经重置')) {
        this.setData({ error: '密码已经重置，请使用默认密码登录', loading: false });
      } else {
        console.log('[login] 后端登录失败，自动进入离线模式', msg);
        this.enterMockMode(username);
      }
    }
  },

  handleCancelPasswordChange() {
    const { pendingToken } = this.data;
    this.setData({ showPasswordModal: false, showPasswordForm: false });
    if (pendingToken) {
      wx.setStorageSync('token', pendingToken);
      app.globalData.token = pendingToken;
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        app.globalData.userInfo = userInfo;
        wx.switchTab({ url: homeTabPath(userInfo.role || 'student') });
      } else {
        wx.showToast({ title: '登录信息异常，请重新登录', icon: 'none' });
      }
    }
  },

  handleShowPasswordForm() {
    this.setData({ showPasswordForm: true, passwordError: '', passwordSuccess: '' });
  },

  async handleChangePassword() {
    const { oldPassword, newPassword, confirmPassword, pendingToken } = this.data;
    this.setData({ passwordError: '', passwordSuccess: '' });

    if (!newPassword || newPassword.length < 6) {
      this.setData({ passwordError: '新密码长度至少为6个字符' });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setData({ passwordError: '两次输入的新密码不一致' });
      return;
    }

    try {
      const res = normalizeApiResponse(await app.request({
        url: '/auth/password',
        method: 'PUT',
        data: { oldPassword, newPassword },
        header: {
          'Authorization': `Bearer ${pendingToken}`
        }
      }));
      if (res && res.success) {
        this.setData({ passwordSuccess: '密码修改成功，请使用新密码重新登录' });
        setTimeout(() => {
          this.setData({
            showPasswordModal: false,
            showPasswordForm: false,
            pendingToken: null,
            password: ''
          });
        }, 1500);
      } else {
        this.setData({ passwordError: res.message || '修改密码失败' });
      }
    } catch (err) {
      this.setData({ passwordError: (err && err.message) || '修改密码失败' });
    }
  },

  checkProfileCompletion(userInfo) {
    const skipUntil = wx.getStorageSync('profile_skip_until');
    if (skipUntil && Date.now() < Number(skipUntil)) {
      wx.switchTab({ url: homeTabPath(userInfo.role) });
      return;
    }
    const needsCompletion = !userInfo.gender || !userInfo.birthDate;
    if (needsCompletion) {
      this.setData({ showProfileModal: true, profileModalUser: userInfo });
    } else {
      wx.switchTab({ url: homeTabPath(userInfo.role) });
    }
  },

  goToProfileFromModal() {
    this.setData({ showProfileModal: false });
    wx.navigateTo({ url: '/pages/profile/profile?firstLogin=1' });
  },

  skipProfileModal() {
    wx.setStorageSync('profile_skip_until', Date.now() + 24 * 60 * 60 * 1000);
    this.setData({ showProfileModal: false });
    const user = this.data.profileModalUser || app.globalData.userInfo;
    if (user) wx.switchTab({ url: homeTabPath(user.role) });
  },

  enterMockMode(username) {
    const role = this._inferRole(username);
    const u = (username || '').trim().toLowerCase();
    const MOCK_USERS_MAP = buildMockUserMap();
    const base = MOCK_USERS_MAP[u] || { userId: `mock_${u || 'user'}_${Date.now()}`, username: username.trim() || 'students', name: username || '演示用户', role, department: '', team: '' };
    const mockUser = Object.assign({}, base);
    mockUser.level = base.studentLevel || base.instructorLevel || (role === 'center_director' ? '中心主任' : '学员');
    wx.setStorageSync('token', 'mock_token');
    wx.setStorageSync('userInfo', mockUser);
    app.globalData.token = 'mock_token';
    app.globalData.userInfo = mockUser;
    app.enableMockMode();
    this.setData({ loading: false });
    wx.showToast({ title: '离线模式', icon: 'none' });
    this.checkProfileCompletion(mockUser);
  },

  copyWebUrl(e) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        this.setData({ copyTip: true });
        console.log('[login] URL 已复制到剪贴板', url);
        setTimeout(() => this.setData({ copyTip: false }), 2500);
      }
    });
  }
});
