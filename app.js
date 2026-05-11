const { mockUsers, mockSectors, mockScoreHistory } = require('./utils/mockData.js');

const DEFAULT_CLOUD_URL = 'https://cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com/backend/api';

function mockApiResponse(url, data) {
  const body = data || {};
  if (url === '/auth/login') {
    const user = mockUsers.find(function(u) { return u.username === body.username; }) || mockUsers[0];
    if (user && user.role === 'student' && user.isReleased) {
      return { success: false, message: '该学员已放单，账号已停用。如有疑问请联系管理员。' };
    }
    const fullUser = Object.assign({}, user);
    return { success: true, data: { token: 'mock_token_' + Date.now(), userInfo: fullUser, user: fullUser }, message: '登录成功（模拟模式）' };
  }
  if (url === '/auth/me') {
    const user = wx.getStorageSync('userInfo') || mockUsers[0];
    return { success: true, data: user };
  }
  if (url === '/sectors') {
    return { success: true, data: mockSectors, message: '获取扇区配置成功' };
  }
  const sectorMatch = url.match(/^\/sectors\/(.+)$/);
  if (sectorMatch) {
    const sector = mockSectors.find(s => s.sectorId === sectorMatch[1]);
    return sector ? { success: true, data: sector, message: '获取扇区详情成功' } : { success: false, message: '扇区不存在' };
  }
  if (url === '/scores' || url.split('?')[0] === '/scores') {
    const queryStr = url.split('?')[1] || '';
    const includeReleased = queryStr.includes('includeReleased=true');
    let items = mockScoreHistory.map(function(s) { return Object.assign({}, s); });
    if (!includeReleased) {
      const releasedStudentIds = new Set(mockUsers.filter(u => u.role === 'student' && u.isReleased).map(u => u.userId));
      items = items.filter(s => !releasedStudentIds.has(s.studentId));
    }
    return { success: true, data: { items, pagination: { page: 1, limit: 50, total: items.length, totalPages: 1 } }, message: '获取评分记录成功' };
  }
  if (url === '/users') {
    const enrichedUsers = mockUsers.map(function(u) { const o = Object.assign({}, u); o.isReleased = !!u.isReleased; o.releasedAt = u.releasedAt || null; return o; });
    return { success: true, data: { items: enrichedUsers, stats: { total: mockUsers.length, student: mockUsers.filter(u => u.role === 'student').length, instructor: mockUsers.filter(u => u.role === 'instructor').length, deputy_director: 0, supervisor: 0, department_head: 0, center_director: mockUsers.filter(u => u.role === 'center_director').length }, manageableRoles: ['student', 'instructor', 'deputy_director', 'supervisor', 'department_head', 'center_director'], pagination: { page: 1, limit: 50, total: mockUsers.length, totalPages: 1 } }, message: '获取用户列表成功' };
  }
  if (url === '/users/students') {
    const queryStr = url.split('?')[1] || '';
    const includeReleased = queryStr.includes('includeReleased=true');
    let students = mockUsers.filter(u => u.role === 'student');
    if (!includeReleased) {
      students = students.filter(u => !u.isReleased);
    }
    return { success: true, data: students.map(function(u) { const o = Object.assign({}, u); o.isReleased = !!u.isReleased; o.releasedAt = u.releasedAt || null; return o; }), message: '获取学员列表成功' };
  }
  if (url === '/export/backup') {
    return { success: true, data: { exportTime: new Date().toISOString(), version: '1.0', data: { users: body.users ? mockUsers : undefined, scores: body.scores ? mockScoreHistory : undefined, sectors: body.sectors ? mockSectors : undefined } }, message: '备份数据导出成功' };
  }
  const studentHistMatch = url.match(/^\/scores\/student\/([^/]+)\/history$/);
  if (studentHistMatch) {
    return { success: true, data: mockScoreHistory.map(function(s) { const o = Object.assign({}, s); o.studentId = studentHistMatch[1]; return o; }), message: '获取学员历史评分成功' };
  }
  const instructorHistMatch = url.match(/^\/scores\/instructor\/([^/]+)\/history$/);
  if (instructorHistMatch) {
    return { success: true, data: mockScoreHistory.map(function(s) { return Object.assign({}, s); }), message: '获取教员历史评分成功' };
  }
  const trendsStudentMatch = url.match(/^\/trends\/student\/([^?/]+)/);
  if (trendsStudentMatch) {
    const queryPart = (url.split('?')[1] || '');
    let sectorId = '';
    if (queryPart) { const parts = queryPart.split('&'); for (let i = 0; i < parts.length; i++) { if (parts[i].indexOf('sectorId=') === 0) { sectorId = parts[i].split('=')[1]; break; } } }
    if (!sectorId && data && data.sectorId) { sectorId = data.sectorId; }
    const filtered = mockScoreHistory.filter(function(s) { return s.studentId === trendsStudentMatch[1] && (!sectorId || s.sectorId === sectorId); });
    return { success: true, data: { scores: filtered }, message: '获取趋势数据成功' };
  }
  if (url === '/trends/overview' || url.split('?')[0] === '/trends/overview') {
    const studentSet = {}; mockScoreHistory.forEach(function(s) { if (s.studentId) studentSet[s.studentId] = true; });
    return { success: true, data: { totalScores: mockScoreHistory.length, scoredStudents: Object.keys(studentSet).length }, message: '获取趋势概览成功' };
  }
  const studentSectorMatch = url.match(/^\/scores\/student\/([^/]+)\/sector\/([^/]+)/);
  if (studentSectorMatch) {
    let match = null; for (let j = mockScoreHistory.length - 1; j >= 0; j--) { if (mockScoreHistory[j].studentId === studentSectorMatch[1] && mockScoreHistory[j].sectorId === studentSectorMatch[2]) { match = mockScoreHistory[j]; break; } }
    return match ? { success: true, data: match, message: '获取评分成功' } : { success: true, data: { scores: [] }, message: '暂无评分记录' };
  }
  return { success: true, data: null, message: '操作成功' };
}

