/**
 * VirtualJoystick — 移动端虚拟摇杆
 *
 * 专为触屏设备设计，固定于屏幕左下角。
 * 左半屏触摸启动摇杆，右半屏触发技能。
 *
 * 支持双指同时操作（左摇杆移动 + 右屏技能）。
 */
export class VirtualJoystick {
  /**
   * @param {number} radius 摇杆有效半径（像素）
   */
  constructor(radius = 60) {
    this.radius = radius

    // --- 摇杆状态 ---
    this.active = false          // 摇杆是否活跃
    this.dx = 0                  // 归一化方向 (-1~1)
    this.dy = 0

    // --- UI 坐标（供 Vue 模板绑定） ---
    this.displayX = 80 + this.radius
    this.displayY = window.innerHeight - 80 - this.radius
    this.thumbOffsetX = 0
    this.thumbOffsetY = 0

    // --- 静态模式（摇杆固定于屏幕左下角，始终可见） ---
    this.persistentVisible = false

    // 内部分隔线（左/右半屏分界）
    this._screenSplitX = window.innerWidth / 2

    // 触摸 ID 追踪
    this._moveTouchId = null
    this._skillTouchId = null

    // 底座中心坐标（静态固定位置）
    this._baseX = 80 + this.radius
    this._baseY = window.innerHeight - 80 - this.radius
  }

  /** 更新屏幕分隔和固定位置（窗口 resize 时调用） */
  updateLayout() {
    this._screenSplitX = window.innerWidth / 2
    if (this.persistentVisible) {
      this._baseX = 80 + this.radius
      this._baseY = window.innerHeight - 80 - this.radius
      this.displayX = this._baseX
      this.displayY = this._baseY
      if (!this.active) {
        this.thumbOffsetX = 0
        this.thumbOffsetY = 0
      }
    }
  }

  /**
   * 启用静态模式：摇杆固定于左下角，底座始终可见
   */
  enableStatic() {
    this.persistentVisible = true
    this._baseX = 80 + this.radius
    this._baseY = window.innerHeight - 80 - this.radius
    this.displayX = this._baseX
    this.displayY = this._baseY
    this.thumbOffsetX = 0
    this.thumbOffsetY = 0
    this.dx = 0
    this.dy = 0
  }

  /**
   * 禁用静态模式
   */
  disableStatic() {
    this.persistentVisible = false
    this._moveTouchId = null
    this._skillTouchId = null
    this.active = false
    this.dx = 0
    this.dy = 0
    this.thumbOffsetX = 0
    this.thumbOffsetY = 0
  }

  /** 判断触摸点在左半屏（摇杆）还是右半屏（技能） */
  _isLeftSide(screenX) {
    return screenX < this._screenSplitX
  }

  // ==================== 触摸事件 API ====================

  /**
   * touchstart 中调用
   * @param {number} screenX clientX
   * @param {number} screenY clientY
   * @param {number} identifier touch.identifier
   * @returns {'move'|'skill'|null}
   */
  onStart(screenX, screenY, identifier) {
    const isLeft = this._isLeftSide(screenX)

    if (isLeft && this._moveTouchId === null) {
      // --- 左半屏：启动移动摇杆 ---
      this._moveTouchId = identifier
      this.active = true
      this.thumbOffsetX = screenX - this._baseX
      this.thumbOffsetY = screenY - this._baseY
      this._clampThumb()
      return 'move'
    }

    if (!isLeft && this._skillTouchId === null) {
      // --- 右半屏：触发技能 ---
      this._skillTouchId = identifier
      return 'skill'
    }

    return null
  }

  /**
   * touchmove 中调用
   * @param {number} screenX clientX
   * @param {number} screenY clientY
   * @param {number} identifier touch.identifier
   * @returns {'move'|'skill'|null}
   */
  onMove(screenX, screenY, identifier) {
    // 移动摇杆更新
    if (this._moveTouchId !== null && identifier === this._moveTouchId) {
      this.thumbOffsetX = screenX - this._baseX
      this.thumbOffsetY = screenY - this._baseY
      this._clampThumb()
      return 'move'
    }

    // 技能触摸（保持活跃即可）
    if (this._skillTouchId !== null && identifier === this._skillTouchId) {
      return 'skill'
    }

    return null
  }

  /**
   * touchend/touchcancel 中调用
   * @param {number} identifier touch.identifier
   * @returns {'move'|'skill'|null}
   */
  onEnd(identifier) {
    if (this._moveTouchId !== null && identifier === this._moveTouchId) {
      this._moveTouchId = null
      this.active = false
      this.dx = 0
      this.dy = 0
      this.thumbOffsetX = 0
      this.thumbOffsetY = 0
      return 'move'
    }

    if (this._skillTouchId !== null && identifier === this._skillTouchId) {
      this._skillTouchId = null
      return 'skill'
    }

    return null
  }

  /** 清除所有触摸状态 */
  reset() {
    this._moveTouchId = null
    this._skillTouchId = null
    this.active = false
    this.dx = 0
    this.dy = 0
    this.thumbOffsetX = 0
    this.thumbOffsetY = 0
  }

  // ==================== 内部 ====================

  /**
   * 根据 thumb 偏移量计算 dx/dy，并限制最大偏移不超过 radius
   */
  _clampThumb() {
    const rawDx = this.thumbOffsetX
    const rawDy = this.thumbOffsetY
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy)

    if (dist > this.radius) {
      const ratio = this.radius / dist
      this.thumbOffsetX = rawDx * ratio
      this.thumbOffsetY = rawDy * ratio
      this.dx = rawDx * ratio / this.radius
      this.dy = rawDy * ratio / this.radius
    } else {
      this.dx = rawDx / this.radius
      this.dy = rawDy / this.radius
    }
  }
}
