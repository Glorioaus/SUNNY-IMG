# GEMINI.md - SUNNY 誓师大会签名墙 v2.0 指南

## 项目简介

**SUNNY 誓师大会签名墙** 是一个为大型企业活动设计的实时交互签名系统。当员工完成签名时（通过 API 触发），其头像会从动态的流场粒子海洋中飞出，最终汇聚成特定的图案或文字（默认为 "SUNNY"）。

### 核心特性
- **实时交互**：通过 WebSocket 实现签名的即时响应和头像动画。
- **流场粒子系统**：基于噪声算法（Noise）的金色粒子海洋，头像与装饰粒子（Dust）在其中自然漂浮。
- **视觉阶段**：
    1. `INTRO_TO_LOGO`：粒子飞入并组成初始的 Logo。
    2. `FREE_FLOAT`：粒子在流场中自由漂浮，等待签名事件。
    3. `CONVERGE_TO_SUNNY`：全员签名完成后，所有粒子汇聚组成 "SUNNY" 字样。
- **多模式支持**：支持 WebSocket（推荐）、HTTP 轮询和 Mock 演示模式。

---

## 技术栈

### 前端 (Frontend)
- **渲染引擎**：[PixiJS v7](https://pixijs.com/) - 高性能 WebGL 2D 渲染库。
- **动画库**：[GSAP v3](https://greensock.com/gsap/) - 专业的 JavaScript 动画引擎。
- **通信**：原生 WebSocket 用于实时数据传输。
- **字体**：Montserrat & Noto Sans SC（通过 Google Fonts 加载）。

### 后端 (Node.js)
- **框架**：[Express](https://expressjs.com/) - 托管静态文件和提供 RESTful API。
- **即时通讯**：[ws](https://github.com/websockets/ws) - WebSocket 服务端实现。
- **图像处理**：[sharp](https://sharp.pixelplumbing.com/) - 用于图片缩放、重命名及占位图生成。

---

## 开发与常用命令

### 1. 环境准备
```bash
# 安装基础依赖
npm install

# (可选) 若需使用图片处理脚本，请安装 sharp
npm install sharp
```

### 2. 图片准备流程
- 将员工头像放入 `imgs/` 目录。
- 文件名需命名为工号（例如：`100007.jpg`）。
- **同步工号列表**：
  ```bash
  node extract-ids.js
  ```
  该脚本会扫描 `imgs/` 文件夹并自动更新 `employee-ids.json`。

### 3. 启动项目
```bash
# 启动服务器（生产模式）
npm start

# 开发模式（支持自动重启）
npm run dev
```
访问地址：`http://localhost:3000`

### 4. 测试与调试
- 访问 `http://localhost:3000/test-tool.html` 使用图形化测试工具。
- **手动触发签名 (CURL)**：
  ```bash
  curl -X POST http://localhost:3000/api/signature -H "Content-Type: application/json" -d '{"employeeId": "100007"}'
  ```

---

## 项目结构说明

- `index.html`：主入口，通过 CDN 加载 PixiJS 和 GSAP。
- `app.js`：**核心逻辑**。包含 `SignatureWall` 主类、流场算法、状态管理及 PixiJS 场景构建。
- `server.js`：**后端服务**。负责静态文件托管、签名 API 接收及 WebSocket 广播。
- `extract-ids.js`：辅助脚本，根据图片文件生成 `employee-ids.json`。
- `prepare-images.js`：高级图片工具，支持批量重命名、调整尺寸及生成缺失占位图。
- `test-tool.html`：测试仪表盘，用于模拟各种签名场景。

---

## 开发规范

- **分辨率优化**：项目固定适配 **1920x1080**。
- **配置管理**：所有视觉常数、API 地址及动画时长均在 `app.js` 顶部的 `CONFIG` 对象中定义。
- **粒子状态**：
    - `IDLE`：在流场中自由漂浮。
    - `SIGNING`：正在执行签名动画（放大/飞向中心）。
    - `SIGNED`：已完成签名，带有高亮边框。
- **容错机制**：若头像图片缺失，系统会自动生成带工号后三位的金色圆环占位符。