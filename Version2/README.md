# SUNNY 誓师大会签名墙 v2.0

本项目是一个为大型企业活动设计的实时交互签名系统。当员工完成签名时，其头像会从动态的流场粒子海洋中飞出，最终汇聚成特定图案（默认为 "SUNNY" 或企业 Logo）。

---

## 📋 核心特性

- **实时交互**：通过 WebSocket 实现签名的即时响应和头像动画。
- **流场粒子系统**：基于噪声算法（Noise）的金色粒子海洋，头像与装饰粒子在其中自然漂浮。
- **视觉阶段**：
    1. `INTRO_TO_LOGO`：粒子飞入并组成初始 Logo。
    2. `FREE_FLOAT`：粒子在流场中自由漂浮，等待签名事件。
    3. `CONVERGE_TO_SUNNY`：签名完成后，所有粒子汇聚组成目标字样。
- **高级采样优化**：采用 **Quadtree 自适应采样** 算法，自动识别图形边缘并加密粒子，彻底解决锯齿问题。
- **高性能渲染**：基于 PixiJS v7 和 GSAP v3，支持数千个粒子的流畅动画。
- **多模式支持**：支持 WebSocket（生产）、HTTP 轮询和 Mock（演示）模式。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **渲染引擎**：[PixiJS v7](https://pixijs.com/) - 高性能 WebGL 2D 渲染库。
- **动画库**：[GSAP v3](https://greensock.com/gsap/) - 专业 JavaScript 动画引擎。
- **通信**：原生 WebSocket 用于实时数据传输。

### 后端 (Node.js)
- **框架**：[Express](https://expressjs.com/) - 托管静态文件和提供 REST API。
- **即时通讯**：[ws](https://github.com/websockets/ws) - WebSocket 服务端实现。

---

## 🚀 快速开始

### 1. 环境准备
```bash
npm install
# (可选) 若需使用图片处理功能，请安装 sharp
# npm install sharp
```

### 2. 图片与数据准备
- 将员工头像放入 `imgs/` 目录，命名为工号（如 `100007.jpg`）。
- **管理工具**：运行 `npm run manage` (即 `node manage.js`)。
    - 选项 1：同步工号列表到 `employee-ids.json`。
    - 选项 2：检查图片完整性并补齐占位图。

### 3. 启动项目
```bash
# 启动服务器
npm start

# 开发模式（支持自动重启）
npm run dev
```
访问地址：`http://localhost:3000`

---

## ⚙️ 配置指南

### 常用配置 (`config.js`)
- `sunnyScale`：字形缩放 (0.35-1.0)。
- `adaptiveSampling`：自适应采样开关，开启后边缘更锐利。
- `avatarSwarm`：控制粒子总量与重复率。

### 动态调参 (URL 参数)
- `?hud=1`：开启调试面板。
- `?mock=1`：开启本地演示模式。
- `?sunnyTh=180`：调整文字采样阈值。

---

## 🔌 API 接口

### 核心接口
- `POST /api/signature`：接收单个签名。
- `POST /api/signatures/batch`：批量接收签名。
- `GET /api/employees`：获取所有可用工号。
- `POST /api/control/converge`：强制执行汇聚动画。

### WebSocket
- 地址: `ws://[host]/signatures`
- 消息格式: `{"employeeId": "ID", "timestamp": 123}`

---

## 📂 项目结构

```
Version2/
├── index.html          # 主入口
├── app.js              # 前端核心 (渲染、自适应采样算法)
├── server.js           # 后端服务
├── config.js           # 可视化配置
├── manage.js           # 综合管理工具
├── test-tool.html      # 签名压力测试工具
├── imgs/               # 员工头像
└── employee-ids.json   # 自动生成的工号列表
```

---

## 📝 更新日志

### 2026-02-10
- **修复 SUNNY 粒子底部堆积问题**：对粒子目标点 `sunnyDustTargets` 和 `logoDustTargets` 使用空间均匀采样算法 `_evenSampleIndices()`，替代原有的顺序截取方式。修复了因采样顺序和尺寸排序导致粒子集中在字形底部/边缘的问题，现在粒子均匀分布在整个字形区域作为间隙填充。

---

**祝誓师大会圆满成功！🎉**