import XLSX from 'xlsx';

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

export function parseExcelBuffer(buffer, filename) {
  var workbook = XLSX.read(buffer, { type: 'buffer' });
  var sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel 文件没有可用工作表');
  var rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
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

export default { parseExcelBuffer };
