import React, { useEffect, useState } from 'react';
import { useParams } from '@/router';
import { useAuth } from '@/hooks/useAuth';
import { useDisclosure } from '@/hooks/useDisclosure';
import { navigate } from '@/router';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Tooltip components available for future use
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Save, 
  Wand2, 
  Upload, 
  FileText,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Loader2,
  X,
  Sparkles,
  FileSearch
} from 'lucide-react';
import { DISCLOSURE_CHAPTERS, DISCLOSURE_TYPES, FILE_LIMITS } from '@/constants';
import type { DisclosureContent, ChapterCompleteness, Attachment } from '@/types';
import { getErrorAlert } from '@/services/ai';
import { aiModelManager } from '@/services/ai/manager';

const DisclosureEdit: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { 
    currentDisclosure, 
    loadDisclosureById, 
    createDisclosure,
    updateDisclosure,
    calculateCompleteness,
    calculateQualityScore,
    loading,
    error: disclosureError
  } = useDisclosure();

  const [content, setContent] = useState<DisclosureContent>({
    title: '',
    technicalField: '',
    backgroundArt: '',
    inventionContent: '',
    technicalSolution: '',
    beneficialEffects: '',
    figureDescription: '',
    implementation: '',
    claimsSuggestion: ''
  });
  
  const [disclosureType, setDisclosureType] = useState<'发明专利' | '实用新型' | '外观设计'>('发明专利');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [completeness, setCompleteness] = useState<ChapterCompleteness[]>([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  
  // 自动提取相关状态
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{
    isPatentDocument: boolean;
    documentType: string;
    extractedData: Partial<DisclosureContent>;
    confidence: number;
    missingInfo: string[];
    suggestions: string[];
    provider: string;
  } | null>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  
  // AI错误提示
  const [aiError, setAiError] = useState<import('@/services/ai/types').AIError | null>(null);

  // 初始化
  useEffect(() => {
    if (id) {
      loadDisclosureById(id);
    } else {
      // 新建交底书
      if (user) {
        createDisclosure('发明专利', user.id, user.name)
          .then(newDisclosure => {
            navigate(`/disclosure/edit/${newDisclosure.id}`);
          })
          .catch(err => {
            console.error('创建交底书失败:', err);
          });
      }
    }
  }, [id, user]);

  // 加载交底书数据
  useEffect(() => {
    if (currentDisclosure) {
      setContent(currentDisclosure.content);
      setDisclosureType(currentDisclosure.type);
      setAttachments(currentDisclosure.attachments || []);
    }
  }, [currentDisclosure]);

  // 计算完整性和质量评分
  useEffect(() => {
    if (currentDisclosure) {
      const completenessData = calculateCompleteness({
        ...currentDisclosure,
        content
      });
      setCompleteness(completenessData);
      
      const score = calculateQualityScore({
        ...currentDisclosure,
        content
      });
      setQualityScore(score);
    }
  }, [content, currentDisclosure, calculateCompleteness, calculateQualityScore]);

  // 自动保存
  useEffect(() => {
    if (!currentDisclosure) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 30000); // 30秒自动保存

    return () => clearTimeout(timer);
  }, [content, disclosureType, attachments]);

  const handleContentChange = (field: keyof DisclosureContent, value: string) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!currentDisclosure) return;
    
    setSaving(true);
    try {
      updateDisclosure(currentDisclosure.id, {
        content,
        type: disclosureType,
        attachments,
        qualityScore,
        completeness
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePolish = async (field: keyof DisclosureContent) => {
    if (!content[field]) return;
    
    const chapter = DISCLOSURE_CHAPTERS.find(c => c.key === field);
    if (!chapter) return;

    setPolishing(prev => ({ ...prev, [field]: true }));
    setAiError(null);
    
    try {
      const polished = await aiModelManager.polishContent(content[field], chapter.label);
      handleContentChange(field, polished);
    } catch (error: any) {
      console.error('AI润色失败:', error);
      setAiError(error);
    } finally {
      setPolishing(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型和大小
    const isImage = FILE_LIMITS.image.types.includes(file.type as 'image/png' | 'image/jpeg' | 'image/jpg');
    const isPDF = FILE_LIMITS.pdf.types.includes(file.type as 'application/pdf');

    if (!isImage && !isPDF) {
      alert('不支持的文件格式，请上传图片或PDF文件');
      return;
    }

    if (isImage && file.size > FILE_LIMITS.image.maxSize) {
      alert('图片文件大小不能超过10MB');
      return;
    }

    if (isPDF && file.size > FILE_LIMITS.pdf.maxSize) {
      alert('PDF文件大小不能超过50MB');
      return;
    }

    setUploading(true);

    try {
      // 读取文件为base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // 添加附件
        const newAttachment: Attachment = {
          id: `att-${Date.now()}`,
          name: file.name,
          type: isImage ? 'image' : 'pdf',
          data: base64,
          size: file.size
        };
        
        setAttachments(prev => [...prev, newAttachment]);

        // 如果是图片且配置了API Key，进行AI分析
        if (isImage && aiModelManager.hasAvailableModel()) {
          try {
            const result = await aiModelManager.analyzeImage(base64.split(',')[1]);
            // 填充提取的数据
            if (result.extractedData) {
              setContent(prev => ({
                ...prev,
                ...result.extractedData
              }));
            }
          } catch (error) {
            console.error('AI分析失败:', error);
          }
        }

        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      alert('文件上传失败');
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // 自动提取附件内容
  const handleExtractFromAttachment = async (attachment: Attachment) => {
    if (!aiModelManager.hasAvailableModel()) {
      setAiError({
        type: 'UNCONFIGURED',
        message: '没有可用的AI模型',
        suggestion: '请先配置AI模型，点击"AI设置"进行配置'
      });
      navigate('/ai-settings');
      return;
    }

    setSelectedAttachment(attachment);
    setExtracting(true);
    setExtractResult(null);
    setAiError(null);

    try {
      // 如果是图片，使用图片分析
      if (attachment.type === 'image') {
        const base64Data = attachment.data.split(',')[1];
        const result = await aiModelManager.analyzeImage(base64Data);
        setExtractResult({
          isPatentDocument: result.confidence > 0.6,
          documentType: '技术图纸/图片',
          extractedData: result.extractedData,
          confidence: result.confidence,
          missingInfo: [],
          suggestions: ['请检查提取内容是否准确'],
          provider: 'doubao'
        });
      } else {
        // PDF直接使用Base64提取
        console.log('开始提取PDF内容...');
        const result = await aiModelManager.extractFromPDFBase64(attachment.data, attachment.name);
        setExtractResult(result);
      }
      
      setExtractDialogOpen(true);
    } catch (error: any) {
      console.error('提取失败:', error);
      setAiError(error);
    } finally {
      setExtracting(false);
    }
  };

  // 应用提取的内容
  const applyExtractedData = () => {
    if (!extractResult?.extractedData) return;

    const newContent = { ...content };
    let appliedCount = 0;

    // 遍历提取的数据，应用到表单
    Object.entries(extractResult.extractedData).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.trim()) {
        const fieldKey = key as keyof DisclosureContent;
        if (fieldKey in newContent) {
          // 如果原内容为空，直接填充；否则追加
          if (!newContent[fieldKey]) {
            newContent[fieldKey] = value;
            appliedCount++;
          }
        }
      }
    });

    setContent(newContent);
    setExtractDialogOpen(false);
    
    if (appliedCount > 0) {
      alert(`成功应用了 ${appliedCount} 个字段的内容`);
    } else {
      alert('没有新的内容可以应用，可能是表单已填写或提取内容为空');
    }
  };

  const getCompletenessStatus = (chapterKey: string) => {
    const status = completeness.find(c => c.chapter === chapterKey);
    return status;
  };

  if (!currentDisclosure) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          {loading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-gray-500">加载中...</p>
            </>
          ) : disclosureError ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div className="text-center">
                <p className="text-red-600 font-medium">加载失败</p>
                <p className="text-gray-500 text-sm mt-1">{disclosureError}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => id ? loadDisclosureById(id) : window.location.reload()}
                >
                  重试
                </Button>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-yellow-500" />
              <p className="text-gray-500">请稍候...</p>
            </>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/disclosures')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h2 className="text-2xl font-bold text-gray-900">
              {id ? '编辑交底书' : '新建交底书'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* AI设置 */}
            <Button 
              variant="outline" 
              onClick={() => navigate('/ai-settings')}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {aiModelManager.hasAvailableModel() ? 'AI已配置' : '配置AI'}
            </Button>
            
            {/* 保存按钮 */}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 质量评分卡片 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">完整性评分</h3>
                <p className="text-sm text-gray-600">
                  基于"三步法"方法论评估交底书质量
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-blue-600">{qualityScore}</span>
                <span className="text-gray-500">/100</span>
              </div>
            </div>
            <Progress value={qualityScore} className="h-2" />
            
            {qualityScore < 60 && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">需要完善</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  交底书内容尚不完整，建议补充以下章节：
                  {completeness
                    .filter(c => !c.filled)
                    .map(c => DISCLOSURE_CHAPTERS.find(ch => ch.key === c.chapter)?.label)
                    .filter(Boolean)
                    .join('、')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* AI错误提示 */}
        {aiError && (
          <Alert className={
            aiError.type === 'UNCONFIGURED' || aiError.type === 'NO_QUOTA' || aiError.type === 'RATE_LIMIT' || aiError.type === 'TIMEOUT'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }>
            <AlertCircle className={
              aiError.type === 'UNCONFIGURED' || aiError.type === 'NO_QUOTA' || aiError.type === 'RATE_LIMIT' || aiError.type === 'TIMEOUT'
                ? 'w-4 h-4 text-yellow-600'
                : 'w-4 h-4 text-red-600'
            } />
            <AlertTitle className={
              aiError.type === 'UNCONFIGURED' || aiError.type === 'NO_QUOTA' || aiError.type === 'RATE_LIMIT' || aiError.type === 'TIMEOUT'
                ? 'text-yellow-800'
                : 'text-red-800'
            }>
              {getErrorAlert(aiError).title}
            </AlertTitle>
            <AlertDescription className={
              aiError.type === 'UNCONFIGURED' || aiError.type === 'NO_QUOTA' || aiError.type === 'RATE_LIMIT' || aiError.type === 'TIMEOUT'
                ? 'text-yellow-700'
                : 'text-red-700'
            }>
              {aiError.message}
              <div className="mt-2 text-sm">
                <strong>建议：</strong>{aiError.suggestion}
              </div>
              <div className="mt-3 flex gap-2">
                {aiError.type === 'UNCONFIGURED' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigate('/ai-settings')}
                  >
                    立即配置
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setAiError(null)}
                >
                  关闭提示
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 文件上传 */}
        <Card>
          <CardHeader>
            <CardTitle>附件上传</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600">
                      {uploading ? '上传中...' : '上传图片或PDF'}
                    </span>
                  </div>
                </Label>
                <span className="text-sm text-gray-500">
                  支持 PNG、JPG、PDF，最大 10MB
                </span>
              </div>

              {/* 附件列表 */}
              {attachments.length > 0 && (
                <div className="space-y-3">
                  {attachments.map(att => (
                    <div 
                      key={att.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="text-sm">{att.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(att.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 自动提取按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExtractFromAttachment(att)}
                          disabled={extracting || !aiModelManager.hasAvailableModel()}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {extracting && selectedAttachment?.id === att.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              提取中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              自动提取
                            </>
                          )}
                        </Button>
                        <button 
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* AI配置提示 */}
              {attachments.length > 0 && !aiModelManager.hasAvailableModel() && (
                <Alert className="bg-blue-50 border-blue-200">
                  <FileSearch className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    配置AI模型后，可使用自动提取功能从附件中智能提取交底书内容。
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => navigate('/ai-settings')}
                      className="p-0 h-auto"
                    >
                      去配置
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>专利类型</Label>
              <Select value={disclosureType} onValueChange={(v) => setDisclosureType(v as typeof disclosureType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCLOSURE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 各章节编辑 */}
        <div className="space-y-6">
          {DISCLOSURE_CHAPTERS.map((chapter) => {
            const status = getCompletenessStatus(chapter.key);
            const isPolishing = polishing[chapter.key];
            const chapterConfig = chapter as typeof DISCLOSURE_CHAPTERS[number] & { 
              guideQuestions?: string[];
              rows?: number;
            };

            return (
              <Card key={chapter.key} className={status?.filled ? 'border-green-200' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {chapter.label}
                        {chapter.required && <span className="text-red-500 ml-1">*</span>}
                      </CardTitle>
                      {status?.filled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    
                    {content[chapter.key as keyof DisclosureContent] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePolish(chapter.key as keyof DisclosureContent)}
                        disabled={isPolishing || !aiModelManager.hasAvailableModel()}
                      >
                        {isPolishing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        AI润色
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{chapter.hint}</p>
                </CardHeader>
                <CardContent>
                  {chapterConfig.guideQuestions && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Lightbulb className="w-4 h-4" />
                        <span className="font-medium">撰写指导</span>
                      </div>
                      <ul className="text-sm text-blue-600 space-y-1">
                        {chapterConfig.guideQuestions.map((q: string, i: number) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Textarea
                    value={content[chapter.key as keyof DisclosureContent]}
                    onChange={(e) => handleContentChange(chapter.key as keyof DisclosureContent, e.target.value)}
                    placeholder={chapter.placeholder}
                    rows={chapterConfig.rows || 4}
                    className="resize-y"
                  />

                  {status && !status.filled && status.suggestions.length > 0 && (
                    <div className="mt-2 text-sm text-yellow-600">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      {status.suggestions[0]}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 提取结果预览对话框 */}
        {extractDialogOpen && extractResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      AI提取结果预览
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      从 "{selectedAttachment?.name}" 提取的内容
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">置信度:</span>
                    <Badge variant={extractResult.confidence > 0.7 ? 'default' : 'secondary'}>
                      {(extractResult.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文档类型判断 */}
                <Alert className={extractResult.isPatentDocument ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
                  <AlertCircle className={`w-4 h-4 ${extractResult.isPatentDocument ? 'text-green-600' : 'text-yellow-600'}`} />
                  <AlertDescription className={extractResult.isPatentDocument ? 'text-green-700' : 'text-yellow-700'}>
                    {extractResult.isPatentDocument 
                      ? `✅ 检测到专利相关文档（${extractResult.documentType}）`
                      : `⚠️ 未检测到专利相关内容（${extractResult.documentType}），请检查文档内容`
                    }
                  </AlertDescription>
                </Alert>

                {/* 提取的字段 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">提取到的内容：</h4>
                  {Object.entries(extractResult.extractedData).map(([key, value]) => {
                    if (!value || typeof value !== 'string' || !value.trim()) return null;
                    const chapter = DISCLOSURE_CHAPTERS.find(c => c.key === key);
                    if (!chapter) return null;
                    
                    return (
                      <div key={key} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-700">{chapter.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {value.length} 字
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{value}</p>
                      </div>
                    );
                  })}
                  {Object.keys(extractResult.extractedData).filter(k => extractResult.extractedData[k as keyof DisclosureContent]).length === 0 && (
                    <p className="text-gray-500 text-center py-4">未提取到有效内容</p>
                  )}
                </div>

                {/* 缺失信息 */}
                {extractResult.missingInfo.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <h4 className="font-medium text-sm text-yellow-800 mb-2">文档中缺失的信息：</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {extractResult.missingInfo.map((info, i) => (
                        <li key={i}>• {info}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 建议 */}
                {extractResult.suggestions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="font-medium text-sm text-blue-800 mb-2">建议：</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {extractResult.suggestions.map((suggestion, i) => (
                        <li key={i}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setExtractDialogOpen(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={applyExtractedData}
                    disabled={!extractResult.isPatentDocument || Object.keys(extractResult.extractedData).filter(k => extractResult.extractedData[k as keyof DisclosureContent]).length === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    应用提取的内容
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DisclosureEdit;
