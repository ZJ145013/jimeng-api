import { SiteConfig } from '../types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryable: boolean = false) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token 积分缓存
interface TokenCredits {
  token: string;
  totalCredit: number;
  lastUpdated: number;
}
const tokenCreditsCache: Record<string, TokenCredits[]> = {};
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTokenCredits(apiBase: string, keys: string[]): Promise<TokenCredits[]> {
  try {
    const url = `${apiBase.replace(/\/+$/, '')}/token/points`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${keys.join(',')}` },
    });
    if (!res.ok) {
      console.warn('查询 Token 积分失败，使用默认顺序');
      return keys.map(token => ({ token, totalCredit: 0, lastUpdated: Date.now() }));
    }
    const data = await res.json() as Array<{ token: string; points: { totalCredit: number } }>;
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

export async function getSortedTokens(site: SiteConfig): Promise<string[]> {
  const keys = site.apiKeys?.length > 0 ? site.apiKeys : (site.apiKey ? [site.apiKey] : []);
  if (keys.length === 0) throw new ApiError(0, '请先在配置中心设置 API Key');
  if (keys.length === 1) return keys;

  const cached = tokenCreditsCache[site.id];
  const now = Date.now();
  
  // Custom sort: highest credit first; if equal, random choice
  const sortTokens = (tokens: TokenCredits[]) => 
    tokens.sort((a, b) => {
      if (b.totalCredit === a.totalCredit) return Math.random() - 0.5;
      return b.totalCredit - a.totalCredit;
    }).map(t => t.token);

  if (cached && cached.length > 0 && (now - cached[0].lastUpdated) < CACHE_TTL) {
    return sortTokens(cached);
  }
  
  if (site.apiBase) {
    const credits = await fetchTokenCredits(site.apiBase, keys);
    tokenCreditsCache[site.id] = credits;
    return sortTokens(credits);
  }
  
  // If no apiBase, fall back to random
  return keys.sort(() => Math.random() - 0.5);
}

export function invalidateTokenCache(siteId: string) {
  delete tokenCreditsCache[siteId];
}

const keyIndexMap: Record<string, number> = {};
export function getNextApiKey(site: SiteConfig): string {
  const keys = site.apiKeys?.length > 0 ? site.apiKeys : (site.apiKey ? [site.apiKey] : []);
  if (keys.length === 0) throw new ApiError(0, '请先在配置中心设置 API Key');
  if (!(site.id in keyIndexMap)) keyIndexMap[site.id] = 0;
  const index = keyIndexMap[site.id] % keys.length;
  keyIndexMap[site.id] = index + 1;
  return keys[index];
}

export function parseErrorText(status: number, text: string): string {
  try {
    const json = JSON.parse(text);
    const msg = json.message || json.errmsg || json.error || json.msg;
    if (msg) return msg;
  } catch { }
  if (text.length > 200) return `HTTP ${status}: 请求失败`;
  return `HTTP ${status}: ${text}`;
}

export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 0): Promise<Response> {
  if (timeoutMs <= 0) return fetch(url, options);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new ApiError(0, '请求超时，请稍后重试');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function request<T>(site: SiteConfig, path: string, body: Record<string, unknown>): Promise<T> {
  if (!site.apiBase) throw new ApiError(0, '请先在配置中心设置 API 地址');
  const url = `${site.apiBase.replace(/\/+$/, '')}${path}`;
  const keys = site.apiKeys?.length > 0 ? site.apiKeys : (site.apiKey ? [site.apiKey] : []);
  if (keys.length === 0) throw new ApiError(0, '没有可用的 Token');

  // 最多尝试 3 个不同的 Token
  const maxRetries = Math.min(3, keys.length);
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    const apiKey = getNextApiKey(site);
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return (await res.json()) as Promise<T>;
      }

      const text = await res.text().catch(() => '请求失败');
      const errorMsg = parseErrorText(res.status, text);

      // 如果遇到极大概率是 Token 无效、积分不足或限流的报错，开启切换重试
      const isTokenError = res.status === 401 || res.status === 403 || res.status === 429 ||
        /credit|limit|enough|balance|token|unauthorized/i.test(errorMsg);

      if (isTokenError && i < maxRetries - 1) {
        console.warn(`[Token轮询] 遇到鉴权或额度问题(${res.status})，尝试切换下一个...`);
        lastError = new ApiError(res.status, errorMsg);
        continue;
      }

      throw new ApiError(res.status, errorMsg);
    } catch (err) {
      if (err instanceof ApiError) {
        // 如果是系统级网络或请求超时也可以重试，但不要对正常的业务报错重试（如：不支持此画幅）
        if (err.status !== 0 && !(/credit|limit|enough|balance|token|超时/i.test(err.message)) && err.status !== 401 && err.status !== 403 && err.status !== 429) {
          throw err;
        }
      }
      lastError = err;
      if (i < maxRetries - 1) {
        console.warn(`[Token轮询] 请求网络异常，尝试使用下一个 Token 重试...`, err);
      }
    }
  }

  throw lastError || new ApiError(0, '多次尝试后仍然失败');
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// ============ CDN 代理 ============
const CDN_PROXY_BASE = import.meta.env.VITE_CDN_PROXY || '';
const PROXY_CDN_HOSTS = ['capcutcdn-us.com','capcutcdn.com','byteoversea.com','capcut.com','vlabvod.com'];
export function proxyUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('data:')) return url;
  try {
    const urlObj = new URL(url);
    const needsProxy = CDN_PROXY_BASE && PROXY_CDN_HOSTS.some(host => urlObj.hostname.includes(host));
    if (needsProxy) return `${CDN_PROXY_BASE}/${url}`;
  } catch (err) { console.error('[CDN代理] URL 解析失败:', url); }
  return url;
}
