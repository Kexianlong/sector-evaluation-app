const { MANAGER_ROLES, isInstructorRole } = require('./roles.js');

function canManageUser(currentUser, targetUser) {
  if (!currentUser || !targetUser) return false;
  if (currentUser.role === 'center_director') return true;
  if (['deputy_director', 'department_head', 'supervisor'].includes(currentUser.role)) {
    return targetUser.department === currentUser.department;
  }
  return false;
}

function canViewStudentScores(currentUser, student) {
  if (!currentUser || !student) return false;
  if (currentUser.userId === student.userId) return true;
  if (currentUser.role === 'center_director') return true;
  if (isInstructorRole(currentUser.role) || ['deputy_director', 'department_head', 'supervisor'].includes(currentUser.role)) {
    return student.department === currentUser.department;
  }
  return false;
}

function canScore(currentUser) {
  if (!currentUser) return false;
  return isInstructorRole(currentUser.role) || MANAGER_ROLES.includes(currentUser.role);
}

function canAccessConfig(currentUser) {
  if (!currentUser) return false;
  return MANAGER_ROLES.includes(currentUser.role);
}

function canRelease(currentUser) {
  if (!currentUser) return false;
  return MANAGER_ROLES.includes(currentUser.role);
}

module.exports = { canManageUser, canViewStudentScores, canScore, canAccessConfig, canRelease };
