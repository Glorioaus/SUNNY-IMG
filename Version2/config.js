window.SUNNY_CONFIG = {
  // 是否显示调试信息 (HUD)
  showHUD: true,

  // `SUNNY` 字形大小缩放（相对默认字号）。
  // - 更大：同样 population 下更“疏”，轮廓更清晰
  // - 更小：更“挤”，更容易糊
  // 推荐范围：0.45 ~ 0.85
  sunnyScale: 0.7,

  avatarSwarm: {
    // 虚拟人数 / 总头像实例预算（包含每个员工的 anchor + 复用 dup）。
    // 影响：
    // - 越大：越“人多”，但更容易糊、也更吃性能
    // - 越小：轮廓更清晰，但密度下降
    // 典型：600~1600
    targetTotalInstances: 1000,

    // 每个员工最多生成多少个实例（anchor=1 + dup<=max-1）。
    // 员工数较少时用于限制“重复脸”爆炸；员工数较多时基本用不到上限。
    // 典型：4~10
    maxInstancesPerEmployee: 6
  },

  sampling: {
    // 采样阈值（0~255），决定把像素当作“字形/LOGO点位”的条件：alpha > threshold。
    // - 阈值越高：更偏向采样“实心区域”，边缘更硬、更清晰
    // - 阈值越低：会采到抗锯齿的半透明边缘，形状更厚、更容易毛边
    // 提示：如果轮廓虚/毛边，优先把阈值调高（例如 170→190）。
    sunnyAlphaThreshold: 160,

    // LOGO 的采样阈值。LOGO 图片边缘若本身更锐利，可以适当调低一些。
    logoAlphaThreshold: 50
  },

  // 字体样式控制 (仅针对 SUNNY 字样)
  fontProperties: {
    // 字母间距 (支持 '20px', '0.2em' 等 CSS 格式)
    letterSpacing: '30px',
    // 字体粗细 (支持 '900', 'bold', 'normal' 等)
    fontWeight: '900'
  },

  // 签到动画控制
  animation: {
    // 签到时头像放大的倍数 (相对于头像当前的基础大小)
    signatureScale: 2.5,
    // 签到高亮持续时间 (秒)
    signatureDuration: 1.2
  }
}
