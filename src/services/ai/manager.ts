import { DoubaoAdapter } from './adapters/doubao';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible';
import type { AIModelConfig, AIModelAdapter, AIError, ExtractionResult, AIParseResult } from './types';

// 默认模型配置
export const DEFAULT_MODELS: AIModelConfig[] = [
  {
    provider: 'doubao',
    name: '豆包 Pro',
    modelId: 'doubao-1-5-pro-32k-250115',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    enabled: true,
    priority: 1,
    maxTokens: 65535,
    temperature: 0.3
  },
  {
    provider: 'doubao',
    name: '豆包 Seed Lite',
    modelId: 'doubao-seed-1-6-lite-251015',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    enabled: false,
    priority: 2,
    maxTokens: 65535,
    temperature: 0.3
  }
];

const STORAGE_KEY = 'td_ai_models';

class AIModelManager {
  private models: AIModelConfig[] = [];
  private adapters: Map<string, AIModelAdapter> = new Map();

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.models = JSON.parse(stored);
      } catch (e) {
        this.models = [...DEFAULT_MODELS];
      }
    } else {
      this.models = [...DEFAULT_MODELS];
      this.saveModels();
    }
  }

  private saveModels(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.models));
  }

  getAllModels(): AIModelConfig[] {
    return [...this.models];
  }

  getEnabledModels(): AIModelConfig[] {
    return this.models
      .filter(m => m.enabled && m.apiKey)
      .sort((a, b) => a.priority - b.priority);
  }

  getFirstAvailableModel(): AIModelConfig | null {
    return this.getEnabledModels()[0] || null;
  }

  getAdapter(modelId?: string): AIModelAdapter | null {
    const config = modelId 
      ? this.models.find(m => m.modelId === modelId)
      : this.getFirstAvailableModel();
    
    if (!config) return null;

    if (!this.adapters.has(config.modelId)) {
      const adapter = this.createAdapter(config);
      if (adapter) {
        this.adapters.set(config.modelId, adapter);
      }
    }

    return this.adapters.get(config.modelId) || null;
  }

  private createAdapter(config: AIModelConfig): AIModelAdapter | null {
    if (config.provider === 'doubao') {
      return new DoubaoAdapter(config);
    }
    return new OpenAICompatibleAdapter(config);
  }

  updateModel(modelId: string, updates: Partial<AIModelConfig>): void {
    const index = this.models.findIndex(m => m.modelId === modelId);
    if (index !== -1) {
      this.models[index] = { ...this.models[index], ...updates };
      this.adapters.delete(modelId);
      this.saveModels();
    }
  }

  hasAvailableModel(): boolean {
    return this.getEnabledModels().length > 0;
  }

  // 执行操作并自动故障转移
  private async executeWithFallback<T>(
    operation: (adapter: AIModelAdapter) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const enabledModels = this.getEnabledModels();
    
    console.log(`[AIManager] ${operationName}, 可用模型:`, enabledModels.length);
    
    if (enabledModels.length === 0) {
      throw {
        type: 'UNCONFIGURED',
        message: '没有可用的AI模型',
        suggestion: '请至少配置并启用一个AI模型'
      } as AIError;
    }

    for (const modelConfig of enabledModels) {
      try {
        console.log(`[AIManager] 尝试 ${modelConfig.name}`);
        const adapter = this.getAdapter(modelConfig.modelId);
        if (!adapter) continue;

        const result = await operation(adapter);
        console.log(`[AIManager] ${modelConfig.name} 成功`);
        return result;
      } catch (error: any) {
        console.error(`[AIManager] ${modelConfig.name} 失败:`, error);
        continue;
      }
    }

    throw {
      type: 'ALL_FAILED',
      message: '所有AI模型都不可用',
      suggestion: '请检查模型配置'
    } as AIError;
  }

  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult> {
    return this.executeWithFallback(
      adapter => adapter.analyzeImage(imageBase64, prompt),
      '图片分析'
    );
  }

  async uploadFile(file: File, modelId?: string): Promise<string> {
    const adapter = modelId ? this.getAdapter(modelId) : this.getAdapter();
    if (!adapter) {
      throw { type: 'UNCONFIGURED', message: '没有可用的AI模型' } as AIError;
    }
    return adapter.uploadFile(file);
  }

  async extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult> {
    console.log('[AIManager] 开始PDF提取:', filename);
    
    try {
      const result = await this.executeWithFallback(
        adapter => adapter.extractFromPDFBase64(base64Data, filename),
        'PDF提取'
      );
      
      console.log('[AIManager] PDF提取完成:', result.isPatentDocument, result.confidence);
      return result;
    } catch (error) {
      console.error('[AIManager] PDF提取失败:', error);
      throw error;
    }
  }

  async polishContent(content: string, sectionName: string): Promise<string> {
    return this.executeWithFallback(
      adapter => adapter.polishContent(content, sectionName),
      'AI润色'
    );
  }

  resetToDefault(): void {
    this.models = [...DEFAULT_MODELS];
    this.adapters.clear();
    this.saveModels();
  }
}

