/**
 * SUNNY Digital Swarm - "Solar Birth" Version
 * Built with PixiJS + GSAP
 * 2026
 */

console.clear();

/**
 * 核心配置
 */
const CONFIG = {
    totalParticles: 1000, // 目标头像总数
    dustCount: 2000,      // 金色尘埃数量
    text: "SUNNY",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 240,       // 稍微增大字体以容纳更多粒子
    fontWeight: "900",
    api: "http://localhost:3000/api/images",
    colors: {
        gold: 0xFFD700,
        white: 0xFFFFFF,
        accent: 0xFFA500,
        dust: [0xFFD700, 0xFFA500, 0xFF8C00]
    },
    particleSize: 28,   // 缩小尺寸，1000个粒子需要更细腻
    dustSize: 1.5,
    flowSpeed: 0.08,    // 规模大时，稍微加快流动速度更壮观
    noiseScale: 0.004
};

/**
 * 简易噪声函数实现 (避免引入额外库)
 */
const Noise = {
    perlin2(x, y) {
        return (Math.sin(x) + Math.sin(y) + Math.sin(x + y)) / 3;
    }
};

/**
 * 应用主类
 */
class SunnySwarm {
    /**
     * @constructor
     * 初始化应用状态
     */
    constructor() {
        this.app = null;
        this.particles = [];    // 存储头像粒子
        this.dust = [];         // 存储尘埃粒子
        this.targetPoints = []; // 文字采样点 (头像)
        this.dustTargets = [];  // 文字采样点 (尘埃)
        this.isConverged = false;
        this.isLoaded = false;
        
        this.loader = {
            loadedCount: 0,
            total: CONFIG.totalParticles
        };

        this.mouse = { x: 0, y: 0, active: false };

        this.init();
    }

    /**
     * 初始化 PixiJS 和基本事件
     */
    async init() {
        this.app = new PIXI.Application({
            backgroundAlpha: 0, // 背景透明，使用 CSS 背景
            resizeTo: window,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        document.getElementById('app-container').appendChild(this.app.view);

        // 交互监听
        this.app.view.addEventListener('click', () => this.toggleState());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
        });
        window.addEventListener('resize', () => this.handleResize());

        // 开始加载流程
        await document.fonts.ready; // 确保字体加载完成
        this.calculateTextTargets();
        await this.loadImages();
        
        // 启动主循环
        this.app.ticker.add((delta) => this.update(delta));
    }

    /**
     * 顺序加载图片并触发“一图多发”的飞入动画
     */
    async loadImages() {
        try {
            const response = await fetch(CONFIG.api);
            if (!response.ok) throw new Error('API offline');
            const data = await response.json();
            const sourceImages = data.images;
            const uniqueCount = sourceImages.length;
            
            // 计算每个纹理需要生成多少个粒子
            const particlesPerTexture = Math.ceil(CONFIG.totalParticles / uniqueCount);

            // 逐个加载原始纹理
            for (let i = 0; i < uniqueCount; i++) {
                const imgData = sourceImages[i];
                PIXI.Assets.load(imgData.url).then(texture => {
                    // 每加载一个母版，生成多个粒子
                    for (let j = 0; j < particlesPerTexture; j++) {
                        if (this.particles.length < CONFIG.totalParticles) {
                            this.spawnAvatar(texture, this.particles.length);
                        }
                    }
                    this.loader.loadedCount++;
                    this.updateProgress(uniqueCount);
                    
                    if (this.loader.loadedCount === uniqueCount) {
                        this.onAllLoaded();
                    }
                }).catch(() => {
                    this.loader.loadedCount++;
                    this.updateProgress(uniqueCount);
                });
                
                // 稍微错峰，保持流星感
                await new Promise(r => setTimeout(r, 50));
            }

            // 生成辅助尘埃粒子
            this.generateDust();

        } catch (error) {
            console.error("Backend Error, using fallback:", error);
            this.generateFallback();
        }
    }

