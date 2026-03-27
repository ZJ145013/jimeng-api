import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppConfig, SiteConfig } from '../types';
import { getItem, setItem } from '../utils/storage';
import { DEFAULT_SITES } from '../utils/constants';

const CONFIG_KEY = 'app_config';

const defaultConfig: AppConfig = {
  activeSiteId: 'cn',
  sites: DEFAULT_SITES,
};

interface ConfigContextValue {
  config: AppConfig;
  activeSite: SiteConfig;
  setActiveSiteId: (id: string) => void;
  updateSite: (site: SiteConfig) => void;
  addSite: (site: SiteConfig) => void;
  removeSite: (id: string) => void;
  updateConfig: (config: AppConfig) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => {
    const savedConfig = getItem<AppConfig>(CONFIG_KEY, defaultConfig);
    
    // 自动合并默认站点的模型列表（静默追加新增的模型，不删除用户自定义模型）
    let needsUpdate = false;
    const syncedSites = savedConfig.sites.map(site => {
      const defaultSite = DEFAULT_SITES.find(ds => ds.region === site.region);
      if (defaultSite) {
        // 找出本地配置中缺失的默认模型
        const missingImageModels = defaultSite.imageModels.filter(m => !site.imageModels.includes(m));
        const missingVideoModels = defaultSite.videoModels.filter(m => !site.videoModels.includes(m));
        
        if (missingImageModels.length > 0 || missingVideoModels.length > 0) {
          needsUpdate = true;
          return {
            ...site,
            imageModels: [...site.imageModels, ...missingImageModels],
            videoModels: [...site.videoModels, ...missingVideoModels],
          };
        }
      }
      return site;
    });

    if (needsUpdate) {
      const updatedConfig = { ...savedConfig, sites: syncedSites };
      setItem(CONFIG_KEY, updatedConfig); // 发现变更时立即回写，避免多次合并
      return updatedConfig;
    }
    return savedConfig;
  });

  useEffect(() => {
    // 运行时同步：尝试加载最新的 models.json
    // 兼容两种部署方式：开发环境 (/models.json) 和 Docker 环境 (/models-data/models.json)
    const fetchRemoteModels = async () => {
      try {
        let res = await fetch('/models-data/models.json');
        if (!res.ok) {
          res = await fetch('/models.json');
        }
        if (!res.ok) return;
        const remoteData = await res.json();
        
        setConfig(prev => {
          let hasChange = false;
          const updatedSites = prev.sites.map(site => {
            let imageSource: string[] = [];
            let videoSource: string[] = [];
            
            if (site.region === 'cn') {
              imageSource = remoteData.imageModelsCN || [];
              videoSource = remoteData.videoModelsCN || [];
            } else {
              imageSource = remoteData.imageModelsIntl || [];
              videoSource = remoteData.videoModelsIntl || [];
            }
            
            const missingImages = imageSource.filter(m => !site.imageModels.includes(m));
            const missingVideos = videoSource.filter(m => !site.videoModels.includes(m));
            
            if (missingImages.length > 0 || missingVideos.length > 0) {
              hasChange = true;
              return {
                ...site,
                imageModels: [...site.imageModels, ...missingImages],
                videoModels: [...site.videoModels, ...missingVideos],
              };
            }
            return site;
          });
          
          return hasChange ? { ...prev, sites: updatedSites } : prev;
        });
      } catch (e) {
        console.warn('Failed to fetch remote models:', e);
      }
    };
    
    fetchRemoteModels();
  }, []);

  useEffect(() => {
    setItem(CONFIG_KEY, config);
  }, [config]);

  const activeSite = config.sites.find(s => s.id === config.activeSiteId) || config.sites[0];

  const setActiveSiteId = useCallback((id: string) => {
    setConfig(prev => ({ ...prev, activeSiteId: id }));
  }, []);

  const updateSite = useCallback((site: SiteConfig) => {
    setConfig(prev => ({
      ...prev,
      sites: prev.sites.map(s => s.id === site.id ? site : s),
    }));
  }, []);

  const addSite = useCallback((site: SiteConfig) => {
    setConfig(prev => ({
      ...prev,
      sites: [...prev.sites, site],
    }));
  }, []);

  const removeSite = useCallback((id: string) => {
    setConfig(prev => {
      const newSites = prev.sites.filter(s => s.id !== id);
      const newActiveSiteId = prev.activeSiteId === id ? newSites[0]?.id || '' : prev.activeSiteId;
      return { ...prev, sites: newSites, activeSiteId: newActiveSiteId };
    });
  }, []);

  const updateConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
  }, []);

  return (
    <ConfigContext.Provider value={{
      config,
      activeSite,
      setActiveSiteId,
      updateSite,
      addSite,
      removeSite,
      updateConfig,
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
