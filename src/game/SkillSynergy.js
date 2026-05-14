/**
 * SkillSynergy — 词条联动引擎
 *
 * 事件驱动架构：在游戏关键节点（发射子弹、命中、击杀、受伤）触发，
 * 检查玩家已获取的技能组合，激活对应的联动效果。
 *
 * 所有视觉特效数据存储在本模块的数组中，由外部 render 循环绘制。
 */

// ===== 联动规则定义 =====
export const SYNERGY_RULES = [
  {
    id: 'flame_penetrate',
    name: '烈焰穿透',
    desc: '穿透路径留下燃烧地面，每秒 3 点伤害持续 2s',
    requires: ['fire', 'penetrate'],
    icon: '🔥+🗡️',
  },
  {
    id: 'ice_explosion',
    name: '冰爆',
    desc: '爆炸范围减速 50% 持续 2s',
    requires: ['ice', 'explosion'],
    icon: '❄️+💥',
  },
  {
    id: 'arc_dual',
    name: '电弧',
    desc: '双发子弹 40% 概率连锁到最近敌人',
    requires: ['lightning', 'dual_shot'],
    icon: '⚡+🔫',
  },
  {
    id: 'incinerate',
    name: '焚化',
    desc: '伤害强化附加灼烧，每秒 2 点伤害持续 3s',
    requires: ['fire', 'damage_up'],
    icon: '🔥+🔥',
  },
  {
    id: 'ice_armor',
    name: '寒冰护甲',
    desc: '护盾每 5 秒脉冲冻结附近敌人 0.5s',
    requires: ['ice', 'shield'],
    icon: '❄️+🛡️',
  },
  {
    id: 'storm',
    name: '风暴',
    desc: '速射子弹连锁概率翻倍至 40%',
    requires: ['lightning', 'rapid_fire'],
    icon: '⚡+⚡',
  },
  {
    id: 'nova_fire',
    name: '烈焰新星',
    desc: '死亡新星在地面留下燃烧区域持续 3s',
    requires: ['death_nova', 'fire'],
    icon: '🌀+🔥',
  },
  {
    id: 'chain_explosion',
    name: '链式爆炸',
    desc: '穿透子弹每次穿透触发小型爆炸',
    requires: ['penetrate', 'explosion'],
    icon: '🗡️+💥',
  },
]

export class SkillSynergy {
  /** 视觉效果数据（由外部 render 读取并绘制） */
  static firePools = []      // [{ x, y, radius, remaining }]
  static chainLightnings = [] // [{ x1, y1, x2, y2, remaining }]
  static iceArmorTimer = 0   // 寒冰护甲脉冲累计计时

  /**
   * 获取当前激活的联动规则列表
   * @param {string[]} acquiredSkills 玩家已获取的 skill id 数组
   * @returns {object[]} 激活的规则列表
   */
  static getActiveSynergies(acquiredSkills) {
    const skillSet = new Set(acquiredSkills)
    return SYNERGY_RULES.filter((rule) =>
      rule.requires.every((s) => skillSet.has(s))
    )
  }

  /**
   * 检查某个联动规则是否激活
   */
  static hasSynergy(acquiredSkills, synergyId) {
    const rule = SYNERGY_RULES.find((r) => r.id === synergyId)
    if (!rule) return false
    const skillSet = new Set(acquiredSkills)
    return rule.requires.every((s) => skillSet.has(s))
  }

  // ===== 事件钩子 =====

  /**
   * 发射子弹时触发
   */
  static onBulletFire(player, context) {
    // 暂不需要额外逻辑（风暴标记在碰撞阶段处理）
  }

