import { SiteConfig } from '../types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryable: boolean = false) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============ 智能 Token 选择器 ============

// Token 积分缓存（按站点 ID 存储）
interface TokenCredits {
  token: string;
  totalCredit: number;
  lastUpdated: number;
}

const tokenCreditsCache: Record<string, TokenCredits[]> = {};
const CACHE_TTL = 5 * 60 * 1000; // 缓存 5 分钟

// 查询所有 Token 的积分并缓存
async function fetchTokenCredits(apiBase: string, keys: string[]): Promise<TokenCredits[]> {
  try {
    const url = `${apiBase.replace(/\/+$/, '')}/token/points`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.join(',')}`,
      },
    });

    if (!res.ok) {
      console.warn('查询 Token 积分失败，使用默认顺序');
      return keys.map(token => ({ token, totalCredit: 0, lastUpdated: Date.now() }));
    }

    const data = await res.json() as Array<{
      token: string;
      points: {
        giftCredit: number;
        purchaseCredit: number;
        vipCredit: number;
        totalCredit: number;
      };
    }>;

    return data.map(item => ({
      token: item.token,
      totalCredit: item.points.totalCredit,
      lastUpdated: Date.now(),
    }));
  } catch (err) {
    console.warn('查询 Token 积分出错，使用默认顺序:', err);
    return keys.map(token => ({ token, totalCredit: 0, lastUpdated: Date.now() }));
  }
}

// 获取按积分排序的 Token 列表
async function getSortedTokens(site: SiteConfig): Promise<string[]> {
  const keys = site.apiKeys?.length > 0 ? site.apiKeys : (site.apiKey ? [site.apiKey] : []);
  if (keys.length === 0) {
    throw new ApiError(0, '请先在配置中心设置 API Key');
  }

  // 单个 Token 无需排序
  if (keys.length === 1) {
    return keys;
  }

  // 检查缓存是否有效
  const cached = tokenCreditsCache[site.id];
  const now = Date.now();
  if (cached && cached.length > 0 && (now - cached[0].lastUpdated) < CACHE_TTL) {
    // 按积分降序排序
    return cached
      .sort((a, b) => b.totalCredit - a.totalCredit)
      .map(t => t.token);
  }

  // 查询积分并缓存
  if (site.apiBase) {
    const credits = await fetchTokenCredits(site.apiBase, keys);
    tokenCreditsCache[site.id] = credits;
    console.log('Token 积分排序:', credits.map(t => `${t.token.slice(-8)}:${t.totalCredit}`).join(', '));

    return credits
      .sort((a, b) => b.totalCredit - a.totalCredit)
      .map(t => t.token);
  }

  return keys;
}

// 使缓存失效（积分变化后调用）
export function invalidateTokenCache(siteId: string) {
  delete tokenCreditsCache[siteId];
}

// 轮询索引存储（降级用）
const keyIndexMap: Record<string, number> = {};

// 获取下一个 API Key（简单轮询，降级用）
function getNextApiKey(site: SiteConfig): string {
  const keys = site.apiKeys?.length > 0 ? site.apiKeys : (site.apiKey ? [site.apiKey] : []);
  if (keys.length === 0) {
    throw new ApiError(0, '请先在配置中心设置 API Key');
  }

  // 初始化或获取当前索引
  if (!(site.id in keyIndexMap)) {
    keyIndexMap[site.id] = 0;
  }

  const index = keyIndexMap[site.id] % keys.length;
  keyIndexMap[site.id] = index + 1;

  return keys[index];
}

// 从错误响应中提取可读的错误信息
function parseErrorText(status: number, text: string): string {
  try {
    const json = JSON.parse(text);
    const msg = json.message || json.errmsg || json.error || json.msg;
    if (msg) return msg;
  } catch {
    // 非 JSON 响应
  }
  if (text.length > 200) return `HTTP ${status}: 请求失败`;
  return `HTTP ${status}: ${text}`;
}

// 带超时的 fetch（timeout=0 表示不超时）
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 0
): Promise<Response> {
  // 不设置超时，让后端控制超时
  if (timeoutMs <= 0) {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, '请求超时，请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 不重试，直接使用积分最高的 Token
async function request<T>(site: SiteConfig, path: string, body: Record<string, unknown>): Promise<T> {
  if (!site.apiBase) {
    throw new ApiError(0, '请先在配置中心设置 API 地址');
  }

  const url = `${site.apiBase.replace(/\/+$/, '')}${path}`;

  // 获取按积分排序的 Token 列表，使用第一个（积分最高的）
  const sortedTokens = await getSortedTokens(site);
  const apiKey = sortedTokens[0];

  if (!apiKey) {
    throw new ApiError(0, '没有可用的 Token');
  }

  // 不设置超时，让后端控制超时（后端有自己的轮询机制）
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    return res.json() as Promise<T>;
  }

  const text = await res.text().catch(() => '请求失败');
  throw new ApiError(res.status, parseErrorText(res.status, text));
}

// 文生图
export async function textToImage(site: SiteConfig, params: {
  prompt: string;
  negative_prompt?: string;
  model: string;
  ratio: string;
  resolution: string;
  sample_strength?: number;
  intelligent_ratio?: boolean;
}) {
  return request<{ data: Array<{ url: string }>; created: number }>(site, '/v1/images/generations', {
    model: params.model,
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || undefined,
    ratio: params.ratio,
    resolution: params.resolution,
    sample_strength: params.sample_strength,
    intelligent_ratio: params.intelligent_ratio,
  });
}

// 图生图
export async function imageToImage(site: SiteConfig, params: {
  prompt: string;
  negative_prompt?: string;
  model: string;
  ratio: string;
  resolution: string;
  sample_strength?: number;
  intelligent_ratio?: boolean;
  images: string[]; // base64 data URLs
}) {
  return request<{ data: Array<{ url: string }>; created: number }>(site, '/v1/images/compositions', {
    model: params.model,
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || undefined,
    ratio: params.ratio,
    resolution: params.resolution,
    sample_strength: params.sample_strength,
    intelligent_ratio: params.intelligent_ratio,
    images: params.images,
  });
}

// 视频生成（支持普通模式和全能引用模式）
// API 可能直接返回结果（data 数组）或返回 task_id 需要轮询
export async function submitVideoTask(site: SiteConfig, params: {
  prompt: string;
  model: string;
  ratio?: string;
  resolution?: string;
  duration?: number;
  file_paths?: string[]; // 普通模式: base64 data URLs 或远程 URL
  functionMode?: 'first_last_frames' | 'omni_reference';
  omni_images?: string[]; // 全能模式: 参考图片 (最多9张)
  omni_videos?: string[]; // 全能模式: 参考视频 (最多3个)
}) {
  if (!site.apiBase) {
    throw new ApiError(0, '请先在配置中心设置 API 地址');
  }

  const url = `${site.apiBase.replace(/\/+$/, '')}/v1/videos/generations`;
  const hasLocalImages = params.file_paths?.some(p => p.startsWith('data:'));

  // 有本地图片时预先转换 blob
  let blobs: Array<{ index: number; blob: Blob }> | null = null;
  if (hasLocalImages && params.file_paths) {
    blobs = [];
    for (let i = 0; i < params.file_paths.length; i++) {
      const dataUrl = params.file_paths[i];
      if (dataUrl.startsWith('data:')) {
        const blob = await dataUrlToBlob(dataUrl);
        blobs.push({ index: i, blob });
      }
    }
  }

  // 获取按积分排序的 Token 列表，使用第一个（积分最高的）
  const sortedTokens = await getSortedTokens(site);
  const apiKey = sortedTokens[0];

  if (!apiKey) {
    throw new ApiError(0, '没有可用的 Token');
  }

  let res: Response;
  const isOmniMode = params.functionMode === 'omni_reference';

  if (isOmniMode && (params.omni_images?.length || params.omni_videos?.length)) {
    // 全能引用模式：使用 image_file_N / video_file_N 字段
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('model', params.model);
    formData.append('functionMode', 'omni_reference');
    if (params.ratio) formData.append('ratio', params.ratio);
    if (params.resolution) formData.append('resolution', params.resolution || '720p');
    if (params.duration) formData.append('duration', String(params.duration));

    // 添加参考图片
    if (params.omni_images) {
      for (let i = 0; i < params.omni_images.length; i++) {
        const dataUrl = params.omni_images[i];
        if (dataUrl.startsWith('data:')) {
          const blob = await dataUrlToBlob(dataUrl);
          formData.append(`image_file_${i + 1}`, blob, `image_${i + 1}.png`);
        } else {
          formData.append(`image_file_${i + 1}`, dataUrl);
        }
      }
    }

    // 添加参考视频
    if (params.omni_videos) {
      for (let i = 0; i < params.omni_videos.length; i++) {
        const dataUrl = params.omni_videos[i];
        if (dataUrl.startsWith('data:')) {
          const blob = await dataUrlToBlob(dataUrl);
          formData.append(`video_file_${i + 1}`, blob, `video_${i + 1}.mp4`);
        } else {
          formData.append(`video_file_${i + 1}`, dataUrl);
        }
      }
    }

    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
  } else if (hasLocalImages && params.file_paths) {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('model', params.model);
    if (params.ratio) formData.append('ratio', params.ratio);
    if (params.resolution) formData.append('resolution', params.resolution || '720p');
    if (params.duration) formData.append('duration', String(params.duration));

    for (let i = 0; i < params.file_paths.length; i++) {
      const dataUrl = params.file_paths[i];
      if (dataUrl.startsWith('data:')) {
        const blobEntry = blobs!.find(b => b.index === i);
        if (blobEntry) {
          formData.append(`image_file_${i + 1}`, blobEntry.blob, `frame_${i + 1}.png`);
        }
      } else {
        formData.append('file_paths', dataUrl);
      }
    }

    // 不设置超时，让后端控制超时
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
  } else {
    // 不设置超时，让后端控制超时
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        ratio: params.ratio,
        resolution: params.resolution || '720p',
        duration: params.duration,
        file_paths: params.file_paths,
      }),
    });
  }

  if (res.ok) {
    const json = await res.json() as {
      code?: number;
      message?: string;
      task_id?: string;
      created?: number;
      data?: Array<{ url: string; revised_prompt?: string }>;
    };

    // 检查业务错误码（HTTP 200 但业务失败）
    if (json.code && json.code !== 0) {
      const errorMsg = json.message || `业务错误: ${json.code}`;
      throw new ApiError(json.code, errorMsg);
    }

    return json;
  }

  const text = await res.text().catch(() => '请求失败');
  throw new ApiError(res.status, parseErrorText(res.status, text));
}

// base64 data URL 转 Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// 查询视频任务状态
export async function queryVideoTask(site: SiteConfig, taskId: string) {
  if (!site.apiBase) {
    throw new ApiError(0, '请先配置 API');
  }

  const apiKey = getNextApiKey(site);
  const url = `${site.apiBase.replace(/\/+$/, '')}/v1/videos/generations/${taskId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '查询失败');
    throw new ApiError(res.status, parseErrorText(res.status, text));
  }

  return res.json() as Promise<{
    status: string;
    progress?: number;
    result?: { url: string; cover_url?: string };
    fail_reason?: string;
  }>;
}

