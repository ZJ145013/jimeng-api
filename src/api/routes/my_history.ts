import Request from "@/lib/request/Request.ts";
import { getOfflineUnclaimedRecords } from "@/lib/my-history-db.ts";

export default {
  prefix: "/v1/my_history",
  
  get: {
    "/": async (request: Request) => {
      // 取回在所有脱机或失联状态下被抢救下来的成果
      const records = getOfflineUnclaimedRecords();
      return {
        ret: 0,
        data: records,
        message: "这是来自兜底画廊的失联作品"
      };
    },
  },
};
