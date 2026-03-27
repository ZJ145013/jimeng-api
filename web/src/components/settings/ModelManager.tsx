import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';
import { DEFAULT_SITES } from '../../utils/constants';

export function ModelManager() {
  const { activeSite, updateSite } = useConfig();
  const { showToast } = useToast();
  const [newImageModel, setNewImageModel] = useState('');
  const [newVideoModel, setNewVideoModel] = useState('');

  const handleUpdateModels = (field: 'imageModels' | 'videoModels', models: string[]) => {
    updateSite({ ...activeSite, [field]: models });
  };

  const handleAddModel = (type: 'image' | 'video', val: string, setter: (v: string) => void) => {
    const model = val.trim();
    if (!model) return;
    const list = type === 'image' ? activeSite.imageModels : activeSite.videoModels;
    if (list.includes(model)) {
      showToast('模型已存在', 'error');
      return;
    }
    handleUpdateModels(type === 'image' ? 'imageModels' : 'videoModels', [...list, model]);
    setter('');
    showToast('模型添加成功', 'success');
  };

  const handleSyncDefaultModels = () => {
    const defaultSite = DEFAULT_SITES.find(ds => ds.region === activeSite.region);
    if (!defaultSite) {
      showToast('未找到对应区域的默认配置', 'error');
      return;
    }
    const mergedImageModels = Array.from(new Set([...defaultSite.imageModels, ...activeSite.imageModels]));
    const mergedVideoModels = Array.from(new Set([...defaultSite.videoModels, ...activeSite.videoModels]));

    updateSite({
      ...activeSite,
      imageModels: mergedImageModels,
      videoModels: mergedVideoModels,
    });
    showToast('已同步最新的默认模型', 'success');
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-md mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-200">模型仓库库</h2>
          <p className="text-sm text-gray-500 mt-1">定制当前工作区可见的基础生图和视频模型字典</p>
        </div>
        <Button variant="secondary" onClick={handleSyncDefaultModels}>
          恢复并补全默认模型
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 生图模型 */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-300">文本生图 / 图生图</h3>
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 min-h-[160px] max-h-64 overflow-y-auto space-y-2">
            {activeSite.imageModels.map(m => (
              <div key={m} className="flex justify-between items-center group px-2 py-1 hover:bg-gray-900 rounded">
                <span className="text-sm text-gray-400 font-mono">{m}</span>
                <button 
                  onClick={() => handleUpdateModels('imageModels', activeSite.imageModels.filter(x => x !== m))}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-lg transition-all"
                >×</button>
              </div>
            ))}
            {activeSite.imageModels.length === 0 && <div className="text-sm text-gray-600 mt-4 text-center">空空如也</div>}
          </div>
          <div className="flex gap-2">
            <Input 
              value={newImageModel} 
              onChange={e => setNewImageModel(e.target.value)} 
              placeholder="新增图像模型标识..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddModel('image', newImageModel, setNewImageModel)}
            />
            <Button onClick={() => handleAddModel('image', newImageModel, setNewImageModel)}>+</Button>
          </div>
        </div>

        {/* 视频模型 */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-300">视频生成</h3>
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 min-h-[160px] max-h-64 overflow-y-auto space-y-2">
            {activeSite.videoModels.map(m => (
              <div key={m} className="flex justify-between items-center group px-2 py-1 hover:bg-gray-900 rounded">
                <span className="text-sm text-gray-400 font-mono">{m}</span>
                <button 
                  onClick={() => handleUpdateModels('videoModels', activeSite.videoModels.filter(x => x !== m))}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-lg transition-all"
                >×</button>
              </div>
            ))}
            {activeSite.videoModels.length === 0 && <div className="text-sm text-gray-600 mt-4 text-center">空空如也</div>}
          </div>
          <div className="flex gap-2">
            <Input 
              value={newVideoModel} 
              onChange={e => setNewVideoModel(e.target.value)} 
              placeholder="新增视频模型标识..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddModel('video', newVideoModel, setNewVideoModel)}
            />
            <Button onClick={() => handleAddModel('video', newVideoModel, setNewVideoModel)}>+</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
