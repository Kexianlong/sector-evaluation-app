const app = getApp();
const { isManagerRole, normalizeInstructorLevel, getUserInfo, getRoleLabel } = require('../../utils/roles.js');
const { normalizeArrayPayload, normalizeObjectPayload } = require('../../utils/api.js');

const STUDENT_LEVEL_OPTIONS = [
  '初阶一段', '初阶二段', '初阶三段',
  '中阶一段', '中阶二段', '中阶三段',
  '高阶一段', '高阶二段', '高阶三段'
];

const CHART_COLORS = ['#60a5fa', '#00d26a', '#ffaa00', '#ff4d4f', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c'];

const CACHE_TTL = 60000;
const _analysisCache = new Map();

function toPct(score, maxScore) {
  const max = Number(maxScore || 0);
  if (max <= 0) return 0;
  return (Number(score || 0) / max) * 100;
}

function getGradeClass(score) {
  if (score >= 95) return 'score-excellent';
  if (score >= 90) return 'score-good';
  if (score >= 85) return 'score-pass';
  return 'score-fail';
}

function getGradeText(score) {
  if (score >= 95) return '优秀';
  if (score >= 90) return '良好';
  if (score >= 85) return '合格';
  return '不合格';
}

function asDateStart(value) {
  if (!value) return null;
  return new Date(value + 'T00:00:00');
}

function asDateEnd(value) {
  if (!value) return null;
  return new Date(value + 'T23:59:59');
}

function getSafeWindowInfo() {
  try {
    return wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  } catch (error) {
    return { windowWidth: 375, pixelRatio: 2 };
  }
}

function ensureManager(page) {
  let userInfo = getUserInfo();
  if (!userInfo || !isManagerRole(userInfo.role)) {
    wx.showToast({ title: '无权限访问', icon: 'none' });
    setTimeout(() => wx.switchTab({ url: '/pages/overview/overview' }), 1200);
    return null;
  }
  page.setData({
    userInfo,
    roleLabel: getRoleLabel(userInfo.role),
    levelLabel: normalizeInstructorLevel(userInfo && (userInfo.instructorLevel || userInfo.level))
  });
  return userInfo;
}

function findIndicatorScore(row, indicator) {
  const scores = Array.isArray(row && row.scores) ? row.scores : [];
  return scores.find((item) => {
    if (!item) return false;
    return item.categoryId === indicator.id
      || item.id === indicator.id
      || item.categoryName === indicator.name
      || item.name === indicator.name;
  }) || null;
}

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of _analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      _analysisCache.delete(key);
    }
  }
}

function getCacheKey(filter) {
  return JSON.stringify(filter);
}

function getCachedResult(key) {
  clearExpiredCache();
  const cached = _analysisCache.get(key);
  if (cached) {
    console.log('[analysis] Cache hit for key:', key);
    return cached.data;
  }
  return null;
}

function setCachedResult(key, data) {
  clearExpiredCache();
  _analysisCache.set(key, { data, timestamp: Date.now() });
}

function calculateIndicatorAverages(rows, indicators) {
  return indicators.map((indicator) => {
    const values = rows.map((row) => {
      const hit = findIndicatorScore(row, indicator);
      return hit ? toPct(hit.score, hit.maxScore || indicator.maxScore) : 0;
    });
    const avgPct = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    return { ...indicator, avgPct, avgPctStr: avgPct.toFixed(1) };
  });
}

function calculateTrendDirection(rows, indicators) {
  if (rows.length < 2) return 'stable';
  const sorted = rows.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const avgOf = (arr) => {
    if (!arr.length) return 0;
    const vals = arr.map((row) => {
      const pcts = indicators.map((ind) => {
        const hit = findIndicatorScore(row, ind);
        return hit ? toPct(hit.score, hit.maxScore || ind.maxScore) : 0;
      });
      return pcts.length ? pcts.reduce((s, v) => s + v, 0) / pcts.length : 0;
    });
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };
  const diff = avgOf(secondHalf) - avgOf(firstHalf);
  return diff > 3 ? 'up' : (diff < -3 ? 'down' : 'stable');
}

function calculateGroupStatistics(studentSummary) {
  const groupOverall = studentSummary.length
    ? studentSummary.reduce((sum, s) => sum + s.overall, 0) / studentSummary.length
    : 0;
  const allIndicatorAverages = {};
  studentSummary.forEach((s) => {
    s.indicatorAvg.forEach((ind) => {
      if (!allIndicatorAverages[ind.id]) {
        allIndicatorAverages[ind.id] = { sum: 0, count: 0 };
      }
      allIndicatorAverages[ind.id].sum += ind.avgPct;
      allIndicatorAverages[ind.id].count++;
    });
  });
  const groupAvgByIndicator = {};
  Object.entries(allIndicatorAverages).forEach(([id, data]) => {
    groupAvgByIndicator[id] = data.sum / data.count;
  });
  return { groupOverall, groupAvgByIndicator };
}

