import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';
import { tokenReceive, tokenPoints, tokenCheck } from '../../services/account';

export function TokenManager() {
  const { config, activeSite, updateSite } = useConfig();
  const { showToast } = useToast();
  
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
  const [editingKeyLabel, setEditingKeyLabel] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);
  
  const [tokenLoading, setTokenLoading] = useState<string | null>(null);
  const [tokenResults, setTokenResults] = useState<Array<{
    token: string;
    status?: string;
    credits?: number;
    detail?: string;
  }>>([]);

  const apiKeys = activeSite.apiKeys?.length > 0
    ? activeSite.apiKeys
    : (activeSite.apiKey ? [activeSite.apiKey] : []);
  const apiKeyLabels = activeSite.apiKeyLabels || {};

  const handleAddApiKey = () => {
    if (!newApiKey.trim()) return;
    const key = newApiKey.trim();
    if (apiKeys.includes(key)) {
      showToast('该 Key 已存在', 'error');
      return;
    }
    const newLabels = { ...apiKeyLabels };
    if (newApiKeyLabel.trim()) {
      newLabels[key] = newApiKeyLabel.trim();
    }
    const updated = { ...activeSite, apiKeys: [...apiKeys, key], apiKeyLabels: newLabels };
    updateSite(updated);
    showToast('Token 已保存', 'success');
    setNewApiKey('');
    setNewApiKeyLabel('');
  };

  const handleRemoveApiKey = (key: string) => {
    const newKeys = apiKeys.filter(k => k !== key);
    const newLabels = { ...apiKeyLabels };
    delete newLabels[key];
    const updated = { ...activeSite, apiKeys: newKeys, apiKeyLabels: newLabels };
    updateSite(updated);
    showToast('Token 已删除', 'success');
  };

  const handleSaveKeyLabel = (key: string) => {
    const newLabels = { ...apiKeyLabels };
    if (editingLabelValue.trim()) {
      newLabels[key] = editingLabelValue.trim();
    } else {
      delete newLabels[key];
    }
    const updated = { ...activeSite, apiKeyLabels: newLabels };
    updateSite(updated);
    setEditingKeyLabel(null);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  const allApiKeys = config.sites.flatMap(s => 
    s.apiKeys?.length > 0 ? s.apiKeys : (s.apiKey ? [s.apiKey] : [])
  );
  const allKeyLabels: Record<string, string> = {};
  config.sites.forEach(s => {
    if (s.apiKeyLabels) Object.assign(allKeyLabels, s.apiKeyLabels);
  });
  const labelOrMask = (key: string) => allKeyLabels[key] || maskKey(key);
  const tokenApiBase = activeSite.apiBase || config.sites.find(s => s.apiBase)?.apiBase || '';

  const handleReceiveCredits = async () => {
    if (!allApiKeys.length || !tokenApiBase) {
      showToast('缺少 Token 或 API Base', 'error');
      return;
    }
    setTokenLoading('receive');
    setTokenResults([]);
    try {
      const results = await tokenReceive(tokenApiBase, allApiKeys);
      setTokenResults(results.map(r => ({
        token: labelOrMask(r.token),
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
    if (!allApiKeys.length || !tokenApiBase) {
      showToast('缺少 Token 或 API Base', 'error');
      return;
    }
    setTokenLoading('points');
    setTokenResults([]);
    try {
      const results = await tokenPoints(tokenApiBase, allApiKeys);
      setTokenResults(results.map(r => ({
        token: labelOrMask(r.token),
        credits: r.points?.totalCredit,
        detail: `赠: ${r.points?.giftCredit} 购: ${r.points?.purchaseCredit} V: ${r.points?.vipCredit}`,
      })));
      showToast('积分查询完成', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '查询失败', 'error');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleCheckTokens = async () => {
    if (!allApiKeys.length || !tokenApiBase) {
      showToast('缺少 Token 或 API Base', 'error');
      return;
    }
    setTokenLoading('check');
    setTokenResults([]);
    try {
      const results = await Promise.all(
        allApiKeys.map(async (key) => {
          try {
            const res = await tokenCheck(tokenApiBase, key);
            return { token: labelOrMask(key), status: res.live ? '有效' : '失效' };
          } catch {
            return { token: labelOrMask(key), status: '检查失败' };
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

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-gray-200">API Keys 管理</h2>
        <Button variant="secondary" onClick={() => setShowApiKeys(!showApiKeys)}>
          {showApiKeys ? '隐藏 Token' : '显示完整 Token'}
        </Button>
      </div>

      <div className="space-y-4">
        {apiKeys.map((key) => (
          <div key={key} className="flex gap-4 items-center bg-gray-950 p-3 rounded-lg border border-gray-800">
            <div className="flex-1">
              {editingKeyLabel === key ? (
                <div className="flex gap-2">
                  <Input 
                    value={editingLabelValue}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    placeholder="输入备注，留空则删除"
                    className="flex-1"
                  />
                  <Button variant="primary" onClick={() => handleSaveKeyLabel(key)}>保存</Button>
                  <Button variant="secondary" onClick={() => setEditingKeyLabel(null)}>取消</Button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {apiKeyLabels[key] && <div className="text-sm font-medium text-gray-300">{apiKeyLabels[key]}</div>}
                  <div className="text-sm text-gray-500 font-mono break-all mt-1">
                    {showApiKeys ? key : maskKey(key)}
                  </div>
                </div>
              )}
            </div>
            {editingKeyLabel !== key && (
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => {
                  setEditingLabelValue(apiKeyLabels[key] || '');
                  setEditingKeyLabel(key);
                }}>
                  备注
                </Button>
                <Button variant="danger" onClick={() => handleRemoveApiKey(key)}>删除</Button>
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-4 items-end mt-4 pt-4 border-t border-gray-800">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">新 Token</label>
            <Input
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="eyJ开头..."
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-400 mb-1">备注名</label>
            <Input
              value={newApiKeyLabel}
              onChange={(e) => setNewApiKeyLabel(e.target.value)}
              placeholder="可选的账号名称"
              onKeyPress={(e) => e.key === 'Enter' && handleAddApiKey()}
            />
          </div>
          <Button variant="primary" onClick={handleAddApiKey} disabled={!newApiKey.trim()}>
            添加
          </Button>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-gray-200 mb-4">全局账号助手 (所有配置站点的 Token)</h3>
        <div className="flex gap-4 mb-6">
          <Button 
            variant="primary" 
            onClick={handleReceiveCredits} 
            loading={tokenLoading === 'receive'}
            disabled={tokenLoading !== null}
          >
            一键签到
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleQueryPoints} 
            loading={tokenLoading === 'points'}
            disabled={tokenLoading !== null}
          >
            查询总积分
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleCheckTokens} 
            loading={tokenLoading === 'check'}
            disabled={tokenLoading !== null}
          >
            健康验活
          </Button>
        </div>

        {tokenResults.length > 0 && (
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="pb-2 font-medium">账号/Token</th>
                  <th className="pb-2 font-medium">状态</th>
                  <th className="pb-2 font-medium">剩余积分</th>
                  <th className="pb-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {tokenResults.map((res, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-300">{res.token}</td>
                    <td className="py-2">
                       <span className={`px-2 py-0.5 rounded text-xs ${
                         res.status === '失效' || res.status?.includes('失败') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                         res.status?.includes('成功') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                         res.status ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : ''
                       }`}>
                         {res.status || '-'}
                       </span>
                    </td>
                    <td className="py-2 text-emerald-400 font-mono">{res.credits ?? '-'}</td>
                    <td className="py-2 text-gray-500 text-xs">{res.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
