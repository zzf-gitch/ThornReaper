/**
 * RandomLightningWeapon — 随机落雷武器
 *
 * 逻辑：每隔几秒，在屏幕内的随机敌人位置生成一道落雷，
 * 造成范围 AOE 伤害。落雷有视觉延迟警示圈，然后落下闪电。
 *
 * 与 LightningWeapon 不同：
 * - 不弹跳链式传导，而是纯 AOE 范围爆炸
 * - 落点随机选择屏幕内的敌人
 * - 有预警指示器（地面红圈）
 * - 伤害随范围递减（中心全额，边缘 50%）
 *
 * 独立冷却计时器，不干扰主循环。
 */
import { WeaponBase } from './WeaponBase.js'
import { DamageNumber } from './DamageNumber.js'
import { HitFlash } from './HitFlash.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.random_lightning

export class RandomLightningWeapon extends WeaponBase {
  /**
   * @param {object} [opts] 覆盖默认参数
   */
  constructor(opts = {}) {
    super({
      id: 'random_lightning',
      damage: CFG.damage,            // 高伤害倍率（AOE 补偿）
      cooldown: CFG.cooldown,        // 落雷间隔
      range: CFG.range,              // 爆炸半径（AOE 范围）
      count: CFG.count,              // 每次落雷数
      ...opts,
    })

    /** 当前正在预警的落雷 [{ x, y, warningTimer, strikeTimer, struck }] */
    this._strikes = []

    /** 预警持续时间（秒） */
    this._warningDuration = CFG.warningDuration

    /** 闪电视觉效果持续时间（秒） */
    this._strikeVisualDuration = CFG.strikeVisualDuration

    /** 最大同时预警数 */
    this._maxWarnings = CFG.maxWarnings

    /** 预警圆环缩小速度 */
    this._ringShrinkSpeed = CFG.ringShrinkSpeed
  }

  _onLevelUp() {
    const lu = CFG.levelUp
    this._damageMult += lu.damageAdd
    this._cooldown = Math.max(lu.cooldownMin, this._cooldown * lu.cooldownMult)
    this._range += lu.rangeAdd
    this._count = Math.min(this._count + lu.countAdd, lu.countCap)   // 每次多道落雷
  }

