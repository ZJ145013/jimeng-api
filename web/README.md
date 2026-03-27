# 即梦 AI Web

[jimeng-api](https://github.com/iptag/jimeng-api) 的现代化 Web 前端界面，支持文生图、图生图、视频生成等 AI 创作功能。

## 功能特性

- **文生图** - 输入提示词生成精美图片
- **图生图** - 上传参考图片进行风格转换
- **视频生成** - 支持文生视频、图生视频、首尾帧模式
- **多站点配置** - 支持国内站/国际站切换
- **多 Token 轮询** - 自动轮询多个 API Key，积分不足自动切换
- **Token 管理** - 批量签到、查询积分、验证状态
- **历史记录** - 本地保存生成历史，支持预览和下载

## Docker 部署

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或直接拉取镜像运行
docker run -d -p 3000:80 ghcr.io/zj145013/jimeng-web:latest
```

访问 http://localhost:3000

## 配置说明

首次使用需要在「配置中心」页面进行设置：

1. **API 地址** - 填写 jimeng-api 服务地址
2. **API Key** - 填写一个或多个 Token（支持多 Token 轮询）
3. **模型管理** - 可添加/删除图片和视频模型

## License

MIT
