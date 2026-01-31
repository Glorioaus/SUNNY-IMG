/**
 * SUNNY 誓师大会签名墙 v2.0
 * 核心逻辑实现
 */

console.clear();

/**
 * 核心配置
 */
const CONFIG = {
    totalParticles: 1000,    // 总粒子数量
    uniqueImages: 100,       // 唯一图片数量
    text: "SUNNY",          // 最终组成的文字
    fontFamily: "Montserrat, sans-serif",
    fontSize: 280,          // 字体大小
    fontWeight: "900",
    particleSize: 28,       // 粒子大小
    colors: {
        gold: 0xFFD700,
        white: 0xFFFFFF,
        accent: 0xFFA500,
        dust: [0xFFD700, 0xFFA500, 0xFF8C00]
    },
    flowSpeed: 0.06,        // 流动速度
    noiseScale: 0.004       // 噪声缩放
};

/**
 * 简易噪声函数实现
 */
const Noise = {
    perlin2(x, y) {
        return (Math.sin(x) + Math.sin(y) + Math.sin(x + y)) / 3;
    }
};

/**
 * 签名墙主类
 */
class SignatureWall {
    constructor() {
        this.app = null;
        this.particles = [];    // 粒子数组
        this.targetPoints = []; // 文字目标点
        this.isConverged = false;
        this.isLoaded = false;
        
        // 签名状态管理
        this.signatureStatus = {
            signedIds: new Set(),  // 已签名的工号
            totalUnique: CONFIG.uniqueImages,
            signedCount: 0
        };

        // 工号到粒子的映射
        this.idToParticles = new Map();
        
        this.mouse = { x: 0, y: 0, active: false };

        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        // 初始化 PixiJS
        this.app = new PIXI.Application({
            backgroundAlpha: 0,
            resizeTo: window,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        document.getElementById('app-container').appendChild(this.app.view);

        // 初始化交互
        this.initInteractions();

        // 加载图片并创建粒子
        await this.loadImages();
        
        // 计算文字目标点
        this.calculateTextTargets();

        // 启动主循环
        this.app.ticker.add((delta) => this.update(delta));
    }

    /**
     * 初始化交互事件
     */
    initInteractions() {
        // 签名按钮事件
        const btn = document.getElementById('signature-btn');
        const input = document.getElementById('signature-input');
        
        btn.addEventListener('click', () => this.handleSignature());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSignature();
            }
        });

