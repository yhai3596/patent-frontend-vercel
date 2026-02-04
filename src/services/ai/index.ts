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

// 提示词模板 - 优化版
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
5. 对于实验数据、表格等内容，用文字描述其关键信息
6. 如果文档格式混乱，请尽力提取有效信息`,

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
}`,

  // 新增：PDF内容提取专用提示词
  extractPDFContent: `你是一位专业的专利文档解析专家。请仔细阅读用户上传的PDF文档，提取其中的技术交底书内容。

【提取要求】
1. 识别文档中的所有章节标题
2. 提取每个章节的完整内容
3. 保持原文的专业术语和表述
4. 对于表格数据，用文字描述其关键信息

【输出格式】
{
  "isPatentDocument": true/false,
  "documentType": "技术交底书/专利申请书/其他",
  "extractedData": {
    "title": "发明名称",
    "technicalField": "技术领域",
    "backgroundArt": "背景技术",
    "inventionContent": "发明内容",
    "technicalSolution": "技术方案",
    "beneficialEffects": "有益效果",
    "figureDescription": "附图说明",
    "implementation": "具体实施方式",
    "claimsSuggestion": "权利要求建议"
  },
  "confidence": 0.8,
  "missingInfo": [],
  "suggestions": []
}

【重要提示】
- 如果文档是技术交底书或专利相关文档，isPatentDocument必须设为true
- 即使提取内容不完整，只要有技术相关内容，也应设为true
- confidence根据内容完整度评分，0.5以上表示成功提取`,

  // 新增：内容质量检查提示词
  qualityCheck: (content: string) => `请检查以下技术交底书内容的质量：

${content}

【检查维度】
1. 完整性：各章节是否都有内容
2. 准确性：技术描述是否清晰准确
3. 规范性：是否符合专利撰写规范
4. 逻辑性：内容是否逻辑通顺

【输出格式】
{
  "score": 0-100的质量评分,
  "issues": ["发现的问题"],
  "suggestions": ["改进建议"]
}`
};

// 导出默认模型配置
export const DEFAULT_AI_CONFIG = {
  doubao: {
    provider: 'doubao' as const,
    name: '豆包',
    modelId: 'doubao-seed-1-6-lite-251015',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    temperature: 0.3,
    maxTokens: 65535
  }
};
