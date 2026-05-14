/**
 * DeathParticle — 增强死亡粒子系统
 *
 * 敌人死亡时生成方块粒子向外炸开，支持：
 * - 旋转（随机初角 + 角速度）
 * - 重力下沉
 * - 火花变体（30% 概率，更快更小，无重力）
 * - 颜色 HSL 偏移（从敌人颜色 ±20° 变化）
 * - 方块大小 2~8px
 */

const DEFAULT_COUNT = 10
const PARTICLE_LIFETIME = 0.5
const SPARK_LIFETIME = 0.3
const MIN_SPEED = 50
const MAX_SPEED = 120
const SPARK_MIN_SPEED = 80
const SPARK_MAX_SPEED = 200
const MIN_SIZE = 2
const MAX_SIZE = 8
const SPARK_MIN_SIZE = 1
const SPARK_MAX_SIZE = 3
const GRAVITY = 200
const SPARK_PROBABILITY = 0.3

/**
 * 将 CSS 颜色解析为 HSL 对象，用于生成颜色变体
 * @param {string} color CSS 颜色
 * @returns {{ h: number, s: number, l: number }}
 */
function parseColorToHsl(color) {
  // 简单处理：如果已经是 rgb 或 # 格式，先转成 HSL
  let r = 200, g = 50, b = 50
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16)
      g = parseInt(hex.substring(2, 4), 16)
      b = parseInt(hex.substring(4, 6), 16)
    }
  } else if (color.startsWith('rgb')) {
    const m = color.match(/(\d+)/g)
    if (m) {
      r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2])
    }
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * 从 HSL 对象生成 CSS 颜色字符串
 */
function hslToString(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`
}

export class DeathParticle {
  /**
   * @param {number} x 起始位置
   * @param {number} y 起始位置
   * @param {string} color CSS 颜色
   */
  constructor(x, y, color = '#e74c3c') {
    this.x = x
    this.y = y
    this.alive = true

    // 是否为火花变体（30% 概率）
    this._isSpark = Math.random() < SPARK_PROBABILITY
    this._lifetime = this._isSpark ? SPARK_LIFETIME : PARTICLE_LIFETIME
    this._timer = this._lifetime

    // 随机方向 + 速度
    const angle = Math.random() * Math.PI * 2
    const speed = this._isSpark
      ? SPARK_MIN_SPEED + Math.random() * (SPARK_MAX_SPEED - SPARK_MIN_SPEED)
      : MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed

    // 尺寸
    this.size = this._isSpark
      ? SPARK_MIN_SIZE + Math.random() * (SPARK_MAX_SIZE - SPARK_MIN_SIZE)
      : MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)

    // 颜色偏移（从敌人颜色 HSL ±20° 变化）
    const hsl = parseColorToHsl(color)
    const hueShift = (Math.random() - 0.5) * 40
    this.color = hslToString(hsl.h + hueShift, hsl.s, hsl.l)

    // 旋转（仅方块）
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = this._isSpark ? 0 : (Math.random() - 0.5) * 8

    // 重力（火花无重力）
    this.gravity = this._isSpark ? 0 : GRAVITY
  }

  /** 每帧更新 — 移动 + 摩擦 + 旋转 + 重力 */
  update(deltaTime) {
    this._timer -= deltaTime
    if (this._timer <= 0) {
      this.alive = false
      return
    }
    this.x += this.vx * deltaTime
    this.y += this.vy * deltaTime
    // 空气摩擦
    this.vx *= 0.96
    this.vy *= 0.96
    // 重力
    this.vy += this.gravity * deltaTime
    // 旋转
    this.rotation += this.rotationSpeed * deltaTime
  }

  /** 绘制粒子（随生命比例淡出） */
  draw(ctx) {
    if (!this.alive) return
    const alpha = Math.max(0, this._timer / this._lifetime)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    const half = this.size / 2

    if (this._isSpark) {
      // 火花变体：绘制为菱形（旋转 45° 的方块）
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.moveTo(0, -half)
      ctx.lineTo(half, 0)
      ctx.lineTo(0, half)
      ctx.lineTo(-half, 0)
      ctx.closePath()
      ctx.fill()
    } else {
      // 方块变体：绘制旋转方块
      ctx.fillStyle = this.color
      ctx.fillRect(-half, -half, this.size, this.size)
    }

    ctx.restore()
  }
}

/**
 * 生成一组死亡粒子
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [count=10]
 * @returns {DeathParticle[]}
 */
export function spawnDeathParticles(x, y, color = '#e74c3c', count = DEFAULT_COUNT) {
  const arr = []
  // 粒子数在 count 附近随机浮动 ±3
  const actualCount = count + Math.floor(Math.random() * 7) - 3
  for (let i = 0; i < actualCount; i++) {
    arr.push(new DeathParticle(x, y, color))
  }
  return arr
}
