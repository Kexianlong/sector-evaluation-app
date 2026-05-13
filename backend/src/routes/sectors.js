import express from 'express';
import { Sector } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const sectors = await Sector.findAll();
    res.status(200).json({ success: true, data: sectors, message: '获取扇区配置成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取扇区配置失败: ' + error.message });
  }
});

router.get('/:sectorId', verifyToken, async (req, res) => {
  try {
    const { sectorId } = req.params;
    const sector = await Sector.findById(sectorId);
    if (!sector) {
      return res.status(404).json({ success: false, message: '扇区配置不存在' });
    }
    res.status(200).json({ success: true, data: sector, message: '获取扇区详情成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取扇区详情失败: ' + error.message });
  }
});

router.post('/', verifyToken, requireRole(['deputy_director', 'department_head', 'supervisor', 'center_director']), async (req, res) => {
  try {
    const { sectorId, name, totalScore, categories } = req.body;
    if (!sectorId || !name) {
      return res.status(400).json({ success: false, message: '扇区ID和名称不能为空' });
    }
    const existing = await Sector.findById(sectorId);
    if (existing) {
      return res.status(409).json({ success: false, message: '扇区ID已存在' });
    }
    const sector = await Sector.create({ sectorId, name, totalScore: totalScore || 0, categories: categories || [] });
    res.status(201).json({ success: true, data: sector, message: '扇区创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建扇区失败: ' + error.message });
  }
});

router.put('/:sectorId', verifyToken, requireRole(['deputy_director', 'department_head', 'supervisor', 'center_director']), async (req, res) => {
  try {
    const { sectorId } = req.params;
    const existing = await Sector.findById(sectorId);
    if (!existing) {
      return res.status(404).json({ success: false, message: '扇区配置不存在' });
    }
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.totalScore !== undefined) updateData.totalScore = req.body.totalScore;
    if (req.body.categories) updateData.categories = req.body.categories;
    if (Object.keys(updateData).length > 0) {
      await Sector.update(sectorId, updateData);
    }
    const updated = await Sector.findById(sectorId);
    res.status(200).json({ success: true, data: updated, message: '扇区更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新扇区失败: ' + error.message });
  }
});

router.delete('/:sectorId', verifyToken, requireRole(['deputy_director', 'department_head', 'supervisor', 'center_director']), async (req, res) => {
  try {
    const { sectorId } = req.params;
    const existing = await Sector.findById(sectorId);
    if (!existing) {
      return res.status(404).json({ success: false, message: '扇区配置不存在' });
    }
    await Sector.delete(sectorId);
    res.status(200).json({ success: true, message: '扇区已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除扇区失败: ' + error.message });
  }
});

function getXlsxBuffer(req) {
  if (req.body && req.body.fileBase64) {
    try {
      const b = Buffer.from(req.body.fileBase64, 'base64');
      if (b && b.length > 0) {
        const filename = req.body.filename || 'upload.xlsx';
        const ext = filename.toLowerCase();
        if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
          return { error: '仅支持 .xlsx 或 .xls 格式的 Excel 文件' };
        }
        return { buffer: b, filename };
      }
    } catch (e) {
      return { error: 'Base64 解码失败: ' + e.message };
    }
  }
  return { error: '请提供 Excel 文件的 Base64 数据 (字段: fileBase64, 文件名: filename)' };
}

router.post('/parse', verifyToken, requireRole(['deputy_director', 'department_head', 'supervisor', 'center_director']), async (req, res) => {
  try {
    const xf = getXlsxBuffer(req);
    if (xf.error) {
      return res.status(400).json({ success: false, message: xf.error });
    }
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(xf.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'Excel文件没有可用工作表' });
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
    const parsed = parseSectorExcelFromRows(rows, xf.filename);
    const existing = await Sector.findById(parsed.sectorId);
    res.status(200).json({
      success: true,
      data: { sector: parsed, exists: !!existing },
      message: '解析成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Excel解析失败: ' + error.message });
  }
});

