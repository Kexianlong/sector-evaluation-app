const { isStudentRole, isInstructorRole, isManagerRole } = require('../utils/roles.js');

// app.json 中 tabBar.list 注册的真正 tab 页
const TAB_PATHS = [
  '/pages/radar/radar',
  '/pages/trend/trend',
  '/pages/score/score',
  '/pages/mygrades/mygrades',
  '/pages/overview/overview'
];

function tabListForRole(role) {
  if (isStudentRole(role)) {
    return [
      { pagePath: '/pages/radar/radar', text: '学员详情', iconType: 'user' },
      { pagePath: '/pages/trend/trend', text: '成长趋势', iconType: 'trend' },
      { pagePath: '/pages/mygrades/mygrades', text: '我的成绩', iconType: 'user' }
    ];
  }
  if (isInstructorRole(role)) {
    return [
      { pagePath: '/pages/radar/radar', text: '学员详情', iconType: 'user' },
      { pagePath: '/pages/trend/trend', text: '成长趋势', iconType: 'trend' },
      { pagePath: '/pages/mygrades/mygrades', text: '评分总览', iconType: 'analyze' },
      { pagePath: '/pages/score/score', text: '评分工作', iconType: 'edit' }
    ];
  }
  if (isManagerRole(role)) {
    return [
      { pagePath: '/pages/trend/trend', text: '详情', iconType: 'trend' },
      { pagePath: '/pages/mygrades/mygrades', text: '评分总览', iconType: 'user' },
      { pagePath: '/pages/overview/overview', text: '管理', iconType: 'building' }
    ];
  }
  return [
    { pagePath: '/pages/radar/radar', text: '学员详情', iconType: 'user' },
    { pagePath: '/pages/trend/trend', text: '成长趋势', iconType: 'trend' },
    { pagePath: '/pages/mygrades/mygrades', text: '我的成绩', iconType: 'user' }
  ];
}

function computeSelected(list, currentPage) {
  if (!currentPage || !list.length) return 0;
  const route = currentPage.route;
  let selected = 0;
  list.forEach((item, i) => {
    const p = item.pagePath.replace(/^\//, '');
    if (p === route) selected = i;
  });
  return selected;
}

Component({
  data: {
    selected: 0,
    list: [],
    backgroundColor: '#132238',
    pressingIndex: -1
  },

  /* 缓存角色和列表，避免每次页面 show 都重新计算 */
  _cachedRole: null,
  _cachedList: null,
  _switching: false,

  lifetimes: {
    attached() {
      this.init();
    },
    ready() {
      // 仅做一次状态校准，避免多次 setTimeout 造成闪烁
      this.refreshSelected();
    }
  },

  pageLifetimes: {
    show() {
      // 页面切换完成后同步选中状态（无需 setTimeout，pageLifetimes.show 本身在页面就绪后触发）
      this.refreshSelected();
    }
  },

  methods: {
    init() {
      const app = getApp();
      let userInfo = app.globalData.userInfo;
      if (!userInfo) {
        userInfo = wx.getStorageSync('userInfo');
        if (userInfo) app.globalData.userInfo = userInfo;
      }
      const role = userInfo && userInfo.role;
      this._cachedRole = role;
      const list = tabListForRole(role);
      this._cachedList = list;
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      const selected = computeSelected(list, cur);
      this.setData({ list, selected, backgroundColor: '#132238', pressingIndex: -1 });
    },

    refreshSelected() {
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;
      const cur = pages[pages.length - 1];
      const list = this._cachedList || tabListForRole(this._cachedRole);
      const selected = computeSelected(list, cur);
      // 状态未变化时跳过 setData，避免闪烁
      if (selected === this.data.selected && list.length === this.data.list.length) return;
      this.setData({ list, selected });
    },

    switchTab(e) {
      const url = e.currentTarget.dataset.path;
      const index = Number(e.currentTarget.dataset.index);

      // 点击当前已选中项，不做任何操作
      if (index === this.data.selected) return;

      // 防抖：300ms 内禁止重复点击
      if (this._switching) return;
      this._switching = true;
      setTimeout(() => { this._switching = false; }, 300);

      // 先给出即时视觉反馈（pressing 态）
      this.setData({ pressingIndex: index });
      setTimeout(() => this.setData({ pressingIndex: -1 }), 150);

      // 真正的选中状态等页面切换完成后再由 pageLifetimes.show 同步
      // 这样避免颜色先变、页面后切的割裂感
      if (TAB_PATHS.includes(url)) {
        wx.switchTab({ url });
      } else {
        wx.navigateTo({ url });
      }
    },

    handleLogout() {
      wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            const app = getApp();
            if (app && app.logout) app.logout();
          }
        }
      });
    }
  }
});
