import express from 'express';
import { User } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  ALL_ROLES,
  ROLE_LABELS,
  canAccessDepartment,
  getManageableRoles,
  getVisibleRoles,
} from '../authz/policy.js';

const router = express.Router();

function cleanUser(u) {
  if (!u) return u;
  const { password, _id, ...rest } = u;
  return rest;
}

router.get('/students', verifyToken, async (req, res) => {
  try {
    const { includeReleased } = req.query;
    let students = await User.findByRole('student');
    students = students.filter(s => canAccessDepartment(req.user, s.department));
    if (includeReleased !== 'true') {
      students = students.filter(s => !s.isReleased);
    }
    res.status(200).json({
      success: true,
      data: students.map(cleanUser),
      message: '获取学员列表成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取学员列表失败: ' + error.message });
  }
});

router.put('/:userId/release', verifyToken, requireRole(['supervisor', 'deputy_director', 'department_head', 'center_director']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isReleased } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: '用户ID不能为空' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    if (user.role !== 'student') {
      return res.status(400).json({ success: false, message: '只能对学员设置放单状态' });
    }
    if (!canAccessDepartment(req.user, user.department)) {
      return res.status(403).json({ success: false, message: '无权修改其他科室学员的放单状态' });
    }
    const updateData = {
      isReleased: !!isReleased,
      releasedAt: isReleased ? new Date().toISOString() : null
    };
    const updated = await User.update(userId, updateData);
    res.status(200).json({
      success: true,
      data: cleanUser(updated),
      message: isReleased ? '学员已成功放单' : '已取消学员放单状态'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新放单状态失败: ' + error.message });
  }
});

router.use(verifyToken, requireRole(['deputy_director', 'supervisor', 'department_head', 'center_director']));

router.get('/', async (req, res) => {
  try {
    const currentRole = req.user.role;
    const visibleRoles = getVisibleRoles(currentRole);
    let users = await User.findAll();
    users = users.filter(u => visibleRoles.includes(u.role));
    users = users.filter(u => canAccessDepartment(req.user, u.department));
    const stats = { total: users.length };
    visibleRoles.forEach(r => { stats[r] = users.filter(u => u.role === r).length; });
    res.status(200).json({
      success: true,
      data: {
        items: users.map(cleanUser),
        stats,
        manageableRoles: getManageableRoles(currentRole),
        pagination: { page: 1, limit: 500, total: users.length, totalPages: 1 }
      },
      message: '获取用户列表成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户列表失败: ' + error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.status(200).json({ success: true, data: cleanUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const currentRole = req.user.role;
    const manageableRoles = getManageableRoles(currentRole);
    const { username, password, name, department, team, role, studentLevel, instructorLevel } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: '用户名、密码、姓名不能为空' });
    }
    const targetRole = role || 'student';
    if (!manageableRoles.includes(targetRole)) {
      return res.status(403).json({ success: false, message: '无权限创建该角色用户' });
    }
    const dept = currentRole === 'center_director' ? (department || '') : (req.user.department || '');
    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }
    const user = await User.create({
      username, password, name,
      department: dept,
      team: team || '',
      role: targetRole,
      studentLevel: studentLevel || '',
      instructorLevel: instructorLevel || '',
      isReleased: false
    });
    res.status(201).json({ success: true, data: cleanUser(user), message: '用户创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建用户失败: ' + error.message });
  }
});

router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentRole = req.user.role;
    const manageableRoles = getManageableRoles(currentRole);
    const existing = await User.findById(userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    if (!canAccessDepartment(req.user, existing.department)) {
      return res.status(403).json({ success: false, message: '无权修改该用户' });
    }
    const { username, password, name, department, team, role, studentLevel, instructorLevel } = req.body;
    if (role && !manageableRoles.includes(role)) {
      return res.status(403).json({ success: false, message: '无权将该用户修改为该角色' });
    }
    if (department !== undefined && currentRole !== 'center_director') {
      return res.status(403).json({ success: false, message: '无权修改用户科室' });
    }
    const updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (team !== undefined) updateData.team = team;
    if (studentLevel !== undefined) updateData.studentLevel = studentLevel;
    if (instructorLevel !== undefined) updateData.instructorLevel = instructorLevel;
    if (Object.keys(updateData).length > 0) {
      await User.update(userId, updateData);
    }
    const updated = await User.findById(userId);
    res.status(200).json({ success: true, data: cleanUser(updated), message: '用户更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新用户失败: ' + error.message });
  }
});

router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    if (!canAccessDepartment(req.user, user.department)) {
      return res.status(403).json({ success: false, message: '无权删除该用户' });
    }
    await User.delete(userId);
    res.status(200).json({ success: true, message: '用户已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除用户失败: ' + error.message });
  }
});

// Stub 路由：前端调用但后端暂未实现完整功能
router.get('/reminders', verifyToken, async (req, res) => {
  try {
    res.status(200).json({ success: true, data: [], message: '提醒列表' });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取提醒失败: ' + error.message });
  }
});

router.get('/my-reminders', verifyToken, async (req, res) => {
  try {
    res.status(200).json({ success: true, data: [], message: '我的提醒' });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取提醒失败: ' + error.message });
  }
});

export default router;
