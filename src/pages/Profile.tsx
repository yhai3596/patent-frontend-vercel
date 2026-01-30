import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateUserInfo, changePassword } from '@/utils/auth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, Camera } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  // 基本信息
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  
  // 密码修改
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setUpdating(true);
    setUpdateMessage('');
    
    const result = updateUserInfo(user.id, { name, avatar });
    
    if (result.success) {
      setUpdateMessage('个人信息更新成功');
      refreshUser();
    } else {
      setUpdateMessage(result.message || '更新失败');
    }
    
    setUpdating(false);
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage('两次输入的密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage('新密码长度不能少于6位');
      return;
    }
    
    setChangingPassword(true);
    setPasswordMessage('');
    
    const result = changePassword(user.id, oldPassword, newPassword);
    
    if (result.success) {
      setPasswordMessage('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage(result.message || '密码修改失败');
    }
    
    setChangingPassword(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型和大小
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">请先登录</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">个人中心</h2>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 头像 */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    name.charAt(0)
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" type="button">
                    <Camera className="w-4 h-4 mr-2" />
                    更换头像
                  </Button>
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  支持 JPG、PNG 格式，最大 2MB
                </p>
              </div>
            </div>

            {/* 姓名 */}
            <div>
              <Label>显示名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入显示名称"
              />
            </div>

            {/* 邮箱（只读） */}
            <div>
              <Label>邮箱</Label>
              <Input value={user.email} disabled />
              <p className="text-sm text-gray-500 mt-1">
                邮箱地址不可修改
              </p>
            </div>

            {/* 角色（只读） */}
            <div>
              <Label>角色</Label>
              <Input 
                value={user.role === 'admin' ? '管理员' : '研发人员'} 
                disabled 
              />
            </div>

            {updateMessage && (
              <Alert className={updateMessage.includes('成功') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <AlertDescription className={updateMessage.includes('成功') ? 'text-green-700' : 'text-red-700'}>
                  {updateMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleUpdateProfile} 
              disabled={updating || name === user.name}
            >
              {updating ? '保存中...' : '保存修改'}
            </Button>
          </CardContent>
        </Card>

        {/* 修改密码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              修改密码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>原密码</Label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入原密码"
              />
            </div>

            <div>
              <Label>新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
              />
              <p className="text-sm text-gray-500 mt-1">
                密码长度至少6位
              </p>
            </div>

            <div>
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </div>

            {passwordMessage && (
              <Alert className={passwordMessage.includes('成功') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <AlertDescription className={passwordMessage.includes('成功') ? 'text-green-700' : 'text-red-700'}>
                  {passwordMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleChangePassword}
              disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? '修改中...' : '修改密码'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
