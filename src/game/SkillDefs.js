/**
 * SkillDefs — 技能定义表
 *
 * 所有技能数值已集中到 GameConfig.js，此处使用配置值。
 * 如需调整技能参数，只需修改 GameConfig.js 中的对应数值。
 */
import { STAT_SKILLS, WEAPON_CONFIGS } from './GameConfig.js'

/**
 * @typedef {Object} SkillDef
 * @property {string} id           技能唯一 ID
 * @property {string} icon         Emoji 图标
 * @property {string} name         显示名称
 * @property {string} desc         描述文本
 * @property {'stat'|'weapon'} category  技能分类
 * @property {number} maxLevel     最大等级
 * @property {Function} apply      效果函数 (player) => void
 * @property {string} [weaponInstanceId]  武器类实例 ID（仅 weapon 类）
 */

/** @type {SkillDef[]} */
export const ALL_SKILLS = [
  // ========== 数值强化类（抽象概念/效果图标，不与武器冲突） ==========
  { id: 'speed',        icon: '💨', category: 'stat', name: '移动加速',   desc: '移速 +15%',                maxLevel: STAT_SKILLS.speed.maxLevel,        apply(p) { p.speed *= STAT_SKILLS.speed.perLevel } },
  { id: 'bullet_speed', icon: '🚀', category: 'stat', name: '子弹加速',   desc: '子弹速度 +25%',            maxLevel: STAT_SKILLS.bullet_speed.maxLevel, apply(p) { p.bulletSpeed *= STAT_SKILLS.bullet_speed.perLevel } },
  { id: 'dual_shot',    icon: '➰', category: 'stat', name: '双发',       desc: '子弹数 +1',                maxLevel: STAT_SKILLS.dual_shot.maxLevel,    apply(p) { p.bulletCount += STAT_SKILLS.dual_shot.perLevel } },
  { id: 'heal',         icon: '💖', category: 'stat', name: '生命恢复',   desc: `恢复 ${Math.round(STAT_SKILLS.heal.restorePercent * 100)}% 血量`, maxLevel: STAT_SKILLS.heal.maxLevel, apply(p) { p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * STAT_SKILLS.heal.restorePercent)) } },
  { id: 'shield',       icon: '🛡️', category: 'stat', name: '护盾',       desc: `最大生命 +${STAT_SKILLS.shield.perLevel}`, maxLevel: STAT_SKILLS.shield.maxLevel, apply(p) { p.maxHp += STAT_SKILLS.shield.perLevel; p.hp += STAT_SKILLS.shield.perLevel } },
  { id: 'penetrate',    icon: '🎯', category: 'stat', name: '穿透',       desc: '子弹穿透 +1（可穿多个敌人）', maxLevel: STAT_SKILLS.penetrate.maxLevel, apply(p) { p.bulletPenetration += STAT_SKILLS.penetrate.perLevel } },
  { id: 'explosion',    icon: '💥', category: 'stat', name: '爆炸',       desc: `击杀时爆炸（范围 +${STAT_SKILLS.explosion.perLevel}px）`, maxLevel: STAT_SKILLS.explosion.maxLevel, apply(p) { p.bulletExplosion += STAT_SKILLS.explosion.perLevel } },
  { id: 'damage_up',    icon: '🔥', category: 'stat', name: '伤害强化',   desc: `子弹伤害 +${STAT_SKILLS.damage_up.perLevel}`, maxLevel: STAT_SKILLS.damage_up.maxLevel, apply(p) { p.bulletDamage += STAT_SKILLS.damage_up.perLevel } },
  { id: 'rapid_fire',   icon: '⏩', category: 'stat', name: '速射',       desc: '射速 +30%',                 maxLevel: STAT_SKILLS.rapid_fire.maxLevel, apply(p) { const c = STAT_SKILLS.rapid_fire.perLevel; p.bulletFireRate *= c.fireRateMult; p.bulletFireInterval /= c.fireIntervalDiv } },
  { id: 'big_bullet',   icon: '🔵', category: 'stat', name: '巨弹',       desc: '子弹体积 +30%',              maxLevel: STAT_SKILLS.big_bullet.maxLevel, apply(p) { p.bulletSize *= STAT_SKILLS.big_bullet.perLevel } },
  { id: 'death_nova',   icon: '💫', category: 'stat', name: '死亡新星',   desc: '击杀时释放冲击波（基于穿透+1层）', maxLevel: STAT_SKILLS.death_nova.maxLevel,
    apply(p) {
      const c = STAT_SKILLS.death_nova
      const penLevel = p.acquiredSkills.filter(id => id === 'penetrate').length
      p.bulletExplosion += c.baseExplosion + penLevel * c.penBonusExplosion
    }
  },
  // === 吸血技能 ===
  { id: 'lifesteal',   icon: '🩸', category: 'stat', name: '生命偷取', desc: `子弹命中回血 ${Math.round(STAT_SKILLS.lifesteal.perLevel * 100)}%（造成伤害的 ${Math.round(STAT_SKILLS.lifesteal.perLevel * 100)}% 转为 HP）`, maxLevel: STAT_SKILLS.lifesteal.maxLevel, apply(p) { p.lifestealPercent = Math.min(STAT_SKILLS.lifesteal.cap, (p.lifestealPercent || 0) + STAT_SKILLS.lifesteal.perLevel) } },
  { id: 'heal_orb_boost', icon: '💚', category: 'stat', name: '药水强化', desc: `回血球恢复量 +${Math.round(STAT_SKILLS.heal_orb_boost.perLevel * 100)}%`, maxLevel: STAT_SKILLS.heal_orb_boost.maxLevel, apply(p) { p.healOrbMultiplier = (p.healOrbMultiplier || 1) + STAT_SKILLS.heal_orb_boost.perLevel } },

  { id: 'fire',       icon: '🌋', category: 'stat', name: '火元素', desc: '子弹命中产生燃烧地面',             maxLevel: 3, apply(p) { /* 被动联动 */ } },
  { id: 'ice',        icon: '❄️', category: 'stat', name: '冰元素', desc: '子弹减速敌人（联动冰爆/寒冰护甲）',  maxLevel: 3, apply(p) { /* 被动联动 */ } },
  { id: 'lightning',  icon: '🌩️', category: 'stat', name: '雷元素', desc: '子弹概率连锁攻击（联动电弧/风暴）',   maxLevel: 3, apply(p) { /* 被动联动 */ } },

  // ========== 武器解锁类（使用武器/弹道类图标，与属性技能不重复） ==========
  { id: 'weapon_boomerang',        icon: '🌀', category: 'weapon', weaponInstanceId: 'boomerang',         name: '旋转飞刀', desc: `${WEAPON_CONFIGS.boomerang.count} 把飞刀环绕玩家旋转，触碰敌人造成伤害`, maxLevel: WEAPON_CONFIGS.boomerang.maxLevel, apply(p) { /* 见 selectSkill */ } },
  { id: 'weapon_lightning',        icon: '⚡', category: 'weapon', weaponInstanceId: 'lightning_weapon',  name: '闪电链',   desc: `每 ${WEAPON_CONFIGS.lightning_weapon.cooldown} 秒随机打击 ${WEAPON_CONFIGS.lightning_weapon.count} 个敌人，闪电链式传导`,    maxLevel: WEAPON_CONFIGS.lightning_weapon.maxLevel, apply(p) { /* 见 selectSkill */ } },
  { id: 'weapon_mine',             icon: '💣', category: 'weapon', weaponInstanceId: 'mine',              name: '地雷',     desc: '走过的地方留下爆炸区域，敌人靠近触发',        maxLevel: WEAPON_CONFIGS.mine.maxLevel, apply(p) { /* 见 selectSkill */ } },
  { id: 'weapon_auto_pistol',      icon: '🔫', category: 'weapon', weaponInstanceId: 'auto_pistol',       name: '自动手枪', desc: '自动瞄准最近敌人射击（直线弹道）',            maxLevel: WEAPON_CONFIGS.auto_pistol.maxLevel, apply(p) { /* 见 selectSkill */ } },
  { id: 'weapon_orbit_sword',      icon: '🗡️', category: 'weapon', weaponInstanceId: 'orbit_sword',      name: '环绕飞剑', desc: `${WEAPON_CONFIGS.orbit_sword.count} 把飞剑在玩家周围旋转，碰撞伤害`,            maxLevel: WEAPON_CONFIGS.orbit_sword.maxLevel, apply(p) { /* 见 selectSkill */ } },
  { id: 'weapon_random_lightning', icon: '⛈️', category: 'weapon', weaponInstanceId: 'random_lightning', name: '随机落雷', desc: `每隔 ${WEAPON_CONFIGS.random_lightning.cooldown} 秒在随机敌人位置生成 AOE 落雷`,        maxLevel: WEAPON_CONFIGS.random_lightning.maxLevel, apply(p) { /* 见 selectSkill */ } },
]

