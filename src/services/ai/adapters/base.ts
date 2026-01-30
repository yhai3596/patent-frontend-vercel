import type { AIModelAdapter, AIModelConfig, AIError, ExtractionResult, AIParseResult } from '../types';
import type { DisclosureContent } from '@/types';

// 基础适配器类
export abstract class BaseAdapter implements AIModelAdapter {
  abstract provider: import('../index').AIProvider;
  abstract name: string;
  config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.baseURL;
  }

  // 解析错误
  protected parseError(error: any): AIError {
    const errorMessage = error?.message || error?.error?.message || String(error);
    const errorCode = error?.error?.code || error?.code;

    if (!this.config.apiKey) {
      return {
        type: 'UNCONFIGURED',
        message: 'API Key未配置',
        suggestion: '请先配置API Key',
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('does not exist') || errorMessage.includes('model') || errorCode === 'model_not_found') {
      return {
        type: 'MODEL_NOT_FOUND',
        message: `模型 ${this.config.modelId} 不存在或已下架`,
        suggestion: `请更换其他模型，或检查模型ID是否正确`,
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid') || errorCode === 'invalid_api_key') {
      return {
        type: 'INVALID_KEY',
        message: 'API Key无效或已过期',
        suggestion: `请检查 ${this.name} 的API Key是否正确`,
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('insufficient') || errorCode === 'insufficient_quota') {
      return {
        type: 'NO_QUOTA',
        message: 'API调用额度不足',
        suggestion: `您的 ${this.name} 额度已用完，请充值或切换到其他模型`,
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('rate') || errorMessage.includes('too many') || errorCode === 'rate_limit_exceeded') {
      return {
        type: 'RATE_LIMIT',
        message: '请求过于频繁',
        suggestion: '请稍等片刻后再试，或切换到其他模型',
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection') || error?.name === 'TypeError') {
      return {
        type: 'NETWORK_ERROR',
        message: '网络连接失败',
        suggestion: '请检查网络连接，或切换到其他模型',
        provider: this.config.provider
      };
    }

    if (errorMessage.includes('timeout') || error?.name === 'AbortError') {
      return {
        type: 'TIMEOUT',
        message: '请求超时',
        suggestion: '服务器响应时间过长，请稍后重试或切换到其他模型',
        provider: this.config.provider
      };
    }

    return {
      type: 'UNKNOWN',
      message: `AI服务调用失败: ${errorMessage}`,
      suggestion: `请检查 ${this.name} 配置，或尝试切换到其他模型`,
      provider: this.config.provider,
      originalError: error
    };
  }

  // 通用请求方法
  protected async request(endpoint: string, body: any, timeout: number = 60000): Promise<any> {
    if (!this.config.apiKey) {
      throw this.parseError({ message: 'API Key未配置' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
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
      if (error.type && error.message) {
        throw error;
      }
      throw this.parseError(error);
    }
  }

  // 解析提取响应
  protected parseExtractionResponse(content: string): Omit<ExtractionResult, 'provider'> {
    try {
      // 尝试直接解析
      try {
        const data = JSON.parse(content.trim());
        return this.normalizeExtractionResult(data);
      } catch (e) {
        // 不是纯JSON，继续尝试其他方式
      }
      
      // 尝试提取```json代码块
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        const data = JSON.parse(codeBlockMatch[1].trim());
        return this.normalizeExtractionResult(data);
      }
      
      // 尝试提取大括号包裹的内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return this.normalizeExtractionResult(data);
      }
      
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
  protected normalizeExtractionResult(data: any): Omit<ExtractionResult, 'provider'> {
    const extractedData = data.extractedData || {};
    
    const cleanData: Partial<DisclosureContent> = {};
    const fields = ['title', 'technicalField', 'backgroundArt', 'inventionContent', 
                    'technicalSolution', 'beneficialEffects', 'figureDescription', 
                    'implementation', 'claimsSuggestion'];
    
    fields.forEach(field => {
      const value = extractedData[field];
      if (value && typeof value === 'string' && value.trim()) {
        cleanData[field as keyof DisclosureContent] = value.trim();
      }
    });

    const hasExtractedContent = Object.keys(cleanData).length > 0;
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

  // 抽象方法，子类必须实现
  abstract analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult>;
  abstract analyzeDocument(fileId: string, prompt?: string): Promise<AIParseResult>;
  abstract uploadFile(file: File): Promise<string>;
  abstract extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult>;
  abstract polishContent(content: string, sectionName: string): Promise<string>;
  abstract checkCompleteness(disclosureData: any): Promise<{ score: number; suggestions: string[] }>;
}
