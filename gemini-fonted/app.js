// SUNNY Digital Swarm
// Built with PixiJS + GSAP
// 2026

console.clear();

/**
 * 核心配置
 */
const CONFIG = {
    totalParticles: 100, // 与下载的图片数量一致
    text: "SUNNY",
    fontFamily: "Times New Roman", // 经典且有衬线，更具设计感
    fontSize: 240,
    fontWeight: "900",
    api: "http://localhost:3000/api/images", // Node Backend
    colors: [0xffd700, 0xffa500, 0xff8c00, 0xfffacd], // Sunny Gold Palette
    particleSize: 32, // 初始大小
    particleScale: 0.15, // 图片缩放比例
    swaySpeed: 0.002, // 漂浮速度
    swayRange: 20, // 漂浮范围
};

/**
 * 应用主类
 */
class SunnySwarm {
    constructor() {
        this.app = null;
        this.particles = [];
        this.targetPoints = [];
        this.isLoading = true;
        this.isConverged = false;
        
        this.loader = {
            loadedCount: 0,
            total: CONFIG.totalParticles,
            images: []
        };

        this.init();
    }

    async init() {
        // 1. 初始化 Pixi 应用
        // Pixi v7+ 推荐写法
        this.app = new PIXI.Application({
            backgroundColor: 0x0f0f13, // 使用十六进制数值更安全
            resizeTo: window,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        document.getElementById('app-container').appendChild(this.app.view);

        // 2. 添加交互监听
        this.app.view.addEventListener('click', () => this.toggleState());
        window.addEventListener('resize', () => this.handleResize());
        
        // 3. 开始加载流程
        await this.loadImages();
    }

    /**
     * 加载图片资源
     */
    async loadImages() {
        try {
            // 请求后端获取图片列表
            const response = await fetch(CONFIG.api);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const imageUrls = data.images.slice(0, CONFIG.totalParticles); // 确保只取前100张

            this.loader.total = imageUrls.length;
            this.targetPoints = []; // Reset points
            
            // 逐个加载纹理
            // 使用 Promise.allSettled 确保部分失败不影响整体
            const promises = imageUrls.map((imgData, index) => {
                 return PIXI.Assets.load(imgData.url)
                    .then(texture => {
                        this.loader.loadedCount++;
                        this.updateProgress();
                        this.spawnParticle(texture, index);
                        return texture;
                    })
                    .catch(err => {
                        console.warn(`Failed to load image ${imgData.id}`, err);
                        // 即使失败也增加计数，并在最后检查是否需要降级
                        this.loader.loadedCount++;
                        this.updateProgress();
                        // 返回一个占位符纹理
                        return this.createPlaceholderTexture();
                    });
            });

            const results = await Promise.allSettled(promises);
            
            // 检查是否有加载成功的，如果没有则启用降级
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value instanceof PIXI.Texture).length;
            
            if (successCount === 0) {
                 console.warn("No images loaded successfully, using fallback.");
                 this.generateFallbackParticles();
            } else {
                 setTimeout(() => this.onAllLoaded(), 500);
            }

        } catch (error) {
            console.error("Backend offline or error:", error);
            // 降级方案：生成占位色块
            this.generateFallbackParticles();
        }
    }

    createPlaceholderTexture() {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFD700);
        graphics.drawCircle(0, 0, 16);
        graphics.endFill();
        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * 更新加载进度条
     */
    updateProgress() {
        const percent = (this.loader.loadedCount / this.loader.total) * 100;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${percent}%`;
    }

    /**
     * 生成单个粒子 (Sprite)
     */
    spawnParticle(texture, index) {
        const sprite = new PIXI.Sprite(texture);
        
        // 设置初始属性
        sprite.anchor.set(0.5);
        
        // 计算合适的缩放比例 (基于原图大小 200x200)
        // 目标是让粒子看起来约 30-40px 大小
        const scale = 40 / texture.width; 
        sprite.scale.set(0); // 初始大小为0，通过动画弹出

        // 随机初始位置 (全屏散布)
        sprite.x = Math.random() * this.app.screen.width;
        sprite.y = Math.random() * this.app.screen.height;

        // 随机旋转
        sprite.rotation = Math.random() * Math.PI * 2;

        // 添加自定义属性用于动画
        sprite.userData = {
            id: index,
            originX: sprite.x,
            originY: sprite.y,
            vx: (Math.random() - 0.5) * 2, // 漂浮速度 X
            vy: (Math.random() - 0.5) * 2, // 漂浮速度 Y
            phase: Math.random() * Math.PI * 2, // 波动相位
            rotSpeed: (Math.random() - 0.5) * 0.02 // 自转速度
        };

        // 存入容器
        this.app.stage.addChild(sprite);
        this.particles.push(sprite);

        // 入场动画 (Pop in)
        gsap.to(sprite.scale, {
            x: scale,
            y: scale,
            duration: 0.6,
            ease: "back.out(1.7)",
            delay: Math.random() * 0.5 // 错峰出现
        });

        // 立即开始漂浮
        // 注意：这里不使用 Ticker 绑定每个粒子，而是统一在主循环更新，性能更好
    }

    /**
     * 降级方案：无后端或图片加载失败时
     */
    generateFallbackParticles() {
        // 创建一个简单的圆形纹理
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFD700);
        graphics.drawCircle(0, 0, 20);
        graphics.endFill();
        const texture = this.app.renderer.generateTexture(graphics);

        for (let i = 0; i < CONFIG.totalParticles; i++) {
            this.spawnParticle(texture, i);
        }
        
        this.onAllLoaded();
    }

    /**
     * 所有资源加载完毕
     */
    onAllLoaded() {
        this.isLoading = false;
        
        // 隐藏加载层
        gsap.to("#loader", { opacity: 0, duration: 0.8, onComplete: () => {
            document.getElementById('loader').style.display = 'none';
        }});
        
        // 显示提示
        document.getElementById('controls').classList.add('visible');

        // 计算文字目标点
        this.calculateTextTargets();

        // 启动主循环 (用于处理 Chaos 阶段的物理运动)
        this.app.ticker.add((delta) => this.update(delta));

        // 自动进入汇聚阶段 (延迟2秒)
        setTimeout(() => {
            this.converge();
        }, 2000);
    }

    /**
     * 计算文字形状的目标点
     */
    calculateTextTargets() {
        if (!this.app || !this.app.screen || this.app.screen.width === 0) {
            console.warn("Screen dimensions not ready for text sampling");
            return;
        }

        const width = this.app.screen.width;
        const height = this.app.screen.height;

        console.log(`Sampling text targets on ${width}x${height} canvas...`);

        // 创建离屏 Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;

        // 绘制文字 - 使用更安全的系统字体确保立即可用
        // 增大字体大小以确保有足够的像素点
        const safeFontSize = Math.min(width * 0.25, 300); 
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${CONFIG.fontWeight} ${safeFontSize}px Arial, sans-serif`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CONFIG.text, width / 2, height / 2);

        // 获取像素数据
        const imageData = ctx.getImageData(0, 0, width, height).data;
        const potentialPoints = [];

        // 扫描像素 (步长为4以提高性能)
        for (let y = 0; y < height; y += 6) { // 稍微增加步长，减少计算量
            for (let x = 0; x < width; x += 6) {
                const alpha = imageData[(y * width + x) * 4 + 3];
                if (alpha > 128) {
                    potentialPoints.push({ x, y });
                }
            }
        }

        console.log(`Found ${potentialPoints.length} potential points for text.`);

        // 随机选取 N 个点作为目标，确保数量匹配粒子数
        this.targetPoints = [];
        if (potentialPoints.length > 0) {
            // 打乱数组
            for (let i = potentialPoints.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [potentialPoints[i], potentialPoints[j]] = [potentialPoints[j], potentialPoints[i]];
            }
            
            // 取前 N 个
            for (let i = 0; i < this.particles.length; i++) {
                // 必须深拷贝点对象，否则引用可能会出问题
                const pt = potentialPoints[i % potentialPoints.length];
                this.targetPoints.push({ x: pt.x, y: pt.y });
            }
        } else {
            console.error("Failed to sample any text points! Font might not be rendered.");
            // 降级：如果找不到点，让它们汇聚到屏幕中心
            const cx = width / 2;
            const cy = height / 2;
            for (let i = 0; i < this.particles.length; i++) {
                this.targetPoints.push({ 
                    x: cx + (Math.random() - 0.5) * 200, 
                    y: cy + (Math.random() - 0.5) * 100 
                });
            }
        }
    }