    /**
     * 更新加载进度条 (基于母版图片数量)
     */
    updateProgress(totalUnique) {
        const percent = (this.loader.loadedCount / totalUnique) * 100;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${percent}%`;
    }

    /**
     * 生成头像粒子 (带圆形遮罩、金边和深度感)
     */
    spawnAvatar(texture, index) {
        const container = new PIXI.Container();
        
        // 1. 创建头像 Sprite
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        
        // 引入随机尺寸和深度感
        const baseScale = CONFIG.particleSize / texture.width;
        const randomScale = baseScale * (0.8 + Math.random() * 0.4); 
        sprite.scale.set(randomScale);

        // 2. 创建圆形遮罩
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawCircle(0, 0, (texture.width * randomScale) / 2);
        mask.endFill();
        container.addChild(mask);
        sprite.mask = mask;

        // 3. 创建金色边框 (粗细随深度变化)
        const border = new PIXI.Graphics();
        const thickness = 1 + Math.random();
        border.lineStyle(thickness, CONFIG.colors.gold, 0.8);
        border.drawCircle(0, 0, (texture.width * randomScale) / 2);
        
        container.addChild(sprite);
        container.addChild(border);

        // 初始位置：屏幕边缘
        const side = Math.floor(Math.random() * 4);
        let startX, startY;
        const offset = 100;
        if (side === 0) { startX = -offset; startY = Math.random() * window.innerHeight; }
        else if (side === 1) { startX = window.innerWidth + offset; startY = Math.random() * window.innerHeight; }
        else if (side === 2) { startX = Math.random() * window.innerWidth; startY = -offset; }
        else { startX = Math.random() * window.innerWidth; startY = window.innerHeight + offset; }

        container.x = startX;
        container.y = startY;
        container.alpha = 0;

        // 增加色彩分级 (微弱的金色/橙色调)
        if (Math.random() > 0.7) {
            container.tint = CONFIG.colors.dust[Math.floor(Math.random() * CONFIG.colors.dust.length)];
        }

        container.userData = {
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            noiseOffset: Math.random() * 1000,
            index: index,
            type: 'avatar',
            baseScale: randomScale,
            depth: Math.random() // 用于后续可能的层级效果
        };

        this.app.stage.addChild(container);
        this.particles.push(container);

        // 飞入动画 (错峰更明显)
        gsap.to(container, {
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 600,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 400,
            alpha: 0.4 + Math.random() * 0.6,
            duration: 1.5 + Math.random(),
            ease: "expo.out",
            delay: Math.random() * 0.5
        });
    }

    /**
     * 生成金色尘埃粒子
     */
    generateDust() {
        for (let i = 0; i < CONFIG.dustCount; i++) {
            const dust = new PIXI.Graphics();
            const color = CONFIG.colors.dust[Math.floor(Math.random() * CONFIG.colors.dust.length)];
            dust.beginFill(color, 0.6);
            dust.drawCircle(0, 0, Math.random() * 2 + 1);
            dust.endFill();

            dust.x = Math.random() * window.innerWidth;
            dust.y = Math.random() * window.innerHeight;
            dust.alpha = 0;

            dust.userData = {
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                noiseOffset: Math.random() * 1000,
                type: 'dust'
            };

            this.app.stage.addChild(dust);
            this.dust.push(dust);

            gsap.to(dust, { alpha: 1, duration: 2, delay: Math.random() * 2 });
        }
    }

    /**
     * 采样文字坐标点
     */
    calculateTextTargets() {
        const w = window.innerWidth || 1920;
        const h = window.innerHeight || 1080;
        
        if (w === 0 || h === 0) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;

        ctx.fillStyle = 'white';
        ctx.font = `900 ${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CONFIG.text, w / 2, h / 2);

        const data = ctx.getImageData(0, 0, w, h).data;
        const points = [];

        // 密集采样 (步长减小以增加精度)
        const step = 4;
        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                if (data[(y * w + x) * 4 + 3] > 128) {
                    points.push({ x, y });
                }
            }
        }

        // 随机打乱
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }

        // 分配目标点 (使用模运算循环取点，确保 1000 个粒子都有位置)
        this.targetPoints = [];
        for (let i = 0; i < CONFIG.totalParticles; i++) {
            this.targetPoints.push(points[i % points.length]);
        }

        this.dustTargets = [];
        for (let i = 0; i < CONFIG.dustCount; i++) {
            this.dustTargets.push(points[(i + CONFIG.totalParticles) % points.length]);
        }
    }

    /**
     * 每一帧的更新逻辑 (流场模拟)
     */
    update(delta) {
        if (this.isConverged) return;

        const time = Date.now() * 0.001;
        const allParticles = [...this.particles, ...this.dust];

        allParticles.forEach(p => {
            const ud = p.userData;
            
            // 流场受噪声影响
            const angle = Noise.perlin2(p.x * CONFIG.noiseScale, p.y * CONFIG.noiseScale + time) * Math.PI * 4;
            const fx = Math.cos(angle) * CONFIG.flowSpeed;
            const fy = Math.sin(angle) * CONFIG.flowSpeed;

            ud.vx += fx;
            ud.vy += fy;

            // 摩擦力
            ud.vx *= 0.98;
            ud.vy *= 0.98;

            p.x += ud.vx * delta;
            p.y += ud.vy * delta;

            // 边界反弹
            if (p.x < 0 || p.x > window.innerWidth) ud.vx *= -1;
            if (p.y < 0 || p.y > window.innerHeight) ud.vy *= -1;

            // 鼠标互动：避让
            if (this.mouse.active) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const force = (150 - dist) / 150;
                    ud.vx += (dx / dist) * force * 2;
                    ud.vy += (dy / dist) * force * 2;
                }
            }
        });
    }

    /**
     * 触发汇聚动画
     */
    converge() {
        if (this.isConverged) return;
        this.isConverged = true;

        // 头像汇聚 (使用更快的缓动和 Stagger)
        this.particles.forEach((p, i) => {
            const target = this.targetPoints[i];
            gsap.to(p, {
                x: target.x,
                y: target.y,
                alpha: 1,
                duration: 2,
                ease: "power4.inOut",
                delay: (i / CONFIG.totalParticles) * 0.5 // 按照索引顺序丝滑飞入
            });
            // 汇聚时稍微缩小，增加精致感
            gsap.to(p.scale, { 
                x: p.userData.baseScale * 0.85, 
                y: p.userData.baseScale * 0.85, 
                duration: 2 
            });
        });

        // 尘埃汇聚
        this.dust.forEach((p, i) => {
            const target = this.dustTargets[i];
            gsap.to(p, {
                x: target.x,
                y: target.y,
                alpha: 0.6,
                duration: 2.5,
                ease: "power3.inOut",
                delay: Math.random() * 1
            });
        });

        // 隐藏加载进度
        gsap.to("#loader", { opacity: 0, duration: 1 });
        document.getElementById('controls').innerText = "CLICK TO DISPERSE";
    }

    /**
     * 触发散开动画
     */
    disperse() {
        if (!this.isConverged) return;
        this.isConverged = false;

        const allParticles = [...this.particles, ...this.dust];
        allParticles.forEach((p, i) => {
            const targetX = Math.random() * window.innerWidth;
            const targetY = Math.random() * window.innerHeight;
            
            gsap.to(p, {
                x: targetX,
                y: targetY,
                alpha: p.userData.type === 'avatar' ? 0.8 : 0.4,
                duration: 1.5,
                ease: "expo.out",
                delay: (i / allParticles.length) * 0.2,
                onComplete: () => {
                    p.userData.vx = (Math.random() - 0.5) * 8;
                    p.userData.vy = (Math.random() - 0.5) * 8;
                }
            });

            if (p.userData.type === 'avatar') {
                gsap.to(p.scale, { x: p.userData.baseScale, y: p.userData.baseScale, duration: 1 });
            }
        });

        gsap.to("#loader", { opacity: 1, duration: 1 });
        document.getElementById('controls').innerText = "CLICK TO CONVERGE";
    }

    toggleState() {
        if (this.isConverged) this.disperse();
        else this.converge();
    }

    onAllLoaded() {
        this.isLoaded = true;
        // 显示提示
        document.getElementById('controls').classList.add('visible');
        // 自动汇聚
        setTimeout(() => this.converge(), 1000);
    }

    /**
     * 降级方案：无后端或图片加载失败时
     */
    generateFallback() {
        const texture = this.createPlaceholderTexture();
        for (let i = 0; i < CONFIG.totalParticles; i++) {
            this.spawnAvatar(texture, i);
        }
        this.onAllLoaded();
    }

    handleResize() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.calculateTextTargets();
        if (this.isConverged) {
            this.isConverged = false;
            this.converge();
        }
    }

    createPlaceholderTexture() {
        const g = new PIXI.Graphics();
        g.beginFill(CONFIG.colors.gold);
        g.drawCircle(0, 0, 50);
        g.endFill();
        return this.app.renderer.generateTexture(g);
    }
}

// 启动
window.onload = () => {
    new SunnySwarm();
};
