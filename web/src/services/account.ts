import { ApiError, parseErrorText } from './core';
import { TokenRegion } from '../types';

export async function tokenReceive(apiBase: string, keys: string[]) {
  if (!apiBase) throw new ApiError(0, '请先配置 API 地址');
  if (keys.length === 0) throw new ApiError(0, '没有可用的 Token');

  const url = `${apiBase.replace(/\/+$/, '')}/token/receive`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${keys.join(',')}` },
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

export async function tokenPoints(apiBase: string, keys: string[]) {
  if (!apiBase) throw new ApiError(0, '请先配置 API 地址');
  if (keys.length === 0) throw new ApiError(0, '没有可用的 Token');

  const url = `${apiBase.replace(/\/+$/, '')}/token/points`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${keys.join(',')}` },
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

  return res.json() as Promise<{ live: boolean; region: TokenRegion }>;
}
