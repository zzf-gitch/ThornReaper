/**
 * DestructibleObject — 场景可破坏物
 *
 * 木桶、箱子、矿石等静态物体，被子弹击中后破碎并掉落道具。
 * 掉落物：金币、鸡腿（回血）、炸弹（全屏清怪）、磁铁（吸经验球）
 */
import { DeathParticle } from './DeathParticle.js'
import { ExperienceOrb, createHealOrb } from './ExperienceOrb.js'

/** 可破坏物类型定义 */
export const DESTRUCTIBLE_TYPES = {
  barrel: {
    name: '木桶',
    hp: 2,
    color: '#8B4513',
    shadowColor: '#5C2E0A',
    size: 16,
    dropTable: [
      { type: 'gold',     weight: 40, min: 1, max: 3 },
      { type: 'heal',     weight: 25, min: 1, max: 1 },
      { type: 'nothing',  weight: 35 },
    ],
  },
  crate: {
    name: '宝箱',
    hp: 4,
    color: '#D4A017',
    shadowColor: '#8B6914',
    size: 20,
    dropTable: [
      { type: 'gold',     weight: 30, min: 2, max: 5 },
      { type: 'heal',     weight: 20, min: 1, max: 1 },
      { type: 'bomb',     weight: 15, min: 1, max: 1 },
      { type: 'magnet',   weight: 10, min: 1, max: 1 },
      { type: 'nothing',  weight: 25 },
    ],
  },
  ore: {
    name: '矿石',
    hp: 8,
    color: '#7F8C8D',
    shadowColor: '#4A5A5A',
    size: 22,
    dropTable: [
      { type: 'gold',     weight: 50, min: 3, max: 8 },
      { type: 'heal',     weight: 10, min: 1, max: 1 },
      { type: 'nothing',  weight: 40 },
    ],
  },
}

/** 根据权重表随机选择掉落类型 */
function rollDrop(dropTable) {
  const totalWeight = dropTable.reduce((s, d) => s + d.weight, 0)
  let roll = Math.random() * totalWeight
  for (const entry of dropTable) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return dropTable[dropTable.length - 1]
}

export class DestructibleObject {
  /**
   * @param {number} x
   * @param {number} y
   * @param {'barrel'|'crate'|'ore'} type
   */
  constructor(x, y, type = 'barrel') {
    this.x = x
    this.y = y
    this.type = type
    const def = DESTRUCTIBLE_TYPES[type]
    this.maxHp = def.hp
    this.hp = def.hp
    this.color = def.color
    this.shadowColor = def.shadowColor
    this.size = def.size
    this.dropTable = def.dropTable
    this.destroyed = false

    // 破碎动画
    this._breakTimer = 0
    this._breakDuration = 0.3
    this._particleColor = def.color

    // 闪烁动画（受击反馈）
    this._hitFlashTimer = 0

    // 唯一标识
    this.id = DestructibleObject._nextId++
  }

  static _nextId = 0

  /** 受击，返回 true 表示被摧毁 */
  takeDamage(amount) {
    if (this.destroyed) return false
    this.hp -= amount
    this._hitFlashTimer = 0.1
    if (this.hp <= 0) {
      this.destroyed = true
      this._breakTimer = this._breakDuration
      return true
    }
    return false
  }

