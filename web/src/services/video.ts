import { SiteConfig } from '../types';
import { ApiError, dataUrlToBlob, fetchWithTimeout, getNextApiKey, getSortedTokens, parseErrorText } from './core';

export async function submitVideoTask(site: SiteConfig, params: {
  prompt: string;
  model: string;
  ratio?: string;
  resolution?: string;
  duration?: number;
  file_paths?: string[]; 
  functionMode?: 'first_last_frames' | 'omni_reference';
  omni_images?: string[]; 
  omni_videos?: string[]; 
}) {
  if (!site.apiBase) throw new ApiError(0, '请先在配置中心设置 API 地址');
  const url = `${site.apiBase.replace(/\/+$/, '')}/v1/videos/generations`;
  const hasLocalImages = params.file_paths?.some(p => p.startsWith('data:'));

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

  const sortedTokens = await getSortedTokens(site);
  const apiKey = sortedTokens[0];
  if (!apiKey) throw new ApiError(0, '没有可用的 Token');

  let res: Response;
  const isOmniMode = params.functionMode === 'omni_reference';

  if (isOmniMode && (params.omni_images?.length || params.omni_videos?.length)) {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('model', params.model);
    formData.append('functionMode', 'omni_reference');
    if (params.ratio) formData.append('ratio', params.ratio);
    if (params.resolution) formData.append('resolution', params.resolution);
    if (params.duration) formData.append('duration', String(params.duration));

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
    if (params.resolution) formData.append('resolution', params.resolution);
    if (params.duration) formData.append('duration', String(params.duration));

    for (let i = 0; i < params.file_paths.length; i++) {
      const dataUrl = params.file_paths[i];
      if (dataUrl.startsWith('data:')) {
        const blobEntry = blobs!.find(b => b.index === i);
        if (blobEntry) formData.append(`image_file_${i + 1}`, blobEntry.blob, `frame_${i + 1}.png`);
      } else {
        formData.append('file_paths', dataUrl);
      }
    }

    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
  } else {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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
    const json = await res.json() as any;
    if (json.code && json.code !== 0) throw new ApiError(json.code, json.message || `业务错误: ${json.code}`);
    return json;
  }
  const text = await res.text().catch(() => '请求失败');
  throw new ApiError(res.status, parseErrorText(res.status, text));
}

export async function queryVideoTask(site: SiteConfig, taskId: string) {
  if (!site.apiBase) throw new ApiError(0, '请先配置 API');
  const apiKey = getNextApiKey(site);
  const url = `${site.apiBase.replace(/\/+$/, '')}/v1/videos/generations/${taskId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}` },
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
