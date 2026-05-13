const APP_VERSION = '2.1.0';
const BUILD_TIME = '2026-05-13';

const API_ENVIRONMENTS = {
  local: 'http://localhost:5000/api',
  dev: 'https://cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com/backend/api',
  prod: 'https://cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com/backend/api'
};
const DEFAULT_API_ENV = 'prod';

App({
  globalData: {
    version: APP_VERSION,
    buildTime: BUILD_TIME,
    apiBaseUrl: API_ENVIRONMENTS[DEFAULT_API_ENV],
    apiEnv: DEFAULT_API_ENV,
    token: null,
    userInfo: null,
    pendingTabParams: null
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    // 环境选择优先级：Storage中保存的自定义地址 > Storage中的环境标记 > 默认生产环境
    const savedApiBaseUrl = wx.getStorageSync('apiBaseUrl');
    const savedApiEnv = wx.getStorageSync('apiEnv');

    if (savedApiBaseUrl) {
      // 检测是否为本地地址（安全机制：防止生产环境误连本地服务）
      const isLocalAddress = /localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/i.test(savedApiBaseUrl);
      if (isLocalAddress) {
        // 检测到本地地址，自动切换为默认云端地址
        wx.removeStorageSync('apiBaseUrl');
        const env = (savedApiEnv && API_ENVIRONMENTS[savedApiEnv]) ? savedApiEnv : DEFAULT_API_ENV;
        this.globalData.apiBaseUrl = API_ENVIRONMENTS[env];
        this.globalData.apiEnv = env;
      } else {
        this.globalData.apiBaseUrl = savedApiBaseUrl;
        this.globalData.apiEnv = savedApiEnv || DEFAULT_API_ENV;
      }
    } else if (savedApiEnv && API_ENVIRONMENTS[savedApiEnv]) {
      this.globalData.apiBaseUrl = API_ENVIRONMENTS[savedApiEnv];
      this.globalData.apiEnv = savedApiEnv;
    } else {
      this.globalData.apiBaseUrl = API_ENVIRONMENTS[DEFAULT_API_ENV];
      this.globalData.apiEnv = DEFAULT_API_ENV;
    }

    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
    // 小程序启动完成
  },

  setApiEnv(env) {
    if (API_ENVIRONMENTS[env]) {
      this.globalData.apiBaseUrl = API_ENVIRONMENTS[env];
      this.globalData.apiEnv = env;
      wx.setStorageSync('apiEnv', env);
      wx.removeStorageSync('apiBaseUrl');
      return true;
    }
    return false;
  },

  getApiEnvironments() {
    return API_ENVIRONMENTS;
  },

  setApiBaseUrl(url) {
    const next = (url || '').trim().replace(/\/+$/, '');
    if (!next) return false;
    this.globalData.apiBaseUrl = next;
    wx.setStorageSync('apiBaseUrl', next);
    return true;
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
            const serverMsg = (resolved && resolved.message) || '';
            resolve({
              success: false,
              message: isLoginRequest ? (serverMsg || '账号或密码错误') : '登录已过期，请重新登录',
              code: 'UNAUTHORIZED'
            });
          } else if (res.statusCode === 403) {
            const forbiddenMsg = (resolved && resolved.message) || '无权限访问';
            resolve({ success: false, message: forbiddenMsg, code: 'FORBIDDEN' });
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
          reject(err);
        }
      });
    });
  }
});
