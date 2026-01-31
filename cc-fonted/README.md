# SUNNY 誓师大会签名墙 v2.0

一个基于 PixiJS 和 GSAP 的高性能签名墙演示项目，专为誓师大会场景设计。

## 功能特性

### 核心功能
- **粒子系统**: 1000个粒子组成的动态效果
- **图片循环**: 300张图片循环使用，视觉效果饱满
- **签名交互**: 实时响应签名，头像放大动画
- **汇聚动画**: 全部签名完成后组成"SUNNY"字样
- **进度显示**: 实时显示签名完成进度

### 视觉效果
- **混沌运动**: 初始状态下粒子无规则运动
- **签名动画**: 签名时头像放大并高亮
- **文字汇聚**: 粒子按顺序组成文字
- **视觉变化**: 相同图片添加细微变化（旋转、缩放、颜色）
- **动态景深**: 粒子具有不同的透明度和缩放比例

### 技术亮点
- **高性能**: PixiJS 渲染引擎，支持1000个粒子流畅运行
- **内存优化**: 纹理复用技术，减少内存占用
- **实时响应**: 签名瞬间即时反馈
- **容错机制**: 处理图片加载失败等异常情况

## 项目结构

```
cc-fonted/
├── index.html          # 主页面
├── app.js             # 核心逻辑
├── README.md          # 项目说明
└── ghImg/             # 图片资源目录
    └── *.jpg          # 工号命名的图片
```

## 快速开始

### 环境要求
- 现代浏览器（支持 ES6+）
- 1080×1920 分辨率屏幕
- 本地服务器（推荐使用 npx serve）

### 启动步骤

1. **准备图片资源**:
   ```
   将工号命名的图片放入 ghImg/ 目录
   图片命名格式: 100001.jpg, 100002.jpg, ...
   ```

2. **启动本地服务器**:
   ```bash
   npx serve
   ```

3. **访问页面**:
   ```
   在浏览器中访问 http://localhost:3000
   ```

4. **进行签名**:
   ```
   在输入框中输入工号，点击"签名"按钮
   或按 Enter 键提交
   ```

## 配置说明

### 核心配置

```javascript
const CONFIG = {
    totalParticles: 1000,    // 总粒子数量
    uniqueImages: 300,       // 唯一图片数量
    text: "SUNNY",          // 最终组成的文字
    fontSize: 280,          // 字体大小
    particleSize: 28,       // 粒子大小
    flowSpeed: 0.06,        // 流动速度
    noiseScale: 0.004       // 噪声缩放
};
```

### 可配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| totalParticles | 总粒子数量 | 1000 |
| uniqueImages | 唯一图片数量 | 300 |
| text | 最终组成的文字 | "SUNNY" |
| fontSize | 字体大小 | 280 |
| particleSize | 粒子大小 | 28 |
| flowSpeed | 流动速度 | 0.06 |
| noiseScale | 噪声缩放 | 0.004 |

## 技术架构

### 核心技术栈

- **PixiJS v7.3.2**: 高性能2D渲染引擎
- **GSAP v3.12.2**: 专业级动画库
- **纯JavaScript**: 无框架依赖，轻量级

### 核心模块

#### 1. 粒子系统
- **图片加载**: 批量加载工号命名的图片
- **粒子生成**: 300张图片生成1000个粒子
- **视觉变化**: 相同图片添加细微变化
- **混沌运动**: 基于噪声的自然流动效果

#### 2. 签名交互系统
- **工号识别**: 通过工号定位对应的图片
- **实时响应**: 签名瞬间头像放大动画
- **状态管理**: 记录每个工号的签名状态
- **进度显示**: 实时更新签名进度

#### 3. 动画系统
- **入场动画**: 粒子从透明到显示的过渡
- **签名动画**: 头像放大并高亮
- **汇聚动画**: 粒子按顺序组成文字
- **视觉特效**: 闪光、渐变等增强视觉效果

## 自定义指南

### 修改最终文字

