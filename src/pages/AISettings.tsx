import React, { useState, useEffect } from 'react';
import { aiModelManager } from '@/services/ai/manager';
import type { AIModelConfig, AIProvider } from '@/services/ai/types';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'doubao', label: '豆包 (火山引擎)' },
  { value: 'kimi', label: 'Kimi (Moonshot)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'glm', label: '智谱 GLM' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: '自定义接口' },
];

const AISettings: React.FC = () => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [status, setStatus] = useState<ReturnType<typeof aiModelManager.getModelStatus> | null>(null);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ modelId: string; success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = () => {
    const allModels = aiModelManager.getAllModels();
    setModels(allModels);
    setStatus(aiModelManager.getModelStatus());
  };

  const handleAddModel = () => {
    setEditingModel({
      provider: 'custom',
      name: '',
      modelId: '',
      baseURL: '',
      apiKey: '',
      enabled: true,
      priority: models.length + 1,
      maxTokens: 4000,
      temperature: 0.3
    });
    setDialogOpen(true);
  };

  const handleEditModel = (model: AIModelConfig) => {
    setEditingModel({ ...model });
    setDialogOpen(true);
  };

  const handleSaveModel = () => {
    if (!editingModel) return;

    if (editingModel.modelId && models.find(m => m.modelId === editingModel.modelId)) {
      // 更新现有模型
      aiModelManager.updateModel(editingModel.modelId, editingModel);
    } else {
      // 添加新模型
      aiModelManager.addModel(editingModel);
    }

    setDialogOpen(false);
    setEditingModel(null);
    loadModels();
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm('确定要删除这个模型配置吗？')) {
      aiModelManager.removeModel(modelId);
      loadModels();
    }
  };

  const isDefaultModel = (modelId: string): boolean => {
    const defaultModelIds = [
      'doubao-1-5-pro-32k-250115',
      'doubao-seed-1-8-250615',
      'moonshot-v1-32k',
      'deepseek-chat',
      'glm-4',
      'gpt-4'
    ];
    return defaultModelIds.includes(modelId);
  };

  const handleToggleEnabled = (modelId: string, enabled: boolean) => {
    aiModelManager.setModelEnabled(modelId, enabled);
    loadModels();
  };

  const handleMovePriority = (modelId: string, direction: 'up' | 'down') => {
    const model = models.find(m => m.modelId === modelId);
    if (!model) return;

    const newPriority = direction === 'up' ? model.priority - 1 : model.priority + 1;
    aiModelManager.setModelPriority(modelId, newPriority);
    loadModels();
  };

  const handleTestModel = async (model: AIModelConfig) => {
    setTesting(model.modelId);
    setTestResult(null);

    try {
      // 简单的测试请求
      const adapter = aiModelManager.getAdapter(model.modelId);
      if (!adapter) {
        setTestResult({
          modelId: model.modelId,
          success: false,
          message: '无法创建适配器，请检查配置'
        });
        return;
      }

      // 测试润色功能
      await adapter.polishContent('这是一个测试内容', '测试章节');
      
      setTestResult({
        modelId: model.modelId,
        success: true,
        message: '连接成功！模型可用'
      });
    } catch (error: any) {
      setTestResult({
        modelId: model.modelId,
        success: false,
        message: error.message || '连接失败'
      });
    } finally {
      setTesting(null);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？所有自定义配置将丢失。')) {
      aiModelManager.resetToDefault();
      loadModels();
    }
  };

  const getProviderDocsUrl = (provider: AIProvider): string => {
    switch (provider) {
      case 'doubao':
        return 'https://www.volcengine.com/docs/82379';
      case 'kimi':
        return 'https://platform.moonshot.cn/docs';
      case 'deepseek':
        return 'https://platform.deepseek.com/api-docs';
      case 'glm':
        return 'https://open.bigmodel.cn/dev/howuse/introduction';
      case 'openai':
        return 'https://platform.openai.com/docs';
      default:
        return '';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              AI模型设置
            </h2>
            <p className="text-gray-600 mt-1">
              配置多个AI模型，系统会自动故障转移
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重置默认
            </Button>
            <Button onClick={handleAddModel}>
              <Plus className="w-4 h-4 mr-2" />
              添加模型
            </Button>
          </div>
        </div>

        {/* 状态概览 */}
        {status && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{status.total}</p>
                  <p className="text-sm text-gray-600">总模型数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{status.enabled}</p>
                  <p className="text-sm text-gray-600">已启用</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{status.configured}</p>
                  <p className="text-sm text-gray-600">已配置</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{status.available}</p>
                  <p className="text-sm text-gray-600">可用</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 模型列表 */}
        <div className="space-y-4">
          {models.sort((a, b) => a.priority - b.priority).map((model, index) => (
            <Card key={model.modelId} className={model.enabled && model.apiKey ? 'border-green-200' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 优先级控制 */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMovePriority(model.modelId, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <span className="text-center text-sm font-medium text-gray-500">
                        {model.priority}
                      </span>
                      <button
                        onClick={() => handleMovePriority(model.modelId, 'down')}
                        disabled={index === models.length - 1}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 模型信息 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{model.name}</span>
                        <Badge variant="secondary">{PROVIDER_OPTIONS.find(p => p.value === model.provider)?.label}</Badge>
                        {model.enabled && model.apiKey ? (
                          <Badge className="bg-green-100 text-green-800">可用</Badge>
                        ) : model.enabled ? (
                          <Badge variant="outline" className="text-yellow-600">未配置</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">已禁用</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        模型ID: {model.modelId || '未设置'}
                      </div>
                      {model.baseURL && (
                        <div className="text-sm text-gray-500">
                          API地址: {model.baseURL}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={model.enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(model.modelId, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestModel(model)}
                      disabled={testing === model.modelId || !model.apiKey}
                    >
                      {testing === model.modelId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (testResult && testResult.modelId === model.modelId) ? (
                        testResult.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      测试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditModel(model)}
                    >
                      编辑
                    </Button>
                    {!isDefaultModel(model.modelId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteModel(model.modelId)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 测试结果 */}
                {testResult && testResult.modelId === model.modelId && (
                  <Alert className={`mt-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 添加/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingModel && isDefaultModel(editingModel.modelId) 
                  ? '编辑模型' 
                  : '添加模型'}
              </DialogTitle>
              <DialogDescription>
                配置AI模型的API信息
              </DialogDescription>
            </DialogHeader>

            {editingModel && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>提供商</Label>
                  <Select
                    value={editingModel.provider}
                    onValueChange={(v) => {
                      const provider = v as AIProvider;
                      // 根据提供商设置默认的baseURL和modelId
                      const defaultConfigs: Record<AIProvider, { baseURL: string; modelId: string }> = {
                        doubao: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', modelId: 'doubao-1-5-pro-32k-250115' },
                        kimi: { baseURL: 'https://api.moonshot.cn/v1', modelId: 'moonshot-v1-32k' },
                        deepseek: { baseURL: 'https://api.deepseek.com/v1', modelId: 'deepseek-chat' },
                        glm: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', modelId: 'glm-4' },
                        openai: { baseURL: 'https://api.openai.com/v1', modelId: 'gpt-4' },
                        custom: { baseURL: '', modelId: '' }
                      };
                      const defaultConfig = defaultConfigs[provider];
                      setEditingModel({
                        ...editingModel,
                        provider,
                        baseURL: defaultConfig?.baseURL || '',
                        modelId: defaultConfig?.modelId || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>模型名称</Label>
                  <Input
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                    placeholder="如：豆包 Pro"
                  />
                </div>

                <div>
                  <Label>模型ID</Label>
                  <Input
                    value={editingModel.modelId}
                    onChange={(e) => setEditingModel({ ...editingModel, modelId: e.target.value })}
                    placeholder="如：doubao-1-5-pro-32k-250115"
                  />
                </div>

                <div>
                  <Label>API地址</Label>
                  <Input
                    value={editingModel.baseURL}
                    onChange={(e) => setEditingModel({ ...editingModel, baseURL: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={editingModel.apiKey}
                    onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                    placeholder="输入您的API Key"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>最大Token数</Label>
                    <Input
                      type="number"
                      value={editingModel.maxTokens}
                      onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>温度</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={editingModel.temperature}
                      onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                {editingModel.provider !== 'custom' && (
                  <div className="text-sm">
                    <a
                      href={getProviderDocsUrl(editingModel.provider)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      查看 {PROVIDER_OPTIONS.find(p => p.value === editingModel.provider)?.label} 文档
                    </a>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveModel}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 使用说明 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>1. <strong>优先级</strong>：数字越小优先级越高，系统会优先使用优先级高的模型</p>
            <p>2. <strong>故障转移</strong>：如果当前模型失败，系统会自动切换到下一个可用模型</p>
            <p>3. <strong>PDF提取</strong>：目前只有豆包模型支持直接读取PDF内容</p>
            <p>4. <strong>图片分析</strong>：豆包视觉模型支持图片分析，其他模型可能不支持</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AISettings;