export const aiModelManager = new AIModelManager();
export default aiModelManager;
;
  }

  // 检查是否有任何模型可用
  hasAvailableModel(): boolean {
    return this.getEnabledModels().length > 0;
  }

  // 获取模型状态摘要
  getModelStatus(): {
    total: number;
    enabled: number;
    configured: number;
    available: number;
    models: { name: string; provider: AIProvider; enabled: boolean; configured: boolean }[];
  } {
    const enabledModels = this.models.filter(m => m.enabled);
    const configuredModels = enabledModels.filter(m => m.apiKey);
    
    return {
      total: this.models.length,
      enabled: enabledModels.length,
      configured: configuredModels.length,
      available: configuredModels.length,
      models: this.models.map(m => ({
        name: m.name,
        provider: m.provider,
        enabled: m.enabled,
        configured: !!m.apiKey
      }))
    };
  }

  // ===== 带故障转移的AI操作 =====

  // 执行操作并自动故障转移
  private async executeWithFallback<T>(
    operation: (adapter: AIModelAdapter) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const enabledModels = this.getEnabledModels();
    
    console.log(`[AIManager] 执行 ${operationName}，可用模型数:`, enabledModels.length);
    
    if (enabledModels.length === 0) {
      throw {
        type: 'UNCONFIGURED',
        message: '没有可用的AI模型',
        suggestion: '请至少配置并启用一个AI模型'
      } as AIError;
    }

    const errors: AIError[] = [];

    for (const modelConfig of enabledModels) {
      try {
        console.log(`[AIManager] 尝试使用 ${modelConfig.name} 执行 ${operationName}`);
        const adapter = this.getAdapter(modelConfig.modelId);
        if (!adapter) {
          console.log(`[AIManager] ${modelConfig.name} 适配器创建失败`);
          continue;
        }

        const result = await operation(adapter);
        console.log(`[AIManager] ${modelConfig.name} 执行成功`);
        return result;
      } catch (error: any) {
        console.error(`[AIManager] ${modelConfig.name} 执行失败:`, error);
        errors.push({
          ...error,
          provider: modelConfig.provider
        });
        
        // 继续尝试下一个模型
        continue;
      }
    }

    // 所有模型都失败了
    const lastError = errors[errors.length - 1];
    console.error(`[AIManager] 所有模型都失败了`);
    throw {
      type: 'ALL_FAILED',
      message: `所有AI模型都不可用: ${lastError?.message || '未知错误'}`,
      suggestion: errors.map(e => `${e.provider}: ${e.message}`).join('; ') + '。请检查模型配置或切换到其他模型。',
      originalError: errors
    } as AIError;
  }

  // 分析图片
  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIParseResult> {
    return this.executeWithFallback(
      adapter => adapter.analyzeImage(imageBase64, prompt),
      '图片分析'
    );
  }

  // 分析文档
  async analyzeDocument(fileId: string, prompt?: string): Promise<AIParseResult> {
    return this.executeWithFallback(
      adapter => adapter.analyzeDocument(fileId, prompt),
      '文档分析'
    );
  }

  // 上传文件
  async uploadFile(file: File, modelId?: string): Promise<string> {
    const adapter = modelId ? this.getAdapter(modelId) : this.getAdapter();
    if (!adapter) {
      throw {
        type: 'UNCONFIGURED',
        message: '没有可用的AI模型',
        suggestion: '请先配置AI模型'
      } as AIError;
    }
    return adapter.uploadFile(file);
  }

  // 从PDF Base64提取 - 带详细日志
  async extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult> {
    console.log('[AIManager] ====== 开始PDF提取 ======');
    console.log('[AIManager] 文件名:', filename);
    console.log('[AIManager] Base64长度:', base64Data.length);
    
    try {
      const result = await this.executeWithFallback(
        adapter => adapter.extractFromPDFBase64(base64Data, filename),
        'PDF内容提取'
      );
      
      console.log('[AIManager] ====== PDF提取完成 ======');
      console.log('[AIManager] isPatentDocument:', result.isPatentDocument);
      console.log('[AIManager] confidence:', result.confidence);
      
      return result;
    } catch (error) {
      console.error('[AIManager] PDF提取失败:', error);
      throw error;
    }
  }

  // AI润色
  async polishContent(content: string, sectionName: string): Promise<string> {
    return this.executeWithFallback(
      adapter => adapter.polishContent(content, sectionName),
      'AI润色'
    );
  }

  // 完整性检查
  async checkCompleteness(disclosureData: any): Promise<{ score: number; suggestions: string[] }> {
    return this.executeWithFallback(
      adapter => adapter.checkCompleteness(disclosureData),
      '完整性检查'
    );
  }

  // 重置为默认配置
  resetToDefault(): void {
    this.models = [...DEFAULT_MODELS];
    this.adapters.clear();
    this.saveModels();
    console.log('[AIManager] 重置为默认配置');
  }
}

// 导出单例
export const aiModelManager = new AIModelManager();
export default aiModelManager;
