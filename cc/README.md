# SUNNY 誓师大会签名墙 v2.0

## 📋 项目简介

这是一个为誓师大会打造的实时签名墙系统。当员工完成签名时，其头像会实时放大、高亮，然后飞向屏幕中央，最终所有头像汇聚成"SUNNY"字样。

### ✨ 核心功能

- 🎯 **实时签名响应** - 员工签名瞬间触发头像动画
- 🎨 **流场粒子系统** - 未签名的头像在金色粒子海洋中自然流动
- 📊 **进度实时显示** - 顶部显示签名进度条和计数
- 🔗 **多种连接方式** - 支持WebSocket、HTTP轮询、Mock演示
- 💫 **完成庆祝动画** - 全员签名后触发特效

---

## 🚀 快速开始

### 1. 准备图片

将所有员工头像放入 `imgs` 文件夹，命名格式：

```
imgs/
  ├── 100007.jpg
  ├── 100014.jpg
  ├── 100051.jpg
  └── ...
```

**要求：**
- 文件名必须是工号（如 `100007.jpg`）
- 建议尺寸：200×200px 以上
- 格式：JPG/PNG
- 支持不规则工号（无需连续）

### 2. 提取工号列表

运行脚本自动提取所有图片对应的工号：

```bash
node extract-ids.js
```

脚本会：
- 自动扫描 `imgs` 文件夹中的所有图片
- 提取文件名（不含扩展名）作为工号
- 生成 `employee-ids.json` 文件，包含所有实际工号
- 输出工号总数和列表到控制台

### 3. 安装依赖

```bash
npm install
```

### 4. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动

### 5. 打开前端页面

用浏览器打开 `index.html`，或者访问：
```
http://localhost:3000/index.html
```

**重要：** 确保浏览器分辨率为 **1920×1080**

---

## 🎮 使用方式

### 方式一：WebSocket 实时推送（推荐）

这是最流畅的方式，适合生产环境。

**前端配置（app.js）：**
```javascript
signatureAPI: {
    mode: "websocket",
    websocketUrl: "ws://localhost:3000/signatures"
}
```

**触发签名：**
```bash
# 单个签名
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "105001"}'

# 批量签名
curl -X POST http://localhost:3000/api/signatures/batch \
  -H "Content-Type: application/json" \
  -d '{"employeeIds": ["105001", "105002", "105003"]}'
```

### 方式二：HTTP 轮询

适合简单场景或无WebSocket支持的环境。

**前端配置（app.js）：**
```javascript
signatureAPI: {
    mode: "polling",
    pollingUrl: "http://localhost:3000/api/signatures",
    pollingInterval: 1000  // 每秒轮询一次
}
```

### 方式三：Mock 演示模式

无需后端，自动按顺序触发签名，适合测试和演示。

**前端配置（app.js）：**
```javascript
signatureAPI: {
    mode: "mock",
    mockDelay: 2000  // 每2秒签名一个
}
```

或者使用服务器的模拟接口：
```bash
# 启动自动模拟签名
curl -X POST http://localhost:3000/api/test/start-mock

# 停止模拟
curl -X POST http://localhost:3000/api/test/stop-mock
```

---

## 🔧 配置说明

### app.js 核心配置

```javascript
const CONFIG = {
    totalEmployees: 300,      // 员工总数
    dustCount: 1500,          // 尘埃粒子数量
    text: "SUNNY",            // 要拼成的文字
    fontSize: 280,            // 文字大小

    imagesFolder: "./imgs/",  // 图片文件夹路径
    imageExtension: ".jpg",   // 图片扩展名

    signatureAPI: {
        mode: "websocket",    // 连接模式
        websocketUrl: "ws://localhost:3000/signatures",
        pollingUrl: "http://localhost:3000/api/signatures",
        pollingInterval: 1000,
        mockDelay: 2000
    },

    particleSize: 32,         // 头像尺寸
    flowSpeed: 0.06,          // 流场速度

    animation: {
        signatureHighlight: 0.8,  // 签名高亮时长（秒）
        flyToPosition: 2.0,       // 飞向目标时长（秒）
        queueDelay: 150           // 队列处理间隔（毫秒）
    }
};
```

### 修改文字内容

如果要改成其他文字（如"团结"、"奋斗"），修改：

```javascript
text: "团结",  // 改为你想要的文字
fontSize: 280, // 根据字数调整大小
```

