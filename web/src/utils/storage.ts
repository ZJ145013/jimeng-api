const STORAGE_PREFIX = 'jimeng_';

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

// ============ WebDAV 同步 ============

interface WebDAVConfig {
  url: string;      // WebDAV 地址，如 https://dav.jianguoyun.com/dav/jimeng-sync/
  username: string;
  password: string;
}

const WEBDAV_CONFIG_KEY = 'webdav_config';

export function getWebDAVConfig(): WebDAVConfig | null {
  return getItem<WebDAVConfig | null>(WEBDAV_CONFIG_KEY, null);
}

export function setWebDAVConfig(config: WebDAVConfig | null): void {
  if (config) {
    setItem(WEBDAV_CONFIG_KEY, config);
  } else {
    removeItem(WEBDAV_CONFIG_KEY);
  }
}

// WebDAV 基础请求
async function webdavRequest(
  path: string,
  method: string,
  body?: string
): Promise<Response> {
  const config = getWebDAVConfig();
  if (!config) throw new Error('WebDAV 未配置');

  const url = config.url.endsWith('/') ? config.url + path : config.url + '/' + path;
  const auth = btoa(`${config.username}:${config.password}`);

  return fetch(url, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body,
  });
}

// 检查 WebDAV 连接
export async function checkWebDAV(config: WebDAVConfig): Promise<boolean> {
  try {
    const url = config.url.endsWith('/') ? config.url : config.url + '/';
    const auth = btoa(`${config.username}:${config.password}`);

    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '0',
      },
    });

    return res.ok || res.status === 207;
  } catch {
    return false;
  }
}

// 读取 WebDAV 文件
async function readWebDAVFile<T>(filename: string): Promise<T | null> {
  try {
    const res = await webdavRequest(filename, 'GET');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Read ${filename} error:`, err);
    return null;
  }
}

// 写入 WebDAV 文件
async function writeWebDAVFile<T>(filename: string, data: T): Promise<boolean> {
  try {
    const res = await webdavRequest(filename, 'PUT', JSON.stringify(data, null, 2));
    return res.ok || res.status === 201 || res.status === 204;
  } catch (err) {
    console.error(`Write ${filename} error:`, err);
    return false;
  }
}

// ============ 配置同步 ============

const WEBDAV_FOLDER = 'jimeng-web/';

export async function fetchCloudConfig(): Promise<unknown | null> {
  return readWebDAVFile(WEBDAV_FOLDER + 'config.json');
}

export async function saveCloudConfig(data: unknown): Promise<boolean> {
  // 先尝试创建文件夹（忽略已存在的错误）
  try {
    const config = getWebDAVConfig();
    if (config) {
      const url = config.url.endsWith('/') ? config.url + WEBDAV_FOLDER : config.url + '/' + WEBDAV_FOLDER;
      const auth = btoa(`${config.username}:${config.password}`);
      await fetch(url, {
        method: 'MKCOL',
        headers: { 'Authorization': `Basic ${auth}` },
      });
    }
  } catch {
    // 忽略文件夹创建错误
  }
  return writeWebDAVFile(WEBDAV_FOLDER + 'config.json', data);
}

// ============ 历史记录同步 ============

export async function fetchCloudHistory(): Promise<unknown[] | null> {
  const data = await readWebDAVFile<{ items: unknown[] }>(WEBDAV_FOLDER + 'history.json');
  return data?.items || null;
}

export async function syncHistoryToCloud(items: unknown[]): Promise<boolean> {
  // 先尝试创建文件夹
  try {
    const config = getWebDAVConfig();
    if (config) {
      const url = config.url.endsWith('/') ? config.url + WEBDAV_FOLDER : config.url + '/' + WEBDAV_FOLDER;
      const auth = btoa(`${config.username}:${config.password}`);
      await fetch(url, {
        method: 'MKCOL',
        headers: { 'Authorization': `Basic ${auth}` },
      });
    }
  } catch {
    // 忽略文件夹创建错误
  }
  return writeWebDAVFile(WEBDAV_FOLDER + 'history.json', { items, updatedAt: Date.now() });
}
