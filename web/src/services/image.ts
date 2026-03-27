import { SiteConfig } from '../types';
import { request } from './core';

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

export async function imageToImage(site: SiteConfig, params: {
  prompt: string;
  negative_prompt?: string;
  model: string;
  ratio: string;
  resolution: string;
  sample_strength?: number;
  intelligent_ratio?: boolean;
  images: string[];
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
