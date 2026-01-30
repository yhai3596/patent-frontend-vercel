import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/router';
import { initializeStorage } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // 初始化存储
  useEffect(() => {
    initializeStorage();
  }, []);

  // 如果已登录，跳转到工作台
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">专利交底书智能生成工具</h1>
          <p className="text-gray-600 mt-1">AI辅助撰写，提高专利申请效率</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>用户登录</CardTitle>
            <CardDescription>
              请使用您的邮箱和密码登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-2">测试账号：</p>
              <p>管理员：admin@example.com / password123</p>
              <p>研发人员：researcher@example.com / password123</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-8">
          © 2026 专利交底书智能生成工具 - MVP版本
        </p>
      </div>
    </div>
  );
};

export default Login;