function enrichStudentWithGaps(s, groupOverall, groupAvgByIndicator) {
  s.gapFromAvg = s.overall - groupOverall;
  s.gapFromAvgStr = (s.gapFromAvg >= 0 ? '+' : '') + s.gapFromAvg.toFixed(1);
  s.gapFromAvgClass = s.gapFromAvg >= 0 ? 'gap-positive' : 'gap-negative';
  let sortedInd = s.indicatorAvg.slice().sort((a, b) => b.avgPct - a.avgPct);
  s.strengths = sortedInd.slice(0, 2).map((ind) => ({ name: ind.name, pct: ind.avgPctStr }));
  s.weaknesses = sortedInd.slice(-2).reverse().map((ind) => ({ name: ind.name, pct: ind.avgPctStr }));
  if (s.strengths.length && s.weaknesses.length && s.strengths[0].name === s.weaknesses[0].name) {
    s.weaknesses = s.weaknesses.slice(1);
  }
  s.indicatorAvg.forEach((ind) => {
    const groupAvg = groupAvgByIndicator[ind.id] || 0;
    ind.groupAvg = groupAvg;
    ind.gap = ind.avgPct - groupAvg;
    ind.gapStr = (ind.gap >= 0 ? '+' : '') + ind.gap.toFixed(1);
    ind.gapClass = ind.gap >= 0 ? 'gap-positive' : 'gap-negative';
  });
}

function computeIndicatorOverview(indicators, filteredRecords) {
  return indicators.map((indicator) => {
    const values = filteredRecords.map((row) => {
      const hit = findIndicatorScore(row, indicator);
      return hit ? toPct(hit.score, hit.maxScore || indicator.maxScore) : 0;
    });
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const minVal = sorted.length ? sorted[0] : 0;
    const maxVal = sorted.length ? sorted[sorted.length - 1] : 0;
    const medianVal = sorted.length
      ? (sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)])
      : 0;
    return { ...indicator, avg, avgStr: avg.toFixed(1), minVal: minVal.toFixed(1), maxVal: maxVal.toFixed(1), medianVal: medianVal.toFixed(1) };
  }).sort((a, b) => b.avg - a.avg);
}

function computeLineSeries(studentSummary, filteredRecords, indicators) {
  const lineDates = Array.from(new Set(filteredRecords.map((row) => row.date))).sort();
  const lineSeries = studentSummary.map((student, index) => ({
    name: student.studentName,
    color: CHART_COLORS[index % CHART_COLORS.length],
    data: lineDates.map((date) => {
      const rows = student.rows.filter((row) => row.date === date);
      if (!rows.length) return null;
      const dateValues = rows.map((row) => {
        const values = indicators.map((indicator) => {
          const hit = findIndicatorScore(row, indicator);
          return hit ? toPct(hit.score, hit.maxScore || indicator.maxScore) : 0;
        });
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      });
      if (!dateValues.length) return null;
      return Number((dateValues.reduce((sum, value) => sum + value, 0) / dateValues.length).toFixed(1));
    })
  }));
  return { lineDates, lineSeries };
}

