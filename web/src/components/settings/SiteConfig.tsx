import { useConfig } from '../../contexts/ConfigContext';
import { Region, SiteConfig as SiteConfigType } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';

const REGION_LABELS: Record<Region, string> = {
  cn: '国内',
  intl: '国际',
};

export function SiteConfig() {
  const { config, activeSite, setActiveSiteId, updateSite, addSite, removeSite } = useConfig();
  const { showToast } = useToast();

  const handleUpdateField = (field: keyof SiteConfigType, value: unknown) => {
    const updated = { ...activeSite, [field]: value };
    updateSite(updated);
    showToast('配置已保存', 'success');
  };

  const handleDeleteSite = () => {
    if (config.sites.length === 1) {
      showToast('至少保留一个站点配置', 'error');
      return;
    }
    removeSite(activeSite.id);
    showToast('站点已删除', 'success');
  };

  const handleAddNewSite = () => {
    const newSite: SiteConfigType = {
      id: Date.now().toString(),
      name: '新站点',
      region: 'cn',
      apiBase: '',
      apiKey: '',
      apiKeys: [],
      apiKeyLabels: {},
      imageModels: [],
      videoModels: []
    };
    addSite(newSite);
    setActiveSiteId(newSite.id);
    showToast('新站点已添加', 'success');
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-md mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-200">站点配置</h2>
        <div className="flex gap-2">
          {config.sites.map(site => (
            <button
              key={site.id}
              onClick={() => setActiveSiteId(site.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSite.id === site.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {site.name}
            </button>
          ))}
          <button 
            onClick={handleAddNewSite}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            + 新建
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <Input
          label="站点名称"
          value={activeSite.name}
          onChange={(e) => handleUpdateField('name', e.target.value)}
          placeholder="例如：国内默认站"
        />

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">区域 (Region)</label>
          <select
            value={activeSite.region}
            onChange={(e) => handleUpdateField('region', e.target.value as Region)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
          >
            {Object.entries(REGION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}站 (支持对应区域模型)</option>
            ))}
          </select>
        </div>

        <Input
          label="基准 API 地址 (Base URL)"
          value={activeSite.apiBase}
          onChange={(e) => handleUpdateField('apiBase', e.target.value)}
          placeholder="未配置将使用项目默认反代例如：https://api.yourdomain.com"
        />

        <div className="pt-4 flex justify-between items-center border-t border-gray-800/50">
          <p className="text-xs text-gray-500">API Key 已被移入独立 Token 仓库中管理。当前站点ID: {activeSite.id}</p>
          <Button variant="danger" onClick={handleDeleteSite} disabled={config.sites.length <= 1}>
            删除此站点
          </Button>
        </div>
      </div>
    </div>
  );
}
