import fs from "fs";
import path from "path";
import util from "./util.ts";

const DB_PATH = path.resolve(process.cwd(), "jimeng-offline-history.json");
const MAX_RECORDS = 100;

export interface OfflineTask {
  id: string;
  type: string; 
  prompt: string;
  url: string;
  created_at: number;
}

/**
 * 在云端悄悄记录这一单生图的结果，以备前端断网时用以认领
 */
export function saveTaskResult(type: 'image' | 'video', prompt: string, urls: string[]) {
  try {
    let history: OfflineTask[] = [];
    if (fs.existsSync(DB_PATH)) {
      history = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }

    const now = util.unixTimestamp();
    for (const url of urls) {
      // 去重：要是这个产物已经存在我们就不插了
      if (!history.some(item => item.url === url)) {
         history.unshift({
           id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
           type,
           prompt,
           url,
           created_at: now
         });
      }
    }

    // 限定容量，防止把人家磁盘撑爆
    if (history.length > MAX_RECORDS) {
      history = history.slice(0, MAX_RECORDS);
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(history, null, 2), "utf-8");
  } catch (error) {
    console.error("写入离线历史备忘录失败（无关痛痒，仅跳过）:", error);
  }
}

export function getOfflineUnclaimedRecords(): OfflineTask[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (err) {
    return [];
  }
  return [];
}
