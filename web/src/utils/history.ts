import { HistoryItem } from '../types';
import { getItem, setItem } from './storage';

const HISTORY_KEY = 'history';
const MAX_HISTORY = 200;

export function getHistory(): HistoryItem[] {
  return getItem<HistoryItem[]>(HISTORY_KEY, []);
}

export function setHistory(items: HistoryItem[]): void {
  setItem(HISTORY_KEY, items);
}

export function addHistory(item: HistoryItem): void {
  const history = getHistory();
  history.unshift(item);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  setItem(HISTORY_KEY, history);
}

export function removeHistory(id: string): void {
  const history = getHistory().filter(item => item.id !== id);
  setItem(HISTORY_KEY, history);
}

export function clearHistory(): void {
  setItem(HISTORY_KEY, []);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function syncCloudHistory(apiUrl: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/v1/my_history`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const cloudItems = json.data;
      const history = getHistory();
      let added = false;

      cloudItems.forEach((cItem: any) => {
        const exists = history.some(h => {
          if (h.type === 'video') {
             return h.result === cItem.url || (h.result as any)?.url === cItem.url;
          } else {
             const imgs = Array.isArray(h.result) ? h.result : [h.result];
             return imgs?.includes(cItem.url);
          }
        });

        if (!exists) {
          added = true;
          history.unshift({
            id: cItem.id,
            type: cItem.type === 'video' ? 'video' : 'image',
            prompt: cItem.prompt,
            model: '云端脱线追回',
            result: cItem.type === 'video' ? cItem.url : [cItem.url],
            createdAt: cItem.created_at * 1000,
            status: 'success',
            params: {}
          } as HistoryItem);
        }
      });

      if (added) {
        history.sort((a, b) => b.createdAt - a.createdAt);
        if (history.length > MAX_HISTORY) {
            history.length = MAX_HISTORY;
        }
        setItem(HISTORY_KEY, history);
        return true;
      }
    }
  } catch (err) {
    console.error("同步云端断网备份历史失败", err);
  }
  return false;
}
