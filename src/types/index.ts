// 用户角色
export type UserRole = 'admin' | 'researcher';

// 用户状态
export type UserStatus = 'active' | 'disabled';

// 交底书状态
export type DisclosureStatus = 'draft' | 'processing' | 'review' | 'approved';

// 交底书类型
export type DisclosureType = '发明专利' | '实用新型' | '外观设计';

// 技术领域
export type TechnicalDomain = 'mechanical' | 'material' | 'software' | 'electronic' | 'other';

// 用户信息
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  enterpriseId?: string;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
}

// 交底书内容
export interface DisclosureContent {
  title: string;
  technicalField: string;
  backgroundArt: string;
  inventionContent: string;
  technicalSolution: string;
  beneficialEffects: string;
  figureDescription: string;
  implementation: string;
  claimsSuggestion: string;
}

// 附件
export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  data: string; // base64或URL
  size: number;
}

// 章节完整性
export interface ChapterCompleteness {
  chapter: keyof DisclosureContent | 'title' | 'type';
  filled: boolean;
  quality: number; // 0-100
  suggestions: string[];
}

// 交底书
export interface Disclosure {
  id: string;
  type: DisclosureType;
  status: DisclosureStatus;
  authorId: string;
  authorName: string;
  content: DisclosureContent;
  attachments: Attachment[];
  aiParsedData?: any;
  qualityScore: number;
  completeness: ChapterCompleteness[];
  createdAt: string;
  updatedAt: string;
}

// 认证状态
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginTime?: string;
}

// AI解析结果
export interface AIParseResult {
  domain: TechnicalDomain;
  extractedData: Partial<DisclosureContent>;
  confidence: number;
}

// 校验结果
export interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestions?: string[];
}

// 路由配置
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
}
