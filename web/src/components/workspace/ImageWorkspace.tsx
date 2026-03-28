import { useState, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useTextToImage, useImageToImage } from '../../hooks/useApi';
import { ASPECT_RATIOS, RESOLUTIONS, getImageModelSupportText, getTokenRegionLabel, isImageModelAvailableForRegion, supportsIntelligentRatio } from '../../utils/constants';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { ImageUpload } from '../common/ImageUpload';
import { useToast } from '../common/Toast';
import { Sparkles, Download, Layers, Settings2, ImagePlus, RefreshCw } from 'lucide-react';

export default function ImageWorkspace() {
  const { activeSite } = useConfig();
  const { loading: t2iLoading, generate: genT2I } = useTextToImage();
  const { loading: i2iLoading, generate: genI2I } = useImageToImage();
  const { showToast } = useToast();

  const loading = t2iLoading || i2iLoading;

  // Form state
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [model, setModel] = useState(activeSite.imageModels[0] || '');
  const [resolution, setResolution] = useState('1k');
  const [ratio, setRatio] = useState<string>(ASPECT_RATIOS[0]);
  const [sampleStrength, setSampleStrength] = useState(0.8);
  const [intelligentRatio, setIntelligentRatio] = useState(false);
  
  const [results, setResults] = useState<string[]>([]);
  const tokenRegion = activeSite.region === 'cn' ? 'cn' : activeSite.tokenRegion;
  const imageModelOptions = activeSite.imageModels.map((m: string) => ({
    label: m,
    value: m,
    disabled: !isImageModelAvailableForRegion(m, tokenRegion),
  }));

  // 切换到不支持智能比例的模型时，自动关闭
  useEffect(() => {
    if (!supportsIntelligentRatio(model)) {
      setIntelligentRatio(false);
    }
  }, [model]);

  useEffect(() => {
    if (!activeSite.imageModels.includes(model) || !isImageModelAvailableForRegion(model, tokenRegion)) {
      const fallbackModel = activeSite.imageModels.find((m: string) => isImageModelAvailableForRegion(m, tokenRegion)) || '';
      if (fallbackModel !== model) {
        setModel(fallbackModel);
      }
    }
  }, [activeSite.imageModels, model, tokenRegion]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('请输入提示词', 'error');
      return;
    }

    try {
      setResults([]);
      let outcome;
      if (images.length > 0) {
        // Image to Image Mode
        outcome = await genI2I({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          model,
          ratio,
          resolution,
          sample_strength: sampleStrength,
          intelligent_ratio: intelligentRatio,
          images,
        });
      } else {
        // Text to Image Mode
        outcome = await genT2I({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          model,
          ratio,
          resolution,
          sample_strength: sampleStrength,
          intelligent_ratio: intelligentRatio,
        });
      }
      if (outcome && outcome.length > 0) {
        setResults(outcome.map(o => o.url));
        showToast('生成成功', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearWorkspace = () => {
    setPrompt('');
    setNegativePrompt('');
    setImages([]);
    setResults([]);
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `jimeng-image-${Date.now()}-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-400" /> Image Workspace
          </h2>
          <p className="text-zinc-500 mt-2 font-medium">沉浸式画室：支持文生图与图生图自动切换，支持多图组绘本风格</p>
        </div>
        <Button variant="secondary" onClick={clearWorkspace} className="flex gap-2">
          <RefreshCw className="w-4 h-4" /> 清空画板
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Control Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-2 mb-2 text-gray-300 font-medium">
              <Layers className="w-5 h-5 text-indigo-400" /> 创作参数
            </div>

            {/* Prompt Area */}
            <div className="space-y-3">
              <Textarea
                label="灵感描述"
                value={prompt}
                onChange={(e: any) => setPrompt(e.target.value)}
                placeholder="描述你想要的画面，中英皆可，用逗号分隔..."
                rows={4}
                className="bg-black/50 border-gray-800 focus:border-indigo-500/50"
              />
              
              <button
                onClick={() => setShowNegative(!showNegative)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all"
              >
                {showNegative ? '隐藏反向咒语' : '+ 排除不需要的元素'}
              </button>
              
              {showNegative && (
                <Textarea
                  value={negativePrompt}
                  onChange={(e: any) => setNegativePrompt(e.target.value)}
                  placeholder="模糊的，低质量的，水印..."
                  rows={2}
                  className="bg-red-950/20 border-red-900/30 text-amber-100 placeholder:text-red-900/50"
                />
              )}
            </div>

            {/* Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">上传参考图（选填）</label>
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                <ImageUpload
                  label="支持多达 10 张图片融合"
                  maxFiles={10}
                  images={images}
                  onChange={setImages}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {images.length > 0 ? `已激活「图生图模式」 (包含 ${images.length} 张参考图)` : '未上传参考图，当前处于「文生图模式」'}
              </p>
            </div>
            
            <hr className="border-gray-800/50" />
            
            <div className="flex items-center gap-2 mb-2 text-gray-300 font-medium pt-2">
              <Settings2 className="w-5 h-5 text-purple-400" /> 高级设定
            </div>

            {/* Models Dropdown */}
            <div>
              <Select
                label="生成模型矩阵"
                options={imageModelOptions}
                value={model}
                onChange={setModel}
              />
              <p className="mt-2 text-xs text-zinc-500">
                支持站点：<span className="text-indigo-300">{getImageModelSupportText(model)}</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                当前 Token 地区：<span className="text-sky-300">{getTokenRegionLabel(tokenRegion)}</span>
              </p>
              {!tokenRegion && activeSite.region === 'intl' && (
                <p className="mt-1 text-xs text-amber-300/80">先点一次健康验活以精确过滤模型</p>
              )}
            </div>

            {/* Aspect Ratios */}
            <div className={intelligentRatio ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                构图画幅
                {intelligentRatio && <span className="text-purple-400 ml-2 text-xs">(智能推断中)</span>}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((r: any) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    disabled={intelligentRatio}
                    className={`px-2 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                      ratio === r
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-white/5 text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Switches and Resolutions */}
            <div className="grid grid-cols-2 gap-4">
               {/* 智能比例：仅对 jimeng-4.x / 5.x 系列显示 */}
               {supportsIntelligentRatio(model) ? (
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">智能构图</label>
                   <button
                      onClick={() => setIntelligentRatio(!intelligentRatio)}
                      className={`w-full py-2 rounded-xl text-xs font-medium border transition-colors ${
                        intelligentRatio ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-transparent text-gray-500'
                      }`}
                    >
                      {intelligentRatio ? '✦ 已开启' : '关闭'}
                    </button>
                    <p className="text-[10px] text-zinc-600 mt-1">系统根据 Prompt 自动推断最佳画幅</p>
                 </div>
               ) : (
                 <div />
               )}
               <div>
                  <Select
                    label="出图精度"
                    options={RESOLUTIONS.map((r: any) => ({ label: r.label, value: r.value }))}
                    value={resolution}
                    onChange={setResolution}
                  />
               </div>
            </div>

            {images.length > 0 && (
              <div>
                <div className="flex justify-between mb-2 mt-4 text-xs">
                  <span className="text-gray-500">图生图创意程度</span>
                  <span className="text-purple-400 font-mono">{sampleStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={sampleStrength}
                  onChange={(e: any) => setSampleStrength(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            )}

            <Button
              onClick={handleGenerate}
              loading={loading}
              disabled={!prompt.trim() || loading}
              className="w-full h-12 mt-6 bg-gradient-to-r from-blue-600 hover:from-blue-500 to-indigo-600 hover:to-indigo-500"
            >
              {loading ? '全息引擎渲染中...' : '开始合成'}
            </Button>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="xl:col-span-8">
          <div className="glass-card rounded-3xl border border-white/5 h-full min-h-[600px] overflow-hidden flex flex-col">
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {results.length === 0 && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-60">
                   <ImagePlus className="w-20 h-20 mb-6 stroke-1" />
                   <p className="text-lg tracking-widest font-light">等待指令输入</p>
                </div>
              )}
              
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 mb-8">
                     <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                       <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                     </div>
                  </div>
                  <p className="text-zinc-400 animate-pulse tracking-widest font-medium">构建神经元网络...</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-500">
                  {results.map((url, i) => (
                    <div key={i} className="group relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      <img src={url} alt={`Output ${i}`} className="w-full h-auto object-contain bg-black/50" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <Button variant="secondary" onClick={() => handleDownload(url, i)} className="w-full bg-white/10 backdrop-blur text-white hover:bg-white/20 border-white/10">
                          <Download className="w-4 h-4 mr-2" /> 保存原画
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