const _origMockApiResponse = mockApiResponse;
mockApiResponse = function(url, data) {
  if (url === '/scores' && data) {
    return { success: true, data: { scoreId: 'mock_' + Date.now() }, message: '评分提交成功（模拟）' };
  }
  const putMatch = url.match(/^\/scores\/([^/]+)$/);
  if (putMatch) {
    return { success: true, data: { scoreId: putMatch[1] }, message: '评分修改成功（模拟）' };
  }
  const releaseMatch = url.match(/^\/users\/([^/]+)\/release$/);
  if (releaseMatch) {
    const uid = releaseMatch[1];
    const shouldRelease = data && data.isReleased !== false;
    for (let r = 0; r < mockUsers.length; r++) {
      if (mockUsers[r].userId === uid) {
        mockUsers[r].isReleased = shouldRelease;
        mockUsers[r].releasedAt = shouldRelease ? new Date().toISOString() : null;
        break;
      }
    }
    return { success: true, data: { userId: uid, isReleased: shouldRelease, releasedAt: shouldRelease ? new Date().toISOString() : null }, message: shouldRelease ? '学员已成功放单' : '已取消学员放单状态' };
  }
  return _origMockApiResponse(url, data);
};

App({
  globalData: {
    apiBaseUrl: DEFAULT_CLOUD_URL,
    token: null,
    userInfo: null,
    mockMode: false
  },

  onLaunch() {
    const CLOUD_URL = DEFAULT_CLOUD_URL;

    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    this.globalData.mockMode = false;
    wx.removeStorageSync('mock_mode');

    const savedApiBaseUrl = wx.getStorageSync('apiBaseUrl');

    if (savedApiBaseUrl) {
      const isLocalAddress = /localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/i.test(savedApiBaseUrl);

      if (isLocalAddress) {
        console.log('[app] 检测到本地地址，已自动切换为云端地址');
        wx.removeStorageSync('apiBaseUrl');
        this.globalData.apiBaseUrl = CLOUD_URL;
      } else {
        this.globalData.apiBaseUrl = savedApiBaseUrl;
      }
    }

    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
    console.log('小程序启动', this.globalData.apiBaseUrl, 'mockMode=', this.globalData.mockMode);
  },

  setApiBaseUrl(url) {
    const next = (url || '').trim().replace(/\/+$/, '');
    if (!next) return false;
    this.globalData.apiBaseUrl = next;
    this.globalData.mockMode = false;
    wx.setStorageSync('apiBaseUrl', next);
    console.log('[app] API 地址已切换为', next);
    return true;
  },

  enableMockMode() {
    this.globalData.mockMode = true;
    console.log('[app] 模拟模式已开启（仅当前会话）');
  },

  disableMockMode() {
    this.globalData.mockMode = false;
    wx.removeStorageSync('mock_mode');
    console.log('[app] 模拟模式已关闭');
  },

  navigateToLoginSafe() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    const onLoginPage = current && current.route === 'pages/login/login';
    if (onLoginPage) return;

    if (pages.length > 0) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    wx.reLaunch({ url: '/pages/login/login' });
  },

  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.mockMode = false;
    wx.reLaunch({ url: '/pages/login/login' });
  },

  requestTestLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将返回登录页面（测试用）',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  request(options) {
    const self = this;
    const token = self.globalData.token;
    const apiBaseUrl = self.globalData.apiBaseUrl;
    return new Promise(function(resolve, reject) {
      if (self.globalData.mockMode) {
        const mockRes = mockApiResponse(options.url, options.data);
        resolve(mockRes);
        return;
      }

      const customHeader = options.header || {};
      const method = (options.method || 'GET').toUpperCase();
      const data = options.data || {};
      const url = options.url;

      wx.request({
        url: apiBaseUrl + url,
        method: method,
        data: data,
        timeout: 30000,
        header: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { 'Authorization': 'Bearer ' + token } : {},
          customHeader
        ),
        success: function(res) {
          let resolved = res.data;
          if (typeof resolved === 'string') {
            try { resolved = JSON.parse(resolved); } catch (e) { /* 保持原字符串 */ }
          } else if (resolved && typeof resolved === 'object' && typeof resolved.body === 'string') {
            try { resolved = JSON.parse(resolved.body); } catch (e) {}
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(resolved);
          } else if (res.statusCode === 401) {
            console.log('[app] 收到 401，登录已过期');
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            self.globalData.token = null;
            self.globalData.userInfo = null;
            // 仅在非登录页时自动跳转回登录页，避免与 login.js 的降级逻辑冲突
            const pages = getCurrentPages();
            const cur = pages[pages.length - 1];
            const onLoginPage = cur && cur.route === 'pages/login/login';
            if (!onLoginPage) {
              wx.showToast({
                title: '登录已过期，请重新登录',
                icon: 'none',
                duration: 2000
              });
              setTimeout(function() {
                self.navigateToLoginSafe();
              }, 2000);
            }
            const isLoginRequest = options.url === '/auth/login';
            resolve({ success: false, message: isLoginRequest ? '账号或密码错误' : '登录已过期，请重新登录' });
          } else if (res.statusCode === 409) {
            console.log('[app] 409 冲突 ' + options.url, resolved);
            resolve(resolved || { success: false, message: '数据已存在' });
          } else {
            console.warn('[app] 请求失败 ' + options.url + ' status=' + res.statusCode);
            resolve(resolved || { success: false, message: '服务繁忙 (HTTP ' + res.statusCode + ')' });
          }
        },
        fail: function(err) {
          console.warn('[app] 网络请求失败 ' + options.url, (err && err.errMsg) || '');
          const errMsg = (err && err.errMsg) || '网络连接失败';
          wx.showToast({
            title: '网络异常',
            icon: 'none',
            duration: 2000
          });
          const mockRes = mockApiResponse(options.url, options.data);
          resolve(mockRes);
        }
      });
    });
  }
});
