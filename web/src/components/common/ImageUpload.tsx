import { useCallback, useRef, useState, DragEvent } from 'react';

interface ImageUploadProps {
  label?: string;
  maxFiles?: number;
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxSizeKB?: number; // 最大文件大小（KB），超过则压缩
  maxDimension?: number; // 最大边长（像素）
}

/**
 * 压缩图片
 * @param file 原始文件
 * @param maxSizeKB 目标最大大小（KB）
 * @param maxDimension 最大边长（像素）
 * @returns 压缩后的 base64 字符串
 */
async function compressImage(
  file: File,
  maxSizeKB: number,
  maxDimension: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // 计算缩放后的尺寸
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // 尝试不同质量级别压缩
      const tryCompress = (quality: number): string => {
        return canvas.toDataURL('image/jpeg', quality);
      };

      // 从高质量开始，逐步降低直到满足大小要求
      let quality = 0.9;
      let result = tryCompress(quality);

      // base64 大小约为原始大小的 4/3
      while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
        quality -= 0.1;
        result = tryCompress(quality);
      }

      URL.revokeObjectURL(img.src);
      resolve(result);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function ImageUpload({
  label,
  maxFiles = 10,
  images,
  onChange,
  disabled = false,
  maxSizeKB = 1024, // 默认最大 1MB
  maxDimension = 2048 // 默认最大边长 2048px
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || disabled) return;
    const remaining = maxFiles - images.length;
    if (remaining <= 0) return;

    const toProcess = Array.from(files).slice(0, remaining);
    setCompressing(true);

    try {
      for (const file of toProcess) {
        if (!file.type.startsWith('image/')) continue;

        // 检查文件大小，超过阈值则压缩
        const fileSizeKB = file.size / 1024;
        let base64: string;

        if (fileSizeKB > maxSizeKB || file.type === 'image/png') {
          // PNG 总是压缩转 JPEG，或文件过大时压缩
          console.log(`压缩图片: ${file.name} (${(fileSizeKB / 1024).toFixed(2)}MB -> 目标 ${maxSizeKB}KB)`);
          base64 = await compressImage(file, maxSizeKB, maxDimension);
          console.log(`压缩完成: ${(base64.length / 1024 / 1.37).toFixed(0)}KB`);
        } else {
          // 小文件直接读取
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        onChange([...images, base64]);
      }
    } catch (err) {
      console.error('图片处理失败:', err);
    } finally {
      setCompressing(false);
    }
  }, [images, maxFiles, onChange, disabled, maxSizeKB, maxDimension]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    onChange(images.filter((_, i) => i !== index));
  }, [images, onChange]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square">
              <div className="w-full h-full rounded-xl overflow-hidden image-glow">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg shadow-red-500/30 hover:scale-110"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxFiles && (
        <div
          className={`relative rounded-xl p-6 text-center transition-all duration-300 ${
            disabled || compressing
              ? 'glass-card opacity-50 cursor-not-allowed'
              : dragOver
              ? 'glass-card border-2 border-purple-500/50 bg-purple-500/10 cursor-pointer shadow-lg shadow-purple-500/20'
              : 'glass-card border-2 border-dashed border-white/10 hover:border-purple-500/30 hover:bg-white/5 cursor-pointer'
          }`}
          onClick={() => !disabled && !compressing && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!disabled && !compressing) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={disabled || compressing ? (e => e.preventDefault()) : handleDrop}
        >
          <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
            compressing
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 animate-pulse'
              : dragOver
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30'
              : 'bg-white/5'
          }`}>
            {compressing ? (
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {compressing ? '正在压缩图片...' : '点击或拖拽上传图片'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {compressing ? '大图片会自动压缩以提高上传成功率' : `最多 ${maxFiles} 张，已选 ${images.length} 张`}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
            disabled={disabled || compressing}
          />
        </div>
      )}
    </div>
  );
}
