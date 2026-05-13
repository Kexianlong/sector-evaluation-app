import express from 'express';
import { User } from '../db.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

function cleanUser(u) {
  if (!u) return u;
  const { password, _id, ...rest } = u;
  return rest;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    if (user.role === 'student' && user.isReleased) {
      return res.status(403).json({ success: false, message: '该学员已放单，账号已停用。如有疑问请联系管理员。' });
    }
    const valid = await User.verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    const token = generateToken(user);
    res.status(200).json({
      success: true,
      data: { token, userInfo: cleanUser(user) },
      message: '登录成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败: ' + error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.status(200).json({ success: true, data: cleanUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// 更新当前登录用户的个人信息（用于登录时补全资料）
router.put('/me', verifyToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.password;
    delete updateData.userId;
    delete updateData.username;
    await User.update(req.user.userId, updateData);
    const updated = await User.findById(req.user.userId);
    res.status(200).json({ success: true, data: cleanUser(updated), message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败: ' + error.message });
  }
});

router.put('/password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请提供旧密码和新密码' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const valid = await User.verifyPassword(user, oldPassword);
    if (!valid) {
      return res.status(400).json({ success: false, message: '旧密码不正确' });
    }
    await User.update(req.user.userId, { password: newPassword });
    res.status(200).json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '密码修改失败: ' + error.message });
  }
});

export default router;
