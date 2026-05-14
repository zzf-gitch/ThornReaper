/**
 * MineWeapon — 地雷武器
 *
 * 玩家走过的地方每隔一段时间留下一枚地雷。
 * 地雷留在原地，敌人走进爆炸范围时触发范围爆炸。
 * 最多同时存在有限个地雷。
 */
import { WeaponBase } from './WeaponBase.js'
import { HitFlash } from './HitFlash.js'
import { DamageNumber } from './DamageNumber.js'
import { WEAPON_CONFIGS } from './GameConfig.js'

const CFG = WEAPON_CONFIGS.mine

export class MineWeapon extends WeaponBase {
  constructor(opts = {}) {
    super({
      id: 'mine',
      damage: CFG.damage,
      cooldown: CFG.cooldown,
      range: CFG.range,       // 地雷触发半径
      count: CFG.count,
      ...opts,
    })

    /** 地雷数组 [{ x, y, timer, armed }] */
    this._mines = []

    /** 最大同时存在地雷数 */
    this._maxMines = CFG.maxMines

    /** 放置间隔（秒）—— 防止连续铺满 */
    this._placeInterval = CFG.placeInterval
    this._placeTimer = 0

    /** 上次放置位置（防止原地堆叠） */
    this._lastPlaceX = 0
    this._lastPlaceY = 0
  }

  _onLevelUp() {
    const lu = CFG.levelUp
    this._damageMult += lu.damageAdd
    this._cooldown = Math.max(lu.cooldownMin, this._cooldown * lu.cooldownMult)
    this._range += lu.rangeAdd
    this._maxMines = Math.min(this._maxMines + lu.maxMinesAdd, CFG.maxMinesCap)
  }

  /**
   * @param {number} dt
   * @param {Player} player
   * @param {Enemy[]} enemies
   * @param {object} refs
   */
  update(dt, player, enemies, refs) {
    if (!this.active) return

    this._placeTimer += dt
    this.cooldownTimer += dt

    // 1) 放置新地雷（当玩家移动超过一定距离且冷却完成）
    if (this._placeTimer >= this._placeInterval && this._mines.length < this._maxMines) {
      const dx = player.x - this._lastPlaceX
      const dy = player.y - this._lastPlaceY
      if (Math.sqrt(dx * dx + dy * dy) > 60) {
        this._mines.push({
          x: player.x,
          y: player.y,
          timer: 0,
          armed: false,
          radius: CFG.mineRadius,          // 可见指示圆半径
        })
        this._lastPlaceX = player.x
        this._lastPlaceY = player.y
        this._placeTimer = 0
      }
    }

    // 2) 地雷延时武装 + 检测触发
    for (let i = this._mines.length - 1; i >= 0; i--) {
      const mine = this._mines[i]

      // 武装延迟（防止刚放就炸自己）
      if (!mine.armed) {
        mine.timer += dt
        if (mine.timer >= CFG.armingDelay) mine.armed = true
        continue
      }

      // 每帧只触发一次
      let triggered = false

      // 3) 检测敌人进入范围
      for (const e of enemies) {
        const dx = e.x - mine.x, dy = e.y - mine.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < this._range) {
          triggered = true
          break
        }
      }

      if (triggered) {
        this._explodeMine(i, player, enemies, refs)
      }
    }
  }

  /** 地雷爆炸 */
  _explodeMine(index, player, enemies, refs) {
    const mine = this._mines[index]
    const explosionRadius = this._range
    const dmg = this.getDmg(player)

    // 爆炸视觉
    refs.hitFlashes.push(new HitFlash(mine.x, mine.y, explosionRadius))
    refs.audioManager?.playExplosion()

    // 对范围内所有敌人造成伤害
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      const dx = e.x - mine.x, dy = e.y - mine.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < explosionRadius) {
        const dead = e.takeDamage(dmg)
        // 击退
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)
        e.knockback(nx, ny, 12)

        refs.hitFlashes.push(new HitFlash(e.x, e.y, e.size))
        refs.damageNumbers.push(new DamageNumber(e.x, e.y - 10, `💣${dmg}`, '#e74c3c'))

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

    // 移除地雷
    this._mines.splice(index, 1)
  }

  /**
   * 绘制地雷
   * @param {CanvasRenderingContext2D} ctx - 已 translate(-camera)
   */
  draw(ctx, camera) {
    if (!this.active) return

    const glow = this.getGlowConfig()

    ctx.save()
    for (const mine of this._mines) {
      const alpha = mine.armed ? 1.0 : 0.5 + Math.sin(mine.timer * 10) * 0.3

      // 升级发光
      if (glow.blur > 0 && mine.armed) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 外圈（爆炸范围指示）
      ctx.shadowBlur = 0
      ctx.strokeStyle = glow.blur > 0
        ? `rgba(255, 107, 107, ${alpha * (0.15 + glow.blur / 60)})`
        : `rgba(231, 76, 60, ${alpha * 0.15})`
      ctx.lineWidth = 1 * glow.scale
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.arc(mine.x, mine.y, this._range * glow.scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // 升级发光也影响地雷本体
      if (glow.blur > 0 && mine.armed) {
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.blur
      }

      // 地雷本体
      ctx.beginPath()
      ctx.arc(mine.x, mine.y, mine.radius * glow.scale, 0, Math.PI * 2)
      ctx.fillStyle = mine.armed
        ? `rgba(${glow.blur > 0 ? '255, 107, 107' : '231, 76, 60'}, ${alpha})`
        : `rgba(149, 165, 166, ${alpha})`
      ctx.fill()
      ctx.strokeStyle = mine.armed ? (glow.blur > 0 ? '#ff6b6b' : '#c0392b') : '#7f8c8d'
      ctx.lineWidth = 2 * glow.scale
      ctx.stroke()

      // 中心亮点
      ctx.shadowBlur = 0
      if (mine.armed) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(mine.x - 3, mine.y - 3, 3 * glow.scale, 0, Math.PI * 2)
        ctx.fill()

        // 感叹号标记
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${12 * glow.scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', mine.x, mine.y + 1)
      } else {
        // 未武装 — 闪烁齿轮
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.font = `${10 * glow.scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚙', mine.x, mine.y + 1)
      }
    }
    ctx.restore()
  }

  toJSON() {
    return {
      ...super.toJSON(),
      maxMines: this._maxMines,
      mines: this._mines.map(m => ({ x: m.x, y: m.y, timer: m.timer, armed: m.armed })),
    }
  }

  fromJSON(data) {
    super.fromJSON(data)
    if (data.maxMines !== undefined) this._maxMines = data.maxMines
    if (data.mines) {
      this._mines = data.mines.map(m => ({
        x: m.x, y: m.y,
        timer: m.timer, armed: m.armed,
        radius: CFG.mineRadius,
      }))
    }
  }
}
