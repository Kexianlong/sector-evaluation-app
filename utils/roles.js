/** 与 Web 端 auth.js 完全对齐 */

// 管理角色列表
const MANAGER_ROLES = ['deputy_director', 'supervisor', 'department_head', 'center_director'];

// 角色中文标签
const ROLE_LABELS = {
  student: '学员',
  instructor: '教员',
  deputy_director: '科室副主任',
  supervisor: '培训主管',
  department_head: '科室主任',
  center_director: '中心主任'
};

function isStudentRole(role) {
  return role === 'student';
}

function isInstructorRole(role) {
  return role === 'instructor';
}

function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

/** 当前角色可管理的角色列表（与 Web 端 getManageableRoles 一致） */
function getManageableRoles(currentRole) {
  switch (currentRole) {
    case 'center_director':
      return ['student', 'instructor', 'deputy_director', 'supervisor', 'department_head'];
    case 'department_head':
      return ['student', 'instructor', 'deputy_director', 'supervisor'];
    case 'deputy_director':
    case 'supervisor':
      return ['student', 'instructor'];
    default:
      return [];
  }
}

/** 当前角色可见的角色列表（含自身） */
function getVisibleRoles(currentRole) {
  switch (currentRole) {
    case 'center_director':
      return ['student', 'instructor', 'deputy_director', 'supervisor', 'department_head', 'center_director'];
    case 'department_head':
      return ['student', 'instructor', 'deputy_director', 'supervisor'];
    case 'deputy_director':
    case 'supervisor':
      return ['student', 'instructor'];
    default:
      return [];
  }
}

/** 雷达、趋势页：可选择学员查看 */
function canPickStudents(role) {
  return isInstructorRole(role) || isManagerRole(role);
}

/** 评分录入（教员及以上） */
function canEnterScores(role) {
  return isInstructorRole(role);
}

/** 评分页中的管理员数据分析区块 */
function canUseManagerScoreTools(role) {
  return isManagerRole(role);
}

/** 顶栏副标题：学员显示阶段，其余显示职务简称 */
function navRoleCaption(userInfo) {
  if (!userInfo || !userInfo.role) return '未登录';
  if (isStudentRole(userInfo.role)) return userInfo.studentLevel || userInfo.level || '学员';
  if (isInstructorRole(userInfo.role)) return '教员';
  if (isManagerRole(userInfo.role)) return ROLE_LABELS[userInfo.role] || '管理中心';
  return '学员';
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function normalizeInstructorLevel(raw) {
  const v = String(raw || '').trim();
  if (!v) return '初级教员';
  if (v === '初教' || v.indexOf('初级') >= 0) return '初级教员';
  if (v === '中教' || v.indexOf('中级') >= 0) return '中级教员';
  if (v === '高教' || v.indexOf('高级') >= 0) return '高级教员';
  if (v.endsWith('教员')) return v;
  return `${v}教员`;
}

/** 统一获取当前登录用户信息（优先从 globalData，其次 storage） */
function getUserInfo() {
  const app = getApp();
  if (app && app.globalData && app.globalData.userInfo) {
    return app.globalData.userInfo;
  }
  try {
    const stored = wx.getStorageSync('userInfo');
    if (stored) return stored;
  } catch (e) {
    console.warn('[roles] getUserInfo storage error', e);
  }
  return null;
}

module.exports = {
  MANAGER_ROLES,
  ROLE_LABELS,
  isStudentRole,
  isInstructorRole,
  isManagerRole,
  getManageableRoles,
  getVisibleRoles,
  canPickStudents,
  canEnterScores,
  canUseManagerScoreTools,
  navRoleCaption,
  getRoleLabel,
  normalizeInstructorLevel,
  getUserInfo
};
