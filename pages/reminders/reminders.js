const app = getApp();
const { getUserInfo } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function computeDaysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diff = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getReminderStatus(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 30) return 'warning';
  return 'normal';
}

function statusText(status, days) {
  if (status === 'expired') return '已过期';
  if (status === 'warning') return `${days}天后到期`;
  return '正常';
}

Page({
  data: {
    reminders: [],
    filter: 'all',
    loading: false,
    loadError: ''
  },

  onLoad() {
    this.loadReminders();
  },

  onPullDownRefresh() {
    this.loadReminders().finally(() => wx.stopPullDownRefresh());
  },

  async loadReminders() {
    this.setData({ loading: true, loadError: '' });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/reminders' }));
      let list = [];
      if (res && res.success && res.data && res.data.reminders) {
        list = res.data.reminders;
      }
      // 如果服务端返回空，尝试从本地用户列表构建基础提醒
      if (!list.length) {
        list = await this.buildLocalReminders();
      }
      const enriched = list.map(item => {
        const icaoDays = computeDaysUntil(item.icaoExpiry);
        const medicalDays = computeDaysUntil(item.medicalExpiry);
        const icaoStatus = getReminderStatus(icaoDays);
        const medicalStatus = getReminderStatus(medicalDays);
        return Object.assign({}, item, {
          icaoDays,
          medicalDays,
          icaoStatus,
          medicalStatus,
          icaoText: statusText(icaoStatus, icaoDays),
          medicalText: statusText(medicalStatus, medicalDays)
        });
      });
      this.setData({ reminders: enriched });
    } catch (e) {
      this.setData({ loadError: '加载提醒失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async buildLocalReminders() {
    try {
      const usersRes = await app.request({ url: '/users' });
      const users = normalizeApiResponse(usersRes);
      if (users && users.success && users.data && users.data.items) {
        return users.data.items.map(u => ({
          userId: u.userId,
          name: u.name,
          department: u.department,
          role: u.role,
          icaoExpiry: u.icaoExpiry,
          medicalExpiry: u.medicalExpiry
        }));
      }
    } catch (e) {}
    return [];
  },

  switchFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
  },

  getFilteredReminders() {
    const { reminders, filter } = this.data;
    if (filter === 'all') return reminders;
    if (filter === 'icao') return reminders.filter(r => r.icaoStatus === 'warning' || r.icaoStatus === 'expired');
    if (filter === 'medical') return reminders.filter(r => r.medicalStatus === 'warning' || r.medicalStatus === 'expired');
    if (filter === 'score') return reminders.filter(r => r.pendingScore);
    return reminders;
  }
});