    /**
     * 每一帧的更新逻辑
     */
    update(delta) {
        // 如果已经汇聚，停止物理模拟，节省性能
        // 或者只保留微弱的震动
        if (this.isConverged) {
             this.particles.forEach(p => {
                 // 汇聚后添加微弱的呼吸感
                 p.rotation += 0.001 * delta;
             });
             return; 
        }

        // 混沌阶段：布朗运动 + 边界反弹
        this.particles.forEach(p => {
            p.x += p.userData.vx * delta;
            p.y += p.userData.vy * delta;
            p.rotation += p.userData.rotSpeed * delta;

            // 边界检测
            if (p.x < 0 || p.x > this.app.screen.width) p.userData.vx *= -1;
            if (p.y < 0 || p.y > this.app.screen.height) p.userData.vy *= -1;
        });
    }

    /**
     * 触发汇聚动画 (核心逻辑)
     */
    converge() {
        if (this.isConverged) return;
        
        // 安全检查：如果目标点还没算好，重新算一次
        if (!this.targetPoints || this.targetPoints.length === 0) {
            console.log("Targets not ready, recalculating...");
            this.calculateTextTargets();
        }

        if (this.targetPoints.length === 0) {
            console.warn("Aborting converge: No target points found.");
            return;
        }

        this.isConverged = true;
        console.log("Swarm converging to", this.targetPoints.length, "points...");

        // 使用 GSAP 接管位置控制
        this.particles.forEach((p, i) => {
            const target = this.targetPoints[i];
            if (!target) return;

            // 计算目标缩放
            const targetScale = (40 / p.texture.width) * 0.8;

            // 1. 飞向目标
            gsap.to(p, {
                x: target.x,
                y: target.y,
                rotation: 0, 
                duration: 1.5 + Math.random(), 
                ease: "power3.inOut",
                delay: Math.random() * 0.3,
            });

            // 修正：分开动画 scale.x 和 scale.y
            gsap.to(p.scale, {
                x: targetScale,
                y: targetScale,
                duration: 1.5 + Math.random(),
                ease: "power3.inOut",
                delay: Math.random() * 0.3,
            });

            // 2. 颜色滤镜
            p.tint = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        });
        
        // 更新 UI
        const ctrl = document.getElementById('controls');
        if (ctrl) ctrl.innerText = "CLICK TO DISPERSE";
    }