  /**
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    // 1) 更新预警和落雷动画
    for (let i = this._strikes.length - 1; i >= 0; i--) {
      const s = this._strikes[i]

      if (!s.struck) {
        // 预警阶段
        s.warningTimer -= dt
        if (s.warningTimer <= 0) {
          // 预警结束 → 闪电落下
          s.struck = true
          s.strikeTimer = this._strikeVisualDuration
          this._doLightningStrike(s.x, s.y, player, enemies, refs)
        }
      } else {
        // 闪电视觉效果阶段
        s.strikeTimer -= dt
        if (s.strikeTimer <= 0) {
          this._strikes.splice(i, 1)
        }
      }
    }

    // 2) 冷却计时
    this.cooldownTimer -= dt
    if (this.cooldownTimer > 0) return

    // 限制同时预警数
    if (this._strikes.length >= this._maxWarnings) return

    // 3) 选择屏幕内随机敌人位置
    const targets = this._pickTargets(enemies, player)
    if (targets.length === 0) return

    this.cooldownTimer = this._cooldown
    this.lastFireTime = performance.now()

    // 4) 为每个目标创建预警落雷
    for (const tgt of targets) {
      // 落点略微随机偏移，避免完全重叠
      const offsetX = (Math.random() - 0.5) * 30
      const offsetY = (Math.random() - 0.5) * 30
      this._strikes.push({
        x: tgt.x + offsetX,
        y: tgt.y + offsetY,
        warningTimer: this._warningDuration,
        strikeTimer: 0,
        struck: false,
      })
    }
  }

  /** 随机选择目标敌人 */
  _pickTargets(enemies, player) {
    if (enemies.length === 0) return []
    // 只选择在玩家视野范围内的敌人（屏幕内）
    const screenW = 1600  // LOGIC_WIDTH
    const screenH = 900   // LOGIC_HEIGHT
    const margin = 100
    const inRange = enemies.filter(e => {
      const dx = Math.abs(e.x - player.x)
      const dy = Math.abs(e.y - player.y)
      return dx < screenW / 2 + margin && dy < screenH / 2 + margin
    })
    if (inRange.length === 0) return []

    // 随机打乱取 count 个
    const shuffled = [...inRange].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, this._count)
  }

  /** 执行落雷伤害 */
  _doLightningStrike(x, y, player, enemies, refs) {
    const dmg = this.getDmg(player)
    const explosionRadius = this._range

    // 爆炸视觉
    refs.hitFlashes.push(new HitFlash(x, y, explosionRadius))
    refs.audioManager?.playExplosion()

    // 对范围内所有敌人造成范围伤害
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      const dx = e.x - x
      const dy = e.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < explosionRadius) {
        // 距离衰减：中心全额，边缘 50%
        const falloff = 1 - (dist / explosionRadius) * 0.5
        const finalDmg = Math.max(1, Math.floor(dmg * falloff))
        const dead = e.takeDamage(finalDmg)

        // 击退
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)
        e.knockback(nx, ny, 10)

        refs.hitFlashes.push(new HitFlash(e.x, e.y, e.size))
        refs.damageNumbers.push(new DamageNumber(
          e.x, e.y - 10, `⚡${finalDmg}`, '#9b59b6'
        ))
        refs.audioManager?.playHit()

        if (dead) {
          player.kills++
          refs.audioManager?.playExplosion()
          refs.damageNumbers.push(new DamageNumber(e.x, e.y - 10, '💥', '#f1c40f'))
          refs.deathParticles.push(...refs.spawnDeathParticles(e.x, e.y, e.color))
          refs.orbs.push(new refs.ExperienceOrb(e.x, e.y))
          enemies.splice(i, 1)
        }
      }
    }
  }

  /**
   * 绘制落雷预警和闪电
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} camera
   */
  draw(ctx, camera) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    for (const s of this._strikes) {
      if (!s.struck) {
        // 预警阶段：闪烁红圈
        const progress = 1 - (s.warningTimer / this._warningDuration)
        const alpha = 0.3 + Math.sin(s.warningTimer * 15) * 0.3
        const ringRadius = this._range * (1 - progress * this._ringShrinkSpeed)

        // 升级发光 — 预警圈更亮
        if (glow.blur > 0) {
          ctx.shadowColor = glow.color
          ctx.shadowBlur = glow.blur * 0.5
        }

        // 外圈（警告圆环）
        ctx.strokeStyle = glow.blur > 0
          ? `rgba(255, 107, 107, ${alpha})`
          : `rgba(231, 76, 60, ${alpha})`
        ctx.lineWidth = 2 * glow.scale
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.arc(s.x, s.y, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // 内圈填充
        ctx.shadowBlur = 0
        ctx.fillStyle = glow.blur > 0
          ? `rgba(255, 107, 107, ${alpha * 0.2})`
          : `rgba(231, 76, 60, ${alpha * 0.15})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, ringRadius, 0, Math.PI * 2)
        ctx.fill()

        // 中心危险标记
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.font = `${16 * glow.scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚡', s.x, s.y)
      } else {
        // 闪电落下视觉效果
        const progress = 1 - (s.strikeTimer / this._strikeVisualDuration)
        const alpha = Math.max(0, 1 - progress * 3)

        // 升级发光 — 闪电更亮
        const strikeColor = glow.blur > 0 ? '#ff6b6b' : '#9b59b6'
        const strikeShadowColor = glow.blur > 0 ? glow.color : '#9b59b6'

        // 闪电光束
        ctx.strokeStyle = `rgba(${glow.blur > 0 ? '255, 107, 107' : '155, 89, 182'}, ${alpha})`
        ctx.lineWidth = 4 * glow.scale
        ctx.shadowColor = strikeShadowColor
        ctx.shadowBlur = glow.blur > 0 ? glow.blur : 20

        // 自上而下的锯齿闪电
        const topY = s.y - this._range * 1.5
        const segments = 8
        const segmentH = (s.y - topY) / segments
        ctx.beginPath()
        ctx.moveTo(s.x, topY)
        for (let i = 1; i < segments; i++) {
          const jx = s.x + (Math.random() - 0.5) * 40
          const jy = topY + segmentH * i
          ctx.lineTo(jx, jy)
        }
        ctx.lineTo(s.x, s.y)
        ctx.stroke()

        // 内层亮白线
        ctx.shadowBlur = 0
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.lineWidth = 2 * glow.scale
        ctx.beginPath()
        ctx.moveTo(s.x, topY)
        for (let i = 1; i < segments; i++) {
          const jx = s.x + (Math.random() - 0.5) * 40
          const jy = topY + segmentH * i
          ctx.lineTo(jx, jy)
        }
        ctx.lineTo(s.x, s.y)
        ctx.stroke()

        ctx.shadowBlur = 0
      }
    }
    ctx.restore()
  }

  toJSON() {
    return { ...super.toJSON() }
  }

  fromJSON(data) {
    super.fromJSON(data)
  }
}
