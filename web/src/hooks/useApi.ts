import { useState, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { textToImage, imageToImage } from '../services/image';
import { submitVideoTask, queryVideoTask } from '../services/video';
import { ApiError, proxyUrl } from '../services/core';
import { addHistory, generateId } from '../utils/history';

interface UseApiState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useTextToImage() {
  const { activeSite } = useConfig();
  const [state, setState] = useState<UseApiState<Array<{ url: string }>>>({
    loading: false, error: null, data: null,
  });

  const generate = useCallback(async (params: {
    prompt: string;
    negative_prompt?: string;
    model: string;
    ratio: string;
    resolution: string;
    sample_strength?: number;
    intelligent_ratio?: boolean;
  }) => {
    setState({ loading: true, error: null, data: null });
    try {
      const res = await textToImage(activeSite, params);
      const images = (res.data || []).map(img => ({ url: proxyUrl(img.url) }));
      setState({ loading: false, error: null, data: images });

      if (images.length > 0) {
        addHistory({
          id: generateId(),
          type: 'image',
          prompt: params.prompt,
          model: params.model,
          params: { ...params },
          result: images.map(img => img.url),
          createdAt: Date.now(),
        });
      }

      return images;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '生成失败，请重试';
      setState({ loading: false, error: message, data: null });
      throw err;
    }
  }, [activeSite]);

  return { ...state, generate };
}

export function useImageToImage() {
  const { activeSite } = useConfig();
  const [state, setState] = useState<UseApiState<Array<{ url: string }>>>({
    loading: false, error: null, data: null,
  });

  const generate = useCallback(async (params: {
    prompt: string;
    negative_prompt?: string;
    model: string;
    ratio: string;
    resolution: string;
    sample_strength?: number;
    intelligent_ratio?: boolean;
    images: string[];
  }) => {
    setState({ loading: true, error: null, data: null });
    try {
      const res = await imageToImage(activeSite, params);
      const images = (res.data || []).map(img => ({ url: proxyUrl(img.url) }));
      setState({ loading: false, error: null, data: images });

      if (images.length > 0) {
        addHistory({
          id: generateId(),
          type: 'image_composition',
          prompt: params.prompt,
          model: params.model,
          params: { ...params, images: [`${params.images.length}张图片`] },
          result: images.map(img => img.url),
          createdAt: Date.now(),
        });
      }

      return images;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '生成失败，请重试';
      setState({ loading: false, error: message, data: null });
      throw err;
    }
  }, [activeSite]);

  return { ...state, generate };
}

export function useVideoGeneration() {
  const { activeSite } = useConfig();
  const [state, setState] = useState<UseApiState<{ url: string; cover_url?: string }>>({
    loading: false, error: null, data: null,
  });
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');

  const generate = useCallback(async (params: {
    prompt: string;
    model: string;
    ratio?: string;
    resolution?: string;
    duration?: number;
    file_paths?: string[];
    functionMode?: 'first_last_frames' | 'omni_reference';
    omni_images?: string[];
    omni_videos?: string[];
  }) => {
    setState({ loading: true, error: null, data: null });
    setProgress(0);
    setStatusText(params.file_paths?.length ? '上传图片中...' : '提交任务中...');

    try {
      const res = await submitVideoTask(activeSite, params);
      console.log('视频生成API响应:', JSON.stringify(res, null, 2));

      // API 可能直接返回结果（data 数组）或返回 task_id 需要轮询
      if (res.data && res.data.length > 0) {
        const result = { url: proxyUrl(res.data[0].url) };
        setState({ loading: false, error: null, data: result });
        setStatusText('');

        addHistory({
          id: generateId(),
          type: 'video',
          prompt: params.prompt,
          model: params.model,
          params: { ...params, file_paths: undefined },
          result: { url: result.url },
          createdAt: Date.now(),
        });

        return result;
      }

      // 轮询模式
      const taskId = res.task_id;
      if (!taskId) {
        // 后端可能还在处理图片上传，返回了空响应
        throw new ApiError(0, '服务端未返回任务ID，请检查图片格式或稍后重试');
      }
      setStatusText('等待生成中...');

      // 指数退避轮询：3s -> 5s -> 8s -> 10s（最大）
      const pollIntervals = [3000, 5000, 8000, 10000];
      const maxPollTime = 15 * 60 * 1000; // 最大轮询 15 分钟
      const startTime = Date.now();
      let pollCount = 0;
      let consecutiveErrors = 0;

      while (Date.now() - startTime < maxPollTime) {
        const interval = pollIntervals[Math.min(pollCount, pollIntervals.length - 1)];
        await new Promise(resolve => setTimeout(resolve, interval));
        pollCount++;

        try {
          const status = await queryVideoTask(activeSite, taskId);
          // 成功请求，重置连续错误计数
          consecutiveErrors = 0;

          if (status.progress !== undefined) {
            setProgress(status.progress);
          }

          if (status.status === 'success' && status.result) {
            const proxiedResult = {
              url: proxyUrl(status.result.url),
              cover_url: status.result.cover_url ? proxyUrl(status.result.cover_url) : undefined,
            };
            setState({ loading: false, error: null, data: proxiedResult });
            setStatusText('');

            addHistory({
              id: generateId(),
              type: 'video',
              prompt: params.prompt,
              model: params.model,
              params: { ...params, file_paths: undefined },
              result: { url: proxiedResult.url, coverUrl: proxiedResult.cover_url },
              createdAt: Date.now(),
            });

            return proxiedResult;
          }

          if (status.status === 'failed') {
            throw new ApiError(0, status.fail_reason || '视频生成失败');
          }

          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const progressText = status.progress !== undefined ? `${Math.round(status.progress * 100)}%` : '';
          setStatusText(`生成中... ${progressText} (${elapsed}s)`);

        } catch (err) {
          // 如果是查询抛错，且不是业务明确抛出的明确失败（任务本身 failed 会通过 status.status 抛出去）
          // 则只累加连续错误，不终止轮询，容忍网络抖动
          if (err instanceof ApiError && err.message.includes('生成失败')) {
            throw err; // 由于状态被置为 failed 导致的明确错误，停止轮询
          }

          console.warn('轮询偶尔失败, 将重试:', err);
          consecutiveErrors++;
          if (consecutiveErrors >= 15) {
            throw new Error('网络连接持续不稳定，无法获取生成状态。您可稍后尝试刷新网页');
          }

          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setStatusText(`连接不稳定，重试中 (${consecutiveErrors}/15) - (${elapsed}s)`);
        }
      }

      throw new ApiError(0, '任务超时，请稍后在历史记录中查看');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '生成失败，请重试';
      setState({ loading: false, error: message, data: null });
      setStatusText('');
      throw err;
    }
  }, [activeSite]);

  return { ...state, progress, statusText, generate };
}
