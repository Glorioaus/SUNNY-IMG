/**
 * SUNNY Digital Swarm - "Signature Wall" Version
 * 誓师大会实时签名墙
 * Built with PixiJS + GSAP
 * 2026
 */

console.clear();

/**
 * 核心配置
 */
const CONFIG = {
    totalEmployees: 300,      // 员工总数
    dustCount: 1500,          // 金色尘埃数量
    text: "SUNNY",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 280,            // 1920x1080固定尺寸
    fontWeight: "900",
    
    // 图片路径配置
    imagesFolder: "./imgs/",  // 本地图片文件夹
    imageExtension: ".jpg",   // 图片扩展名
    
    // 签名事件接口（支持多种方式）
    signatureAPI: {
        mode: "websocket",    // 可选: "websocket" | "polling" | "mock"
        websocketUrl: "ws://localhost:3000/signatures",
        pollingUrl: "http://localhost:3000/api/signatures",
        pollingInterval: 1000, // 轮询间隔(ms)
        mockDelay: 2000       // mock模式下的签名间隔
    },
    
    colors: {
        gold: 0xFFD700,
        white: 0xFFFFFF,
        accent: 0xFFA500,
        dust: [0xFFD700, 0xFFA500, 0xFF8C00],
        highlight: 0xFFFF00,  // 签名高亮色
        signed: 0x00FF00      // 已签名标记色
    },
    
    particleSize: 32,        // 头像基础尺寸
    dustSize: 1.5,
    flowSpeed: 0.06,
    noiseScale: 0.004,
    
    // 动画时长配置
    animation: {
        signatureHighlight: 0.8,  // 签名放大时长
        flyToPosition: 2.0,       // 飞向目标时长
        queueDelay: 150          // 签名队列处理间隔
    }
};

/**
 * 简易噪声函数
 */
const Noise = {
    perlin2(x, y) {
        return (Math.sin(x * 1.5) + Math.sin(y * 1.5) + Math.sin(x + y)) / 3;
    }
};

/**
 * 签名事件监听器
 */
class SignatureListener {
    constructor(onSignature) {
        this.onSignature = onSignature;
        this.mode = CONFIG.signatureAPI.mode;
        this.connection = null;
        this.pollingTimer = null;
        this.lastSignatureId = 0;
        
        this.init();
    }
    
    init() {
        console.log(`[SignatureListener] 初始化模式: ${this.mode}`);
        
        switch (this.mode) {
            case "websocket":
                this.initWebSocket();
                break;
            case "polling":
                this.initPolling();
                break;
            case "mock":
                this.initMock();
                break;
            default:
                console.warn("未知的签名监听模式，使用mock");
                this.initMock();
        }
    }
    
