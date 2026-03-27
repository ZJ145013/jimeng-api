#!/usr/bin/env node
/**
 * 模型同步脚本
 * 从后端 src/api/consts/common.ts 解析模型映射表，自动生成前端模型列表
 * 运行方式: node scripts/sync-models.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 后端常量文件路径
const COMMON_TS_PATH = resolve(__dirname, '../../src/api/consts/common.ts');
// 输出文件路径
const OUTPUT_PATH = resolve(__dirname, '../src/generated/models.ts');

/**
 * 从 TypeScript 源码中提取指定对象的 key 列表
 * 通过正则匹配 `export const VAR_NAME = { "key1": ..., "key2": ... }` 结构
 */
function extractModelKeys(source, varName) {
  // 匹配 export const VAR_NAME = { ... };
  const regex = new RegExp(
    `export\\s+const\\s+${varName}\\s*(?::\\s*[^=]+)?\\s*=\\s*\\{([^}]+)\\}`,
    's'
  );
  const match = source.match(regex);
  if (!match) {
    console.warn(`⚠️  未找到变量: ${varName}`);
    return [];
  }

  // 提取所有带引号的 key
  const keyRegex = /"([^"]+)"\s*:/g;
  const keys = [];
  let keyMatch;
  while ((keyMatch = keyRegex.exec(match[1])) !== null) {
    keys.push(keyMatch[1]);
  }
  return keys;
}

/**
 * 合并多个模型列表并去重（保持顺序）
 */
function mergeUnique(...arrays) {
  const seen = new Set();
  const result = [];
  for (const arr of arrays) {
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

function main() {
  console.log('📦 正在从后端同步模型配置...');
  console.log(`   源文件: ${COMMON_TS_PATH}`);

  // Docker 构建时后端源文件不在容器内，跳过生成，使用已提交的 generated/models.ts
  if (!existsSync(COMMON_TS_PATH)) {
    if (existsSync(OUTPUT_PATH)) {
      console.log('⏭️  后端源文件不存在（Docker 环境），使用已有的 generated/models.ts');
      return;
    }
    console.error('❌ 后端源文件不存在且无已生成文件，请在项目根目录下运行此脚本');
    process.exit(1);
  }

  const source = readFileSync(COMMON_TS_PATH, 'utf-8');

  // 提取图片模型
  const imageModelsCN = extractModelKeys(source, 'IMAGE_MODEL_MAP');
  const imageModelsUS = extractModelKeys(source, 'IMAGE_MODEL_MAP_US');
  const imageModelsASIA = extractModelKeys(source, 'IMAGE_MODEL_MAP_ASIA');

  // 提取视频模型
  const videoModelsCN = extractModelKeys(source, 'VIDEO_MODEL_MAP');
  const videoModelsUS = extractModelKeys(source, 'VIDEO_MODEL_MAP_US');
  const videoModelsASIA = extractModelKeys(source, 'VIDEO_MODEL_MAP_ASIA');

  // 前端 "国际站" = US + ASIA 合集（去重）
  const imageModelsIntl = mergeUnique(imageModelsASIA, imageModelsUS);
  const videoModelsIntl = mergeUnique(videoModelsASIA, videoModelsUS);

  // 生成 TypeScript 文件
  const output = `/**
 * ⚠️ 此文件由 scripts/sync-models.mjs 自动生成，请勿手动修改
 * 数据来源: src/api/consts/common.ts
 * 生成时间: ${new Date().toISOString()}
 */

// 图片模型 - 国内站 (CN)
export const IMAGE_MODELS_CN: string[] = ${JSON.stringify(imageModelsCN, null, 2)};

// 图片模型 - 国际站 (US + ASIA 合集)
export const IMAGE_MODELS_INTL: string[] = ${JSON.stringify(imageModelsIntl, null, 2)};

// 视频模型 - 国内站 (CN)
export const VIDEO_MODELS_CN: string[] = ${JSON.stringify(videoModelsCN, null, 2)};

// 视频模型 - 国际站 (US + ASIA 合集)
export const VIDEO_MODELS_INTL: string[] = ${JSON.stringify(videoModelsIntl, null, 2)};
`;

  // 确保输出目录存在
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, output, 'utf-8');

  console.log(`✅ 模型配置已生成: ${OUTPUT_PATH}`);
  console.log(`   国内图片模型 (${imageModelsCN.length}): ${imageModelsCN.join(', ')}`);
  console.log(`   国际图片模型 (${imageModelsIntl.length}): ${imageModelsIntl.join(', ')}`);
  console.log(`   国内视频模型 (${videoModelsCN.length}): ${videoModelsCN.join(', ')}`);
  console.log(`   国际视频模型 (${videoModelsIntl.length}): ${videoModelsIntl.join(', ')}`);
}

main();
