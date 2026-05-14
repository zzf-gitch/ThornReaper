import { SpriteCache } from './SpriteCache.js'

/**
 * Bullet 类 — 自动瞄准子弹
 * 创建时锁定目标方向，沿该方向匀速飞行
 */
export class Bullet {
  /**
   * @param {number} x 起始 X（玩家位置）
   * @param {number} y 起始 Y（玩家位置）
   * @param {number} targetX 目标 X（最近敌人位置）
   * @param {number} targetY 目标 Y（最近敌人位置）
   * @param {number} speed 飞行速度（像素/秒，从 Player.bulletSpeed 传入）
   */
  constructor(x, y, targetX, targetY, speed) {
    this.x = x
    this.y = y
    this.radius = 5
    this.speed = speed
    this.alive = true

    const dx = targetX - x
    const dy = targetY - y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      this.dirX = dx / dist
      this.dirY = dy / dist
    } else {
      this.dirX = 0
      this.dirY = -1
    }
  }

  /** 每帧更新 — 沿锁定方向飞行 */
  update(deltaTime) {
    this.x += this.dirX * this.speed * deltaTime
    this.y += this.dirY * this.speed * deltaTime
  }

  /** 绘制子弹（使用 SpriteCache 离屏缓存，避免每帧 createRadialGradient） */
  draw(ctx) {
    SpriteCache.drawBullet(ctx, this.x, this.y)
  }

  isOutOfBounds(canvasWidth, canvasHeight) {
    const margin = 20
    return (
      this.x < -margin ||
      this.x > canvasWidth + margin ||
      this.y < -margin ||
      this.y > canvasHeight + margin
    )
  }
}
