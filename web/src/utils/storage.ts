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
  url: string;
  username: string;
  password: string;
}

const WEBDAV_CONFIG_KEY = 'webdav_config';
const WEBDAV_FOLDER = 'jimeng-web/';
let folderCreated = false;

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

async function webdavRequest(
  path: string,
  method: string,
  body?: BodyInit,
  contentType?: string
): Promise<Response> {
  const config = getWebDAVConfig();
  if (!config) throw new Error('WebDAV 未配置');

  const url = config.url.endsWith('/') ? config.url + path : config.url + '/' + path;
  const auth = btoa(`${config.username}:${config.password}`);
  const headers: Record<string, string> = {
    'Authorization': `Basic ${auth}`,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return fetch(url, {
    method,
    headers,
    body,
  });
}

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

async function writeWebDAVFile<T>(filename: string, data: T): Promise<boolean> {
  try {
    const res = await webdavRequest(filename, 'PUT', JSON.stringify(data, null, 2), 'application/json');
    return res.ok || res.status === 201 || res.status === 204;
  } catch (err) {
    console.error(`Write ${filename} error:`, err);
    return false;
  }
}

async function ensureFolder(): Promise<void> {
  if (folderCreated) return;
  try {
    const config = getWebDAVConfig();
    if (config) {
      const url = config.url.endsWith('/') ? config.url + WEBDAV_FOLDER : config.url + '/' + WEBDAV_FOLDER;
      const auth = btoa(`${config.username}:${config.password}`);
      await fetch(url, {
        method: 'MKCOL',
        headers: { 'Authorization': `Basic ${auth}` },
      });
      folderCreated = true;
    }
  } catch {
    // ignore existing folder errors
  }
}

export async function fetchCloudConfig(): Promise<unknown | null> {
  return readWebDAVFile(WEBDAV_FOLDER + 'config.json');
}

export async function saveCloudConfig(data: unknown): Promise<boolean> {
  await ensureFolder();
  return writeWebDAVFile(WEBDAV_FOLDER + 'config.json', data);
}