        // 鼠标事件
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
        });
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * 加载图片并创建粒子
     */
    async loadImages() {
        try {
            // 获取图片列表
            const imageList = await this.getImageList();
            const uniqueCount = Math.min(imageList.length, CONFIG.uniqueImages);
            
            this.signatureStatus.totalUnique = uniqueCount;
            
            // 计算每个图片需要生成的粒子数量
            const particlesPerImage = Math.ceil(CONFIG.totalParticles / uniqueCount);

            // 加载图片并创建粒子
            for (let i = 0; i < uniqueCount; i++) {
                const imgData = imageList[i];
                const texture = await PIXI.Assets.load(imgData.url);
                
                // 为每个图片创建多个粒子
                for (let j = 0; j < particlesPerImage; j++) {
                    if (this.particles.length < CONFIG.totalParticles) {
                        this.createParticle(texture, imgData.id, i);
                    }
                }
                
                // 更新进度
                this.updateProgress();
            }

            this.isLoaded = true;
            this.updateStatus('加载完成，等待签名...');
            
        } catch (error) {
            console.error("图片加载失败:", error);
            this.updateStatus('图片加载失败');
        }
    }

    /**
     * 获取图片列表
     */
    async getImageList() {
        // 这里可以替换为API调用
        // 现在我们直接从ghImg目录加载
        const imageList = [];
        
        // 假设图片命名格式为 100001.jpg, 100002.jpg...
        // 实际应用中应该通过API获取
        for (let i = 1; i <= CONFIG.uniqueImages; i++) {
            // 这里需要根据实际图片命名规则调整
            // 暂时使用简单的命名规则
            const id = `10000${i}`;
            imageList.push({
                id: id,
                url: `ghImg/${id}.jpg`
            });
        }
        
        return imageList;
    }

    /**
     * 创建单个粒子
     */
    createParticle(texture, employeeId, imageIndex) {
        const container = new PIXI.Container();
        
        // 创建头像 Sprite
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        
        // 添加随机变化
        const randomScale = 0.8 + Math.random() * 0.4;
        const baseScale = (CONFIG.particleSize / texture.width) * randomScale;
        sprite.scale.set(baseScale);
        
        // 随机旋转
        sprite.rotation = (Math.random() - 0.5) * 0.2;

        // 创建圆形遮罩
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawCircle(0, 0, (texture.width * baseScale) / 2);
        mask.endFill();
        container.addChild(mask);
        sprite.mask = mask;

        // 创建金色边框
        const border = new PIXI.Graphics();
        const borderThickness = 1 + Math.random();
        border.lineStyle(borderThickness, CONFIG.colors.gold, 0.7);
        border.drawCircle(0, 0, (texture.width * baseScale) / 2);
        container.addChild(border);

        container.addChild(sprite);

        // 随机初始位置
        container.x = Math.random() * window.innerWidth;
        container.y = Math.random() * window.innerHeight;
        container.alpha = 0;

        // 添加随机色彩变化
        if (Math.random() > 0.7) {
            const colorVariation = CONFIG.colors.dust[Math.floor(Math.random() * CONFIG.colors.dust.length)];
            container.tint = colorVariation;
        }

        // 存储粒子数据
        container.userData = {
            id: employeeId,
            imageIndex: imageIndex,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            noiseOffset: Math.random() * 1000,
            baseScale: baseScale,
            isSigned: false,
            rotationSpeed: (Math.random() - 0.5) * 0.01
        };

        // 添加到粒子数组
        this.app.stage.addChild(container);
        this.particles.push(container);

        // 添加到工号映射
        if (!this.idToParticles.has(employeeId)) {
            this.idToParticles.set(employeeId, []);
        }
        this.idToParticles.get(employeeId).push(container);

        // 入场动画
        gsap.to(container, {
            alpha: 0.6 + Math.random() * 0.4,
            duration: 1.5 + Math.random(),
            ease: "expo.out"
        });
    }

    /**
     * 处理签名
     */
    handleSignature() {
        const input = document.getElementById('signature-input');
        const employeeId = input.value.trim();
        
        if (!employeeId) {
            this.updateStatus('请输入工号');
            return;
        }

        // 检查是否已签名
        if (this.signatureStatus.signedIds.has(employeeId)) {
            this.updateStatus(`工号 ${employeeId} 已签名`);
            input.value = '';
            return;
        }

        // 查找对应的粒子
        const particles = this.idToParticles.get(employeeId);
        
        if (!particles || particles.length === 0) {
            this.updateStatus(`工号 ${employeeId} 不存在`);
            return;
        }

        // 标记为已签名
        this.signatureStatus.signedIds.add(employeeId);
        this.signatureStatus.signedCount = this.signatureStatus.signedIds.size;
        
        // 更新UI
        input.value = '';
        this.updateProgress();
        this.updateStatus(`工号 ${employeeId} 签名成功！`);

        // 触发签名动画
        this.triggerSignatureAnimation(particles, employeeId);

        // 检查是否全部签名完成
        if (this.signatureStatus.signedCount >= this.signatureStatus.totalUnique) {
            setTimeout(() => this.convergeToText(), 2000);
        }
    }

    /**
     * 触发签名动画
     */
    triggerSignatureAnimation(particles, employeeId) {
        // 主粒子放大动画
        const mainParticle = particles[0];
        
        gsap.to(mainParticle.scale, {
            x: mainParticle.userData.baseScale * 1.5,
            y: mainParticle.userData.baseScale * 1.5,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        });

        gsap.to(mainParticle, {
            alpha: 1,
            duration: 0.5
        });

        // 其他粒子轻微放大
        particles.slice(1).forEach((particle, index) => {
            gsap.to(particle.scale, {
                x: particle.userData.baseScale * 1.2,
                y: particle.userData.baseScale * 1.2,
                duration: 0.6,
                delay: index * 0.1,
                ease: "power2.out"
            });
        });

        // 标记为已签名
        particles.forEach(particle => {
            particle.userData.isSigned = true;
        });
    }

    /**
     * 汇聚成文字
     */
    convergeToText() {
        if (this.isConverged) return;
        this.isConverged = true;

        this.updateStatus('全部签名完成，正在组成SUNNY...');

        // 粒子汇聚动画
        this.particles.forEach((particle, index) => {
            const target = this.targetPoints[index % this.targetPoints.length];
            
            gsap.to(particle, {
                x: target.x,
                y: target.y,
                alpha: 1,
                duration: 2.5,
                ease: "power4.inOut",
                delay: (index / CONFIG.totalParticles) * 0.8
            });

            gsap.to(particle.scale, {
                x: particle.userData.baseScale * 0.9,
                y: particle.userData.baseScale * 0.9,
                duration: 2.5,
                ease: "power4.inOut",
                delay: (index / CONFIG.totalParticles) * 0.8
            });
        });

        // 完成后的状态
        setTimeout(() => {
            this.updateStatus('签名完成！SUNNY');
        }, 3000);
    }

    /**
     * 计算文字目标点
     */
    calculateTextTargets() {
        const w = window.innerWidth || 1080;
        const h = window.innerHeight || 1920;
        
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

        // 采样文字点
        const step = 4;
        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                if (data[(y * w + x) * 4 + 3] > 128) {
                    points.push({ x, y });
                }
            }
        }

        // 打乱点顺序
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }

        this.targetPoints = points;
    }

    /**
     * 更新粒子状态
     */
    update(delta) {
        if (this.isConverged) return;

        const time = Date.now() * 0.001;

        this.particles.forEach(particle => {
            const ud = particle.userData;

            // 噪声流动
            const angle = Noise.perlin2(
                particle.x * CONFIG.noiseScale,
                particle.y * CONFIG.noiseScale + time
            ) * Math.PI * 4;
            
            const fx = Math.cos(angle) * CONFIG.flowSpeed;
            const fy = Math.sin(angle) * CONFIG.flowSpeed;

            ud.vx += fx;
            ud.vy += fy;

            // 摩擦力
            ud.vx *= 0.98;
            ud.vy *= 0.98;

            // 更新位置
            particle.x += ud.vx * delta;
            particle.y += ud.vy * delta;
            particle.rotation += ud.rotationSpeed * delta;

            // 边界反弹
            if (particle.x < 0 || particle.x > window.innerWidth) ud.vx *= -1;
            if (particle.y < 0 || particle.y > window.innerHeight) ud.vy *= -1;

            // 鼠标交互
            if (this.mouse.active) {
                const dx = particle.x - this.mouse.x;
                const dy = particle.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    ud.vx += (dx / dist) * force * 2;
                    ud.vy += (dy / dist) * force * 2;
                }
            }

            // 已签名粒子的特殊效果
            if (ud.isSigned) {
                const pulse = Math.sin(time * 2 + ud.noiseOffset) * 0.1 + 1;
                particle.scale.x = ud.baseScale * 1.2 * pulse;
                particle.scale.y = ud.baseScale * 1.2 * pulse;
            }
        });
    }

    /**
     * 更新进度显示
     */
    updateProgress() {
        const percent = (this.signatureStatus.signedCount / this.signatureStatus.totalUnique) * 100;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${percent}%`;
    }

    /**
     * 更新状态显示
     */
    updateStatus(message) {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.textContent = message;
        }
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        if (!this.app) return;
        
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.calculateTextTargets();
    }
}

// 启动应用
window.onload = () => {
    new SignatureWall();
};