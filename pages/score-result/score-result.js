const app = getApp();

function getGrade(score) {
  if (score >= 95) return '优秀';
  if (score >= 85) return '良好';
  if (score >= 75) return '合格';
  return '不合格';
}

function getGradeColor(score) {
  if (score >= 95) return '#22c55e';
  if (score >= 85) return '#3b82f6';
  if (score >= 75) return '#f59e0b';
  return '#ef4444';
}

Page({
  data: {
    totalScore: 0,
    grade: '',
    gradeColor: '#3b82f6',
    categories: [],
    deductionItems: [],
    comparison: null
  },

  onLoad(options) {
    const score = parseInt(options.score, 10) || 0;
    const categories = options.categories ? JSON.parse(decodeURIComponent(options.categories)) : [];
    const deductions = options.deductions ? JSON.parse(decodeURIComponent(options.deductions)) : [];
    const comparison = options.comparison ? JSON.parse(decodeURIComponent(options.comparison)) : null;

    this.setData({
      totalScore: score,
      grade: getGrade(score),
      gradeColor: getGradeColor(score),
      categories,
      deductionItems: deductions,
      comparison
    });

    if (categories.length) {
      this.drawRadar(categories);
    }
  },

  drawRadar(categories) {
    const query = wx.createSelectorQuery();
    query.select('#resultRadar').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const w = res[0].width;
      const h = res[0].height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 40;
      const n = categories.length;
      if (n < 3) return;

      ctx.strokeStyle = 'rgba(59,130,246,0.2)';
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        const rr = r * ring / 4;
        for (let i = 0; i <= n; i++) {
          const angle = (Math.PI * 2 * (i % n)) / n - Math.PI / 2;
          const x = cx + rr * Math.cos(angle);
          const y = cy + rr * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(59,130,246,0.15)';
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (let i = 0; i <= n; i++) {
        const cat = categories[i % n];
        const pct = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
        const angle = (Math.PI * 2 * (i % n)) / n - Math.PI / 2;
        const x = cx + r * pct * Math.cos(angle);
        const y = cy + r * pct * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + (r + 28) * Math.cos(angle);
        const y = cy + (r + 28) * Math.sin(angle);
        ctx.fillText(categories[i].name || '', x, y + 4);
      }
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  continueScoring() {
    wx.navigateBack({ delta: 1 });
  }
});
