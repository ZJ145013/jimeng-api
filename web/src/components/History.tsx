import { useState, useEffect } from 'react';
import { getHistory, removeHistory, clearHistory } from '../utils/history';
import { HistoryItem } from '../types';
import { Button } from './common/Button';
import { useToast } from './common/Toast';
import { proxyUrl } from '../services/core';
import { Clock, Trash2, X, Download, Layers, Film, Image as ImageIcon, AlertTriangle } from 'lucide-react';

export default function History() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'image_composition' | 'video'>('all');
  const { showToast } = useToast();

  const loadHistory = () => {
    setHistoryList(getHistory());
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = (id: string) => {
    removeHistory(id);
    loadHistory();
    setDeleteConfirmId(null);
    showToast('已删除记录', 'success');
  };

  const handleClearAll = () => {
    clearHistory();
    loadHistory();
    setShowClearDialog(false);
    showToast('已清空所有记录', 'success');
  };

  // 时间格式化
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  // 类型徽标配置
  const typeBadges: Record<string, { label: string; gradient: string; icon: typeof ImageIcon }> = {
    image: { label: '文生图', gradient: 'from-blue-500 to-cyan-500', icon: ImageIcon },
    image_composition: { label: '图生图', gradient: 'from-purple-500 to-pink-500', icon: Layers },
    video: { label: '视频', gradient: 'from-pink-500 to-orange-500', icon: Film },
  };

  // 筛选后的列表
  const filteredList = filter === 'all' ? historyList : historyList.filter(item => item.type === filter);

  // 提取所有可展示的媒体卡片（瀑布流的基本单元）
  const cards = filteredList.flatMap(item => {
    if (Array.isArray(item.result)) {
      // 图片类型：每张图片一个卡片
      return item.result.map((url, idx) => ({
        id: `${item.id}-${idx}`,
        parentId: item.id,
        type: item.type as string,
        url: proxyUrl(url),
        coverUrl: undefined as string | undefined,
        prompt: item.prompt,
        model: item.model,
        createdAt: item.createdAt,
        isVideo: false,
        totalImages: item.result ? (item.result as string[]).length : 1,
        imageIndex: idx,
      }));
    } else if (item.result && typeof item.result === 'object' && 'url' in item.result) {
      // 视频类型：一个卡片
      const videoResult = item.result as { url: string; coverUrl?: string };
      return [{
        id: item.id,
        parentId: item.id,
        type: item.type as string,
        url: proxyUrl(videoResult.url),
        coverUrl: videoResult.coverUrl ? proxyUrl(videoResult.coverUrl) : undefined,
        prompt: item.prompt,
        model: item.model,
        createdAt: item.createdAt,
        isVideo: true,
        totalImages: 1,
        imageIndex: 0,
      }];
    }
    return [];
  });

  // 将卡片分配到列中实现瀑布流（简单的轮询分配）
  const columnCount = 4; // 桌面端 4 列
  const columns: typeof cards[] = Array.from({ length: columnCount }, () => []);
  cards.forEach((card, i) => {
    columns[i % columnCount].push(card);
  });

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filters = [
    { key: 'all' as const, label: '全部', count: historyList.length },
    { key: 'image' as const, label: '文生图', count: historyList.filter(i => i.type === 'image').length },
    { key: 'image_composition' as const, label: '图生图', count: historyList.filter(i => i.type === 'image_composition').length },
    { key: 'video' as const, label: '视频', count: historyList.filter(i => i.type === 'video').length },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400" /> 创作画廊
          </h2>
          <p className="text-zinc-500 mt-2 font-medium">
            {historyList.length > 0
              ? `共 ${historyList.length} 条记录，${cards.length} 件作品`
              : '你的创作历史将在这里展示'}
          </p>
        </div>
        {historyList.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="flex gap-2"
          >
            <Trash2 className="w-4 h-4" /> 清空全部
          </Button>
        )}
      </header>

      {/* Filter Tabs */}
      {historyList.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 border ${
                filter === f.key
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-white/5 text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/10'
              }`}
            >
              {f.label}
              <span className="ml-2 text-xs opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredList.length === 0 && (
        <div className="glass-card rounded-3xl p-16 flex flex-col items-center justify-center border border-white/5">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
            <Clock className="w-12 h-12 text-zinc-600 stroke-1" />
          </div>
          <p className="text-zinc-400 text-lg mb-2 font-medium">
            {filter === 'all' ? '暂无创作记录' : '该类型暂无记录'}
          </p>
          <p className="text-zinc-600 text-sm">开始创作，你的作品将以画廊形式展示在这里</p>
        </div>
      )}

      {/* Masonry / Waterfall Grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-4">
              {col.map(card => {
                const badge = typeBadges[card.type] || { label: card.type, gradient: 'from-gray-500 to-gray-600', icon: ImageIcon };
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={card.id}
                    className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                  >
                    {/* 媒体内容 */}
                    {card.isVideo ? (
                      <div className="aspect-video relative">
                        <video
                          src={card.url}
                          controls
                          preload="metadata"
                          poster={card.coverUrl}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => setPreviewImage(card.url)}
                      >
                        <img
                          src={card.url}
                          alt={card.prompt}
                          className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* 悬浮信息层 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                      {/* 类型徽标 + 模型 */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white rounded-lg bg-gradient-to-r ${badge.gradient} shadow-sm`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">{card.model}</span>
                      </div>

                      {/* 提示词摘要 */}
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-2">{card.prompt}</p>

                      {/* 底栏：时间 + 操作按钮 */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">{formatTime(card.createdAt)}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(card.url, `jimeng-${card.type}-${Date.now()}.${card.isVideo ? 'mp4' : 'png'}`); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="下载"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(card.parentId); }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="删除整组"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 多图标记 */}
                    {!card.isVideo && card.totalImages > 1 && card.imageIndex === 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur text-[10px] text-white font-medium border border-white/10">
                        <Layers className="w-3 h-3 inline mr-1" />{card.totalImages}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation — 浮层 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">删除记录</h3>
            <p className="text-gray-400 mb-6 text-sm">确定要删除这条记录？该记录下的所有作品都将被移除。</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>取消</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deleteConfirmId)}>确认删除</Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowClearDialog(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">确认清空</h3>
            <p className="text-gray-400 mb-6">确定要清空所有历史记录吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="md" onClick={() => setShowClearDialog(false)}>取消</Button>
              <Button variant="danger" size="md" onClick={handleClearAll}>确认清空</Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute bottom-6 right-6 px-4 py-2 rounded-xl bg-white/10 backdrop-blur flex items-center gap-2 text-white hover:bg-white/20 transition-colors text-sm"
            onClick={(e) => { e.stopPropagation(); handleDownload(previewImage, `jimeng-${Date.now()}.png`); }}
          >
            <Download className="w-4 h-4" /> 下载原图
          </button>
        </div>
      )}
    </div>
  );
}
