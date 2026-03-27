# Jimeng Web — AI 创作控制台

> 基于 [iptag/jimeng-api](https://github.com/iptag/jimeng-api) 的现代化 Web 前端，提供沉浸式 AI 图像与视频创作体验。

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## ✨ 功能亮点

| 模块 | 说明 |
|------|------|
| 🖥 **仪表盘** | Token 存活率总览、积分余额实时监控、最近创作记录 |
| 🎨 **图像工作区** | 文生图 / 图生图自动切换，最高 10 张多图融合，负向提示词，创意程度调节 |
| 🎬 **视频工作区** | 4 模式引擎（文生视频 · 图生视频 · 首尾帧 · Omni 全能），实时渲染进度条 |
| 📋 **历史记录** | 本地保存全部创作历史，支持预览、下载，展示模型与时间标签 |
| ⚙️ **配置中心** | 多站点管理 · Token 仓库（带备注标签） · 模型同步 · 一键签到 / 验活 / 积分查询 |

### 核心特性

- 🌙 **暗黑毛玻璃 UI** — `glass-card` 风格 + `framer-motion` 微动画，质感拉满
- 🔄 **智能 Token 轮询** — 优先高余额 Token，同余额随机负载均衡，额度耗尽自动切换
- 🌐 **多站点支持** — 国内站 / 国际站（US/HK/JP/SG）独立配置，一键切换
- 🔌 **Nginx API 反代** — 前端无需硬编码后端地址，`/api/` 路径统一代理
- 📦 **模型自动同步** — 构建时从后端 `common.ts` 自动提取模型列表

---

## 🏗 项目结构

```
web/
├── src/
│   ├── components/
│   │   ├── common/          # 通用 UI 组件 (Button, Select, Toast...)
│   │   ├── settings/        # 配置中心子模块 (SiteConfig, TokenManager...)
│   │   ├── workspace/       # 创作工作区 (ImageWorkspace, VideoWorkspace)
│   │   ├── Dashboard.tsx    # 仪表盘
│   │   ├── History.tsx      # 历史记录
│   │   └── Sidebar.tsx      # 侧边导航
│   ├── contexts/            # React Context (多站点配置管理)
│   ├── hooks/               # 自定义 Hooks (useApi — 图像/视频生成)
│   ├── services/            # 服务层 (core · image · video · account)
│   ├── types/               # TypeScript 类型定义
│   └── utils/               # 工具函数 (constants, history)
├── scripts/
│   └── sync-models.mjs      # 从后端 common.ts 自动同步模型列表
├── Dockerfile               # 多阶段构建 (Node build → Nginx serve)
└── nginx.conf               # Nginx 反代 + 静态资源配置
```

---

## 🚀 快速开始

### 方式一：Docker 联合部署（推荐）

项目根目录已提供 `docker-compose-web.yml`，一条命令启动 API 后端 + Web 前端：

```bash
# 在项目根目录执行
docker compose -f docker-compose-web.yml up -d
```

| 服务 | 端口 | 说明 |
|------|------|------|
| `jimeng-api` | 5100 | 上游 API 后端（拉取官方镜像） |
| `jimeng-web` | 8185 | Web 前端（本地构建 Nginx 镜像） |
| `model-sync` | — | Init 容器：启动时自动从后端源码同步模型列表 |

```bash
# 查看日志
docker compose -f docker-compose-web.yml logs -f

# 刷新模型列表（上游更新模型后执行）
docker compose -f docker-compose-web.yml restart model-sync jimeng-web

# 停止服务
docker compose -f docker-compose-web.yml down
```

### 方式二：本地开发

```bash
cd web
npm install
npm run dev          # Vite 开发服务器 → http://localhost:5173
```

> ⚠️ 需要后端 API 服务运行在 `localhost:5100`，参考根目录的 [API 文档](../README.md)。

### 方式三：单独构建 Docker 镜像

```bash
cd web
docker build -t jimeng-web .
docker run -d -p 8185:80 --name jimeng-web jimeng-web
```

---

## ⚙️ 配置说明

首次访问 Web 界面后，进入 **配置中心** 完成以下设置：

1. **站点配置** — 设置站点名称、区域（国内/国际）、API 基准地址
2. **Token 仓库** — 添加一个或多个 `sessionid`，支持自定义备注标签
3. **模型管理** — 系统会自动同步后端支持的模型列表，也可手动增删

> 💡 获取 `sessionid` 的方法参考上游项目的 [详细说明](../README.md#getting-sessionid)。

---

## 📖 与上游项目的关系

```
jimeng-api/                  ← 上游项目根目录（保持同步，不做修改）
├── README.md                ← 上游 API 文档
├── src/                     ← 上游后端源码
├── docker-compose.yml       ← 上游单 API 部署
│
├── web/                     ← 🆕 自研 Web 前端（本文档）
│   ├── README.md            ← 你正在看的这个文件
│   └── ...
└── docker-compose-web.yml   ← 🆕 前后端联合部署编排
```

**同步上游更新**：

```bash
git remote add upstream https://github.com/iptag/jimeng-api.git
git fetch upstream
git merge upstream/main      # web/ 目录的内容不会产生冲突
```

---

## 📜 许可证

本项目遵循 [GPL-3.0](../LICENSE) 协议，与上游项目保持一致。
