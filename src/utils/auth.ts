import { userStorage, authStorage } from './storage';
import type { User, UserRole } from '@/types';

// 登录
export function login(email: string, password: string): { success: boolean; user?: User; message?: string } {
  const user = userStorage.getByEmail(email);
  
  if (!user) {
    return { success: false, message: '用户不存在' };
  }
  
  if (user.password !== password) {
    return { success: false, message: '密码错误' };
  }
  
  if (user.status === 'disabled') {
    return { success: false, message: '账号已被禁用' };
  }
  
  // 更新最后登录时间
  userStorage.update(user.id, { lastLogin: new Date().toISOString() });
  
  // 设置认证状态
  authStorage.set({
    user,
    isAuthenticated: true,
    loginTime: new Date().toISOString()
  });
  
  return { success: true, user };
}

// 注销
export function logout(): void {
  authStorage.clear();
}

// 检查是否已认证
export function isAuthenticated(): boolean {
  return authStorage.isAuthenticated();
}

// 获取当前用户
export function getCurrentUser(): User | null {
  return authStorage.getCurrentUser();
}

// 检查是否为管理员
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

// 检查是否有权限访问
export function hasPermission(requiredRole?: UserRole | UserRole[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (!requiredRole) return true;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  
  return user.role === requiredRole;
}

// 修改密码
export function changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; message?: string } {
  const user = userStorage.getById(userId);
  
  if (!user) {
    return { success: false, message: '用户不存在' };
  }
  
  if (user.password !== oldPassword) {
    return { success: false, message: '原密码错误' };
  }
  
  userStorage.update(userId, { password: newPassword });
  return { success: true };
}

// 更新用户信息
export function updateUserInfo(userId: string, updates: { name?: string; avatar?: string }): { success: boolean; user?: User; message?: string } {
  const user = userStorage.update(userId, updates);
  
  if (!user) {
    return { success: false, message: '用户不存在' };
  }
  
  // 更新认证状态中的用户信息
  const auth = authStorage.get();
  if (auth && auth.user?.id === userId) {
    authStorage.set({ ...auth, user });
  }
  
  return { success: true, user };
}
