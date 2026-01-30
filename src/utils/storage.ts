import { STORAGE_KEYS, DEFAULT_USERS } from '@/constants';
import type { User, Disclosure, AuthState } from '@/types';

// 初始化默认数据
export function initializeStorage(): void {
  // 初始化用户数据
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  
  // 初始化交底书数据
  if (!localStorage.getItem(STORAGE_KEYS.DISCLOSURES)) {
    localStorage.setItem(STORAGE_KEYS.DISCLOSURES, JSON.stringify([]));
  }
}

// 用户相关操作
export const userStorage = {
  getAll(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  getById(id: string): User | undefined {
    const users = this.getAll();
    return users.find(u => u.id === id);
  },

  getByEmail(email: string): User | undefined {
    const users = this.getAll();
    return users.find(u => u.email === email);
  },

  create(user: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getAll();
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  },

  update(id: string, updates: Partial<User>): User | null {
    const users = this.getAll();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return users[index];
  },

  delete(id: string): boolean {
    const users = this.getAll();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
    return true;
  }
};

// 交底书相关操作
export const disclosureStorage = {
  getAll(): Disclosure[] {
    const data = localStorage.getItem(STORAGE_KEYS.DISCLOSURES);
    return data ? JSON.parse(data) : [];
  },

  getById(id: string): Disclosure | undefined {
    const disclosures = this.getAll();
    return disclosures.find(d => d.id === id);
  },

  getByAuthor(authorId: string): Disclosure[] {
    const disclosures = this.getAll();
    return disclosures.filter(d => d.authorId === authorId);
  },

  create(disclosure: Omit<Disclosure, 'id' | 'createdAt' | 'updatedAt'>): Disclosure {
    const disclosures = this.getAll();
    const now = new Date().toISOString();
    const newDisclosure: Disclosure = {
      ...disclosure,
      id: `disc-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    disclosures.push(newDisclosure);
    localStorage.setItem(STORAGE_KEYS.DISCLOSURES, JSON.stringify(disclosures));
    return newDisclosure;
  },

  update(id: string, updates: Partial<Disclosure>): Disclosure | null {
    const disclosures = this.getAll();
    const index = disclosures.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    disclosures[index] = { 
      ...disclosures[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    localStorage.setItem(STORAGE_KEYS.DISCLOSURES, JSON.stringify(disclosures));
    return disclosures[index];
  },

  delete(id: string): boolean {
    const disclosures = this.getAll();
    const filtered = disclosures.filter(d => d.id !== id);
    if (filtered.length === disclosures.length) return false;
    localStorage.setItem(STORAGE_KEYS.DISCLOSURES, JSON.stringify(filtered));
    return true;
  },

  // 统计功能
  getStats(authorId?: string) {
    const disclosures = authorId ? this.getByAuthor(authorId) : this.getAll();
    return {
      total: disclosures.length,
      draft: disclosures.filter(d => d.status === 'draft').length,
      processing: disclosures.filter(d => d.status === 'processing').length,
      review: disclosures.filter(d => d.status === 'review').length,
      approved: disclosures.filter(d => d.status === 'approved').length
    };
  }
};

// 认证状态操作
export const authStorage = {
  get(): AuthState | null {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH);
    return data ? JSON.parse(data) : null;
  },

  set(auth: AuthState): void {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  isAuthenticated(): boolean {
    const auth = this.get();
    return !!(auth?.isAuthenticated && auth?.user);
  },

  getCurrentUser(): User | null {
    const auth = this.get();
    return auth?.user || null;
  }
};

// 清除所有数据（调试用）
export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.DISCLOSURES);
  localStorage.removeItem(STORAGE_KEYS.AUTH);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}
