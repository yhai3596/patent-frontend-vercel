// AI服务类型定义
import type { DisclosureContent, AIParseResult } from '@/types';

// 重新导出类型
export type { DisclosureContent, AIParseResult };

// AI提供商类型
export type AIProvider = 'doubao' | 'kimi' | 'deepseek' | 'glm' | 'openai' | 'custom';

// AI模型配置
export interface AIModelConfig {
  provider: AIProvider;
  name: string;
  modelId: string;
  baseURL: string;
  apiKey: string;
  enabled: boolean;
  priority: number; // 优先级，数字越小优先级越高
  maxTokens?: number;
  temperature?: number;
}

// AI错误类型
export type AIErrorType = 
  | 'UNCONFIGURED'
  | 'INVALID_KEY'
  | 'NO_QUOTA'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CONTENT_FILTER'
  | 'FILE_TOO_LARGE'
  | 'FILE_UNSUPPORTED'
  | 'ALL_FAILED'
  | 'UNKNOWN';

// AI错误信息
export interface AIError {
  type: AIErrorType;
  message: string;
  suggestion: string;
  provider?: AIProvider;
  originalError?: any;
}

// 提取结果
export interface ExtractionResult {
  isPatentDocument: boolean;
  documentType: string;
  extractedData: Partial<DisclosureContent>;
  confidence: number;
  missingInfo: string[];
  suggestions: string[];
  provider: AIProvider;
}

// 模型适配器接口
export interface AIModelAdapter {
  provider: AIProvider;
  name: string;
  config: AIModelConfig;
  
  // 检查配置是否有效
  isConfigured(): boolean;
  
  // 分析图片
  analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult>;
  
  // 分析文档
  analyzeDocument(fileId: string, prompt?: string): Promise<AIParseResult>;
  
  // 上传文件
  uploadFile(file: File): Promise<string>;
  
  // 从PDF Base64提取
  extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult>;
  
  // AI润色
  polishContent(content: string, sectionName: string): Promise<string>;
  
  // 完整性检查
  checkCompleteness(disclosureData: any): Promise<{ score: number; suggestions: string[] }>;
}
