/**
 * HitFlash — 子弹击中敌人时的打击感闪烁效果
 * 白色圆环扩散 + 淡出，持续约 200ms 后自动消失
 */
import { SpriteCache } from './SpriteCache.js'

export class HitFlash {
  /**
   * @param {number} x 击中位置 X
   * @param {number} y 击中位置 Y
   * @param {number} size 受击物体尺寸（用于决定效果大小）
   */
  constructor(x, y, size = 28) {
    this.x = x
    this.y = y
    this.alive = true

    // 效果参数
    this._duration = 0.2       // 持续秒数
    this._timer = this._duration
    this._maxRadius = size * 1.2
  }

  /** 每帧更新 */
  update(deltaTime) {
    this._timer -= deltaTime
    if (this._timer <= 0) {
      this.alive = false
    }
  }

  /** 绘制闪烁效果（使用 SpriteCache 离屏缓存，避免每帧 arc/stroke） */
  draw(ctx) {
    if (!this.alive) return

    const progress = 1 - (this._timer / this._duration) // 0→1
    SpriteCache.drawHitFlash(ctx, this.x, this.y, progress, this._maxRadius)
  }
}
