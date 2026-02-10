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

console.clear()

// ─── 环境检测 ─────────────────────────────
// 仅通过 URL 参数 ?mock 显式启用本地Mock环境
// 不加参数时，即使是 localhost 也会连接本地服务器（方便 test-tool.html 测试）
const IS_LOCAL_MOCK = window.location.search.includes('mock')

console.log(
  `🌍 环境模式: ${IS_LOCAL_MOCK ? '本地Mock（无后端）' : '正常模式（连接后端）'}`
)

const CONFIG = {
  totalEmployees: 300,
  showHUD: true,

  avatarSwarm: {
    targetTotalInstances: 1200,
    maxInstancesPerEmployee: 6,
    borderPalette: [0xffd700, 0xffc107, 0xffa500, 0xff8c00, 0xfff4cc],
    anchorScaleRange: [0.75, 1.2],
    anchorAlphaRange: [0.75, 1.0],
    dupScaleRange: [0.55, 1.0],
    dupAlphaRange: [0.55, 0.9],
    convergeAlpha: {
      anchor: 0.98,
      dup: 0.86
    }
  },

  sunnyScale: 0.6,

  sampling: {
    logoAlphaThreshold: 96,
    sunnyAlphaThreshold: 170
  },

  sunnyText: 'SUNNY',
  introLogoPath: '/logo.png',
  introLogoSvgPath: '/LOGO.svg',
  introSunnySvgPath: '',
  fontFamily: 'Montserrat, sans-serif',
  // fontWeight: '900', // Moved to fontProperties
  noiseScale: 0.0018,
  flowStrength: 0.06,
  flowTimeScale: 0.25,
  flowEps: 0.015,
  flowJitter: 0.01,
  flowFriction: 0.985,
  flowMaxSpeed: 1.6,
  flowWrapMargin: 60,
  imagesFolder: '/imgs/',
  imageExtension: '.jpg',

  fontProperties: {
    letterSpacing: '10px',
    fontWeight: '900'
  },

  animation: {
    signatureScale: 1.9,
    signatureDuration: 0.8
  },

  compose: {
    shapeInLogo: 'tile',
    shapeInSunny: 'tile',
    shapeInFree: 'avatar',
    tileSize: 16,
    tileRadius: 3,
    snapToGrid: true,
    gridSize: 16
  },

  // 头像尺寸。300个头像 + 2500个粒子 共同填充图案。
  // 头像 22px，粒子半径 3px，这样粒子能填进头像间隙而不会把头像盖住。
  avatarSize: 22,
  dustCount: 2500,
  dustMaxRadius: 5,  // ★ 粒子最大半径限制，防止粒子过大喧宾夺主

  // ★ 微粒子系统 - 专门用于填充射线尖端
  microDust: {
    enabled: true,
    count: 5000,           // 微粒子数量
    radiusRange: [1.0, 3.0], // 粒子大小范围
    alphaRange: [0.7, 1.0],
    colors: [0xffd700, 0xffaa00, 0xffffff, 0xfff4cc],
    rayTipDensityMultiplier: 3
  },

  // ★ LOGO几何信息 - 水平射线
  logoGeometry: {
    centerX: 0.5,
    centerY: 0.5,
    innerCircleRatio: 0.22,
    outerCircleRatio: 0.32,
    rayExtendRatio: 0.68,
    rayHeightRange: 0.18,
    rayAngles: [0, Math.PI],
    rayAngleWidth: 0.12
  },

  starfield: {
    layers: [
      { radius: 1, ratio: 0.65, alphaRange: [0.2, 0.5], speedMul: 0.3 },
      { radius: 2, ratio: 0.28, alphaRange: [0.4, 0.7], speedMul: 0.6 },
      { radius: 3, ratio: 0.07, alphaRange: [0.6, 1.0], speedMul: 1.0 }
    ],
    colors: [0xffffff, 0xffd700, 0xffa500]
  },

  backgroundStars: {
    enabled: true,
    showInIntro: true,
    showInConverge: true,
    showInFree: false,
    alpha: 0.55,
    fadeDuration: 0.9,
    count: 900,
    layers: [
      { radiusRange: [1, 1], ratio: 0.7, alphaRange: [0.08, 0.22] },
      { radiusRange: [1, 2], ratio: 0.23, alphaRange: [0.12, 0.3] },
      { radiusRange: [2, 3], ratio: 0.07, alphaRange: [0.18, 0.38] }
    ],
    colors: [0xffffff, 0xfff4cc, 0xffd700]
  },

  backgroundSand: {
    enabled: true,
    showInIntro: true,
    showInConverge: true,
    showInFree: false,
    alpha: 0.22,
    fadeDuration: 0.9,
    textureSize: 320,
    noiseScale: 1.0,
    layers: [
      { tint: 0xffffff, alpha: 0.9, scale: 1.0, speed: [0.12, 0.04] },
      { tint: 0xfff4cc, alpha: 0.6, scale: 1.8, speed: [0.22, 0.08] }
    ],
    twinkle: { amplitude: 0.08, speedRange: [0.2, 0.7] }
  },

  colors: {
    gold: 0xffd700,
    highlight: 0x00bfff,   // 签到瞬间高亮（保留青色）
    signed: 0xffd700,      // 签到后恢复金色
    // ★ SUNNY汇聚状态的渐变色板（从中心到边缘）
    sunnyGradient: [
      0xffffff,  // 中心 - 亮白
      0xfff4cc,  // 近中心 - 暖白
      0xffd700,  // 中间 - 金色
      0xffaa00,  // 远 - 橙金
      0xff8c00   // 边缘 - 深橙
    ]
  },

  // ★ SUNNY汇聚视觉配置
  sunnyVisual: {
    // 边框样式
    borderWidth: 1.2,           // 更细的边框
    borderWidthAnchor: 1.5,     // anchor稍粗
    // 外发光
    glowEnabled: true,
    glowWidth: 3,
    glowAlpha: 0.35,
    // 使用渐变色
    useGradient: true
  },

  scheduler: {
    maxConcurrent: 20,
    highlightDuration: 0.8
  },

  // ★ 根据环境自动切换 API 配置
  api: IS_LOCAL_MOCK
    ? {
        // 本地Mock：不使用WebSocket，仅从本地JSON加载员工列表
        socket: null,
        employees: '/employee-ids.json'
      }
    : {
        // 正式环境：使用WebSocket实时通信
        socket: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/signatures`,
        employees: '/api/employees'
      }
}

{
  const sources = {
    sunnyScale: 'default',
    population: 'default',
    sunnyTh: 'default',
    logoTh: 'default',
    showHUD: 'default',
    spacing: 'default',
    weight: 'default',
    sigScale: 'default',
    sigTime: 'default'
  }

  const getNumberParam = (params, key) => {
    if (!params.has(key)) return undefined
    const raw = params.get(key)
    if (raw == null) return undefined
    const v = raw.trim()
    if (v === '') return undefined
    const n = Number(v)
    if (!Number.isFinite(n)) return undefined
    return n
  }

  const hasDeep = (obj, path) => {
    let cur = obj
    for (const key of path) {
      if (!cur || typeof cur !== 'object' || !(key in cur)) return false
      cur = cur[key]
    }
    return true
  }

  const mergeDeep = (target, source) => {
    if (!source || typeof source !== 'object') return
    Object.keys(source).forEach((key) => {
      const sv = source[key]
      if (Array.isArray(sv)) {
        target[key] = sv.slice()
        return
      }
      if (sv && typeof sv === 'object') {
        if (
          !target[key] ||
          typeof target[key] !== 'object' ||
          Array.isArray(target[key])
        ) {
          target[key] = {}
        }
        mergeDeep(target[key], sv)
        return
      }
      target[key] = sv
    })
  }

  if (typeof window !== 'undefined' && window.SUNNY_CONFIG) {
    if (hasDeep(window.SUNNY_CONFIG, ['sunnyScale']))
      sources.sunnyScale = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['avatarSwarm', 'targetTotalInstances']))
      sources.population = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['sampling', 'sunnyAlphaThreshold']))
      sources.sunnyTh = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['sampling', 'logoAlphaThreshold']))
      sources.logoTh = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['showHUD'])) sources.showHUD = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['fontProperties', 'letterSpacing']))
      sources.spacing = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['fontProperties', 'fontWeight']))
      sources.weight = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['animation', 'signatureScale']))
      sources.sigScale = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['animation', 'signatureDuration']))
      sources.sigTime = 'config'
    mergeDeep(CONFIG, window.SUNNY_CONFIG)
  }

  const params = new URLSearchParams(window.location.search)

  const sunnyScale = getNumberParam(params, 'sunnyScale')
  if (typeof sunnyScale === 'number') {
    CONFIG.sunnyScale = Math.max(0.35, Math.min(1.0, sunnyScale))
    sources.sunnyScale = 'url'
  }

  let targetInstances = NaN
  for (const k of ['population', 'instances', 'avatars']) {
    const values = params.getAll(k)
    if (values.length) {
      targetInstances = Number(values[values.length - 1])
      break
    }
  }
  if (Number.isFinite(targetInstances) && targetInstances > 0) {
    CONFIG.avatarSwarm.targetTotalInstances = Math.max(
      1,
      Math.floor(targetInstances)
    )
    sources.population = 'url'
  }

  const maxPerEmployee = getNumberParam(params, 'maxPerEmployee')
  if (typeof maxPerEmployee === 'number' && maxPerEmployee > 0) {
    CONFIG.avatarSwarm.maxInstancesPerEmployee = Math.max(
      1,
      Math.floor(maxPerEmployee)
    )
  }

  const alphaTh = getNumberParam(params, 'alphaTh')
  if (typeof alphaTh === 'number') {
    const v = Math.max(0, Math.min(255, Math.floor(alphaTh)))
    CONFIG.sampling.logoAlphaThreshold = v
    CONFIG.sampling.sunnyAlphaThreshold = v
  }

  const logoTh = getNumberParam(params, 'logoTh')
  if (typeof logoTh === 'number') {
    CONFIG.sampling.logoAlphaThreshold = Math.max(
      0,
      Math.min(255, Math.floor(logoTh))
    )
    sources.logoTh = 'url'
  }

  const sunnyTh = getNumberParam(params, 'sunnyTh')
  if (typeof sunnyTh === 'number') {
    CONFIG.sampling.sunnyAlphaThreshold = Math.max(
      0,
      Math.min(255, Math.floor(sunnyTh))
    )
    sources.sunnyTh = 'url'
  }

  const hudParam = params.get('hud')
  if (hudParam !== null) {
    CONFIG.showHUD = hudParam !== '0' && hudParam !== 'false'
    sources.showHUD = 'url'
  }

  const spacing = params.get('spacing') || params.get('letterSpacing')
  if (spacing != null) {
    // Check if it's a number (assume px) or a string
    const numSpacing = Number(spacing)
    if (Number.isFinite(numSpacing)) {
      CONFIG.fontProperties.letterSpacing = `${numSpacing}px`
    } else {
      CONFIG.fontProperties.letterSpacing = spacing
    }
    sources.spacing = 'url'
  }

  const weight = params.get('weight') || params.get('fontWeight')
  if (weight != null) {
    CONFIG.fontProperties.fontWeight = weight
    sources.weight = 'url'
  }

  const sigScale = getNumberParam(params, 'sigScale')
  if (typeof sigScale === 'number' && sigScale > 0) {
    CONFIG.animation.signatureScale = sigScale
    sources.sigScale = 'url'
  }

  const sigTime =
    getNumberParam(params, 'sigTime') || getNumberParam(params, 'sigDuration')
  if (typeof sigTime === 'number' && sigTime > 0) {
    CONFIG.animation.signatureDuration = sigTime
    sources.sigTime = 'url'
  }

  if (typeof document !== 'undefined' && CONFIG.showHUD) {
    const hud = document.createElement('div')
    hud.style.position = 'fixed'
    hud.style.left = '14px'
    hud.style.bottom = '14px'
    hud.style.zIndex = '50'
    hud.style.pointerEvents = 'none'
    hud.style.font =
      '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    hud.style.color = 'rgba(255, 215, 0, 0.9)'
    hud.style.background = 'rgba(0,0,0,0.35)'
    hud.style.border = '1px solid rgba(255, 215, 0, 0.25)'
    hud.style.borderRadius = '10px'
    hud.style.padding = '10px 12px'
    hud.style.whiteSpace = 'pre'
    hud.textContent =
      `sunnyScale=${CONFIG.sunnyScale} (${sources.sunnyScale})\n` +
      `population=${CONFIG.avatarSwarm.targetTotalInstances} (${sources.population})\n` +
      `sunnyTh=${CONFIG.sampling.sunnyAlphaThreshold} (${sources.sunnyTh})\n` +
      `logoTh=${CONFIG.sampling.logoAlphaThreshold} (${sources.logoTh})\n` +
      `spacing=${CONFIG.fontProperties.letterSpacing} (${sources.spacing})\n` +
      `weight=${CONFIG.fontProperties.fontWeight} (${sources.weight})\n` +
      `sigScale=${CONFIG.animation.signatureScale} (${sources.sigScale})\n` +
      `sigTime=${CONFIG.animation.signatureDuration} (${sources.sigTime})`

    const existing = document.getElementById('config-hud')
    if (existing) existing.remove()
    hud.id = 'config-hud'
    document.body.appendChild(hud)
  }
}

// ─── Seeded Random（可复现随机数生成器）───────
class SeededRandom {
  constructor(seed) {
    const s = Number(seed)
    this.seed = Number.isFinite(s) ? s >>> 0 : 1
    if (this.seed === 0) this.seed = 1
  }

  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 0xffffffff
  }

  range(min, max) {
    return min + this.next() * (max - min)
  }

  choice(array) {
    return array[Math.floor(this.next() * array.length)]
  }
}

// ─── AvatarInstance（单个头像实例）─────────────
class AvatarInstance {
  constructor(employeeId, role, index) {
    this.employeeId = employeeId
    this.role = role // 'anchor' | 'ambient'
    this.index = index
    this.displayObject = null
    this.state = 'INTRO'
    this.visualSeed = this.generateSeed(employeeId, index)

    // 视觉属性（由 seed 派生，固定不变）
    this.depth = 0
    this.baseScale = 1
    this.baseAlpha = 1
    this.tint = null

    // 运动属性
    this.vx = 0
    this.vy = 0
    this.noiseOffset = 0
  }

  generateSeed(id, index) {
    let hash = 0
    const str = `${id}_${index}`
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    return hash >>> 0 || 1
  }
}

// ─── AvatarGroup（一个员工的所有头像实例）──────
class AvatarGroup {
  constructor(employeeId, texture) {
    this.employeeId = employeeId
    this.texture = texture
    this.anchor = null // AvatarInstance
    this.ambient = [] // AvatarInstance[]
  }
}

// ─── 简易噪声 ───────────────────────────────
const Noise = {
  perlin2(x, y) {
    return (Math.sin(x) + Math.sin(y) + Math.sin(x + y)) / 3
  }
}

// ─── 签名队列调度 ─────────────────────────────
class SignatureScheduler {
  constructor(wall) {
    this.wall = wall
    this.queue = []
    this.processing = new Set()
    this.isConverging = false
  }

  push(employeeId) {
    if (this.isConverging) return
    if (this.processing.has(employeeId)) return
    if (this.wall.signedIds.has(employeeId)) return
    this.queue.push(employeeId)
    this.process()
  }

  process() {
    if (this.wall.phase !== 'FREE_FLOAT') return
    if (this.queue.length === 0) return
    if (this.processing.size >= CONFIG.scheduler.maxConcurrent) return

    const id = this.queue.shift()
    this.processing.add(id)

    const rushMode = this.queue.length > 5
    // Use signatureDuration from config or fallback to original logic
    const baseDuration =
      CONFIG.animation?.signatureDuration || CONFIG.scheduler.highlightDuration
    const duration = rushMode ? 0.3 : baseDuration

    this.wall.animateSignature(id, duration, () => {
      this.processing.delete(id)
      this.process()
    })
    this.process() // 尽量填满并发槽
  }
}

// ─── 签名墙主类 ────────────────────────────────
class SignatureWall {
  constructor() {
    this.app = null
    this.scheduler = new SignatureScheduler(this)
    this.employees = []

    this.avatarsById = new Map() // id → AvatarGroup（头像组）
    this.dustParticles = [] // Sprite[]（粒子）

    // 目标坐标 — Logo 和 SUNNY 各一组，头像和粒子各自的
    this.logoAvatarTargets = []
    this.logoDustTargets = []
    this.sunnyAvatarTargets = []
    this.sunnyDustTargets = []

    // ★ 微粒子目标坐标
    this.logoMicroDustTargets = []
    this.microDustParticles = []
    this.introMicroDustRemaining = 0

    // LOGO几何中心缓存
    this.logoCenter = null
    this.logoRadius = 0

    this.resizeTimer = null
    this.phase = 'INTRO_TO_LOGO'
    this.logoImage = null
    this.logoSvgImage = null
    this.sunnySvgImage = null

    // intro 阶段用倒计数决定"全部到位后"何时切换状态
    this.introAvatarRemaining = 0
    this.introDustRemaining = 0

    this.signedIds = new Set()
    this.isConverged = false

    this.layers = { dust: null, avatar: null, active: null, microDust: null }
    this.backgroundStarsLayer = null
    this.backgroundSandLayer = null
    this.backgroundSandSprites = []
    this.ambientDustLayer = null
    this.ambientDustParticles = []

    this.init()
  }

  // ─── 射线区域检测工具 ─────────────────────────
  // 基于LOGO实际结构：射线是水平方向的，Y轴位置在LOGO中心附近
  _isPointInRayZone(x, y, center, logoSize) {
    const geo = CONFIG.logoGeometry
    const dx = x - center.x
    const dy = y - center.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // 计算到圆环中心的距离比例
    const distRatio = dist / logoSize

    // 如果在圆环内部，不是射线区域
    if (distRatio < geo.outerCircleRatio) return { inRay: false, tipRatio: 0 }

    // ★ 射线是水平的，检查Y轴是否在射线高度范围内
    // LOGO的射线在中心线上下一定范围内
    const yOffset = Math.abs(dy) / logoSize
    const rayHeightRange = geo.rayHeightRange || 0.15  // Y轴偏移范围

    if (yOffset > rayHeightRange) return { inRay: false, tipRatio: 0 }

    // ★ 检查是否在左侧或右侧（水平方向）
    const isLeftSide = dx < 0
    const isRightSide = dx > 0

    if (!isLeftSide && !isRightSide) return { inRay: false, tipRatio: 0 }

    // 计算到射线尖端的比例
    const absX = Math.abs(dx) / logoSize
    const rayStart = geo.outerCircleRatio
    const rayEnd = geo.outerCircleRatio + geo.rayExtendRatio
    const tipRatio = Math.min(1, Math.max(0, (absX - rayStart) / (rayEnd - rayStart)))

    return { inRay: true, tipRatio, isLeftSide }
  }

  // 根据位置计算粒子/头像的推荐大小
  _getParticleSizeByPosition(x, y) {
    if (!this.logoCenter) return { size: CONFIG.compose.tileSize, inRayTip: false }

    const { inRay, tipRatio } = this._isPointInRayZone(
      x, y, this.logoCenter, this.logoRadius
    )

    if (!inRay) {
      return { size: CONFIG.compose.tileSize, inRayTip: false }
    }

    // 射线区域：根据tipRatio渐变大小
    if (tipRatio > 0.5) {
      const microCfg = CONFIG.microDust
      const size = microCfg.radiusRange[0] +
        (1 - tipRatio) * (microCfg.radiusRange[1] - microCfg.radiusRange[0])
      return { size, inRayTip: true }
    } else {
      const baseSize = CONFIG.compose.tileSize
      const minSize = baseSize * 0.4
      const size = baseSize - tipRatio * 2 * (baseSize - minSize)
      return { size, inRayTip: false }
    }
  }

  // ─── 画头像圆 ─────────────────────────────
  redrawAvatarGraphic(g, borderStyle) {
    const ud = g.userData
    const shapeMode = ud.shapeMode || 'avatar'
    
    // ★ 自适应尺寸支持
    let size
    if (CONFIG.adaptiveSampling?.renderVariableSize && ud.tileSize) {
      size = ud.tileSize
    } else if (shapeMode === 'tile') {
      size = CONFIG.compose.tileSize
    } else {
      size = ud.targetSize
    }
    
    // 限制最小尺寸
    size = Math.max(4, size)
    
    const texture = ud.texture

    g.clear()

    const s = size / texture.width
    const matrix = new PIXI.Matrix()
    matrix.scale(s, s)
    matrix.translate(-size / 2, -size / 2)

    g.beginTextureFill({ texture, matrix })
    if (shapeMode === 'tile') {
      const r = Math.max(0, Math.min(CONFIG.compose.tileRadius, size / 2))
      g.drawRoundedRect(-size / 2, -size / 2, size, size, r)
    } else {
      g.drawCircle(0, 0, size / 2)
    }
    g.endFill()

    const bw = borderStyle?.width ?? ud.border.width
    const bc = borderStyle?.color ?? ud.border.color
    const ba = borderStyle?.alpha ?? ud.border.alpha

    // ★ 支持自定义外发光参数
    const customGlowW = borderStyle?.glowWidth
    const customGlowA = borderStyle?.glowAlpha

    if (shapeMode === 'tile') {
      const r = Math.max(0, Math.min(CONFIG.compose.tileRadius, size / 2))

      // 外发光（可自定义或使用默认）
      const glowW = customGlowW !== undefined ? customGlowW : (bw + 4)
      const glowA = customGlowA !== undefined ? customGlowA : Math.min(0.7, ba * 0.45)

      if (glowW > 0 && glowA > 0) {
        g.lineStyle(glowW, bc, glowA)
        g.drawRoundedRect(-size / 2, -size / 2, size, size, r)
      }

      // 主边框
      g.lineStyle(bw, bc, ba)
      g.drawRoundedRect(-size / 2, -size / 2, size, size, r)
    } else {
      // 圆形模式外发光
      if (customGlowW !== undefined && customGlowW > 0 && customGlowA > 0) {
        g.lineStyle(customGlowW, bc, customGlowA)
        g.drawCircle(0, 0, size / 2)
      }
      // 主边框
      g.lineStyle(bw, bc, ba)
      g.drawCircle(0, 0, size / 2)
    }

    ud.border = { width: bw, color: bc, alpha: ba }
  }

  // ─── 初始化 ───────────────────────────────
  async init() {
    const container = document.getElementById('app-container')
    container.innerHTML = ''
    this.app = new PIXI.Application({
      backgroundAlpha: 0,
      resizeTo: window,
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })
    document.getElementById('app-container').appendChild(this.app.view)

    this.createLayers()
    this.createBackgroundStars()
    this.createBackgroundSand()
    this.createAmbientDust()
    this._updateBackgroundByPhase(true)
    this.initEvents()

    await document.fonts.ready
    await this.loadEmployeeData()
    await this.loadLogoImage()

    this.planAvatarInstances()

    // ★ 先算好全部目标坐标，再创建头像和粒子
    this.calculateCompositionTargets()

    await this.createAvatars() // 头像飞入 Logo
    this.createDust() // 粒子飞入 Logo
    this.createMicroDust() // ★ 微粒子飞入射线尖端

    this.connectSocket()
    this.app.ticker.add((delta) => this.update(delta))

    console.log('☀️ SUNNY Signature Wall Ready.')
  }

  _setAllAvatarShapeMode(mode) {
    this.avatarsById.forEach((group) => {
      const list = [group.anchor, ...group.ambient]
      list.forEach((inst) => {
        const p = inst?.displayObject
        if (!p?.userData) return
        p.userData.shapeMode = mode
        if (mode === 'tile') p.scale.set(1)
        else p.scale.set(inst.baseScale)
        this.redrawAvatarGraphic(p)
      })
    })
  }

  planAvatarInstances() {
    const employeeCount = this.employees.length
    const target = CONFIG.avatarSwarm.targetTotalInstances
    const maxPerEmployee = CONFIG.avatarSwarm.maxInstancesPerEmployee
    const total = Math.max(
      employeeCount,
      Math.min(target, employeeCount * maxPerEmployee)
    )

    const base = Math.floor(total / employeeCount)
    const rem = total % employeeCount

    this.instancePlan = {
      total,
      perEmployeeBase: base,
      remainder: rem
    }

    this.employeeInstanceOffsets = new Array(employeeCount)
    let offset = 0
    for (let i = 0; i < employeeCount; i++) {
      this.employeeInstanceOffsets[i] = offset
      offset += this._instancesForEmployee(i)
    }

    this.totalAvatarInstancesPlanned = offset
  }

  _instancesForEmployee(employeeIndex) {
    const plan = this.instancePlan
    if (!plan) return 1
    return plan.perEmployeeBase + (employeeIndex < plan.remainder ? 1 : 0)
  }

  async loadLogoImage() {
    // 优先加载 SVG（矢量图边缘更精确）
    await this.loadLogoSvgImage()

    // 如果 SVG 加载失败，fallback 到 PNG
    if (!this.logoSvgImage) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((res, rej) => {
          img.onload = res
          img.onerror = () => rej()
          img.src = CONFIG.introLogoPath
        })
        this.logoImage = img
      } catch {
        console.warn('[Logo] PNG 加载失败，用文字替代')
        this.logoImage = null
      }
    }
  }

  async loadLogoSvgImage() {
    this.logoSvgImage = null
    const url = (CONFIG.introLogoSvgPath || '').trim()
    if (!url) return

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const svgText = await res.text()
      this.logoSvgImage = await this._svgTextToImage(svgText)
      console.log('[Logo] SVG 加载成功，边缘将更精确')
    } catch (e) {
      console.warn('[Logo] SVG 加载失败，将使用 PNG:', e.message)
      this.logoSvgImage = null
    }
  }

  _svgTextToImage(svgText) {
    return new Promise((resolve, reject) => {
      try {
        const blob = new Blob([svgText], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve(img)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('svg image load failed'))
        }
        img.src = url
      } catch (e) {
        reject(e)
      }
    })
  }

  async loadSunnySvgImage() {
    this.sunnySvgImage = null
    const url = (CONFIG.introSunnySvgPath || '').trim()
    if (!url) return

    try {
      const res = await fetch(url)
      if (!res.ok) return
      const svgText = await res.text()
      this.sunnySvgImage = await this._svgTextToImage(svgText)
    } catch {
      this.sunnySvgImage = null
    }
  }

  async loadEmployeeData() {
    try {
      const res = await fetch(CONFIG.api.employees)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data.employees) && data.employees.length > 0) {
        this.employees = data.employees
        console.log(`[Data] ${this.employees.length} employees`)
      } else throw new Error('empty')
    } catch (e) {
      console.warn('[Data] 使用默认列表', e)
      this.employees = Array.from({ length: 300 }, (_, i) => `${105001 + i}`)
    }
  }

  // ─── 离屏 canvas 采样坐标 ────────────────────
  // draw(ctx, w, h) 负责绘图；step 是采样间隔（越小点越多）
  samplePoints(draw, step, alphaThreshold) {
    const screenW = window.innerWidth
    const screenH = window.innerHeight
    if (
      !Number.isFinite(screenW) ||
      !Number.isFinite(screenH) ||
      screenW <= 0 ||
      screenH <= 0
    ) {
      return []
    }

    const canvasW = 1200
    const canvasH = Math.max(1, Math.round(canvasW * (screenH / screenW)))
    if (!Number.isFinite(canvasH)) return []

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    draw(ctx, canvasW, canvasH)

    const imgData = ctx.getImageData(0, 0, canvasW, canvasH).data
    const sx = screenW / canvasW
    const sy = screenH / canvasH

    const s = Math.max(1, Math.round(step))
    const points = []
    const th = typeof alphaThreshold === 'number' ? alphaThreshold : 32
    for (let y = 0; y < canvasH; y += s) {
      for (let x = 0; x < canvasW; x += s) {
        if (imgData[(y * canvasW + x) * 4 + 3] > th) {
          points.push({ x: x * sx, y: y * sy })
        }
      }
    }

    return points
  }

  /**
   * Sobel 边缘检测
   */
  computeEdgeMap(imageData) {
    const { width, height, data } = imageData
    const edgeMap = new Float32Array(width * height)

    // Sobel 核
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + 3 // alpha 通道
            const kernelIdx = (ky + 1) * 3 + (kx + 1)
            gx += data[idx] * sobelX[kernelIdx]
            gy += data[idx] * sobelY[kernelIdx]
          }
        }
        edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy)
      }
    }
    return edgeMap
  }

  /**
   * 获取区域对比度
   */
  getRegionContrast(edgeMap, width, x, y, size) {
    let sum = 0,
      count = 0
    const x1 = Math.floor(x)
    const y1 = Math.floor(y)
    const x2 = Math.min(width, Math.ceil(x + size))
    const y2 = Math.min(edgeMap.length / width, Math.ceil(y + size))

    for (let cy = y1; cy < y2; cy++) {
      for (let cx = x1; cx < x2; cx++) {
        sum += edgeMap[cy * width + cx]
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }

  /**
   * 四叉树自适应采样
   */
  sampleAdaptivePoints(draw, options = {}) {
    const {
      minTileSize = 6,
      maxTileSize = 20,
      contrastThreshold = 30,
      maxDepth = 5,
      alphaThreshold = 128
    } = options

    const screenW = window.innerWidth
    const screenH = window.innerHeight

    const canvasW = 1200
    const canvasH = Math.round(canvasW * (screenH / screenW))
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    draw(ctx, canvasW, canvasH)

    const imageData = ctx.getImageData(0, 0, canvasW, canvasH)
    const edgeMap = this.computeEdgeMap(imageData)
    const sx = screenW / canvasW
    const sy = screenH / canvasH

    const tiles = []

    const subdivide = (cx, cy, csize, depth) => {
      const midX = Math.floor(cx + csize / 2)
      const midY = Math.floor(cy + csize / 2)
      const centerIdx = (midY * canvasW + midX) * 4 + 3
      const inShape = imageData.data[centerIdx] > alphaThreshold

      if (!inShape) return

      const contrast = this.getRegionContrast(edgeMap, canvasW, cx, cy, csize)

      if (
        csize <= minTileSize ||
        depth >= maxDepth ||
        contrast < contrastThreshold
      ) {
        tiles.push({
          x: (cx + csize / 2) * sx,
          y: (cy + csize / 2) * sy,
          size: csize * Math.min(sx, sy),
          isEdge: contrast >= contrastThreshold
        })
        return
      }

      const half = csize / 2
      subdivide(cx, cy, half, depth + 1)
      subdivide(cx + half, cy, half, depth + 1)
      subdivide(cx, cy + half, half, depth + 1)
      subdivide(cx + half, cy + half, half, depth + 1)
    }

    const startSize = maxTileSize / Math.min(sx, sy)
    for (let y = 0; y < canvasH; y += startSize) {
      for (let x = 0; x < canvasW; x += startSize) {
        subdivide(x, y, startSize, 0)
      }
    }

    return tiles
  }

  sampleGridPoints(draw, gridSize, alphaThreshold) {
    const screenW = window.innerWidth
    const screenH = window.innerHeight
    if (
      !Number.isFinite(screenW) ||
      !Number.isFinite(screenH) ||
      screenW <= 0 ||
      screenH <= 0
    ) {
      return []
    }

    const canvasW = 1200
    const canvasH = Math.round(canvasW * (screenH / screenW))
    if (!Number.isFinite(canvasH) || canvasH <= 0) return []

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    draw(ctx, canvasW, canvasH)

    const imgData = ctx.getImageData(0, 0, canvasW, canvasH).data
    const sx = screenW / canvasW
    const sy = screenH / canvasH

    const th = typeof alphaThreshold === 'number' ? alphaThreshold : 32
    const g = Math.max(4, Math.round(gridSize))
    const points = []

    for (let y = g / 2; y < screenH; y += g) {
      const cy = Math.max(0, Math.min(canvasH - 1, Math.round(y / sy)))
      for (let x = g / 2; x < screenW; x += g) {
        const cx = Math.max(0, Math.min(canvasW - 1, Math.round(x / sx)))
        if (imgData[(cy * canvasW + cx) * 4 + 3] > th) {
          points.push({ x, y })
        }
      }
    }

    return points
  }

  _hashToSeed(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    return hash >>> 0 || 1
  }

  _shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  _pickEvenIndices(points, count, cellSize, rng) {
    if (count <= 0) return []
    if (points.length <= count)
      return Array.from({ length: points.length }, (_, i) => i)

    let minX = Infinity,
      minY = Infinity
    for (const p of points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
    }

    const cellMap = new Map()
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const cx = Math.floor((p.x - minX) / cellSize)
      const cy = Math.floor((p.y - minY) / cellSize)
      const key = `${cx},${cy}`
      const list = cellMap.get(key)
      if (list) list.push(i)
      else cellMap.set(key, [i])
    }

    const keys = Array.from(cellMap.keys())
    this._shuffleInPlace(keys, rng)

    const selected = []
    for (const key of keys) {
      const list = cellMap.get(key)
      if (!list || list.length === 0) continue
      const pick = list[Math.floor(rng.next() * list.length)]
      selected.push(pick)
      if (selected.length >= count) break
    }

    return selected
  }

  _evenSampleIndices(points, count, rng) {
    const base = CONFIG.avatarSize * 0.95
    const tries = [base * 1.25, base, base * 0.8, base * 0.65]
    for (const cs of tries) {
      const idx = this._pickEvenIndices(points, count, cs, rng)
      if (idx.length >= count) return idx.slice(0, count)
    }

    const all = Array.from({ length: points.length }, (_, i) => i)
    this._shuffleInPlace(all, rng)
    return all.slice(0, count)
  }

  _snapPointsToGrid(points, gridSize, rng) {
    const g = Number(gridSize)
    if (!Number.isFinite(g) || g <= 0) return points

    const used = new Map()
    const out = new Array(points.length)
    const r = rng || {
      next: Math.random,
      range: (a, b) => a + (b - a) * Math.random()
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      let x = Math.round(p.x / g) * g
      let y = Math.round(p.y / g) * g
      const key = `${x},${y}`
      const c = used.get(key) || 0
      used.set(key, c + 1)
      if (c > 0) {
        const j = g * 0.18
        x += r.range(-j, j)
        y += r.range(-j, j)
      }
      out[i] = { x, y }
    }
    return out
  }

  _toHaloTargets(points, center, rng) {
    const minPush = 18
    const maxPush = 60
    const jitter = 6

    return points.map((p) => {
      const dx = p.x - center.x
      const dy = p.y - center.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const ux = dx / len
      const uy = dy / len
      const push = rng.range(minPush, maxPush)
      return {
        x: p.x + ux * push + rng.range(-jitter, jitter),
        y: p.y + uy * push + rng.range(-jitter, jitter)
      }
    })
  }

  // ─── 核心：目标坐标分配 ──────────────────────
  // 同一次采样出的点：前 avatarCount 个给头像，后面的给粒子。
  // 点不够时循环复用（加抖动避免重叠）。
  calculateCompositionTargets() {
    const ac = this.totalAvatarInstancesPlanned || this.employees.length
    const dc = CONFIG.dustCount
    const microDc = CONFIG.microDust?.enabled ? CONFIG.microDust.count : 0
    const need = ac + dc + microDc

    const logoRaw = this.sampleLogoShape(need)
    const sunnyRaw = this.sampleSunnyShape(need)

    // ★ 计算LOGO几何中心和半径（用于射线检测）
    this._calculateLogoGeometry(logoRaw)

    const seedBase = `${window.innerWidth}x${window.innerHeight}`
    const logoRng = new SeededRandom(this._hashToSeed(`logo:${seedBase}`))
    const sunnyRng = new SeededRandom(this._hashToSeed(`sunny:${seedBase}`))

    // 如果启用自适应采样，我们需要根据尺寸分配角色：大 tile 给头像，小 tile 给粒子
    if (CONFIG.adaptiveSampling?.enabled) {
      // 对原始采样点进行排序（大尺寸优先）
      logoRaw.sort((a, b) => (b.size || 0) - (a.size || 0))
      sunnyRaw.sort((a, b) => (b.size || 0) - (a.size || 0))

      // 提取头像点位
      this.logoAvatarTargets = logoRaw.slice(0, ac).map(p => ({ ...p, tileSize: p.size }))
      this.sunnyAvatarTargets = sunnyRaw.slice(0, ac).map(p => ({ ...p, tileSize: p.size }))

      // 剩余点位给粒子
      const logoRemain = logoRaw.slice(ac)
      const sunnyRemain = sunnyRaw.slice(ac)

      const { rayTipPoints, normalPoints } = this._separateRayTipPoints(logoRemain)

      // ★ 对粒子目标点进行空间均匀采样，避免集中在特定区域
      const logoDustIdx = this._evenSampleIndices(normalPoints, Math.min(dc, normalPoints.length), logoRng)
      this.logoDustTargets = logoDustIdx.map(i => ({ ...normalPoints[i], tileSize: normalPoints[i].size }))

      const sunnyDustIdx = this._evenSampleIndices(sunnyRemain, Math.min(dc, sunnyRemain.length), sunnyRng)
      this.sunnyDustTargets = sunnyDustIdx.map(i => ({ ...sunnyRemain[i], tileSize: sunnyRemain[i].size }))

      if (CONFIG.microDust?.enabled) {
        this.logoMicroDustTargets = this._generateMicroDustTargets(rayTipPoints, microDc, logoRng)
      }
    } else {
      // 原有随机分配逻辑
      this._shuffleInPlace(logoRaw, logoRng)
      this._shuffleInPlace(sunnyRaw, sunnyRng)

      const logoIdx = this._evenSampleIndices(logoRaw, ac, logoRng)
      const logoSet = new Set(logoIdx)
      this.logoAvatarTargets = logoIdx.map((i) => logoRaw[i])
      if (CONFIG.compose.snapToGrid && CONFIG.compose.shapeInLogo === 'tile') {
        this.logoAvatarTargets = this._snapPointsToGrid(
          this.logoAvatarTargets,
          CONFIG.compose.gridSize || CONFIG.compose.tileSize,
          logoRng
        )
      }
      const logoRemain = logoRaw.filter((_, i) => !logoSet.has(i))

      const { rayTipPoints, normalPoints } = this._separateRayTipPoints(logoRemain)
      this.logoDustTargets = this.slice(normalPoints, 0, dc, logoRng)
      if (CONFIG.microDust?.enabled) {
        this.logoMicroDustTargets = this._generateMicroDustTargets(rayTipPoints, microDc, logoRng)
      }

      const sunnyIdx = this._evenSampleIndices(sunnyRaw, ac, sunnyRng)
      const sunnySet = new Set(sunnyIdx)
      this.sunnyAvatarTargets = sunnyIdx.map((i) => sunnyRaw[i])
      if (CONFIG.compose.snapToGrid && CONFIG.compose.shapeInSunny === 'tile') {
        this.sunnyAvatarTargets = this._snapPointsToGrid(
          this.sunnyAvatarTargets,
          CONFIG.compose.gridSize || CONFIG.compose.tileSize,
          sunnyRng
        )
      }
      const sunnyRemain = sunnyRaw.filter((_, i) => !sunnySet.has(i))
      const sunnyDustIdx = this._evenSampleIndices(sunnyRemain, Math.min(dc, sunnyRemain.length), sunnyRng)
      this.sunnyDustTargets = sunnyDustIdx.map(i => sunnyRemain[i])
    }

    console.log(
      `[Targets] logo采样=${logoRaw.length} sunny采样=${sunnyRaw.length} | 需要 avatar=${ac} dust=${dc} microDust=${microDc}`
    )
  }

  // ★ 计算LOGO几何中心
  _calculateLogoGeometry(points) {
    if (!points || points.length === 0) {
      this.logoCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      this.logoRadius = Math.min(window.innerWidth, window.innerHeight) * 0.4
      return
    }

    let sumX = 0, sumY = 0
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const p of points) {
      sumX += p.x
      sumY += p.y
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }

    this.logoCenter = {
      x: sumX / points.length,
      y: sumY / points.length
    }
    this.logoRadius = Math.max(maxX - minX, maxY - minY) / 2

    console.log(`[Logo] 中心=(${this.logoCenter.x.toFixed(0)}, ${this.logoCenter.y.toFixed(0)}) 半径=${this.logoRadius.toFixed(0)}`)
  }

  // ★ 分离射线尖端点和普通点
  _separateRayTipPoints(points) {
    const rayTipPoints = []
    const normalPoints = []

    for (const p of points) {
      const { inRay, tipRatio } = this._isPointInRayZone(
        p.x, p.y, this.logoCenter, this.logoRadius
      )
      if (inRay && tipRatio > 0.2) {
        rayTipPoints.push({ ...p, tipRatio, size: p.size })
      } else {
        normalPoints.push(p)
      }
    }

    return { rayTipPoints, normalPoints }
  }

  // ★ 生成微粒子目标坐标（水平射线路径密集分布）
  _generateMicroDustTargets(rayTipPoints, count, rng) {
    const targets = []
    const cfg = CONFIG.microDust
    const geo = CONFIG.logoGeometry
    const r = rng || { next: Math.random }

    // 1. 首先使用现有的射线尖端点
    for (const p of rayTipPoints) {
      targets.push({
        x: p.x,
        y: p.y,
        tipRatio: p.tipRatio,
        size: cfg.radiusRange[0] + (1 - p.tipRatio) * (cfg.radiusRange[1] - cfg.radiusRange[0])
      })
    }

    // 2. 生成水平射线上的微粒子
    // LOGO有6条射线：左侧3条，右侧3条
    // 每条射线的Y轴位置略有不同
    const rayHeightRange = geo.rayHeightRange || 0.15
    const rayYOffsets = [-0.08, -0.03, 0.02, 0.07, 0.12]  // 5条射线的Y偏移

    const particlesPerSide = Math.floor((count - targets.length) / 2)

    // 左侧射线
    for (let i = 0; i < particlesPerSide; i++) {
      const t = r.next()  // 0~1 沿射线的位置
      const tipRatio = t

      // X轴：从圆环边缘向左延伸
      const xRatio = -(geo.outerCircleRatio + t * geo.rayExtendRatio)
      const x = this.logoCenter.x + xRatio * this.logoRadius

      // Y轴：在中心线附近随机，越靠近尖端越集中
      const ySpread = rayHeightRange * (1 - t * 0.6)  // 尖端收窄
      const yOffset = rayYOffsets[Math.floor(r.next() * rayYOffsets.length)] || 0
      const yJitter = (r.next() - 0.5) * ySpread
      const y = this.logoCenter.y + (yOffset + yJitter) * this.logoRadius

      if (x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight) {
        const size = cfg.radiusRange[1] - tipRatio * (cfg.radiusRange[1] - cfg.radiusRange[0])
        targets.push({ x, y, tipRatio, size })
      }
    }

    // 右侧射线
    for (let i = 0; i < particlesPerSide; i++) {
      const t = r.next()
      const tipRatio = t

      // X轴：从圆环边缘向右延伸
      const xRatio = geo.outerCircleRatio + t * geo.rayExtendRatio
      const x = this.logoCenter.x + xRatio * this.logoRadius

      // Y轴：同左侧
      const ySpread = rayHeightRange * (1 - t * 0.6)
      const yOffset = rayYOffsets[Math.floor(r.next() * rayYOffsets.length)] || 0
      const yJitter = (r.next() - 0.5) * ySpread
      const y = this.logoCenter.y + (yOffset + yJitter) * this.logoRadius

      if (x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight) {
        const size = cfg.radiusRange[1] - tipRatio * (cfg.radiusRange[1] - cfg.radiusRange[0])
        targets.push({ x, y, tipRatio, size })
      }
    }

    // 3. 补充不足的数量
    while (targets.length < count) {
      const isLeft = r.next() < 0.5
      const t = r.next()
      const xSign = isLeft ? -1 : 1
      const xRatio = xSign * (geo.outerCircleRatio + t * geo.rayExtendRatio)
      const x = this.logoCenter.x + xRatio * this.logoRadius

      const ySpread = rayHeightRange * (1 - t * 0.6)
      const yOffset = rayYOffsets[Math.floor(r.next() * rayYOffsets.length)] || 0
      const yJitter = (r.next() - 0.5) * ySpread
      const y = this.logoCenter.y + (yOffset + yJitter) * this.logoRadius

      if (x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight) {
        const size = cfg.radiusRange[1] - t * (cfg.radiusRange[1] - cfg.radiusRange[0])
        targets.push({ x, y, tipRatio: t, size })
      }
    }

    console.log(`[MicroDust] 生成目标: 现有射线点=${rayTipPoints.length}, 总计=${targets.length}`)
    return targets
  }

  // 切片 + 不够时循环填充
  slice(arr, start, end, rng) {
    const out = arr.slice(start, end)
    const need = end - start
    if (out.length === 0)
      return Array.from({ length: need }, () => ({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }))

    // 优化兜底：如果点不够，在整个范围内随机取点（插值），避免简单的原点偏移造成重影
    if (out.length < need) {
      // 计算包围盒
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity
      out.forEach((p) => {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      })
      const w = maxX - minX
      const h = maxY - minY

      while (out.length < need) {
        // 随机插值：取两个点中间的位置 + 扰动
        const r = rng || { next: Math.random }
        const p1 = out[Math.floor(r.next() * out.length)]
        const p2 = out[Math.floor(r.next() * out.length)]
        out.push({
          x: (p1.x + p2.x) * 0.5 + (r.next() - 0.5) * 5,
          y: (p1.y + p2.y) * 0.5 + (r.next() - 0.5) * 5
        })
      }
    }
    return out
  }

  sampleLogoShape(need) {
    const step = 1
    const logoImg = this.logoSvgImage || this.logoImage

    if (logoImg) {
      const draw = (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const margin = 0.1
        const maxW = w * (1 - margin * 2)
        const maxH = h * (1 - margin * 2)
        const sc = Math.min(maxW / logoImg.width, maxH / logoImg.height)
        ctx.drawImage(
          logoImg,
          (w - logoImg.width * sc) / 2,
          (h - logoImg.height * sc) / 2,
          logoImg.width * sc,
          logoImg.height * sc
        )
      }

      if (CONFIG.adaptiveSampling?.enabled) {
        const cfg = CONFIG.adaptiveSampling
        return this.sampleAdaptivePoints(draw, {
          minTileSize: cfg.logo?.rayTipMinSize || cfg.minTileSize,
          maxTileSize: cfg.logo?.maxTileSize || cfg.maxTileSize,
          contrastThreshold: cfg.contrastThreshold,
          maxDepth: cfg.maxDepth,
          alphaThreshold: CONFIG.sampling.logoAlphaThreshold
        })
      }

      const thresholds = [
        CONFIG.sampling.logoAlphaThreshold,
        Math.max(32, Math.floor(CONFIG.sampling.logoAlphaThreshold * 0.7)),
        32
      ]
      for (const th of thresholds) {
        const pts = this.samplePoints(draw, step, th)
        if (pts.length >= need) return pts
      }
      return this.samplePoints(draw, step, 32)
    }
    // 无 logo 图片时用文字
    const draw = (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      ctx.font = `${CONFIG.fontWeight} ${Math.min(w / 5, 300)}px ${CONFIG.fontFamily}`
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('LOGO', w / 2, h / 2)
    }

    if (CONFIG.adaptiveSampling?.enabled) {
      const cfg = CONFIG.adaptiveSampling
      return this.sampleAdaptivePoints(draw, {
        minTileSize: cfg.minTileSize,
        maxTileSize: cfg.maxTileSize,
        contrastThreshold: cfg.contrastThreshold,
        maxDepth: cfg.maxDepth,
        alphaThreshold: CONFIG.sampling.logoAlphaThreshold
      })
    }

    const thresholds = [
      CONFIG.sampling.logoAlphaThreshold,
      Math.max(32, Math.floor(CONFIG.sampling.logoAlphaThreshold * 0.7)),
      32
    ]
    for (const th of thresholds) {
      const pts = this.samplePoints(draw, step, th)
      if (pts.length >= need) return pts
    }
    return this.samplePoints(draw, step, 32)
  }

  sampleSunnyShape(need) {
    if (this.sunnySvgImage) {
      const draw = (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const margin = 0.1
        const maxW = w * (1 - margin * 2)
        const maxH = h * (1 - margin * 2)
        const img = this.sunnySvgImage

        const baseSc = Math.min(maxW / img.width, maxH / img.height)
        const mul = Math.max(0.2, Math.min(1, CONFIG.sunnyScale))
        const sc = baseSc * mul
        ctx.drawImage(
          img,
          (w - img.width * sc) / 2,
          (h - img.height * sc) / 2,
          img.width * sc,
          img.height * sc
        )
      }

      if (CONFIG.adaptiveSampling?.enabled) {
        const cfg = CONFIG.adaptiveSampling
        return this.sampleAdaptivePoints(draw, {
          minTileSize: cfg.sunny?.curveMinSize || cfg.minTileSize,
          maxTileSize: cfg.sunny?.strokeFillMaxSize || cfg.maxTileSize,
          contrastThreshold: cfg.contrastThreshold,
          maxDepth: cfg.maxDepth,
          alphaThreshold: CONFIG.sampling.sunnyAlphaThreshold
        })
      }

      const thresholds = [
        CONFIG.sampling.sunnyAlphaThreshold,
        Math.max(32, Math.floor(CONFIG.sampling.sunnyAlphaThreshold * 0.75)),
        32
      ]

      const wantsTile = CONFIG.compose.shapeInSunny === 'tile'
      const baseGrid = Number(
        CONFIG.compose.gridSize || CONFIG.compose.tileSize || 16
      )
      const grids = wantsTile
        ? [
            baseGrid,
            baseGrid * 0.9,
            baseGrid * 0.8,
            baseGrid * 0.7,
            baseGrid * 0.6
          ].map((v) => Math.max(4, Math.round(v)))
        : []

      if (wantsTile) {
        for (const th of thresholds) {
          for (const gs of grids) {
            const pts = this.sampleGridPoints(draw, gs, th)
            if (pts.length >= need) return pts
          }
        }
        for (const gs of grids) {
          const pts = this.sampleGridPoints(draw, gs, 32)
          if (pts.length >= need) return pts
        }
        return this.sampleGridPoints(
          draw,
          grids[grids.length - 1] || baseGrid,
          32
        )
      }

      for (const th of thresholds) {
        const pts = this.samplePoints(draw, 1, th)
        if (pts.length >= need) return pts
      }
      return this.samplePoints(draw, 1, 32)
    }

    const draw = (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      const fontSize = Math.min(w / 4.2, 380) * CONFIG.sunnyScale
      ctx.font = `${CONFIG.fontProperties.fontWeight} ${fontSize}px ${CONFIG.fontFamily}`

      // Attempt to set letter spacing if supported (Canvas 2D API extension)
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = CONFIG.fontProperties.letterSpacing
      } else {
        // Fallback for older browsers: basic CSS assignment (might not work for context)
        ctx.canvas.style.letterSpacing = CONFIG.fontProperties.letterSpacing
      }
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(CONFIG.sunnyText, w / 2, h / 2)
    }

    if (CONFIG.adaptiveSampling?.enabled) {
      const cfg = CONFIG.adaptiveSampling
      return this.sampleAdaptivePoints(draw, {
        minTileSize: cfg.sunny?.strokeEdgeMinSize || cfg.minTileSize,
        maxTileSize: cfg.sunny?.strokeFillMaxSize || cfg.maxTileSize,
        contrastThreshold: cfg.contrastThreshold,
        maxDepth: cfg.maxDepth,
        alphaThreshold: CONFIG.sampling.sunnyAlphaThreshold
      })
    }

    const thresholds = [
      CONFIG.sampling.sunnyAlphaThreshold,
      Math.max(32, Math.floor(CONFIG.sampling.sunnyAlphaThreshold * 0.75)),
      32
    ]
    for (const th of thresholds) {
      const pts = this.samplePoints(draw, 1, th)
      if (pts.length >= need) return pts
    }
    return this.samplePoints(draw, 1, 32)
  }

  // ─── 层 ───────────────────────────────────
  createLayers() {
    this.layers.background = new PIXI.Container()
    this.layers.microDust = new PIXI.Container()  // ★ 微粒子层 (最底)
    this.layers.dust = new PIXI.Container()
    this.layers.avatar = new PIXI.Container()
    this.layers.active = new PIXI.Container()
    this.app.stage.sortableChildren = true
    this.layers.background.zIndex = 0
    this.layers.microDust.zIndex = 1   // ★ 微粒子在普通粒子下面
    this.layers.dust.zIndex = 2
    this.layers.avatar.zIndex = 3
    this.layers.active.zIndex = 4
    this.app.stage.addChild(this.layers.background)
    this.app.stage.addChild(this.layers.microDust)
    this.app.stage.addChild(this.layers.dust)
    this.app.stage.addChild(this.layers.avatar)
    this.app.stage.addChild(this.layers.active)
  }

  createBackgroundStars() {
    const cfg = CONFIG.backgroundStars
    if (!cfg?.enabled) return
    if (!this.layers.background) return

    if (this.backgroundStarsLayer) {
      this.backgroundStarsLayer.destroy({ children: true })
      this.backgroundStarsLayer = null
    }

    const layer = new PIXI.Container()
    layer.alpha = 0
    layer.zIndex = 0
    layer.eventMode = 'none'
    this.layers.background.addChild(layer)
    this.backgroundStarsLayer = layer

    const w = window.innerWidth
    const h = window.innerHeight
    const total = Math.max(0, Math.floor(cfg.count || 0))
    const colors =
      Array.isArray(cfg.colors) && cfg.colors.length ? cfg.colors : [0xffffff]

    cfg.layers.forEach((l) => {
      const count = Math.floor(total * l.ratio)
      const g = new PIXI.Graphics()
      g.eventMode = 'none'

      for (let i = 0; i < count; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const rr = l.radiusRange || [1, 2]
        const r = rr[0] + Math.random() * (rr[1] - rr[0])
        const ar = l.alphaRange || [0.1, 0.3]
        const a = (ar[0] + Math.random() * (ar[1] - ar[0])) * (cfg.alpha ?? 1)
        const c = colors[Math.floor(Math.random() * colors.length)]
        g.beginFill(c, a)
        g.drawCircle(x, y, r)
        g.endFill()
      }

      layer.addChild(g)
    })

    layer.cacheAsBitmap = true
  }

  _generateSandTexture(size) {
    const s = Math.max(64, Math.floor(size || 256))
    const canvas = document.createElement('canvas')
    canvas.width = s
    canvas.height = s

    const ctx = canvas.getContext('2d')
    if (!ctx) return PIXI.Texture.WHITE

    const img = ctx.createImageData(s, s)
    const data = img.data

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 256)
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)

    ctx.globalAlpha = 0.08
    for (let i = 0; i < 10; i++) {
      ctx.drawImage(canvas, i * 2, 0)
    }
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = 'blur(1.5px)'
    ctx.drawImage(canvas, 0, 0)
    ctx.filter = 'none'

    const out = ctx.getImageData(0, 0, s, s)
    const outData = out.data
    for (let i = 0; i < outData.length; i += 4) {
      const v = outData[i]
      const c = Math.max(0, Math.min(255, 128 + (v - 128) * 1.15))
      outData[i] = c
      outData[i + 1] = c
      outData[i + 2] = c
      outData[i + 3] = 255
    }
    ctx.putImageData(out, 0, 0)

    return PIXI.Texture.from(canvas)
  }

  createBackgroundSand() {
    const cfg = CONFIG.backgroundSand
    if (!cfg?.enabled) return
    if (!this.layers.background) return

    if (this.backgroundSandLayer) {
      this.backgroundSandLayer.destroy({ children: true })
      this.backgroundSandLayer = null
      this.backgroundSandSprites = []
    }

    const layer = new PIXI.Container()
    layer.alpha = 0
    layer.zIndex = 0
    layer.eventMode = 'none'
    this.layers.background.addChild(layer)
    this.backgroundSandLayer = layer

    const tex = this._generateSandTexture(cfg.textureSize)
    const w = window.innerWidth
    const h = window.innerHeight

    const sprites = []
    for (let i = 0; i < cfg.layers.length; i++) {
      const l = cfg.layers[i]
      const sp = new PIXI.TilingSprite(tex, w, h)
      sp.eventMode = 'none'
      sp.tint = l.tint ?? 0xffffff
      sp.alpha = (l.alpha ?? 1) * (cfg.alpha ?? 1)
      const sc = l.scale ?? 1
      sp.tileScale.set(sc)
      sp.tilePosition.set(Math.random() * 999, Math.random() * 999)

      const tw = cfg.twinkle || { amplitude: 0, speedRange: [0, 0] }
      const phase = Math.random() * Math.PI * 2
      const sr = tw.speedRange || [0.2, 0.7]
      const twSpeed = sr[0] + Math.random() * (sr[1] - sr[0])
      sp.userData = {
        speed: Array.isArray(l.speed) ? l.speed : [0.1, 0.04],
        baseAlpha: sp.alpha,
        twAmp: tw.amplitude ?? 0,
        twPhase: phase,
        twSpeed
      }

      layer.addChild(sp)
      sprites.push(sp)
    }
    this.backgroundSandSprites = sprites
  }

  createAmbientDust() {
    const cfg = CONFIG.backgroundStars
    if (!cfg?.enabled) return
    const total = cfg.ambientDustCount || 400
    if (!this.layers.background) return

    if (this.ambientDustLayer) {
      this.ambientDustLayer.destroy({ children: true })
      this.ambientDustLayer = null
      this.ambientDustParticles = []
    }

    const layer = new PIXI.Container()
    layer.eventMode = 'none'
    layer.zIndex = 1 // 放在沙子层之上
    this.layers.background.addChild(layer)
    this.ambientDustLayer = layer

    CONFIG.starfield.layers.forEach((l) => {
      const count = Math.floor(total * l.ratio)
      for (let i = 0; i < count; i++) {
        const dust = new PIXI.Graphics()
        const color =
          CONFIG.starfield.colors[
            Math.floor(Math.random() * CONFIG.starfield.colors.length)
          ]
        dust.beginFill(color, 1)
        dust.drawCircle(0, 0, l.radius)
        dust.endFill()

        dust.x = Math.random() * window.innerWidth
        dust.y = Math.random() * window.innerHeight
        dust.alpha = 0
        const finalAlpha =
          (l.alphaRange[0] +
            Math.random() * (l.alphaRange[1] - l.alphaRange[0])) *
          0.6

        dust.userData = {
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          noiseOffset: Math.random() * 1000,
          speedMul: l.speedMul * 0.4,
          finalAlpha
        }

        layer.addChild(dust)
        this.ambientDustParticles.push(dust)
        gsap.to(dust, {
          alpha: finalAlpha,
          duration: 2 + Math.random() * 2,
          delay: Math.random() * 3
        })
      }
    })
  }

  _setBackgroundSandVisible(visible, immediate) {
    if (!this.backgroundSandLayer) return
    const cfg = CONFIG.backgroundSand
    const targetAlpha = visible ? 1 : 0
    gsap.killTweensOf(this.backgroundSandLayer)
    if (immediate) {
      this.backgroundSandLayer.alpha = targetAlpha
      return
    }
    gsap.to(this.backgroundSandLayer, {
      alpha: targetAlpha,
      duration: cfg.fadeDuration ?? 0.9,
      ease: 'power2.out'
    })
  }

  _updateBackgroundSandByPhase(immediate) {
    const cfg = CONFIG.backgroundSand
    if (!cfg?.enabled) return
    const visible =
      (this.phase === 'INTRO_TO_LOGO' && cfg.showInIntro) ||
      (this.phase === 'CONVERGE_TO_SUNNY' && cfg.showInConverge) ||
      (this.phase === 'FREE_FLOAT' && cfg.showInFree)
    this._setBackgroundSandVisible(visible, immediate)
  }

  _setBackgroundStarsVisible(visible, immediate) {
    if (!this.backgroundStarsLayer) return
    const cfg = CONFIG.backgroundStars
    const targetAlpha = visible ? 1 : 0

    gsap.killTweensOf(this.backgroundStarsLayer)
    if (immediate) {
      this.backgroundStarsLayer.alpha = targetAlpha
      return
    }
    gsap.to(this.backgroundStarsLayer, {
      alpha: targetAlpha,
      duration: cfg.fadeDuration ?? 0.9,
      ease: 'power2.out'
    })
  }

  _updateBackgroundStarsByPhase(immediate) {
    const cfg = CONFIG.backgroundStars
    if (!cfg?.enabled) return
    const visible =
      (this.phase === 'INTRO_TO_LOGO' && cfg.showInIntro) ||
      (this.phase === 'CONVERGE_TO_SUNNY' && cfg.showInConverge) ||
      (this.phase === 'FREE_FLOAT' && cfg.showInFree)
    this._setBackgroundStarsVisible(visible, immediate)
  }

  _updateBackgroundByPhase(immediate) {
    this._updateBackgroundStarsByPhase(immediate)
    this._updateBackgroundSandByPhase(immediate)
  }

  initEvents() {
    window.addEventListener('resize', (e) => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.handleResize(), 200)
    })
  }

  // 屏幕外随机起始点
  _randomEdgePoint() {
    const w = window.innerWidth,
      h = window.innerHeight
    const a = Math.random() * Math.PI * 2
    const r = Math.max(w, h) * (0.6 + Math.random() * 0.5)
    return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r }
  }

  // ─── 创建头像并飞入 Logo ────────────────────
  async createAvatars() {
    const total = this.employees.length
    let nextIdx = 0

    const worker = async () => {
      while (true) {
        const i = nextIdx++
        if (i >= total) return
        const id = this.employees[i]

        let tex = null
        try {
          tex = await PIXI.Assets.load(
            `${CONFIG.imagesFolder}${id}${CONFIG.imageExtension}`
          )
        } catch {}
        if (!tex) tex = this._makePlaceholder()

        // 创建 AvatarGroup
        const group = new AvatarGroup(id, tex)
        this.avatarsById.set(id, group)

        const instanceCount = this._instancesForEmployee(i)
        const baseGlobalIndex = this.employeeInstanceOffsets?.[i] ?? i
        for (let k = 0; k < instanceCount; k++) {
          const globalIndex = baseGlobalIndex + k
          const inst = this._createInstance(id, tex, k, globalIndex)
          if (k === 0) group.anchor = inst
          else group.ambient.push(inst)
          this.introAvatarRemaining++
          this._flyAvatarToLogo(inst, globalIndex)
        }

        if (i % 50 === 0) console.log(`[Avatar] ${i + 1}/${total}`)
      }
    }
    await Promise.all(Array.from({ length: 10 }, () => worker()))
  }

  _createInstance(employeeId, texture, instanceIndex, globalIndex) {
    const role = instanceIndex === 0 ? 'anchor' : 'ambient'
    const instance = new AvatarInstance(employeeId, role, instanceIndex)
    instance.globalIndex = globalIndex
    const rng = new SeededRandom(instance.visualSeed)

    instance.depth = Math.pow(rng.next(), 1.5)
    const scaleRange =
      role === 'anchor'
        ? CONFIG.avatarSwarm.anchorScaleRange
        : CONFIG.avatarSwarm.dupScaleRange
    const alphaRange =
      role === 'anchor'
        ? CONFIG.avatarSwarm.anchorAlphaRange
        : CONFIG.avatarSwarm.dupAlphaRange

    instance.baseScale = rng.range(scaleRange[0], scaleRange[1])
    instance.baseAlpha = rng.range(alphaRange[0], alphaRange[1])
    instance.noiseOffset = rng.next() * 1000

    const borderColor = rng.choice(CONFIG.avatarSwarm.borderPalette)
    const borderWidth = rng.range(1.0, 2.2)
    const borderAlpha = rng.range(0.75, 0.98)

    const g = new PIXI.Graphics()
    const start = this._randomEdgePoint()
    g.x = start.x
    g.y = start.y
    g.alpha = 0
    g.scale.set(CONFIG.compose.shapeInLogo === 'tile' ? 1 : instance.baseScale)

    g.userData = {
      instance,
      id: employeeId,
      index: globalIndex,
      state: 'INTRO',
      vx: 0,
      vy: 0,
      baseScale: instance.baseScale,
      noiseOffset: instance.noiseOffset,
      texture,
      targetSize: CONFIG.avatarSize * instance.baseScale,
      shapeMode: CONFIG.compose.shapeInLogo === 'tile' ? 'tile' : 'avatar',
      baseBorderColor: borderColor,
      border: { width: borderWidth, color: borderColor, alpha: borderAlpha }
    }

    this.redrawAvatarGraphic(g)
    this.layers.avatar.addChild(g)
    instance.displayObject = g

    return instance
  }

  _flyAvatarToLogo(instance, globalIndex) {
    const g = instance.displayObject
    const target = this.logoAvatarTargets[globalIndex]
    if (!target) {
      instance.state = 'IDLE'
      if (g?.userData) g.userData.state = 'IDLE'
      this.introAvatarRemaining--
      return
    }

    // ★ 记录目标 tile 尺寸
    if (g.userData && target.tileSize) {
      g.userData.tileSize = target.tileSize
      this.redrawAvatarGraphic(g)
    }

    const delay = globalIndex * 0.005
    gsap.fromTo(
      g,
      { alpha: 0 },
      {
        alpha: instance.baseAlpha, // 使用实例的固定 alpha
        duration: 0.3,
        delay,
        ease: 'power2.out'
      }
    )
    gsap.fromTo(
      g.scale,
      { x: 0.1, y: 0.1 },
      {
        x: instance.baseScale,
        y: instance.baseScale,
        duration: 0.7,
        delay,
        ease: 'expo.out'
      }
    )
    gsap.to(g, {
      x: target.x,
      y: target.y,
      duration: 1.7,
      delay,
      ease: 'expo.out',
      onComplete: () => {
        instance.state = 'IDLE'
        if (g?.userData) {
          g.userData.state = 'IDLE'
          g.userData.vx = (Math.random() - 0.5) * 1.5
          g.userData.vy = (Math.random() - 0.5) * 1.5
        }
        this.introAvatarRemaining--
        this._tryFinishIntro()
      }
    })
  }

  // ─── 创建粒子并飞入 Logo ────────────────────
  createDust() {
    const total = CONFIG.dustCount
    const container = new PIXI.Container()
    this.layers.dust.addChild(container)

    CONFIG.starfield.layers.forEach((layer) => {
      const count = Math.floor(total * layer.ratio)

      for (let i = 0; i < count; i++) {
        const dust = new PIXI.Graphics()
        const color =
          CONFIG.starfield.colors[
            Math.floor(Math.random() * CONFIG.starfield.colors.length)
          ]

        dust.beginFill(color, 1)
        dust.drawCircle(0, 0, layer.radius)
        dust.endFill()

        const start = this._randomEdgePoint()
        dust.x = start.x
        dust.y = start.y
        dust.alpha = 0

        const finalAlpha =
          layer.alphaRange[0] +
          Math.random() * (layer.alphaRange[1] - layer.alphaRange[0])

        dust.userData = {
          vx: 0,
          vy: 0,
          noiseOffset: Math.random() * 1000,
          speedMul: layer.speedMul, // 关键：运动视差
          layer: layer.radius,
          finalAlpha
        }

        container.addChild(dust)
        this.dustParticles.push(dust)

        // 飞入动画
        this.introDustRemaining++
        this._flyDustToLogo(dust, this.dustParticles.length - 1, finalAlpha)
      }
    })
  }

  // ★ 创建微粒子并飞入射线尖端
  createMicroDust() {
    const cfg = CONFIG.microDust
    if (!cfg?.enabled) return
    if (!this.logoMicroDustTargets || this.logoMicroDustTargets.length === 0) return

    const container = new PIXI.Container()
    this.layers.microDust.addChild(container)

    const colors = cfg.colors || [0xffd700, 0xffffff]
    const total = Math.min(cfg.count, this.logoMicroDustTargets.length)

    for (let i = 0; i < total; i++) {
      const target = this.logoMicroDustTargets[i]
      const dust = new PIXI.Graphics()

      // 根据tipRatio选择颜色：越靠近尖端越亮
      const colorIdx = target.tipRatio > 0.7
        ? Math.floor(Math.random() * 2) + 2  // 偏向白色
        : Math.floor(Math.random() * colors.length)
      const color = colors[Math.min(colorIdx, colors.length - 1)]

      const radius = target.size || cfg.radiusRange[0]

      dust.beginFill(color, 1)
      dust.drawCircle(0, 0, radius)
      dust.endFill()

      const start = this._randomEdgePoint()
      dust.x = start.x
      dust.y = start.y
      dust.alpha = 0

      // 尖端粒子透明度更高（更亮）
      const alphaRange = cfg.alphaRange
      const baseAlpha = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0])
      const finalAlpha = baseAlpha * (0.7 + target.tipRatio * 0.3)

      dust.userData = {
        vx: 0,
        vy: 0,
        noiseOffset: Math.random() * 1000,
        speedMul: 0.2 + Math.random() * 0.3,  // 微粒子移动更慢
        layer: radius,
        finalAlpha,
        isMicroDust: true,
        tipRatio: target.tipRatio
      }

      container.addChild(dust)
      this.microDustParticles.push(dust)

      // 飞入动画
      this.introMicroDustRemaining++
      this._flyMicroDustToLogo(dust, target, finalAlpha, i)
    }

    console.log(`[MicroDust] 创建了 ${this.microDustParticles.length} 个微粒子`)
  }

  _flyMicroDustToLogo(dust, target, finalAlpha, index) {
    // 微粒子飞入稍晚，形成层次感
    const delay = 1.8 + index * 0.0002

    gsap.fromTo(
      dust,
      { alpha: 0 },
      { alpha: finalAlpha, duration: 0.4, delay, ease: 'power2.out' }
    )

    gsap.to(dust, {
      x: target.x,
      y: target.y,
      duration: 2.2,
      delay,
      ease: 'expo.out',
      onComplete: () => {
        dust.userData.vx = (Math.random() - 0.5) * 0.3
        dust.userData.vy = (Math.random() - 0.5) * 0.3
        this.introMicroDustRemaining--
        this._tryFinishIntro()
      }
    })
  }

  _flyDustToLogo(dust, index, finalAlpha) {
    const target = this.logoDustTargets[index]
    if (!target) {
      this.introDustRemaining--
      return
    }

    // ★ 记录目标 tile 尺寸并重绘（限制粒子最大尺寸）
    if (dust.userData && target.tileSize) {
      dust.userData.tileSize = target.tileSize
      // 粒子重绘（如果它不是 Graphics 而是简单的圆）
      if (dust instanceof PIXI.Graphics) {
        dust.clear()
        const color = CONFIG.starfield.colors[Math.floor(Math.random() * CONFIG.starfield.colors.length)]
        dust.beginFill(color, 1)
        // ★ 限制粒子最大半径，粒子应该是小型填充物
        const maxRadius = CONFIG.dustMaxRadius || 5
        const radius = Math.min(target.tileSize / 2, maxRadius)
        dust.drawCircle(0, 0, radius)
        dust.endFill()
      }
    }

    const delay = 1.6 + index * 0.0003

    gsap.fromTo(
      dust,
      { alpha: 0 },
      { alpha: finalAlpha, duration: 0.35, delay, ease: 'power2.out' }
    )

    gsap.to(dust, {
      x: target.x,
      y: target.y,
      duration: 2.0,
      delay,
      ease: 'expo.out',
      onComplete: () => {
        dust.userData.vx = (Math.random() - 0.5) * 0.8
        dust.userData.vy = (Math.random() - 0.5) * 0.8
        this.introDustRemaining--
        this._tryFinishIntro()
      }
    })
  }

  // 头像和粒子都到位后才切换
  _tryFinishIntro() {
    if (this.phase !== 'INTRO_TO_LOGO') return
    // ★ 包含微粒子检查
    if (this.introAvatarRemaining <= 0 &&
        this.introDustRemaining <= 0 &&
        this.introMicroDustRemaining <= 0) {
      gsap.delayedCall(0.7, () => {
        if (this.phase !== 'INTRO_TO_LOGO') return
        console.log('[Phase] → EXPLODING')
        this.explodeToSpace()
      })
    }
  }

  // ─── 爆炸散开（星空效果） ──────────────────
  explodeToSpace() {
    this.phase = 'EXPLODING'
    this._updateBackgroundByPhase(false)

    this._setAllAvatarShapeMode(
      CONFIG.compose.shapeInFree === 'tile' ? 'tile' : 'avatar'
    )

    const avatars = []
    this.avatarsById.forEach((group) => {
      if (group.anchor?.displayObject) avatars.push(group.anchor.displayObject)
      group.ambient.forEach((inst) => {
        if (inst.displayObject) avatars.push(inst.displayObject)
      })
    })
    // ★ 包含微粒子
    const allParticles = [...avatars, ...this.dustParticles, ...this.microDustParticles]
    let completedCount = 0
    const total = allParticles.length

    allParticles.forEach((p, i) => {
      // 随机全屏目标点
      const tx = Math.random() * window.innerWidth
      const ty = Math.random() * window.innerHeight

      gsap.to(p, {
        x: tx,
        y: ty,
        duration: 1.5 + Math.random() * 1.0, // 1.5~2.5s
        ease: 'expo.out',
        delay: Math.random() * 0.3, // 稍微错开
        onComplete: () => {
          // 恢复随机初速度，衔接流场
          const speed = p.userData?.isMicroDust ? 1 : 2
          p.userData.vx = (Math.random() - 0.5) * speed
          p.userData.vy = (Math.random() - 0.5) * speed

          completedCount++
          if (completedCount >= total) {
            this.phase = 'FREE_FLOAT'
            this._updateBackgroundByPhase(false)
            console.log('[Phase] → FREE_FLOAT')
            this.scheduler.process()
          }
        }
      })
    })
  }

  _makePlaceholder() {
    const g = new PIXI.Graphics()
    g.beginFill(CONFIG.colors.gold)
    g.drawCircle(50, 50, 50)
    g.endFill()
    return this.app.renderer.generateTexture(g)
  }

  // ─── 帧更新 ───────────────────────────────
  update(delta) {
    const time = Date.now() * 0.001

    if (this.backgroundSandLayer && this.backgroundSandLayer.alpha > 0.001) {
      this.backgroundSandSprites.forEach((sp) => {
        const ud = sp.userData
        if (!ud) return
        const sx = ud.speed?.[0] ?? 0
        const sy = ud.speed?.[1] ?? 0
        sp.tilePosition.x += sx * delta
        sp.tilePosition.y += sy * delta
        const tw = ud.twAmp ?? 0
        if (tw > 0) {
          sp.alpha =
            ud.baseAlpha *
            (1 -
              tw +
              tw * (0.5 + 0.5 * Math.sin(time * ud.twSpeed + ud.twPhase)))
        }
      })
    }

    this.ambientDustParticles.forEach((p) => {
      const ud = p.userData
      if (!ud) return
      p.x += ud.vx * delta
      p.y += ud.vy * delta

      const w = window.innerWidth,
        h = window.innerHeight
      const m = 20
      if (p.x < -m) p.x = w + m
      else if (p.x > w + m) p.x = -m
      if (p.y < -m) p.y = h + m
      else if (p.y > h + m) p.y = -m
    })

    if (this.phase !== 'FREE_FLOAT') {
      if (this.phase === 'CONVERGE_TO_SUNNY') {
        const pulse = 0.99 + 0.02 * Math.sin(time * 1.5)
        this.avatarsById.forEach((group) => {
          const list = [group.anchor, ...group.ambient]
          list.forEach((inst) => {
            const p = inst.displayObject
            if (p && p.userData.shapeMode === 'tile') {
              p.scale.set(pulse)
            }
          })
        })
      }
      return
    }

    this.avatarsById.forEach((group) => {
      const list = [group.anchor, ...group.ambient]
      list.forEach((inst) => {
        if (!inst?.displayObject) return
        if (inst.state === 'IDLE' || inst.state === 'SIGNED') {
          const speedMul = 0.7 + inst.depth * 0.6
          this.applyFlowField(inst.displayObject, time, speedMul, delta)
        }
      })
    })

    this.dustParticles.forEach((p) => {
      const sm = p.userData?.speedMul
      this.applyFlowField(p, time, typeof sm === 'number' ? sm : 0.5, delta)
    })

    // ★ 微粒子也参与流场运动
    this.microDustParticles.forEach((p) => {
      const sm = p.userData?.speedMul
      this.applyFlowField(p, time, typeof sm === 'number' ? sm : 0.3, delta)
    })
  }

  applyFlowField(p, time, speedMul, delta) {
    const ud = p.userData

    const ns = CONFIG.noiseScale
    const tt = time * CONFIG.flowTimeScale
    const o = ud.noiseOffset * 0.01
    const x = p.x * ns + o
    const y = p.y * ns + o
    const e = CONFIG.flowEps

    const nx1 = Noise.perlin2(x + e, y + tt)
    const nx2 = Noise.perlin2(x - e, y + tt)
    const ny1 = Noise.perlin2(x, y + e + tt)
    const ny2 = Noise.perlin2(x, y - e + tt)

    const gx = (nx1 - nx2) / (2 * e)
    const gy = (ny1 - ny2) / (2 * e)

    const fx = -gy * CONFIG.flowStrength * speedMul
    const fy = gx * CONFIG.flowStrength * speedMul

    ud.vx += fx * delta
    ud.vy += fy * delta

    const jitter = CONFIG.flowJitter * speedMul
    ud.vx += (Math.random() - 0.5) * jitter * delta
    ud.vy += (Math.random() - 0.5) * jitter * delta

    const fr = Math.pow(CONFIG.flowFriction, delta)
    ud.vx *= fr
    ud.vy *= fr

    const maxSpeed = CONFIG.flowMaxSpeed * speedMul
    const sp2 = ud.vx * ud.vx + ud.vy * ud.vy
    const ms2 = maxSpeed * maxSpeed
    if (sp2 > ms2) {
      const s = Math.sqrt(sp2)
      const r = maxSpeed / s
      ud.vx *= r
      ud.vy *= r
    }

    p.x += ud.vx * delta
    p.y += ud.vy * delta

    const w = window.innerWidth,
      h = window.innerHeight
    const m = CONFIG.flowWrapMargin
    if (p.x < -m) p.x = w + m
    else if (p.x > w + m) p.x = -m
    if (p.y < -m) p.y = h + m
    else if (p.y > h + m) p.y = -m
  }

  // ─── 签名动画 ─────────────────────────────
  animateSignature(id, duration, onComplete) {
    console.log('触发签名动画:', id)
    if (this.phase !== 'FREE_FLOAT' || this.isConverged) {
      onComplete()
      return
    }

    const group = this.avatarsById.get(id)
    if (!group || this.signedIds.has(id)) {
      onComplete()
      return
    }

    let completedCount = 0
    const instances = [group.anchor, ...group.ambient]
    const totalInstances = instances.length

    const onInstanceComplete = () => {
      completedCount++
      if (completedCount >= totalInstances) {
        this.signedIds.add(id)
        if (this.signedIds.size >= this.employees.length) {
          this.forceConverge()
        }
        onComplete()
      }
    }

    instances.forEach((inst) => {
      const microDelay = Math.random() * 0.3
      this._animateInstance(inst, duration, microDelay, onInstanceComplete)
    })
  }

  _animateInstance(instance, duration, delay, onComplete) {
    const p = instance?.displayObject
    if (!p) {
      onComplete()
      return
    }

    instance.state = 'SIGNING'
    if (p.userData) p.userData.state = 'SIGNING'

    const bs = instance.baseScale
    const highlightBorder = {
      width: 3,
      color: CONFIG.colors.highlight,
      alpha: 1
    }
    const signedBorder = {
      width: 2.5,
      color: CONFIG.colors.signed,
      alpha: 1,
      glowWidth: 4,
      glowAlpha: 0.5
    }

    gsap
      .timeline({
        delay,
        onComplete: () => {
          instance.state = 'SIGNED'
          if (p.userData) p.userData.state = 'SIGNED'
          p.scale.set(bs * 1.25)
          this.redrawAvatarGraphic(p, signedBorder)
          onComplete()
        }
      })
      .call(() => {
        this.redrawAvatarGraphic(p, highlightBorder)
      })
      .to(p.scale, {
        x: bs * CONFIG.animation.signatureScale,
        y: bs * CONFIG.animation.signatureScale,
        duration: 0.25,
        ease: 'back.out(1.7)'
      })
      .to(p.scale, {
        x: bs * 1.25,
        y: bs * 1.25,
        duration: 0.22,
        ease: 'power2.out'
      })
      .to({}, { duration })
  }

  // ─── WebSocket ────────────────────────────
  connectSocket() {
    // 本地Mock模式：跳过WebSocket连接
    if (IS_LOCAL_MOCK) {
      console.log('[Mock] 本地Mock模式，跳过WebSocket连接')
      console.log('[Mock] 提示：可使用 test-tool.html 手动触发签名事件')
      return
    }

    // 正式环境：建立WebSocket连接
    try {
      const ws = new WebSocket(CONFIG.api.socket)
      ws.onopen = () => {
        console.log('[WS] 连接成功')
      }
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data)
          console.log('[WS] 收到消息:', d)
          if (d.employeeId) {
            this.scheduler.push(d.employeeId)
          } else if (d.type === 'reset') {
            this.resetWall()
          } else if (d.type === 'converge') {
            this.forceConverge()
          }
        } catch (error) {
          console.error('[WS] 消息解析错误:', error)
        }
      }
      ws.onerror = (error) => {
        console.error('[WS] 连接错误:', error)
      }
      ws.onclose = () => {
        console.log('[WS] 连接关闭，尝试重连...')
        setTimeout(() => this.connectSocket(), 3000)
      }
      this.socket = ws
    } catch (error) {
      console.error('[WS] 无法连接:', error)
      setTimeout(() => this.connectSocket(), 3000)
    }
  }

  // ─── 重置 ─────────────────────────────────
  resetWall() {
    this.isConverged = false
    this.scheduler.isConverging = false
    this.scheduler.queue.length = 0
    this.scheduler.processing.clear()
    this.signedIds.clear()
    this.phase = 'INTRO_TO_LOGO'
    this._updateBackgroundByPhase(true)
    this.introAvatarRemaining = 0
    this.introDustRemaining = 0
    this.introMicroDustRemaining = 0  // ★ 重置微粒子计数

    // 头像重新从外侧飞入
    this.avatarsById.forEach((group) => {
      const list = [group.anchor, ...group.ambient]
      list.forEach((inst) => {
        const p = inst?.displayObject
        if (!p) return

        gsap.killTweensOf(p)
        gsap.killTweensOf(p.scale)

        inst.state = 'INTRO'
        if (p.userData) p.userData.state = 'INTRO'
        p.visible = true
        p.userData.shapeMode =
          CONFIG.compose.shapeInLogo === 'tile' ? 'tile' : 'avatar'
        p.scale.set(p.userData.shapeMode === 'tile' ? 1 : inst.baseScale)
        p.alpha = 0

        const s = this._randomEdgePoint()
        p.x = s.x
        p.y = s.y
        if (p.userData) {
          p.userData.vx = 0
          p.userData.vy = 0
        }

        const bc = p.userData?.baseBorderColor ?? p.userData?.border?.color
        this.redrawAvatarGraphic(p, {
          width: 1.5,
          color: bc,
          alpha: 0.95
        })
        this.layers.avatar.addChild(p)

        this.introAvatarRemaining++
        this._flyAvatarToLogo(inst, inst.globalIndex)
      })
    })

    // 粒子也重新飞入
    this.dustParticles.forEach((p, i) => {
      gsap.killTweensOf(p)
      const s = this._randomEdgePoint()
      p.x = s.x
      p.y = s.y
      p.userData.vx = 0
      p.userData.vy = 0
      this.introDustRemaining++
      this._flyDustToLogo(p, i, p.userData?.finalAlpha)
    })

    // ★ 微粒子也重新飞入
    this.microDustParticles.forEach((p, i) => {
      gsap.killTweensOf(p)
      const s = this._randomEdgePoint()
      p.x = s.x
      p.y = s.y
      p.userData.vx = 0
      p.userData.vy = 0
      const target = this.logoMicroDustTargets[i]
      if (target) {
        this.introMicroDustRemaining++
        this._flyMicroDustToLogo(p, target, p.userData?.finalAlpha, i)
      }
    })
  }

  // ─── 汇聚为 SUNNY ─────────────────────────
  forceConverge() {
    if (this.isConverged) return
    this.isConverged = true
    this.scheduler.isConverging = true
    this.phase = 'CONVERGE_TO_SUNNY'
    this._updateBackgroundByPhase(false)
    console.log('🚀 → CONVERGE_TO_SUNNY')
    this.calculateCompositionTargets()

    this._setAllAvatarShapeMode(
      CONFIG.compose.shapeInSunny === 'tile' ? 'tile' : 'avatar'
    )

    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }

    // 头像飞向 SUNNY (径向波)
    this.avatarsById.forEach((group) => {
      const list = [group.anchor, ...group.ambient]

      list.forEach((inst) => {
        const p = inst?.displayObject
        if (!p) return

        gsap.killTweensOf(p)
        gsap.killTweensOf(p.scale)

        const t = this.sunnyAvatarTargets[inst.globalIndex]
        if (!t) return

        // ★ 记录目标 tile 尺寸
        if (p.userData && t.tileSize) {
          p.userData.tileSize = t.tileSize
        }

        const delay = this._calculateRadialDelay(t, center)
        gsap.to(p, {
          x: t.x,
          y: t.y,
          duration: 2.2,
          ease: 'power4.inOut',
          delay
        })
        const ca =
          inst.role === 'anchor'
            ? CONFIG.avatarSwarm.convergeAlpha.anchor
            : CONFIG.avatarSwarm.convergeAlpha.dup
        gsap.to(p, {
          alpha: ca,
          duration: 1.6,
          ease: 'power2.out',
          delay
        })
        gsap.to(p.scale, {
          x: CONFIG.compose.shapeInSunny === 'tile' ? 1 : inst.baseScale * 0.85,
          y: CONFIG.compose.shapeInSunny === 'tile' ? 1 : inst.baseScale * 0.85,
          duration: 2.2,
          ease: 'power4.inOut',
          delay
        })

        inst.state = 'CONVERGED'
        if (p.userData) p.userData.state = 'CONVERGED'

        // ★ 使用渐变颜色和更细的边框
        const visualCfg = CONFIG.sunnyVisual || {}
        const useGradient = visualCfg.useGradient !== false

        // 根据目标位置计算颜色
        const bc = useGradient
          ? this._getSunnyGradientColor(t.x, t.y, center)
          : CONFIG.colors.signed

        // 更细的边框
        const bw = inst.role === 'anchor'
          ? (visualCfg.borderWidthAnchor || 1.5)
          : (visualCfg.borderWidth || 1.2)

        // 外发光配置
        const glowW = visualCfg.glowEnabled ? (visualCfg.glowWidth || 3) : 0
        const glowA = visualCfg.glowAlpha || 0.35

        this.redrawAvatarGraphic(p, {
          width: bw,
          color: bc,
          alpha: 1,
          glowWidth: glowW,
          glowAlpha: glowA
        })
      })
    })

    // 粒子飞向 SUNNY
    this.dustParticles.forEach((p, i) => {
      gsap.killTweensOf(p)
      const t = this.sunnyDustTargets[i]
      if (!t) return

      // ★ 记录目标 tile 尺寸并重绘（限制粒子最大尺寸）
      if (p.userData && t.tileSize) {
        p.userData.tileSize = t.tileSize
        if (p instanceof PIXI.Graphics) {
          p.clear()
          const color = CONFIG.starfield.colors[Math.floor(Math.random() * CONFIG.starfield.colors.length)]
          p.beginFill(color, 1)
          // ★ 限制粒子最大半径
          const maxRadius = CONFIG.dustMaxRadius || 5
          const radius = Math.min(t.tileSize / 2, maxRadius)
          p.drawCircle(0, 0, radius)
          p.endFill()
        }
      }

      const delay = this._calculateRadialDelay(t, center, 1.1)
      gsap.to(p, {
        x: t.x,
        y: t.y,
        alpha: 0.6 + Math.random() * 0.4,
        duration: 2.8,
        ease: 'power2.inOut',
        delay
      })
    })

    // ★ 微粒子在汇聚时渐渐消失（SUNNY字形不需要微粒子）
    this.microDustParticles.forEach((p) => {
      gsap.killTweensOf(p)
      gsap.to(p, {
        alpha: 0,
        duration: 1.5,
        ease: 'power2.out',
        delay: Math.random() * 0.5
      })
    })
  }

  _calculateRadialDelay(target, center, maxDelay = 0.8) {
    const dx = target.x - center.x
    const dy = target.y - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDist = Math.sqrt(
      Math.pow(window.innerWidth / 2, 2) + Math.pow(window.innerHeight / 2, 2)
    )

    // 归一化距离 → 延迟（0 ~ 0.8s）
    const baseDelay = (distance / maxDist) * maxDelay

    // 添加小抖动（±0.05s）
    const jitter = (Math.random() - 0.5) * 0.1

    return Math.max(0, baseDelay + jitter)
  }

  // ★ 根据位置计算SUNNY渐变颜色
  _getSunnyGradientColor(x, y, center) {
    const gradient = CONFIG.colors.sunnyGradient
    if (!gradient || gradient.length === 0) {
      return CONFIG.colors.signed || CONFIG.colors.gold
    }

    const mode = CONFIG.sunnyVisual?.gradientMode || 'random'

    if (mode === 'random') {
      // ★ 随机模式：从渐变色板中随机选择，但偏向金色系（索引2-4）
      // 这样产生自然的颜色混合，避免位置导致的不均匀
      const weights = [0.05, 0.1, 0.35, 0.3, 0.2]  // 偏向金色和橙金
      const rand = Math.random()
      let cumulative = 0
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i]
        if (rand < cumulative) {
          return gradient[Math.min(i, gradient.length - 1)]
        }
      }
      return gradient[2]  // 默认金色
    }

    if (mode === 'uniform') {
      // ★ 统一模式：使用基础金色，加轻微随机变化
      const baseColor = gradient[2] || CONFIG.colors.gold  // 金色
      // 微调亮度
      const variation = 0.9 + Math.random() * 0.2  // 0.9 ~ 1.1
      return this._adjustColorBrightness(baseColor, variation)
    }

    // radial 模式（原来的逻辑，从中心向外渐变）
    const dx = x - center.x
    const dy = y - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.35
    const t = Math.min(1, distance / maxDist)
    const colorIndex = Math.min(
      gradient.length - 1,
      Math.floor(t * gradient.length)
    )
    return gradient[colorIndex]
  }

  // ★ 调整颜色亮度
  _adjustColorBrightness(color, factor) {
    const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
    const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
    const b = Math.min(255, Math.round((color & 0xff) * factor))
    return (r << 16) | (g << 8) | b
  }

  // ★ 颜色插值（用于更平滑的渐变）
  _lerpColor(color1, color2, t) {
    const r1 = (color1 >> 16) & 0xff
    const g1 = (color1 >> 8) & 0xff
    const b1 = color1 & 0xff

    const r2 = (color2 >> 16) & 0xff
    const g2 = (color2 >> 8) & 0xff
    const b2 = color2 & 0xff

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return (r << 16) | (g << 8) | b
  }

  // ─── Resize ───────────────────────────────
  handleResize() {
    this.resizeTimer = null
    this.app.renderer.resize(window.innerWidth, window.innerHeight)
    this.createBackgroundStars()
    this.createBackgroundSand()
    this.createAmbientDust()
    this._updateBackgroundByPhase(true)
    this.planAvatarInstances()
    this.calculateCompositionTargets()

    // 已汇聚状态下直接吸到新坐标
    if (this.isConverged) {
      this.avatarsById.forEach((group) => {
        const list = [group.anchor, ...group.ambient]
        list.forEach((inst) => {
          const p = inst?.displayObject
          if (!p) return
          const t = this.sunnyAvatarTargets[inst.globalIndex]
          if (t) {
            p.x = t.x
            p.y = t.y
          }
        })
      })
      this.dustParticles.forEach((p, i) => {
        const t = this.sunnyDustTargets[i]
        if (t) {
          p.x = t.x
          p.y = t.y
        }
      })
    }
  }
}

window.onload = () => {
  window.wall = new SignatureWall()
}
