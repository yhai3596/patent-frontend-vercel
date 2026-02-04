import type { AIModelConfig, AIError, AIErrorType, ExtractionResult, DisclosureContent } from '../types';

// AI模型适配器基类
export abstract class BaseAdapter {
  protected config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  abstract provider: string;
  abstract name: string;

  // 检查配置是否完整
  abstract isConfigured(): boolean;

  // 发送请求
  protected async request(endpoint: string, body: any, timeout: number = 60000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.parseError(errorData);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw {
          type: 'TIMEOUT',
          message: '请求超时，请稍后重试',
          retryable: true
        } as AIError;
      }
      throw error;
    }
  }

  // 解析错误
  protected parseError(error: any): AIError {
    console.error('解析错误:', error);
    
    const message = error.message || error.error?.message || '未知错误';
    
    // 豆包API错误码映射
    if (message.includes('rate limit') || message.includes('RateLimit')) {
      return {
        type: 'RATE_LIMIT',
        message: '请求过于频繁，请稍后重试',
        retryable: true
      };
    }
    
    if (message.includes('timeout') || message.includes('Timeout')) {
      return {
        type: 'TIMEOUT',
        message: '请求超时，请稍后重试',
        retryable: true
      };
    }
    
    if (message.includes('invalid') || message.includes('Invalid')) {
      return {
        type: 'INVALID_CONTENT',
        message: '内容格式无效，请检查输入',
        retryable: false
      };
    }
    
    if (message.includes('size') || message.includes('too large')) {
      return {
        type: 'FILE_TOO_LARGE',
        message: '文件大小超过限制（最大512MB）',
        retryable: false
      };
    }
    
    if (message.includes('unauthorized') || message.includes('Unauthorized')) {
      return {
        type: 'AUTH_ERROR',
        message: 'API Key无效或已过期，请检查配置',
        retryable: false
      };
    }

    return {
      type: 'NETWORK_ERROR',
      message: message || '网络错误，请检查网络连接',
      retryable: true
    };
  }

  // 解析提取响应 - 增强版
  protected parseExtractionResponse(content: string): ExtractionResult {
    console.log('解析提取响应，原始内容长度:', content.length);
    console.log('原始内容前500字:', content.substring(0, 500));
    
    try {
      // 尝试提取JSON
      let jsonStr = content;
      
      // 处理可能的markdown代码块
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
        console.log('从代码块提取JSON');
      }
      
      // 尝试找到JSON对象
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('未找到JSON对象');
        return this.createEmptyResult('未找到JSON格式的响应');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      console.log('成功解析JSON:', Object.keys(data));
      
      // 提取数据
      const extractedData = data.extractedData || {};
      
      // 构建结果
      const result: ExtractionResult = {
        isPatentDocument: data.isPatentDocument !== false, // 默认为true
        documentType: data.documentType || '技术交底书',
        extractedData: {
          title: extractedData.title || '',
          technicalField: extractedData.technicalField || '',
          backgroundArt: extractedData.backgroundArt || '',
          inventionContent: extractedData.inventionContent || extractedData.technicalSolution || '',
          technicalSolution: extractedData.technicalSolution || '',
          beneficialEffects: extractedData.beneficialEffects || '',
          figureDescription: extractedData.figureDescription || '',
          implementation: extractedData.implementation || '',
          claimsSuggestion: extractedData.claimsSuggestion || ''
        },
        confidence: data.confidence || 0.5,
        missingInfo: data.missingInfo || [],
        suggestions: data.suggestions || [],
        provider: this.provider
      };
      
      // 如果置信度太低，给出提示
      if (result.confidence < 0.3) {
        result.suggestions.push('AI提取置信度较低，建议手动检查并补充内容');
      }
      
      console.log('解析结果:', {
        isPatentDocument: result.isPatentDocument,
        documentType: result.documentType,
        confidence: result.confidence,
        hasTitle: !!result.extractedData.title,
        hasTechnicalField: !!result.extractedData.technicalField
      });
      
      return result;
    } catch (e: any) {
      console.error('解析提取响应失败:', e);
      return this.createEmptyResult(`解析响应失败: ${e.message}`);
    }
  }
  
  // 创建空结果
  private createEmptyResult(reason: string): ExtractionResult {
    return {
      isPatentDocument: false,
      documentType: '未知',
      extractedData: {
        title: '',
        technicalField: '',
        backgroundArt: '',
        inventionContent: '',
        technicalSolution: '',
        beneficialEffects: '',
        figureDescription: '',
        implementation: '',
        claimsSuggestion: ''
      },
      confidence: 0,
      missingInfo: ['无法解析AI响应'],
      suggestions: [reason, '请尝试重新上传文件或使用手动填写'],
      provider: this.provider
    };
  }
}
