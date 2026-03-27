import { useState, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useImageToImage } from '../hooks/useApi';
import { ASPECT_RATIOS, RESOLUTIONS } from '../utils/constants';
import { Button } from './common/Button';
import { Textarea } from './common/Textarea';
import { Select } from './common/Select';
import { ImageUpload } from './common/ImageUpload';
import { useToast } from './common/Toast';

export default function ImageComposition() {
  const { activeSite } = useConfig();
  const { loading, error, data, generate } = useImageToImage();
  const { showToast } = useToast();

  // Form state
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [model, setModel] = useState(activeSite.imageModels[0] || '');
  const [resolution, setResolution] = useState('1k');
  const [ratio, setRatio] = useState<string>(ASPECT_RATIOS[0]);
  const [sampleStrength, setSampleStrength] = useState(0.8);

  // Update model when activeSite changes
  const handleModelChange = useCallback((value: string) => {
    setModel(value);
  }, []);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      showToast('请输入提示词', 'error');
      return;
    }

    if (images.length === 0) {
      showToast('请至少上传一张图片', 'error');
      return;
    }

    try {
      await generate({
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim() || undefined,
        model,
        ratio,
        resolution,
        sample_strength: sampleStrength,
        images,
      });
      showToast('生成成功', 'success');
    } catch (err) {
      showToast(error || '生成失败', 'error');
    }
  }, [prompt, negativePrompt, model, ratio, resolution, sampleStrength, images, generate, showToast, error]);

  // Download handler
  const handleDownload = useCallback((url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-composition-${Date.now()}-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white text-glow mb-2">图生图</h1>
        <p className="text-gray-400">上传参考图片，AI 将根据提示词进行风格转换</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Image Upload */}
          <div className="glass-card rounded-2xl p-5">
            <ImageUpload
              label="上传参考图片 (1-10张)"
              maxFiles={10}
              images={images}
              onChange={setImages}
            />
          </div>

          {/* Prompt */}
          <div className="glass-card rounded-2xl p-5">
            <Textarea
              label="提示词"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述你想要生成的图片风格..."
              rows={5}
            />

            {/* Negative Prompt Toggle */}
            <button
              onClick={() => setShowNegative(!showNegative)}
              className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <svg className={`w-4 h-4 transition-transform ${showNegative ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showNegative ? '隐藏' : '添加'}负面提示词
            </button>

            {showNegative && (
              <div className="mt-4">
                <Textarea
                  label="负面提示词"
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="描述你不想要的内容..."
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Model & Settings */}
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <Select
              label="生成模型"
              options={activeSite.imageModels.map(m => ({ label: m, value: m }))}
              value={model}
              onChange={handleModelChange}
            />

            <Select
              label="分辨率"
              options={RESOLUTIONS.map(r => ({ label: r.label, value: r.value }))}
              value={resolution}
              onChange={setResolution}
            />

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">宽高比</label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      ratio === r
                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sampling Strength */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">参考强度</label>
              <span className="text-sm text-purple-400 font-mono">{sampleStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sampleStrength}
              onChange={e => setSampleStrength(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>更多创意</span>
              <span>更忠实原图</span>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={!prompt.trim() || images.length === 0 || loading}
            size="lg"
            className="w-full"
          >
            {loading ? '生成中...' : '开始生成'}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="glass-card rounded-2xl p-4 border border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-3 text-red-400">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-5 min-h-[400px]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
              生成结果
            </h2>

            {!data && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p>上传图片并点击生成</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="relative">
                  <div className="loading-spinner w-16 h-16" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 opacity-50" />
                  </div>
                </div>
                <p className="text-gray-400 mt-6">AI 正在创作中...</p>
                <p className="text-gray-500 text-sm mt-2">请耐心等待</p>
              </div>
            )}

            {data && data.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {data.map((item, idx) => (
                  <div key={idx} className="group relative">
                    <div className="image-glow overflow-hidden">
                      <img
                        src={item.url}
                        alt={`生成结果 ${idx + 1}`}
                        className="w-full h-auto rounded-xl"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center pb-4">
                      <Button
                        onClick={() => handleDownload(item.url, idx)}
                        variant="secondary"
                        size="sm"
                        className="backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        下载图片
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
  );
}