  /**
   * 生成掉落物
   * @param {object} refs - { damageNumbers, orbs, player, DamageNumber, PersistenceManager }
   */
  spawnDrops(refs) {
    const entry = rollDrop(this.dropTable)
    if (!entry || entry.type === 'nothing') return

    switch (entry.type) {
      case 'gold': {
        // 金币 — 直接加 gold（通过回调用 PersistenceManager）
        const amount = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1))
        if (refs.onGoldDrop) refs.onGoldDrop(amount)
        if (refs.damageNumbers) {
          refs.damageNumbers.push(new refs.DamageNumber(
            this.x, this.y - 10, `💰 +${amount}`, '#FFD700'
          ))
        }
        break
      }
      case 'heal': {
        // 鸡腿 — 生成回血球
        if (refs.orbs) {
          const healAmount = 20 + Math.floor(Math.random() * 15)
          refs.orbs.push(createHealOrb(
            this.x + (Math.random() - 0.5) * 20,
            this.y + (Math.random() - 0.5) * 20,
            healAmount
          ))
        }
        break
      }
      case 'bomb': {
        // 炸弹 — 全屏清怪（对所有敌人造成大量伤害）
        if (refs.enemies && refs.player) {
          const bombDamage = 9999 // 秒杀
          for (let i = refs.enemies.length - 1; i >= 0; i--) {
            const e = refs.enemies[i]
            const dead = e.takeDamage(bombDamage)
            if (dead) {
              refs.player.kills++
              if (refs.deathParticles) {
                refs.deathParticles.push(...refs.spawnDeathParticles(e.x, e.y, e.color))
              }
              if (refs.enemyDrops) refs.enemyDrops(e.x, e.y)
              refs.enemies.splice(i, 1)
            }
          }
          if (refs.damageNumbers) {
            refs.damageNumbers.push(new refs.DamageNumber(
              this.x, this.y - 30, '💣 全屏清怪！', '#ff4444', 24
            ))
          }
          if (refs.audioManager) refs.audioManager.playExplosion()
        }
        break
      }
      case 'magnet': {
        // 磁铁 — 瞬间吸收屏幕内所有经验球
        if (refs.orbs && refs.player) {
          let absorbed = 0
          for (let i = refs.orbs.length - 1; i >= 0; i--) {
            const o = refs.orbs[i]
            if (o.isHeal) {
              // 回血球直接加血
              const healAmount = Math.floor(o.value * (refs.player.healOrbMultiplier || 1.0))
              refs.player.hp = Math.min(refs.player.maxHp, refs.player.hp + healAmount)
            } else {
              // 经验球直接加经验
              refs.player.addExp(o.value)
            }
            refs.orbs.splice(i, 1)
            absorbed++
          }
          if (refs.damageNumbers) {
            refs.damageNumbers.push(new refs.DamageNumber(
              this.x, this.y - 30, `🧲 吸收 ${absorbed} 个球！`, '#00bcd4', 20
            ))
          }
          if (refs.audioManager) refs.audioManager.playPickup()
        }
        break
      }
    }
  }

  /** 更新破碎动画 */
  update(deltaTime) {
    if (this._hitFlashTimer > 0) this._hitFlashTimer -= deltaTime
    if (this.destroyed) {
      this._breakTimer -= deltaTime
    }
  }

  /** 是否还有动画在播放 */
  get alive() {
    return !this.destroyed || this._breakTimer > 0
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (this.destroyed) {
      // 破碎消散动画
      if (this._breakTimer <= 0) return
      const alpha = Math.max(0, this._breakTimer / this._breakDuration)
      ctx.save()
      ctx.globalAlpha = alpha * 0.5
      ctx.fillStyle = this._particleColor
      const px = this.x + (Math.random() - 0.5) * 16
      const py = this.y + (Math.random() - 0.5) * 16
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }

    const s = this.size
    const flash = this._hitFlashTimer > 0

    ctx.save()

    // 阴影
    ctx.shadowColor = this.shadowColor
    ctx.shadowBlur = 8

    // 主体绘制
    ctx.fillStyle = flash ? '#ffffff' : this.color
    ctx.strokeStyle = flash ? '#ffffff' : this.shadowColor
    ctx.lineWidth = 2

    switch (this.type) {
      case 'barrel':
        // 木桶 — 圆角矩形
        this._drawRoundedRect(ctx, this.x - s, this.y - s * 1.1, s * 2, s * 2.2, 4)
        ctx.fill()
        ctx.stroke()
        // 木桶横条
        ctx.strokeStyle = this.shadowColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(this.x - s, this.y - 3)
        ctx.lineTo(this.x + s, this.y - 3)
        ctx.moveTo(this.x - s, this.y + 3)
        ctx.lineTo(this.x + s, this.y + 3)
        ctx.stroke()
        break

      case 'crate':
        // 宝箱 — 方形+锁扣
        ctx.fillRect(this.x - s, this.y - s, s * 2, s * 2)
        ctx.strokeRect(this.x - s, this.y - s, s * 2, s * 2)
        // 锁扣
        ctx.fillStyle = flash ? '#fff' : '#f1c40f'
        ctx.fillRect(this.x - 3, this.y - 3, 6, 6)
        ctx.strokeStyle = this.shadowColor
        ctx.lineWidth = 1
        ctx.strokeRect(this.x - 3, this.y - 3, 6, 6)
        break

      case 'ore':
        // 矿石 — 不规则多边形
        ctx.beginPath()
        ctx.moveTo(this.x, this.y - s * 1.1)
        ctx.lineTo(this.x + s * 0.9, this.y - s * 0.5)
        ctx.lineTo(this.x + s, this.y + s * 0.3)
        ctx.lineTo(this.x + s * 0.4, this.y + s)
        ctx.lineTo(this.x - s * 0.4, this.y + s * 0.8)
        ctx.lineTo(this.x - s, this.y + s * 0.2)
        ctx.lineTo(this.x - s * 0.8, this.y - s * 0.6)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        // 高光
        ctx.fillStyle = flash ? '#fff' : 'rgba(255,255,255,0.2)'
        ctx.beginPath()
        ctx.arc(this.x - 3, this.y - 4, 4, 0, Math.PI * 2)
        ctx.fill()
        break
    }

    ctx.restore()

    // HP 条（受伤时显示）
    if (this.hp < this.maxHp && !flash) {
      const barW = s * 2.4
      const barH = 3
      const barX = this.x - barW / 2
      const barY = this.y - s * 1.4
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = '#e74c3c'
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH)
      ctx.restore()
    }
  }

  _drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
