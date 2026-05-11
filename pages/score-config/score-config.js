const app = getApp();
const { isManagerRole, getUserInfo } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

const INTERVAL_OPTIONS = [
  { label: '每周', days: 7 },
  { label: '每两周', days: 14 },
  { label: '每月', days: 30 },
  { label: '每季度', days: 90 }
];

const ASSIGN_MODES = [
  { value: 'all', label: '全体教员评分', desc: '所有教员均可对学员评分' },
  { value: 'assigned', label: '指定教员评分', desc: '仅分配的教员可对指定学员评分' },
  { value: 'mixed', label: '混合模式', desc: '全体教员基础评分 + 指定教员强化评分' }
];

Page({
  data: {
    userInfo: null,
    intervalIndex: 1,
    intervalOptions: INTERVAL_OPTIONS,
    assignMode: 'all',
    assignModes: ASSIGN_MODES,
    instructors: [],
    students: [],
    assignments: [],
    loading: false,
    saving: false,
    loadError: ''
  },

  onLoad() {
    const userInfo = getUserInfo();
    if (!userInfo || !isManagerRole(userInfo.role)) {
      wx.showToast({ title: '无权限', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ userInfo });
    this.loadConfig();
  },

  async loadConfig() {
    this.setData({ loading: true, loadError: '' });
    try {
      const [configRes, usersRes] = await Promise.all([
        app.request({ url: '/score-config' }).catch(() => null),
        app.request({ url: '/users' }).catch(() => null)
      ]);

      if (configRes) {
        const cfg = normalizeApiResponse(configRes);
        if (cfg && cfg.success && cfg.data) {
          const days = cfg.data.intervalDays || 14;
          const intervalIndex = INTERVAL_OPTIONS.findIndex(o => o.days === days);
          this.setData({
            intervalIndex: intervalIndex >= 0 ? intervalIndex : 1,
            assignMode: cfg.data.assignMode || 'all',
            assignments: cfg.data.assignments || []
          });
        }
      }

      if (usersRes) {
        const users = normalizeApiResponse(usersRes);
        if (users && users.success && users.data && users.data.items) {
          const list = users.data.items;
          this.setData({
            instructors: list.filter(u => u.role === 'instructor'),
            students: list.filter(u => u.role === 'student')
          });
        }
      }
    } catch (e) {
      this.setData({ loadError: '加载配置失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onIntervalChange(e) {
    this.setData({ intervalIndex: Number(e.detail.value) });
  },

  onModeChange(e) {
    this.setData({ assignMode: e.currentTarget.dataset.mode });
  },

  toggleAssignment(e) {
    const { instructorId, studentId } = e.currentTarget.dataset;
    let assignments = this.data.assignments.slice();
    const idx = assignments.findIndex(a => a.instructorId === instructorId && a.studentId === studentId);
    if (idx >= 0) {
      assignments.splice(idx, 1);
    } else {
      assignments.push({ instructorId, studentId });
    }
    this.setData({ assignments });
  },

  isAssigned(instructorId, studentId) {
    return this.data.assignments.some(a => a.instructorId === instructorId && a.studentId === studentId);
  },

  async saveConfig() {
    this.setData({ saving: true });
    try {
      const res = normalizeApiResponse(await app.request({
        url: '/score-config',
        method: 'PUT',
        data: {
          intervalDays: INTERVAL_OPTIONS[this.data.intervalIndex].days,
          assignMode: this.data.assignMode,
          assignments: this.data.assignments
        }
      }));
      if (res && res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        wx.showToast({ title: res && res.message ? res.message : '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误，配置已本地缓存', icon: 'none' });
      wx.setStorageSync('score_config_pending', {
        intervalDays: INTERVAL_OPTIONS[this.data.intervalIndex].days,
        assignMode: this.data.assignMode,
        assignments: this.data.assignments
      });
    } finally {
      this.setData({ saving: false });
    }
  }
});
