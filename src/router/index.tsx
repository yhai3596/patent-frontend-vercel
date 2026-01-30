import React, { useEffect, useState } from 'react';
import type { RouteConfig, UserRole } from '@/types';
import { isAuthenticated, hasPermission } from '@/utils/auth';

// 页面组件
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DisclosureList from '@/pages/DisclosureList';
import DisclosureEdit from '@/pages/DisclosureEdit';
import TeamManagement from '@/pages/TeamManagement';
import Profile from '@/pages/Profile';
import AISettings from '@/pages/AISettings';
import NotFound from '@/pages/NotFound';

// 路由配置
export const routes: RouteConfig[] = [
  { path: '/login', component: Login, requiresAuth: false },
  { path: '/', component: Dashboard, requiresAuth: true },
  { path: '/dashboard', component: Dashboard, requiresAuth: true },
  { path: '/disclosures', component: DisclosureList, requiresAuth: true },
  { path: '/disclosure/new', component: DisclosureEdit, requiresAuth: true },
  { path: '/disclosure/edit/:id', component: DisclosureEdit, requiresAuth: true },
  { path: '/team', component: TeamManagement, requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/profile', component: Profile, requiresAuth: true },
  { path: '/ai-settings', component: AISettings, requiresAuth: true },
  { path: '*', component: NotFound, requiresAuth: false }
];

// 路由守卫组件
interface RouteGuardProps {
  children: React.ReactNode;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children, requiresAuth, allowedRoles }) => {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!requiresAuth) {
      setCanAccess(true);
      return;
    }

    const authenticated = isAuthenticated();
    if (!authenticated) {
      setCanAccess(false);
      return;
    }

    if (allowedRoles && !hasPermission(allowedRoles)) {
      setCanAccess(false);
      return;
    }

    setCanAccess(true);
  }, [requiresAuth, allowedRoles]);

  if (canAccess === null) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  if (!canAccess && requiresAuth) {
    // 未认证，重定向到登录页
    window.location.hash = '#/login';
    return null;
  }

  if (!canAccess) {
    // 无权限
    return <div className="flex items-center justify-center h-screen">无权限访问此页面</div>;
  }

  return <>{children}</>;
};

// 当前路由组件
export const CurrentRoute: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 匹配路由
  const matchedRoute = routes.find(route => {
    if (route.path === '*') return true;
    
    // 简单路由匹配
    const routeParts = route.path.split('/');
    const pathParts = currentPath.split('/');
    
    if (routeParts.length !== pathParts.length) return false;
    
    return routeParts.every((part, index) => {
      if (part.startsWith(':')) return true; // 参数匹配
      return part === pathParts[index];
    });
  }) || routes.find(r => r.path === '*');

  if (!matchedRoute) return <NotFound />;

  const Component = matchedRoute.component;

  return (
    <RouteGuard 
      requiresAuth={matchedRoute.requiresAuth} 
      allowedRoles={matchedRoute.allowedRoles}
    >
      <Component />
    </RouteGuard>
  );
};

// 导航函数
export function navigate(path: string): void {
  window.location.hash = `#${path}`;
}

// 获取URL参数
export function useParams(): Record<string, string> {
  const path = window.location.hash.slice(1) || '/';
  const route = routes.find(r => {
    if (r.path === '*') return false;
    const routeParts = r.path.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
  });

  const params: Record<string, string> = {};
  if (route) {
    const routeParts = route.path.split('/');
    const pathParts = path.split('/');
    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[index];
      }
    });
  }
  return params;
}
