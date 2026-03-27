// 站点区域类型
export type Region = 'cn' | 'intl';

// 站点配置
export interface SiteConfig {
  id: string;
  name: string;
  region: Region;
  apiBase: string;
  apiKey: string; // 保留兼容旧数据
  apiKeys: string[]; // 多 Key 轮询
  imageModels: string[];
  videoModels: string[];
}

// 全局配置
export interface AppConfig {
  activeSiteId: string;
  sites: SiteConfig[];
}

// 图片比例
export interface AspectRatio {
  label: string;
  width: number;
  height: number;
}

// 文生图请求参数
export interface TextToImageParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  sampleStrength?: number;
  smartRatio?: boolean;
}

// 图生图请求参数
export interface ImageToImageParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  sampleStrength?: number;
  images: string[]; // base64 encoded
}

// 视频生成模式
export type VideoMode = 'text2video' | 'img2video' | 'keyframes';

// 视频生成请求参数
export interface VideoGenerationParams {
  prompt: string;
  model: string;
  mode: VideoMode;
  width: number;
  height: number;
  duration?: number;
  images?: string[]; // base64 encoded
  firstImage?: string;
  lastImage?: string;
}

// API 响应
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 图片生成结果
export interface ImageResult {
  url: string;
  width: number;
  height: number;
}

// 视频生成结果
export interface VideoResult {
  url: string;
  coverUrl?: string;
  duration?: number;
}

// 视频任务状态
export interface VideoTaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress?: number;
  result?: VideoResult;
  failReason?: string;
}

// 历史记录项
export interface HistoryItem {
  id: string;
  type: 'text2image' | 'image2image' | 'video';
  prompt: string;
  params: Record<string, unknown>;
  results: Array<{ url: string; type: 'image' | 'video' }>;
  createdAt: number;
  siteName: string;
}

// 导航页面
export type PageKey = 'text2image' | 'image2image' | 'video' | 'history' | 'settings';
