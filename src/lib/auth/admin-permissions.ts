const PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'dashboard.read',
    'users.read',
    'users.write',
    'workspaces.read',
    'workspaces.write',
    'settings.read',
    'logs.read',
    'admin-users.read',
  ],
  SUPER_ADMIN: ['*'],
  SUPPORT: ['dashboard.read', 'users.read', 'workspaces.read', 'logs.read'],
  VIEWER: ['dashboard.read'],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) {
    return false;
  }
  return perms.includes('*') || perms.includes(permission);
}

export function getPermissions(role: string): string[] {
  return PERMISSIONS[role] || [];
}
