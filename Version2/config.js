window.SUNNY_CONFIG = {
  // 是否显示调试信息 (HUD)
  showHUD: false,

  // `SUNNY` 字形大小缩放（相对默认字号）。
  // - 更大：同样 population 下更"疏"，轮廓更清晰
  // - 更小：更"挤"，更容易糊
  // 推荐范围：0.45 ~ 0.85
  sunnyScale: 0.7,

  avatarSwarm: {
    // 虚拟人数 / 总头像实例预算（包含每个员工的 anchor + 复用 dup）。
    // 影响：
    // - 越大：越"人多"，但更容易糊、也更吃性能
    // - 越小：轮廓更清晰，但密度下降
    // 典型：600~1600
    // ★ 建议根据实际效果调整：人少时增大此值，确保图形由头像填满
    targetTotalInstances: 1500,

    // 每个员工最多生成多少个实例（anchor=1 + dup<=max-1）。
    // 员工数较少时用于限制"重复脸"爆炸；员工数较多时基本用不到上限。
    // 典型：4~10
    // ★ 允许更多复用，确保200人也能填满图形
    maxInstancesPerEmployee: 10
  },

  // ★ 粒子最大半径（防止粒子过大喧宾夺主）
  dustMaxRadius: 5,

  sampling: {
    // 采样阈值（0~255），决定把像素当作"字形/LOGO点位"的条件：alpha > threshold。
    // - 阈值越高：更偏向采样"实心区域"，边缘更硬、更清晰
    // - 阈值越低：会采到抗锯齿的半透明边缘，形状更厚、更容易毛边
    // 提示：如果轮廓虚/毛边，优先把阈值调高（例如 170→190）。
    sunnyAlphaThreshold: 160,

    // LOGO 的采样阈值。
    // - 使用 SVG 时：边缘清晰，可用较高阈值（如 128）获得精确轮廓
    // - 使用 PNG 时：抗锯齿边缘需较低阈值（如 50）
    // 现在优先加载 LOGO.svg，尖角部分还原更精确
    logoAlphaThreshold: 128
  },

  // ★ 微粒子系统 - 用于填充射线
  microDust: {
    enabled: true,
    count: 5000,              // 增加微粒子数量
    radiusRange: [1.0, 3.0],  // 稍大一点更明显
    alphaRange: [0.7, 1.0],
    colors: [0xffd700, 0xffaa00, 0xffffff, 0xfff4cc]
  },

  // ★ LOGO几何信息 - 水平射线
  // LOGO结构：中心圆环 + 左右各多条水平射线
  logoGeometry: {
    centerX: 0.5,
    centerY: 0.5,
    innerCircleRatio: 0.22,   // 内圆
    outerCircleRatio: 0.32,   // 外圆（射线起点）
    rayExtendRatio: 0.68,     // 射线延伸长度
    rayHeightRange: 0.18,     // 射线Y轴范围（相对于logoRadius）
    // 以下参数保留兼容性但不再使用角度计算
    rayAngles: [0, Math.PI],
    rayAngleWidth: 0.12
  },

  compose: {
    shapeInLogo: 'tile',
    shapeInSunny: 'tile',
    shapeInFree: 'avatar',
    tileSize: 16,               // ★ 平衡：16px足够清晰且密度合适
    tileRadius: 3,
    snapToGrid: true,
    gridSize: 12
  },

  backgroundStars: {
    enabled: true,
    showInIntro: false,
    showInConverge: true,
    showInFree: true,
    alpha: 0.35,
    fadeDuration: 1.0,
    count: 520,
    ambientDustCount: 400,
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
    showInFree: true,
    alpha: 0.22,
    fadeDuration: 0.9,
    textureSize: 320,
    noiseScale: 1,
    layers: [
      { tint: 0xffffff, alpha: 0.9, scale: 1, speed: [0.12, 0.04] },
      { tint: 0xfff4cc, alpha: 0.6, scale: 1.8, speed: [0.22, 0.08] }
    ],
    twinkle: { amplitude: 0.08, speedRange: [0.2, 0.7] }
  },

  // ★ 颜色配置
  colors: {
    gold: 0xffd700,
    highlight: 0x00bfff,   // 签到瞬间高亮
    signed: 0x00bfff,      // ★ 签到后保持青色，与金色背景形成对比
    // SUNNY汇聚状态的渐变色板（从中心到边缘）
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
    // 边框样式 - 更细腻
    borderWidth: 1.0,           // 普通头像边框
    borderWidthAnchor: 1.3,     // anchor稍粗
    // 外发光 - 柔和
    glowEnabled: true,
    glowWidth: 2.5,
    glowAlpha: 0.3,
    // 使用渐变色
    useGradient: true,
    // 渐变模式: 'random'(随机混合), 'uniform'(统一金色), 'radial'(径向渐变)
    gradientMode: 'random'
  },

  // 字体样式控制 (仅针对 SUNNY 字样)
  fontProperties: {
    // 字母间距 - 适当间距让字母分开
    letterSpacing: '20px',
    // 字体粗细 - 900最粗，让笔画更饱满
    fontWeight: '900'
  },

  // 签到动画控制
  animation: {
    // 签到时头像放大的倍数 (相对于头像当前的基础大小)
    signatureScale: 2.5,
    // 签到高亮持续时间 (秒)
    signatureDuration: 2
  },

  // ★ 自适应采样配置 (Quadtree Adaptive Sampling)
  // 解决边缘锯齿，提升细节还原度
  adaptiveSampling: {
    enabled: true,              // 总开关

    minTileSize: 6,             // 全局最小 tile（用于边缘）
    maxTileSize: 20,            // 全局最大 tile（用于内部）
    contrastThreshold: 30,      // 边缘检测阈值（0-255）
    maxDepth: 5,                // Quadtree 最大深度

    // LOGO 特殊配置
    logo: {
      rayTipMinSize: 4,         // 射线尖端极小 tile
      circleEdgeMinSize: 8,     // 圆环边缘小 tile
      maxTileSize: 18           // 内部大 tile
    },

    // SUNNY 特殊配置
    sunny: {
      strokeEdgeMinSize: 6,     // 笔画边缘小 tile
      strokeFillMaxSize: 16,    // 笔画内部大 tile
      curveMinSize: 5           // 曲线部分极小 tile (S/U)
    },
    
    // 渲染配置
    renderVariableSize: true,   // 头像尺寸跟随采样 tile 尺寸变化
    sizeCurve: 'linear'         // 'linear' | 'sqrt'
  }
}
