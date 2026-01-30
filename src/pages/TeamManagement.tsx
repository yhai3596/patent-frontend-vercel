import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userStorage } from '@/utils/storage';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Edit2, 
  Lock, 
  Unlock
} from 'lucide-react';
import type { User, UserRole, UserStatus } from '@/types';

const TeamManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'researcher' as UserRole,
    status: 'active' as UserStatus
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const allUsers = userStorage.getAll();
    setUsers(allUsers);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'researcher',
      status: 'active'
    });
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      // 更新用户
      const updates: Partial<User> = {
        name: formData.name,
        role: formData.role,
        status: formData.status
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      userStorage.update(editingUser.id, updates);
    } else {
      // 创建新用户
      userStorage.create({
        email: formData.email,
        password: formData.password || 'password123',
        name: formData.name,
        role: formData.role,
        status: formData.status
      });
    }
    
    setDialogOpen(false);
    loadUsers();
  };

  const handleToggleStatus = (user: User) => {
    setSelectedUser(user);
    setDisableDialogOpen(true);
  };

  const confirmToggleStatus = () => {
    if (selectedUser) {
      const newStatus = selectedUser.status === 'active' ? 'disabled' : 'active';
      userStorage.update(selectedUser.id, { status: newStatus });
      setDisableDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">您没有权限访问此页面</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">团队管理</h2>
            <p className="text-gray-600 mt-1">
              共 {users.length} 名成员
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            添加成员
          </Button>
        </div>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索姓名或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 成员列表 */}
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-medium">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{user.name}</span>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? '管理员' : '研发人员'}
                        </Badge>
                        <Badge 
                          variant={user.status === 'active' ? 'default' : 'destructive'}
                          className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {user.status === 'active' ? '正常' : '已禁用'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {user.email}
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-gray-500 mt-1">
                          最后登录: {new Date(user.lastLogin).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(user)}
                      className={user.status === 'active' ? 'text-red-600' : 'text-green-600'}
                    >
                      {user.status === 'active' ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          启用
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 添加/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? '编辑成员' : '添加成员'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? '修改成员信息' : '添加新成员到团队'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              
              <div>
                <Label>邮箱 *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱"
                  disabled={!!editingUser}
                />
              </div>
              
              <div>
                <Label>{editingUser ? '新密码（留空则不修改）' : '密码 *'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '留空则不修改' : '请输入密码'}
                />
              </div>
              
              <div>
                <Label>角色</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researcher">研发人员</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>状态</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v as UserStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="disabled">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 禁用/启用确认对话框 */}
        <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUser?.status === 'active' ? '确认禁用' : '确认启用'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.status === 'active' 
                  ? `确定要禁用用户 "${selectedUser?.name}" 吗？禁用后将无法登录。`
                  : `确定要启用用户 "${selectedUser?.name}" 吗？`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmToggleStatus}
                className={selectedUser?.status === 'active' ? 'bg-red-600' : 'bg-green-600'}
              >
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default TeamManagement;
