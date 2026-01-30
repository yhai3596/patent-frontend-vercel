import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDisclosure } from '@/hooks/useDisclosure';
import { navigate } from '@/router';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreVertical, 
  Edit, 
  Trash2, 
  FileText,
  FileType,
  Printer
} from 'lucide-react';
import { STATUS_MAP, DISCLOSURE_TYPES } from '@/constants';
import type { Disclosure, DisclosureStatus } from '@/types';
import { exportToWord, exportToPDF, downloadFile } from '@/services/export';

const DisclosureList: React.FC = () => {
  const { user } = useAuth();
  const { disclosures, loadDisclosures, deleteDisclosure } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDisclosure, setSelectedDisclosure] = useState<Disclosure | null>(null);

  useEffect(() => {
    if (user) {
      loadDisclosures(user.id);
    }
  }, [user, loadDisclosures]);

  // 过滤交底书
  const filteredDisclosures = disclosures.filter(d => {
    const matchesSearch = d.content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesType = typeFilter === 'all' || d.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // 排序：最新的在前
  const sortedDisclosures = [...filteredDisclosures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleDelete = () => {
    if (selectedDisclosure) {
      deleteDisclosure(selectedDisclosure.id);
      setDeleteDialogOpen(false);
      setSelectedDisclosure(null);
    }
  };

  const handleExportWord = async (disclosure: Disclosure) => {
    try {
      const blob = await exportToWord(disclosure);
      const filename = `${disclosure.content.title || '技术交底书'}_${disclosure.id}.docx`;
      downloadFile(blob, filename);
    } catch (error) {
      alert('导出Word失败：' + (error as Error).message);
    }
  };

  const handleExportPDF = (disclosure: Disclosure) => {
    exportToPDF(disclosure);
  };

  const getStatusBadge = (status: DisclosureStatus) => {
    const config = STATUS_MAP[status];
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800'
    }[config.color];

    return (
      <Badge className={colorClasses} variant="secondary">
        {config.label}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的交底书</h2>
            <p className="text-gray-600 mt-1">
              共 {sortedDisclosures.length} 份交底书
            </p>
          </div>
          <Button onClick={() => navigate('/disclosure/new')}>
            <Plus className="w-4 h-4 mr-2" />
            新建交底书
          </Button>
        </div>

        {/* 筛选栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索标题或编号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="processing">审核中</SelectItem>
                  <SelectItem value="review">需修改</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {DISCLOSURE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 交底书列表 */}
        {sortedDisclosures.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无交底书
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? '没有找到符合条件的交底书'
                  : '开始创建您的第一份技术交底书吧'}
              </p>
              {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <Button onClick={() => navigate('/disclosure/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建交底书
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDisclosures.map((disclosure) => (
              <Card key={disclosure.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {disclosure.content.title || '未命名交底书'}
                        </h3>
                        {getStatusBadge(disclosure.status)}
                        <Badge variant="outline">{disclosure.type}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>编号: {disclosure.id}</span>
                        <span>作者: {disclosure.authorName}</span>
                        <span>
                          更新: {new Date(disclosure.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${disclosure.qualityScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          完整度: {disclosure.qualityScore}%
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/disclosure/edit/${disclosure.id}`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportWord(disclosure)}>
                          <FileType className="w-4 h-4 mr-2" />
                          导出Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPDF(disclosure)}>
                          <Printer className="w-4 h-4 mr-2" />
                          导出PDF/打印
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedDisclosure(disclosure);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除交底书 "{selectedDisclosure?.content.title || '未命名'}" 吗？
                此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedDisclosure(null)}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default DisclosureList;
