import express from 'express';
import { Score, User } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { sectorId } = req.query;
    if (req.user.role !== 'center_director' && req.user.department) {
      const student = await User.findById(studentId);
      if (!student || (student.department || '') !== req.user.department) {
        return res.status(403).json({ success: false, message: '无权限查看该学员数据' });
      }
    }
    let scores = await Score.findByStudentId(studentId);
    if (sectorId) scores = scores.filter(s => s.sectorId === sectorId);
    res.status(200).json({ success: true, data: { scores } });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

router.get('/overview', verifyToken, async (req, res) => {
  try {
    let allScores = await Score.findAll();
    if (req.user.role !== 'center_director' && req.user.department) {
      const allUsers = await User.findAll();
      const deptMap = {};
      for (const u of allUsers) deptMap[u.userId] = u.department || '';
      allScores = allScores.filter(s => deptMap[s.studentId] === req.user.department);
    }
    const uset = {};
    for (const s of allScores) if (s.studentId) uset[s.studentId] = true;
    res.status(200).json({ success: true, data: { totalScores: allScores.length, scoredStudents: Object.keys(uset).length } });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取概览数据失败' });
  }
});

export default router;
