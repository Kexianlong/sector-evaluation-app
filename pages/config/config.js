const app = getApp();
const { navRoleCaption, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { canAccessConfig } = require('../../utils/permission.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

function normalizeSectorId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^\w/.-]+/g, '_')
    .replace(/\//g, '_');
}

function createDefaultCategories() {
  return [{
    id: genId('c'),
    name: '评估维度1',
    maxScore: 100,
    minScore: 85,
    code: '',
    dimension: '',
    weight: 1,
    tags: [],
    items: [{
      id: genId('i'),
      name: '评分项1',
      maxScore: 100,
      description: '请根据实际考核场景补充评分标准说明',
      deductionReason: '',
      code: '',
      dimension: '',
      weight: 1,
      tags: []
    }]
  }];
}

Page({
  data: {
    userInfo: null,
    sectors: [],
    loading: false,
    saving: false,
    editing: false,
    isNew: false,
    editingSector: null,
    computedTotal: 0,
    valid: true,
    errorMsg: '',
    deletingId: '',
    toast: ''
  },

  onLoad() {
    let userInfo = getUserInfo();
    this.setData({ userInfo, roleLabel: getRoleLabel(userInfo.role) });
    if (!canAccessConfig(userInfo)) {
      wx.showToast({ title: '无权限', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/radar/radar' }), 1500);
      return;
    }
    this.loadSectors();
  },

  async loadSectors() {
    this.setData({ loading: true });
    try {
      const res = normalizeApiResponse(await app.request({ url: '/sectors' }));
      if (res && res.success && Array.isArray(res.data)) {
        this.setData({ sectors: res.data });
      } else if (res && res.success && res.data && Array.isArray(res.data.items)) {
        this.setData({ sectors: res.data.items });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  newSector() {
    const categories = createDefaultCategories();
    const sector = {
      sectorId: '',
      name: '',
      totalScore: 100,
      categories
    };
    const validation = this._validate(sector);
    this.setData(Object.assign({ editing: true, isNew: true, editingSector: sector }, validation));
  },

  async editSector(e) {
    const sectorId = e.currentTarget.dataset.id;
    const sector = this.data.sectors.find(s => s.sectorId === sectorId);
    if (!sector) return;
    let clone = JSON.parse(JSON.stringify(sector));
    try {
      wx.showLoading({ title: '加载详情...' });
      const detail = normalizeApiResponse(await app.request({ url: `/sectors/${sectorId}` }));
      if (detail && detail.categories) {
        Object.assign(clone, detail);
      }
    } catch (e) {
      console.log('[config] 加载扇区详情失败，使用列表数据');
    } finally {
      wx.hideLoading();
    }
    const validation = this._validate(clone);
    this.setData(Object.assign({ editing: true, isNew: false, editingSector: clone }, validation));
  },

  cancelEdit() {
    this.setData({
      editing: false,
      isNew: false,
      editingSector: null,
      computedTotal: 0,
      valid: true,
      errorMsg: ''
    });
  },

  updateSectorField(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const sector = this.data.editingSector;
    if (field === 'sectorId') {
      sector[field] = normalizeSectorId(value);
    } else if (field === 'totalScore') {
      sector[field] = parseInt(value) || 0;
    } else {
      sector[field] = value;
    }
    const validation = this._validate(sector);
    this.setData(Object.assign({ editingSector: sector }, validation));
  },

  addCategory() {
    const sector = this.data.editingSector;
    sector.categories = sector.categories || [];
    sector.categories.push({
      id: genId('c'),
      name: '',
      maxScore: 0,
      minScore: 0,
      code: '',
      dimension: '',
      weight: 1,
      tags: [],
      items: []
    });
    const validation = this._validate(sector);
    this.setData(Object.assign({ editingSector: sector }, validation));
  },

  removeCategory(e) {
    const { index } = e.currentTarget.dataset;
    const sector = this.data.editingSector;
    sector.categories.splice(index, 1);
    const validation = this._validate(sector);
    this.setData(Object.assign({ editingSector: sector }, validation));
  },

  updateCategoryField(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const sector = this.data.editingSector;
    const numericFields = new Set(['maxScore', 'minScore', 'weight']);
    if (numericFields.has(field)) {
      sector.categories[index][field] = parseFloat(value) || 0;
    } else if (field === 'tags') {
      sector.categories[index][field] = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
    } else {
      sector.categories[index][field] = value;
    }
    const validation = this._validate(sector);
    this.setData(Object.assign({ editingSector: sector }, validation));
  },

  addItem(e) {
    const { catIndex } = e.currentTarget.dataset;
    const sector = this.data.editingSector;
    sector.categories[catIndex].items = sector.categories[catIndex].items || [];
    sector.categories[catIndex].items.push({
      id: genId('i'),
      name: '',
      maxScore: 0,
      description: '',
      deductionReason: '',
      code: '',
      dimension: '',
      weight: 1,
      tags: []
    });
    this.setData({ editingSector: sector });
  },

  removeItem(e) {
    const { catIndex, itemIndex } = e.currentTarget.dataset;
    const sector = this.data.editingSector;
    sector.categories[catIndex].items.splice(itemIndex, 1);
    this.setData({ editingSector: sector });
  },

  updateItemField(e) {
    const { catIndex, itemIndex, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const sector = this.data.editingSector;
    const numericFields = new Set(['maxScore', 'weight']);
    if (numericFields.has(field)) {
      sector.categories[catIndex].items[itemIndex][field] = parseFloat(value) || 0;
    } else if (field === 'tags') {
      sector.categories[catIndex].items[itemIndex][field] = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
    } else {
      sector.categories[catIndex].items[itemIndex][field] = value;
    }
    this.setData({ editingSector: sector });
  },

  _validate(sector) {
    if (!sector.sectorId || !sector.name) {
      return { valid: false, errorMsg: '扇区ID和名称不能为空', computedTotal: 0 };
    }
    if (!sector.categories || sector.categories.length === 0) {
      return { valid: false, errorMsg: '请至少添加一个评分分类', computedTotal: 0 };
    }
    for (let i = 0; i < sector.categories.length; i++) {
      const cat = sector.categories[i];
      if (!cat.id || !cat.name) {
        return { valid: false, errorMsg: `第${i + 1}个分类的ID和名称不能为空`, computedTotal: 0 };
      }
    }
    const total = sector.categories.reduce((sum, cat) => sum + (parseFloat(cat.maxScore) || 0), 0);
    if (sector.totalScore > 0 && sector.totalScore !== total) {
      return { valid: false, errorMsg: `总分 (${sector.totalScore}) ≠ 分类满分之和 (${total})`, computedTotal: total };
    }
    return { valid: true, errorMsg: '', computedTotal: total };
  },

  async saveSector() {
    if (this.data.saving) {
      wx.showToast({ title: '保存中，请稍候', icon: 'none' });
      return;
    }
    const { editingSector, isNew } = this.data;
    const sector = JSON.parse(JSON.stringify(editingSector));
    sector.totalScore = this.data.computedTotal;
    const validation = this._validate(sector);
    if (!validation.valid) {
      wx.showToast({ title: validation.errorMsg, icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      
      if (isNew) {
        await app.request({
          url: '/sectors',
          method: 'POST',
          data: sector
        });
      } else {
        await app.request({
          url: `/sectors/${sector.sectorId}`,
          method: 'PUT',
          data: sector
        });
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ editing: false, editingSector: null });
      this.loadSectors();
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  _readFileAsBase64(filePath) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      try {
        const base64 = fs.readFileSync(filePath, 'base64');
        resolve(base64);
      } catch (e) {
        reject(e);
      }
    });
  },

  uploadExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: async (res) => {
        const file = res.tempFiles[0];
        this._doUpload(file.path, file.name, false);
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择文件失败', icon: 'none' });
        }
      }
    });
  },

  async _doUpload(filePath, filename, overwrite) {
    wx.showLoading({ title: overwrite ? '覆盖更新中...' : '上传中...' });
    try {
      const base64data = await this._readFileAsBase64(filePath);
      const res2 = await app.request({
        url: '/sectors/upload',
        method: 'POST',
        data: { fileBase64: base64data, filename: filename, overwrite: overwrite }
      });
      wx.hideLoading();

      if (!res2.success && res2.message === '扇区已存在' && res2.data && res2.data.sectorId) {
        const sectorId = res2.data.sectorId;
        const name = res2.data.name;
        wx.showModal({
          title: '扇区已存在',
          content: '扇区 "' + name + '" (' + sectorId + ') 已存在，是否覆盖更新？',
          confirmText: '覆盖',
          confirmColor: '#ff4d4f',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this._doUpload(filePath, filename, true);
            }
          }
        });
        return;
      }

      if (res2.success) {
        const action = (res2.data && res2.data.created) ? '创建' : '更新';
        const secName = (res2.data && res2.data.parsed && res2.data.parsed.name) || '';
        wx.showModal({
          title: '上传成功',
          content: '已' + action + '扇区：' + secName,
          showCancel: false,
          success: () => this.loadSectors()
        });
      } else {
        wx.showModal({
          title: '上传失败',
          content: res2.message || '上传失败',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: '上传失败',
        content: e.message || '网络请求失败',
        showCancel: false
      });
    }
  },

  importFromExcel() {
    const self = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: async function(fileRes) {
        const file = fileRes.tempFiles[0];
        wx.showLoading({ title: '解析中...' });
        try {
          const base64data = await self._readFileAsBase64(file.path);
          const res2 = await app.request({
            url: '/sectors/parse',
            method: 'POST',
            data: { fileBase64: base64data, filename: file.name }
          });
          wx.hideLoading();

          if (res2.success) {
            const parsed = res2.data && res2.data.sector;
            if (!parsed) {
              wx.showToast({ title: '解析结果为空', icon: 'none' });
              return;
            }
            let sector = {
              sectorId: parsed.sectorId || '',
              name: parsed.name || '',
              totalScore: parsed.totalScore || 0,
              categories: parsed.categories || []
            };
            const validation = self._validate(sector);
            self.setData(Object.assign({ editingSector: sector }, validation));
            wx.showToast({
              title: (res2.data && res2.data.exists) ? '已导入（该扇区已存在）' : '导入成功',
              icon: 'none'
            });
          } else {
            wx.showModal({
              title: '解析失败',
              content: res2.message || '解析失败',
              showCancel: false
            });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showModal({
            title: '解析失败',
            content: e.message || '网络请求失败',
            showCancel: false
          });
        }
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('cancel') < 0) {
          wx.showToast({ title: '选择文件失败', icon: 'none' });
        }
      }
    });
  },

  deleteSector(e) {
    const sectorId = e.currentTarget.dataset.id;
    const sector = this.data.sectors.find(s => s.sectorId === sectorId);
    wx.showModal({
      title: '确认删除',
      content: '确定删除扇区 "' + (sector ? sector.name : sectorId) + '" 吗？此操作不可恢复。',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ deletingId: sectorId });
          try {
            
            await app.request({ url: `/sectors/${sectorId}`, method: 'DELETE' });
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadSectors();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          } finally {
            this.setData({ deletingId: '' });
          }
        }
      }
    });
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  onPullDownRefresh() {
    this.loadSectors().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

});