### 员工工号自动识别

系统会自动从 `employee-ids.json` 文件加载实际工号列表，无需手动配置：
- `totalEmployees` 会自动设置为实际工号数量
- 工号列表会自动从JSON文件读取
- 无需修改代码中的工号起始值或范围

如果需要更新工号列表，只需重新运行：
```bash
node extract-ids.js
```

---

## 🎨 视觉定制

### 更改配色

```javascript
colors: {
    gold: 0xFFD700,      // 主色调（金色）
    highlight: 0xFFFF00, // 签名高亮色（亮黄）
    signed: 0x00FF00,    // 已签名边框色（绿色）
    dust: [0xFFD700, 0xFFA500, 0xFF8C00]  // 尘埃颜色组
}
```

### 调整动画速度

```javascript
animation: {
    signatureHighlight: 1.2,  // 增加签名高亮时间
    flyToPosition: 1.5,       // 加快飞行速度
    queueDelay: 100           // 减小队列延迟（更快处理）
}
```

### 添加Logo

将你的logo文件命名为 `logo.png` 放在项目根目录，HTML会自动显示在左上角。

---

## 🔌 API 接口文档

### POST /api/signature

接收单个签名

**请求：**
```json
{
  "employeeId": "100007"
}
```

**响应：**
```json
{
  "success": true,
  "signature": {
    "id": 1,
    "employeeId": "100007",
    "timestamp": 1704067200000
  }
}
```

### POST /api/signatures/batch

批量接收签名

**请求：**
```json
{
  "employeeIds": ["100007", "100014", "100051"]
}
```

**响应：**
```json
{
  "success": true,
  "count": 3,
  "signatures": [...]
}
```

### GET /api/signatures?since={id}

轮询获取新签名（since参数为上次获取的最大ID）

**响应：**
```json
{
  "signatures": [
    {
      "id": 2,
      "employeeId": "100014",
      "timestamp": 1704067201000
    }
  ],
  "total": 2
}
```

### POST /api/signatures/reset

重置所有签名（测试用）

**响应：**
```json
{
  "success": true,
  "message": "已重置所有签名"
}
```

### GET /api/employees

获取所有实际存在的工号列表

**响应：**
```json
{
  "employees": ["100007", "100014", "100051", ...],
  "total": 100
}
```

---

## 🧪 测试工具使用指南

项目提供了一个功能完整的测试工具页面，方便您测试签名功能。

### 访问测试页面

打开浏览器访问：
```
http://localhost:3000/test-tool.html
```

### 主要功能

#### 1. 服务器连接
- 测试与后端服务器的连接状态
- 获取当前签名统计信息
- 重置所有签名数据

#### 2. 单个签名
- 输入工号发送单个签名请求
- 随机选择一个实际存在的工号进行测试
- 实时显示签名结果

#### 3. 批量签名
- 一次性发送多个工号的签名请求
- 自动生成10个随机工号用于测试
- 支持每行一个工号的批量输入

#### 4. 自动测试
- 按指定间隔自动发送签名请求
- 随机打乱工号顺序，模拟真实场景
- 实时显示自动测试进度

#### 5. 后端Mock
- 启动后端自动模拟签名
- 停止模拟签名
- 触发汇聚动画，组成"SUNNY"字样

#### 6. 统计信息
- 实时显示已签名数量
- 总员工数（自动从实际工号列表获取）
- 签名完成进度
- WebSocket连接数

### 特点

- **自动加载工号**：测试页面会自动从`employee-ids.json`加载实际工号列表
- **真实数据测试**：所有测试使用的都是实际存在的工号，避免无效测试
- **友好的界面**：直观的操作界面，详细的日志输出
- **错误处理**：完善的错误提示和异常处理机制

---

## 🔍 调试与测试

### 查看控制台日志

打开浏览器开发者工具（F12），查看Console标签：

```
[SignatureListener] 初始化模式: websocket
[WebSocket] 连接成功
[TextTargets] 采样到12543个坐标点
[EmployeeList] 生成300个员工
[LoadAvatars] 加载完成: 300/300
[Signature] ✓ 105001 已签名
```

### 测试单个签名

```bash
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "105001"}'
```

### 查看服务器状态

```bash
curl http://localhost:3000/health
```

