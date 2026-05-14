/**
 * SpriteCache — 离屏 Canvas 预渲染管理器
 *
 * 将子弹、经验球、敌人、玩家等所有精灵预先渲染到离屏 Canvas 上，
 * 主循环直接用 drawImage 替代每帧渐变计算，性能可提升 5-10 倍。
 *
 * 使用 PixelArt 生成像素画风格精灵，
 * 同时保留 AssetLoader 精灵图降级能力。
 *
 * 使用范例：
 *   SpriteCache.init()          // 在游戏初始化时调用一次
 *   SpriteCache.drawBullet(ctx, x, y)  // 直接绘制缓存好的子弹
 */
import { AssetLoader } from './AssetLoader.js'
import { PixelArt } from './PixelArt.js'

export class SpriteCache {
  /** 是否已初始化 */
  static _ready = false

  // 缓存字典：name -> { canvas, width, height }
  static _cache = {}

  /**
   * 初始化所有精灵缓存（必须在 Canvas 上下文可用后调用）
   */
  static init() {
    if (this._ready) return

    this._cacheBullet()       // 子弹
    this._cacheOrb()          // 经验球
    this._cacheEnemy()        // 敌人（4 种类型）
    this._cachePlayer()       // 玩家
    this._cacheHitFlash()     // HitFlash

    this._ready = true
  }

  // ========== 子弹 ==========
  static _cacheBullet() {
    const c = PixelArt.generateBullet()
    this._cache.bullet = {
      canvas: c,
      width: c.width,
      height: c.height,
      cx: c.width / 2,
      cy: c.height / 2,
    }
  }

  // ========== 经验球 ==========
  static _cacheOrb() {
    const c = PixelArt.generateOrb()
    this._cache.orb = {
      canvas: c,
      width: c.width,
      height: c.height,
      cx: c.width / 2,
      cy: c.height / 2,
    }
  }

  // ========== 敌人（4 种类型） ==========
  static _cacheEnemy() {
    // 生成 7 种类型的敌人精灵
    const types = [
      { key: 'chaser',   gen: () => PixelArt.generateEnemyChaser('#4CAF50') },
      { key: 'charger',  gen: () => PixelArt.generateEnemyCharger('#FF8C00') },
      { key: 'ranger',   gen: () => PixelArt.generateEnemyRanger('#3F51B5') },
      { key: 'suicider', gen: () => PixelArt.generateEnemySuicider('#9C27B0') },
      { key: 'shield',   gen: () => PixelArt.generateEnemyShield('#78909C') },
      { key: 'suicide_bug', gen: () => PixelArt.generateEnemySuicideBug('#66BB6A') },
      { key: 'elite_ranger', gen: () => PixelArt.generateEnemyEliteRanger('#FFD54F') },
      { key: 'boss',        gen: () => PixelArt.generateBoss('#8E24AA') },
      { key: 'super_chest', gen: () => PixelArt.generateSuperChest() },
    ]

    for (const t of types) {
      const c = t.gen()
      this._cache['enemy_' + t.key] = {
        canvas: c,
        width: c.width,
        height: c.height,
        half: c.width / 2,
      }
    }

    // 默认敌人（chaser 同款）
    this._cache.enemy = this._cache.enemy_chaser
  }

  // ========== 玩家 ==========
  static _cachePlayer() {
    const c = PixelArt.generatePlayer()
    this._cache.player = {
      canvas: c,
      width: c.width,
      height: c.height,
      cx: c.width / 2,
      cy: c.height / 2,
    }
  }

  // ========== HitFlash ==========
  static _cacheHitFlash() {
    const c = PixelArt.generateHitFlash()
    const r = c.width / 2
    this._cache.hitFlash = {
      canvas: c,
      width: c.width,
      height: c.height,
      cx: c.width / 2,
      cy: c.height / 2,
      r,
    }
  }

  // ========== 绘制方法（均支持 AssetLoader 精灵图降级） ==========

  /** 绘制子弹到指定位置 */
  static drawBullet(ctx, x, y) {
    if (AssetLoader.hasImage('bullet')) {
      const img = AssetLoader.getImage('bullet')
      const cfg = AssetLoader.getConfig('bullet')
      const half = (cfg?.size || 10) / 2
      ctx.drawImage(img, x - half, y - half)
      return
    }
    const s = this._cache.bullet
    if (!s) return
    ctx.drawImage(s.canvas, x - s.cx, y - s.cy)
  }

  /** 绘制经验球到指定位置（带缩放） */
  static drawOrb(ctx, x, y, scale = 1) {
    if (AssetLoader.hasImage('orb')) {
      const img = AssetLoader.getImage('orb')
      const cfg = AssetLoader.getConfig('orb')
      const size = (cfg?.size || 12) * scale
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
      return
    }
    const s = this._cache.orb
    if (!s) return
    if (scale <= 0.01) return
    const w = s.width * scale
    const h = s.height * scale
    ctx.drawImage(s.canvas, x - w / 2, y - h / 2, w, h)
  }

  /**
   * 按敌人类型绘制
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {string} type - 'chaser' | 'charger' | 'ranger' | 'suicider'
   */
  static drawEnemyByType(ctx, x, y, type = 'chaser') {
    if (AssetLoader.hasImage('enemy')) {
      const img = AssetLoader.getImage('enemy')
      const cfg = AssetLoader.getConfig('enemy')
      const half = (cfg?.size || 28) / 2
      ctx.drawImage(img, x - half, y - half)
      return
    }
    const key = 'enemy_' + type
    const s = this._cache[key] || this._cache.enemy
    if (!s) return
    ctx.drawImage(s.canvas, x - s.half, y - s.half)
  }

  /** 绘制敌人到指定位置（向后兼容，默认 chaser 类型） */
  static drawEnemy(ctx, x, y) {
    this.drawEnemyByType(ctx, x, y, 'chaser')
  }

  /** 绘制玩家到指定位置（blink=true 时半透明闪烁，用于无敌状态） */
  static drawPlayer(ctx, x, y, blink = false) {
    if (AssetLoader.hasImage('player')) {
      const img = AssetLoader.getImage('player')
      const cfg = AssetLoader.getConfig('player')
      const half = (cfg?.size || 32) / 2
      if (blink) {
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.drawImage(img, x - half, y - half)
        ctx.restore()
      } else {
        ctx.drawImage(img, x - half, y - half)
      }
      return
    }
    const s = this._cache.player
    if (!s) return
    if (blink) {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.drawImage(s.canvas, x - s.cx, y - s.cy)
      ctx.restore()
    } else {
      ctx.drawImage(s.canvas, x - s.cx, y - s.cy)
    }
  }

  /** 绘制 HitFlash 到指定位置（带进度动画） */
  static drawHitFlash(ctx, x, y, progress, maxRadius) {
    if (AssetLoader.hasImage('hitFlash')) {
      const img = AssetLoader.getImage('hitFlash')
      const cfg = AssetLoader.getConfig('hitFlash')
      const size = (cfg?.size || 68) * (1 - progress * 0.3)
      ctx.save()
      ctx.globalAlpha = 1 - progress
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
      ctx.restore()
      return
    }
    const s = this._cache.hitFlash
    if (!s) return
    ctx.save()
    const currentRadius = maxRadius * (0.3 + progress * 0.7)
    const alpha = 1 - progress
    ctx.globalAlpha = alpha
    const baseR = s.r - 2
    const scale = currentRadius / baseR
    const drawSize = s.width * scale
    ctx.drawImage(s.canvas, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize)
    ctx.restore()
  }
}
