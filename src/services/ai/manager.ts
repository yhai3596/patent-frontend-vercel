import { DoubaoAdapter } from './adapters/doubao';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible';
import type { AIModelConfig, AIModelAdapter, AIProvider, AIError, ExtractionResult, AIParseResult } from './types';

// 默认模型配置（放在这里避免循环依赖）
export const DEFAULT_MODELS: AIModelConfig[] = [
  {
    provider: 'doubao',
    name: '豆包 Pro',
    modelId: 'doubao-1-5-pro-32k-250115',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    enabled: true,
    priority: 1,
    maxTokens: 4000,
    temperature: 0.3
  },
  {
    provider: 'doubao',
    name: '豆包 Seed',
    modelId: 'doubao-seed-1-8-250615',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    enabled: false,
    priority: 2,
    maxTokens: 4000,
    temperature: 0.3
  },
  {
    provider: 'kimi',
    name: 'Kimi',
    modelId: 'moonshot-v1-32k',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: '',
    enabled: false,
    priority: 3,
    maxTokens: 32000,
    temperature: 0.3
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek',
    modelId: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: '',
    enabled: false,
    priority: 4,
    maxTokens: 4000,
    temperature: 0.3
  },
  {
    provider: 'glm',
    name: '智谱 GLM-4',
    modelId: 'glm-4',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    enabled: false,
    priority: 5,
    maxTokens: 4000,
    temperature: 0.3
  },
  {
    provider: 'openai',
    name: 'OpenAI GPT-4',
    modelId: 'gpt-4',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: false,
    priority: 6,
    maxTokens: 4000,
    temperature: 0.3
  },
  {
    provider: 'custom',
    name: '自定义接口',
    modelId: '',
    baseURL: '',
    apiKey: '',
    enabled: false,
    priority: 7,
    maxTokens: 4000,
    temperature: 0.3
  }
];

// 存储键名
const STORAGE_KEY = 'td_ai_models';

// AI服务管理器
class AIModelManager {
  private models: AIModelConfig[] = [];
  private adapters: Map<string, AIModelAdapter> = new Map();

  constructor() {
    this.loadModels();
  }

  // 加载模型配置
  private loadModels(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.models = JSON.parse(stored);
      } catch (e) {
        console.error('加载模型配置失败:', e);
        this.models = [...DEFAULT_MODELS];
      }
    } else {
      this.models = [...DEFAULT_MODELS];
      this.saveModels();
    }
  }

  // 保存模型配置
  private saveModels(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.models));
  }

  // 获取所有模型配置
  getAllModels(): AIModelConfig[] {
    return [...this.models];
  }

  // 获取启用的模型（按优先级排序）
  getEnabledModels(): AIModelConfig[] {
    return this.models
      .filter(m => m.enabled && m.apiKey)
      .sort((a, b) => a.priority - b.priority);
  }

  // 获取第一个可用的模型
  getFirstAvailableModel(): AIModelConfig | null {
    return this.getEnabledModels()[0] || null;
  }

  // 获取模型适配器
  getAdapter(modelId?: string): AIModelAdapter | null {
    const config = modelId 
      ? this.models.find(m => m.modelId === modelId)
      : this.getFirstAvailableModel();
    
    if (!config) return null;

    // 缓存适配器
    if (!this.adapters.has(config.modelId)) {
      const adapter = this.createAdapter(config);
      if (adapter) {
        this.adapters.set(config.modelId, adapter);
      }
    }

    return this.adapters.get(config.modelId) || null;
  }

  // 创建适配器
  private createAdapter(config: AIModelConfig): AIModelAdapter | null {
    switch (config.provider) {
      case 'doubao':
        return new DoubaoAdapter(config);
      case 'kimi':
      case 'deepseek':
      case 'glm':
      case 'openai':
      case 'custom':
        return new OpenAICompatibleAdapter(config);
      default:
        return null;
    }
  }

  // 更新模型配置
  updateModel(modelId: string, updates: Partial<AIModelConfig>): void {
    const index = this.models.findIndex(m => m.modelId === modelId);
    if (index !== -1) {
      this.models[index] = { ...this.models[index], ...updates };
      // 清除缓存的适配器
      this.adapters.delete(modelId);
      this.saveModels();
    }
  }

  // 添加自定义模型
  addModel(config: AIModelConfig): void {
    this.models.push(config);
    this.saveModels();
  }

  // 删除模型
  removeModel(modelId: string): void {
    this.models = this.models.filter(m => m.modelId !== modelId);
    this.adapters.delete(modelId);
    this.saveModels();
  }

  // 设置模型优先级
  setModelPriority(modelId: string, priority: number): void {
    this.updateModel(modelId, { priority });
  }

  // 启用/禁用模型
  setModelEnabled(modelId: string, enabled: boolean): void {
    this.updateModel(modelId, { enabled });
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
        if (!adapter) continue;

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

  // 从PDF Base64提取
  async extractFromPDFBase64(base64Data: string, filename: string): Promise<ExtractionResult> {
    return this.executeWithFallback(
      adapter => adapter.extractFromPDFBase64(base64Data, filename),
      'PDF内容提取'
    );
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
  }
}

// 导出单例
export const aiModelManager = new AIModelManager();
export default aiModelManager;
