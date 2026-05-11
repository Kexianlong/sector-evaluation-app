const app = getApp();
const { MOCK_SECTORS } = require('../../utils/mockData.js');
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

    if (!foundItems || foundItems.length === 0) {
      const mockSector = (MOCK_SECTORS || []).find(function(s) { return s.sectorId === sectorId || s.sectorId === 'ACC02_32'; });
      if (mockSector && mockSector.categories) {
        const mockCat = mockSector.categories.find(function(c) { return c.name === category; });
        if (mockCat && mockCat.items) foundItems = mockCat.items;
      }
    }

    this.setData({ items: foundItems || [] });
  }
});