```javascript
// 在 app.js 中修改 CONFIG.text
const CONFIG = {
    text: "YOUR_TEXT",  // 修改为你需要的文字
    fontSize: 280,      // 调整字体大小
    // ... 其他配置
};
```

### 调整粒子数量

```javascript
// 在 app.js 中修改 CONFIG.totalParticles
const CONFIG = {
    totalParticles: 1500,  // 增加粒子数量
    uniqueImages: 300,     // 保持图片数量不变
    // ... 其他配置
};
```

### 修改图片命名规则

```javascript
// 在 app.js 中修改 getImageList 方法
async getImageList() {
    const imageList = [];
    for (let i = 1; i <= CONFIG.uniqueImages; i++) {
        // 修改为你的图片命名规则
        const id = `EMP${i}`;  // 例如: EMP1, EMP2, ...
        imageList.push({
            id: id,
            url: `ghImg/${id}.jpg`
        });
    }
    return imageList;
}
```

## 性能优化

### 性能指标
- **粒子数量**: 1000个粒子
- **帧率**: 约55-60FPS（高性能设备）
- **内存占用**: 约150-200MB
- **加载时间**: 约5-8秒（取决于网络速度）

### 优化建议

1. **减少粒子数量**:
   ```javascript
   totalParticles: 800  // 减少粒子数量提升性能
   ```

2. **降低分辨率**:
   ```javascript
   // 在 init 方法中修改 resolution
   this.app = new PIXI.Application({
       resolution: 1,  // 降低分辨率
       // ... 其他配置
   });
   ```

3. **图片优化**:
   - 压缩图片大小（推荐使用 WebP 格式）
   - 统一图片尺寸
   - 减少图片数量

## 故障排除

### 常见问题

#### 1. 图片加载失败
- **检查图片路径**: 确保图片放在 ghImg/ 目录
- **检查图片命名**: 确保图片命名与代码中的规则一致
- **检查网络连接**: 确保本地服务器正常运行

#### 2. 签名无响应
- **检查工号输入**: 确保输入的工号存在
- **检查图片命名**: 确保图片命名与工号一致
- **检查浏览器控制台**: 查看是否有错误信息

#### 3. 性能问题
- **关闭其他标签页**: 释放系统资源
- **降低粒子数量**: 修改 totalParticles 配置
- **使用高性能设备**: 推荐使用现代浏览器和高性能设备

## 扩展功能

### 集成签名设备

```javascript
// 在 app.js 中添加签名设备监听
function initSignatureDevice() {
    // 这里添加签名设备的初始化代码
    // 例如: 监听串口数据、WebSocket 等
}

// 在 handleSignature 方法中处理设备输入
async handleSignature(employeeId) {
    // 处理签名逻辑
}
```

### 添加音效

```javascript
// 在签名时播放音效
function playSignatureSound() {
    const audio = new Audio('signature-sound.mp3');
    audio.play();
}

// 在 triggerSignatureAnimation 方法中调用
this.triggerSignatureAnimation = function(particles, employeeId) {
    playSignatureSound();
    // ... 其他动画逻辑
};
```

### 数据统计

```javascript
// 添加数据统计功能
function collectStatistics() {
    const stats = {
        totalSigned: this.signatureStatus.signedCount,
        totalUnique: this.signatureStatus.totalUnique,
        completionRate: (this.signatureStatus.signedCount / this.signatureStatus.totalUnique) * 100,
        timestamp: Date.now()
    };
    
    // 发送到服务器
    fetch('/api/statistics', {
        method: 'POST',
        body: JSON.stringify(stats),
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
```

## 版权说明

本项目仅供内部演示使用，未经授权不得用于商业用途。

## 更新日志

### v2.0 (2026-01-30)
- 全新架构设计
- 支持图片循环使用
- 优化签名交互体验
- 增强视觉效果
- 性能优化

### v1.0 (2026-01-29)
- 初始版本
- 基本粒子系统
- 简单签名交互
- 基础汇聚动画

## 联系方式

如有问题或建议，请联系技术支持团队。