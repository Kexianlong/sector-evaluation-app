import express from 'express';
import { User, Score, Sector } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { canAccessDepartment } from '../authz/policy.js';

const router = express.Router();

router.post('/backup.xlsx', verifyToken, async (req, res) => {
  try {
    const result = { exportTime: new Date().toISOString(), version: '2.0', data: {} };
    if (req.body.users) {
      let users = await User.findAll();
      users = users.filter(u => canAccessDepartment(req.user, u.department));
      result.data.users = users.map(u => { const { password, _id, ...rest } = u; return rest; });
    }
    if (req.body.scores) {
      let scores = await Score.findAll();
      if (req.user.role !== 'center_director' && req.user.department) {
        const allUsers = await User.findAll();
        const deptMap = {};
        for (const u of allUsers) deptMap[u.userId] = u.department || '';
        scores = scores.filter(s => deptMap[s.studentId] === req.user.department);
      }
      result.data.scores = scores;
    }
    if (req.body.sectors) {
      result.data.sectors = await Sector.findAll();
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="backup_' + new Date().toISOString().split('T')[0] + '.json"');
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '导出失败: ' + error.message });
  }
});

export default router;
