import express from 'express';
import { Score, User } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { canAccessDepartment } from '../authz/policy.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { studentId, instructorId, includeReleased } = req.query;
    let scores = await Score.findAll();
    if (studentId) scores = scores.filter(s => s.studentId === studentId);
    if (instructorId) scores = scores.filter(s => s.instructorId === instructorId);

    const allUsers = await User.findAll();
    const studentDeptMap = {};
    const releasedIds = {};
    for (const u of allUsers) {
      studentDeptMap[u.userId] = u.department || '';
      if (u.role === 'student' && u.isReleased) releasedIds[u.userId] = true;
    }

    if (req.user.role !== 'center_director' && req.user.department) {
      scores = scores.filter(s => studentDeptMap[s.studentId] === req.user.department);
    }

    if (includeReleased !== 'true') {
      scores = scores.filter(s => !releasedIds[s.studentId]);
    }

    scores.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    res.status(200).json({ success: true, data: { items: scores, total: scores.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取评分记录失败: ' + error.message });
  }
});

router.get('/student/:studentId/sector/:sectorId', verifyToken, async (req, res) => {
  try {
    const { studentId, sectorId } = req.params;
    if (req.user.role !== 'center_director' && req.user.department) {
      const student = await User.findById(studentId);
      if (!student || (student.department || '') !== req.user.department) {
        return res.status(403).json({ success: false, message: '无权限查看该学员数据' });
      }
    }
    let scores = await Score.findByStudentId(studentId);
    scores = scores.filter(s => s.sectorId === sectorId);
    if (scores.length > 0) {
      res.status(200).json({ success: true, data: scores[0] });
    } else {
      res.status(200).json({ success: true, data: { scores: [] }, message: '暂无评分记录' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取评分失败' });
  }
});

router.get('/instructor/:instructorId/history', verifyToken, async (req, res) => {
  try {
    const { instructorId } = req.params;
    let scores = await Score.findByInstructorId(instructorId);
    if (req.user.role !== 'center_director' && req.user.department) {
      const allUsers = await User.findAll();
      const deptMap = {};
      for (const u of allUsers) deptMap[u.userId] = u.department || '';
      scores = scores.filter(s => deptMap[s.studentId] === req.user.department);
    }
    res.status(200).json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取教员历史评分失败' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const scoreData = {
      ...req.body,
      instructorId: req.user.userId,
      instructorName: req.user.name,
      date: req.body.date || now.toISOString().split('T')[0],
      editCount: 0,
      released: false,
      createdAt: now.toISOString()
    };
    if (req.body.scores) {
      let sum = 0;
      for (const s of req.body.scores) sum += (s.score || 0);
      if (!scoreData.totalScore) scoreData.totalScore = sum;
    }
    const score = await Score.create(scoreData);
    res.status(201).json({ success: true, data: score, message: '评分成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '评分失败: ' + error.message });
  }
});

router.put('/:scoreId', verifyToken, async (req, res) => {
  try {
    const { scoreId } = req.params;
    const existing = await Score.findById(scoreId);
    if (!existing) {
      return res.status(404).json({ success: false, message: '评分不存在' });
    }
    const updateData = { ...req.body, editCount: (existing.editCount || 0) + 1 };
    await Score.update(scoreId, updateData);
    const updated = await Score.findById(scoreId);
    res.status(200).json({ success: true, data: updated, message: '评分更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新评分失败: ' + error.message });
  }
});

router.delete('/:scoreId', verifyToken, async (req, res) => {
  try {
    const { scoreId } = req.params;
    if (req.user.role !== 'center_director' && req.user.department) {
      const score = await Score.findById(scoreId);
      if (score) {
        const student = await User.findById(score.studentId);
        if (!student || (student.department || '') !== req.user.department) {
          return res.status(403).json({ success: false, message: '无权限删除其他科室数据' });
        }
      }
    }
    const deleted = await Score.delete(scoreId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: '评分不存在' });
    }
    res.status(200).json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除评分失败: ' + error.message });
  }
});

// Stub 路由：/api/score-config/pending-count
router.get('/pending-count', verifyToken, async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { count: 0 }, message: '待考核数量' });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取待考核数量失败: ' + error.message });
  }
});

export default router;
