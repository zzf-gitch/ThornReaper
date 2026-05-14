/**
 * GamepadManager — 浏览器 Gamepad API 封装
 *
 * 自动检测手柄连接/断开，提供归一化的左摇杆方向和常用按键状态。
 * 使用方式：
 *   const gm = new GamepadManager()
 *   gm.update()           // 在每帧更新中调用
 *   gm.connected          // boolean
 *   gm.axes[0], gm.axes[1] // 左摇杆 (-1~1)
 *   gm.aPressed           // 当前帧 A 键是否被按下（一次触发）
 *   gm.firePressed        // 任意攻击键按下（RT / A / X）
 *   gm.dashPressed        // 特殊技能键按下（B / RB）
 */
export class GamepadManager {
  constructor() {
    /** @type {Gamepad|null} */
    this._gamepad = null
    this.connected = false

    // 归一化左摇杆坐标 (-1 ~ 1)
    this.axes = [0, 0]

    // 按键状态（当前帧）
    this.aPressed = false
    this.bPressed = false
    this.xPressed = false
    this.yPressed = false
    this.rbPressed = false
    this.ltPressed = false  // 左扳机 > 0.5
    this.rtPressed = false  // 右扳机 > 0.5

    // 上帧按键状态（用于边沿检测）
    this._prevA = false
    this._prevB = false
    this._prevX = false
    this._prevRB = false

    // 是否跳帧（第一次连接时跳过，避免误触发）
    this._skipNext = true

    // 绑定事件
    this._onConnected = (e) => {
      console.log('[Gamepad] 已连接:', e.gamepad.id)
      this._gamepad = e.gamepad
      this.connected = true
      this._skipNext = true
    }
    this._onDisconnected = (e) => {
      console.log('[Gamepad] 已断开:', e.gamepad.id)
      if (this._gamepad && this._gamepad.index === e.gamepad.index) {
        this._gamepad = null
        this.connected = false
        this.axes = [0, 0]
      }
    }

    window.addEventListener('gamepadconnected', this._onConnected)
    window.addEventListener('gamepaddisconnected', this._onDisconnected)

    // 如果手柄已连接，立即捕获
    this._pollExisting()
  }

  /** 尝试捕获已连接的手柄 */
  _pollExisting() {
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      for (const gp of gamepads) {
        if (gp) {
          this._gamepad = gp
          this.connected = true
          this._skipNext = true
          console.log('[Gamepad] 已检测到已连接的手柄:', gp.id)
          break
        }
      }
    } catch {
      // Gamepad API 可能不可用
    }
  }

  /**
   * 每帧调用，刷新手柄状态。
   * 返回 true 表示有手柄连接且状态已更新。
   */
  update() {
    if (!this.connected) {
      // 尝试重新检测（可能用户后插手柄）
      this._pollExisting()
      if (!this.connected) return false
    }

    // 重新获取 Gamepad 引用（Chrome 需要每帧重新查询）
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      if (this._gamepad && gamepads[this._gamepad.index]) {
        this._gamepad = gamepads[this._gamepad.index]
      } else {
        // 手柄断开
        this.connected = false
        this.axes = [0, 0]
        return false
      }
    } catch {
      this.connected = false
      return false
    }

    const gp = this._gamepad
    if (!gp) {
      this.connected = false
      return false
    }

    // --- 读取左摇杆（axes[0] = 水平, axes[1] = 垂直）---
    let ax = gp.axes[0] || 0
    let ay = gp.axes[1] || 0

    // 死区处理（消除摇杆漂移）
    const DEAD_ZONE = 0.15
    if (Math.abs(ax) < DEAD_ZONE) ax = 0
    if (Math.abs(ay) < DEAD_ZONE) ay = 0

    // 归一化（避免斜向超速）
    const len = Math.sqrt(ax * ax + ay * ay)
    if (len > 1) {
      ax /= len
      ay /= len
    }
    this.axes[0] = ax
    this.axes[1] = ay

    // --- 读取按键（标准映射）---
    // buttons[0]=A, [1]=B, [2]=X, [3]=Y, [5]=RB, [6]=LT, [7]=RT
    const bA = !!(gp.buttons[0] && gp.buttons[0].pressed)
    const bB = !!(gp.buttons[1] && gp.buttons[1].pressed)
    const bX = !!(gp.buttons[2] && gp.buttons[2].pressed)
    const bY = !!(gp.buttons[3] && gp.buttons[3].pressed)
    const bRB = !!(gp.buttons[5] && gp.buttons[5].pressed)
    const bLT = !!(gp.buttons[6] && gp.buttons[6].value > 0.5)
    const bRT = !!(gp.buttons[7] && gp.buttons[7].value > 0.5)

    // 边沿检测（只在按下的第一帧触发）
    if (this._skipNext) {
      this._prevA = bA
      this._prevB = bB
      this._prevX = bX
      this._prevRB = bRB
      this._skipNext = false
    }

    this.aPressed = bA && !this._prevA
    this.bPressed = bB && !this._prevB
    this.xPressed = bX && !this._prevX
    this.yPressed = bY && !this._prevY
    this.rbPressed = bRB && !this._prevRB

    this.ltPressed = bLT
    this.rtPressed = bRT

    // 快捷组合
    this.firePressed = this.aPressed || this.xPressed || this.rtPressed
    this.dashPressed = this.bPressed || this.rbPressed

    this._prevA = bA
    this._prevB = bB
    this._prevX = bX
    this._prevRB = bRB

    return true
  }

  /** 触发一次震动（如果手柄支持） */
  vibrate(duration = 100, intensity = 0.3) {
    try {
      if (this._gamepad && this._gamepad.vibrationActuator) {
        this._gamepad.vibrationActuator.playEffect('dual-rumble', {
          duration,
          weakMagnitude: intensity,
          strongMagnitude: intensity,
        })
      }
    } catch {
      // 不支持震动
    }
  }

  destroy() {
    window.removeEventListener('gamepadconnected', this._onConnected)
    window.removeEventListener('gamepaddisconnected', this._onDisconnected)
    this._gamepad = null
    this.connected = false
  }
}
