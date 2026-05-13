import express from 'express';
import { Score, User } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
  try {
    const { evaluations } = req.body;
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ success: false, message: '请至少提供一个评分' });
    }
    if (req.user.role !== 'center_director' && req.user.department) {
      const allUsers = await User.findAll();
      const deptMap = {};
      for (const u of allUsers) deptMap[u.userId] = u.department || '';
      for (const e of evaluations) {
        if (deptMap[e.studentId] !== req.user.department) {
          return res.status(403).json({ success: false, message: '不能给其他科室学员评分' });
        }
      }
    }
    let created = 0, failed = 0;
    for (const e of evaluations) {
      try {
        const now = new Date();
        await Score.create({
          ...e,
          instructorId: req.user.userId,
          instructorName: req.user.name,
          date: e.date || now.toISOString().split('T')[0],
          editCount: 0,
          released: false,
          createdAt: now.toISOString()
        });
        created++;
      } catch (ex) {
        failed++;
      }
    }
    res.status(200).json({ success: true, data: { created, failed }, message: '成功入库 ' + created + ' 条记录' });
  } catch (error) {
    res.status(500).json({ success: false, message: '批量评分失败: ' + error.message });
  }
});

export default router;