    /**
     * 触发散开动画
     */
    disperse() {
        if (!this.isConverged) return;
        this.isConverged = false;

        console.log("Swarm dispersing...");

        this.particles.forEach(p => {
            const targetX = Math.random() * this.app.screen.width;
            const targetY = Math.random() * this.app.screen.height;
            const originalScale = 40 / p.texture.width;

            gsap.to(p, {
                x: targetX,
                y: targetY,
                rotation: Math.random() * Math.PI * 2,
                duration: 1.2,
                ease: "expo.out",
                onComplete: () => {
                    p.userData.vx = (Math.random() - 0.5) * 2;
                    p.userData.vy = (Math.random() - 0.5) * 2;
                }
            });

            // 修正：分开动画 scale.x 和 scale.y
            gsap.to(p.scale, {
                x: originalScale,
                y: originalScale,
                duration: 1.2,
                ease: "expo.out",
            });
            
            p.tint = 0xFFFFFF;
        });
        
        const ctrl = document.getElementById('controls');
        if (ctrl) ctrl.innerText = "CLICK TO CONVERGE";
    }

    /**
     * 状态切换
     */
    toggleState() {
        if (this.isLoading) return;
        
        if (this.isConverged) {
            this.disperse();
        } else {
            this.converge();
        }
    }

    /**
     * 窗口大小调整
     */
    handleResize() {
        if (!this.app || !this.app.screen) return;

        // 重新计算文字目标点
        this.calculateTextTargets();
        
        // 如果当前是汇聚状态，需要更新粒子位置
        if (this.isConverged) {
            this.particles.forEach((p, i) => {
                const target = this.targetPoints[i];
                if (target) {
                    gsap.to(p, {
                        x: target.x,
                        y: target.y,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
            });
        }
    }

    /**
     * 创建简单的占位纹理
     */
    createPlaceholderTexture() {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFD700);
        graphics.drawCircle(0, 0, 16);
        graphics.endFill();
        return this.app.renderer.generateTexture(graphics);
    }
}

// 启动应用
window.onload = () => {
    // 确保 PIXI 和 GSAP 已加载
    if (typeof PIXI === 'undefined' || typeof gsap === 'undefined') {
        console.error('Dependencies not loaded. Retrying in 100ms...');
        setTimeout(window.onload, 100);
        return;
    }
    new SunnySwarm();
};