# SUNNY 签名墙 - 快速启动指南 ⚡

## 🎯 5分钟快速上手

### 第一步：准备图片

```bash
# 1. 创建图片文件夹
mkdir imgs

# 2. 将员工头像复制到 imgs 文件夹
# 文件命名格式：工号.jpg
# 例如：105001.jpg, 105002.jpg, ..., 105300.jpg
```

### 第二步：安装依赖

```bash
npm install
```

### 第三步：启动服务器

```bash
npm start
```

看到以下输出说明启动成功：
```
╔════════════════════════════════════════════╗
║   SUNNY 签名墙服务器已启动                  ║
║   端口: 3000                               ║
╚════════════════════════════════════════════╝
```

### 第四步：打开页面

用浏览器打开：`http://localhost:3000/index.html`

**重要：** 确保浏览器全屏，分辨率为 1920×1080

---

## 🎮 三种使用模式

### 模式1: 自动演示（最简单）

修改 `app.js` 第26行：

```javascript
signatureAPI: {
    mode: "mock",  // 改为 mock
    // ...
}
```

刷新页面，系统会自动按顺序签名（每2秒一个）

### 模式2: 手动测试

1. 打开测试工具：`http://localhost:3000/test-tool.html`
2. 点击"测试连接"确认服务器正常
3. 在"单个签名"区域输入工号，点击"发送签名"
4. 或点击"启动自动签名"进行批量测试

### 模式3: 实际部署（生产环境）

保持默认的 WebSocket 模式：

```javascript
signatureAPI: {
    mode: "websocket",
    // ...
}
```

使用你的签名系统调用API：

```bash
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "105001"}'
```

---

## 📱 常用命令

```bash
# 启动服务器
npm start

# 重置所有签名
curl -X POST http://localhost:3000/api/signatures/reset

# 查看服务器状态
curl http://localhost:3000/health

# 启动自动模拟签名
curl -X POST http://localhost:3000/api/test/start-mock

# 停止自动模拟
curl -X POST http://localhost:3000/api/test/stop-mock
```

---

## 🔧 常见调整

### 更改签名速度

编辑 `app.js`：

```javascript
animation: {
    signatureHighlight: 0.8,  // 放大时长（秒）
    flyToPosition: 2.0,       // 飞行时长（秒）
    queueDelay: 150           // 队列间隔（毫秒）
}
```

### 更改文字内容

```javascript
text: "团结",     // 改为你想要的文字
fontSize: 350,    // 调整大小
```

### 更改颜色主题

```javascript
colors: {
    gold: 0xFFD700,      // 主色
    highlight: 0xFFFF00, // 签名高亮色
    signed: 0x00FF00,    // 已签名边框色
}
```

---

## ⚠️ 故障排除

### 问题1: 图片不显示

**检查：**
- imgs文件夹是否存在
- 图片命名是否正确（如 `105001.jpg`）
- 文件格式是否为 JPG/PNG
- 浏览器Console是否有404错误

**解决：** 缺失的图片会显示金色圆形占位符

### 问题2: WebSocket连接失败

**检查：**
- 服务器是否已启动（`npm start`）
- 端口3000是否被占用
- 浏览器Console是否有连接错误

**解决：** 系统会自动降级到Mock模式

### 问题3: 签名没有触发动画

**检查：**
- 工号是否在105001-105300范围内
- 浏览器Console是否有错误
- 该工号是否已经签名过

**解决：** 查看Console日志，检查服务器返回

---

## 📞 需要帮助？

1. 查看完整文档：`README.md`
2. 使用测试工具：`test-tool.html`
3. 查看浏览器Console日志
4. 查看服务器终端输出

---

**祝誓师大会顺利！** 🎉
