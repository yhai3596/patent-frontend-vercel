// API配置
export const API_BASE_URL = 'https://patent-backend-vercel-h7nntel2s-alans-projects-64783046.vercel.app';

// LocalStorage 存储键名
export const STORAGE_KEYS = {
  USERS: 'td_users',
  DISCLOSURES: 'td_disclosures',
  AUTH: 'td_auth',
  SETTINGS: 'td_settings'
} as const;

// 默认测试用户
export const DEFAULT_USERS = [
  {
    id: 'admin-001',
    email: 'admin@example.com',
    password: 'password123',
    name: '系统管理员',
    role: 'admin' as const,
    status: 'active' as const,
    createdAt: new Date().toISOString()
  },
  {
    id: 'researcher-001',
    email: 'researcher@example.com',
    password: 'password123',
    name: '研发人员',
    role: 'researcher' as const,
    status: 'active' as const,
    createdAt: new Date().toISOString()
  }
];

// 交底书章节配置
export const DISCLOSURE_CHAPTERS = [
  {
    key: 'title',
    label: '发明名称',
    required: true,
    placeholder: '请输入发明名称，如"一种XXX的方法/装置"',
    minLength: 5,
    hint: '发明名称应准确概括技术主题'
  },
  {
    key: 'technicalField',
    label: '技术领域',
    required: true,
    placeholder: '请输入技术领域，如"机械结构领域"',
    minLength: 5,
    hint: '明确发明所属的技术分类'
  },
  {
    key: 'backgroundArt',
    label: '背景技术',
    required: true,
    placeholder: '请描述现有技术及其缺点...',
    minLength: 100,
    rows: 6,
    hint: '详细介绍技术背景，描述已有技术及其不足',
    guideQuestions: [
      '现有技术是什么？',
      '存在什么问题或不足？',
      '为什么需要改进？'
    ]
  },
  {
    key: 'inventionContent',
    label: '发明内容',
    required: true,
    placeholder: '简述方案核心和整体技术效果...',
    minLength: 50,
    rows: 4,
    hint: '概括说明本申请的方案或思路，以及技术效果'
  },
  {
    key: 'technicalSolution',
    label: '技术方案',
    required: true,
    placeholder: '请详细描述技术方案的实现方式...',
    minLength: 200,
    rows: 10,
    hint: '详细阐述技术方案，结合附图进行说明',
    guideQuestions: [
      '您的解决方案是什么？',
      '核心技术特征有哪些？',
      '如何实现这些技术特征？'
    ]
  },
  {
    key: 'beneficialEffects',
    label: '有益效果',
    required: true,
    placeholder: '请说明发明的技术效果和优势...',
    minLength: 50,
    rows: 5,
    hint: '说明本发明解决了什么问题，带来什么好处'
  },
  {
    key: 'figureDescription',
    label: '附图说明',
    required: false,
    placeholder: '请说明各附图的内容...',
    minLength: 0,
    rows: 4,
    hint: '提供必要的技术图示说明（可选）'
  },
  {
    key: 'implementation',
    label: '具体实施方式',
    required: true,
    placeholder: '请提供具体的实施例和实验数据...',
    minLength: 200,
    rows: 10,
    hint: '给出详细的实施例，包括参数、步骤、实验数据等'
  },
  {
    key: 'claimsSuggestion',
    label: '权利要求建议',
    required: false,
    placeholder: '请列出创新关键点和想保护的技术方案...',
    minLength: 0,
    rows: 4,
    hint: '初步构建权利要求框架（可选）'
  }
] as const;

// 交底书类型选项
export const DISCLOSURE_TYPES = [
  { value: '发明专利', label: '发明专利' },
  { value: '实用新型', label: '实用新型' },
  { value: '外观设计', label: '外观设计' }
] as const;

// 交底书状态映射
export const STATUS_MAP = {
  draft: { label: '草稿', color: 'gray', icon: 'FileEdit' },
  processing: { label: '审核中', color: 'blue', icon: 'Clock' },
  review: { label: '需修改', color: 'yellow', icon: 'AlertCircle' },
  approved: { label: '已通过', color: 'green', icon: 'CheckCircle' }
} as const;

// 技术领域识别关键词
export const DOMAIN_KEYWORDS = {
  mechanical: ['部件', '装配', '结构', '连接', '机械', '装置', '零件', '组件', '机构'],
  material: ['配方', '成分', '比例', '工艺', '材料', '制备', '合成', '添加剂', '树脂'],
  software: ['算法', '流程', '步骤', '模块', '程序', '软件', '方法', '系统', '模型', '网络'],
  electronic: ['电路', '信号', '控制', '传感器', '电气', '电压', '电流', '芯片', '模块']
} as const;

// AI提示词模板
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

  documentAnalysis: `请分析这份技术文档，提取关键信息并以JSON格式返回：
{
  "title": "发明名称",
  "technicalField": "技术领域",
  "backgroundArt": "背景技术",
  "inventionContent": "发明内容",
  "technicalSolution": "技术方案",
  "beneficialEffects": "有益效果",
  "implementation": "具体实施方式"
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
} as const;

// 豆包API配置
export const DOUBAO_CONFIG = {
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  models: {
    vision: 'doubao-1-5-vision-pro-32k-250115',
    document: 'doubao-seed-1-6-251015',
    chat: 'doubao-1-5-pro-32k-250115'
  }
} as const;

// 文件上传限制
export const FILE_LIMITS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ['image/png', 'image/jpeg', 'image/jpg']
  },
  pdf: {
    maxSize: 50 * 1024 * 1024, // 50MB (Base64方式)
    types: ['application/pdf']
  }
} as const;
