const app = getApp();
const { getUserInfo } = require('../../utils/roles.js');
const { normalizeApiResponse, normalizeArrayPayload } = require('../../utils/api.js');

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

function statusIcon(status) {
  if (status === 'expired') return '🔴';
  if (status === 'warning') return '🟡';
  return '🟢';
}

Page({
  data: {
    expiryReminders: [],
    scoringReminders: [],
    groupedReminders: [],
    filter: 'all',
    loading: false,
    loadError: '',
    expiryCount: 0,
    scoringCount: 0,
    totalCount: 0
  },

  onLoad() {
    this.loadAllReminders();
  },

  onPullDownRefresh() {
    this.loadAllReminders().finally(() => wx.stopPullDownRefresh());
  },

  async loadAllReminders() {
    this.setData({ loading: true, loadError: '' });
    try {
      const [expiryList, scoringList] = await Promise.all([
        this.loadExpiryReminders(),
        this.computeScoringReminders()
      ]);
      const expiryCount = expiryList.filter(r => r.icaoStatus === 'expired' || r.icaoStatus === 'warning' || r.medicalStatus === 'expired' || r.medicalStatus === 'warning').length;
      const scoringCount = scoringList.length;
      this.setData({
        expiryReminders: expiryList,
        scoringReminders: scoringList,
        expiryCount,
        scoringCount,
        totalCount: expiryCount + scoringCount
      });
      this.buildGroupedReminders();
    } catch (e) {
      this.setData({ loadError: '加载提醒失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadExpiryReminders() {
    try {
      const res = normalizeApiResponse(await app.request({ url: '/users/reminders' }));
      let list = [];
      if (res && res.success && res.data && res.data.reminders) {
        list = res.data.reminders;
      }
      if (!list.length) {
        list = await this.buildLocalReminders();
      }
      return list.map(item => {
        const icaoDays = computeDaysUntil(item.icaoExpiry);
        const medicalDays = computeDaysUntil(item.medicalExpiry);
        const icaoStatus = getReminderStatus(icaoDays);
        const medicalStatus = getReminderStatus(medicalDays);
        return Object.assign({}, item, {
          type: 'expiry',
          icaoDays,
          medicalDays,
          icaoStatus,
          medicalStatus,
          icaoText: statusText(icaoStatus, icaoDays),
          medicalText: statusText(medicalStatus, medicalDays),
          icaoIcon: statusIcon(icaoStatus),
          medicalIcon: statusIcon(medicalStatus)
        });
      });
    } catch (e) {
      return [];
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

  async computeScoringReminders() {
    let intervalDays = 14;
    try {
      const configRes = normalizeApiResponse(await app.request({ url: '/score-config' }));
      if (configRes && configRes.success && configRes.data && configRes.data.intervalDays) {
        intervalDays = configRes.data.intervalDays;
      }
    } catch (e) {}

    let students = [];
    try {
      const studentsRes = normalizeApiResponse(await app.request({ url: '/users/students' }));
      if (studentsRes && studentsRes.success && Array.isArray(studentsRes.data)) {
        students = studentsRes.data;
      } else if (Array.isArray(studentsRes)) {
        students = studentsRes;
      } else if (studentsRes && Array.isArray(studentsRes.data)) {
        students = studentsRes.data;
      }
    } catch (e) {}

    const reminders = [];
    const now = new Date();

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      let lastScoreDate = null;
      let sectorId = '';
      try {
        const historyRes = normalizeApiResponse(await app.request({ url: '/scores/student/' + s.userId + '/history' }));
        let records = [];
        if (Array.isArray(historyRes)) {
          records = historyRes;
        } else if (historyRes && historyRes.success && Array.isArray(historyRes.data)) {
          records = historyRes.data;
        } else if (historyRes && historyRes.success && historyRes.data && Array.isArray(historyRes.data.items)) {
          records = historyRes.data.items;
        }
        if (records.length > 0) {
          const sorted = records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          lastScoreDate = sorted[0].date;
          sectorId = sorted[0].sectorId || '';
        }
      } catch (e) {}

      let daysSinceLastScore = null;
      if (lastScoreDate) {
        const lastDate = new Date(lastScoreDate);
        daysSinceLastScore = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      }

      let status = 'normal';
      if (daysSinceLastScore === null || daysSinceLastScore >= intervalDays) {
        status = 'expired';
      } else if (daysSinceLastScore >= intervalDays - 1) {
        status = 'warning';
      }

      if (status === 'normal') continue;

      let statusLabel = '';
      if (status === 'expired') {
        if (daysSinceLastScore === null) {
          statusLabel = '从未评分';
        } else {
          statusLabel = '已逾期' + (daysSinceLastScore - intervalDays) + '天';
        }
      } else {
        statusLabel = '即将到期';
      }

      reminders.push({
        type: 'scoring',
        studentId: s.userId,
        studentName: s.name || s.username || s.userId,
        daysSinceLastScore: daysSinceLastScore,
        intervalDays: intervalDays,
        status: status,
        statusLabel: statusLabel,
        sectorId: sectorId,
        icon: statusIcon(status)
      });
    }

    reminders.sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (a.status !== 'expired' && b.status === 'expired') return 1;
      return (b.daysSinceLastScore || 999) - (a.daysSinceLastScore || 999);
    });

    return reminders;
  },

  buildGroupedReminders() {
    const { filter, expiryReminders, scoringReminders } = this.data;
    const groups = [];

    const showExpiry = filter === 'all' || filter === 'expiry';
    const showScoring = filter === 'all' || filter === 'scoring';

    if (showScoring && scoringReminders.length > 0) {
      groups.push({
        key: 'scoring',
        title: '评分提醒',
        items: scoringReminders
      });
    }

    if (showExpiry) {
      const filteredExpiry = expiryReminders.filter(r => {
        if (filter === 'expiry') {
          return r.icaoStatus === 'expired' || r.icaoStatus === 'warning' || r.medicalStatus === 'expired' || r.medicalStatus === 'warning';
        }
        return true;
      });
      if (filteredExpiry.length > 0) {
        groups.push({
          key: 'expiry',
          title: '证件到期',
          items: filteredExpiry
        });
      }
    }

    this.setData({ groupedReminders: groups });
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.buildGroupedReminders();
  },

  goScore(e) {
    const { studentid, sectorid } = e.currentTarget.dataset;
    app.globalData.pendingTabParams = {};
    if (studentid) app.globalData.pendingTabParams.preselectStudent = studentid;
    if (sectorid) app.globalData.pendingTabParams.preselectSector = sectorid;
    wx.switchTab({ url: '/pages/score/score' });
  },

  goEditUser(e) {
    const { userid } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/users/users?editUserId=' + (userid || '') });
  }
});
