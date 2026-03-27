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
