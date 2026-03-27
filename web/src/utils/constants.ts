import { SiteConfig } from '../types';

// 默认图片模型 - 国内站
export const DEFAULT_CN_IMAGE_MODELS: string[] = [
  'jimeng-4.5',
  'jimeng-4.1',
  'jimeng-4.0',
  'jimeng-3.1',
  'jimeng-3.0',
  'jimeng-2.1',
  'jimeng-xl-pro',
];

// 默认图片模型 - 国际站
export const DEFAULT_INTL_IMAGE_MODELS: string[] = [
  'jimeng-4.5',
  'jimeng-4.1',
  'jimeng-4.0',
  'jimeng-3.0',
  'nanobananapro',
  'nanobanana',
];

// 默认视频模型 - 国内站
export const DEFAULT_CN_VIDEO_MODELS: string[] = [
  'jimeng-video-4.0-pro',
  'jimeng-video-4.0',
  'jimeng-video-3.5-pro',
  'jimeng-video-3.0-pro',
  'jimeng-video-3.0',
  'jimeng-video-2.0-pro',
  'jimeng-video-2.0',
];

// 默认视频模型 - 国际站
export const DEFAULT_INTL_VIDEO_MODELS: string[] = [
  'jimeng-video-3.5-pro',
  'jimeng-video-veo3',
  'jimeng-video-veo3.1',
  'jimeng-video-sora2',
  'jimeng-video-3.0-pro',
  'jimeng-video-3.0',
  'jimeng-video-3.0-fast',
  'jimeng-video-2.0-pro',
  'jimeng-video-2.0',
];

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
