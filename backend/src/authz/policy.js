export const ALL_ROLES = [
  'student',
  'instructor',
  'deputy_director',
  'supervisor',
  'department_head',
  'center_director',
];

export const ROLE_LABELS = {
  student: '学员',
  instructor: '教员',
  deputy_director: '科室副主任',
  supervisor: '培训主管',
  department_head: '科室主任',
  center_director: '中心主任',
};

export function canAccessDepartment(currentUser, targetDepartment) {
  if (!currentUser) return false;
  if (currentUser.role === 'center_director') return true;
  if (!currentUser.department) return false;
  if (!targetDepartment) return false;
  return currentUser.department === targetDepartment;
}

export function getManageableRoles(currentRole) {
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

export function getVisibleRoles(currentRole) {
  switch (currentRole) {
    case 'center_director':
      return ALL_ROLES;
    case 'department_head':
      return ['student', 'instructor', 'deputy_director', 'supervisor', 'department_head'];
    case 'deputy_director':
    case 'supervisor':
      return ['student', 'instructor', 'deputy_director', 'supervisor'];
    default:
      return [];
  }
}