/**
 * 技能进化（质变）定义
 * 当技能达到最大等级后，下一次可选择进化成超武
 * { baseId: { id, icon, name, desc, apply } }
 * 注：武器技能的进化（超武）由 selectSkill 特殊处理，apply 为占位符
 */
export const SKILL_EVOLUTIONS = {
  // ===== 属性超武（全部唯一 icon） =====
  speed: {
    id: 'evo_speed',
    icon: '🌪️',
    name: STAT_SKILLS.speed.evoName,
    desc: STAT_SKILLS.speed.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.speed.evo
      p.speed *= c.speedMult
      p.evasionChance = Math.min(c.evasionCap, (p.evasionChance || 0) + c.evasionChance)
    },
  },
  bullet_speed: {
    id: 'evo_bullet_speed',
    icon: '🌌',
    name: STAT_SKILLS.bullet_speed.evoName,
    desc: STAT_SKILLS.bullet_speed.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.bullet_speed.evo
      p.bulletSpeed *= c.speedMult
      p.bulletInfiniteRange = c.infiniteRange
    },
  },
  dual_shot: {
    id: 'evo_dual_shot',
    icon: '✴️',
    name: STAT_SKILLS.dual_shot.evoName,
    desc: STAT_SKILLS.dual_shot.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.dual_shot.evo
      p.bulletCount += c.countBonus
      p.bulletFireRate *= c.fireRateMult
      p.bulletFireInterval /= c.fireIntervalDiv
    },
  },
  penetrate: {
    id: 'evo_penetrate',
    icon: '✨',
    name: STAT_SKILLS.penetrate.evoName,
    desc: STAT_SKILLS.penetrate.evoDesc,
    apply(p) { p.bulletPenetration = STAT_SKILLS.penetrate.evo.penOverride },
  },
  rapid_fire: {
    id: 'evo_rapid_fire',
    icon: '💢',
    name: STAT_SKILLS.rapid_fire.evoName,
    desc: STAT_SKILLS.rapid_fire.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.rapid_fire.evo
      p.bulletFireRate *= c.fireRateMult
      p.bulletFireInterval /= c.fireIntervalDiv
    },
  },
  big_bullet: {
    id: 'evo_big_bullet',
    icon: '🔴',
    name: STAT_SKILLS.big_bullet.evoName,
    desc: STAT_SKILLS.big_bullet.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.big_bullet.evo
      p.bulletSize *= c.sizeMult
      p.bulletDamage += c.damageBonus
    },
  },
  damage_up: {
    id: 'evo_damage_up',
    icon: '☠️',
    name: STAT_SKILLS.damage_up.evoName,
    desc: STAT_SKILLS.damage_up.evoDesc,
    apply(p) { p.bulletDamage += STAT_SKILLS.damage_up.evo.damageBonus },
  },
  lifesteal: {
    id: 'evo_lifesteal',
    icon: '🧛',
    name: STAT_SKILLS.lifesteal.evoName,
    desc: STAT_SKILLS.lifesteal.evoDesc,
    apply(p) {
      const c = STAT_SKILLS.lifesteal.evo
      p.lifestealPercent = Math.min(c.lifestealCap, (p.lifestealPercent || 0) * c.lifestealMult)
      p._lowHpLifestealBonus = c.lowHpBonus
    },
  },

  // ===== 武器超武（全部唯一，与基础武器和属性超武均不重复） =====
  weapon_boomerang: {
    id: 'evo_weapon_boomerang',
    icon: '🪃',
    name: WEAPON_CONFIGS.boomerang.evoName,
    desc: WEAPON_CONFIGS.boomerang.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
  weapon_lightning: {
    id: 'evo_weapon_lightning',
    icon: '🔱',
    name: WEAPON_CONFIGS.lightning_weapon.evoName,
    desc: WEAPON_CONFIGS.lightning_weapon.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
  weapon_mine: {
    id: 'evo_weapon_mine',
    icon: '☢️',
    name: WEAPON_CONFIGS.mine.evoName,
    desc: WEAPON_CONFIGS.mine.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
  weapon_auto_pistol: {
    id: 'evo_weapon_auto_pistol',
    icon: '🎆',
    name: WEAPON_CONFIGS.auto_pistol.evoName,
    desc: WEAPON_CONFIGS.auto_pistol.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
  weapon_orbit_sword: {
    id: 'evo_weapon_orbit_sword',
    icon: '⚔️',
    name: WEAPON_CONFIGS.orbit_sword.evoName,
    desc: WEAPON_CONFIGS.orbit_sword.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
  weapon_random_lightning: {
    id: 'evo_weapon_random_lightning',
    icon: '☄️',
    name: WEAPON_CONFIGS.random_lightning.evoName,
    desc: WEAPON_CONFIGS.random_lightning.evoDesc,
    apply(p) { /* 由 selectSkill 处理武器超武升级 */ },
  },
}

/**
 * 随机抽取 3 个技能供玩家选择（包含进化 + 武器升级/解锁选项）
 * @param {string[]} acquiredSkills - 已习得的技能 ID 列表（含重复）
 * @param {object[]} [playerWeapons=[]] - 玩家当前持有的武器实例数组，用于判断武器等级
 * @returns {object[]} 3 个技能选项
 */
const MAX_PICK_SLOTS = 5

export function rollSkillOptions(acquiredSkills, playerWeapons = []) {
  const picks = []

  /** 统计某个技能已获取次数 */
  const skillCount = (id) => acquiredSkills.filter((s) => s === id).length

  // ===== 1. 收集可用的进化选项（最多 1 个，优先加入） =====
  const evoOptions = []
  for (const [baseId, evo] of Object.entries(SKILL_EVOLUTIONS)) {
    const count = skillCount(baseId)
    const baseSkill = ALL_SKILLS.find((s) => s.id === baseId)
    const alreadyEvolved = acquiredSkills.includes(evo.id)
    if (baseSkill && count >= baseSkill.maxLevel && !alreadyEvolved) {
      evoOptions.push({
        id: evo.id,
        icon: evo.icon,
        name: evo.name,
        desc: evo.desc,
        category: baseSkill.category || 'stat',
        maxLevel: 1,
        isEvolution: true,
        baseSkillId: baseId,
        apply: evo.apply,
      })
    }
  }
  const shuffledEvo = evoOptions.sort(() => Math.random() - 0.5)
  if (shuffledEvo.length > 0) {
    picks.push(shuffledEvo[0])
  }

  // ===== 2. 收集武器选项（解锁 / 升级） =====
  const weaponSkills = ALL_SKILLS.filter((s) => s.category === 'weapon')
  const weaponOptions = []
  for (const ws of weaponSkills) {
    const count = skillCount(ws.id)
    if (count >= ws.maxLevel) continue
    const evoDef = SKILL_EVOLUTIONS[ws.id]
    if (evoDef && acquiredSkills.includes(evoDef.id)) continue
    if (count > 0) {
      weaponOptions.push({ ...ws, currentLevel: count, isUpgrade: true })
    } else {
      weaponOptions.push({ ...ws, currentLevel: 0, isUnlock: true })
    }
  }

  // ===== 3. 收集属性技能选项 =====
  const statOptions = ALL_SKILLS.filter((s) => {
    if (s.category === 'weapon') return false
    const count = skillCount(s.id)
    return count < s.maxLevel
  })

  // ===== 4. 随机决定武器/技能配额 =====
  // 可能性：(1W+4S)、(2W+3S)、(3W+2S)、(4W+1S)
  const totalWanted = MAX_PICK_SLOTS
  const weaponQuotaCandidates = [1, 2, 3, 4]
  // 过滤掉超过可用武器数的配额
  const validQuotas = weaponQuotaCandidates.filter(q => q <= weaponOptions.length)
  // 还要保证剩余槽位不超过可用技能数
  const feasibleQuotas = validQuotas.filter(q => (totalWanted - q) <= statOptions.length)
  // 随机器选一个可行的配额
  let weaponQuota = feasibleQuotas.length > 0
    ? feasibleQuotas[Math.floor(Math.random() * feasibleQuotas.length)]
    : Math.min(weaponOptions.length, totalWanted)
  const statQuota = totalWanted - weaponQuota

  // ===== 5. 打乱并填充武器 =====
  const shuffledWp = weaponOptions.sort(() => Math.random() - 0.5)
  let wpAdded = 0
  for (const wo of shuffledWp) {
    if (wpAdded >= weaponQuota) break
    if (!picks.some((p) => p.id === wo.id)) {
      picks.push(wo)
      wpAdded++
    }
  }

  // ===== 6. 打乱并填充属性技能 =====
  const shuffledStat = statOptions.sort(() => Math.random() - 0.5)
  let statAdded = 0
  for (const s of shuffledStat) {
    if (statAdded >= statQuota) break
    if (!picks.some((p) => p.id === s.id)) {
      picks.push({ ...s, currentLevel: skillCount(s.id) })
      statAdded++
    }
  }

  // ===== 7. 如果武器或技能不足，用对方补齐 =====
  // 武器仍有剩余配额但技能不够 → 继续加武器
  const shuffledWp2 = weaponOptions.sort(() => Math.random() - 0.5)
  for (const wo of shuffledWp2) {
    if (picks.length >= totalWanted) break
    if (!picks.some((p) => p.id === wo.id)) {
      picks.push(wo)
    }
  }
  // 技能仍有剩余配额但武器不够 → 继续加技能
  const shuffledStat2 = statOptions.sort(() => Math.random() - 0.5)
  for (const s of shuffledStat2) {
    if (picks.length >= totalWanted) break
    if (!picks.some((p) => p.id === s.id)) {
      picks.push({ ...s, currentLevel: skillCount(s.id) })
    }
  }

  // ===== 8. 补齐到 MAX_PICK_SLOTS 个（用已满级技能填空） =====
  while (picks.length < totalWanted) {
    const fill = ALL_SKILLS.find((s) => !picks.some((p) => p.id === s.id))
    if (fill) picks.push({ ...fill, maxed: true, currentLevel: fill.maxLevel })
    else break
  }

  return picks
}
