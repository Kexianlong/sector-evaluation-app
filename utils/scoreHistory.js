function inferMaxTotal(scores, explicit) {
  if (explicit != null && Number(explicit) > 0) return Number(explicit);
  if (Array.isArray(scores) && scores.length) {
    const sum = scores.reduce((s, x) => s + (Number(x.maxScore) || 0), 0);
    if (sum > 0) return sum;
  }
  return 100;
}

function scoresArrayToMap(scores) {
  if (!Array.isArray(scores)) return {};
  return scores.reduce((acc, item) => {
    const key = item.categoryName || item.name || item.categoryId || '评分项';
    acc[key] = Number(item.score != null ? item.score : 0);
    return acc;
  }, {});
}

function normalizeScoreHistoryRow(r) {
  if (!r || typeof r !== 'object') return null;
  const id = r.scoreId != null ? r.scoreId : r.id;
  const total = r.total != null ? Number(r.total) : Number(r.totalScore != null ? r.totalScore : 0);
  const scoresArr = Array.isArray(r.scores) ? r.scores : null;
  const scoresMap =
    scoresArr != null
      ? scoresArrayToMap(scoresArr)
      : r.scores && typeof r.scores === 'object' && !Array.isArray(r.scores)
        ? Object.assign({}, r.scores)
        : {};

  const maxTotal = inferMaxTotal(scoresArr, r.maxTotal);

  return Object.assign({}, r, {
    id,
    scoreId: r.scoreId != null ? r.scoreId : id,
    total,
    maxTotal,
    scores: scoresMap
  });
}

function normalizeScoreHistoryRecords(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(normalizeScoreHistoryRow)
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

module.exports = { normalizeScoreHistoryRecords };
