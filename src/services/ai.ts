import { DOUBAO_CONFIG, AI_PROMPTS, DOMAIN_KEYWORDS } from '@/constants';
import type { AIParseResult, TechnicalDomain } from '@/types';
import type { AIError } from './ai/types';

// 重新导出AI错误类型，确保类型统一
export type { AIError, AIErrorType } from './ai/types';

class AIService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    // 从localStorage获取API Key
    this.apiKey = localStorage.getItem('doubao_api_key') || '';
    this.baseURL = DOUBAO_CONFIG.baseURL;
  }

  // 设置API Key
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // 检查API Key是否配置
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // 解析错误类型
  private parseError(error: any): AIError {
    const errorMessage = error?.message || error?.error?.message || String(error);
    const errorCode = error?.error?.code || error?.code;

    // 未配置API Key
    if (!this.apiKey) {
      return {
        type: 'UNCONFIGURED',
        message: 'API Key未配置',
        suggestion: '请先点击右上角的"配置AI"按钮，输入您的豆包API Key'
      };
    }

    // 根据错误消息判断类型
    if (errorMessage.includes('does not exist') || errorMessage.includes('model') || errorCode === 'model_not_found') {
      return {
        type: 'MODEL_NOT_FOUND',
        message: 'AI模型不存在或已下架',
        suggestion: '当前使用的模型可能已下线，请联系开发者更新模型版本，或稍后再试'
      };
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid') || errorCode === 'invalid_api_key') {
      return {
        type: 'INVALID_KEY',
        message: 'API Key无效或已过期',
        suggestion: '请检查您的API Key是否正确，或前往火山方舟平台重新生成API Key'
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('insufficient') || errorCode === 'insufficient_quota') {
      return {
        type: 'NO_QUOTA',
        message: 'API调用额度不足',
        suggestion: '您的API调用额度已用完，请前往火山方舟平台充值或购买更多额度'
      };
    }

    if (errorMessage.includes('rate') || errorMessage.includes('too many') || errorCode === 'rate_limit_exceeded') {
      return {
        type: 'RATE_LIMIT',
        message: '请求过于频繁',
        suggestion: '请稍等片刻后再试，或降低请求频率'
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection') || error?.name === 'TypeError') {
      return {
        type: 'NETWORK_ERROR',
        message: '网络连接失败',
        suggestion: '请检查您的网络连接，或稍后重试'
      };
    }

    if (errorMessage.includes('timeout') || error?.name === 'AbortError') {
      return {
        type: 'TIMEOUT',
        message: '请求超时',
        suggestion: '服务器响应时间过长，请稍后重试，或检查文件大小是否过大'
      };
    }

    if (errorMessage.includes('content filter') || errorMessage.includes('safety') || errorCode === 'content_filter') {
      return {
        type: 'CONTENT_FILTER',
        message: '内容被安全过滤器拦截',
        suggestion: '上传的内容可能包含敏感信息，请检查内容后重试'
      };
    }

    if (errorMessage.includes('file') && errorMessage.includes('size')) {
      return {
        type: 'FILE_TOO_LARGE',
        message: '文件过大',
        suggestion: '请上传更小的文件，图片建议不超过10MB，PDF不超过50MB'
      };
    }

    if (errorMessage.includes('file') && errorMessage.includes('format')) {
      return {
        type: 'FILE_UNSUPPORTED',
        message: '不支持的文件格式',
        suggestion: '请上传PNG、JPG格式的图片或PDF文档'
      };
    }

    // 默认未知错误
    return {
      type: 'UNKNOWN',
      message: `AI服务调用失败: ${errorMessage}`,
      suggestion: '请检查网络连接和API配置，或稍后重试。如果问题持续，请联系技术支持',
      originalError: error
    };
  }

  // 通用请求方法
  private async request(endpoint: string, body: any): Promise<any> {
    if (!this.apiKey) {
      throw this.parseError({ message: 'API Key未配置' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.parseError({ 
          ...errorData, 
          status: response.status,
          statusText: response.statusText 
        });
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw this.parseError({ name: 'AbortError', message: 'timeout' });
      }
      // 如果是已解析的AIError，直接抛出
      if (error.type && error.message) {
        throw error;
      }
      throw this.parseError(error);
    }
  }

  // 图片理解 - 分析技术图纸
  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult> {
    try {
      const response = await this.request('/chat/completions', {
        model: DOUBAO_CONFIG.models.vision,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || AI_PROMPTS.imageAnalysis
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAIResponse(content);
    } catch (error: any) {
      console.error('图片分析失败:', error);
      throw error;
    }
  }

  // 文档理解 - 分析PDF
  async analyzeDocument(fileId: string, prompt?: string): Promise<AIParseResult> {
    try {
      const response = await this.request('/responses', {
        model: DOUBAO_CONFIG.models.document,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file_id: fileId
              },
              {
                type: 'input_text',
                text: prompt || AI_PROMPTS.documentAnalysis
              }
            ]
          }
        ]
      });

      const content = response.output?.[0]?.content?.[0]?.text || '';
      return this.parseAIResponse(content);
    } catch (error: any) {
      console.error('文档分析失败:', error);
      throw error;
    }
  }

  // 上传文件到豆包
  async uploadFile(file: File): Promise<string> {
    try {
      // 检查文件大小
      if (file.size > 512 * 1024 * 1024) {
        throw this.parseError({ message: 'file size too large' });
      }

      const formData = new FormData();
      formData.append('purpose', 'user_data');
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时（上传可能需要更长时间）

      const response = await fetch(`${this.baseURL}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.parseError(errorData);
      }

      const data = await response.json();
      return data.id; // 返回file_id
    } catch (error: any) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }

  // AI润色
  async polishContent(content: string, sectionName: string): Promise<string> {
    try {
      const response = await this.request('/chat/completions', {
        model: DOUBAO_CONFIG.models.chat,
        messages: [
          {
            role: 'user',
            content: `${AI_PROMPTS.polishContent(sectionName)}\n\n${content}`
          }
        ],
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || content;
    } catch (error: any) {
      console.error('AI润色失败:', error);
      throw error;
    }
  }

  // 完整性检查
  async checkCompleteness(disclosureData: any): Promise<{ score: number; suggestions: string[] }> {
    try {
      const response = await this.request('/chat/completions', {
        model: DOUBAO_CONFIG.models.chat,
        messages: [
          {
            role: 'user',
            content: `${AI_PROMPTS.completenessCheck}\n\n交底书内容：\n${JSON.stringify(disclosureData, null, 2)}`
          }
        ],
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseCompletenessResponse(content);
    } catch (error: any) {
      console.error('完整性检查失败:', error);
      return { score: 0, suggestions: ['检查失败，请稍后重试'] };
    }
  }

  // 从附件提取交底书内容 - 使用chat completions API
  async extractFromAttachment(fileId: string): Promise<{
    isPatentDocument: boolean;
    documentType: string;
    extractedData: Partial<import('@/types').DisclosureContent>;
    confidence: number;
    missingInfo: string[];
    suggestions: string[];
  }> {
    try {
      console.log('开始提取PDF内容，fileId:', fileId);
      
      // 使用chat completions API，更稳定
      const response = await this.request('/chat/completions', {
        model: DOUBAO_CONFIG.models.document,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的专利分析师，擅长从PDF文档中提取专利交底书的关键信息。请严格按照用户要求返回JSON格式数据。'
          },
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file_url: {
                  url: `https://ark.cn-beijing.volces.com/api/v3/files/${fileId}/content`
                }
              },
              {
                type: 'text',
                text: AI_PROMPTS.extractFromAttachment
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const content = response.choices?.[0]?.message?.content || '';
      console.log('AI返回的原始内容:', content);
      
      const result = this.parseExtractionResponse(content);
      console.log('解析后的结果:', result);
      
      return result;
    } catch (error: any) {
      console.error('附件提取失败:', error);
      throw error;
    }
  }

  // 从Base64 PDF提取内容（备用方案）
  async extractFromPDFBase64(base64Data: string, filename: string): Promise<{
    isPatentDocument: boolean;
    documentType: string;
    extractedData: Partial<import('@/types').DisclosureContent>;
    confidence: number;
    missingInfo: string[];
    suggestions: string[];
  }> {
    try {
      console.log('开始从Base64 PDF提取内容');
      
      // 先上传文件
      const byteCharacters = atob(base64Data.split(',')[1] || base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      const fileId = await this.uploadFile(file);
      return await this.extractFromAttachment(fileId);
    } catch (error: any) {
      console.error('Base64 PDF提取失败:', error);
      throw error;
    }
  }

  // 解析提取响应
  private parseExtractionResponse(content: string): {
    isPatentDocument: boolean;
    documentType: string;
    extractedData: Partial<import('@/types').DisclosureContent>;
    confidence: number;
    missingInfo: string[];
    suggestions: string[];
  } {
    try {
      // 尝试提取JSON - 支持多种格式
      // 1. 尝试直接解析整个内容
      try {
        const data = JSON.parse(content.trim());
        return this.normalizeExtractionResult(data);
      } catch (e) {
        // 不是纯JSON，继续尝试其他方式
      }
      
      // 2. 尝试提取```json代码块
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        const data = JSON.parse(codeBlockMatch[1].trim());
        return this.normalizeExtractionResult(data);
      }
      
      // 3. 尝试提取大括号包裹的内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return this.normalizeExtractionResult(data);
      }
      
      // 4. 如果都没匹配到，返回失败结果
      console.warn('无法从AI响应中提取JSON:', content);
      return {
        isPatentDocument: false,
        documentType: '解析失败',
        extractedData: {},
        confidence: 0,
        missingInfo: ['AI返回的内容格式不正确，无法解析'],
        suggestions: ['请重试，或手动填写交底书内容']
      };
    } catch (e) {
      console.error('解析提取响应失败:', e, '原始内容:', content);
      return {
        isPatentDocument: false,
        documentType: '解析失败',
        extractedData: {},
        confidence: 0,
        missingInfo: ['解析AI响应时发生错误'],
        suggestions: ['请重试，或手动填写交底书内容']
      };
    }
  }

  // 规范化提取结果
  private normalizeExtractionResult(data: any): {
    isPatentDocument: boolean;
    documentType: string;
    extractedData: Partial<import('@/types').DisclosureContent>;
    confidence: number;
    missingInfo: string[];
    suggestions: string[];
  } {
    // 确保extractedData存在且有正确结构
    const extractedData = data.extractedData || {};
    
    // 清理提取的数据，确保是字符串
    const cleanData: Partial<import('@/types').DisclosureContent> = {};
    const fields = ['title', 'technicalField', 'backgroundArt', 'inventionContent', 
                    'technicalSolution', 'beneficialEffects', 'figureDescription', 
                    'implementation', 'claimsSuggestion'];
    
    fields.forEach(field => {
      const value = extractedData[field];
      if (value && typeof value === 'string' && value.trim()) {
        cleanData[field as keyof import('@/types').DisclosureContent] = value.trim();
      }
    });

    // 判断是否提取到了有效内容
    const hasExtractedContent = Object.keys(cleanData).length > 0;
    
    // 如果有提取到内容，即使isPatentDocument为false，也设为true
    const isPatentDocument = hasExtractedContent ? true : (data.isPatentDocument ?? false);
    
    return {
      isPatentDocument,
      documentType: data.documentType || (hasExtractedContent ? '技术文档' : '未知'),
      extractedData: cleanData,
      confidence: hasExtractedContent ? Math.max(0.6, data.confidence || 0.5) : (data.confidence || 0),
      missingInfo: Array.isArray(data.missingInfo) ? data.missingInfo : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : 
                   (hasExtractedContent ? ['请检查提取内容是否准确'] : ['请重试或手动填写'])
    };
  }

  // 解析AI响应
  private parseAIResponse(content: string): AIParseResult {
    try {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          domain: data.domain || 'other',
          extractedData: {
            title: data.title || '',
            technicalField: data.technicalField || '',
            backgroundArt: data.backgroundArt || '',
            inventionContent: data.inventionContent || data.technicalSolution || '',
            technicalSolution: data.technicalSolution || '',
            beneficialEffects: data.beneficialEffects || ''
          },
          confidence: data.confidence || 0.8
        };
      }
      
      // 如果无法解析JSON，返回原始内容
      return {
        domain: 'other',
        extractedData: { backgroundArt: content },
        confidence: 0.5
      };
    } catch (e) {
      console.error('解析AI响应失败:', e);
      return {
        domain: 'other',
        extractedData: { backgroundArt: content },
        confidence: 0.5
      };
    }
  }

  // 解析完整性检查响应
  private parseCompletenessResponse(content: string): { score: number; suggestions: string[] } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          score: data.score || 0,
          suggestions: data.suggestions || []
        };
      }
      return { score: 0, suggestions: ['解析检查结果失败'] };
    } catch (e) {
      return { score: 0, suggestions: ['解析检查结果失败'] };
    }
  }

  // 识别技术领域
  detectDomain(content: string): TechnicalDomain {
    const scores: Record<TechnicalDomain, number> = {
      mechanical: 0,
      material: 0,
      software: 0,
      electronic: 0,
      other: 0
    };

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const keyword of keywords as unknown as string[]) {
        if (content.includes(keyword)) {
          scores[domain as TechnicalDomain]++;
        }
      }
    }

    // 找出得分最高的领域
    let maxDomain: TechnicalDomain = 'other';
    let maxScore = 0;
    
    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxDomain = domain as TechnicalDomain;
      }
    }

    return maxDomain;
  }
}

