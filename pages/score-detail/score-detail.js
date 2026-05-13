const app = getApp();
const { normalizeApiResponse } = require('../../utils/api.js');
const { getUserInfo, isManagerRole } = require('../../utils/roles.js');
const { buildDetailItems } = require('../../utils/categoryDetail.js');

function getGrade(total, max) {
  const pct = max > 0 ? total / max : 0;
  if (pct >= 0.95) return { text: '优秀', color: '#00d26a', class: 'score-excellent' };
  if (pct >= 0.90) return { text: '良好', color: '#ffaa00', class: 'score-good' };
  if (pct >= 0.85) return { text: '合格', color: '#60a5fa', class: 'score-pass' };
  return { text: '不合格', color: '#ff4d4f', class: 'score-fail' };
}

Page({
  data: {
    loading: true,
    loadError: '',
    scoreId: '',
    record: null,
    categories: [],
    userInfo: null,
    isAdmin: false,
    isOwner: false,
    expandedCats: {}
  },

  onLoad(options) {
    const scoreId = options && options.scoreId;
    if (!scoreId) {
      this.setData({ loading: false, loadError: '缺少评分记录ID' });
      return;
    }
    const userInfo = getUserInfo() || {};
    this.setData({
      userInfo,
      isAdmin: isManagerRole(userInfo.role),
      scoreId
    });
    this.loadDetail(scoreId);
  },

  async loadDetail(scoreId) {
    this.setData({ loading: true, loadError: '' });
    try {
      const res = normalizeApiResponse(await app.request({ url: `/scores/${scoreId}` }));
      let record = null;
      if (res && res.success && res.data) record = res.data;
      else if (res && res.data) record = res.data;
      else if (Array.isArray(res)) record = res[0];
      else record = res;

      if (!record || !record.scoreId) {
        this.setData({ loading: false, loadError: '记录不存在或已删除' });
        return;
      }

      const isOwner = this.data.userInfo && this.data.userInfo.userId === record.instructorId;
      const maxTotal = record.maxTotal || (record.scores || []).reduce(function(s, x) { return s + (x.maxScore || 0); }, 0) || 100;
      const grade = getGrade(record.totalScore || 0, maxTotal);

      // 扣分项汇总
      const deductItems = (record.itemDetails || [])
        .filter(function(d) { return Number(d.maxScore) > Number(d.score); })
        .map(function(d) {
          return {
            itemId: d.itemId || d.id,
            itemName: d.itemName || d.name || '评分项',
            score: d.score,
            maxScore: d.maxScore,
            deductVal: Number(d.maxScore) - Number(d.score),
            reason: String(d.reason || '').trim()
          };
        });

      // 加载扇区配置用于构建子项
      let sectorConfig = null;
      try {
        const sRes = normalizeApiResponse(await app.request({ url: `/sectors/${record.sectorId}` }));
        if (sRes && sRes.success && sRes.data && sRes.data.categories) {
          sectorConfig = sRes.data;
        } else if (sRes && sRes.categories) {
          sectorConfig = sRes;
        }
      } catch (e) {}

      // 构建分类详情
      const categories = (record.scores || []).map(function(cat) {
        const catScore = cat.score || 0;
        const catMax = cat.maxScore || 0;
        const catPct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
        const detailItems = buildDetailItems(sectorConfig, cat.categoryName, record);
        return Object.assign({}, cat, {
          catPct: catPct,
          barColor: catPct >= 90 ? '#00d26a' : catPct >= 75 ? '#ffaa00' : '#60a5fa',
          detailItems: detailItems
        });
      });

      this.setData({
        record: Object.assign({}, record, { maxTotal: maxTotal, grade: grade, _deductItems: deductItems }),
        categories: categories,
        isOwner: isOwner,
        loading: false
      });

      const self = this;
      wx.nextTick(function() { self.drawRadar(); });
    } catch (e) {
      this.setData({ loading: false, loadError: e.message || '加载失败，请重试' });
    }
  },

  drawRadar() {
    const categories = this.data.categories;
    if (!categories || categories.length === 0) return;
    const query = wx.createSelectorQuery().in(this);
    query.select('#detailRadar').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(function() { this.drawRadar(); }.bind(this), 300);
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
      const w = res[0].width;
      const h = res[0].height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const count = categories.length;
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) / 2 - 44;
      const angleStep = (Math.PI * 2) / count;

      // 外圈
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 网格
      for (let l = 1; l <= 5; l++) {
        ctx.beginPath();
        const r = (radius / 5) * l;
        for (let i = 0; i <= count; i++) {
          const a = i * angleStep - Math.PI / 2;
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = l === 5 ? '#1e3a5f' : 'rgba(30, 58, 95, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 轴线与标签
      for (let i = 0; i < count; i++) {
        const a = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        const lr = radius + 22;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#8a9bb0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = categories[i].categoryName;
        if (name.length > 4) {
          ctx.fillText(name.substring(0, 4), cx + lr * Math.cos(a), cy + lr * Math.sin(a) - 6);
          ctx.fillText(name.substring(4, 8) + (name.length > 8 ? '...' : ''), cx + lr * Math.cos(a), cy + lr * Math.sin(a) + 6);
        } else {
          ctx.fillText(name, cx + lr * Math.cos(a), cy + lr * Math.sin(a));
        }
      }

      // 数据区域
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const a = idx * angleStep - Math.PI / 2;
        const cat = categories[idx];
        const r = radius * ((cat.score || 0) / (cat.maxScore || 1));
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 210, 106, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#00d26a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowColor = '#00d26a';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 数据点
      for (let i = 0; i < count; i++) {
        const a = i * angleStep - Math.PI / 2;
        const cat = categories[i];
        const r = radius * ((cat.score || 0) / (cat.maxScore || 1));
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1628';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00d26a';
        ctx.stroke();
      }
    }.bind(this));
  },

  toggleCatExpand(e) {
    const catId = e.currentTarget.dataset.catId;
    const expanded = Object.assign({}, this.data.expandedCats);
    expanded[catId] = !expanded[catId];
    this.setData({ expandedCats: expanded });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  goToProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    if (!userId) return;
    wx.navigateTo({
      url: '/pages/profile/profile?userId=' + userId,
      fail: function(err) {
        wx.showToast({ title: '跳转失败:' + ((err && err.errMsg) || '未知错误'), icon: 'none' });
      }
    });
  },

  async onDeleteTap() {
    const record = this.data.record;
    if (!record || !record.scoreId) return;
    if (!this.data.isAdmin && !this.data.isOwner) {
      wx.showToast({ title: '无权删除', icon: 'none' });
      return;
    }
    const res = await new Promise(function(resolve) {
      wx.showModal({
        title: '确认删除',
        content: '删除后不可恢复，是否继续？',
        confirmColor: '#ef4444',
        success: resolve
      });
    });
    if (!res.confirm) return;
    wx.showLoading({ title: '删除中...' });
    try {
      await app.request({ url: `/scores/${record.scoreId}`, method: 'DELETE' });
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      setTimeout(function() { wx.navigateBack({ delta: 1 }); }, 800);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