响应：
```json
{
  "status": "ok",
  "signatures": 5,
  "connections": 1
}
```

### 启动自动演示

```bash
# 启动模拟签名（每2秒一个）
curl -X POST http://localhost:3000/api/test/start-mock

# 查看效果后停止
curl -X POST http://localhost:3000/api/test/stop-mock
```

---

## 🎯 常见问题

### Q: 图片加载失败怎么办？

A: 检查以下几点：
1. 图片路径是否正确（`./imgs/工号.jpg`）
2. 文件名是否与工号完全一致
3. 图片格式是否支持（JPG/PNG）
4. 控制台是否有404错误

**解决方案：** 缺失的图片会自动显示金色圆形占位符，带工号后三位数字。

### Q: WebSocket连接失败？

A: 
1. 确认服务器已启动（`npm start`）
2. 检查端口是否被占用
3. 查看浏览器Console的错误信息

### Q: 测试页面工号不匹配怎么办？

A: 这是因为测试页面使用的默认工号与实际图片工号不一致。解决方案：
1. 确保已运行 `node extract-ids.js` 生成实际工号列表
2. 刷新测试页面，它会自动加载实际工号列表
3. 如果问题仍然存在，检查 `employee-ids.json` 文件是否存在且包含有效工号

### Q: 签名后不显示头像？

A: 请检查：
1. 工号是否与图片文件名完全一致（区分大小写）
2. 图片格式是否为支持的格式（JPG/PNG）
3. 图片文件是否存在于 `imgs` 文件夹中
4. 浏览器控制台是否有404错误提示

### Q: 系统会自动降级到Mock模式？

A: 是的，当WebSocket连接失败或后端服务不可用时，系统会自动降级到Mock模式，继续显示动画效果，但不会处理真实的签名请求。

### Q: 动画太快/太慢？

A: 修改 `app.js` 中的配置：

```javascript
animation: {
    signatureHighlight: 0.8,  // 签名放大时长
    flyToPosition: 2.0,       // 飞行时长
    queueDelay: 150           // 队列间隔
},
mockDelay: 2000  // Mock模式签名间隔
```

### Q: 想更改拼成的文字？

A: 修改配置中的 `text` 字段：

```javascript
text: "奋进",  // 2个字
fontSize: 350, // 字少可以放大

// 或
text: "齐心协力",  // 4个字
fontSize: 200,     // 字多需缩小
```

### Q: 如何适配不同屏幕？

A: 当前版本固定为1920×1080。如需响应式，修改：

```javascript
// app.js
this.app = new PIXI.Application({
    resizeTo: window,  // 改为自适应
    // ...
});

// 并调整字体大小计算
fontSize: Math.min(window.innerWidth / 7, 280)
```

---

## 📦 项目结构

```
sunny-signature-wall/
├── index.html          # 前端页面
├── app.js              # 前端核心逻辑
├── server.js           # 后端服务器（可选）
├── package.json        # 依赖配置
├── logo.png            # Logo图片（可选）
├── imgs/               # 员工头像文件夹
│   ├── 105001.jpg
│   ├── 105002.jpg
│   └── ...
└── README.md           # 本文档
```

---

## 🎬 部署到生产环境

### 1. 准备服务器

- 配置Nginx反向代理
- 开放3000端口（或自定义端口）
- 配置SSL证书（用于wss://）

### 2. 修改生产配置

```javascript
// app.js
signatureAPI: {
    mode: "websocket",
    websocketUrl: "wss://your-domain.com/signatures"  // 使用wss
}
```

### 3. 使用PM2守护进程

```bash
npm install -g pm2
pm2 start server.js --name sunny-wall
pm2 save
pm2 startup
```

### 4. Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🤝 技术支持

如有问题，请检查：
1. 控制台日志（浏览器F12 → Console）
2. 服务器日志（终端输出）
3. 网络请求（浏览器F12 → Network）

---

## 📝 更新日志

### v2.0.0 (2026-01-30)
- ✅ 重构为事件驱动架构
- ✅ 增加WebSocket实时推送
- ✅ 增加HTTP轮询支持
- ✅ 增加Mock演示模式
- ✅ 优化签名动画流程
- ✅ 增加进度显示
- ✅ 改进错误处理

### v1.0.0
- 初始版本（自动加载显示）

---

## 📄 License

MIT License

---

**祝誓师大会圆满成功！🎉**
