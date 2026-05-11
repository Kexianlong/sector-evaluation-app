// 公共 API 响应解析工具

/**
 * 标准化 API 响应，处理各种可能的返回格式
 * @param {any} data - 原始响应数据
 * @returns {object|null} 标准化后的对象
 */
function normalizeApiResponse(data) {
  if (!data) return null;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return null; }
  }
  if (data.body) {
    let body = data.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (body) return body;
  }
  return data;
}

/**
 * 从响应中提取数组数据
 * @param {any} payload - 原始响应数据
 * @returns {Array} 提取的数组
 */
function normalizeArrayPayload(payload) {
  if (!payload) return [];
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { return []; }
  }
  if (payload.body) {
    let body = payload.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (body) {
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.items)) return body.items;
      if (body.success && Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (body.data && Array.isArray(body.data.scores)) return body.data.scores;
      if (Array.isArray(body.data)) return body.data;
    }
  }
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.success && Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.scores)) return payload.data.scores;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * 从响应中提取对象数据
 * @param {any} payload - 原始响应数据
 * @returns {object|null} 提取的对象
 */
function normalizeObjectPayload(payload) {
  if (!payload) return null;
  if (payload.success && payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return null;
}

/**
 * 从各种 API 响应格式中提取数组
 * @param {any} res - 原始响应数据
 * @returns {Array} 提取的数组
 */
function extractArrayData(res) {
  if (Array.isArray(res)) return res;
  if (res && res.success && Array.isArray(res.data)) return res.data;
  if (res && res.success && res.data && Array.isArray(res.data.items)) return res.data.items;
  if (res && res.success && Array.isArray(res.items)) return res.items;
  return [];
}

module.exports = {
  normalizeApiResponse,
  normalizeArrayPayload,
  normalizeObjectPayload,
  extractArrayData
};
