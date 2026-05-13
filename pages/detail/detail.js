const app = getApp();
const { normalizeApiResponse } = require('../../utils/api.js');

Page({
  data: {
    category: '',
    items: []
  },
  onLoad(options) {
    const { category, sector } = options;
    this.setData({ category });
    this.loadDetail(sector, category);
  },
  async loadDetail(sectorId, category) {
    let foundItems = null;
    try {
      const res = normalizeApiResponse(await app.request({ url: `/sectors/${sectorId || 'ACC02_32'}` }));
      if (res && res.success && res.data && res.data.categories) {
        const cat = res.data.categories.find(c => c.name === category);
        if (cat && cat.items) foundItems = cat.items;
      }
    } catch (e) { /* fall through */ }

    

    this.setData({ items: foundItems || [] });
  }
});
