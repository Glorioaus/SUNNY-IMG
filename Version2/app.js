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

  // 头像尺寸。300个头像 + 2500个粒子 共同填充图案。
  // 头像 22px，粒子半径 3px，这样粒子能填进头像间隙而不会把头像盖住。
  avatarSize: 22,
  dustCount: 2500,
  starfield: {
    layers: [
      { radius: 1, ratio: 0.65, alphaRange: [0.2, 0.5], speedMul: 0.3 },
      { radius: 2, ratio: 0.28, alphaRange: [0.4, 0.7], speedMul: 0.6 },
      { radius: 3, ratio: 0.07, alphaRange: [0.6, 1.0], speedMul: 1.0 }
    ],
    colors: [0xffffff, 0xffd700, 0xffa500]
  },

  colors: {
    gold: 0xffd700,
    highlight: 0x00bfff,
    signed: 0x00bfff
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
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {}
        }
        mergeDeep(target[key], sv)
        return
      }
      target[key] = sv
    })
  }

  if (typeof window !== 'undefined' && window.SUNNY_CONFIG) {
    if (hasDeep(window.SUNNY_CONFIG, ['sunnyScale'])) sources.sunnyScale = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['avatarSwarm', 'targetTotalInstances'])) sources.population = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['sampling', 'sunnyAlphaThreshold'])) sources.sunnyTh = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['sampling', 'logoAlphaThreshold'])) sources.logoTh = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['showHUD'])) sources.showHUD = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['fontProperties', 'letterSpacing'])) sources.spacing = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['fontProperties', 'fontWeight'])) sources.weight = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['animation', 'signatureScale'])) sources.sigScale = 'config'
    if (hasDeep(window.SUNNY_CONFIG, ['animation', 'signatureDuration'])) sources.sigTime = 'config'
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
    CONFIG.avatarSwarm.targetTotalInstances = Math.max(1, Math.floor(targetInstances))
    sources.population = 'url'
  }

  const maxPerEmployee = getNumberParam(params, 'maxPerEmployee')
  if (typeof maxPerEmployee === 'number' && maxPerEmployee > 0) {
    CONFIG.avatarSwarm.maxInstancesPerEmployee = Math.max(1, Math.floor(maxPerEmployee))
  }

  const alphaTh = getNumberParam(params, 'alphaTh')
  if (typeof alphaTh === 'number') {
    const v = Math.max(0, Math.min(255, Math.floor(alphaTh)))
    CONFIG.sampling.logoAlphaThreshold = v
    CONFIG.sampling.sunnyAlphaThreshold = v
  }

  const logoTh = getNumberParam(params, 'logoTh')
  if (typeof logoTh === 'number') {
    CONFIG.sampling.logoAlphaThreshold = Math.max(0, Math.min(255, Math.floor(logoTh)))
    sources.logoTh = 'url'
  }

  const sunnyTh = getNumberParam(params, 'sunnyTh')
  if (typeof sunnyTh === 'number') {
    CONFIG.sampling.sunnyAlphaThreshold = Math.max(0, Math.min(255, Math.floor(sunnyTh)))
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

  const sigTime = getNumberParam(params, 'sigTime') || getNumberParam(params, 'sigDuration')
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
    hud.style.font = '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
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
    this.seed = Number.isFinite(s) ? (s >>> 0) : 1
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
    return (hash >>> 0) || 1
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

            const rushMode = this.queue.length > 5;
            // Use signatureDuration from config or fallback to original logic
            const baseDuration = CONFIG.animation?.signatureDuration || CONFIG.scheduler.highlightDuration;
            const duration = rushMode ? 0.3 : baseDuration;
    
            this.wall.animateSignature(id, duration, () => {      this.processing.delete(id)
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

    this.resizeTimer = null
    this.phase = 'INTRO_TO_LOGO'
    this.logoImage = null

    // intro 阶段用倒计数决定"全部到位后"何时切换状态
    this.introAvatarRemaining = 0
    this.introDustRemaining = 0

    this.signedIds = new Set()
    this.isConverged = false

    this.layers = { dust: null, avatar: null, active: null }

    this.init()
  }

  // ─── 画头像圆 ─────────────────────────────
  redrawAvatarGraphic(g, borderStyle) {
    const ud = g.userData
    const size = ud.targetSize
    const texture = ud.texture

    g.clear()

    const s = size / texture.width
    const matrix = new PIXI.Matrix()
    matrix.scale(s, s)
    matrix.translate(-size / 2, -size / 2)

    g.beginTextureFill({ texture, matrix })
    g.drawCircle(0, 0, size / 2)
    g.endFill()

    const bw = borderStyle?.width ?? ud.border.width
    const bc = borderStyle?.color ?? ud.border.color
    const ba = borderStyle?.alpha ?? ud.border.alpha
    g.lineStyle(bw, bc, ba)
    g.drawCircle(0, 0, size / 2)

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
    this.initEvents()

    await document.fonts.ready
    await this.loadEmployeeData()
    await this.loadLogoImage()

    this.planAvatarInstances()

    // ★ 先算好全部目标坐标，再创建头像和粒子
    this.calculateCompositionTargets()

    await this.createAvatars() // 头像飞入 Logo
    this.createDust() // 粒子飞入 Logo

    this.connectSocket()
    this.app.ticker.add((delta) => this.update(delta))

    console.log('☀️ SUNNY Signature Wall Ready.')
  }

  planAvatarInstances() {
    const employeeCount = this.employees.length
    const target = CONFIG.avatarSwarm.targetTotalInstances
    const maxPerEmployee = CONFIG.avatarSwarm.maxInstancesPerEmployee
    const total = Math.max(employeeCount, Math.min(target, employeeCount * maxPerEmployee))

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
      console.warn('[Logo] 加载失败，用文字替代')
      this.logoImage = null
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

    const canvasW = 1200
    const canvasH = Math.round(canvasW * (screenH / screenW))

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
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

  _hashToSeed(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    return (hash >>> 0) || 1
  }

  _shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  _pickEvenIndices(points, count, cellSize, rng) {
    if (count <= 0) return []
    if (points.length <= count) return Array.from({ length: points.length }, (_, i) => i)

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
    const need = ac + dc

    const logoRaw = this.sampleLogoShape(need)
    const sunnyRaw = this.sampleSunnyShape(need)

    const seedBase = `${window.innerWidth}x${window.innerHeight}`
    const logoRng = new SeededRandom(this._hashToSeed(`logo:${seedBase}`))
    const sunnyRng = new SeededRandom(this._hashToSeed(`sunny:${seedBase}`))

    this._shuffleInPlace(logoRaw, logoRng)
    this._shuffleInPlace(sunnyRaw, sunnyRng)

    const logoIdx = this._evenSampleIndices(logoRaw, ac, logoRng)
    const logoSet = new Set(logoIdx)
    this.logoAvatarTargets = logoIdx.map((i) => logoRaw[i])
    const logoRemain = logoRaw.filter((_, i) => !logoSet.has(i))
    this.logoDustTargets = this.slice(logoRemain, 0, dc, logoRng)

    const sunnyIdx = this._evenSampleIndices(sunnyRaw, ac, sunnyRng)
    const sunnySet = new Set(sunnyIdx)
    this.sunnyAvatarTargets = sunnyIdx.map((i) => sunnyRaw[i])
    const sunnyRemain = sunnyRaw.filter((_, i) => !sunnySet.has(i))
    this.sunnyDustTargets = this.slice(sunnyRemain, 0, dc, sunnyRng)

    console.log(
      `[Targets] logo采样=${logoRaw.length} sunny采样=${sunnyRaw.length} | 需要 avatar=${ac} dust=${dc}`
    )
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
    // step 选择：需要的点越多，step 越小
    // 1200×675 canvas，step=1 → 最多 ~81万点（远超需求）
    // step=2 → ~20万点，足够
    const step = 1
    if (this.logoImage) {
      const draw = (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const margin = 0.1
        const maxW = w * (1 - margin * 2)
        const maxH = h * (1 - margin * 2)
        const img = this.logoImage
        const sc = Math.min(maxW / img.width, maxH / img.height)
        ctx.drawImage(
          img,
          (w - img.width * sc) / 2,
          (h - img.height * sc) / 2,
          img.width * sc,
          img.height * sc
        )
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
    const draw = (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      const fontSize = Math.min(w / 4.2, 380) * CONFIG.sunnyScale
      ctx.font = `${CONFIG.fontProperties.fontWeight} ${fontSize}px ${CONFIG.fontFamily}`

      // Attempt to set letter spacing if supported (Canvas 2D API extension)
      if ('letterSpacing' in ctx) {
          ctx.letterSpacing = CONFIG.fontProperties.letterSpacing;
      } else {
          // Fallback for older browsers: basic CSS assignment (might not work for context)
          ctx.canvas.style.letterSpacing = CONFIG.fontProperties.letterSpacing;
      }
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(CONFIG.sunnyText, w / 2, h / 2)
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
    this.layers.dust = new PIXI.Container()
    this.layers.avatar = new PIXI.Container()
    this.layers.active = new PIXI.Container()
    this.app.stage.sortableChildren = true
    this.layers.dust.zIndex = 0
    this.layers.avatar.zIndex = 1
    this.layers.active.zIndex = 2
    this.app.stage.addChild(this.layers.dust)
    this.app.stage.addChild(this.layers.avatar)
    this.app.stage.addChild(this.layers.active)
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
    g.scale.set(instance.baseScale)

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

  _flyDustToLogo(dust, index, finalAlpha) {
    const target = this.logoDustTargets[index]
    if (!target) {
      this.introDustRemaining--
      return
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
    if (this.introAvatarRemaining <= 0 && this.introDustRemaining <= 0) {
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

    const avatars = []
    this.avatarsById.forEach((group) => {
      if (group.anchor?.displayObject) avatars.push(group.anchor.displayObject)
      group.ambient.forEach((inst) => {
        if (inst.displayObject) avatars.push(inst.displayObject)
      })
    })
    const allParticles = [...avatars, ...this.dustParticles]
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
          p.userData.vx = (Math.random() - 0.5) * 2
          p.userData.vy = (Math.random() - 0.5) * 2

          completedCount++
          if (completedCount >= total) {
            this.phase = 'FREE_FLOAT'
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
    if (this.phase !== 'FREE_FLOAT') return
    const time = Date.now() * 0.001

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
    const highlightBorder = { width: 3, color: CONFIG.colors.highlight, alpha: 1 }
    const signedBorder = { width: 2.5, color: CONFIG.colors.signed, alpha: 1 }

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
    this.introAvatarRemaining = 0
    this.introDustRemaining = 0

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
        p.scale.set(inst.baseScale)
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
  }

  // ─── 汇聚为 SUNNY ─────────────────────────
  forceConverge() {
    if (this.isConverged) return
    this.isConverged = true
    this.scheduler.isConverging = true
    this.phase = 'CONVERGE_TO_SUNNY'
    console.log('🚀 → CONVERGE_TO_SUNNY')
    this.calculateCompositionTargets()

    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }

    // 头像飞向 SUNNY (径向波)
    this.avatarsById.forEach((group) => {
      const signed = this.signedIds.has(group.employeeId)
      const list = [group.anchor, ...group.ambient]

      list.forEach((inst) => {
        const p = inst?.displayObject
        if (!p) return

        gsap.killTweensOf(p)
        gsap.killTweensOf(p.scale)

        const t = this.sunnyAvatarTargets[inst.globalIndex]
        if (!t) return

        const delay = this._calculateRadialDelay(t, center)
        gsap.to(p, {
          x: t.x,
          y: t.y,
          duration: 2.2,
          ease: 'power4.inOut',
          delay
        })
        const ca = inst.role === 'anchor'
          ? CONFIG.avatarSwarm.convergeAlpha.anchor
          : CONFIG.avatarSwarm.convergeAlpha.dup
        gsap.to(p, {
          alpha: ca,
          duration: 1.6,
          ease: 'power2.out',
          delay
        })
        gsap.to(p.scale, {
          x: inst.baseScale * 0.85,
          y: inst.baseScale * 0.85,
          duration: 2.2,
          ease: 'power4.inOut',
          delay
        })

        inst.state = 'CONVERGED'
        if (p.userData) p.userData.state = 'CONVERGED'

        const bc = signed
          ? CONFIG.colors.signed
          : p.userData?.baseBorderColor ?? p.userData?.border?.color
        const bw = inst.role === 'anchor' ? 2.6 : 1.8
        this.redrawAvatarGraphic(p, {
          width: signed ? Math.max(bw, 2.4) : bw,
          color: bc,
          alpha: 1
        })
      })
    })

    // 粒子飞向 SUNNY
    this.dustParticles.forEach((p, i) => {
      gsap.killTweensOf(p)
      const t = this.sunnyDustTargets[i]
      if (!t) return
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

  // ─── Resize ───────────────────────────────
  handleResize() {
    this.resizeTimer = null
    this.app.renderer.resize(window.innerWidth, window.innerHeight)
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
