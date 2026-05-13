import jwt from 'jsonwebtoken';
import { User } from '../db.js';

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      name: user.name,
      department: user.department || '',
      role: user.role
    },
    User.getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return res.status(401).json({ success: false, message: '认证令牌格式错误' });
    }
    const decoded = jwt.verify(token, User.getJwtSecret());
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在或令牌已失效' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '认证令牌已过期' });
    }
    return res.status(401).json({ success: false, message: '认证令牌无效' });
  }
}

export function requireRole(...allowedRoles) {
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
}