// ============ Token 管理 API ============

// 批量签到领取积分
export async function tokenReceive(apiBase: string, keys: string[]) {
  if (!apiBase) throw new ApiError(0, '请先配置 API 地址');
  if (keys.length === 0) throw new ApiError(0, '没有可用的 Token');

  const url = `${apiBase.replace(/\/+$/, '')}/token/receive`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keys.join(',')}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '签到失败');
    throw new ApiError(res.status, parseErrorText(res.status, text));
  }

  return res.json() as Promise<Array<{
    token: string;
    credits: {
      giftCredit: number;
      purchaseCredit: number;
      vipCredit: number;
      totalCredit: number;
    };
    received: boolean;
    error?: string;
  }>>;
}

// 查询积分
export async function tokenPoints(apiBase: string, keys: string[]) {
  if (!apiBase) throw new ApiError(0, '请先配置 API 地址');
  if (keys.length === 0) throw new ApiError(0, '没有可用的 Token');

  const url = `${apiBase.replace(/\/+$/, '')}/token/points`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keys.join(',')}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '查询失败');
    throw new ApiError(res.status, parseErrorText(res.status, text));
  }

  return res.json() as Promise<Array<{
    token: string;
    points: {
      giftCredit: number;
      purchaseCredit: number;
      vipCredit: number;
      totalCredit: number;
    };
  }>>;
}

