# SUNNY 粒子汇聚展示

## 项目概述

这是一个使用HTML、CSS和JavaScript实现的粒子汇聚效果展示页面。页面会从后端加载图片，并将图片以粒子形式随机运动，最终汇聚成"SUNNY"字样。

## 功能特性

1. **粒子波动运动**：每个图片粒子会以波动方式随机运动
2. **汇聚效果**：所有粒子最终汇聚成"SUNNY"字样
3. **交互控制**：支持重置、打乱、暂停/继续等控制功能
4. **响应式设计**：适配不同屏幕尺寸
5. **性能优化**：使用requestAnimationFrame进行高效动画渲染
6. **错误处理**：后端服务不可用时使用备用图片

## 技术架构

### 前端技术栈
- HTML5：页面结构
- CSS3：样式设计与动画效果
- Vanilla JavaScript：粒子系统与交互逻辑

### 后端接口
- GET /api/images：获取图片列表
  返回格式：
  ```json
  {
    "count": 100,
    "images": [
      {
        "id": "1.jpg",
        "url": "http://localhost:3000/images/1.jpg"
      },
      ...
    ]
  }
  ```

## 快速开始

### 1. 启动后端服务

```bash
cd backend
npm install
node server.js
```

后端服务将在 http://localhost:3000 启动

### 2. 启动前端服务

```bash
cd cc-fonted
python -m http.server 8099
```

前端服务将在 http://localhost:8099 启动

### 3. 访问页面

在浏览器中打开 http://localhost:8099

## 控制功能

### 控制面板
- **Reset Animation**：重置动画，粒子回到初始位置并重新汇聚
- **Shuffle Particles**：打乱粒子，使其随机分布
- **Pause/Resume**：暂停或继续粒子运动

### 粒子交互
- 点击任意粒子：使其产生随机加速度
- 悬停在粒子上：粒子放大并显示3D旋转效果

## 配置选项

在`index.html`的`CONFIG`对象中可以调整以下参数：

```javascript
const CONFIG = {
    backendUrl: 'http://localhost:3000',  // 后端服务地址
    particleSize: 20,                    // 粒子大小（像素）
    moveSpeed: 0.5,                      // 移动速度
    waveIntensity: 20,                   // 波动强度
    waveFrequency: 0.02,                 // 波动频率
    trailOpacity: 0.5                    // 轨迹透明度
};
```

## 目录结构

```
cc-fonted/
├── index.html      # 主页面文件
└── README.md       # 说明文档

backend/
├── server.js       # 后端服务
├── public/
│   └── images/     # 图片存放目录
└── package.json    # 后端依赖配置
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 性能优化建议

1. **图片数量**：建议不超过100张图片，以保证流畅的动画效果
2. **图片尺寸**：图片大小不超过200x200像素，减少加载时间
3. **浏览器设置**：关闭不必要的扩展程序以提高渲染性能
4. **硬件加速**：确保浏览器启用了GPU硬件加速

## 故障排除

### 常见问题

1. **后端服务连接失败**
   - 检查后端服务是否正确启动
   - 确认防火墙设置允许端口3000通信
   - 验证`backendUrl`配置是否正确

2. **图片加载缓慢**
   - 检查网络连接
   - 优化图片大小和格式
   - 考虑使用CDN加速

3. **动画卡顿**
   - 减少粒子数量
   - 关闭浏览器的开发者工具
   - 升级浏览器到最新版本

## 扩展功能建议

1. **添加音乐效果**：在粒子汇聚过程中添加背景音乐
2. **自定义文字**：允许用户输入自定义文字进行展示
3. **颜色主题**：提供不同的颜色主题切换
4. **3D效果**：使用Three.js实现3D粒子效果
5. **社交分享**：添加分享功能到社交媒体

## 版权说明

图片资源来源于Unsplash（备用模式），请勿用于商业用途。

## 联系方式

如有问题或建议，请通过GitHub Issues反馈。
