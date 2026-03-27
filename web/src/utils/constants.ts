import { SiteConfig } from '../types';
import {
  IMAGE_MODELS_CN,
  IMAGE_MODELS_INTL,
  VIDEO_MODELS_CN,
  VIDEO_MODELS_INTL,
} from '../generated/models';

// 模型列表由 scripts/sync-models.mjs 从后端自动生成
export const DEFAULT_CN_IMAGE_MODELS: string[] = [...IMAGE_MODELS_CN];
export const DEFAULT_INTL_IMAGE_MODELS: string[] = [...IMAGE_MODELS_INTL];
export const DEFAULT_CN_VIDEO_MODELS: string[] = [...VIDEO_MODELS_CN];
export const DEFAULT_INTL_VIDEO_MODELS: string[] = [...VIDEO_MODELS_INTL];

// 图片比例选项（API 直接使用 ratio 字符串）
export const ASPECT_RATIOS = [
  '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9',
] as const;

// 视频比例选项
export const VIDEO_ASPECT_RATIOS = [
  '1:1', '4:3', '3:4', '16:9', '9:16', '21:9',
] as const;

// 图片分辨率选项
export const RESOLUTIONS = [
  { label: '1K', value: '1k' },
  { label: '2K', value: '2k' },
  { label: '4K', value: '4k' },
] as const;

// 视频分辨率
export const VIDEO_RESOLUTIONS = [
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
] as const;

// 视频时长选项（秒）
export const VIDEO_DURATIONS = [
  { label: '4秒', value: 4 },
  { label: '5秒', value: 5 },
  { label: '8秒', value: 8 },
  { label: '10秒', value: 10 },
] as const;

// 默认站点配置
export const DEFAULT_SITES: SiteConfig[] = [
  {
    id: 'cn',
    name: '国内站',
    region: 'cn',
    apiBase: '',
    apiKey: '',
    apiKeys: [],
    imageModels: [...DEFAULT_CN_IMAGE_MODELS],
    videoModels: [...DEFAULT_CN_VIDEO_MODELS],
  },
  {
    id: 'intl',
    name: '国际站',
    region: 'intl',
    apiBase: '',
    apiKey: '',
    apiKeys: [],
    imageModels: [...DEFAULT_INTL_IMAGE_MODELS],
    videoModels: [...DEFAULT_INTL_VIDEO_MODELS],
  },
];
