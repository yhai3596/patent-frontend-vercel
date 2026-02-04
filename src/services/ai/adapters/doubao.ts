import { BaseAdapter } from './base';
import type { AIModelConfig, ExtractionResult, AIParseResult } from '../types';
import { AI_PROMPTS } from '../index';

// 豆包适配器
export class DoubaoAdapter extends BaseAdapter {
  provider = 'doubao' as const;
  name: string;

  constructor(config: AIModelConfig) {
    super(config);
    this.name = config.name || '豆包';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.baseURL && !!this.config.modelId;
  }

  // 分析图片 - 使用视觉模型
  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult> {
    try {
      // 豆包视觉模型
      const visionModel = 'doubao-1-5-vision-pro-32k-250115';
      
      const response = await this.request('/chat/completions', {
        model: visionModel,
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

  // 上传文件
  async uploadFile(file: File): Promise<string> {
    try {
      if (file.size > 512 * 1024 * 1024) {
        throw this.parseError({ message: 'file size too large' });
      }

      const formData = new FormData();
      formData.append('purpose', 'user_data');
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(`${this.config.baseURL}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
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
      return data.id;
    } catch (error: any) {
      throw error;
    }
  }

  // 从PDF Base64提取
  async extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult> {
    try {
      console.log(`[${this.name}] 开始提取PDF内容`);
      
      // 将base64转换为File对象
      const base64Content = base64Data.split(',')[1] || base64Data;
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      // 上传文件
      const fileId = await this.uploadFile(file);
      console.log(`[${this.name}] 文件上传成功，fileId:`, fileId);
      
      // 使用chat completions API提取内容 - 使用file_url格式引用文件
      const response = await this.request('/chat/completions', {
        model: this.config.modelId,
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
                  url: fileId  // 豆包API使用file_id直接引用
                }
              },
              {
                type: 'text',
                text: AI_PROMPTS.extractFromAttachment
              }
            ]
          }
        ],
        temperature: this.config.temperature || 0.3,
        max_tokens: 65535  // 使用更大的token限制以处理长文档
      }, 180000);  // 增加超时到180秒

      const content = response.choices[0]?.message?.content || '';
      console.log(`[${this.name}] AI返回内容长度:`, content.length);
      console.log(`[${this.name}] AI返回内容前500字:`, content.substring(0, 500));
      
      const result = this.parseExtractionResponse(content);
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
