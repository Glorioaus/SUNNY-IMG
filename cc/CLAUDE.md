# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

SUNNY 签名墙 v2.0 是一个实时交互式签名墙系统，专为公司动员大会设计。当员工签名时，他们的头像会动画化（高亮、放大）并飞向所有收集的头像组成的 "SUNNY" 文字。系统具有基于 Pixi.js 的 WebGL 渲染流场粒子系统，以及实时 WebSocket 通信。

## 常用开发命令

### 启动应用
```bash
# 安装依赖
npm install

# 启动生产服务器
npm start

# 启动开发服务器（自动重启）
npm dev
```

### 工具脚本
```bash
# 从图片文件名中提取员工 ID 并生成 employee-ids.json
node extract-ids.js

# 准备图片（如需要）
node prepare-images.js
```

### 使用 API 测试
```bash
# 发送单个签名
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "100007"}'

# 发送批量签名
curl -X POST http://localhost:3000/api/signatures/batch \
  -H "Content-Type: application/json" \
  -d '{"employeeIds": ["100007", "100014", "100051"]}'

# 重置所有签名（用于测试）
curl -X POST http://localhost:3000/api/signatures/reset

# 启动模拟自动签名
curl -X POST http://localhost:3000/api/test/start-mock

# 停止模拟自动签名
curl -X POST http://localhost:3000/api/test/stop-mock
```

## 架构概览

### 核心组件

**前端（app.js - 785 行）**
- `SignatureWall` - 管理整个可视化的主应用类
- `SignatureScheduler` - 并发签名动画的队列管理
- `Noise` - 流场效果的简单 Perlin 噪声生成器
- 动画阶段：INTRO_TO_LOGO → EXPLODING → FREE_FLOAT → CONVERGE_TO_SUNNY

**后端（server.js）**
- Express.js 服务器，支持 WebSocket
- 内存签名存储
- 签名事件的实时广播
- 模拟测试端点

### 数据流架构

```
员工签名 → POST /api/signature → 后端存储并广播
→ WebSocket 推送 → 前端接收 → 调度器排队动画
→ 头像高亮 → 飞向目标 → 锁定位置
```

### 连接模式

系统支持在 `app.js` 中配置的三种连接模式：

1. **WebSocket**（生产环境）- 实时双向通信
2. **Polling**（备用）- 在没有 WebSocket 的环境中使用 HTTP 轮询
3. **Mock**（测试）- 自动顺序触发签名

## 关键配置

### 员工 ID 管理
- 员工 ID 从 `imgs/` 文件夹中的图片文件名自动提取
- 运行 `node extract-ids.js` 生成/更新 `employee-ids.json`
- 系统使用 JSON 文件中的不规则员工 ID（非连续）
- 缺失的图片显示为带有员工 ID 后 3 位数字的金色圆形

### 核心配置位置
前端配置在 `app.js`（CONFIG 对象）中：
- `totalEmployees` - 从 employee-ids.json 自动设置
- `text` - 要形成的文字（默认："SUNNY"）
- `signatureAPI.mode` - 连接模式
- 动画时序和视觉设置

### 图片要求
- 位置：`imgs/` 文件夹
- 命名：`{employeeId}.jpg` 或 `{employeeId}.png`
- 推荐大小：200×200px 或更大
- 缺失图片自动使用占位符

## 文件结构

```
D:\UGit\SUNNY-IMG\cc\
├── index.html              # 主前端 HTML 页面
├── app.js                  # 前端核心逻辑（SignatureWall 类）
├── server.js               # Express + WebSocket 后端服务器
├── test-tool.html          # 测试/开发工具页面
├── package.json            # 依赖和脚本
├── config.example.js       # 配置模板
├── extract-ids.js          # 员工 ID 提取工具
├── prepare-images.js       # 图片准备工具
├── employee-ids.json       # 生成的员工 ID 列表
├── imgs/                   # 员工头像图片文件夹
└── source-images/          # 源图片存储
```

## 技术栈

**前端：**
- Pixi.js v7.3.2 - WebGL 渲染引擎
- GSAP v3.12.2 - 动画库
- Vanilla JavaScript - 无框架

**后端：**
- Node.js with Express.js v4.18.2
- WebSocket (ws) v8.14.2
- Sharp v0.34.5 - 图片处理

**开发：**
- Nodemon v3.0.1 - 开发期间自动重启

## 测试和开发

### 测试工具
访问 `http://localhost:3000/test-tool.html` 可进行：
- 服务器连接测试
- 单个/批量签名测试
- 使用随机员工 ID 自动测试
- 后端模拟控制
- 实时统计

### 调试
- 浏览器控制台（F12）显示详细的动画日志
- 服务器运行在端口 3000
- 固定屏幕分辨率：1920×1080
- WebSocket 端点：`ws://localhost:3000/signatures`

## 重要说明

- 如果 WebSocket 失败，系统会自动回退到 Mock 模式
- 员工 ID 是不规则的（非连续）- 始终使用 employee-ids.json
- 图片异步加载，缺失时使用占位符
- 动画队列防止并发签名过载
- 所有配置集中在 app.js CONFIG 对象中