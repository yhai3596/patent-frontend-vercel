import { useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
// authStorage imported for potential future use
import { login as authLogin, logout as authLogout, getCurrentUser, hasPermission } from '@/utils/auth';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkPermission: (role?: UserRole | UserRole[]) => boolean;
  refreshUser: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化时从存储加载
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    const result = authLogin(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, message: result.message };
  }, []);

  // 注销
  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(!!currentUser);
  }, []);

  // 检查权限
  const checkPermission = useCallback((role?: UserRole | UserRole[]) => {
    return hasPermission(role);
  }, []);

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    checkPermission,
    refreshUser
  };
}
