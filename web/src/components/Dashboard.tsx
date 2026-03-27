import { useEffect, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { getHistory } from '../utils/history';
import { tokenPoints } from '../services/account';
import { proxyUrl } from '../services/core';
import { Activity, Database, Key, Server, History as HistoryIcon, Image as ImageIcon, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Dashboard() {
  const { config, activeSite } = useConfig();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [validKeys, setValidKeys] = useState(0);
  const history = getHistory();
  
  const allKeys = config.sites.flatMap(s => 
    s.apiKeys?.length > 0 ? s.apiKeys : (s.apiKey ? [s.apiKey] : [])
  );
  
  useEffect(() => {
    let active = true;
    const fetchPoints = async () => {
      if (allKeys.length === 0) {
        if (active) setTotalPoints(0);
        return;
      }
      const tokenApiBase = activeSite.apiBase || config.sites.find(s => s.apiBase)?.apiBase || '';
      if (!tokenApiBase) return;
      
      try {
        const results = await tokenPoints(tokenApiBase, allKeys);
        if (active) {
          const sum = results.reduce((acc, curr) => acc + (curr.points?.totalCredit || 0), 0);
          setTotalPoints(sum);
          setValidKeys(results.filter((r: any) => r.points !== undefined).length);
        }
      } catch (err) {
        console.warn('Dashboard fetch points failed', err);
      }
    };
    fetchPoints();
    return () => { active = false; };
  }, [allKeys.length, activeSite.apiBase]);

  const recentHistory = history.slice(0, 5);
  const imageCount = history.filter(h => h.type === 'image' || h.type === 'image_composition').length;
  const videoCount = history.filter(h => h.type === 'video').length;

  const statCards = [
    { name: '账号池连通率', value: `${validKeys} / ${allKeys.length}`, icon: <Key className="w-5 h-5 text-emerald-400" /> },
    { name: '累计生图', value: imageCount, icon: <ImageIcon className="w-5 h-5 text-blue-400" /> },
    { name: '累计视频', value: videoCount, icon: <Video className="w-5 h-5 text-fuchsia-400" /> },
    { name: '系统节点库', value: config.sites.length, icon: <Server className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="mb-10">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent tracking-tight">
          全息控制台
        </h2>
        <p className="text-zinc-500 mt-2 font-medium">即梦核心引擎状态与宏观指标概览</p>
      </header>
      
      {/* 算力池展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none transition-opacity duration-1000 group-hover:opacity-100" />
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-200">全网剩余算力点</h3>
          </div>
          <div className="flex items-baseline gap-4">
            {totalPoints === null ? (
              <div className="h-16 w-48 bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <span className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-fuchsia-300">
                {totalPoints.toLocaleString()}
              </span>
            )}
            <span className="text-zinc-500 font-medium">Pts</span>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-200">当前活跃节点</h3>
            </div>
            <p className="text-3xl font-bold text-gray-100">{activeSite.name}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-zinc-400 border border-white/10">
              图像模型: {activeSite.imageModels.length}
            </span>
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-zinc-400 border border-white/10">
              视频模型: {activeSite.videoModels.length}
            </span>
          </div>
        </div>
      </div>

      {/* 四小模块 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 border border-white/5 hover:bg-white/[0.03] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-zinc-500">{stat.name}</p>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-gray-200">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 活跃历史 */}
      <div className="glass-card rounded-3xl p-8 border border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <HistoryIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-200">近期生成轨迹</h3>
          </div>
        </div>
        
        {recentHistory.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            暂无生成记录，去工作台试试吧
          </div>
        ) : (
          <div className="space-y-4">
            {recentHistory.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4 truncate">
                  <div className="w-12 h-12 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center shrink-0">
                    {item.result && item.result.length > 0 ? (
                      item.type === 'video' ? (
                        <video src={typeof item.result === 'object' && !Array.isArray(item.result) ? proxyUrl(item.result.url) : ''} className="w-full h-full object-cover" />
                      ) : (
                        <img src={Array.isArray(item.result) ? proxyUrl(item.result[0]) : ''} alt="thumb" className="w-full h-full object-cover opacity-80" />
                      )
                    ) : (
                      <span className="text-xs text-gray-500">无图</span>
                    )}
                  </div>
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium text-gray-200 truncate">{item.prompt || '无提示词'}</p>
                    <p className="text-xs text-zinc-500 mt-1 flex gap-2">
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/5">{item.model}</span>
                      <span>{item.type === 'video' ? '视频生成' : '图片生成'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: zhCN })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
