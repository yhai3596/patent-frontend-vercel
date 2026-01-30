import { BaseAdapter } from './base';
import type { AIModelConfig, ExtractionResult, AIParseResult } from '../types';
import { AI_PROMPTS } from '../index';

// OpenAI兼容格式适配器（适用于Kimi、DeepSeek、GLM、OpenAI等）
export class OpenAICompatibleAdapter extends BaseAdapter {
  provider: import('../index').AIProvider;
  name: string;

  constructor(config: AIModelConfig) {
    super(config);
    this.provider = config.provider;
    this.name = config.name || config.provider;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.baseURL && !!this.config.modelId;
  }

  // 分析图片 - 使用base64格式（如果模型支持）
  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult> {
    try {
      // 构建消息内容
      const content: any[] = [
        { type: 'text', text: prompt || AI_PROMPTS.imageAnalysis },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ];

      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
        messages: [
          {
            role: 'user',
            content
          }
        ],
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 4000
      });

      const content_text = response.choices[0]?.message?.content || '';
      return this.parseAIResponse(content_text);
    } catch (error: any) {
      // 如果模型不支持图片，返回友好的错误
      if (error.message?.includes('image') || error.message?.includes('vision')) {
        throw {
          type: 'MODEL_NOT_FOUND',
          message: `${this.name} 不支持图片分析`,
          suggestion: '请使用豆包视觉模型分析图片，或切换到支持图片的模型',
          provider: this.provider
        };
      }
      throw error;
    }
  }

  // 分析文档
  async analyzeDocument(_fileId: string, prompt?: string): Promise<AIParseResult> {
    try {
      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的专利分析师。'
          },
          {
            role: 'user',
            content: prompt || AI_PROMPTS.extractFromAttachment
          }
        ],
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAIResponse(content);
    } catch (error: any) {
      throw error;
    }
  }

  // 上传文件 - OpenAI兼容格式不支持文件上传，使用base64方式
  async uploadFile(file: File): Promise<string> {
    // 对于OpenAI兼容接口，直接将文件转为base64返回
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 从PDF Base64提取
  async extractFromPDFBase64(_base64Data: string, filename: string): Promise<ExtractionResult> {
    try {
      console.log(`[${this.name}] 开始提取PDF内容`);
      
      // 对于不支持文件上传的模型，使用文本描述方式
      // 提取文件名作为上下文
      const fileInfo = `文件名: ${filename}`;
      
      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的专利分析师，擅长从PDF文档中提取专利交底书的关键信息。请严格按照用户要求返回JSON格式数据。'
          },
          {
            role: 'user',
            content: `${AI_PROMPTS.extractFromAttachment}\n\n${fileInfo}\n\n注意：由于当前模型不支持直接读取PDF文件内容，请基于一般技术交底书的格式和用户提供的信息，给出示例性的提取结果，并明确告知用户需要手动填写实际内容。`
          }
        ],
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 4000
      }, 120000);

      const content = response.choices[0]?.message?.content || '';
      console.log(`[${this.name}] AI返回内容长度:`, content.length);
      
      const result = this.parseExtractionResponse(content);
      
      // 添加提示，说明该模型不支持PDF直接读取
      if (!result.suggestions.includes('当前模型不支持直接读取PDF内容，请手动填写或使用豆包模型')) {
        result.suggestions.push('当前模型不支持直接读取PDF内容，请手动填写或使用豆包模型');
      }
      
      return { ...result, provider: this.provider };
    } catch (error: any) {
      console.error(`[${this.name}] PDF提取失败:`, error);
      throw error;
    }
  }

  // AI润色
  async polishContent(content: string, sectionName: string): Promise<string> {
    try {
      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
        messages: [
          {
            role: 'user',
            content: `${AI_PROMPTS.polishContent(sectionName)}\n\n${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: this.config.maxTokens || 4000
      });

      return response.choices[0]?.message?.content || content;
    } catch (error: any) {
      throw error;
    }
  }

  // 完整性检查
  async checkCompleteness(disclosureData: any): Promise<{ score: number; suggestions: string[] }> {
    try {
      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
        messages: [
          {
            role: 'user',
            content: `${AI_PROMPTS.completenessCheck}\n\n交底书内容：\n${JSON.stringify(disclosureData, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: this.config.maxTokens || 4000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseCompletenessResponse(content);
    } catch (error: any) {
      return { score: 0, suggestions: ['检查失败，请稍后重试'] };
    }
  }

  // 解析AI响应
  private parseAIResponse(content: string): AIParseResult {
    try {
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
      
      return {
        domain: 'other',
        extractedData: { backgroundArt: content },
        confidence: 0.5
      };
    } catch (e) {
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
}
