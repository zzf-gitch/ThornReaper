/**
 * AutoPistolWeapon — 自动手枪武器
 *
 * 逻辑：每帧搜寻最近的敌人，冷却就绪时朝其发射直线弹道子弹。
 * 子弹从玩家位置飞向目标位置，使用对象池 BulletPool 管理。
 *
 * 独立冷却计时器，不干扰游戏主循环的子弹系统。
 */
import { WeaponBase } from './WeaponBase.js'
import { BulletPool } from './BulletPool.js'
import { DamageNumber } from './DamageNumber.js'
import { HitFlash } from './HitFlash.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.auto_pistol

export class AutoPistolWeapon extends WeaponBase {
  /**
   * @param {object} [opts] 覆盖默认参数
   */
  constructor(opts = {}) {
    super({
      id: 'auto_pistol',
      damage: CFG.damage,           // 伤害倍率
      cooldown: CFG.cooldown,       // 射击间隔
      range: CFG.range,             // 射程
      count: CFG.count,             // 每次发射子弹数
      ...opts,
    })

    /** 独立的子弹对象池（不与玩家主弹幕共享） */
    this._bulletPool = new BulletPool(CFG.bulletPoolSize)

    /** 子弹飞行速度（像素/秒） */
    this._bulletSpeed = CFG.bulletSpeed

    /** 子弹半径 */
    this._bulletRadius = CFG.bulletRadius

    /** 子弹颜色 */
    this._bulletColor = CFG.bulletColor
  }

  _onLevelUp() {
    const lu = CFG.levelUp
    // 升级：冷却缩短、伤害提升、子弹速度加快、射程增加
    this._cooldown = Math.max(lu.cooldownMin, this._cooldown * lu.cooldownMult)
    this._damageMult += lu.damageAdd
    this._bulletSpeed += lu.bulletSpeedAdd
    this._count = Math.min(this._count + lu.countAdd, lu.countCap)  // 每次多发子弹
    this._range += lu.rangeAdd
  }

  /**
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs - { damageNumbers, hitFlashes, deathParticles, orbs, audioManager, HitFlash, spawnDeathParticles, ExperienceOrb }
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    // 1) 更新子弹池
    this._bulletPool.updateAll(dt)

    // 2) 碰撞检测：自动手枪的子弹 vs 敌人
    this._checkCollisions(player, enemies, refs)

    // 3) 冷却计时
    this.cooldownTimer -= dt
    if (this.cooldownTimer > 0) return

    // 4) 搜寻最近敌人
    const target = this._findNearest(enemies, player)
    if (!target) return

    // 5) 发射子弹
    this.cooldownTimer = this._cooldown
    this.lastFireTime = performance.now()

    const count = this._count
    for (let i = 0; i < count; i++) {
      // 多发子弹扇形散布
      const spreadAngle = count > 1 ? (i - (count - 1) / 2) * 0.1 : 0
      const dx = target.x - player.x
      const dy = target.y - player.y
      const angle = Math.atan2(dy, dx) + spreadAngle
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)

      this._bulletPool.allocate(
        player.x, player.y,
        dirX, dirY,
        this._bulletSpeed,
        1,                    // 穿透次数：不穿透
        this._bulletRadius
      )
    }

    refs.audioManager?.playShoot()
  }

  /** 查找距离玩家最近的敌人 */
  _findNearest(enemies, player) {
    let nearest = null
    let minDistSq = this._range * this._range
    for (const e of enemies) {
      const dx = e.x - player.x
      const dy = e.y - player.y
      const distSq = dx * dx + dy * dy
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = e
      }
    }
    return nearest
  }

  /** 子弹与敌人碰撞检测 */
  _checkCollisions(player, enemies, refs) {
    const toDealloc = []

    this._bulletPool.forEach((bullet) => {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const dx = bullet.x - e.x
        const dy = bullet.y - e.y
        const hitDist = (e.size || 24) / 2 + bullet.radius
        if (dx * dx + dy * dy < hitDist * hitDist) {
          const dmg = this.getDmg(player)
          const dead = e.takeDamage(dmg)

          // 击退
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          e.knockback(dx / dist, dy / dist, 6)

          refs.hitFlashes.push(new HitFlash(e.x, e.y, e.size))
          refs.damageNumbers.push(new DamageNumber(
            (bullet.x + e.x) / 2, (bullet.y + e.y) / 2 - 5,
            `-${dmg}`, '#f39c12'
          ))
          refs.audioManager?.playHit()

          // 标记回收子弹
          toDealloc.push(bullet.index)

          if (dead) {
            player.kills++
            refs.audioManager?.playExplosion()
            refs.damageNumbers.push(new DamageNumber(e.x, e.y - 10, '💥', '#f1c40f'))
            refs.deathParticles.push(...refs.spawnDeathParticles(e.x, e.y, e.color))
            refs.orbs.push(new refs.ExperienceOrb(e.x, e.y))
            enemies.splice(i, 1)
          }

          // 每颗子弹只伤害一个敌人
          break
        }
      }
    })

    // 回收碰撞后的子弹
    for (const idx of toDealloc) {
      this._bulletPool.deallocate(idx)
    }
  }

  /**
   * 绘制子弹
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx, camera) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    this._bulletPool.forEach((bullet) => {
      // 升级发光特效
      if (glow.blur > 0) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
        // 外发光大光圈
        ctx.fillStyle = glow.color
        ctx.globalAlpha = 0.15
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bullet.radius * 3 * glow.scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1.0
      }

      // 绘制子弹（金黄色圆形）
      ctx.fillStyle = glow.blur > 0 ? '#ffeb3b' : this._bulletColor
      ctx.shadowColor = glow.blur > 0 ? glow.color : this._bulletColor
      ctx.shadowBlur = glow.blur > 0 ? glow.blur : 8
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.radius * glow.scale, 0, Math.PI * 2)
      ctx.fill()

      // 拖尾效果
      ctx.shadowBlur = 0
      ctx.globalAlpha = glow.blur > 0 ? 0.5 : 0.3
      ctx.fillStyle = glow.blur > 0 ? glow.color : '#f1c40f'
      ctx.beginPath()
      ctx.arc(
        bullet.x - bullet.dirX * (8 * glow.scale),
        bullet.y - bullet.dirY * (8 * glow.scale),
        bullet.radius * 0.6 * glow.scale,
        0, Math.PI * 2
      )
      ctx.fill()
      ctx.globalAlpha = 1.0
    })
    ctx.restore()
  }

  toJSON() {
    return {
      ...super.toJSON(),
      bulletSpeed: this._bulletSpeed,
      count: this._count,
    }
  }

  fromJSON(data) {
    super.fromJSON(data)
    if (data.bulletSpeed !== undefined) this._bulletSpeed = data.bulletSpeed
    if (data.count !== undefined) this._count = data.count
  }
}
