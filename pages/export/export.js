const app = getApp();
const { isManagerRole, getUserInfo, getRoleLabel, normalizeInstructorLevel } = require('../../utils/roles.js');
const { generate, saveAndOpen } = require('../../utils/xmlSpreadsheet.js');

const EXPORT_CONFIG = [
  {
    key: 'students',
    label: '学员信息',
    desc: '学员基础档案、证件到期、放单状态',
    fields: [
      { key: 'name', label: '姓名', type: 'String', width: 90 },
      { key: 'roleText', label: '角色', type: 'String', width: 90 },
      { key: 'department', label: '部门', type: 'String', width: 100 },
      { key: 'team', label: '班组', type: 'String', width: 80 },
      { key: 'gender', label: '性别', type: 'String', width: 60 },
      { key: 'studentLevel', label: '学员等级', type: 'String', width: 100 },
      { key: 'responsibleInstructorName', label: '责任教员', type: 'String', width: 100 },
      { key: 'groupEntryDate', label: '入组日期', type: 'Date', width: 100 },
      { key: 'icaoDate', label: 'ICAO到期日', type: 'Date', width: 110 },
      { key: 'icaoStatus', label: 'ICAO状态', type: 'String', width: 100 },
      { key: 'medicalDate', label: '体检到期日', type: 'Date', width: 110 },
      { key: 'medicalStatus', label: '体检状态', type: 'String', width: 100 },
      { key: 'isReleased', label: '放单状态', type: 'String', width: 80 },
      { key: 'releasedAt', label: '放单日期', type: 'Date', width: 100 },
      { key: 'phone', label: '联系方式', type: 'String', width: 120 }
    ]
  },
  {
    key: 'scores',
    label: '评分记录',
    desc: '所有评估打分的历史明细',
    fields: [
      { key: 'date', label: '日期', type: 'Date', width: 100 },
      { key: 'studentName', label: '学员姓名', type: 'String', width: 90 },
      { key: 'instructorName', label: '教员姓名', type: 'String', width: 90 },
      { key: 'sectorName', label: '扇区', type: 'String', width: 120 },
      { key: 'totalScore', label: '总分', type: 'Number', width: 70 },
      { key: 'maxTotal', label: '满分', type: 'Number', width: 70 },
      { key: 'grade', label: '等级', type: 'String', width: 80 },
      { key: 'released', label: '已放单', type: 'String', width: 70 },
      { key: 'scoresDetail', label: '分类得分', type: 'String', width: 240 },
      { key: 'deductDetail', label: '扣分详情', type: 'String', width: 300 }
    ]
  },
  {
    key: 'sectors',
    label: '扇区配置',
    desc: '扇区评估标准与评分项明细',
    fields: [
      { key: 'sectorId', label: '扇区ID', type: 'String', width: 110 },
      { key: 'sectorName', label: '扇区名称', type: 'String', width: 140 },
      { key: 'totalScore', label: '总分', type: 'Number', width: 70 },
      { key: 'categoryName', label: '分类名称', type: 'String', width: 160 },
      { key: 'categoryMaxScore', label: '分类满分', type: 'Number', width: 90 },
      { key: 'itemName', label: '评分项', type: 'String', width: 200 },
      { key: 'itemMaxScore', label: '项满分', type: 'Number', width: 80 },
      { key: 'itemDescription', label: '评分标准', type: 'String', width: 300 }
    ]
  },
  {
    key: 'reminders',
    label: '到期提醒',
    desc: 'ICAO英语与体检合格证到期情况',
    fields: [
      { key: 'name', label: '姓名', type: 'String', width: 90 },
      { key: 'department', label: '部门', type: 'String', width: 100 },
      { key: 'icaoDate', label: 'ICAO到期日', type: 'Date', width: 110 },
      { key: 'icaoStatus', label: 'ICAO状态', type: 'String', width: 100 },
      { key: 'medicalDate', label: '体检到期日', type: 'Date', width: 110 },
      { key: 'medicalStatus', label: '体检状态', type: 'String', width: 100 }
    ]
  }
];

