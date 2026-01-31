/**
 * API服务 - 调用后端接口
 */

import { API_BASE_URL } from '@/constants';

// 获取token
const getToken = () => localStorage.getItem('accessToken');

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || '请求失败');
  }
  
  return data;
}

// ========== 认证 ==========
export const authApi = {
  login: (email: string, password: string) =>
    request<{ data: { user: any; accessToken: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  me: () =>
    request<{ data: any }>('/api/auth/me'),
  
  forgotPassword: (email: string) =>
    request<any>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  
  resetPassword: (token: string, newPassword: string) =>
    request<any>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    })
};

// ========== 交底书 ==========
export const disclosureApi = {
  getList: () =>
    request<{ data: { list: any[]; total: number } }>('/api/disclosures'),
  
  getById: (id: string) =>
    request<{ data: any }>(`/api/disclosures/${id}`),
  
  create: (data: { type: string; content?: any }) =>
    request<{ data: any }>('/api/disclosures', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: any) =>
    request<{ data: any }>(`/api/disclosures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) =>
    request<any>(`/api/disclosures/${id}`, {
      method: 'DELETE'
    })
};

// ========== 用户 ==========
export const userApi = {
  getList: () =>
    request<{ data: { list: any[]; total: number } }>('/api/users'),
  
  create: (data: { email: string; name: string; password?: string; role?: string }) =>
    request<{ data: any }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: any) =>
    request<{ data: any }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) =>
    request<any>(`/api/users/${id}`, {
      method: 'DELETE'
    })
};

// ========== AI配置 ==========
export const aiConfigApi = {
  getConfig: () =>
    request<{ data: any }>('/api/ai-configs'),
  
  updateConfig: (data: any) =>
    request<{ data: any }>('/api/ai-configs', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  addModel: (model: any) =>
    request<{ data: any }>('/api/ai-configs/models', {
      method: 'POST',
      body: JSON.stringify(model)
    }),
  
  polish: (content: string, field: string) =>
    request<{ data: any }>('/api/ai/polish', {
      method: 'POST',
      body: JSON.stringify({ content, field })
    }),
  
  extract: (filename: string, content?: string) =>
    request<{ data: any }>('/api/ai/extract', {
      method: 'POST',
      body: JSON.stringify({ filename, content })
    })
};

// ========== 提示词配置 ==========
export const promptConfigApi = {
  getList: () =>
    request<{ data: { list: any[]; total: number } }>('/api/prompt-configs'),
  
  create: (data: any) =>
    request<{ data: any }>('/api/prompt-configs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: any) =>
    request<{ data: any }>(`/api/prompt-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) =>
    request<any>(`/api/prompt-configs/${id}`, {
      method: 'DELETE'
    })
};

// ========== 字段配置 ==========
export const fieldConfigApi = {
  getList: () =>
    request<{ data: any[] }>('/api/field-configs'),
  
  update: (configs: any[]) =>
    request<{ data: any[] }>('/api/field-configs', {
      method: 'PUT',
      body: JSON.stringify({ configs })
    })
};

// ========== 消息通知 ==========
export const notificationApi = {
  getList: () =>
    request<{ data: { list: any[]; total: number; unreadCount: number } }>('/api/notifications'),
  
  getUnreadCount: () =>
    request<{ data: { count: number } }>('/api/notifications/unread-count'),
  
  markAsRead: (id: string) =>
    request<any>(`/api/notifications/${id}/read`, {
      method: 'PUT'
    }),
  
  markAllAsRead: () =>
    request<any>('/api/notifications/read-all', {
      method: 'PUT'
    }),
  
  delete: (id: string) =>
    request<any>(`/api/notifications/${id}`, {
      method: 'DELETE'
    })
};

// ========== 系统统计 ==========
export const statsApi = {
  getStats: () =>
    request<{ data: any }>('/api/admin/stats')
};

export default {
  auth: authApi,
  disclosure: disclosureApi,
  user: userApi,
  aiConfig: aiConfigApi,
  promptConfig: promptConfigApi,
  fieldConfig: fieldConfigApi,
  notification: notificationApi,
  stats: statsApi
};