  /**
   * 子弹命中敌人时触发
   * @param {object} bullet 子弹快照 { x, y, dirX, dirY, penetration, radius }
   * @param {object} enemy 目标敌人实例
   * @param {object} player 玩家实例
   * @param {object} ctx { hitX, hitY, hitFlashes, damageNumbers, enemies, HitFlash, DamageNumber }
   */
  static onBulletHit(bullet, enemy, player, ctx) {
    const skills = player.acquiredSkills
    const hitX = ctx.hitX, hitY = ctx.hitY
    const HitFlash = ctx.HitFlash
    const DamageNumber = ctx.DamageNumber

    // === 烈焰穿透：穿透路径留下燃烧地面 ===
    if (SkillSynergy.hasSynergy(skills, 'flame_penetrate')) {
      SkillSynergy.firePools.push({
        x: hitX, y: hitY,
        radius: 30,
        remaining: 2.0,
      })
    }

    // === 焚化：灼烧 DoT ===
    if (SkillSynergy.hasSynergy(skills, 'incinerate')) {
      enemy.addStatusEffect('burn', 2, 3.0)
    }

    // === 冰爆：爆炸范围减速 ===
    if (SkillSynergy.hasSynergy(skills, 'ice_explosion')) {
      // 只有爆炸半径 > 0 时触发（玩家已选爆炸技能）
      if (player.bulletExplosion > 0) {
        const explosionR = player.bulletExplosion
        for (const other of ctx.enemies) {
          const dx = other.x - enemy.x
          const dy = other.y - enemy.y
          if (Math.sqrt(dx * dx + dy * dy) < explosionR) {
            other.addStatusEffect('slow', 0, 2.0) // dps=0 仅减速
          }
        }
      }
    }

    // === 电弧 / 风暴：连锁闪电 ===
    if (SkillSynergy.hasSynergy(skills, 'arc_dual') ||
        SkillSynergy.hasSynergy(skills, 'storm')) {
      const dualActive = SkillSynergy.hasSynergy(skills, 'arc_dual')
      const stormActive = SkillSynergy.hasSynergy(skills, 'storm')
      let chainChance = 0
      if (dualActive) chainChance = 0.4
      if (stormActive) chainChance = 0.4 // 风暴也提供 40%，如果两者都激活取 40%

      if (Math.random() < chainChance) {
        // 找最近的其他敌人
        let nearest = null, minDist = Infinity
        for (const other of ctx.enemies) {
          if (other === enemy) continue
          const dx = other.x - enemy.x
          const dy = other.y - enemy.y
          const dist = dx * dx + dy * dy
          if (dist < minDist) {
            minDist = dist
            nearest = other
          }
        }
        if (nearest && Math.sqrt(minDist) < 200) {
          // 连锁伤害
          nearest.takeDamage(1)
          ctx.damageNumbers.push(new DamageNumber(nearest.x, nearest.y - 5, '⚡-1', '#9b59b6', 8))
          ctx.hitFlashes.push(new HitFlash(nearest.x, nearest.y, nearest.size))
          // 绘制连锁闪电线
          SkillSynergy.chainLightnings.push({
            x1: enemy.x, y1: enemy.y,
            x2: nearest.x, y2: nearest.y,
            remaining: 0.12,
          })
        }
      }
    }

    // === 链式爆炸：穿透触发小型爆炸 ===
    if (SkillSynergy.hasSynergy(skills, 'chain_explosion')) {
      // 仅当子弹有穿透能力时触发
      if (bullet.penetration > 1) {
        const chainDmg = Math.max(1, Math.floor(player.bulletDamage * 0.5))
        const chainR = player.bulletExplosion > 0 ? player.bulletExplosion * 0.3 : 40
        for (const other of ctx.enemies) {
          if (other === enemy) continue
          const dx = other.x - hitX
          const dy = other.y - hitY
          if (Math.sqrt(dx * dx + dy * dy) < chainR) {
            const dead = other.takeDamage(chainDmg)
            ctx.hitFlashes.push(new HitFlash(other.x, other.y, other.size))
            ctx.damageNumbers.push(new DamageNumber(other.x, other.y - 5, `-${chainDmg}`, '#e67e22', 10))
            if (dead) {
              ctx.damageNumbers.push(new DamageNumber(other.x, other.y - 10, '💥', '#f1c40f', 10))
            }
          }
        }
      }
    }
  }

  /**
   * 敌人死亡时触发
   */
  static onEnemyKill(enemy, player, ctx) {
    const skills = player.acquiredSkills

    // === 烈焰新星：死亡新星在地面留下燃烧区域 ===
    if (SkillSynergy.hasSynergy(skills, 'nova_fire')) {
      SkillSynergy.firePools.push({
        x: enemy.x, y: enemy.y,
        radius: 50,
        remaining: 3.0,
      })
    }
  }

