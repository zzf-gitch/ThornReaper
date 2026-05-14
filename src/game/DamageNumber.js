/**
 * DamageNumber — 伤害数字飘字效果
 * 纯 Canvas 绘制，不依赖 Vue 响应式
 */
export class DamageNumber {
  /**
   * @param {number} x - 起始 X
   * @param {number} y - 起始 Y
   * @param {number|string} text - 显示文字
   * @param {string} [color='#fff'] - 颜色
   * @param {number} [randomOffset=0] - 随机偏移像素范围
   */
  constructor(x, y, text, color = '#fff', randomOffset = 0) {
    this.text = String(text)
    this.color = color
    this.alive = true

    // 随机偏移 — 让数字散开不重叠
    if (randomOffset > 0) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * randomOffset
      x += Math.cos(angle) * dist
      y += Math.sin(angle) * dist
    }

    this.x = x
    this.y = y

    // 动画参数
    this._duration = 0.8        // 持续 0.8 秒
    this._timer = this._duration
    this._riseSpeed = -70        // 向上飘像素/秒
    this._startY = y
    this._fontSize = 20
  }

  /**
   * 每帧更新
   * @param {number} deltaTime
   */
  update(deltaTime) {
    this._timer -= deltaTime
    if (this._timer <= 0) {
      this.alive = false
      return
    }
    // 向上飘移
    const elapsed = this._duration - this._timer
    this.y = this._startY + this._riseSpeed * elapsed
    // 轻微左右晃动
    this.x += Math.sin(elapsed * 8) * 0.3
  }

  /**
   * 绘制
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const alpha = Math.min(1, Math.max(0, this._timer / this._duration))
    // 后半段加速淡出
    const fade = this._timer < this._duration * 0.4
      ? this._timer / (this._duration * 0.4)
      : 1

    ctx.save()
    ctx.globalAlpha = alpha * fade
    ctx.fillStyle = this.color
    ctx.font = `bold ${this._fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 文字描边（增强可读性）
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 3
    ctx.strokeText(this.text, this.x, this.y)
    ctx.fillText(this.text, this.x, this.y)

    ctx.restore()
  }
}
