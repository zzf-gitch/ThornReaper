/**
 * BoomerangWeapon — 旋转飞刀武器
 *
 * 飞刀以玩家为中心，按固定半径匀速旋转。
 * 触碰敌人时自动造成伤害（不消失，持续旋转）。
 * 支持多个飞刀同时环绕。
 */
import { WeaponBase } from './WeaponBase.js'
import { DamageNumber } from './DamageNumber.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.boomerang

export class BoomerangWeapon extends WeaponBase {
  /**
   * @param {object} [opts] 覆盖 WeaponBase 默认
   */
  constructor(opts = {}) {
    super({
      id: 'boomerang',
      damage: CFG.damage,
      cooldown: CFG.cooldown,          // 飞刀无冷却 — 始终旋转
      range: CFG.range,
      count: CFG.count,             // 初始 2 把
      ...opts,
    })

    /** 每把飞刀 { angle, radius, speed, wx, wy } — wx/wy 由 update 每帧计算 */
    this._blades = []

    // 初始布阵：均分角度
    this._initBlades()
  }

  /** 初始化 / 重布飞刀位置 */
  _initBlades() {
    const br = CFG.blade.radiusRange
    const sr = CFG.blade.speedRange
    while (this._blades.length < this._count) {
      this._blades.push({
        angle: this._blades.length * (Math.PI * 2 / this._count) + Math.random() * 0.5,
        radius: this._range * (br[0] + Math.random() * (br[1] - br[0])),
        speed: sr[0] + Math.random() * (sr[1] - sr[0]),   // 弧度/秒
        wx: 0, wy: 0,  // 缓存世界坐标，由 update 计算，render 使用
      })
    }
    // 如果数量减少就裁剪
    if (this._blades.length > this._count) {
      this._blades.length = this._count
    }
  }

  /** 升级增强 */
  _onLevelUp() {
    const lu = CFG.levelUp
    this._damageMult += lu.damageAdd
    this._count = Math.min(this._count + lu.countAdd, lu.countCap)
    this._range = Math.min(this._range + lu.rangeAdd, lu.rangeCap)
    // 重新布阵
    this._initBlades()
  }

  /**
   * 每帧更新旋转
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs - { damageNumbers, hitFlashes, deathParticles, orbs, audioManager, HitFlash, spawnDeathParticles, ExperienceOrb }
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    for (const blade of this._blades) {
      // 更新角度
      blade.angle += blade.speed * dt

      // 计算并缓存世界坐标（供 render 直接使用，避免重复计算）
      blade.wx = player.x + Math.cos(blade.angle) * blade.radius
      blade.wy = player.y + Math.sin(blade.angle) * blade.radius
      const bx = blade.wx
      const by = blade.wy

      // 碰撞检测（飞刀不消失，每帧只伤害同一敌人一次）
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const dx = bx - e.x
        const dy = by - e.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitRadius = (e.size || 24) / 2 + 12  // 攻击判定半径

        if (dist < hitRadius) {
          const dmg = this.getDmg(player)
          const dead = e.takeDamage(dmg)
          // 击退
          const nx = dx / (dist || 1)
          const ny = dy / (dist || 1)
          e.knockback(nx, ny, 6)

          refs.hitFlashes.push(new refs.HitFlash(e.x, e.y, e.size))
          refs.damageNumbers.push(new DamageNumber(bx, by - 10, `-${dmg}`, '#2ecc71'))
          refs.audioManager?.playHit()

          if (dead) {
            player.kills++
            refs.audioManager?.playExplosion()
            refs.damageNumbers.push(new DamageNumber(e.x, e.y - 10, '💥', '#f1c40f'))
            refs.deathParticles.push(...refs.spawnDeathParticles(e.x, e.y, e.color))
            refs.orbs.push(new refs.ExperienceOrb(e.x, e.y))
            enemies.splice(i, 1)
          }

          // 每帧每把飞刀只伤一个敌人
          break
        }
      }
    }
  }

  /**
   * 绘制飞刀
   * @param {CanvasRenderingContext2D} ctx - 已 translate(-camera) 的 context
   * @param {Camera} camera
   */
  draw(ctx, camera) {
    // draw() 为空，实际由 render() 绘制
  }

  /**
   * 绘制飞刀（由 useGameEngine 的 render 循环调用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Player} player
   */
  render(ctx, player) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    for (const blade of this._blades) {
      const bx = blade.wx
      const by = blade.wy
      if (!bx && bx !== 0) continue  // 跳过未初始化的

      // 发光升级特效
      if (glow.blur > 0) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 绘制飞刀本体（回旋镖形状）
      ctx.save()
      ctx.translate(bx, by)
      ctx.rotate(blade.angle + Math.PI / 4)

      // 刀身（根据等级缩放）
      const baseSize = 10
      const size = baseSize * glow.scale
      ctx.fillStyle = '#95a5a6'
      ctx.strokeStyle = '#7f8c8d'
      ctx.lineWidth = 1.5 * glow.scale

      // 菱形刀身
      ctx.beginPath()
      ctx.moveTo(size, 0)
      ctx.lineTo(0, -size * 0.5)
      ctx.lineTo(-size, 0)
      ctx.lineTo(0, size * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // 中心亮点
      ctx.shadowBlur = 0
      ctx.fillStyle = glow.blur > 0 ? glow.color : '#f1c40f'
      ctx.beginPath()
      ctx.arc(0, 0, 2 * glow.scale, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // 还原发光
      if (glow.blur > 0) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 旋转轨迹虚线（升级后更亮）
      ctx.shadowBlur = 0
      const trailAlpha = glow.blur > 0 ? 0.15 + (glow.blur / 40) * 0.1 : 0.08
      ctx.strokeStyle = CFG.trailColor.replace('%alpha%', trailAlpha)
      ctx.lineWidth = 1
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.arc(player.x, player.y, blade.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  toJSON() {
    return {
      ...super.toJSON(),
      blades: this._blades.map(b => ({ angle: b.angle, radius: b.radius, speed: b.speed })),
    }
  }

  fromJSON(data) {
    super.fromJSON(data)
    if (data.blades) {
      for (let i = 0; i < data.blades.length && i < this._blades.length; i++) {
        this._blades[i].angle = data.blades[i].angle
        this._blades[i].radius = data.blades[i].radius
        this._blades[i].speed = data.blades[i].speed
      }
    }
  }
}