router.post('/upload', verifyToken, requireRole(['deputy_director', 'department_head', 'supervisor', 'center_director']), async (req, res) => {
  try {
    const overwrite = req.query.overwrite === 'true' || req.body.overwrite === true;

    const xf = getXlsxBuffer(req);
    if (!xf.error) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(xf.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, message: 'Excel文件没有可用工作表' });
      }
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
      const parsed = parseSectorExcelFromRows(rows, xf.filename);

      const existing = await Sector.findById(parsed.sectorId);
      if (existing && !overwrite) {
        return res.status(409).json({
          success: false,
          data: { sectorId: parsed.sectorId, name: parsed.name },
          message: '扇区已存在'
        });
      }

      const result = await Sector.upsert({ sectorId: parsed.sectorId, name: parsed.name, totalScore: parsed.totalScore, categories: parsed.categories });
      res.status(200).json({
        success: true,
        data: { created: result.created, parsed: { sectorId: parsed.sectorId, name: parsed.name, totalScore: parsed.totalScore, categoryCount: parsed.categories.length, itemCount: parsed.categories.reduce((s, c) => s + c.items.length, 0) } },
        message: result.created ? '扇区创建成功' : '扇区已更新'
      });
    } else {
      // JSON 扇区数据（非 Excel 文件上传）
      const { sectorId, name, totalScore, categories } = req.body;
      if (!sectorId || !name) {
        return res.status(400).json({ success: false, message: '请提供扇区JSON数据或Excel文件Base64数据' });
      }
      const existing = await Sector.findById(sectorId);
      if (existing && !overwrite) {
        return res.status(409).json({ success: false, data: { sectorId, name }, message: '扇区已存在' });
      }
      const result = await Sector.upsert({ sectorId, name, totalScore: totalScore || 0, categories: categories || [] });
      res.status(200).json({
        success: true,
        data: { created: result.created, parsed: { sectorId, name, totalScore: totalScore || 0 } },
        message: result.created ? '扇区创建成功' : '扇区已更新'
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: '上传失败: ' + error.message });
  }
});

function parseSectorExcelFromRows(rows, filename) {
  function inferSectorId(name) {
    var lower = (name || '').toLowerCase();
    if (lower.indexOf('acc02') >= 0 || lower.indexOf('acc32') >= 0) return 'ACC02_32';
    if (lower.indexOf('acc08') >= 0) return 'ACC08';
    if (lower.indexOf('acc18') >= 0 || lower.indexOf('acc28') >= 0) return 'ACC18_28';
    return null;
  }
  function extractCategoryScores(name) {
    var m = (name || '').match(/[（(](\d+)分\s*\/\s*(\d+)分[)）]/);
    if (m) return { maxScore: parseInt(m[1]), minScore: parseInt(m[2]) };
    var m2 = (name || '').match(/[（(](\d+)分[)）]/);
    if (m2) return { maxScore: parseInt(m2[1]), minScore: 0 };
    return { maxScore: 0, minScore: 0 };
  }
  function extractItemScore(desc) {
    if (!desc) return 0;
    var m = (desc || '').match(/[（(](\d+)\s*[\u2018\u2019'分][)）]/);
    if (m) return parseInt(m[1]);
    return 0;
  }
  function cleanName(name) {
    if (!name) return '';
    return name.replace(/[（(]\d+分\/\d+分[)）]/g, '').replace(/[（(]\d+\s*['分][)）].*$/g, '').trim();
  }

  if (rows.length < 3) throw new Error('Excel 文件内容不足');
  var sectorTitle = String(rows[0][0] || '').trim();
  if (!sectorTitle) throw new Error('无法识别扇区标题');
  var sectorName = sectorTitle.replace(/能力评估标准/g, '').trim();
  var sectorId = inferSectorId(sectorTitle) || inferSectorId(filename) || ('SECTOR_' + Date.now());
  var categories = [];
  var currentCategory = null;
  var itemIndex = 0;
  var catIndex = 0;
  for (var i = 2; i < rows.length; i++) {
    var row = rows[i];
    var colA = row[0] != null ? String(row[0]).trim() : null;
    var colB = row[1] != null ? String(row[1]).trim() : null;
    if (!colA && !colB) continue;
    if (colA && /^(总分|注意|备注|评分说明)/.test(colA)) continue;
    if (colA) {
      catIndex++;
      var sc = extractCategoryScores(colA);
      currentCategory = { id: 'c' + catIndex, name: cleanName(colA), maxScore: sc.maxScore, minScore: sc.minScore, items: [] };
      categories.push(currentCategory);
    }
    if (colB && currentCategory) {
      itemIndex++;
      currentCategory.items.push({ id: 'i' + itemIndex, name: cleanName(colB), maxScore: extractItemScore(colB), description: colB, deductionReason: cleanName(colB) });
    }
  }
  categories = categories.filter(function(c) { return c.maxScore > 0 || c.items.length > 0; });
  var totalScore = 0;
  for (var k = 0; k < categories.length; k++) {
    totalScore += categories[k].maxScore;
    categories[k].id = 'c' + (k + 1);
    for (var j = 0; j < categories[k].items.length; j++) categories[k].items[j].id = 'i' + (j + 1);
  }
  return { sectorId: sectorId, name: sectorName, totalScore: totalScore, categories: categories };
}

export default router;