function computeAttentionStudents(studentSummary) {
  const result = [];
  if (!studentSummary || studentSummary.length === 0) return result;
  for (let i = 0; i < studentSummary.length; i++) {
    const s = studentSummary[i];
    if (s.trendDir === 'down' && s.rows && s.rows.length >= 3) {
      let consecutive = 0;
      const sorted = (s.rows || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      for (let j = 0; j < sorted.length - 1; j++) {
        if ((sorted[j + 1].totalScore || 0) > (sorted[j].totalScore || 0)) consecutive++;
        else break;
      }
      if (consecutive >= 2) {
        result.push({ studentId: s.studentId, studentName: s.studentName, type: 'decline', reason: '连续' + (consecutive + 1) + '次评分下降' });
      }
    }
    if (s.weaknesses && s.weaknesses.length >= 2) {
      const alreadyAdded = result.find(r => r.studentId === s.studentId);
      if (!alreadyAdded) {
        result.push({ studentId: s.studentId, studentName: s.studentName, type: 'weak', reason: s.weaknesses.length + '个维度待提升' });
      }
    }
  }
  return result.slice(0, 5);
}

Page({
  data: {
    userInfo: null, roleLabel: '', levelLabel: '',
    sectors: [], sectorNames: [], sectorIndex: 0, currentSector: '',
    phaseOptions: ['全部阶段'].concat(STUDENT_LEVEL_OPTIONS),
    phaseIndex: 0, phaseFilter: 'ALL',
    students: [], selectedStudentIds: [], selectedStudentNames: [],
    indicatorOptions: [], selectedIndicators: [], selectedIndicatorNames: [],
    startDate: '', endDate: '',
    chartType: 'bar', compareView: 'student',
    records: [], analysisRows: [], indicatorOverview: [],
    summaryStats: { groupAvg: '0.0', highest: '0.0', lowest: '0.0', studentCount: 0, recordCount: 0 },
    attentionStudents: [], lineDates: [], lineSeries: [], legendItems: [],
    loading: true, loadError: '', canvasHeight: 300,
    tooltip: { show: false, x: 0, y: 0, text: '' },
    showStudentPicker: false, pickerStudents: [],
    showIndicatorPicker: false, pickerIndicators: [],
    selectedIndicator: null
  },
  _drawing: false, _chartGeometry: null, _refreshing: false, _launchTime: 0,

  async onLoad() {
    const userInfo = ensureManager(this);
    if (!userInfo) return;
    const windowInfo = getSafeWindowInfo();
    const canvasHeight = Math.round(Math.min(windowInfo.windowWidth || 375, 480) * 0.78);
    this.setData({ canvasHeight });
    await this.bootstrap();
    this._launchTime = Date.now();
  },

  async bootstrap() {
    this.setData({ loading: true, loadError: '' });
    try {
      await this.loadStudents();
      await this.loadSectors();
      if (this.data.currentSector) await this.loadSectorDetail(this.data.currentSector);
      await this.loadRecords();
    } catch (error) {
      this.setData({ loading: false, loadError: error && error.message ? error.message : '分析数据加载失败' });
    }
  },

  onShow() {
    if (this._refreshing) return;
    if (this._launchTime && Date.now() - this._launchTime < 2000) return;
    this._refreshing = true;
    this.loadSectors().then(() => {
      if (this.data.currentSector) return this.loadSectorDetail(this.data.currentSector);
    }).then(() => this.loadRecords()).catch(() => {}).finally(() => { this._refreshing = false; });
  },

  async loadStudents() {
    const res = await app.request({ url: '/users/students' });
    const list = normalizeArrayPayload(res).map(function(item) {
      const o = Object.assign({}, item);
      o.name = item.name || item.username || item.userId;
      o.studentLevel = item.studentLevel || item.level || '未设置阶段';
      return o;
    });
    const selectedStudentIds = list.map((item) => item.userId);
    const selectedStudentNames = list.map((item) => item.name);
    this.setData({ students: list, selectedStudentIds, selectedStudentNames });
  },

  async loadSectors() {
    try {
      const res = await app.request({ url: '/sectors' });
      const list = normalizeArrayPayload(res).map((item) => ({
        sectorId: item.sectorId || item.id,
        name: item.name || item.sectorId || item.id
      })).filter((item) => item.sectorId);
      if (list.length > 0) {
        this.setData({ sectors: list, sectorNames: list.map((item) => item.name), sectorIndex: 0, currentSector: list[0].sectorId });
        return;
      }
    } catch (e) { console.log('[analysis] 扇区列表加载失败', e); }
    this.setData({ sectors: [], sectorNames: [], sectorIndex: 0, currentSector: '' });
  },

  async loadSectorDetail(sectorId) {
    if (!sectorId) { this.setData({ indicatorOptions: [], selectedIndicators: [], selectedIndicatorNames: [] }); return; }
    try {
      const res = await app.request({ url: '/sectors/' + sectorId });
      const detail = normalizeObjectPayload(res);
      const indicatorOptions = (((detail && detail.categories) || []).map((item) => ({
        id: item.id || item.name, name: item.name || item.id, maxScore: Number(item.maxScore || 0)
      }))).filter((item) => item.id);
      const allowed = new Set(indicatorOptions.map((item) => item.id));
      const selectedIndicators = this.data.selectedIndicators.filter((id) => allowed.has(id));
      const selectedIndicatorNames = indicatorOptions.filter((item) => selectedIndicators.includes(item.id)).map((item) => item.name);
      this.setData({ indicatorOptions, selectedIndicators, selectedIndicatorNames });
    } catch (error) {
      console.log('[analysis] 扇区详情加载失败', error);
      this.setData({ indicatorOptions: [], selectedIndicators: [], selectedIndicatorNames: [] });
    }
  },

  async loadRecords() {
    const selectedIds = this.data.selectedStudentIds.length ? this.data.selectedStudentIds : this.data.students.map((item) => item.userId);
    if (!selectedIds.length || !this.data.currentSector) {
      this.setData({ records: [], analysisRows: [], indicatorOverview: [], lineDates: [], lineSeries: [], legendItems: [], loading: false });
      return;
    }
    this.setData({ loading: true, loadError: '' });
    try {
      const studentMap = new Map(this.data.students.map((item) => [item.userId, item]));
      const allRows = await Promise.all(selectedIds.map(async (studentId) => {
        const res = await app.request({ url: '/trends/student/' + studentId, data: { sectorId: this.data.currentSector } });
        return normalizeArrayPayload(res).map((row) => {
          const student = studentMap.get(studentId) || {};
          const _r = Object.assign({}, row);
          _r.studentId = studentId;
          _r.studentName = student.name || row.studentName || studentId;
          _r.studentLevel = student.studentLevel || row.studentLevel || '未设置阶段';
          return _r;
        });
      }));
      const records = allRows.flat().filter((row) => row && row.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.setData({ records, loading: false }, () => { this.computeAnalysis(); });
    } catch (error) {
      this.setData({ records: [], loading: false, loadError: error && error.message ? error.message : '分析数据加载失败' }, () => { this.computeAnalysis(); });
    }
  },

  getEffectiveIndicators() {
    if (!this.data.selectedIndicators.length) return this.data.indicatorOptions;
    const selected = new Set(this.data.selectedIndicators);
    return this.data.indicatorOptions.filter((item) => selected.has(item.id));
  },

  getVisibleStudents() {
    const selected = new Set(this.data.selectedStudentIds);
    const phaseFilter = this.data.phaseFilter;
    return this.data.students.filter((item) => {
      if (!selected.has(item.userId)) return false;
      if (phaseFilter === 'ALL') return true;
      return (item.studentLevel || '未设置阶段') === phaseFilter;
    });
  },

  getFilteredRecords(visibleStudents) {
    const visibleIds = new Set(visibleStudents.map((item) => item.userId));
    const startDate = asDateStart(this.data.startDate);
    const endDate = asDateEnd(this.data.endDate);
    return this.data.records.filter((record) => {
      if (!visibleIds.has(record.studentId)) return false;
      const value = record && record.date ? new Date(record.date + 'T12:00:00') : null;
      if (!value) return false;
      if (startDate && value < startDate) return false;
      if (endDate && value > endDate) return false;
      return true;
    });
  },

  computeAnalysis() {
    const startTime = Date.now();
    const effectiveIndicators = this.getEffectiveIndicators();
    const visibleStudents = this.getVisibleStudents();
    const filteredRecords = this.getFilteredRecords(visibleStudents);
    
    const cacheKey = getCacheKey({
      indicators: effectiveIndicators.map(i => i.id),
      students: visibleStudents.map(s => s.userId),
      records: filteredRecords.map(r => r.studentId + '_' + r.date)
    });
    
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      this.setData(cachedResult, () => {
        if (cachedResult.analysisRows.length || cachedResult.indicatorOverview.length || cachedResult.lineSeries.length) {
          this.drawChart();
        } else {
          this._chartGeometry = null;
        }
      });
      return;
    }

    const grouped = new Map();
    filteredRecords.forEach((record) => {
      if (!grouped.has(record.studentId)) {
        grouped.set(record.studentId, { studentId: record.studentId, studentName: record.studentName || record.studentId, studentLevel: record.studentLevel || '未设置阶段', rows: [] });
      }
      grouped.get(record.studentId).rows.push(record);
    });

    let studentSummary = Array.from(grouped.values()).map((bucket) => {
      const indicatorAvg = calculateIndicatorAverages(bucket.rows, effectiveIndicators);
      const overall = indicatorAvg.length ? indicatorAvg.reduce((sum, item) => sum + item.avgPct, 0) / indicatorAvg.length : 0;
      const trendDir = calculateTrendDirection(bucket.rows, effectiveIndicators);
      return { ...bucket, indicatorAvg, overall, overallStr: overall.toFixed(1), overallClass: getGradeClass(overall), gradeText: getGradeText(overall), trendDir };
    });

    studentSummary.sort((a, b) => b.overall - a.overall);
    studentSummary.forEach((item, index) => { item.rank = index + 1; });

    const { groupOverall, groupAvgByIndicator } = calculateGroupStatistics(studentSummary);
    studentSummary.forEach((s) => { enrichStudentWithGaps(s, groupOverall, groupAvgByIndicator); });

    let indicatorOverview = computeIndicatorOverview(effectiveIndicators, filteredRecords);
    indicatorOverview.forEach((ind) => {
      ind.studentGaps = studentSummary.map((stu) => {
        const hit = stu.indicatorAvg.find((x) => x.id === ind.id);
        const val = hit ? hit.avgPct : 0;
        const gap = val - ind.avg;
        return { studentId: stu.studentId, studentName: stu.studentName, val, valStr: val.toFixed(1), gap, gapStr: (gap >= 0 ? '+' : '') + gap.toFixed(1), gapClass: gap >= 0 ? 'gap-positive' : 'gap-negative' };
      });
    });

    const { lineDates, lineSeries } = computeLineSeries(studentSummary, filteredRecords, effectiveIndicators);
    let highestVal = studentSummary.length ? parseFloat(studentSummary[0].overallStr) || 0 : 0;
    let lowestVal = studentSummary.length ? parseFloat(studentSummary[studentSummary.length - 1].overallStr) || 0 : 0;
    let summaryStats = {
      groupAvg: groupOverall.toFixed(1),
      highest: studentSummary.length ? studentSummary[0].overallStr : '0.0',
      lowest: studentSummary.length ? studentSummary[studentSummary.length - 1].overallStr : '0.0',
      range: (highestVal - lowestVal >= 0 ? (highestVal - lowestVal).toFixed(1) : '0.0'),
      studentCount: studentSummary.length,
      recordCount: filteredRecords.length
    };

    let nextChartType = this.data.chartType;
    let nextError = this.data.loadError;
    if (nextChartType === 'radar') {
      const dimensionCount = this.data.compareView === 'student' ? effectiveIndicators.length : studentSummary.length;
      if (dimensionCount < 3) { nextChartType = 'bar'; nextError = '雷达图至少需要 3 个维度，已自动切换为柱形图'; }
    }

    const legendItems = this.computeLegendItems(nextChartType, this.data.compareView, studentSummary, indicatorOverview, lineSeries);
    const attentionStudents = computeAttentionStudents(studentSummary);

    const resultData = {
      analysisRows: studentSummary, indicatorOverview, summaryStats, attentionStudents,
      lineDates, lineSeries, legendItems, chartType: nextChartType,
      loadError: filteredRecords.length ? nextError : this.data.loadError
    };

    setCachedResult(cacheKey, resultData);
    console.log('[analysis] computeAnalysis completed in', Date.now() - startTime, 'ms');

    this.setData(resultData, () => {
      if (studentSummary.length || indicatorOverview.length || lineSeries.length) {
        this.drawChart();
      } else {
        this._chartGeometry = null;
      }
    });
  },

  computeLegendItems(chartType, compareView, studentSummary, indicatorOverview, lineSeries) {
    if (chartType === 'line') return lineSeries.map((item) => ({ name: item.name, color: item.color }));
    if (chartType === 'bar') return [{ name: compareView === 'student' ? '学员综合均值' : '指标平均得分率', color: compareView === 'student' ? '#60a5fa' : '#00d26a' }];
    if (chartType === 'pie') {
      const items = compareView === 'student' ? studentSummary : indicatorOverview;
      return items.map((item, index) => ({ name: compareView === 'student' ? item.studentName : item.name, color: CHART_COLORS[index % CHART_COLORS.length] }));
    }
    if (compareView === 'student') return studentSummary.map((item, index) => ({ name: item.studentName, color: CHART_COLORS[index % CHART_COLORS.length] }));
    return indicatorOverview.map((item, index) => ({ name: item.name, color: CHART_COLORS[index % CHART_COLORS.length] }));
  },

  onSectorChange(e) {
    const sectorIndex = Number(e.detail.value || 0);
    const sector = this.data.sectors[sectorIndex];
    if (!sector) return;
    this.setData({ sectorIndex, currentSector: sector.sectorId, loadError: '' }, async () => {
      await this.loadSectorDetail(sector.sectorId);
      await this.loadRecords();
    });
  },

  onSectorTabTap(e) {
    const sectorIndex = Number(e.currentTarget.dataset.index || 0);
    const sector = this.data.sectors[sectorIndex];
    if (!sector) return;
    this.setData({ sectorIndex, currentSector: sector.sectorId, loadError: '' }, async () => {
      await this.loadSectorDetail(sector.sectorId);
      await this.loadRecords();
    });
  },

  onPhaseChange(e) {
    const phaseIndex = Number(e.detail.value || 0);
    const phaseFilter = phaseIndex === 0 ? 'ALL' : this.data.phaseOptions[phaseIndex];
    this.setData({ phaseIndex, phaseFilter }, () => this.computeAnalysis());
  },

  onStartDateChange(e) { this.setData({ startDate: e.detail.value }, () => this.computeAnalysis()); },
  onEndDateChange(e) { this.setData({ endDate: e.detail.value }, () => this.computeAnalysis()); },

  switchChartType(e) {
    const chartType = e.currentTarget.dataset.type;
    if (!chartType || chartType === this.data.chartType) return;
    this.setData({ chartType }, () => this.computeAnalysis());
  },

  switchCompareView(e) {
    const compareView = e.currentTarget.dataset.view;
    if (!compareView || compareView === this.data.compareView) return;
    this.setData({ compareView }, () => this.computeAnalysis());
  },

  openStudentPicker() {
    const selected = new Set(this.data.selectedStudentIds);
    const pickerStudents = this.data.students.map(function(item) { const o = Object.assign({}, item); o.checked = selected.has(item.userId); return o; });
    this.setData({ pickerStudents, showStudentPicker: true });
  },

  closeStudentPicker() { this.setData({ showStudentPicker: false }); },

  toggleStudentSelection(e) {
    const userId = e.currentTarget.dataset.id;
    const pickerStudents = this.data.pickerStudents.map((item) => (item.userId === userId ? Object.assign({}, item, { checked: !item.checked }) : item));
    this.setData({ pickerStudents });
  },

  confirmStudentSelection() {
    const selected = this.data.pickerStudents.filter((item) => item.checked);
    if (!selected.length) { wx.showToast({ title: '至少选择 1 名学员', icon: 'none' }); return; }
    this.setData({ selectedStudentIds: selected.map((item) => item.userId), selectedStudentNames: selected.map((item) => item.name), showStudentPicker: false }, () => { this.loadRecords(); });
  },

  removeStudent(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selectedStudentIds = this.data.selectedStudentIds.slice();
    const selectedStudentNames = this.data.selectedStudentNames.slice();
    selectedStudentIds.splice(index, 1);
    selectedStudentNames.splice(index, 1);
    if (!selectedStudentIds.length) { wx.showToast({ title: '至少保留 1 名学员', icon: 'none' }); return; }
    this.setData({ selectedStudentIds, selectedStudentNames }, () => { this.loadRecords(); });
  },

  openIndicatorPicker() {
    const selected = new Set(this.data.selectedIndicators);
    const pickerIndicators = this.data.indicatorOptions.map(function(item) { const o = Object.assign({}, item); o.checked = selected.has(item.id); return o; });
    this.setData({ pickerIndicators, showIndicatorPicker: true });
  },

  closeIndicatorPicker() { this.setData({ showIndicatorPicker: false }); },

  toggleIndicatorSelection(e) {
    const id = e.currentTarget.dataset.id;
    const pickerIndicators = this.data.pickerIndicators.map((item) => (item.id === id ? Object.assign({}, item, { checked: !item.checked }) : item));
    this.setData({ pickerIndicators });
  },

  confirmIndicatorSelection() {
    const selected = this.data.pickerIndicators.filter((item) => item.checked);
    this.setData({ selectedIndicators: selected.map((item) => item.id), selectedIndicatorNames: selected.map((item) => item.name), showIndicatorPicker: false }, () => this.computeAnalysis());
  },

  removeIndicator(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selectedIndicators = this.data.selectedIndicators.slice();
    const selectedIndicatorNames = this.data.selectedIndicatorNames.slice();
    selectedIndicators.splice(index, 1);
    selectedIndicatorNames.splice(index, 1);
    this.setData({ selectedIndicators, selectedIndicatorNames }, () => this.computeAnalysis());
  },

  preventClose() {},
  onRetryLoad() { this.loadRecords(); },

  goToStudentProfile(e) {
    const studentId = e.currentTarget.dataset.id;
    if (studentId) { wx.navigateTo({ url: '/pages/student-profile/student-profile?studentId=' + studentId }); }
  },

  drawChart(retryCount) {
    if (this._drawing) return;
    const chartType = this.data.chartType;
    const compareView = this.data.compareView;
    const analysisRows = this.data.analysisRows;
    const indicatorOverview = this.data.indicatorOverview;
    const lineDates = this.data.lineDates;
    const lineSeries = this.data.lineSeries;
    const effectiveIndicators = this.getEffectiveIndicators();
    const hasData = chartType === 'line' ? (lineDates.length > 0 && lineSeries.length > 0) : (analysisRows.length > 0 || indicatorOverview.length > 0);
    if (!hasData) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('#analysisChartCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        const retries = retryCount === undefined ? 0 : retryCount;
        if (retries < 5) { setTimeout(() => this.drawChart(retries + 1), 200); }
        return;
      }
      this._drawing = true;
      const draw = () => {
        try {
          this.doDrawChart(res[0], { chartType, compareView, analysisRows, indicatorOverview, lineDates, lineSeries, effectiveIndicators });
        } catch (e) { console.error('[analysis] drawChart error', e); } finally { this._drawing = false; }
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(draw);
      else draw();
    });
  },

  doDrawChart(canvasRes, chartData) {
    const canvas = canvasRes.node;
    const ctx = canvas.getContext('2d');
    const windowInfo = getSafeWindowInfo();
    const dpr = windowInfo.pixelRatio || 2;
    const width = canvasRes.width;
    const height = canvasRes.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const { chartType, compareView, analysisRows, indicatorOverview, lineDates, lineSeries, effectiveIndicators } = chartData;
    this._chartGeometry = { width, height, type: chartType };

    if (chartType === 'line') { this.drawLineChart(ctx, width, height, lineDates, lineSeries); return; }
    if (chartType === 'pie') {
      const labels = compareView === 'student' ? analysisRows.map((item) => item.studentName) : indicatorOverview.map((item) => item.name);
      const values = compareView === 'student' ? analysisRows.map((item) => Number(item.overall.toFixed(1))) : indicatorOverview.map((item) => Number(item.avg.toFixed(1)));
      this.drawPieChart(ctx, width, height, labels, values); return;
    }
    if (chartType === 'radar') {
      const axes = compareView === 'student' ? effectiveIndicators.map((item) => item.name) : analysisRows.map((item) => item.studentName);
      const radarSeries = compareView === 'student'
        ? analysisRows.map((item, index) => ({ name: item.studentName, color: CHART_COLORS[index % CHART_COLORS.length], values: effectiveIndicators.map((indicator) => { const hit = item.indicatorAvg.find((entry) => entry.id === indicator.id); return Number(((hit && hit.avgPct) || 0).toFixed(1)); }) }))
        : indicatorOverview.map((item, index) => ({ name: item.name, color: CHART_COLORS[index % CHART_COLORS.length], values: analysisRows.map((student) => { const hit = student.indicatorAvg.find((entry) => entry.id === item.id); return Number(((hit && hit.avgPct) || 0).toFixed(1)); }) }));
      if (!axes.length || !radarSeries.length) return;
      this.drawRadarChart(ctx, width, height, axes, radarSeries); return;
    }

    const labels = compareView === 'student' ? analysisRows.map((item) => item.studentName) : indicatorOverview.map((item) => item.name);
    const values = compareView === 'student' ? analysisRows.map((item) => Number(item.overall.toFixed(1))) : indicatorOverview.map((item) => Number(item.avg.toFixed(1)));
    const color = compareView === 'student' ? '#60a5fa' : '#00d26a';
    this.drawBarChart(ctx, width, height, labels, values, color);
  },

  drawBarChart(ctx, width, height, labels, values, color) {
    const padding = { top: 24, right: 10, bottom: 44, left: 36 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const groupWidth = labels.length ? chartWidth / labels.length : chartWidth;
    const barWidth = Math.min(32, groupWidth * 0.56);
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
    ctx.fillStyle = '#4a5d75';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i += 1) {
      const y = padding.top + chartHeight * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(String(i * 20), padding.left - 5, y + 3);
    }
    labels.forEach((label, index) => {
      const value = values[index] || 0;
      const barHeight = chartHeight * (value / 100);
      const x = padding.left + index * groupWidth + (groupWidth - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;
      ctx.fillStyle = color + '66';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#e8ecf1';
      ctx.textAlign = 'center';
      ctx.fillText(value.toFixed(0), x + (barWidth / 2), y - 4);
      ctx.fillStyle = '#8a9bb0';
      ctx.fillText(label.length > 4 ? label.slice(0, 4) : label, x + (barWidth / 2), height - padding.bottom + 14);
    });
    const _cg = this._chartGeometry || {};
    this._chartGeometry = Object.assign({}, _cg);
    this._chartGeometry.padding = padding;
    this._chartGeometry.labels = labels;
    this._chartGeometry.values = values;
    this._chartGeometry.groupWidth = groupWidth;
  },

  drawPieChart(ctx, width, height, labels, values) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 30;
    const total = values.reduce((sum, value) => sum + value, 0);
    let startAngle = -Math.PI / 2;
    const arcs = [];
    if (!total) return;
    values.forEach((value, index) => {
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const color = CHART_COLORS[index % CHART_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color + 'cc';
      ctx.fill();
      ctx.strokeStyle = '#0a1628';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (angle > 0.18) {
        const midAngle = startAngle + angle / 2;
        const tx = cx + Math.cos(midAngle) * radius * 0.62;
        const ty = cy + Math.sin(midAngle) * radius * 0.62;
        ctx.fillStyle = '#e8ecf1';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(0) + '%', tx, ty);
      }
      arcs.push({ label: labels[index], value, startAngle, endAngle, color });
      startAngle = endAngle;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#132238';
    ctx.fill();
    const _cg2 = this._chartGeometry || {};
    this._chartGeometry = Object.assign({}, _cg2);
    this._chartGeometry.cx = cx;
    this._chartGeometry.cy = cy;
    this._chartGeometry.radius = radius;
    this._chartGeometry.arcs = arcs;
  },

  drawLineChart(ctx, width, height, dates, series) {
    const padding = { top: 24, right: 10, bottom: 40, left: 36 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const xStep = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth;
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
    ctx.fillStyle = '#4a5d75';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i += 1) {
      const y = padding.top + chartHeight * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(String(i * 20), padding.left - 5, y + 3);
    }
    ctx.fillStyle = '#8a9bb0';
    ctx.textAlign = 'center';
    dates.forEach((label, index) => {
      const x = padding.left + index * xStep;
      ctx.fillText(label.slice(5), x, height - padding.bottom + 14);
    });
    series.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2;
      let first = true;
      line.data.forEach((value, index) => {
        if (value === null || value === undefined) { first = true; return; }
        const x = padding.left + index * xStep;
        const y = padding.top + chartHeight * (1 - value / 100);
        if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
      line.data.forEach((value, index) => {
        if (value === null || value === undefined) return;
        const x = padding.left + index * xStep;
        const y = padding.top + chartHeight * (1 - value / 100);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = line.color;
        ctx.fill();
      });
    });
  },

  onShareAppMessage() {
    return { title: '扇区能力评估 - 数据分析', path: '/pages/analysis/analysis' };
  },

  onCanvasTouch(e) {
    const geom = this._chartGeometry;
    if (!geom || !geom.padding || !geom.labels || !geom.values) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const query = wx.createSelectorQuery().in(this);
    query.select('#analysisChartCanvas').boundingClientRect((rect) => {
      if (!rect) return;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      if (geom.type === 'bar') {
        const padding = geom.padding;
        const groupWidth = geom.groupWidth;
        for (let i = 0; i < geom.labels.length; i++) {
          const label = geom.labels[i];
          const value = geom.values[i];
          const barX = padding.left + i * groupWidth;
          const barWidth = Math.min(32, groupWidth * 0.56);
          if (x >= barX && x <= barX + barWidth && y >= padding.top && y <= padding.top + (padding.bottom - padding.top)) {
            this.showIndicatorDetail(i, value); return;
          }
        }
      }
    }).exec();
  },

  showIndicatorDetail(index, value) {
    const chartType = this.data.chartType;
    const compareView = this.data.compareView;
    let indicatorId, indicatorName, indicatorDescription, maxScore, groupAvg;
    if (compareView === 'indicator' && this.data.indicatorOverview[index]) {
      const item = this.data.indicatorOverview[index];
      indicatorId = item.id; indicatorName = item.name; indicatorDescription = item.description || ''; maxScore = item.maxScore || 0; groupAvg = parseFloat(item.avgStr) || 0;
    } else if (compareView === 'student' && this.data.analysisRows[index]) {
      const student = this.data.analysisRows[index];
      const effectiveIndicators = this.getEffectiveIndicators();
      const mainIndicator = effectiveIndicators[index] || effectiveIndicators[0] || {};
      indicatorId = mainIndicator.id; indicatorName = mainIndicator.name || student.studentName; indicatorDescription = mainIndicator.description || ('学员 ' + student.studentName + ' 的综合得分'); maxScore = mainIndicator.maxScore || 100; groupAvg = parseFloat(student.overallStr) || 0;
    } else { return; }
    const effectiveIndicators = this.getEffectiveIndicators();
    const indicator = effectiveIndicators.find(ind => ind.id === indicatorId) || {};
    indicatorDescription = indicatorDescription || indicator.description || '';
    maxScore = maxScore || indicator.maxScore || 0;
    const records = this.data.records.filter(r => {
      if (compareView === 'student') { return this.data.analysisRows[index] && r.studentId === this.data.analysisRows[index].studentId; }
      else { return r.scores && r.scores.some(s => s.categoryId === indicatorId || s.id === indicatorId); }
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    const history = records.slice(-10).map((record, idx) => {
      let scoreValue = 0;
      if (compareView === 'student') { const studentScore = record.scores && record.scores.find(s => s.categoryId === indicatorId || s.id === indicatorId); scoreValue = studentScore ? toPct(studentScore.score, studentScore.maxScore || maxScore) : 0; }
      else { scoreValue = toPct(record.totalScore, 100); }
      const color = scoreValue >= 90 ? '#00d26a' : (scoreValue >= 75 ? '#ffaa00' : '#60a5fa');
      return { date: record.date, dateStr: record.date ? record.date.slice(5) : '', value: Math.round(scoreValue), height: Math.max(4, scoreValue), color };
    });
    const compareValue = compareView === 'student' ? this.data.analysisRows[index] : this.data.analysisRows.find(s => s.indicatorAvg && s.indicatorAvg.some(ind => ind.id === indicatorId));
    const currentColor = compareValue ? (compareView === 'student' ? '#60a5fa' : '#00d26a') : '#8a9bb0';
    this.setData({ selectedIndicator: { id: indicatorId, name: indicatorName, description: indicatorDescription, maxScore, value: Math.round(value || 0), groupAvg: groupAvg.toFixed(1), history, color: currentColor } });
    if (this._chartGeometry) { this._chartGeometry.selectedIndex = index; }
  },

  clearIndicatorSelection() {
    this.setData({ selectedIndicator: null });
    if (this._chartGeometry) { this._chartGeometry.selectedIndex = null; }
  }
});