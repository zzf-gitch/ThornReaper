/**
 * ExperienceOrb 类 — 经验球 & 回血球
 * 敌人死亡时掉落，玩家靠近后自动拾取
 * 支持磁吸吸取：玩家进入吸取范围后自动飞向玩家
 */
import { SpriteCache } from './SpriteCache.js'

export class ExperienceOrb {
  /**
   * @param {number} x 掉落位置 X
   * @param {number} y 掉落位置 Y
   * @param {number} value 经验值（默认 20）
   * @param {boolean} [isHeal=false] 是否为回血球
   */
  constructor(x, y, value = 20, isHeal = false) {
    this.x = x
    this.y = y
    this.value = value
    this.radius = 6
    this.alive = true
    this.isHeal = isHeal  // true = 回血球，false = 经验球

    // 基础拾取半径（玩家进入此范围自动拾取）
    this.pickupRadius = 40

    // 磁吸半径（玩家进入此范围开始飞向玩家）
    this.magneticRadius = 150

    // 磁吸速度（像素/秒）
    this._magnetSpeed = 400
    // 是否正在被吸引
    this._attracted = false

    // 生成动画：初始缩小，快速弹到正常大小
    this._scale = 0.3
    this._growTimer = 0.15 // 秒
  }

  /**
   * 每帧更新
   * @param {number} deltaTime
   * @param {number} playerX 玩家 X 坐标（用于磁吸）
   * @param {number} playerY 玩家 Y 坐标
   * @param {number} pickupRangeMultiplier 玩家吸取范围倍率
   */
  update(deltaTime, playerX, playerY, pickupRangeMultiplier = 1.0) {
    // 生长动画
    if (this._growTimer > 0) {
      this._growTimer -= deltaTime
      this._scale = Math.min(1, 1 - (this._growTimer / 0.15) * 0.7)
    }

    // === 磁吸吸取逻辑 ===
    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const effectiveMagneticRadius = this.magneticRadius * pickupRangeMultiplier

    if (dist < effectiveMagneticRadius && dist > 0.5) {
      this._attracted = true
      // 距离越近速度越快，但不超过最大磁吸速度
      const speedFactor = Math.min(1, 1 - dist / effectiveMagneticRadius) * 0.8 + 0.2
      const speed = this._magnetSpeed * speedFactor * pickupRangeMultiplier
      const moveX = (dx / dist) * speed * deltaTime
      const moveY = (dy / dist) * speed * deltaTime
      this.x += moveX
      this.y += moveY
    } else {
      this._attracted = false
    }
  }

  /** 绘制经验球或回血球 */
  draw(ctx) {
    const r = this.radius * this._scale
    if (this.isHeal) {
      // 回血球 — 绿色圆形 + 白色十字
      ctx.save()
      ctx.beginPath()
      ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2)
      ctx.fillStyle = '#2ecc71'
      ctx.fill()
      ctx.shadowColor = '#2ecc71'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#27ae60'
      ctx.fill()
      ctx.shadowBlur = 0
      // 白色十字
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(this.x - r * 0.4, this.y)
      ctx.lineTo(this.x + r * 0.4, this.y)
      ctx.moveTo(this.x, this.y - r * 0.4)
      ctx.lineTo(this.x, this.y + r * 0.4)
      ctx.stroke()
      ctx.restore()
    } else {
      // 经验球 — 使用 SpriteCache
      SpriteCache.drawOrb(ctx, this.x, this.y, this._scale)
    }

    // 磁吸状态闪烁效果
    if (this._attracted) {
      ctx.save()
      ctx.globalAlpha = 0.2 + Math.sin(Date.now() * 0.008) * 0.1
      ctx.beginPath()
      ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = this.isHeal ? 'rgba(46,204,113,0.3)' : 'rgba(241,196,15,0.3)'
      ctx.fill()
      ctx.restore()
    }
  }
}

/**
 * 创建一个回血球
 * @param {number} x
 * @param {number} y
 * @param {number} [healAmount=20]
 * @returns {ExperienceOrb}
 */
export function createHealOrb(x, y, healAmount = 20) {
  return new ExperienceOrb(x, y, healAmount, true)
}
