import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDisclosure } from '@/hooks/useDisclosure';
import { navigate } from '@/router';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Button and Badge imported but not used in this component
import { 
  FilePlus, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

// 撰写小贴士
const writingTips = [
  {
    title: '三步法撰写',
    content: '按照"发现问题 → 设计方案 → 技术效果"的逻辑撰写，让技术方案更清晰。'
  },
  {
    title: '背景技术要完整',
    content: '详细描述现有技术及其缺点，为后续的技术方案做铺垫。'
  },
  {
    title: '技术方案要详细',
    content: '充分说明每一个技术特征，包括结构、连接关系、工作原理等。'
  },
  {
    title: '实施例要具体',
    content: '提供具体的参数、步骤和实验数据，证明技术方案的可行性。'
  },
  {
    title: '善用AI辅助',
    content: '使用AI润色功能优化表达，让交底书更专业、更规范。'
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { stats, loadDisclosures } = useDisclosure();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (user) {
      loadDisclosures(user.id);
    }
  }, [user, loadDisclosures]);

  // 轮播小贴士
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % writingTips.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const statCards = [
    { 
      title: '本月提交', 
      value: stats.total, 
      icon: FileText, 
      color: 'blue',
      description: '累计交底书数量'
    },
    { 
      title: '审核中', 
      value: stats.processing, 
      icon: Clock, 
      color: 'yellow',
      description: '等待审核的交底书'
    },
    { 
      title: '已通过', 
      value: stats.approved, 
      icon: CheckCircle, 
      color: 'green',
      description: '审核通过的交底书'
    },
    { 
      title: '需修改', 
      value: stats.review, 
      icon: AlertCircle, 
      color: 'red',
      description: '需要修改的交底书'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* 欢迎区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.name}
            </h2>
            <p className="text-gray-600 mt-1">
              今天是 {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            <span>继续创造，保护创新</span>
          </div>
        </div>

        {/* 数据概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            const colorClasses = {
              blue: 'bg-blue-50 border-blue-200',
              yellow: 'bg-yellow-50 border-yellow-200',
              green: 'bg-green-50 border-green-200',
              red: 'bg-red-50 border-red-200'
            }[card.color];
            
            const iconColors = {
              blue: 'text-blue-600',
              yellow: 'text-yellow-600',
              green: 'text-green-600',
              red: 'text-red-600'
            }[card.color];

            return (
              <Card key={index} className={`${colorClasses} border`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                    </div>
                    <div className={`p-3 rounded-lg bg-white/50`}>
                      <Icon className={`w-6 h-6 ${iconColors}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 快速入口 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/disclosure/new')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FilePlus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">AI智能生成</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    上传技术文档或图纸，AI自动提取关键信息
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate('/disclosures')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">查找历史交底书</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    查看和管理已创建的交底书
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 撰写小贴士 */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Lightbulb className="w-5 h-5" />
              撰写小贴士
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-semibold text-indigo-900">
                {writingTips[currentTipIndex].title}
              </h3>
              <p className="text-indigo-700">
                {writingTips[currentTipIndex].content}
              </p>
              <div className="flex items-center gap-2 mt-4">
                {writingTips.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTipIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentTipIndex 
                        ? 'bg-indigo-600' 
                        : 'bg-indigo-200 hover:bg-indigo-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 最近动态 */}
        {stats.total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>数据统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">草稿</span>
                    <span className="text-sm font-medium">{stats.draft}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${stats.total ? (stats.draft / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">审核中</span>
                    <span className="text-sm font-medium">{stats.processing}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${stats.total ? (stats.processing / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">已通过</span>
                    <span className="text-sm font-medium">{stats.approved}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${stats.total ? (stats.approved / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