// 导出单例
export const aiService = new AIService();
export default aiService;

// 错误提示辅助函数
export function getErrorAlert(error: import('./ai/types').AIError | null | undefined): {
  title: string;
  description: string;
  variant: 'destructive' | 'default' | 'warning';
} {
  if (!error) {
    return {
      title: 'AI服务异常',
      description: '发生未知错误，请稍后重试',
      variant: 'destructive'
    };
  }
  
  switch (error.type) {
    case 'UNCONFIGURED':
      return {
        title: 'AI功能未配置',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'INVALID_KEY':
      return {
        title: 'API Key无效',
        description: error.suggestion,
        variant: 'destructive'
      };
    case 'NO_QUOTA':
      return {
        title: 'API额度不足',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'MODEL_NOT_FOUND':
      return {
        title: 'AI模型暂不可用',
        description: error.suggestion,
        variant: 'destructive'
      };
    case 'RATE_LIMIT':
      return {
        title: '请求过于频繁',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'NETWORK_ERROR':
      return {
        title: '网络连接失败',
        description: error.suggestion,
        variant: 'destructive'
      };
    case 'TIMEOUT':
      return {
        title: '请求超时',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'CONTENT_FILTER':
      return {
        title: '内容被拦截',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'FILE_TOO_LARGE':
      return {
        title: '文件过大',
        description: error.suggestion,
        variant: 'warning'
      };
    case 'FILE_UNSUPPORTED':
      return {
        title: '格式不支持',
        description: error.suggestion,
        variant: 'warning'
      };
    default:
      return {
        title: 'AI服务异常',
        description: error.suggestion,
        variant: 'destructive'
      };
  }
}
