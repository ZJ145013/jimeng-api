import { SiteConfig, TokenRegion } from '../types';
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

// 视频时长选项（秒）— 通用默认值，实际值由 getVideoDurations() 动态计算
export const VIDEO_DURATIONS = [
  { label: '4秒', value: 4 },
  { label: '5秒', value: 5 },
  { label: '8秒', value: 8 },
  { label: '10秒', value: 10 },
] as const;

// ============================================================
// 模型级参数配置
// ============================================================

// 支持 intelligent_ratio 的图像模型前缀（jimeng-4.x 和 jimeng-5.x 系列）
const INTELLIGENT_RATIO_MODELS = ['jimeng-4.0', 'jimeng-4.1', 'jimeng-4.5', 'jimeng-4.6', 'jimeng-5.0'];

/**
 * 判断当前图像模型是否支持「智能比例」功能
 */
export function supportsIntelligentRatio(model: string): boolean {
  return INTELLIGENT_RATIO_MODELS.some(prefix => model.startsWith(prefix));
}

/**
 * 根据视频模型返回可用的时长列表
 * - veo3 / veo3.1：固定 8s
 * - sora2：4, 8, 12
 * - seedance-2.0 / seedance-2.0-fast：4 ~ 15 连续整数
 * - 3.5-pro：5, 10, 12
 * - 其他：5, 10
 */
export function getVideoDurations(model: string): Array<{ label: string; value: number }> {
  if (model.includes('veo3')) {
    return [{ label: '8秒 (固定)', value: 8 }];
  }
  if (model.includes('sora2')) {
    return [
      { label: '4秒', value: 4 },
      { label: '8秒', value: 8 },
      { label: '12秒', value: 12 },
    ];
  }
  if (model.includes('seedance-2.0')) {
    // 4 ~ 15 秒连续整数
    return Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 4}秒`,
      value: i + 4,
    }));
  }
  if (model.includes('3.5-pro')) {
    return [
      { label: '5秒', value: 5 },
      { label: '10秒', value: 10 },
      { label: '12秒', value: 12 },
    ];
  }
  // 默认：5, 10
  return [
    { label: '5秒', value: 5 },
    { label: '10秒', value: 10 },
  ];
}

/**
 * 判断视频模型是否支持 resolution 参数
 * 仅 jimeng-video-3.0 和 jimeng-video-3.0-fast 支持
 */
export function supportsVideoResolution(model: string): boolean {
  return model === 'jimeng-video-3.0' || model === 'jimeng-video-3.0-fast';
}

const IMAGE_MODEL_SUPPORT: Record<string, string> = {
  'jimeng-5.0': '国内站、国际站(HK/JP/SG)',
  'jimeng-4.6': '国内站、国际站(HK/JP/SG)',
  'jimeng-4.5': '国内站、国际站(US/HK/JP/SG)',
  'jimeng-4.1': '国内站、国际站(US/HK/JP/SG)',
  'jimeng-4.0': '国内站、国际站(US/HK/JP/SG)',
  'jimeng-3.1': '仅国内站',
  'jimeng-3.0': '国内站、国际站(US/HK/JP/SG)',
  nanobanana: '仅国际站(US/HK/JP/SG)',
  nanobananapro: '仅国际站(US/HK/JP/SG)',
};

const VIDEO_MODEL_SUPPORT: Record<string, string> = {
  'jimeng-video-seedance-2.0': '仅国内站',
  'jimeng-video-seedance-2.0-fast': '仅国内站',
  'jimeng-video-3.5-pro': '国内站、国际站(US/HK/JP/SG)',
  'jimeng-video-3.0-pro': '国内站、国际站(HK/JP/SG)',
  'jimeng-video-3.0': '国内站、国际站(US/HK/JP/SG)',
  'jimeng-video-3.0-fast': '国内站、国际站(HK/JP/SG)',
  'jimeng-video-2.0': '国内站、国际站(HK/JP/SG)',
  'jimeng-video-2.0-pro': '国内站、国际站(HK/JP/SG)',
  'jimeng-video-veo3': '仅国际站(HK/JP/SG)',
  'jimeng-video-veo3.1': '仅国际站(HK/JP/SG)',
  'jimeng-video-sora2': '仅国际站(HK/JP/SG)',
};

export function getImageModelSupportText(model: string): string {
  return IMAGE_MODEL_SUPPORT[model] || '请以当前站点实际校验结果为准';
}

export function getVideoModelSupportText(model: string): string {
  return VIDEO_MODEL_SUPPORT[model] || '请以当前站点实际校验结果为准';
}

export function isImageModelAvailableForRegion(model: string, region?: TokenRegion): boolean {
  if (!region) return true;
  if (region === 'cn') {
    return model !== 'nanobanana' && model !== 'nanobananapro';
  }
  if (region === 'us') {
    return !['jimeng-5.0', 'jimeng-4.6', 'jimeng-3.1'].includes(model);
  }
  return model !== 'jimeng-3.1';
}

export function isVideoModelAvailableForRegion(model: string, region?: TokenRegion): boolean {
  if (!region) return true;
  if (region === 'cn') {
    return !['jimeng-video-veo3', 'jimeng-video-veo3.1', 'jimeng-video-sora2'].includes(model);
  }
  if (region === 'us') {
    return ['jimeng-video-3.5-pro', 'jimeng-video-3.0'].includes(model);
  }
  return model !== 'jimeng-video-seedance-2.0' && model !== 'jimeng-video-seedance-2.0-fast';
}

export function getTokenRegionLabel(region?: TokenRegion): string {
  if (!region) return '未识别（请先健康验活）';
  if (region === 'cn') return '国内站 (CN)';
  if (region === 'us') return '美区 (US)';
  if (region === 'hk') return '香港 (HK)';
  if (region === 'jp') return '日本 (JP)';
  return '新加坡 (SG)';
}

// 默认站点配置
export const DEFAULT_SITES: SiteConfig[] = [
  {
    id: 'cn',
    name: '国内站',
    region: 'cn',
    apiBase: '/api',
    apiKey: '',
    apiKeys: [],
    imageModels: [...DEFAULT_CN_IMAGE_MODELS],
    videoModels: [...DEFAULT_CN_VIDEO_MODELS],
  },
  {
    id: 'intl',
    name: '国际站',
    region: 'intl',
    apiBase: '/api',
    apiKey: '',
    apiKeys: [],
    imageModels: [...DEFAULT_INTL_IMAGE_MODELS],
    videoModels: [...DEFAULT_INTL_VIDEO_MODELS],
  },
];
