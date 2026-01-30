// AI服务统一接口和模型适配器

// 从types.ts重新导出所有类型
export type {
  DisclosureContent,
  AIParseResult,
  AIProvider,
  AIModelConfig,
  AIError,
  AIErrorType,
  ExtractionResult,
  AIModelAdapter
} from './types';

// 导出管理器
export { aiModelManager, DEFAULT_MODELS } from './manager';

// 提示词模板
export const AI_PROMPTS = {
  imageAnalysis: `请分析这张技术图纸或图片，提取以下信息并以JSON格式返回：
{
  "domain": "技术领域(mechanical/material/software/electronic/other)",
  "title": "发明名称",
  "technicalField": "技术领域描述",
  "backgroundArt": "背景技术分析",
  "technicalSolution": "技术方案描述",
  "beneficialEffects": "有益效果",
  "confidence": 置信度(0-1)
}`,

  extractFromAttachment: `你是一位专业的专利分析师，擅长从PDF文档中提取专利交底书的关键信息。

【任务说明】
用户上传了一份PDF文档，请仔细分析文档内容，判断是否为技术交底书，并提取其中的关键信息。

【提取字段说明】
1. title: 发明名称（通常在文档开头，格式如"一种XXX的方法/装置"）
2. technicalField: 技术领域（如"功能浆料领域"、"机械结构领域"等）
3. backgroundArt: 背景技术（包括现有技术描述和存在的问题/缺点）
4. inventionContent: 发明内容（本发明要解决的技术问题、技术方案概述、整体技术效果）
5. technicalSolution: 技术方案（详细的技术实现方式，包括技术特征、组成、步骤等）
6. beneficialEffects: 有益效果（与现有技术相比的优势和效果）
7. figureDescription: 附图说明（如有附图，描述各附图内容）
8. implementation: 具体实施方式（实施例、具体参数、实验数据、对比数据等）
9. claimsSuggestion: 权利要求建议（创新关键点、想保护的技术方案）

【输出格式】
必须以JSON格式返回，不要包含任何其他文字说明：
{
  "isPatentDocument": true/false,
  "documentType": "技术交底书/专利说明书/技术图纸/其他",
  "extractedData": {
    "title": "...",
    "technicalField": "...",
    "backgroundArt": "...",
    "inventionContent": "...",
    "technicalSolution": "...",
    "beneficialEffects": "...",
    "figureDescription": "...",
    "implementation": "...",
    "claimsSuggestion": "..."
  },
  "confidence": 0.85,
  "missingInfo": ["缺失信息1", "缺失信息2"],
  "suggestions": ["建议1", "建议2"]
}

【判断标准】
- isPatentDocument: 只要文档包含技术方案、发明内容、背景技术等专利相关章节，就设为true
- documentType: 根据文档格式判断，有"技术交底书"标题的设为"技术交底书"
- confidence: 根据提取内容的完整性和准确性给出0-1之间的置信度

【注意事项】
1. 仔细阅读PDF的全部内容
2. 提取所有能找到的章节内容
3. 如果某个字段在文档中没有明确对应内容，可以留空
4. 保持专业术语的准确性
5. 对于实验数据、表格等内容，用文字描述其关键信息`,

  polishContent: (section: string) => `你是一位资深的专利代理人，擅长撰写技术交底书。
请对以下"${section}"内容进行润色，要求：
1. 使用规范的专利术语
2. 逻辑清晰，层次分明
3. 符合技术交底书的撰写规范
4. 保持原意不变
5. 使用专业、严谨的表达方式

原始内容：`,

  completenessCheck: `请分析这份技术交底书的完整性，检查以下方面：
1. 各章节是否填写完整
2. 技术方案是否详细
3. 是否有实施例和数据支撑
4. 逻辑是否清晰

以JSON格式返回：
{
  "score": 质量评分(0-100),
  "missingChapters": ["缺失章节"],
  "suggestions": ["改进建议"]
}`
};

// 错误提示辅助函数 - 接受任何包含type/message/suggestion的对象
export function getErrorAlert(error: { type: string; message: string; suggestion: string } | null | undefined): {
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
  
  switch (error.type as import('./types').AIErrorType) {
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
    case 'ALL_FAILED':
      return {
        title: '所有AI模型都不可用',
        description: error.suggestion,
        variant: 'destructive'
      };
    default:
      return {
        title: 'AI服务异常',
        description: error.suggestion,
        variant: 'destructive'
      };
  }
}

// 兼容层：模拟旧的aiService接口（延迟加载以避免循环依赖）
export const aiService = {
  isConfigured: () => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.hasAvailableModel();
  },
  
  setApiKey: (apiKey: string) => {
    const { aiModelManager } = require('./manager');
    const doubaoModels = aiModelManager.getAllModels().filter((m: any) => m.provider === 'doubao');
    if (doubaoModels.length > 0) {
      aiModelManager.updateModel(doubaoModels[0].modelId, { apiKey, enabled: true });
    }
  },
  
  analyzeImage: (imageBase64: string, prompt?: string) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.analyzeImage(imageBase64, prompt);
  },
  
  analyzeDocument: (fileId: string, prompt?: string) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.analyzeDocument(fileId, prompt);
  },
  
  uploadFile: (file: File) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.uploadFile(file);
  },
  
  extractFromPDFBase64: (base64Data: string, filename: string) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.extractFromPDFBase64(base64Data, filename);
  },
  
  polishContent: (content: string, sectionName: string) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.polishContent(content, sectionName);
  },
  
  checkCompleteness: (disclosureData: any) => {
    const { aiModelManager } = require('./manager');
    return aiModelManager.checkCompleteness(disclosureData);
  },
  
  detectDomain: (content: string) => {
    // 简单的领域检测
    const keywords: Record<string, string[]> = {
      mechanical: ['部件', '装配', '结构', '连接', '机械', '装置', '零件', '组件', '机构'],
      material: ['配方', '成分', '比例', '工艺', '材料', '制备', '合成', '添加剂', '树脂'],
      software: ['算法', '流程', '步骤', '模块', '程序', '软件', '方法', '系统', '模型', '网络'],
      electronic: ['电路', '信号', '控制', '传感器', '电气', '电压', '电流', '芯片', '模块']
    };
    
    const scores: Record<string, number> = { mechanical: 0, material: 0, software: 0, electronic: 0, other: 0 };
    
    for (const [domain, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (content.includes(word)) {
          scores[domain]++;
        }
      }
    }
    
    let maxDomain = 'other';
    let maxScore = 0;
    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxDomain = domain;
      }
    }
    
    return maxDomain as import('@/types').TechnicalDomain;
  }
};
