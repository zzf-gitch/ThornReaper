/**
 * AudioManager — 程序化音效管理器
 * 使用 Web Audio API 实时合成音效，无需外部音频文件
 *
 * 带音效并发池：同种声音同时播放数量超过限制时丢弃新请求，防止音频失真卡顿。
 */
export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null
    this._initialized = false

    // ===== 音效并发池 =====
    /** @type {Record<string, number>} 当前各类音效活跃数 */
    this._activeCounts = {}
    /** 各类音效最大并发数 */
    this._maxConcurrent = {
      shoot:    3,
      hit:      3,
      explosion: 2,
      pickup:   2,
      hurt:     2,
      levelup:  1,
    }
    /** 各类音效持续时间（秒），用于自动释放池 */
    this._soundDuration = {
      shoot:     0.10,
      hit:       0.10,
      explosion: 0.16,
      pickup:    0.08,
      hurt:      0.26,
      levelup:   0.85,
    }
  }

  /**
   * 初始化 AudioContext（必须在用户交互后调用）
   * 如果浏览器因未授权而挂起 AudioContext，自动尝试 resume
   */
  init() {
    if (this._initialized) return
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()
      this._initialized = true
      // 如果处于 suspended 状态（非用户交互创建），立即尝试恢复
      if (this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {
          // 恢复失败时，监听下一次用户交互自动恢复
          const resumeOnInteraction = () => {
            if (this._ctx && this._ctx.state === 'suspended') {
              this._ctx.resume().catch(() => {})
            }
            document.removeEventListener('pointerdown', resumeOnInteraction)
            document.removeEventListener('touchstart', resumeOnInteraction)
          }
          document.addEventListener('pointerdown', resumeOnInteraction, { once: true })
          document.addEventListener('touchstart', resumeOnInteraction, { once: true })
        })
      }
    } catch (e) {
      console.warn('[Audio] Web Audio API 不可用')
    }
  }

  // ===== 并发池管理 =====

  /**
   * 检查并占用一个音效槽位
   * @param {string} type 音效类型
   * @returns {boolean} 是否可以播放
   */
  _acquire(type) {
    const max = this._maxConcurrent[type]
    if (max === undefined) return true // 未限制的类型直接放行
    const count = this._activeCounts[type] || 0
    if (count >= max) return false
    this._activeCounts[type] = count + 1
    return true
  }

  /**
   * 释放一个音效槽位
   */
  _release(type) {
    const cur = this._activeCounts[type] || 0
    if (cur > 0) this._activeCounts[type] = cur - 1
  }

  /**
   * 安全播放：先尝试获取槽位，成功后播放并在音效结束时自动释放
   * @param {string} type 音效类型
   * @param {Function} playFn 实际播放的函数
   */
  _safePlay(type, playFn) {
    if (!this._ctx) return
    if (!this._acquire(type)) return // 并发上限，丢弃
    const duration = this._soundDuration[type] || 0.1
    try {
      playFn()
    } catch (e) {
      // 播放失败立即释放
      this._release(type)
      return
    }
    // 音效结束后自动释放槽位
    setTimeout(() => {
      if (this._ctx) this._release(type)
    }, duration * 1000 + 50) // 加 50ms 余量
  }

  // ===== 公开音效 API =====

  /** 播放射击音效 */
  playShoot() {
    this._safePlay('shoot', () => {
      this._playTone(800, 0.06, 'square', 0.07)
      this._playTone(600, 0.08, 'sine', 0.05)
    })
  }

  /** 播放击中音效 */
  playHit() {
    this._safePlay('hit', () => {
      this._playTone(400, 0.05, 'square', 0.06)
      this._playTone(300, 0.1, 'sine', 0.04)
    })
  }

  /** 播放敌人死亡爆炸音效 */
  playExplosion() {
    this._safePlay('explosion', () => {
      this._playNoise(0.12, 0.1)
      this._playTone(80, 0.15, 'sawtooth', 0.08)
    })
  }

  /** 播放升级音效 */
  playLevelUp() {
    this._safePlay('levelup', () => {
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.1), i * 80)
      })
    })
  }

  /** 播放受伤音效 */
  playHurt() {
    this._safePlay('hurt', () => {
      this._playTone(150, 0.2, 'sawtooth', 0.12)
      this._playTone(100, 0.25, 'square', 0.06)
    })
  }

  /** 播放经验拾取音效 */
  playPickup() {
    this._safePlay('pickup', () => {
      this._playTone(880, 0.05, 'sine', 0.05)
      this._playTone(1100, 0.07, 'sine', 0.04)
    })
  }

  // ===== 内部辅助 =====

  /**
   * 播放一个简单音调
   * @param {number} freq - 频率
   * @param {number} duration - 时长（秒）
   * @param {OscillatorType} type - 波形
   * @param {number} volume - 音量 0-1
   */
  _playTone(freq, duration, type = 'sine', volume = 0.1) {
    if (!this._ctx) return
    // 如果 AudioContext 被挂起，尝试恢复
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {})
      return // 本次播放放弃，下次再试
    }
    try {
      const osc = this._ctx.createOscillator()
      const gain = this._ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this._ctx.currentTime)
      gain.gain.setValueAtTime(volume, this._ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(this._ctx.destination)
      osc.start()
      osc.stop(this._ctx.currentTime + duration)
    } catch (e) { /* ignore */ }
  }

  /**
   * 播放白噪音
   * @param {number} duration - 时长
   * @param {number} volume - 音量
   */
  _playNoise(duration, volume = 0.1) {
    if (!this._ctx) return
    // 如果 AudioContext 被挂起，尝试恢复
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {})
      return
    }
    try {
      const bufferSize = this._ctx.sampleRate * duration
      const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const source = this._ctx.createBufferSource()
      source.buffer = buffer
      const gain = this._ctx.createGain()
      gain.gain.setValueAtTime(volume, this._ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration)
      source.connect(gain)
      gain.connect(this._ctx.destination)
      source.start()
    } catch (e) { /* ignore */ }
  }

  /** 暂停 AudioContext（暂停时静音，节省 CPU） */
  suspend() {
    if (this._ctx && this._ctx.state === 'running') {
      this._ctx.suspend().catch(() => {})
    }
  }

  /** 恢复 AudioContext */
  resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {})
    }
  }

  /** 销毁 */
  destroy() {
    if (this._ctx) {
      this._ctx.close()
      this._ctx = null
    }
    this._initialized = false
    this._activeCounts = {}
  }
}

/** 全局单例 */
export const audioManager = new AudioManager()
