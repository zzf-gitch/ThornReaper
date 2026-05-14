/**
 * Camera — 平滑跟随相机（Lerp 插值）
 *
 * 相机不钉死在玩家身上，而是带延迟缓冲跟随。
 * 当玩家快速转身时，镜头有平滑过渡感。
 *
 * 使用范例：
 *   const camera = new Camera(1600, 900)
 *   // 每帧更新
 *   camera.update(deltaTime, player.x, player.y)
 *   // 渲染时应用偏移
 *   ctx.save()
 *   ctx.translate(-camera.x, -camera.y)
 *   // ... 绘制世界坐标实体 ...
 *   ctx.restore()
 *   // ... 绘制屏幕坐标 UI ...
 */
export class Camera {
  /**
   * @param {number} logicWidth  逻辑宽（1600）
   * @param {number} logicHeight 逻辑高（900）
   * @param {number} [lerpSpeed=4] 跟随速度系数（越大越快，4≈0.25s 跟上）
   */
  constructor(logicWidth, logicHeight, lerpSpeed = 4) {
    this.logicWidth = logicWidth
    this.logicHeight = logicHeight

    // 当前相机偏移（被 Lerp 平滑后的值）
    this.x = 0
    this.y = 0

    // 目标偏移（即玩家应处于屏幕中央时的偏移）
    this._targetX = 0
    this._targetY = 0

    // 跟随速度
    this.lerpSpeed = lerpSpeed

    // 死区半径（像素）：玩家在中央这个范围内相机不动，减少微抖
    this.deadZone = 8
  }

  /**
   * 每帧更新相机位置
   * @param {number} deltaTime 帧时间（秒）
   * @param {number} targetX   目标世界 X（玩家.x）
   * @param {number} targetY   目标世界 Y（玩家.y）
   */
  update(deltaTime, targetX, targetY) {
    // 目标相机偏移 = 玩家位置 - 屏幕中心
    const desiredX = targetX - this.logicWidth / 2
    const desiredY = targetY - this.logicHeight / 2

    // 死区判断：如果差值小于死区，不更新目标（减少微抖）
    const dx = desiredX - this._targetX
    const dy = desiredY - this._targetY
    if (Math.abs(dx) > this.deadZone || Math.abs(dy) > this.deadZone) {
      this._targetX = desiredX
      this._targetY = desiredY
    }

    // Lerp 插值：向目标位置平滑移动
    const t = Math.min(1, this.lerpSpeed * deltaTime)
    this.x += (this._targetX - this.x) * t
    this.y += (this._targetY - this.y) * t
  }

  /**
   * 强制立即跳转到目标位置（用于游戏初始化/重置）
   */
  snapTo(targetX, targetY) {
    this.x = targetX - this.logicWidth / 2
    this.y = targetY - this.logicHeight / 2
    this._targetX = this.x
    this._targetY = this.y
  }

  /**
   * 获取世界→屏幕变换参数
   * @returns {{ offsetX: number, offsetY: number }}
   */
  getTransform() {
    return { offsetX: -this.x, offsetY: -this.y }
  }

  /**
   * 重置相机
   */
  reset() {
    this.x = 0
    this.y = 0
    this._targetX = 0
    this._targetY = 0
  }
}
