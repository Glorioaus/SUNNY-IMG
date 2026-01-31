/**
 * SUNNY Signature Wall
 * 誓师大会签名墙 - 修复版
 * 2026-01-31
 *
 * 设计思路：头像 + 粒子作为一个整体，共同组成 Logo 和 SUNNY 字样。
 * 粒子的作用是填补头像数量不足带来的密度空缺。
 *
 * 阶段流程:
 *   INTRO_TO_LOGO  →  头像+粒子一起从屏幕外飞入，组成 Logo
 *   FREE_FLOAT     →  头像+粒子在流场中漂流，签名事件逐个触发
 *   CONVERGE_TO_SUNNY → 头像+粒子一起飞向 SUNNY 字样位置
 */

console.clear();

const CONFIG = {
    totalEmployees: 300,

    sunnyText: "SUNNY",
    introLogoPath: "/logo.png",
    fontFamily: "Montserrat, sans-serif",
    fontWeight: "900",
    noiseScale: 0.0018,
    flowStrength: 0.06,
    flowTimeScale: 0.25,
    flowEps: 0.015,
    flowJitter: 0.01,
    flowFriction: 0.985,
    flowMaxSpeed: 1.6,
    flowWrapMargin: 60,
    imagesFolder: "/imgs/",
    imageExtension: ".jpg",

    // 头像尺寸。300个头像 + 2500个粒子 共同填充图案。
    // 头像 22px，粒子半径 3px，这样粒子能填进头像间隙而不会把头像盖住。
    avatarSize: 22,
    dustCount: 2500,

    colors: {
        gold:      0xFFD700,
        highlight: 0x00BFFF,
        signed:    0x00BFFF,
    },

    scheduler: {
        maxConcurrent:     20,
        highlightDuration: 0.8,
    },

    api: {
        socket:    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/signatures`,
        employees: "/api/employees"
    }
};

// ─── 简易噪声 ───────────────────────────────
const Noise = {
    perlin2(x, y) {
        return (Math.sin(x) + Math.sin(y) + Math.sin(x + y)) / 3;
    }
};

// ─── 签名队列调度 ─────────────────────────────
class SignatureScheduler {
    constructor(wall) {
        this.wall = wall;
        this.queue = [];
        this.processing = new Set();
        this.isConverging = false;
    }

    push(employeeId) {
        if (this.isConverging) return;
        if (this.processing.has(employeeId)) return;
        if (this.wall.signedIds.has(employeeId)) return;
        this.queue.push(employeeId);
        this.process();
    }

    process() {
        if (this.wall.phase !== 'FREE_FLOAT') return;
        if (this.queue.length === 0) return;
        if (this.processing.size >= CONFIG.scheduler.maxConcurrent) return;

        const id = this.queue.shift();
        this.processing.add(id);

        const rushMode = this.queue.length > 5;
        const duration = rushMode ? 0.3 : CONFIG.scheduler.highlightDuration;

        this.wall.animateSignature(id, duration, () => {
            this.processing.delete(id);
            this.process();
        });
        this.process(); // 尽量填满并发槽
    }
}

// ─── 签名墙主类 ────────────────────────────────
class SignatureWall {
    constructor() {
        this.app = null;
        this.scheduler = new SignatureScheduler(this);
        this.employees = [];

        this.particles     = new Map();   // id → Graphics（头像）
        this.dustParticles = [];          // Sprite[]（粒子）

        // 目标坐标 — Logo 和 SUNNY 各一组，头像和粒子各自的
        this.logoAvatarTargets = [];
        this.logoDustTargets   = [];
        this.sunnyAvatarTargets = [];
        this.sunnyDustTargets   = [];

        this.resizeTimer = null;
        this.phase       = 'INTRO_TO_LOGO';
        this.logoImage   = null;

        // intro 阶段用倒计数决定"全部到位后"何时切换状态
        this.introAvatarRemaining = 0;
        this.introDustRemaining   = 0;

        this.signedIds   = new Set();
        this.isConverged = false;

        this.layers = { dust: null, avatar: null, active: null };

        this.init();
    }

    // ─── 画头像圆 ─────────────────────────────
    redrawAvatarGraphic(g, borderStyle) {
        const ud      = g.userData;
        const size    = ud.targetSize;
        const texture = ud.texture;

        g.clear();

        const s      = size / texture.width;
        const matrix = new PIXI.Matrix();
        matrix.scale(s, s);
        matrix.translate(-size / 2, -size / 2);

        g.beginTextureFill({ texture, matrix });
        g.drawCircle(0, 0, size / 2);
        g.endFill();

        const bw = borderStyle?.width  ?? ud.border.width;
        const bc = borderStyle?.color  ?? ud.border.color;
        const ba = borderStyle?.alpha  ?? ud.border.alpha;
        g.lineStyle(bw, bc, ba);
        g.drawCircle(0, 0, size / 2);

        ud.border = { width: bw, color: bc, alpha: ba };
    }

    // ─── 初始化 ───────────────────────────────
    async init() {
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        this.app = new PIXI.Application({
            backgroundAlpha: 0,
            resizeTo: window,
            width:   window.innerWidth,
            height:  window.innerHeight,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        document.getElementById('app-container').appendChild(this.app.view);

        this.createLayers();
        this.initEvents();

        await document.fonts.ready;
        await this.loadEmployeeData();
        await this.loadLogoImage();

        // ★ 先算好全部目标坐标，再创建头像和粒子
        this.calculateCompositionTargets();

        await this.createAvatars();   // 头像飞入 Logo
        this.createDust();            // 粒子飞入 Logo

        this.connectSocket();
        this.app.ticker.add((delta) => this.update(delta));

        console.log("☀️ SUNNY Signature Wall Ready.");
    }

    async loadLogoImage() {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((res, rej) => {
                img.onload  = res;
                img.onerror = () => rej();
                img.src = CONFIG.introLogoPath;
            });
            this.logoImage = img;
        } catch {
            console.warn('[Logo] 加载失败，用文字替代');
            this.logoImage = null;
        }
    }

    async loadEmployeeData() {
        try {
            const res  = await fetch(CONFIG.api.employees);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data.employees) && data.employees.length > 0) {
                this.employees = data.employees;
                console.log(`[Data] ${this.employees.length} employees`);
            } else throw new Error("empty");
        } catch (e) {
            console.warn("[Data] 使用默认列表", e);
            this.employees = Array.from({ length: 300 }, (_, i) => `${105001 + i}`);
        }
    }

    // ─── 离屏 canvas 采样坐标 ────────────────────
    // draw(ctx, w, h) 负责绘图；step 是采样间隔（越小点越多）
    samplePoints(draw, step) {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const canvasW = 1200;
        const canvasH = Math.round(canvasW * (screenH / screenW));

        const canvas = document.createElement('canvas');
        canvas.width  = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        draw(ctx, canvasW, canvasH);

        const imgData = ctx.getImageData(0, 0, canvasW, canvasH).data;
        const sx = screenW / canvasW;
        const sy = screenH / canvasH;

        const s = Math.max(1, Math.round(step));
        const points = [];
        for (let y = 0; y < canvasH; y += s) {
            for (let x = 0; x < canvasW; x += s) {
                if (imgData[(y * canvasW + x) * 4 + 3] > 32) {
                    points.push({ x: x * sx, y: y * sy });
                }
            }
        }

        // shuffle — 让分配到每个 slot 的点均匀分散
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }
        return points;
    }

    // ─── 核心：目标坐标分配 ──────────────────────
    // 同一次采样出的点：前 avatarCount 个给头像，后面的给粒子。
    // 点不够时循环复用（加抖动避免重叠）。
    calculateCompositionTargets() {
        const ac = this.employees.length;  // avatar count
        const dc = CONFIG.dustCount;       // dust count
        const need = ac + dc;

        const logoRaw   = this.sampleLogoShape(need);
        const sunnyRaw  = this.sampleSunnyShape(need);

        this.logoAvatarTargets  = this.slice(logoRaw,  0,  ac);
        this.logoDustTargets    = this.slice(logoRaw,  ac, ac + dc);
        this.sunnyAvatarTargets = this.slice(sunnyRaw, 0,  ac);
        this.sunnyDustTargets   = this.slice(sunnyRaw, ac, ac + dc);

        console.log(`[Targets] logo采样=${logoRaw.length} sunny采样=${sunnyRaw.length} | 需要 avatar=${ac} dust=${dc}`);
    }

    // 切片 + 不够时循环填充
    slice(arr, start, end) {
        const out = arr.slice(start, end);
        const need = end - start;
        if (out.length === 0) return Array.from({ length: need }, () => ({
            x: window.innerWidth / 2, y: window.innerHeight / 2
        }));
        
        // 优化兜底：如果点不够，在整个范围内随机取点（插值），避免简单的原点偏移造成重影
        if (out.length < need) {
             // 计算包围盒
             let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
             out.forEach(p => {
                 if (p.x < minX) minX = p.x;
                 if (p.x > maxX) maxX = p.x;
                 if (p.y < minY) minY = p.y;
                 if (p.y > maxY) maxY = p.y;
             });
             const w = maxX - minX;
             const h = maxY - minY;

             while (out.length < need) {
                // 随机插值：取两个点中间的位置 + 扰动
                const p1 = out[Math.floor(Math.random() * out.length)];
                const p2 = out[Math.floor(Math.random() * out.length)];
                out.push({
                    x: (p1.x + p2.x) * 0.5 + (Math.random() - 0.5) * 5,
                    y: (p1.y + p2.y) * 0.5 + (Math.random() - 0.5) * 5
                });
             }
        }
        return out;
    }

    sampleLogoShape(need) {
        // step 选择：需要的点越多，step 越小
        // 1200×675 canvas，step=1 → 最多 ~81万点（远超需求）
        // step=2 → ~20万点，足够
        const step = 1;
        if (this.logoImage) {
            return this.samplePoints((ctx, w, h) => {
                ctx.clearRect(0, 0, w, h);
                const margin = 0.10;
                const maxW   = w * (1 - margin * 2);
                const maxH   = h * (1 - margin * 2);
                const img    = this.logoImage;
                const sc     = Math.min(maxW / img.width, maxH / img.height);
                ctx.drawImage(img,
                    (w - img.width * sc) / 2,
                    (h - img.height * sc) / 2,
                    img.width * sc, img.height * sc
                );
            }, step);
        }
        // 无 logo 图片时用文字
        return this.samplePoints((ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.font      = `${CONFIG.fontWeight} ${Math.min(w / 5, 300)}px ${CONFIG.fontFamily}`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOGO', w / 2, h / 2);
        }, step);
    }

    sampleSunnyShape(need) {
        return this.samplePoints((ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.font      = `${CONFIG.fontWeight} ${Math.min(w / 4.2, 380)}px ${CONFIG.fontFamily}`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(CONFIG.sunnyText, w / 2, h / 2);
        }, 1);
    }

    // ─── 层 ───────────────────────────────────
    createLayers() {
        this.layers.dust   = new PIXI.Container();
        this.layers.avatar = new PIXI.Container();
        this.layers.active = new PIXI.Container();
        this.app.stage.sortableChildren = true;
        this.layers.dust.zIndex   = 0;
        this.layers.avatar.zIndex = 1;
        this.layers.active.zIndex = 2;
        this.app.stage.addChild(this.layers.dust);
        this.app.stage.addChild(this.layers.avatar);
        this.app.stage.addChild(this.layers.active);
    }

    initEvents() {
        window.addEventListener('resize', (e) => {
            if (this.resizeTimer) clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.handleResize(), 200);
        });
    }

    // 屏幕外随机起始点
    _randomEdgePoint() {
        const w = window.innerWidth, h = window.innerHeight;
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(w, h) * (0.6 + Math.random() * 0.5);
        return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r };
    }

    // ─── 创建头像并飞入 Logo ────────────────────
    async createAvatars() {
        const total = this.employees.length;
        let nextIdx = 0;

        const worker = async () => {
            while (true) {
                const i = nextIdx++;
                if (i >= total) return;
                const id  = this.employees[i];
                let tex = null;
                try { tex = await PIXI.Assets.load(`${CONFIG.imagesFolder}${id}${CONFIG.imageExtension}`); } catch {}
                if (!tex) tex = this._makePlaceholder();

                const g     = new PIXI.Graphics();
                const start = this._randomEdgePoint();
                g.x = start.x; g.y = start.y;
                g.userData = {
                    id, index: i, state: 'INTRO',
                    vx: 0, vy: 0, baseScale: 1,
                    noiseOffset: Math.random() * 1000,
                    texture: tex,
                    targetSize: CONFIG.avatarSize,
                    border: { width: 2, color: CONFIG.colors.gold, alpha: 1 }
                };
                this.redrawAvatarGraphic(g);
                this.layers.avatar.addChild(g);
                this.particles.set(id, g);

                // 飞入 Logo 目标
                this.introAvatarRemaining++;
                this._flyAvatarToLogo(g, i);

                if (i % 50 === 0) console.log(`[Avatar] ${i + 1}/${total}`);
            }
        };
        await Promise.all(Array.from({ length: 10 }, () => worker()));
    }

    _flyAvatarToLogo(g, index) {
        const target = this.logoAvatarTargets[index];
        if (!target) { g.userData.state = 'IDLE'; this.introAvatarRemaining--; return; }

        const delay = index * 0.005;
        gsap.fromTo(g,      { alpha: 0 }, { alpha: 1, duration: 0.3, delay, ease: 'power2.out' });
        gsap.fromTo(g.scale, { x: 0.1, y: 0.1 }, { x: 1, y: 1, duration: 0.7, delay, ease: 'expo.out' });
        gsap.to(g, {
            x: target.x, y: target.y, duration: 1.7, delay, ease: 'expo.out',
            onComplete: () => {
                g.userData.state = 'IDLE';
                g.userData.vx = (Math.random() - 0.5) * 1.5;
                g.userData.vy = (Math.random() - 0.5) * 1.5;
                this.introAvatarRemaining--;
                this._tryFinishIntro();
            }
        });
    }

    // ─── 创建粒子并飞入 Logo ────────────────────
    createDust() {
        const count = CONFIG.dustCount;
        const container = new PIXI.ParticleContainer(count, { position: true, scale: true, alpha: true });
        this.layers.dust.addChild(container);

        // 粒子纹理（半径 3px 的金色圆）
        const g = new PIXI.Graphics();
        g.beginFill(0xFFD700, 1);
        g.drawCircle(3, 3, 3);
        g.endFill();
        const tex = this.app.renderer.generateTexture(g);

        for (let i = 0; i < count; i++) {
            const sp = new PIXI.Sprite(tex);
            sp.anchor.set(0.5);
            const start = this._randomEdgePoint();
            sp.x = start.x; sp.y = start.y;
            sp.userData = {
                vx: 0, vy: 0,
                noiseOffset: Math.random() * 1000
            };
            sp.alpha = 0.55 + Math.random() * 0.45;
            sp.scale.set(0.7 + Math.random() * 1.0);
            container.addChild(sp);
            this.dustParticles.push(sp);

            // 飞入 Logo 目标
            this.introDustRemaining++;
            this._flyDustToLogo(sp, i);
        }
    }

    _flyDustToLogo(sp, index) {
        const target = this.logoDustTargets[index];
        if (!target) { this.introDustRemaining--; return; }

        // 粒子比头像晚开始飞入，让头像先到位形成骨架，粒子再填充
        const delay = 1.6 + index * 0.0003;

        gsap.fromTo(sp, { alpha: 0 }, { alpha: 0.55 + Math.random() * 0.45, duration: 0.35, delay, ease: 'power2.out' });
        gsap.to(sp, {
            x: target.x, y: target.y, duration: 2.0, delay, ease: 'expo.out',
            onComplete: () => {
                sp.userData.vx = (Math.random() - 0.5) * 0.8;
                sp.userData.vy = (Math.random() - 0.5) * 0.8;
                this.introDustRemaining--;
                this._tryFinishIntro();
            }
        });
    }

    // 头像和粒子都到位后才切换
    _tryFinishIntro() {
        if (this.phase !== 'INTRO_TO_LOGO') return;
        if (this.introAvatarRemaining <= 0 && this.introDustRemaining <= 0) {
            gsap.delayedCall(0.7, () => {
                if (this.phase !== 'INTRO_TO_LOGO') return;
                console.log('[Phase] → EXPLODING');
                this.explodeToSpace();
            });
        }
    }

    // ─── 爆炸散开（星空效果） ──────────────────
    explodeToSpace() {
        this.phase = 'EXPLODING';
        
        const allParticles = [...this.particles.values(), ...this.dustParticles];
        let completedCount = 0;
        const total = allParticles.length;

        allParticles.forEach((p, i) => {
            // 随机全屏目标点
            const tx = Math.random() * window.innerWidth;
            const ty = Math.random() * window.innerHeight;

            gsap.to(p, {
                x: tx,
                y: ty,
                duration: 1.5 + Math.random() * 1.0, // 1.5~2.5s
                ease: "expo.out",
                delay: Math.random() * 0.3, // 稍微错开
                onComplete: () => {
                    // 恢复随机初速度，衔接流场
                    p.userData.vx = (Math.random() - 0.5) * 2;
                    p.userData.vy = (Math.random() - 0.5) * 2;
                    
                    completedCount++;
                    if (completedCount >= total) {
                        this.phase = 'FREE_FLOAT';
                        console.log('[Phase] → FREE_FLOAT');
                        this.scheduler.process();
                    }
                }
            });
        });
    }

    _makePlaceholder() {
        const g = new PIXI.Graphics();
        g.beginFill(CONFIG.colors.gold);
        g.drawCircle(50, 50, 50);
        g.endFill();
        return this.app.renderer.generateTexture(g);
    }

    // ─── 帧更新 ───────────────────────────────
    update(delta) {
        if (this.phase !== 'FREE_FLOAT') return;
        const time = Date.now() * 0.001;

        this.particles.forEach(p => {
            const s = p.userData.state;
            if (s === 'IDLE' || s === 'SIGNED') {
                this.applyFlowField(p, time, 1.0, delta);
            }
        });
        this.dustParticles.forEach(p => {
            this.applyFlowField(p, time, 0.5, delta);
        });
    }

    applyFlowField(p, time, speedMul, delta) {
        const ud = p.userData;

        const ns = CONFIG.noiseScale;
        const tt = time * CONFIG.flowTimeScale;
        const o = ud.noiseOffset * 0.01;
        const x = p.x * ns + o;
        const y = p.y * ns + o;
        const e = CONFIG.flowEps;

        const nx1 = Noise.perlin2(x + e, y + tt);
        const nx2 = Noise.perlin2(x - e, y + tt);
        const ny1 = Noise.perlin2(x, y + e + tt);
        const ny2 = Noise.perlin2(x, y - e + tt);

        const gx = (nx1 - nx2) / (2 * e);
        const gy = (ny1 - ny2) / (2 * e);

        const fx = -gy * CONFIG.flowStrength * speedMul;
        const fy = gx * CONFIG.flowStrength * speedMul;

        ud.vx += fx * delta;
        ud.vy += fy * delta;

        const jitter = CONFIG.flowJitter * speedMul;
        ud.vx += (Math.random() - 0.5) * jitter * delta;
        ud.vy += (Math.random() - 0.5) * jitter * delta;

        const fr = Math.pow(CONFIG.flowFriction, delta);
        ud.vx *= fr;
        ud.vy *= fr;

        const maxSpeed = CONFIG.flowMaxSpeed * speedMul;
        const sp2 = ud.vx * ud.vx + ud.vy * ud.vy;
        const ms2 = maxSpeed * maxSpeed;
        if (sp2 > ms2) {
            const s = Math.sqrt(sp2);
            const r = maxSpeed / s;
            ud.vx *= r;
            ud.vy *= r;
        }

        p.x += ud.vx * delta;
        p.y += ud.vy * delta;

        const w = window.innerWidth, h = window.innerHeight;
        const m = CONFIG.flowWrapMargin;
        if (p.x < -m) p.x = w + m;
        else if (p.x > w + m) p.x = -m;
        if (p.y < -m) p.y = h + m;
        else if (p.y > h + m) p.y = -m;
    }

    // ─── 签名动画 ─────────────────────────────
    animateSignature(id, duration, onComplete) {
        console.log('触发签名动画:', id); // 添加日志
        if (this.phase !== 'FREE_FLOAT' || this.isConverged) { onComplete(); return; }
        const p = this.particles.get(id);
        if (!p || this.signedIds.has(id)) { onComplete(); return; }

        p.userData.state = 'SIGNING';

        // 提到 active 层
        const gp = p.getGlobalPosition();
        this.layers.active.addChild(p);
        p.position.set(gp.x, gp.y);

        const bs = p.userData.baseScale;
        this.redrawAvatarGraphic(p, { width: 3, color: CONFIG.colors.highlight, alpha: 1 });

        gsap.timeline({
            onComplete: () => {
                this.signedIds.add(id);
                p.userData.state = 'SIGNED';
                p.scale.set(bs * 1.3); // 签完保持稍大
                this.redrawAvatarGraphic(p, { width: 3, color: CONFIG.colors.signed, alpha: 1.0 });

                // 放回 avatar 层
                const gp2 = p.getGlobalPosition();
                this.layers.avatar.addChild(p);
                p.position.set(gp2.x, gp2.y);

                if (this.signedIds.size >= this.employees.length) this.forceConverge();
                onComplete();
            }
        })
        .to(p.scale, { x: bs * 3.0, y: bs * 3.0, duration: 0.35, ease: "back.out(1.7)" })
        .to(p.scale, { x: bs * 1.3, y: bs * 1.3, duration: 0.25, ease: "power2.out"   })
        .to({}, { duration: duration });
    }

    // ─── WebSocket ────────────────────────────
    connectSocket() {
        try {
            const ws = new WebSocket(CONFIG.api.socket);
            ws.onopen = () => {
                console.log('[WS] 连接成功');
            };
            ws.onmessage = (ev) => {
                try {
                    const d = JSON.parse(ev.data);
                    console.log('[WS] 收到消息:', d); // 添加日志
                    if (d.employeeId) {
                        this.scheduler.push(d.employeeId);
                    } else if (d.type === 'reset') {
                        this.resetWall();
                    } else if (d.type === 'converge') {
                        this.forceConverge();
                    }
                } catch (error) {
                    console.error('[WS] 消息解析错误:', error);
                }
            };
            ws.onerror = (error) => {
                console.error('[WS] 连接错误:', error);
            };
            ws.onclose = () => {
                console.log('[WS] 连接关闭，尝试重连...');
                setTimeout(() => this.connectSocket(), 3000);
            };
            this.socket = ws;
        } catch (error) {
            console.error('[WS] 无法连接:', error);
            setTimeout(() => this.connectSocket(), 3000);
        }
    }

    // ─── 重置 ─────────────────────────────────
    resetWall() {
        this.isConverged = false;
        this.scheduler.isConverging = false;
        this.scheduler.queue.length = 0;
        this.scheduler.processing.clear();
        this.signedIds.clear();
        this.phase = 'INTRO_TO_LOGO';
        this.introAvatarRemaining = 0;
        this.introDustRemaining   = 0;

        // 头像重新从外侧飞入
        this.particles.forEach((p) => {
            gsap.killTweensOf(p); gsap.killTweensOf(p.scale);
            p.userData.state = 'INTRO'; p.scale.set(1);
            const s = this._randomEdgePoint();
            p.x = s.x; p.y = s.y; p.userData.vx = 0; p.userData.vy = 0;
            this.redrawAvatarGraphic(p, { width: 2, color: CONFIG.colors.gold, alpha: 1 });
            this.layers.avatar.addChild(p);
            this.introAvatarRemaining++;
            this._flyAvatarToLogo(p, p.userData.index);
        });

        // 粒子也重新飞入
        this.dustParticles.forEach((p, i) => {
            gsap.killTweensOf(p);
            const s = this._randomEdgePoint();
            p.x = s.x; p.y = s.y; p.userData.vx = 0; p.userData.vy = 0;
            this.introDustRemaining++;
            this._flyDustToLogo(p, i);
        });
    }

    // ─── 汇聚为 SUNNY ─────────────────────────
    forceConverge() {
        if (this.isConverged) return;
        this.isConverged = true;
        this.scheduler.isConverging = true;
        this.phase = 'CONVERGE_TO_SUNNY';
        console.log("🚀 → CONVERGE_TO_SUNNY");
        this.calculateCompositionTargets();

        // 头像飞向 SUNNY
        this.particles.forEach((p) => {
            gsap.killTweensOf(p); gsap.killTweensOf(p.scale);
            p.scale.set(p.userData.baseScale);
            const t = this.sunnyAvatarTargets[p.userData.index];
            if (!t) return;
            gsap.to(p, { x: t.x, y: t.y, duration: 2.2, ease: "power2.inOut", delay: Math.random() * 0.8 });
            p.userData.state = 'CONVERGED';
            const signed = this.signedIds.has(p.userData.id);
            this.redrawAvatarGraphic(p, {
                width: signed ? 2   : 1.5,
                color: signed ? CONFIG.colors.signed : CONFIG.colors.gold,
                alpha: signed ? 0.9 : 0.7
            });
        });

        // 粒子飞向 SUNNY
        this.dustParticles.forEach((p, i) => {
            gsap.killTweensOf(p);
            const t = this.sunnyDustTargets[i];
            if (!t) return;
            gsap.to(p, {
                x: t.x, y: t.y,
                alpha: 0.6 + Math.random() * 0.4,
                duration: 2.8, ease: "power2.inOut",
                delay: Math.random() * 1.2
            });
        });
    }

    // ─── Resize ───────────────────────────────
    handleResize() {
        this.resizeTimer = null;
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.calculateCompositionTargets();

        // 已汇聚状态下直接吸到新坐标
        if (this.isConverged) {
            this.particles.forEach(p => {
                const t = this.sunnyAvatarTargets[p.userData.index];
                if (t) { p.x = t.x; p.y = t.y; }
            });
            this.dustParticles.forEach((p, i) => {
                const t = this.sunnyDustTargets[i];
                if (t) { p.x = t.x; p.y = t.y; }
            });
        }
    }
}

window.onload = () => { window.wall = new SignatureWall(); };
