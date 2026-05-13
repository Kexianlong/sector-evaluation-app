/**
 * 分类详情弹窗辅助函数
 * 用于在多个页面中复用"点击分类查看历史趋势和扣分项"的功能
 */

/**
 * 构建某分类的历史趋势数据
 * @param {Array} records - 学员的完整评分历史记录
 * @param {string} categoryName - 分类名称
 * @param {number} maxCount - 最多返回多少条记录（默认6）
 */
function buildCategoryTrend(records, categoryName, maxCount) {
  maxCount = maxCount || 6;
  const trend = [];
  const sorted = (records || []).slice().sort(function(a, b) {
    return (a.date || '').localeCompare(b.date || '');
  });
  const recent = sorted.slice(-maxCount);
  recent.forEach(function(rec, idx) {
    if (!rec || !rec.scores) return;
    const catScore = rec.scores.find(function(s) { return s.categoryName === categoryName; });
    if (catScore) {
      trend.push({
        date: (rec.date || '').slice(5, 10),
        fullDate: rec.date || '',
        score: catScore.score || 0,
        maxScore: catScore.maxScore || 0,
        recordIndex: idx,
        record: rec
      });
    }
  });
  return trend;
}

/**
 * 从评分记录中提取某分类的 itemDetails（扣分项列表）
 * @param {Object} sectorConfig - 扇区配置
 * @param {string} categoryName - 分类名称
 * @param {Object} record - 评分记录（含 itemDetails）
 */
function buildDetailItems(sectorConfig, categoryName, record) {
  let items = [];
  if (sectorConfig && sectorConfig.categories) {
    const configCat = sectorConfig.categories.find(function(c) { return c.name === categoryName; });
    if (configCat && configCat.items) {
      items = configCat.items.map(function(it) {
        return {
          id: it.id,
          name: it.name,
          maxScore: it.maxScore || 0,
          deductionTemplate: (it.deductionReason || it.description || '').trim()
        };
      });
    }
  }
  // 如果 sectorConfig 为空但 record.itemDetails 存在，直接从 itemDetails 构建
  if (items.length === 0 && record && record.itemDetails && record.itemDetails.length) {
    const catItems = record.itemDetails.filter(function(d) { return d.categoryName === categoryName; });
    if (catItems.length) {
      items = catItems.map(function(d) {
        return {
          id: d.itemId || d.id,
          name: d.itemName || d.name || '评分项',
          maxScore: d.maxScore || 0,
          deductionTemplate: ''
        };
      });
    }
  }
  if (record) {
    if (record.itemDetails && record.itemDetails.length) {
      items = items.map(function(it) {
        const m = record.itemDetails.find(function(d) {
          return (it.id && d.itemId === it.id) || d.itemName === it.name;
        });
        if (m && 'score' in m) {
          return Object.assign({}, it, {
            score: m.score,
            maxScore: m.maxScore !== undefined ? m.maxScore : it.maxScore,
            deductionReason: (m.reason || '').trim(),
            hasScore: true
          });
        }
        return it;
      });
    } else if (record.scores) {
      const sc = record.scores.find(function(s) { return s.categoryName === categoryName; });
      if (sc && sc.items) {
        items = items.map(function(it) {
          const si = sc.items.find(function(x) { return x.name === it.name; });
          if (si && 'score' in si) {
            return Object.assign({}, it, {
              score: si.score,
              maxScore: si.maxScore !== undefined ? si.maxScore : it.maxScore,
              deductionReason: (si.reason || '').trim(),
              hasScore: true
            });
          }
          return it;
        });
      } else if (sc) {
        // 降级：有分类得分但无子项数据时，按分类得分比例分配子项分数
        const catScore = sc.score || 0;
        const catMax = sc.maxScore || 0;
        items = items.map(function(it) {
          const itemMax = it.maxScore || 0;
          let itemScore = itemMax;
          if (catMax > 0 && itemMax > 0) {
            itemScore = Math.round(itemMax * catScore / catMax);
          }
          itemScore = Math.min(itemScore, itemMax);
          const isDeducted = itemScore < itemMax;
          return Object.assign({}, it, {
            score: itemScore,
            maxScore: itemMax,
            hasScore: true,
            deductionReason: isDeducted ? ((it.deductionTemplate || '该项未获得满分').trim()) : ''
          });
        });
      }
    }
  }
  items = items.map(function(it) {
    const base = 'hasScore' in it ? it : Object.assign({}, it, { hasScore: false });
    const isDeducted = base.hasScore && Number(base.maxScore) > 0 && Number(base.score) < Number(base.maxScore);
    return Object.assign({}, base, {
      isDeducted: isDeducted,
      deductKey: categoryName + '_' + (base.id || base.name)
    });
  });
  return items;
}

/**
 * 获取某学员某分类的所有历史评分记录
 * @param {Array} allRecords - 所有评分记录
 * @param {string} studentId - 学员ID
 * @param {string} categoryName - 分类名称
 */
function getCategoryHistoryForStudent(allRecords, studentId, categoryName) {
  const studentRecords = (allRecords || []).filter(function(r) { return r.studentId === studentId; });
  return buildCategoryTrend(studentRecords, categoryName);
}

/**
 * 计算得分率
 */
function computeRate(score, maxScore) {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

module.exports = {
  buildCategoryTrend: buildCategoryTrend,
  buildDetailItems: buildDetailItems,
  getCategoryHistoryForStudent: getCategoryHistoryForStudent,
  computeRate: computeRate
};
