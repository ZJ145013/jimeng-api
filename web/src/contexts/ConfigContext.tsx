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
    return getItem<AppConfig>(CONFIG_KEY, defaultConfig);
  });

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