// 检查 Token 状态
export async function tokenCheck(apiBase: string, token: string) {
  if (!apiBase) throw new ApiError(0, '请先配置 API 地址');

  const url = `${apiBase.replace(/\/+$/, '')}/token/check`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '检查失败');
    throw new ApiError(res.status, parseErrorText(res.status, text));
  }

  return res.json() as Promise<{ live: boolean }>;
}

// ============ CDN 代理 ============

// CDN 代理地址（通过环境变量 VITE_CDN_PROXY 配置，设为空则禁用代理）
const CDN_PROXY_BASE = import.meta.env.VITE_CDN_PROXY || '';

// 需要代理的海外 CDN 域名（国内 CDN 直连更快，不代理）
const PROXY_CDN_HOSTS = [
  // CapCut 海外 CDN
  'capcutcdn-us.com',
  'capcutcdn.com',
  // ByteDance 海外存储
  'byteoversea.com',
  // 其他海外节点
  'capcut.com',
  // 国内视频 CDN（需要代理才能在前端播放）
  'vlabvod.com',
];

// 将海外 CDN URL 转换为代理 URL
export function proxyUrl(url: string): string {
  if (!url) return url;

  // data URL 不需要代理
  if (url.startsWith('data:')) return url;

  try {
    const urlObj = new URL(url);
    // 只代理海外 CDN
    const needsProxy = CDN_PROXY_BASE && PROXY_CDN_HOSTS.some(host => urlObj.hostname.includes(host));
    if (needsProxy) {
      const proxied = `${CDN_PROXY_BASE}/${url}`;
      return proxied;
    }
  } catch (err) {
    console.error('[CDN代理] URL 解析失败:', url);
  }
  return url;
}
