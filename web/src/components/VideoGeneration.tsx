import { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useVideoGeneration } from '../hooks/useApi';
import { VIDEO_ASPECT_RATIOS, VIDEO_RESOLUTIONS, VIDEO_DURATIONS } from '../utils/constants';
import { Button } from './common/Button';
import { Textarea } from './common/Textarea';
import { Select } from './common/Select';
import { ImageUpload } from './common/ImageUpload';
import { useToast } from './common/Toast';

type VideoMode = 'text2video' | 'img2video' | 'keyframes';

export default function VideoGeneration() {
  const { activeSite } = useConfig();
  const { loading, error, data, progress, statusText, generate } = useVideoGeneration();
  const { showToast } = useToast();

  const [mode, setMode] = useState<VideoMode>('text2video');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [ratio, setRatio] = useState<string>(VIDEO_ASPECT_RATIOS[0]);
  const [resolution, setResolution] = useState<string>(VIDEO_RESOLUTIONS[0].value);
  const [duration, setDuration] = useState<number>(VIDEO_DURATIONS[0].value);
  const [images, setImages] = useState<string[]>([]);
  const [firstImage, setFirstImage] = useState<string[]>([]);
  const [lastImage, setLastImage] = useState<string[]>([]);

  // 初始化模型选择
  useEffect(() => {
    if (activeSite?.videoModels?.length > 0) {
      setModel(activeSite.videoModels[0]);
    }
  }, [activeSite]);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('请输入生成提示词', 'error');
      return;
    }

    if (!model) {
      showToast('请选择模型', 'error');
      return;
    }

    if (mode === 'img2video' && images.length === 0) {
      showToast('请上传参考图片', 'error');
      return;
    }

    if (mode === 'keyframes' && firstImage.length === 0) {
      showToast('请至少上传首帧图片', 'error');
      return;
    }

    // API 根据 file_paths 数量自动判断模式：0=文生视频，1=图生视频，2=首尾帧
    let file_paths: string[] | undefined;
    if (mode === 'img2video') {
      file_paths = images;
    } else if (mode === 'keyframes') {
      file_paths = lastImage.length > 0
        ? [firstImage[0], lastImage[0]]
        : [firstImage[0]];
    }

    await generate({
      prompt: prompt.trim(),
      model,
      ratio,
      resolution,
      duration,
      file_paths,
    });
  };

  const handleDownload = () => {
    if (!data?.url) return;
    const link = document.createElement('a');
    link.href = data.url;
    link.download = `video-${Date.now()}.mp4`;
    link.click();
  };

  const modelOptions = (activeSite?.videoModels || []).map(m => ({
    label: m,
    value: m,
  }));

  const durationOptions = VIDEO_DURATIONS.map(d => ({
    label: d.label,
    value: String(d.value),
  }));

  const resolutionOptions = VIDEO_RESOLUTIONS.map(r => ({
    label: r.label,
    value: r.value,
  }));

  const modeConfig = [
    { key: 'text2video' as const, label: '文生视频', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { key: 'img2video' as const, label: '图生视频', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'keyframes' as const, label: '首尾帧', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white text-glow mb-2">视频生成</h1>
        <p className="text-gray-400">使用 AI 将创意转化为动态视频</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Mode Selection */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-sm font-medium text-gray-300 mb-3">生成模式</label>
            <div className="grid grid-cols-3 gap-2">
              {modeConfig.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
                    mode === m.key
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-white shadow-lg shadow-purple-500/20'
                      : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    mode === m.key
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-md shadow-purple-500/30'
                      : 'bg-white/5'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="glass-card rounded-2xl p-5">
            <Textarea
              label="视频描述"
              placeholder="描述你想生成的视频内容，越详细越好..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
            />
          </div>

          {/* Image Upload for img2video */}
          {mode === 'img2video' && (
            <div className="glass-card rounded-2xl p-5">
              <ImageUpload
                label="参考图片"
                maxFiles={1}
                images={images}
                onChange={setImages}
                maxSizeKB={512}
                maxDimension={1920}
              />
            </div>
          )}

          {/* Keyframes Upload */}
          {mode === 'keyframes' && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <ImageUpload
                label="首帧图片"
                maxFiles={1}
                images={firstImage}
                onChange={setFirstImage}
                maxSizeKB={512}
                maxDimension={1920}
              />
              <ImageUpload
                label="尾帧图片（可选）"
                maxFiles={1}
                images={lastImage}
                onChange={setLastImage}
                disabled={firstImage.length === 0}
                maxSizeKB={512}
                maxDimension={1920}
              />
              {firstImage.length === 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  请先上传首帧图片
                </p>
              )}
            </div>
          )}

          {/* Model & Settings */}
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <Select
              label="模型"
              options={modelOptions}
              value={model}
              onChange={setModel}
            />

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">视频比例</label>
              <div className="flex gap-2 flex-wrap">
                {VIDEO_ASPECT_RATIOS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
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

            <Select
              label="分辨率"
              options={resolutionOptions}
              value={resolution}
              onChange={setResolution}
            />

            <Select
              label="视频时长"
              options={durationOptions}
              value={String(duration)}
              onChange={val => setDuration(Number(val))}
            />
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full"
            loading={loading}
            onClick={handleGenerate}
          >
            {loading ? '生成中...' : '开始生成'}
          </Button>

          {/* Progress */}
          {loading && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">生成进度</span>
                <span className="text-sm font-mono text-purple-400">{Math.round((progress || 0) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${(progress || 0) * 100}%` }}
                />
              </div>
              {statusText && (
                <p className="text-sm text-gray-400 mt-3 flex items-center gap-2">
                  <div className="loading-spinner w-4 h-4" />
                  {statusText}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Result */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-5 min-h-[400px]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
              生成结果
            </h2>

            {error && !loading && (
              <div className="glass-card rounded-xl p-4 border border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-3 text-red-400">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {!data && !loading && !error && (
              <div className="aspect-video rounded-xl bg-white/5 flex flex-col items-center justify-center text-gray-500">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p>生成的视频将显示在这里</p>
              </div>
            )}

            {data?.url && (
              <div className="space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden bg-black image-glow">
                  <video
                    src={data.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                    poster={data.cover_url}
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleDownload}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载视频
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
