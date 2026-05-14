/**
 * LightningWeapon — 闪电链武器
 *
 * 每隔冷却时间，随机打击屏幕内 count 个敌人。
 * 闪电会在敌人之间跳跃链式传导。
 * 纯视觉伤害效果，不生成实体。
 */
import { WeaponBase } from './WeaponBase.js'
import { DamageNumber } from './DamageNumber.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.lightning_weapon

export class LightningWeapon extends WeaponBase {
  constructor(opts = {}) {
    super({
      id: 'lightning_weapon',
      damage: CFG.damage,
      cooldown: CFG.cooldown,
      range: CFG.range,
      count: CFG.count,          // 初始打击数
      ...opts,
    })

    /** 当前帧需要绘制的闪电链 [{ x1,y1, x2,y2, timer }] */
    this._arcs = []

    /** 跳跃次数（链式传导） */
    this.chainJumps = CFG.chainJumps
  }

  _onLevelUp() {
    const lu = CFG.levelUp
    this._damageMult += lu.damageAdd
    this._cooldown = Math.max(lu.cooldownMin, this._cooldown * lu.cooldownMult)
    this._count = Math.min(this._count + lu.countAdd, lu.countCap)
    this.chainJumps = Math.min(this.chainJumps + lu.chainAdd, CFG.chainJumpsCap)
    this._range += lu.rangeAdd
  }

  /**
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    // 地牢动画淡出
    for (let i = this._arcs.length - 1; i >= 0; i--) {
      this._arcs[i].timer -= dt
      if (this._arcs[i].timer <= 0) this._arcs.splice(i, 1)
    }

    // 冷却计时
    this.cooldownTimer -= dt
    if (this.cooldownTimer > 0) return
    this.cooldownTimer = this._cooldown

    // 找到屏幕内最近的敌人
    const inRange = enemies.filter(e => {
      const dx = e.x - player.x, dy = e.y - player.y
      return Math.sqrt(dx * dx + dy * dy) < this._range
    })
    if (inRange.length === 0) return

    // 打击 count 个目标（每个目标独立触发链式传导）
    const targets = inRange.sort(() => Math.random() - 0.5).slice(0, this._count)

    for (const primary of targets) {
      this._strikeChain(primary, enemies, player, refs)
    }
  }

  /** 对目标施加闪电 + 链式传导 */
  _strikeChain(target, enemies, player, refs) {
    let current = target
    let prevX = player.x
    let prevY = player.y

    for (let jump = 0; jump <= this.chainJumps; jump++) {
      if (!current || !current.alive) break

      const dmg = this.getDmg(player)
      const dead = current.takeDamage(dmg)

      // 闪电弧线
      this._arcs.push({
        x1: prevX, y1: prevY,
        x2: current.x, y2: current.y,
        timer: CFG.arcDuration + Math.random() * 0.1,
      })

      refs.hitFlashes.push(new refs.HitFlash(current.x, current.y, current.size))
      refs.damageNumbers.push(new DamageNumber(current.x, current.y - 10, `⚡${dmg}`, '#3498db'))
      refs.audioManager?.playHit()

      if (dead) {
        player.kills++
        refs.audioManager?.playExplosion()
        refs.damageNumbers.push(new DamageNumber(current.x, current.y - 10, '💥', '#f1c40f'))
        refs.deathParticles.push(...refs.spawnDeathParticles(current.x, current.y, current.color))
        refs.orbs.push(new refs.ExperienceOrb(current.x, current.y))
        const idx = enemies.indexOf(current)
        if (idx !== -1) enemies.splice(idx, 1)
      }

      // 找下一个跳跃目标（离 current 最近的存活敌人）
      prevX = current.x
      prevY = current.y
      let nearest = null
      let minDist = 150 + this._range * 0.3  // 跳跃范围
      for (const e of enemies) {
        if (e === current) continue
        if (!e.alive) continue
        const dx = e.x - current.x, dy = e.y - current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) {
          minDist = dist
          nearest = e
        }
      }
      current = nearest
    }
  }

  /**
   * 绘制闪电弧线
   * @param {CanvasRenderingContext2D} ctx - 已 translate(-camera) 的 context
   */
  draw(ctx, camera) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    for (const arc of this._arcs) {
      const alpha = Math.min(1, arc.timer / 0.2)
      const lineW = 3 * glow.scale

      // 升级后发光更强
      ctx.strokeStyle = glow.blur > 0
        ? `rgba(255, 107, 107, ${alpha})`
        : `rgba(52, 152, 219, ${alpha})`
      ctx.lineWidth = lineW
      ctx.shadowColor = glow.blur > 0 ? glow.color : CFG.arcColor
      ctx.shadowBlur = glow.blur > 0 ? glow.blur : 12

      // 锯齿状闪电效果
      const segments = CFG.arcSegments
      const jitter = CFG.arcJitter
      const dx = (arc.x2 - arc.x1) / segments
      const dy = (arc.y2 - arc.y1) / segments
      ctx.beginPath()
      ctx.moveTo(arc.x1, arc.y1)
      for (let i = 1; i < segments; i++) {
        const jx = arc.x1 + dx * i + (Math.random() - 0.5) * jitter
        const jy = arc.y1 + dy * i + (Math.random() - 0.5) * jitter
        ctx.lineTo(jx, jy)
      }
      ctx.lineTo(arc.x2, arc.y2)
      ctx.stroke()

      // 内层亮白线
      ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
      ctx.lineWidth = lineW * 0.5
      ctx.beginPath()
      ctx.moveTo(arc.x1, arc.y1)
      for (let i = 1; i < segments; i++) {
        const jx = arc.x1 + dx * i + (Math.random() - 0.5) * jitter
        const jy = arc.y1 + dy * i + (Math.random() - 0.5) * jitter
        ctx.lineTo(jx, jy)
      }
      ctx.lineTo(arc.x2, arc.y2)
      ctx.stroke()
    }
    ctx.restore()
  }

  toJSON() {
    return { ...super.toJSON(), chainJumps: this.chainJumps }
  }

  fromJSON(data) {
    super.fromJSON(data)
    if (data.chainJumps !== undefined) this.chainJumps = data.chainJumps
  }
}
