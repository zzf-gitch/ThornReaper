/**
 * PersistenceManager — 局外持久化存储
 *
 * 管理成就（累计击杀、最高击杀、最长生存）、金币、天赋树的 localStorage 读写。
 * 所有方法均为静态，可直接调用。
 *
 * 使用范例：
 *   PersistenceManager.addKills(15)
 *   PersistenceManager.addGold(120)
 *   const gold = PersistenceManager.getGold()
 *   PersistenceManager.applyTalents(player)
 */
export class PersistenceManager {
  static KEYS = {
    TOTAL_KILLS: 'mowing_survivor_total_kills',
    GOLD:        'mowing_survivor_gold',
    TALENTS:     'mowing_survivor_talents',
    BEST_KILLS:  'mowing_survivor_best_kills',
    BEST_TIME:   'mowing_survivor_best_time',
  }

  // ========== 天赋定义 ==========

  static TALENTS = [
    {
      id: 'hp_up',
      name: '生命强化',
      icon: '❤️',
      desc: '初始生命 +20',
      maxLevel: 5,
      cost: [100, 200, 400, 800, 1600],
      apply: (player, level) => {
        player.maxHp += 20 * level
        player.hp = player.maxHp
      },
    },
    {
      id: 'speed_up',
      name: '敏捷',
      icon: '💨',
      desc: '移速 +15',
      maxLevel: 3,
      cost: [150, 300, 600],
      apply: (player, level) => {
        player.speed += 15 * level
      },
    },
    {
      id: 'dmg_up',
      name: '攻击强化',
      icon: '⚔️',
      desc: '子弹伤害 +1',
      maxLevel: 5,
      cost: [200, 400, 800, 1600, 3200],
      apply: (player, level) => {
        player.bulletDamage += 1 * level
      },
    },
    {
      id: 'shield_up',
      name: '护盾强化',
      icon: '🛡️',
      desc: '初始护盾 +1 层（受伤抵消）',
      maxLevel: 3,
      cost: [300, 600, 1200],
      apply: (player, level) => {
        player.shields = Math.max(player.shields || 0, level)
      },
    },
    {
      id: 'regen',
      name: '缓慢恢复',
      icon: '💚',
      desc: '每秒回复 1 HP',
      maxLevel: 5,
      cost: [200, 400, 800, 1600, 3200],
      apply: (player, level) => {
        player.hpRegen = (player.hpRegen || 0) + 1 * level
      },
    },
    {
      id: 'bullet_speed_up',
      name: '弹道加速',
      icon: '🚀',
      desc: '子弹速度 +50',
      maxLevel: 3,
      cost: [150, 300, 600],
      apply: (player, level) => {
        player.bulletSpeed += 50 * level
      },
    },
    {
      id: 'gold_bonus',
      name: '理财专家',
      icon: '💰',
      desc: '每局金币收益 +20%',
      maxLevel: 5,
      cost: [400, 800, 1600, 3200, 6400],
      apply: (player, level) => {
        // 在 gameOver 结算时使用 goldMultiplier
        player.goldMultiplier = 1 + level * 0.2
      },
    },
    {
      id: 'defense',
      name: '防御强化',
      icon: '🛡️',
      desc: '受到的伤害 -5%（局外永久）',
      maxLevel: 10,
      cost: [300, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5800],
      apply: (player, level) => {
        // 减伤 = 5% × level，上限 50%
        player.damageReduction = Math.min(0.5, level * 0.05)
      },
    },
    {
      id: 'pickup_range',
      name: '吸取范围',
      icon: '🧲',
      desc: '经验球吸取范围 +10%（局外永久）',
      maxLevel: 10,
      cost: [200, 400, 700, 1100, 1600, 2200, 2900, 3700, 4600, 5600],
      apply: (player, level) => {
        // 吸取范围倍率 = 1 + 10% × level
        player.pickupRangeMultiplier = 1 + level * 0.1
      },
    },
  ]

  // ========== 成就 - 累计击杀 ==========

  /** 获取历史累计击杀总数 */
  static getTotalKills() {
    try {
      return parseInt(localStorage.getItem(this.KEYS.TOTAL_KILLS), 10) || 0
    } catch { return 0 }
  }

  /** 增加累计击杀（在 gameOver 时调用） */
  static addKills(amount) {
    if (amount <= 0) return
    try {
      const current = this.getTotalKills()
      localStorage.setItem(this.KEYS.TOTAL_KILLS, String(current + amount))
    } catch { /* ignore */ }
  }

  // ========== 成就 - 最高记录 ==========

  /** 获取历史最高单局击杀 */
  static getBestKills() {
    try {
      return parseInt(localStorage.getItem(this.KEYS.BEST_KILLS), 10) || 0
    } catch { return 0 }
  }

  /** 更新最高击杀（仅在破纪录时写入） */
  static updateBestKills(kills) {
    if (kills <= 0) return false
    try {
      const current = this.getBestKills()
      if (kills > current) {
        localStorage.setItem(this.KEYS.BEST_KILLS, String(kills))
        return true
      }
      return false
    } catch { return false }
  }

  /** 获取历史最长生存时间（秒） */
  static getBestTime() {
    try {
      return parseFloat(localStorage.getItem(this.KEYS.BEST_TIME)) || 0
    } catch { return 0 }
  }

  /** 更新最长生存时间（仅在破纪录时写入） */
  static updateBestTime(seconds) {
    if (seconds <= 0) return false
    try {
      const current = this.getBestTime()
      if (seconds > current) {
        localStorage.setItem(this.KEYS.BEST_TIME, String(seconds))
        return true
      }
      return false
    } catch { return false }
  }

  // ========== 金币 ==========

  /** 获取当前金币数 */
  static getGold() {
    try {
      return parseInt(localStorage.getItem(this.KEYS.GOLD), 10) || 0
    } catch { return 0 }
  }

  /** 增加金币（在 gameOver 时结算） */
  static addGold(amount) {
    if (amount <= 0) return
    try {
      const current = this.getGold()
      localStorage.setItem(this.KEYS.GOLD, String(current + amount))
    } catch { /* ignore */ }
  }

  /** 花费金币（返回是否成功） */
  static spendGold(amount) {
    if (amount <= 0) return true
    try {
      const current = this.getGold()
      if (current < amount) return false
      localStorage.setItem(this.KEYS.GOLD, String(current - amount))
      return true
    } catch { return false }
  }

  // ========== 天赋树 ==========

  /** 获取天赋等级字典 { talentId: level } */
  static getTalentLevels() {
    try {
      const raw = localStorage.getItem(this.KEYS.TALENTS)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  /** 获取某个天赋的当前等级 */
  static getTalentLevel(talentId) {
    return this.getTalentLevels()[talentId] || 0
  }

  /** 升级天赋（自动扣金币），返回是否成功 */
  static upgradeTalent(talentId) {
    const talent = this.TALENTS.find(t => t.id === talentId)
    if (!talent) return false

    const levels = this.getTalentLevels()
    const currentLevel = levels[talentId] || 0
    if (currentLevel >= talent.maxLevel) return false

    const cost = talent.cost[currentLevel]
    if (!this.spendGold(cost)) return false

    levels[talentId] = currentLevel + 1
    try {
      localStorage.setItem(this.KEYS.TALENTS, JSON.stringify(levels))
    } catch { return false }
    return true
  }

  /** 将已学习的天赋应用到玩家对象（在 startGame 时调用） */
  static applyTalents(player) {
    const levels = this.getTalentLevels()
    for (const talent of this.TALENTS) {
      const level = levels[talent.id] || 0
      if (level > 0) {
        talent.apply(player, level)
      }
    }
  }
}
