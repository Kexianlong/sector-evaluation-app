/**
 * XML Spreadsheet 2003 生成器
 * 生成纯 XML 格式的 Excel 文件（.xls），支持多 Sheet、样式、列宽
 * Excel / WPS 均可直接打开
 */

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<?mso-application progid="Excel.Sheet"?>\n';

const NS = 'xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
  'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
  'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
  'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ' +
  'xmlns:html="http://www.w3.org/TR/REC-html40"';

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildStyles(opts) {
  const headerColor = opts.headerColor || '#132238';
  const headerFontColor = opts.headerFontColor || '#e8ecf1';
  const borderColor = opts.borderColor || '#1e3a5f';
  const bgPrimary = opts.bgPrimary || '#0a1628';

  return `
  <Styles>
    <Style ss:ID="Default">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#e8ecf1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="${headerFontColor}" ss:Bold="1"/>
      <Interior ss:Color="${headerColor}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Number">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#e8ecf1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="0.00"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Date">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#e8ecf1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <NumberFormat ss:Format="yyyy-mm-dd"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Green">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#00d26a" ss:Bold="1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Red">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#ff4d4f" ss:Bold="1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
    <Style ss:ID="Amber">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#ffaa00" ss:Bold="1"/>
      <Interior ss:Color="${bgPrimary}" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderColor}"/>
      </Borders>
    </Style>
  </Styles>`;
}

function buildCell(value, type, styleId, width) {
  const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
  if (type === 'Number' && typeof value === 'number') {
    return `<Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  if (type === 'Date' && value) {
    // Excel 日期序列号简化处理：直接输出字符串让 Excel 解析
    return `<Cell${styleAttr}><Data ss:Type="DateTime">${escapeXml(value)}T00:00:00.000</Data></Cell>`;
  }
  return `<Cell${styleAttr}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function buildRow(cells) {
  return `    <Row>${cells.join('')}</Row>\n`;
}

function buildColumnWidth(widths) {
  return widths.map((w, i) => `    <Column ss:Index="${i + 1}" ss:Width="${w}"/>\n`).join('');
}

function buildWorksheet(sheet, opts) {
  const name = escapeXml(sheet.name || 'Sheet');
  const header = sheet.header || [];
  const rows = sheet.rows || [];
  const headerTypes = sheet.headerTypes || [];
  const colWidths = sheet.colWidths || header.map(() => 100);

  let xml = `  <Worksheet ss:Name="${name}">\n`;
  xml += `    <Table>\n`;
  xml += buildColumnWidth(colWidths);

  // 标题行
  if (header.length) {
    const headerCells = header.map((h, i) => buildCell(h, 'String', 'Header'));
    xml += buildRow(headerCells);
  }

  // 数据行
  rows.forEach((row) => {
    const cells = row.map((val, i) => {
      const type = headerTypes[i] || 'String';
      let style = '';
      if (type === 'Green') style = 'Green';
      else if (type === 'Red') style = 'Red';
      else if (type === 'Amber') style = 'Amber';
      else if (type === 'Number') style = 'Number';
      else if (type === 'Date') style = 'Date';
      return buildCell(val, type, style);
    });
    xml += buildRow(cells);
  });

  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;
  return xml;
}

/**
 * 生成 XML Spreadsheet 字符串
 * @param {Array} sheets - 每个 sheet 对象 { name, header, headerTypes, rows, colWidths }
 * @param {Object} opts - 样式选项
 * @returns {string} XML 字符串
 */
function generate(sheets, opts) {
  opts = opts || {};
  let xml = XML_HEAD;
  xml += `<Workbook ${NS}>\n`;
  xml += buildStyles(opts);
  sheets.forEach((sheet) => {
    xml += buildWorksheet(sheet, opts);
  });
  xml += '</Workbook>';
  return xml;
}

/**
 * 在小程序中保存并打开 Excel 文件
 * @param {string} xmlString - generate() 返回的 XML 字符串
 * @param {string} fileName - 文件名（不含扩展名）
 */
function saveAndOpen(xmlString, fileName) {
  const fs = wx.getFileSystemManager();
  const filePath = `${wx.env.USER_DATA_PATH}/${fileName || 'export'}.xls`;
  try {
    fs.writeFileSync(filePath, xmlString, 'utf8');
    wx.openDocument({
      filePath: filePath,
      fileType: 'xls',
      showMenu: true,
      success: () => {
        // 文档打开成功
      },
      fail: (err) => {
        console.error('[xmlSpreadsheet] openDocument fail:', err);
        wx.showToast({ title: '预览失败:' + ((err && err.errMsg) || ''), icon: 'none' });
      }
    });
  } catch (e) {
    console.error('[xmlSpreadsheet] writeFile fail:', e);
    wx.showToast({ title: '文件保存失败', icon: 'none' });
  }
}

module.exports = {
  generate: generate,
  saveAndOpen: saveAndOpen
};