Page({
  data: {
    loading: true,
    loadError: '',
    sheets: [],
    selectedFields: {},
    allStudents: [],
    allScores: [],
    allSectors: [],
    allReminders: [],
    instructorMap: {}
  },

  onLoad() {
    const userInfo = getUserInfo();
    if (!userInfo || !isManagerRole(userInfo.role)) {
      wx.showToast({ title: '无权访问', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/radar/radar' }), 1500);
      return;
    }
    this.initSheets();
    this.loadAllData();
  },

  initSheets() {
    const selectedFields = {};
    const sheets = EXPORT_CONFIG.map((s) => {
      selectedFields[s.key] = {};
      s.fields.forEach((f) => {
        selectedFields[s.key][f.key] = true;
      });
      return {
        key: s.key,
        label: s.label,
        desc: s.desc,
        expanded: true,
        fields: s.fields.map((f) => ({ ...f, selected: true }))
      };
    });
    this.setData({ sheets, selectedFields });
  },

  async loadAllData() {
    this.setData({ loading: true, loadError: '' });
    try {
      const [usersRes, scoresRes, sectorsRes, remindersRes] = await Promise.all([
        this._req('/users'),
        this._req('/scores?limit=9999'),
        this._req('/sectors'),
        this._req('/users/reminders')
      ]);

      const allStudents = this._normalizeUsers(usersRes);
      const allScores = this._normalizeScores(scoresRes);
      const allSectors = this._normalizeSectors(sectorsRes);
      const allReminders = this._normalizeReminders(remindersRes);

      this.setData({
        allStudents,
        allScores,
        allSectors,
        allReminders,
        loading: false
      });
    } catch (e) {
      console.error('[export] loadAllData error:', e);
      this.setData({ loading: false, loadError: '数据加载失败，请重试' });
    }
  },

  _req(url) {
    return new Promise((resolve, reject) => {
      app.request({ url }).then((res) => {
        let data = res;
        if (res && res.data != null) data = res.data;
        if (data && data.items && Array.isArray(data.items)) data = data.items;
        if (!Array.isArray(data)) data = [];
        resolve(data);
      }).catch((err) => {
        console.warn('[export] req fail', url, err);
        resolve([]);
      });
    });
  },

  _normalizeUsers(users) {
    if (!Array.isArray(users)) return [];
    return users.map((u) => {
      const roleMap = {
        student: '学员', instructor: '教员', deputy_director: '副主任',
        supervisor: '主任', department_head: '科室领导', center_director: '中心主任'
      };
      let icaoStatus = '正常';
      let medicalStatus = '正常';
      if (u.icaoDate) {
        const days = Math.ceil((new Date(u.icaoDate) - Date.now()) / (86400000));
        if (days < 0) icaoStatus = '已过期';
        else if (days <= 30) icaoStatus = '即将到期';
      }
      if (u.medicalDate) {
        const days = Math.ceil((new Date(u.medicalDate) - Date.now()) / (86400000));
        if (days < 0) medicalStatus = '已过期';
        else if (days <= 30) medicalStatus = '即将到期';
      }
      return {
        name: u.name || '',
        roleText: roleMap[u.role] || u.role || '',
        department: u.department || '',
        team: u.team || '',
        gender: u.gender || '',
        studentLevel: u.studentLevel || '',
        responsibleInstructorName: u.responsibleInstructorName || '',
        groupEntryDate: u.groupEntryDate || '',
        icaoDate: u.icaoDate || u.icaoExpiry || '',
        icaoStatus,
        medicalDate: u.medicalDate || u.medicalExpiry || '',
        medicalStatus,
        isReleased: u.isReleased ? '已放单' : '未放单',
        releasedAt: u.releasedAt ? u.releasedAt.slice(0, 10) : '',
        phone: u.phone || ''
      };
    });
  },

  _normalizeScores(scores) {
    if (!Array.isArray(scores)) return [];
    return scores.map((r) => {
      const scoresArr = Array.isArray(r.scores) ? r.scores : [];
      const scoresDetail = scoresArr.map((s) => {
        const n = s.categoryName || s.name || '';
        const sc = Number(s.score || 0);
        const mx = Number(s.maxScore || 0);
        return `${n}: ${sc}/${mx}`;
      }).join(' | ');

      const deducts = Array.isArray(r.itemDetails) ? r.itemDetails : [];
      const deductDetail = deducts
        .filter((d) => Number(d.maxScore) > Number(d.score))
        .map((d) => {
          const name = d.itemName || d.name || '';
          const reason = d.reason || '';
          const val = Number(d.maxScore) - Number(d.score);
          return `${name}(-${val}${reason ? ' ' + reason : ''})`;
        }).join(' | ');

      return {
        date: r.date || '',
        studentName: r.studentName || '',
        instructorName: r.instructorName || '',
        sectorName: r.sectorName || '',
        totalScore: Number(r.totalScore) || 0,
        maxTotal: Number(r.maxTotal) || 100,
        grade: r.grade || '',
        released: r.released ? '是' : '否',
        scoresDetail,
        deductDetail
      };
    });
  },

  _normalizeSectors(sectors) {
    if (!Array.isArray(sectors)) return [];
    const rows = [];
    sectors.forEach((s) => {
      const cats = Array.isArray(s.categories) ? s.categories : [];
      if (cats.length === 0) {
        rows.push({
          sectorId: s.sectorId || '',
          sectorName: s.name || '',
          totalScore: Number(s.totalScore) || 0,
          categoryName: '',
          categoryMaxScore: '',
          itemName: '',
          itemMaxScore: '',
          itemDescription: ''
        });
        return;
      }
      cats.forEach((c) => {
        const items = Array.isArray(c.items) ? c.items : [];
        if (items.length === 0) {
          rows.push({
            sectorId: s.sectorId || '',
            sectorName: s.name || '',
            totalScore: Number(s.totalScore) || 0,
            categoryName: c.name || '',
            categoryMaxScore: Number(c.maxScore) || 0,
            itemName: '',
            itemMaxScore: '',
            itemDescription: ''
          });
          return;
        }
        items.forEach((it) => {
          rows.push({
            sectorId: s.sectorId || '',
            sectorName: s.name || '',
            totalScore: Number(s.totalScore) || 0,
            categoryName: c.name || '',
            categoryMaxScore: Number(c.maxScore) || 0,
            itemName: it.name || '',
            itemMaxScore: Number(it.maxScore) || 0,
            itemDescription: it.description || ''
          });
        });
      });
    });
    return rows;
  },

  _normalizeReminders(remindersRes) {
    let list = [];
    if (Array.isArray(remindersRes)) list = remindersRes;
    else if (remindersRes && Array.isArray(remindersRes.reminders)) list = remindersRes.reminders;
    return list.map((r) => {
      let icaoStatus = '正常';
      let medicalStatus = '正常';
      if (r.icaoDate) {
        const days = Math.ceil((new Date(r.icaoDate) - Date.now()) / (86400000));
        if (days < 0) icaoStatus = '已过期';
        else if (days <= 30) icaoStatus = '即将到期(' + days + '天)';
      }
      if (r.medicalDate) {
        const days = Math.ceil((new Date(r.medicalDate) - Date.now()) / (86400000));
        if (days < 0) medicalStatus = '已过期';
        else if (days <= 30) medicalStatus = '即将到期(' + days + '天)';
      }
      return {
        name: r.name || '',
        department: r.department || '',
        icaoDate: r.icaoDate || '',
        icaoStatus,
        medicalDate: r.medicalDate || '',
        medicalStatus
      };
    });
  },

  toggleSheet(e) {
    const { key } = e.currentTarget.dataset;
    const sheets = this.data.sheets.map((s) => {
      if (s.key === key) return { ...s, expanded: !s.expanded };
      return s;
    });
    this.setData({ sheets });
  },

  toggleField(e) {
    const { sheetKey, fieldKey } = e.currentTarget.dataset;
    const selectedFields = { ...this.data.selectedFields };
    selectedFields[sheetKey] = { ...selectedFields[sheetKey] };
    selectedFields[sheetKey][fieldKey] = !selectedFields[sheetKey][fieldKey];

    const sheets = this.data.sheets.map((s) => {
      if (s.key !== sheetKey) return s;
      return {
        ...s,
        fields: s.fields.map((f) => {
          if (f.key !== fieldKey) return f;
          return { ...f, selected: !f.selected };
        })
      };
    });
    this.setData({ selectedFields, sheets });
  },

  selectAllFields(e) {
    const { sheetKey, value } = e.currentTarget.dataset;
    const selected = value !== false && value !== 'false';
    const selectedFields = { ...this.data.selectedFields };
    selectedFields[sheetKey] = { ...selectedFields[sheetKey] };

    const sheets = this.data.sheets.map((s) => {
      if (s.key !== sheetKey) return s;
      s.fields.forEach((f) => {
        selectedFields[sheetKey][f.key] = selected;
      });
      return {
        ...s,
        fields: s.fields.map((f) => ({ ...f, selected }))
      };
    });
    this.setData({ selectedFields, sheets });
  },

  async doExport() {
    const { sheets, selectedFields, allStudents, allScores, allSectors, allReminders } = this.data;
    const activeSheets = sheets.filter((s) => {
      return s.fields.some((f) => selectedFields[s.key][f.key]);
    });
    if (activeSheets.length === 0) {
      wx.showToast({ title: '请至少选择一个字段', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成中...', mask: true });

    try {
      const xmlSheets = [];
      activeSheets.forEach((sheetConf) => {
        const cfg = EXPORT_CONFIG.find((c) => c.key === sheetConf.key);
        const activeFields = cfg.fields.filter((f) => selectedFields[sheetConf.key][f.key]);
        if (activeFields.length === 0) return;

        let dataRows = [];
        if (sheetConf.key === 'students') dataRows = allStudents;
        else if (sheetConf.key === 'scores') dataRows = allScores;
        else if (sheetConf.key === 'sectors') dataRows = allSectors;
        else if (sheetConf.key === 'reminders') dataRows = allReminders;

        const header = activeFields.map((f) => f.label);
        const headerTypes = activeFields.map((f) => f.type);
        const colWidths = activeFields.map((f) => f.width || 100);

        const rows = dataRows.map((row) => {
          return activeFields.map((f) => row[f.key]);
        });

        xmlSheets.push({
          name: cfg.label,
          header,
          headerTypes,
          rows,
          colWidths
        });
      });

      const xml = generate(xmlSheets, {
        headerColor: '#1a3a6b',
        headerFontColor: '#ffffff',
        borderColor: '#2a4a7a',
        bgPrimary: '#0d1b2a'
      });

      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      saveAndOpen(xml, `能力考核数据导出_${ts}`);
    } catch (e) {
      console.error('[export] doExport error:', e);
      wx.showToast({ title: '导出失败:' + (e.message || ''), icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onRetryLoad() {
    this.loadAllData();
  }
});