  /**
   * 玩家受伤时触发
   */
  static onPlayerHit(player, ctx) {
    // === 寒冰护甲：脉冲冻结 ===
    // 实际由 update 处理（每帧计时），这里不需要
  }

  /**
   * 每帧更新视觉效果
   * @param {number} deltaTime
   * @param {object} player 玩家实例
   * @param {object[]} enemies 敌人列表
   */
  static update(deltaTime, player, enemies) {
    // 更新燃烧地面
    for (let i = this.firePools.length - 1; i >= 0; i--) {
      const pool = this.firePools[i]
      pool.remaining -= deltaTime
      // 对范围内敌人造成燃烧伤害
      for (const e of enemies) {
        const dx = e.x - pool.x
        const dy = e.y - pool.y
        if (Math.sqrt(dx * dx + dy * dy) < pool.radius) {
          e.addStatusEffect('burn', 3, 1.0)
        }
      }
      if (pool.remaining <= 0) {
        this.firePools.splice(i, 1)
      }
    }

    // 更新连锁闪电视觉效果
    for (let i = this.chainLightnings.length - 1; i >= 0; i--) {
      this.chainLightnings[i].remaining -= deltaTime
      if (this.chainLightnings[i].remaining <= 0) {
        this.chainLightnings.splice(i, 1)
      }
    }

    // === 寒冰护甲脉冲 ===
    if (player) {
      const skills = player.acquiredSkills
      if (SkillSynergy.hasSynergy(skills, 'ice_armor')) {
        this.iceArmorTimer += deltaTime
        if (this.iceArmorTimer >= 5.0) {
          this.iceArmorTimer = 0
          // 冻结附近敌人 0.5s
          for (const e of enemies) {
            const dx = e.x - player.x
            const dy = e.y - player.y
            if (Math.sqrt(dx * dx + dy * dy) < 150) {
              e.addStatusEffect('freeze', 0, 0.5)
            }
          }
        }
      }
    }
  }

  /**
   * 绘制联动视觉效果（由外部 render 在效果层调用）
   */
  static drawEffects(ctx) {
    // 绘制燃烧地面
    for (const pool of this.firePools) {
      const alpha = Math.min(1, pool.remaining / 0.5) * 0.4
      ctx.save()
      // 外层火焰光环
      const gradFire = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, pool.radius)
      gradFire.addColorStop(0, `rgba(255, 150, 0, ${alpha})`)
      gradFire.addColorStop(0.5, `rgba(255, 80, 0, ${alpha * 0.6})`)
      gradFire.addColorStop(1, `rgba(255, 0, 0, 0)`)
      ctx.fillStyle = gradFire
      ctx.beginPath()
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 绘制连锁闪电
    for (const bolt of this.chainLightnings) {
      const alpha = Math.min(1, bolt.remaining / 0.06)
      ctx.save()
      ctx.strokeStyle = `rgba(155, 89, 182, ${alpha})`
      ctx.lineWidth = 3
      ctx.shadowColor = '#9b59b6'
      ctx.shadowBlur = 10
      ctx.beginPath()
      // 闪电锯齿
      const segments = 6
      const dx = (bolt.x2 - bolt.x1) / segments
      const dy = (bolt.y2 - bolt.y1) / segments
      ctx.moveTo(bolt.x1, bolt.y1)
      for (let i = 1; i < segments; i++) {
        const jitter = (Math.random() - 0.5) * 8
        ctx.lineTo(bolt.x1 + dx * i + jitter, bolt.y1 + dy * i + (Math.random() - 0.5) * 8)
      }
      ctx.lineTo(bolt.x2, bolt.y2)
      ctx.stroke()
      ctx.restore()
    }
  }

  /**
   * 重置所有视觉效果（游戏重新开始时）
   */
  static reset() {
    this.firePools = []
    this.chainLightnings = []
    this.iceArmorTimer = 0
  }
}
