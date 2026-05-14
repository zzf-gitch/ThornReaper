/**
 * GameLoop — 基于 requestAnimationFrame 的固定时间步长游戏循环
 * 目标 60FPS，使用 deltaTime 保证帧率无关的移动
 */
export class GameLoop {
  /**
   * @param {Object} callbacks
   * @param {(deltaTime: number) => void} callbacks.update  每帧逻辑更新
   * @param {(ctx: CanvasRenderingContext2D) => void} callbacks.render  每帧渲染
   */
  constructor({ update, render }) {
    this._update = update
    this._render = render

    this._running = false
    this._rafId = null

    // 时间跟踪
    this._lastTime = 0
    this._fps = 0
    this._frameCount = 0
    this._fpsTimer = 0
  }

  /** 启动循环 */
  start() {
    if (this._running) return
    this._running = true
    this._lastTime = performance.now()
    this._fpsTimer = this._lastTime
    this._frameCount = 0
    this._tick(this._lastTime)
  }

  /** 停止循环 */
  stop() {
    this._running = false
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /** 暂停循环（停止 rAF，准备恢复时重新校准时间） */
  pause() {
    if (!this._running) return
    this._running = false
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /** 恢复循环（重置 _lastTime 避免 deltaTime 跳跃） */
  resume() {
    if (this._running) return
    this._running = true
    // 重置基准时间，确保恢复后第一帧 deltaTime ≈ 0，不会跳跃
    this._lastTime = performance.now()
    this._fpsTimer = this._lastTime
    this._frameCount = 0
    this._tick(this._lastTime)
  }

  /** 获取当前 FPS */
  get fps() {
    return this._fps
  }

  /** 主循环 tick */
  _tick = (now) => {
    if (!this._running) return

    // 计算 deltaTime（秒），上限 0.1s 防止大帧跳跃
    let deltaTime = (now - this._lastTime) / 1000
    if (deltaTime > 0.1) deltaTime = 0.1

    this._lastTime = now

    // FPS 统计
    this._frameCount++
    if (now - this._fpsTimer >= 1000) {
      this._fps = this._frameCount
      this._frameCount = 0
      this._fpsTimer = now
    }

    // 更新逻辑
    this._update(deltaTime)

    // 渲染
    this._render()

    // 预约下一帧
    this._rafId = requestAnimationFrame(this._tick)
  }
}
