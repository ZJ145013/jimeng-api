import { useState, useEffect, useMemo } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useVideoGeneration } from '../../hooks/useApi';
import { VIDEO_ASPECT_RATIOS, VIDEO_RESOLUTIONS, getVideoDurations, supportsVideoResolution } from '../../utils/constants';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { ImageUpload } from '../common/ImageUpload';
import { useToast } from '../common/Toast';
import { Video, Film, Download, Layers, Settings2, Replace, MonitorPlay, Zap, RefreshCw } from 'lucide-react';

type VideoMode = 'text2video' | 'img2video' | 'keyframes' | 'omni';

const modes = [
  { key: 'text2video' as const, label: '文生视频', description: '纯文本描述生成动态视频', icon: Video },
  { key: 'img2video' as const, label: '图生视频', description: '上传单张图片使其动起来', icon: ImagePlay },
  { key: 'keyframes' as const, label: '首尾帧控制', description: '上传首尾双帧进行中间插帧补全', icon: Replace },
  { key: 'omni' as const, label: 'Omni 全能', description: '混合多图多视频作为物理规律参考', icon: Zap },
];

function ImagePlay(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  );
}

export default function VideoWorkspace() {
  const { activeSite } = useConfig();
  const { loading, error, data, progress, statusText, generate } = useVideoGeneration();
  const { showToast } = useToast();

  const [mode, setMode] = useState<VideoMode>('text2video');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [ratio, setRatio] = useState<string>(VIDEO_ASPECT_RATIOS[0]);
  const [resolution, setResolution] = useState<string>(VIDEO_RESOLUTIONS[0].value);
  const [duration, setDuration] = useState<number>(5);

  // 根据当前模型动态计算可选时长列表
  const availableDurations = useMemo(() => getVideoDurations(model), [model]);
  // 判断当前模型是否支持 resolution 参数
  const showResolution = useMemo(() => supportsVideoResolution(model), [model]);
  
  const [images, setImages] = useState<string[]>([]);
  const [firstImage, setFirstImage] = useState<string[]>([]);
  const [lastImage, setLastImage] = useState<string[]>([]);
  
  const [omniImages, setOmniImages] = useState<string[]>([]);
  const [omniVideos, setOmniVideos] = useState<string[]>([]);

  // 判断当前模式是否有图片输入（图生视频/首尾帧模式时禁用 ratio）
  const hasImageInput = mode === 'img2video' && images.length > 0
    || mode === 'keyframes' && firstImage.length > 0
    || mode === 'omni';

  useEffect(() => {
    if (activeSite?.videoModels?.length > 0) {
      setModel(activeSite.videoModels[0]);
    }
  }, [activeSite]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  // 模型切换时：重置 duration 到该模型可用列表的第一个值
  useEffect(() => {
    const durations = getVideoDurations(model);
    if (!durations.some(d => d.value === duration)) {
      setDuration(durations[0].value);
    }
    // 如果模型不支持 resolution，重置为默认值
    if (!supportsVideoResolution(model)) {
      setResolution('720p');
    }
  }, [model]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return showToast('请输入生成提示词', 'error');
    if (!model) return showToast('请选择模型', 'error');

    if (mode === 'img2video' && images.length === 0) return showToast('请上传参考图片', 'error');
    if (mode === 'keyframes' && firstImage.length === 0) return showToast('请至少上传首帧图片', 'error');
    if (mode === 'omni' && omniImages.length === 0 && omniVideos.length === 0) return showToast('请至少上传一个参考素材', 'error');

    if (mode === 'omni') {
      await generate({
        prompt: prompt.trim(), model, ratio, resolution, duration,
        functionMode: 'omni_reference',
        omni_images: omniImages,
        omni_videos: omniVideos,
      });
    } else {
      let file_paths: string[] | undefined;
      if (mode === 'img2video') file_paths = images;
      else if (mode === 'keyframes') file_paths = lastImage.length > 0 ? [firstImage[0], lastImage[0]] : [firstImage[0]];

      await generate({
        prompt: prompt.trim(), model, ratio, resolution, duration, file_paths,
      });
    }
  };

  const clearWorkspace = () => {
    setPrompt('');
    setImages([]);
    setFirstImage([]);
    setLastImage([]);
    setOmniImages([]);
    setOmniVideos([]);
  };

  const handleDownload = () => {
    if (!data?.url) return;
    const a = document.createElement('a');
    a.href = data.url;
    a.download = `jimeng-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-3">
            <Film className="w-8 h-8 text-purple-400" /> Video Workspace
          </h2>
          <p className="text-zinc-500 mt-2 font-medium">全息导演台：掌控动态视觉，赋能物理规律引擎</p>
        </div>
        <Button variant="secondary" onClick={clearWorkspace} className="flex gap-2">
          <RefreshCw className="w-4 h-4" /> 初始化控制台
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-2 mb-2 text-gray-300 font-medium">
              <Layers className="w-5 h-5 text-purple-400" /> 引擎模式
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {modes.map((m: any) => {
                const Icon = m.icon;
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 border text-center ${
                      active 
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? 'text-purple-400' : 'text-zinc-600'}`} />
                    <span className="text-sm font-semibold">{m.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{m.description}</span>
                  </button>
                );
              })}
            </div>

            <hr className="border-gray-800/50" />

            <div className="flex items-center gap-2 mb-2 text-gray-300 font-medium pt-2">
              <Settings2 className="w-5 h-5 text-pink-400" /> 运镜与素材
            </div>

            <Textarea
              label="运镜与分镜描述"
              value={prompt}
              onChange={(e: any) => setPrompt(e.target.value)}
              placeholder="镜头缓慢向前推进，光影变幻..."
              rows={4}
              className="bg-black/50 border-gray-800 focus:border-purple-500/50"
            />

            {mode === 'img2video' && (
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                <ImageUpload label="动画始发参考图" maxFiles={1} images={images} onChange={setImages} />
              </div>
            )}

            {mode === 'keyframes' && (
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4 space-y-4">
                <ImageUpload label="首帧入场图 (A点)" maxFiles={1} images={firstImage} onChange={setFirstImage} />
                <ImageUpload label="尾帧定格图 (B点, 可选)" maxFiles={1} images={lastImage} onChange={setLastImage} disabled={firstImage.length === 0} />
              </div>
            )}

            {mode === 'omni' && (
              <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-4">
                <ImageUpload label="物理参考图片组 (最高9张)" maxFiles={9} images={omniImages} onChange={setOmniImages} />
                <ImageUpload label="动态参考视频 (最高3段)" maxFiles={3} images={omniVideos} onChange={setOmniVideos} />
                <p className="text-xs text-purple-400/60 mt-2 font-mono">Omni Engine: 支持提取人物动作或环境光影物理规律</p>
              </div>
            )}

            <hr className="border-gray-800/50" />

            <Select label="渲染模型矩阵" options={activeSite.videoModels.map((m: any) => ({ label: m, value: m }))} value={model} onChange={setModel} />
            
            {/* 画幅比例：有图片输入时自动推断，禁用手动选择 */}
            <div className={hasImageInput ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                画幅比例
                {hasImageInput && <span className="text-pink-400 ml-2 text-xs">(由图片自适应)</span>}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {VIDEO_ASPECT_RATIOS.map((r: any) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    disabled={hasImageInput}
                    className={`px-2 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                      ratio === r
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                        : 'bg-white/5 text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid ${showResolution ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {showResolution && (
                <Select label="输出精度" options={[...VIDEO_RESOLUTIONS]} value={resolution} onChange={setResolution} />
              )}
              <Select
                label="流式时长"
                options={availableDurations.map(d => ({ label: d.label, value: String(d.value) }))}
                value={String(duration)}
                onChange={(v: any) => setDuration(Number(v))}
              />
            </div>

            <Button
              onClick={handleGenerate}
              loading={loading}
              disabled={!prompt.trim() || loading}
              className="w-full h-12 mt-6 bg-gradient-to-r from-purple-600 hover:from-purple-500 to-pink-600 hover:to-pink-500 shadow-lg shadow-purple-500/25"
            >
              {loading ? '神经流式渲染中...' : '提交渲染队列'}
            </Button>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="xl:col-span-8">
          <div className="glass-card rounded-3xl border border-white/5 h-full min-h-[600px] overflow-hidden flex flex-col pt-6 px-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-white flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-pink-400" />
                监视器
              </h3>
            </div>

            <div className="flex-1 flex flex-col mb-6 bg-black/40 rounded-2xl border border-gray-800/50 overflow-hidden relative">
              {!data && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 opacity-60">
                   <Video className="w-24 h-24 mb-6 stroke-1" />
                   <p className="text-xl tracking-[0.2em] font-light">等待输入流</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="w-64 space-y-6">
                    <div className="flex justify-between text-sm text-purple-300 font-mono">
                      <span>RENDER_PROG</span>
                      <span>{Math.round((progress || 0) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 transition-all duration-300 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                        style={{ width: `${(progress || 0) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-center font-mono text-xs text-zinc-400 animate-pulse tracking-widest">
                       {statusText || 'INITIALIZING MATRIX...'}
                    </div>
                  </div>
                </div>
              )}

              {data?.url && (
                <div className="w-full h-full flex flex-col z-20 animate-in fade-in zoom-in-95 duration-700">
                  <video
                    src={data.url}
                    controls
                    autoPlay
                    loop
                    poster={data.cover_url}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 right-4 space-x-2">
                    <Button variant="secondary" onClick={handleDownload} className="bg-black/50 backdrop-blur border-white/10 hover:bg-black/70 group">
                      <Download className="w-4 h-4 mr-2 group-hover:text-pink-400 transition-colors" /> 下载源片
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
