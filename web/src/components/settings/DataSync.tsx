import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';
import {
  getWebDAVConfig,
  setWebDAVConfig,
  checkWebDAV,
  fetchCloudConfig,
  saveCloudConfig,
  setItem,
  removeItem,
} from '../../utils/storage';

export function DataSync() {
  const { config } = useConfig();
  const { showToast } = useToast();

  const [webdavUrl, setWebdavUrl] = useState(() => getWebDAVConfig()?.url || '');
  const [webdavUsername, setWebdavUsername] = useState(() => getWebDAVConfig()?.username || '');
  const [webdavPassword, setWebdavPassword] = useState(() => getWebDAVConfig()?.password || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [syncLoading, setSyncLoading] = useState<string | null>(null);

  const handleCheckWebDAV = async () => {
    if (!webdavUrl.trim() || !webdavUsername.trim() || !webdavPassword.trim()) {
      showToast('请填写完整的 WebDAV 配置', 'error');
      return;
    }
    setSyncStatus('checking');
    try {
      const cfg = {
        url: webdavUrl.trim(),
        username: webdavUsername.trim(),
        password: webdavPassword.trim(),
      };
      const ok = await checkWebDAV(cfg);
      if (ok) {
        setWebDAVConfig(cfg);
        setSyncStatus('connected');
        showToast('连接成功', 'success');
      } else {
        setSyncStatus('error');
        showToast('连接失败，请检查配置', 'error');
      }
    } catch {
      setSyncStatus('error');
      showToast('连接出错', 'error');
    }
  };

  const handleClearWebDAV = () => {
    setWebdavUrl('');
    setWebdavUsername('');
    setWebdavPassword('');
    setWebDAVConfig(null);
    setSyncStatus('idle');
    showToast('WebDAV 配置已清除', 'success');
  };

  const wrapAction = async (loadingKey: string, action: () => Promise<void>) => {
    if (!getWebDAVConfig()) {
      showToast('请先配置 WebDAV', 'error');
      return;
    }
    setSyncLoading(loadingKey);
    try {
      await action();
    } catch {
      showToast('操作失败', 'error');
    } finally {
      setSyncLoading(null);
    }
  };

  const handleUploadConfig = () => wrapAction('up-config', async () => {
    const ok = await saveCloudConfig(config);
    showToast(ok ? '配置已上传' : '上传失败', ok ? 'success' : 'error');
  });

  const handleDownloadConfig = () => wrapAction('dl-config', async () => {
    const cloudConfig = await fetchCloudConfig();
    if (cloudConfig && typeof cloudConfig === 'object') {
      setItem('app_config', cloudConfig);
      removeItem('config');
      showToast('配置已下载，页面即将刷新', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast('云端没有找到配置', 'info');
    }
  });

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
      <h2 className="text-xl font-medium text-gray-200 mb-6 flex items-center gap-2">
        云端数据同步
        {syncStatus === 'connected' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
        {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
      </h2>

      <div className="space-y-4 max-w-2xl mb-8">
        <Input label="WebDAV 服务器 URL" value={webdavUrl} onChange={e => setWebdavUrl(e.target.value)} placeholder="https://dav.jianguoyun.com/dav/" />
        <Input label="WebDAV 账号" value={webdavUsername} onChange={e => setWebdavUsername(e.target.value)} />
        <Input label="WebDAV 密码/应用密码" type="password" value={webdavPassword} onChange={e => setWebdavPassword(e.target.value)} />

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCheckWebDAV} loading={syncStatus === 'checking'}>
            测试并保存连接
          </Button>
          <Button variant="danger" onClick={handleClearWebDAV}>
            断开并清除
          </Button>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 p-5 rounded-xl text-center space-y-4 border-t border-gray-800/50 pt-8">
        <h3 className="font-medium text-gray-300">配置备份</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          将所有站点的 Token、模型和设定同步至云盘<br />
          以便多设备共享。
        </p>
        <div className="flex gap-2 justify-center">
          <Button size="sm" onClick={handleUploadConfig} loading={syncLoading === 'up-config'}>上传配置 ⇡</Button>
          <Button size="sm" variant="secondary" onClick={handleDownloadConfig} loading={syncLoading === 'dl-config'}>拉取配置 ⇣</Button>
        </div>
      </div>
    </div>
  );
}