    initWebSocket() {
        try {
            this.connection = new WebSocket(CONFIG.signatureAPI.websocketUrl);
            
            this.connection.onopen = () => {
                console.log("[WebSocket] 连接成功");
                this.updateStatus("已连接签名服务器");
            };
            
            this.connection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.employeeId) {
                        console.log(`[WebSocket] 收到签名: ${data.employeeId}`);
                        this.onSignature(data.employeeId, data.timestamp);
                    }
                } catch (error) {
                    console.error("[WebSocket] 解析消息失败:", error);
                }
            };
            
            this.connection.onerror = (error) => {
                console.error("[WebSocket] 连接错误:", error);
                this.updateStatus("签名服务器连接失败，切换到Mock模式");
                this.mode = "mock";
                this.initMock();
            };
            
            this.connection.onclose = () => {
                console.log("[WebSocket] 连接关闭");
                this.updateStatus("签名服务器断开");
            };
        } catch (error) {
            console.error("[WebSocket] 初始化失败:", error);
            this.mode = "mock";
            this.initMock();
        }
    }
    
    initPolling() {
        console.log("[Polling] 启动轮询");
        this.updateStatus("轮询模式");
        
        this.pollingTimer = setInterval(async () => {
            try {
                const response = await fetch(
                    `${CONFIG.signatureAPI.pollingUrl}?since=${this.lastSignatureId}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.signatures && data.signatures.length > 0) {
                        data.signatures.forEach(sig => {
                            this.onSignature(sig.employeeId, sig.timestamp);
                            this.lastSignatureId = Math.max(this.lastSignatureId, sig.id);
                        });
                    }
                }
            } catch (error) {
                console.error("[Polling] 请求失败:", error);
            }
        }, CONFIG.signatureAPI.pollingInterval);
    }
    
    initMock() {
        console.log("[Mock] 启动模拟签名模式");
        this.updateStatus("演示模式 - 自动签名");
        
        // 生成300个工号的模拟列表
        const employeeIds = Array.from(
            { length: CONFIG.totalEmployees }, 
            (_, i) => `${105001 + i}`
        );
        
        // 随机打乱顺序
        for (let i = employeeIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [employeeIds[i], employeeIds[j]] = [employeeIds[j], employeeIds[i]];
        }
        
        let index = 0;
        const mockInterval = setInterval(() => {
            if (index >= employeeIds.length) {
                clearInterval(mockInterval);
                console.log("[Mock] 所有员工已签名");
                return;
            }
            
            this.onSignature(employeeIds[index], Date.now());
            index++;
        }, CONFIG.signatureAPI.mockDelay);
    }
    
    updateStatus(message) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }
    
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }
    }
}

/**
 * 主应用类
 */
class SignatureWall {
    constructor() {
        this.app = null;
        
        // 员工数据
        this.employees = [];           // 员工列表
        this.particleMap = new Map();  // employeeId -> particle对象
        this.positionMap = new Map();  // employeeId -> {x, y}坐标
        this.signedSet = new Set();    // 已签名员工ID集合
        this.signatureQueue = [];      // 签名动画队列
        
        // 粒子系统
        this.particles = [];           // 所有头像粒子
        this.dust = [];               // 尘埃粒子
        this.targetPoints = [];       // SUNNY文字采样点
        
        // 状态
        this.isProcessingSignature = false;
        this.isAllSigned = false;
        this.loadedCount = 0;
        
        // 交互
        this.mouse = { x: 0, y: 0, active: false };
        
        this.init();
    }
    
    /**
     * 初始化应用
     */
    async init() {
        // 创建PixiJS应用
        this.app = new PIXI.Application({
            backgroundAlpha: 0,
            width: 1920,
            height: 1080,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        
        document.getElementById('app-container').appendChild(this.app.view);
        
        // 交互监听
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
        });
        
        // 等待字体加载
        await document.fonts.ready;
        
        // 初始化流程
        this.calculateTextTargets();
        this.generateEmployeeList();
        await this.loadAllAvatars();
        this.assignPositions();
        this.generateDust();
        
        // 启动签名监听
        this.signatureListener = new SignatureListener(
            (employeeId, timestamp) => this.onSignatureReceived(employeeId, timestamp)
        );
        
        // 启动主循环
        this.app.ticker.add((delta) => this.update(delta));
        
        console.log("[SignatureWall] 初始化完成");
    }
    
    /**
     * 生成员工列表 (105001-105300)
     */
    generateEmployeeList() {
        for (let i = 0; i < CONFIG.totalEmployees; i++) {
            const employeeId = `${105001 + i}`;
            this.employees.push({
                id: employeeId,
                imagePath: `${CONFIG.imagesFolder}${employeeId}${CONFIG.imageExtension}`,
                signed: false,
                signedAt: null
            });
        }
        console.log(`[EmployeeList] 生成${this.employees.length}个员工`);
    }
    
    /**
     * 批量加载所有头像
     */
    async loadAllAvatars() {
        console.log("[LoadAvatars] 开始加载头像...");
        
        const loadPromises = this.employees.map((employee, index) => {
            return this.loadSingleAvatar(employee, index);
        });
        
        await Promise.all(loadPromises);
        
        console.log(`[LoadAvatars] 加载完成: ${this.loadedCount}/${CONFIG.totalEmployees}`);
        this.onAllLoaded();
    }
    
    /**
     * 加载单个头像
     */
    async loadSingleAvatar(employee, index) {
        try {
            const texture = await PIXI.Assets.load(employee.imagePath);
            this.spawnAvatar(texture, employee.id, index);
            this.loadedCount++;
            this.updateProgress();
        } catch (error) {
            console.warn(`[LoadAvatar] 加载失败: ${employee.id}`, error);
            // 使用占位符
            const placeholderTexture = this.createPlaceholderTexture(employee.id);
            this.spawnAvatar(placeholderTexture, employee.id, index);
            this.loadedCount++;
            this.updateProgress();
        }
    }
    
    /**
     * 创建头像粒子
     */
    spawnAvatar(texture, employeeId, index) {
        const container = new PIXI.Container();
        
        // 1. 创建头像Sprite
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        
        const baseScale = CONFIG.particleSize / texture.width;
        const randomScale = baseScale * (0.85 + Math.random() * 0.3);
        sprite.scale.set(randomScale);
        
        // 2. 圆形遮罩
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawCircle(0, 0, (texture.width * randomScale) / 2);
        mask.endFill();
        container.addChild(mask);
        sprite.mask = mask;
        
        // 3. 边框（初始为普通金色）
        const border = new PIXI.Graphics();
        border.lineStyle(1, CONFIG.colors.gold, 0.6);
        border.drawCircle(0, 0, (texture.width * randomScale) / 2);
        container.addChild(sprite);
        container.addChild(border);
        
        // 初始随机位置
        container.x = Math.random() * 1920;
        container.y = Math.random() * 1080;
        container.alpha = 0.4 + Math.random() * 0.3;
        
        // 用户数据
        container.userData = {
            employeeId: employeeId,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            noiseOffset: Math.random() * 1000,
            index: index,
            type: 'avatar',
            baseScale: randomScale,
            signed: false,
            border: border,  // 保存边框引用以便后续修改
            sprite: sprite
        };
        
        this.app.stage.addChild(container);
        this.particles.push(container);
        this.particleMap.set(employeeId, container);
        
        // 飞入动画
        gsap.from(container, {
            x: -100 + Math.random() * 200,
            y: -100 + Math.random() * 200,
            alpha: 0,
            duration: 1.5,
            ease: "power2.out",
            delay: (index / CONFIG.totalEmployees) * 2
        });
    }
    
    /**
     * 生成金色尘埃
     */
    generateDust() {
        for (let i = 0; i < CONFIG.dustCount; i++) {
            const dust = new PIXI.Graphics();
            const color = CONFIG.colors.dust[Math.floor(Math.random() * CONFIG.colors.dust.length)];
            dust.beginFill(color, 0.4);
            dust.drawCircle(0, 0, Math.random() * 2 + 0.5);
            dust.endFill();
            
            dust.x = Math.random() * 1920;
            dust.y = Math.random() * 1080;
            dust.alpha = 0;
            
            dust.userData = {
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                noiseOffset: Math.random() * 1000,
                type: 'dust'
            };
            
            this.app.stage.addChild(dust);
            this.dust.push(dust);
            
            gsap.to(dust, { alpha: 0.6, duration: 2, delay: Math.random() * 3 });
        }
    }
    
    /**
     * 采样SUNNY文字坐标
     */
    calculateTextTargets() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1920;
        canvas.height = 1080;
        
        ctx.fillStyle = 'white';
        ctx.font = `${CONFIG.fontWeight} ${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CONFIG.text, 960, 540);
        
        const data = ctx.getImageData(0, 0, 1920, 1080).data;
        const points = [];
        
        const step = 3;
        for (let y = 0; y < 1080; y += step) {
            for (let x = 0; x < 1920; x += step) {
                if (data[(y * 1920 + x) * 4 + 3] > 128) {
                    points.push({ x, y });
                }
            }
        }
        
        // 随机打乱
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }
        
        this.targetPoints = points;
        console.log(`[TextTargets] 采样到${points.length}个坐标点`);
    }
    
    /**
     * 为每个员工分配SUNNY上的位置
     */
    assignPositions() {
        this.employees.forEach((employee, index) => {
            const targetPos = this.targetPoints[index % this.targetPoints.length];
            this.positionMap.set(employee.id, targetPos);
        });
        console.log(`[AssignPositions] 已为${this.employees.length}个员工分配坐标`);
    }
    
    /**
     * 收到签名事件
     */
    onSignatureReceived(employeeId, timestamp) {
        // 防止重复签名
        if (this.signedSet.has(employeeId)) {
            console.warn(`[Signature] 重复签名: ${employeeId}`);
            return;
        }
        
        // 检查员工是否存在
        if (!this.particleMap.has(employeeId)) {
            console.warn(`[Signature] 未找到员工: ${employeeId}`);
            return;
        }
        
        console.log(`[Signature] ✓ ${employeeId} 已签名`);
        
        // 加入队列
        this.signatureQueue.push({
            employeeId,
            timestamp: timestamp || Date.now()
        });
        
        // 标记已签名
        this.signedSet.add(employeeId);
        
        // 更新进度
        this.updateSignatureProgress();
        
        // 处理队列
        this.processSignatureQueue();
    }
    
    /**
     * 处理签名队列（带延迟以避免动画重叠）
     */
    processSignatureQueue() {
        if (this.isProcessingSignature || this.signatureQueue.length === 0) {
            return;
        }
        
        this.isProcessingSignature = true;
        const { employeeId } = this.signatureQueue.shift();
        
        this.animateSignature(employeeId, () => {
            this.isProcessingSignature = false;
            
            // 继续处理下一个
            if (this.signatureQueue.length > 0) {
                setTimeout(() => this.processSignatureQueue(), CONFIG.animation.queueDelay);
            }
            
            // 检查是否全部完成
            if (this.signedSet.size === CONFIG.totalEmployees) {
                this.onAllSignaturesComplete();
            }
        });
    }
    
    /**
     * 签名动画：放大 -> 飞向目标位置
     */
    animateSignature(employeeId, onComplete) {
        const particle = this.particleMap.get(employeeId);
        const targetPos = this.positionMap.get(employeeId);
        
        if (!particle || !targetPos) {
            onComplete();
            return;
        }
        
        particle.userData.signed = true;
        
        // 1. 高亮放大效果
        const timeline = gsap.timeline({
            onComplete: onComplete
        });
        
        // 边框变色加粗
        particle.userData.border.clear();
        particle.userData.border.lineStyle(3, CONFIG.colors.highlight, 1);
        particle.userData.border.drawCircle(0, 0, (particle.userData.sprite.width) / 2);
        
        timeline
            // 阶段1: 放大高亮
            .to(particle.scale, {
                x: particle.userData.baseScale * 1.8,
                y: particle.userData.baseScale * 1.8,
                duration: CONFIG.animation.signatureHighlight,
                ease: "back.out(2)"
            })
            .to(particle, {
                alpha: 1,
                duration: CONFIG.animation.signatureHighlight * 0.5
            }, "<")
            
            // 阶段2: 飞向目标位置
            .to(particle, {
                x: targetPos.x,
                y: targetPos.y,
                duration: CONFIG.animation.flyToPosition,
                ease: "power2.inOut"
            }, "+=0.2")
            .to(particle.scale, {
                x: particle.userData.baseScale * 0.9,
                y: particle.userData.baseScale * 0.9,
                duration: CONFIG.animation.flyToPosition,
                ease: "power2.inOut"
            }, "<")
            
            // 阶段3: 落位后边框变为已签名样式
            .call(() => {
                particle.userData.border.clear();
                particle.userData.border.lineStyle(2, CONFIG.colors.signed, 0.9);
                particle.userData.border.drawCircle(0, 0, (particle.userData.sprite.width) / 2);
                
                // 停止流场影响
                particle.userData.vx = 0;
                particle.userData.vy = 0;
            });
    }
    
    /**
     * 每帧更新（仅对未签名的粒子应用流场）
     */
    update(delta) {
        if (this.isAllSigned) return;
        
        const time = Date.now() * 0.001;
        
        // 只对未签名的粒子应用流场
        this.particles.forEach(p => {
            if (p.userData.signed) return;
            
            const ud = p.userData;
            const angle = Noise.perlin2(
                p.x * CONFIG.noiseScale, 
                p.y * CONFIG.noiseScale + time
            ) * Math.PI * 4;
            
            const fx = Math.cos(angle) * CONFIG.flowSpeed;
            const fy = Math.sin(angle) * CONFIG.flowSpeed;
            
            ud.vx += fx;
            ud.vy += fy;
            ud.vx *= 0.98;
            ud.vy *= 0.98;
            
            p.x += ud.vx * delta;
            p.y += ud.vy * delta;
            
            // 边界
            if (p.x < 0 || p.x > 1920) ud.vx *= -1;
            if (p.y < 0 || p.y > 1080) ud.vy *= -1;
            
            // 鼠标避让
            if (this.mouse.active) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const force = (120 - dist) / 120;
                    ud.vx += (dx / dist) * force * 3;
                    ud.vy += (dy / dist) * force * 3;
                }
            }
        });
        
        // 尘埃始终流动
        this.dust.forEach(d => {
            const ud = d.userData;
            const angle = Noise.perlin2(
                d.x * CONFIG.noiseScale * 0.5, 
                d.y * CONFIG.noiseScale * 0.5 + time
            ) * Math.PI * 2;
            
            ud.vx += Math.cos(angle) * 0.03;
            ud.vy += Math.sin(angle) * 0.03;
            ud.vx *= 0.95;
            ud.vy *= 0.95;
            
            d.x += ud.vx;
            d.y += ud.vy;
            
            if (d.x < 0 || d.x > 1920) ud.vx *= -1;
            if (d.y < 0 || d.y > 1080) ud.vy *= -1;
        });
    }
    
    /**
     * 所有签名完成
     */
    onAllSignaturesComplete() {
        this.isAllSigned = true;
        console.log("[SignatureWall] 🎉 所有员工已签名！");
        
        // 显示完成提示
        const completeEl = document.getElementById('complete-message');
        if (completeEl) {
            completeEl.style.display = 'block';
            gsap.from(completeEl, {
                scale: 0.5,
                opacity: 0,
                duration: 1,
                ease: "back.out(2)"
            });
        }
        
        // 所有已签名粒子的边框闪烁
        this.particles.forEach(p => {
            if (p.userData.signed) {
                gsap.to(p.userData.border, {
                    alpha: 0.3,
                    duration: 0.5,
                    repeat: 3,
                    yoyo: true
                });
            }
        });
        
        // 尘埃汇聚
        this.dust.forEach((d, i) => {
            const target = this.targetPoints[(CONFIG.totalEmployees + i) % this.targetPoints.length];
            gsap.to(d, {
                x: target.x,
                y: target.y,
                alpha: 0.8,
                duration: 3,
                ease: "power2.inOut",
                delay: Math.random() * 2
            });
        });
    }
    
    /**
     * 更新加载进度
     */
    updateProgress() {
        const percent = (this.loadedCount / CONFIG.totalEmployees) * 100;
        const fill = document.getElementById('progress-fill');
        if (fill) {
            fill.style.width = `${percent}%`;
        }
        
        const text = document.getElementById('loader-text');
        if (text) {
            text.textContent = `加载中 ${this.loadedCount}/${CONFIG.totalEmployees}`;
        }
    }
    
    /**
     * 更新签名进度
     */
    updateSignatureProgress() {
        const signedCount = this.signedSet.size;
        const percent = (signedCount / CONFIG.totalEmployees) * 100;
        
        const progressEl = document.getElementById('signature-progress');
        if (progressEl) {
            progressEl.textContent = `已签名: ${signedCount}/${CONFIG.totalEmployees}`;
        }
        
        const barEl = document.getElementById('signature-fill');
        if (barEl) {
            barEl.style.width = `${percent}%`;
        }
    }
    
    /**
     * 所有头像加载完成
     */
    onAllLoaded() {
        console.log("[SignatureWall] 所有头像加载完成");
        
        gsap.to("#loader", {
            opacity: 0,
            duration: 1,
            delay: 1,
            onComplete: () => {
                document.getElementById('loader').style.display = 'none';
            }
        });
        
        // 显示签名进度条
        const progressContainer = document.getElementById('signature-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'flex';
            gsap.from(progressContainer, {
                opacity: 0,
                y: -20,
                duration: 1,
                delay: 1.5
            });
        }
    }
    
    /**
     * 创建占位符纹理
     */
    createPlaceholderTexture(employeeId) {
        const g = new PIXI.Graphics();
        g.beginFill(CONFIG.colors.gold);
        g.drawCircle(25, 25, 25);
        g.endFill();
        
        // 添加文字
        const text = new PIXI.Text(employeeId.slice(-3), {
            fontSize: 12,
            fill: 0x000000,
            fontWeight: 'bold'
        });
        text.anchor.set(0.5);
        text.x = 25;
        text.y = 25;
        g.addChild(text);
        
        return this.app.renderer.generateTexture(g);
    }
    
    /**
     * 销毁
     */
    destroy() {
        if (this.signatureListener) {
            this.signatureListener.disconnect();
        }
        if (this.app) {
            this.app.destroy(true);
        }
    }
}

// 启动应用
window.onload = () => {
    window.signatureWall = new SignatureWall();
};
