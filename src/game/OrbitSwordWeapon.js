/**
 * OrbitSwordWeapon — 环绕飞剑武器
 *
 * 飞剑在玩家周围持续旋转，触碰敌人时造成碰撞伤害。
 * 与 BoomerangWeapon 类似但有不同的视觉风格：
 * - 飞剑围绕固定的旋转半径
 * - 旋转速度恒定
 * - 每把飞剑独立造成伤害
 * - 纯物理碰撞，不发射子弹
 *
 * 独立的冷却判定：每把飞剑命中敌人后有自己的内置冷却，
 * 防止同一把剑每帧重复伤害同一敌人。
 */
import { WeaponBase } from './WeaponBase.js'
import { DamageNumber } from './DamageNumber.js'
import { HitFlash } from './HitFlash.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.orbit_sword

export class OrbitSwordWeapon extends WeaponBase {
  /**
   * @param {object} [opts] 覆盖默认参数
   */
  constructor(opts = {}) {
    super({
      id: 'orbit_sword',
      damage: CFG.damage,            // 伤害倍率
      cooldown: CFG.cooldown,         // 无冷却 — 始终旋转
      range: CFG.range,              // 旋转半径
      count: CFG.count,                // 初始 3 把飞剑
      ...opts,
    })

    /** 飞剑数组 [{ angle, radius, speed, hitTimer, wx, wy }] — wx/wy 由 update 缓存 */
    this._swords = []

    /** 飞剑旋转速度（弧度/秒） */
    this._rotateSpeed = CFG.rotateSpeed

    /** 每把剑命中同个敌人的内置冷却（秒） */
    this._hitCooldown = CFG.hitCooldown

    /** 飞剑大小 */
    this._swordSize = CFG.swordSize

    this._initSwords()
  }

  /** 初始化/重布飞剑位置 */
  _initSwords() {
    while (this._swords.length < this._count) {
      this._swords.push({
        angle: this._swords.length * (Math.PI * 2 / this._count),
        radius: this._range * (0.6 + Math.random() * 0.4),
        speed: this._rotateSpeed + (Math.random() - 0.5) * 0.5,
        /** 每把剑各敌人的命中冷却映射 { enemyId: timer } */
        hitMap: new Map(),
        wx: 0, wy: 0,  // 缓存世界坐标，由 update 计算，render 直接使用
      })
    }
    if (this._swords.length > this._count) {
      this._swords.length = this._count
    }
  }

  _onLevelUp() {
    const lu = CFG.levelUp
    this._damageMult += lu.damageAdd
    this._count = Math.min(this._count + lu.countAdd, lu.countCap)
    this._range = Math.min(this._range + lu.rangeAdd, lu.rangeCap)
    this._rotateSpeed = Math.min(this._rotateSpeed + lu.rotateAdd, CFG.rotateSpeedCap)
    this._swordSize += lu.sizeAdd
    this._initSwords()
  }

  /**
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    for (const sword of this._swords) {
      // 更新角度（持续旋转）
      sword.angle += sword.speed * dt

      // 计算并缓存世界坐标（供 render 直接使用，避免重复计算）
      sword.wx = player.x + Math.cos(sword.angle) * sword.radius
      sword.wy = player.y + Math.sin(sword.angle) * sword.radius
      const sx = sword.wx
      const sy = sword.wy

      // 更新每把剑的命中冷却
      for (const [key, timer] of sword.hitMap) {
        const newTimer = timer - dt
        if (newTimer <= 0) {
          sword.hitMap.delete(key)
        } else {
          sword.hitMap.set(key, newTimer)
        }
      }

      // 碰撞检测：飞剑 vs 敌人
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const dx = sx - e.x
        const dy = sy - e.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitRadius = (e.size || 24) / 2 + this._swordSize * 0.6

        if (dist < hitRadius) {
          // 内置冷却检查：避免同一把剑每帧重复伤同个敌人
          const enemyKey = e.x + '_' + e.y + '_' + i  // 用坐标+索引做临时 key
          if (sword.hitMap.has(enemyKey)) continue

          sword.hitMap.set(enemyKey, this._hitCooldown)

          const dmg = this.getDmg(player)
          const dead = e.takeDamage(dmg)

          // 击退
          const nx = dx / (dist || 1)
          const ny = dy / (dist || 1)
          e.knockback(nx, ny, 5)

          refs.hitFlashes.push(new HitFlash(e.x, e.y, e.size))
          refs.damageNumbers.push(new DamageNumber(sx, sy - 10, `-${dmg}`, '#9b59b6'))
          refs.audioManager?.playHit()

          if (dead) {
            player.kills++
            refs.audioManager?.playExplosion()
            refs.damageNumbers.push(new DamageNumber(e.x, e.y - 10, '💥', '#f1c40f'))
            refs.deathParticles.push(...refs.spawnDeathParticles(e.x, e.y, e.color))
            refs.orbs.push(new refs.ExperienceOrb(e.x, e.y))
            enemies.splice(i, 1)
          }

          // 每把飞剑每帧只伤一个敌人
          break
        }
      }
    }
  }

  /**
   * 绘制飞剑
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} camera
   */
  draw(ctx, camera) {
    // draw() 为空，实际由 render() 绘制
  }

  /**
   * 绘制飞剑实体（由 useGameEngine 的 render 循环调用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Player} player
   */
  render(ctx, player) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    for (const sword of this._swords) {
      const sx = sword.wx
      const sy = sword.wy
      if (!sx && sx !== 0) continue

      // 升级发光
      if (glow.blur > 0) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 飞剑本体
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(sword.angle + Math.PI / 2)

      // 剑身（细长菱形）
      const baseLen = this._swordSize
      const len = baseLen * glow.scale
      ctx.fillStyle = '#9b59b6'
      ctx.strokeStyle = '#8e44ad'
      ctx.lineWidth = 1.5 * glow.scale

      ctx.beginPath()
      ctx.moveTo(len, 0)
      ctx.lineTo(0, -len * 0.35)
      ctx.lineTo(-len, 0)
      ctx.lineTo(0, len * 0.35)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // 剑柄（小圆）
      ctx.shadowBlur = 0
      ctx.fillStyle = glow.blur > 0 ? glow.color : '#f1c40f'
      ctx.beginPath()
      ctx.arc(0, 0, 2.5 * glow.scale, 0, Math.PI * 2)
      ctx.fill()

      // 剑刃高光
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(len * 0.5, 0)
      ctx.lineTo(0, -len * 0.2)
      ctx.stroke()

      ctx.restore()

      // 还原发光
      if (glow.blur > 0) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 旋转轨迹（升级后更亮）
      ctx.shadowBlur = 0
      const trailAlpha = glow.blur > 0 ? 0.15 + (glow.blur / 40) * 0.1 : 0.08
      ctx.strokeStyle = CFG.trailColor.replace('%alpha%', trailAlpha)
      ctx.lineWidth = 1
      ctx.setLineDash([3, 8])
      ctx.beginPath()
      ctx.arc(player.x, player.y, sword.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  toJSON() {
    return {
      ...super.toJSON(),
      swords: this._swords.map(s => ({ angle: s.angle, radius: s.radius, speed: s.speed })),
    }
  }

  fromJSON(data) {
    super.fromJSON(data)
    if (data.swords) {
      for (let i = 0; i < data.swords.length && i < this._swords.length; i++) {
        this._swords[i].angle = data.swords[i].angle
        this._swords[i].radius = data.swords[i].radius
        this._swords[i].speed = data.swords[i].speed
      }
    }
  }
}
