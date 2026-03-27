import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppConfig, SiteConfig } from '../types';
import { DEFAULT_SITES } from '../utils/constants';

interface ConfigState {
  config: AppConfig;
  setActiveSiteId: (id: string) => void;
  updateSite: (site: SiteConfig) => void;
  addSite: (site: SiteConfig) => void;
  removeSite: (id: string) => void;
  updateConfig: (config: AppConfig) => void;
  syncRemoteModels: () => Promise<void>;
}

const defaultConfig: AppConfig = {
  activeSiteId: 'cn',
  sites: DEFAULT_SITES,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      setActiveSiteId: (id) => set((state) => ({
        config: { ...state.config, activeSiteId: id }
      })),

      updateSite: (updatedSite) => set((state) => ({
        config: {
          ...state.config,
          sites: state.config.sites.map(s => s.id === updatedSite.id ? updatedSite : s)
        }
      })),

      addSite: (newSite) => set((state) => ({
        config: {
          ...state.config,
          sites: [...state.config.sites, newSite]
        }
      })),

      removeSite: (id) => set((state) => {
        const remainingSites = state.config.sites.filter(s => s.id !== id);
        return {
          config: {
            ...state.config,
            sites: remainingSites,
            activeSiteId: state.config.activeSiteId === id 
              ? (remainingSites[0]?.id || '') 
              : state.config.activeSiteId
          }
        };
      }),

      updateConfig: (newConfig) => set({ config: newConfig }),

      syncRemoteModels: async () => {
        try {
          let res = await fetch('/models-data/models.json');
          if (!res.ok) {
            res = await fetch('/models.json');
          }
          if (!res.ok) return;
          
          const remoteData = await res.json();
          const state = get();
          
          let hasChange = false;
          const updatedSites = state.config.sites.map(site => {
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
          
          if (hasChange) {
            set((state) => ({
              config: { ...state.config, sites: updatedSites }
            }));
          }
        } catch (e) {
          console.warn('Sync remote models warning:', e);
        }
      }
    }),
    {
      name: 'app_config',
      // 在应用启动恢复缓存后，自动合并代码里的 DEFAULT_SITES 作为 fallback，确保一定有基础模型
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        let needsUpdate = false;
        const syncedSites = state.config.sites.map(site => {
          const defaultSite = DEFAULT_SITES.find(ds => ds.region === site.region);
          if (defaultSite) {
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
          state.config.sites = syncedSites;
        }
      }
    }
  )
);
