import { useState, useEffect } from 'react';
import { getHistory, removeHistory, clearHistory } from '../utils/history';
import { HistoryItem } from '../types';
import { Button } from './common/Button';
import { useToast } from './common/Toast';
import { proxyUrl } from '../services/core';

export default function History() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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

  const getTypeBadge = (type: string) => {
    const badges = {
      image: { label: '文生图', gradient: 'from-blue-500 to-cyan-500' },
      image_composition: { label: '图生图', gradient: 'from-purple-500 to-pink-500' },
      video: { label: '视频', gradient: 'from-pink-500 to-orange-500' },
    };
    const badge = badges[type as keyof typeof badges] || { label: type, gradient: 'from-gray-500 to-gray-600' };
    return (
      <span className={`inline-block px-2.5 py-1 text-xs font-medium text-white rounded-lg bg-gradient-to-r ${badge.gradient} shadow-sm`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white text-glow mb-2">历史记录</h1>
          <p className="text-gray-400">查看你的所有生成记录</p>
        </div>
        {historyList.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearDialog(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清空全部
          </Button>
        )}
      </div>

      {/* Empty State */}
      {historyList.length === 0 && (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg mb-2">暂无生成记录</p>
          <p className="text-gray-500 text-sm">开始创作，你的作品将显示在这里</p>
        </div>
      )}

      {/* History List */}
      <div className="space-y-4">
        {historyList.map((item) => (
          <div key={item.id} className="glass-card rounded-2xl p-5 hover-lift group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {getTypeBadge(item.type)}
                  <span className="text-sm text-gray-500">{formatTime(item.createdAt)}</span>
                </div>
                <p className="text-gray-300 text-sm line-clamp-2 break-words leading-relaxed pl-1 border-l-2 border-indigo-500/30">
                  {item.prompt}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 border border-white/5">
                    模型: {item.model}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmId(item.id)}
                className="ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-500/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>

            {/* Results Grid */}
            {item.result && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                {Array.isArray(item.result) ? (
                  // Image results
                  item.result.map((url, idx) => (
                    <div key={idx} className="relative group/item aspect-square rounded-xl overflow-hidden cursor-pointer image-glow border border-white/10" onClick={() => setPreviewImage(proxyUrl(url))}>
                      <img src={proxyUrl(url)} alt={`Result ${idx + 1}`} className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                    </div>
                  ))
                ) : (
                  // Video result
                  <div className="md:col-span-2 lg:col-span-2 aspect-video rounded-xl overflow-hidden image-glow relative bg-black border border-white/10 group/item">
                    <video src={proxyUrl(item.result.url)} controls preload="metadata" poster={item.result.coverUrl ? proxyUrl(item.result.coverUrl) : undefined} className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId === item.id && (
              <div className="mt-4 p-4 glass-card rounded-xl border border-red-500/30">
                <p className="text-sm text-gray-300 mb-3">确定要删除这条记录吗？</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    确认删除
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">确认清空</h3>
            <p className="text-gray-400 mb-6">确定要清空所有历史记录吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowClearDialog(false)}
              >
                取消
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleClearAll}
              >
                确认清空
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-5xl max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-xl glass flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
