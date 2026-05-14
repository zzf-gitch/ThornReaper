/**
 * EnemyBullet — 远程型敌人（Ranger）发射的子弹
 *
 * - 蓝色圆形，带发光效果
 * - 直线飞行，3 秒后自动消失
 * - 击中玩家造成伤害
 */
export class EnemyBullet {
  /**
   * @param {number} x 初始 X
   * @param {number} y 初始 Y
   * @param {number} dirX 单位方向 X
   * @param {number} dirY 单位方向 Y
   * @param {number} [speed=200] 飞行速度（像素/秒）
   * @param {number} [damage=5] 伤害值
   */
  constructor(x, y, dirX, dirY, speed = 200, damage = 5) {
    this.x = x
    this.y = y
    this.dirX = dirX
    this.dirY = dirY
    this.speed = speed
    this.damage = damage
    this.radius = 4
    this.alive = true
    this._lifetime = 3
    this._timer = 0
  }

  /** 每帧更新 */
  update(deltaTime) {
    if (!this.alive) return

    this._timer += deltaTime
    if (this._timer >= this._lifetime) {
      this.alive = false
      return
    }

    this.x += this.dirX * this.speed * deltaTime
    this.y += this.dirY * this.speed * deltaTime
  }

  /** 绘制 — 蓝色发光圆形 */
  draw(ctx) {
    if (!this.alive) return

    ctx.save()
    ctx.shadowColor = '#4488ff'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#66aaff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
    // 内核亮点
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /** 碰撞矩形 */
  getBounds() {
    return {
      left: this.x - this.radius,
      right: this.x + this.radius,
      top: this.y - this.radius,
      bottom: this.y + this.radius,
    }
  }
}
