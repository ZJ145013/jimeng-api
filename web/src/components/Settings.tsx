import { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { Region, SiteConfig, HistoryItem } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { useToast } from './common/Toast';
import { tokenReceive, tokenPoints, tokenCheck } from '../utils/api';
import {
  getWebDAVConfig,
  setWebDAVConfig,
  checkWebDAV,
  fetchCloudConfig,
  saveCloudConfig,
  fetchCloudHistory,
  syncHistoryToCloud,
} from '../utils/storage';
import { getHistory, setHistory } from '../utils/history';

const REGION_LABELS: Record<Region, string> = {
  cn: '国内',
  intl: '国际',
};

const DEFAULT_API_BASES: Record<Region, string> = {
  cn: '',
  intl: '',
};

export default function Settings() {
  const { config, activeSite, setActiveSiteId, updateSite, addSite, removeSite } = useConfig();
  const { showToast } = useToast();
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newImageModel, setNewImageModel] = useState('');
  const [newVideoModel, setNewVideoModel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
  const [editingKeyLabel, setEditingKeyLabel] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);

  // 确保 apiKeys 数组存在（兼容旧数据）
  const apiKeys = activeSite.apiKeys?.length > 0
    ? activeSite.apiKeys
    : (activeSite.apiKey ? [activeSite.apiKey] : []);

  // Key 备注映射
  const apiKeyLabels = activeSite.apiKeyLabels || {};

  const handleUpdateField = (field: keyof SiteConfig, value: unknown) => {
    const updated = { ...activeSite, [field]: value };
    updateSite(updated);
    showToast('配置已保存', 'success');
  };

  const handleAddApiKey = () => {
    if (!newApiKey.trim()) return;
    const key = newApiKey.trim();
    if (apiKeys.includes(key)) {
      showToast('该 Key 已存在', 'error');
      return;
    }
    // 同时保存备注
    const newLabels = { ...apiKeyLabels };
    if (newApiKeyLabel.trim()) {
      newLabels[key] = newApiKeyLabel.trim();
    }
    const updated = { ...activeSite, apiKeys: [...apiKeys, key], apiKeyLabels: newLabels };
    updateSite(updated);
    showToast('配置已保存', 'success');
    setNewApiKey('');
    setNewApiKeyLabel('');
  };

  const handleRemoveApiKey = (key: string) => {
    const newKeys = apiKeys.filter(k => k !== key);
    const newLabels = { ...apiKeyLabels };
    delete newLabels[key];
    const updated = { ...activeSite, apiKeys: newKeys, apiKeyLabels: newLabels };
    updateSite(updated);
    showToast('配置已保存', 'success');
  };

  const handleSaveKeyLabel = (key: string) => {
    const newLabels = { ...apiKeyLabels };
    if (editingLabelValue.trim()) {
      newLabels[key] = editingLabelValue.trim();
    } else {
      delete newLabels[key];
    }
    handleUpdateField('apiKeyLabels', newLabels);
    setEditingKeyLabel(null);
  };

  const handleAddImageModel = () => {
    if (!newImageModel.trim()) return;
    if (activeSite.imageModels.includes(newImageModel.trim())) {
      showToast('模型已存在', 'error');
      return;
    }
    handleUpdateField('imageModels', [...activeSite.imageModels, newImageModel.trim()]);
    setNewImageModel('');
  };

  const handleRemoveImageModel = (model: string) => {
    handleUpdateField('imageModels', activeSite.imageModels.filter(m => m !== model));
  };

  const handleAddVideoModel = () => {
    if (!newVideoModel.trim()) return;
    if (activeSite.videoModels.includes(newVideoModel.trim())) {
      showToast('模型已存在', 'error');
      return;
    }
    handleUpdateField('videoModels', [...activeSite.videoModels, newVideoModel.trim()]);
    setNewVideoModel('');
  };

  const handleRemoveVideoModel = (model: string) => {
    handleUpdateField('videoModels', activeSite.videoModels.filter(m => m !== model));
  };

  const handleDeleteSite = () => {
    if (config.sites.length === 1) {
      showToast('至少保留一个站点配置', 'error');
      return;
    }
    removeSite(activeSite.id);
    showToast('站点已删除', 'success');
    setShowDeleteConfirm(false);
  };

  const handleAddNewSite = (newSite: SiteConfig) => {
    if (config.sites.find(s => s.id === newSite.id)) {
      showToast('站点 ID 已存在', 'error');
      return;
    }
    addSite(newSite);
    setActiveSiteId(newSite.id);
    setShowAddSiteDialog(false);
    showToast('站点已添加', 'success');
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  // Token 管理状态
  // 收集所有站点的全部 Key
  const allApiKeys = config.sites.flatMap(s =>
    s.apiKeys?.length > 0 ? s.apiKeys : (s.apiKey ? [s.apiKey] : [])
  );
  // 找一个可用的 apiBase（优先当前站点）
  const tokenApiBase = activeSite.apiBase || config.sites.find(s => s.apiBase)?.apiBase || '';

  const [tokenLoading, setTokenLoading] = useState<string | null>(null);
  const [tokenResults, setTokenResults] = useState<Array<{
    token: string;
    status?: string;
    credits?: number;
    detail?: string;
  }>>([]);

  // WebDAV 同步状态
  const [webdavUrl, setWebdavUrl] = useState(() => getWebDAVConfig()?.url || '');
  const [webdavUsername, setWebdavUsername] = useState(() => getWebDAVConfig()?.username || '');
  const [webdavPassword, setWebdavPassword] = useState(() => getWebDAVConfig()?.password || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [syncLoading, setSyncLoading] = useState<string | null>(null);

  const handleReceiveCredits = async () => {
    setTokenLoading('receive');
    setTokenResults([]);
    try {
      const results = await tokenReceive(tokenApiBase, allApiKeys);
      setTokenResults(results.map(r => ({
        token: maskKey(r.token),
        status: r.received ? '签到成功' : '已签到',
        credits: r.credits?.totalCredit,
        detail: r.error || undefined,
      })));
      const successCount = results.filter(r => r.received).length;
      showToast(`签到完成: ${successCount}/${results.length} 个成功`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '签到失败', 'error');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleQueryPoints = async () => {
    setTokenLoading('points');
    setTokenResults([]);
    try {
      const results = await tokenPoints(tokenApiBase, allApiKeys);
      setTokenResults(results.map(r => ({
        token: maskKey(r.token),
        credits: r.points?.totalCredit,
        detail: `赠送:${r.points?.giftCredit} 购买:${r.points?.purchaseCredit} VIP:${r.points?.vipCredit}`,
      })));
      showToast('积分查询完成', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '查询失败', 'error');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleCheckTokens = async () => {
    setTokenLoading('check');
    setTokenResults([]);
    try {
      const results = await Promise.all(
        allApiKeys.map(async (key) => {
          try {
            const res = await tokenCheck(tokenApiBase, key);
            return { token: maskKey(key), status: res.live ? '有效' : '失效' };
          } catch {
            return { token: maskKey(key), status: '检查失败' };
          }
        })
      );
      setTokenResults(results);
      const liveCount = results.filter(r => r.status === '有效').length;
      showToast(`验活完成: ${liveCount}/${results.length} 个有效`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '验活失败', 'error');
    } finally {
      setTokenLoading(null);
    }
  };

  // 检查 WebDAV 连接
  const handleCheckWebDAV = async () => {
    if (!webdavUrl.trim() || !webdavUsername.trim() || !webdavPassword.trim()) {
      showToast('请填写完整的 WebDAV 配置', 'error');
      return;
    }
    setSyncStatus('checking');
    try {
      const config = {
        url: webdavUrl.trim(),
        username: webdavUsername.trim(),
        password: webdavPassword.trim(),
      };
      const ok = await checkWebDAV(config);
      if (ok) {
        setWebDAVConfig(config);
        setSyncStatus('connected');
        showToast('连接成功', 'success');
      } else {
        setSyncStatus('error');
        showToast('连接失败，请检查配置', 'error');
      }
    } catch {
      setSyncStatus('error');
      showToast('连接失败', 'error');
    }
  };

  // 清除 WebDAV 配置
  const handleClearWebDAV = () => {
    setWebdavUrl('');
    setWebdavUsername('');
    setWebdavPassword('');
    setWebDAVConfig(null);
    setSyncStatus('idle');
    showToast('WebDAV 配置已清除', 'success');
  };

  // 上传配置到云端
  const handleUploadConfig = async () => {
    if (!getWebDAVConfig()) {
      showToast('请先配置 WebDAV', 'error');
      return;
    }
    setSyncLoading('upload-config');
    try {
      const ok = await saveCloudConfig(config);
      if (ok) {
        showToast('配置已上传到云端', 'success');
      } else {
        showToast('上传失败', 'error');
      }
    } catch {
      showToast('上传失败', 'error');
    } finally {
      setSyncLoading(null);
    }
  };

  // 从云端下载配置
  const handleDownloadConfig = async () => {
    if (!getWebDAVConfig()) {
      showToast('请先配置 WebDAV', 'error');
      return;
    }
    setSyncLoading('download-config');
    try {
      const cloudConfig = await fetchCloudConfig();
      if (cloudConfig && typeof cloudConfig === 'object') {
        showToast('配置已从云端下载，请刷新页面', 'success');
        localStorage.setItem('jimeng_config', JSON.stringify(cloudConfig));
        window.location.reload();
      } else {
        showToast('云端没有配置数据', 'info');
      }
    } catch {
      showToast('下载失败', 'error');
    } finally {
      setSyncLoading(null);
    }
  };

  // 上传历史记录到云端
  const handleUploadHistory = async () => {
    if (!getWebDAVConfig()) {
      showToast('请先配置 WebDAV', 'error');
      return;
    }
    setSyncLoading('upload-history');
    try {
      const history = getHistory();
      const ok = await syncHistoryToCloud(history);
      if (ok) {
        showToast(`已上传 ${history.length} 条历史记录`, 'success');
      } else {
        showToast('上传失败', 'error');
      }
    } catch {
      showToast('上传失败', 'error');
    } finally {
      setSyncLoading(null);
    }
  };

  // 从云端下载历史记录
  const handleDownloadHistory = async () => {
    if (!getWebDAVConfig()) {
      showToast('请先配置 WebDAV', 'error');
      return;
    }
    setSyncLoading('download-history');
    try {
      const cloudHistory = await fetchCloudHistory();
      if (cloudHistory && Array.isArray(cloudHistory) && cloudHistory.length > 0) {
        // 合并云端历史和本地历史（去重）
        const localHistory = getHistory();
        const localIds = new Set(localHistory.map(h => h.id));
        const newItems = (cloudHistory as HistoryItem[]).filter(h => !localIds.has(h.id));
        const merged = [...localHistory, ...newItems].sort((a, b) => b.createdAt - a.createdAt);
        setHistory(merged);
        showToast(`已下载 ${newItems.length} 条新记录，共 ${merged.length} 条`, 'success');
      } else {
        showToast('云端没有历史记录', 'info');
      }
    } catch {
      showToast('下载失败', 'error');
    } finally {
      setSyncLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">配置中心</h1>

        {/* Site tabs */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {config.sites.map(site => (
            <button
              key={site.id}
              onClick={() => setActiveSiteId(site.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSite.id === site.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {site.name}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setShowAddSiteDialog(true)}>
            + 添加站点
          </Button>
        </div>

        {/* Site config form */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">站点配置</h2>

          <div className="space-y-4">
            <Input
              label="站点名称"
              value={activeSite.name}
              onChange={(e) => handleUpdateField('name', e.target.value)}
              placeholder="例如：国内站"
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">区域</label>
              <select
                value={activeSite.region}
                onChange={(e) => handleUpdateField('region', e.target.value as Region)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              >
                {Object.entries(REGION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <Input
              label="API Base URL"
              value={activeSite.apiBase}
              onChange={(e) => handleUpdateField('apiBase', e.target.value)}
              placeholder="https://api.example.com"
            />

            {/* Multi API Keys */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  API Keys ({apiKeys.length} 个，轮询使用)
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1"
                >
                  {showApiKeys ? '隐藏' : '显示'}
                </button>
              </div>

              {apiKeys.length > 0 && (
                <div className="space-y-2 mb-3">
                  {apiKeys.map((key, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-gray-800 text-gray-200 px-3 py-2 rounded-lg text-sm"
                    >
                      <span className="text-gray-500 text-xs shrink-0">#{idx + 1}</span>
                      <span className="font-mono shrink-0">{showApiKeys ? key : maskKey(key)}</span>
                      {/* 备注显示/编辑 */}
                      {editingKeyLabel === key ? (
                        <div className="flex items-center gap-1 ml-2">
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKeyLabel(key); if (e.key === 'Escape') setEditingKeyLabel(null); }}
                            placeholder="输入备注"
                            className="w-28 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button onClick={() => handleSaveKeyLabel(key)} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                          <button onClick={() => setEditingKeyLabel(null)} className="text-gray-400 hover:text-gray-300 text-xs">✗</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingKeyLabel(key); setEditingLabelValue(apiKeyLabels[key] || ''); }}
                          className="ml-2 text-xs px-1.5 py-0.5 rounded transition-colors shrink-0"
                          title="点击编辑备注"
                        >
                          {apiKeyLabels[key]
                            ? <span className="bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded">{apiKeyLabels[key]}</span>
                            : <span className="text-gray-500 hover:text-gray-400">+ 备注</span>
                          }
                        </button>
                      )}
                      <span className="flex-1" />
                      <button
                        onClick={() => handleRemoveApiKey(key)}
                        className="text-gray-400 hover:text-red-400 transition-colors shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddApiKey()}
                  placeholder="输入新的 API Key"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />
                <input
                  type="text"
                  value={newApiKeyLabel}
                  onChange={(e) => setNewApiKeyLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddApiKey()}
                  placeholder="备注（可选）"
                  className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />
                <Button size="sm" onClick={handleAddApiKey}>添加 Key</Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">多个 Key 将轮询使用，可用于负载均衡或绕过速率限制</p>
              {activeSite.region === 'intl' && (
                <p className="text-xs text-amber-400/80 mt-1">国际站 Token 需加国家前缀：us-xxx、hk-xxx、jp-xxx、sg-xxx</p>
              )}
            </div>
          </div>
        </div>

        {/* Token 管理 */}
        {allApiKeys.length > 0 && tokenApiBase && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Token 管理</h2>
            <p className="text-xs text-gray-500 mb-4">对所有站点的 {allApiKeys.length} 个 Token 统一操作</p>

            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                size="sm"
                onClick={handleReceiveCredits}
                loading={tokenLoading === 'receive'}
                disabled={!!tokenLoading}
              >
                一键签到
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleQueryPoints}
                loading={tokenLoading === 'points'}
                disabled={!!tokenLoading}
              >
                查询积分
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCheckTokens}
                loading={tokenLoading === 'check'}
                disabled={!!tokenLoading}
              >
                验活检测
              </Button>
            </div>

            {tokenResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">Token</th>
                      {tokenResults[0].status !== undefined && (
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">状态</th>
                      )}
                      {tokenResults[0].credits !== undefined && (
                        <th className="text-right px-4 py-2 text-gray-400 font-medium">总积分</th>
                      )}
                      {tokenResults[0].detail && (
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">详情</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tokenResults.map((r, idx) => (
                      <tr key={idx} className="border-b border-gray-700/50 last:border-0">
                        <td className="px-4 py-2 text-gray-300 font-mono text-xs">{r.token}</td>
                        {r.status !== undefined && (
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              r.status === '有效' || r.status === '签到成功'
                                ? 'bg-green-900/50 text-green-300'
                                : r.status === '失效' || r.status === '检查失败'
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        )}
                        {r.credits !== undefined && (
                          <td className="px-4 py-2 text-right text-gray-200">{r.credits}</td>
                        )}
                        {r.detail && (
                          <td className="px-4 py-2 text-gray-400 text-xs">{r.detail}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* WebDAV 云同步配置 */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">WebDAV 云同步</h2>
          <p className="text-xs text-gray-500 mb-4">通过 WebDAV 实现多设备数据同步（支持坚果云、Nextcloud 等）</p>

          <div className="space-y-4">
            <Input
              label="WebDAV 地址"
              value={webdavUrl}
              onChange={(e) => setWebdavUrl(e.target.value)}
              placeholder="https://dav.jianguoyun.com/dav/jimeng-sync/"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="用户名"
                value={webdavUsername}
                onChange={(e) => setWebdavUsername(e.target.value)}
                placeholder="邮箱或用户名"
              />
              <Input
                label="密码"
                type="password"
                value={webdavPassword}
                onChange={(e) => setWebdavPassword(e.target.value)}
                placeholder="应用密码"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCheckWebDAV}
                disabled={syncStatus === 'checking'}
              >
                {syncStatus === 'checking' ? '检测中...' : '测试连接'}
              </Button>
              {syncStatus === 'connected' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  已连接
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  连接失败
                </span>
              )}
              {getWebDAVConfig() && (
                <button
                  onClick={handleClearWebDAV}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  清除配置
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              坚果云用户：在账户设置 → 安全选项 → 第三方应用管理 中添加应用密码
            </p>

            {getWebDAVConfig() && (
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">数据同步</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm text-gray-200 mb-2">配置数据</h4>
                    <p className="text-xs text-gray-500 mb-3">站点配置、API Keys、模型列表</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleUploadConfig}
                        loading={syncLoading === 'upload-config'}
                        disabled={!!syncLoading}
                      >
                        上传
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleDownloadConfig}
                        loading={syncLoading === 'download-config'}
                        disabled={!!syncLoading}
                      >
                        下载
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm text-gray-200 mb-2">历史记录</h4>
                    <p className="text-xs text-gray-500 mb-3">生成历史、图片、视频记录</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleUploadHistory}
                        loading={syncLoading === 'upload-history'}
                        disabled={!!syncLoading}
                      >
                        上传
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleDownloadHistory}
                        loading={syncLoading === 'download-history'}
                        disabled={!!syncLoading}
                      >
                        下载
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model management */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">模型管理</h2>

          {/* Image models */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">图片生成模型</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {activeSite.imageModels.map(model => (
                <div
                  key={model}
                  className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 px-3 py-1.5 rounded-lg text-sm"
                >
                  <span>{model}</span>
                  <button
                    onClick={() => handleRemoveImageModel(model)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageModel}
                onChange={(e) => setNewImageModel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddImageModel()}
                placeholder="输入模型名称"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
              <Button size="sm" onClick={handleAddImageModel}>添加模型</Button>
            </div>
          </div>

          {/* Video models */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">视频生成模型</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {activeSite.videoModels.map(model => (
                <div
                  key={model}
                  className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 px-3 py-1.5 rounded-lg text-sm"
                >
                  <span>{model}</span>
                  <button
                    onClick={() => handleRemoveVideoModel(model)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newVideoModel}
                onChange={(e) => setNewVideoModel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVideoModel()}
                placeholder="输入模型名称"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
              <Button size="sm" onClick={handleAddVideoModel}>添加模型</Button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-gray-900 rounded-xl p-6 border border-red-900/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">危险操作</h2>
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-300">确定要删除站点 "{activeSite.name}" 吗？此操作无法撤销。</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleDeleteSite}>
                  确认删除
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              删除此站点
            </Button>
          )}
        </div>
      </div>

      {/* Add site dialog */}
      {showAddSiteDialog && (
        <AddSiteDialog
          onAdd={handleAddNewSite}
          onCancel={() => setShowAddSiteDialog(false)}
        />
      )}
    </div>
  );
}

function AddSiteDialog({ onAdd, onCancel }: { onAdd: (site: SiteConfig) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState<Partial<SiteConfig>>({
    id: '',
    name: '',
    region: 'cn',
    apiBase: DEFAULT_API_BASES.cn,
    apiKey: '',
    apiKeys: [],
    imageModels: ['jimeng-1.4', 'sd-3.5-large'],
    videoModels: ['jimeng-video-1.0'],
  });
  const [newKey, setNewKey] = useState('');

  const handleRegionChange = (region: Region) => {
    setFormData(prev => ({
      ...prev,
      region,
      apiBase: DEFAULT_API_BASES[region],
    }));
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const keys = formData.apiKeys || [];
    if (keys.includes(newKey.trim())) return;
    setFormData(prev => ({ ...prev, apiKeys: [...keys, newKey.trim()] }));
    setNewKey('');
  };

  const handleRemoveKey = (key: string) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: (prev.apiKeys || []).filter(k => k !== key),
    }));
  };

  const handleSubmit = () => {
    if (!formData.id?.trim() || !formData.name?.trim() || !formData.apiBase?.trim()) {
      return;
    }
    if (!formData.apiKeys?.length) {
      return;
    }
    onAdd(formData as SiteConfig);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-800">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">添加新站点</h2>

        <div className="space-y-4 mb-6">
          <Input
            label="站点 ID"
            value={formData.id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
            placeholder="例如：custom-site"
          />

          <Input
            label="站点名称"
            value={formData.name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="例如：自定义站点"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">区域</label>
            <select
              value={formData.region}
              onChange={(e) => handleRegionChange(e.target.value as Region)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            >
              {Object.entries(REGION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Input
            label="API Base URL"
            value={formData.apiBase || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, apiBase: e.target.value }))}
            placeholder="https://api.example.com"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Keys ({formData.apiKeys?.length || 0} 个)
            </label>
            {formData.apiKeys && formData.apiKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.apiKeys.map((key, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 px-3 py-1.5 rounded-lg text-sm"
                  >
                    <span className="font-mono text-xs">{key.slice(0, 4)}****{key.slice(-4)}</span>
                    <button
                      onClick={() => handleRemoveKey(key)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKey()}
                placeholder="输入 API Key"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
              <Button size="sm" onClick={handleAddKey}>添加</Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            添加站点
          </Button>
        </div>
      </div>
    </div>
  );
}
