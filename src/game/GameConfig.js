/**
 * GameConfig — 武器与技能集中配置表
 *
 * 所有可调数值（伤害、冷却、射程、升级增量等）集中在此文件。
 * 只需修改此处数值，无需翻查数千行代码。
 */

// ==============================
//  通用玩家属性成长（技能相关）
// ==============================
export const STAT_SKILLS = {
  speed: {
    perLevel: 1.15,           // 移速倍率/级
    maxLevel: 3,
    evo: { speedMult: 1.4, evasionChance: 0.2, evasionCap: 0.5 },
    evoName: '疾风步',
    evoDesc: '移速 +40%，受击时有 20% 几率闪避',
  },
  bullet_speed: {
    perLevel: 1.25,           // 子弹速度倍率/级
    maxLevel: 3,
    evo: { speedMult: 2.0, infiniteRange: true },
    evoName: '贯穿全屏',
    evoDesc: '子弹速度翻倍且不会因超出范围消失',
  },
  dual_shot: {
    perLevel: 1,              // 每级 + 子弹数
    maxLevel: 3,
    evo: { countBonus: 5, fireRateMult: 1.5, fireIntervalDiv: 1.5 },
    evoName: '弹幕风暴',
    evoDesc: '子弹数 +5，射速 +50%',
  },
  penetrate: {
    perLevel: 1,              // 每级 + 穿透数
    maxLevel: 3,
    evo: { penOverride: 999 },
    evoName: '无限穿透',
    evoDesc: '子弹可无限穿透敌人',
  },
  rapid_fire: {
    perLevel: { fireRateMult: 1.3, fireIntervalDiv: 1.3 },
    maxLevel: 3,
    evo: { fireRateMult: 2.0, fireIntervalDiv: 2.0 },
    evoName: '机关枪',
    evoDesc: '射速翻倍',
  },
  big_bullet: {
    perLevel: 1.3,            // 体积倍率/级
    maxLevel: 3,
    evo: { sizeMult: 2.0, damageBonus: 3 },
    evoName: '巨型弹',
    evoDesc: '子弹体积翻倍，伤害 +3',
  },
  damage_up: {
    perLevel: 1,              // 每级 + 伤害
    maxLevel: 5,
    evo: { damageBonus: 8 },
    evoName: '毁灭之力',
    evoDesc: '子弹伤害 +8',
  },
  explosion: {
    perLevel: 30,             // 每级 + 爆炸范围(px)
    maxLevel: 3,
  },
  shield: {
    perLevel: 20,             // 每级 + Hp
    maxLevel: 3,
  },
  heal: {
    restorePercent: 0.3,      // 回复血量百分比
    maxLevel: 1,
  },
  death_nova: {
    baseExplosion: 20,
    penBonusExplosion: 15,    // 每层穿透额外爆炸范围
    maxLevel: 2,
  },
  lifesteal: {
    perLevel: 0.05,           // 吸血率/级
    cap: 0.5,                 // 上限
    maxLevel: 3,
    evo: { lifestealMult: 2, lifestealCap: 1.0, lowHpBonus: 0.2 },
    evoName: '鲜血渴望',
    evoDesc: '吸血率翻倍（上限 100%），HP 低于 30% 时额外 +20% 吸血率',
  },
  heal_orb_boost: {
    perLevel: 0.5,            // 回血球倍率增量/级
    maxLevel: 3,
  },
}

// ==============================
//  武器基础参数
// ==============================
export const WEAPON_CONFIGS = {
  boomerang: {
    damage: 1.5,
    cooldown: 0,
    range: 140,
    count: 2,
    maxLevel: 5,
    levelUp: { damageAdd: 0.5, countAdd: 1, countCap: 8, rangeAdd: 10, rangeCap: 250 },
    blade: { radiusRange: [0.5, 1.0], speedRange: [1.8, 2.4] },
    trailColor: 'rgba(46, 204, 113, %alpha%)',
    evoName: '无尽回旋',
    evoDesc: '飞刀数量翻倍，范围 +50%，每把飞刀附带持续切割效果',
  },
  lightning_weapon: {
    damage: 2.0,
    cooldown: 2.0,
    range: 400,
    count: 3,
    maxLevel: 5,
    chainJumps: 2,
    chainJumpsCap: 5,
    levelUp: { damageAdd: 0.8, cooldownMult: 0.85, cooldownMin: 0.5, countAdd: 2, countCap: 12, chainAdd: 1, rangeAdd: 30 },
    arcSegments: 6,
    arcJitter: 16,
    arcDuration: 0.3,
    arcColor: '#3498db',
    evoName: '雷霆风暴',
    evoDesc: '闪电链无 CD，每次打击额外触发范围雷击',
  },
  mine: {
    damage: 3.0,
    cooldown: 3.0,
    range: 80,
    count: 1,
    maxLevel: 5,
    maxMines: 8,
    maxMinesCap: 20,
    placeInterval: 0.5,
    armingDelay: 0.3,
    mineRadius: 18,
    levelUp: { damageAdd: 0.8, cooldownMult: 0.85, cooldownMin: 0.5, rangeAdd: 10, maxMinesAdd: 3 },
    evoName: '炼狱雷场',
    evoDesc: '地雷永久存在，范围翻倍，触发时产生连锁爆炸',
  },
  auto_pistol: {
    damage: 1.2,
    cooldown: 0.4,
    range: 350,
    count: 1,
    maxLevel: 5,
    bulletSpeed: 600,
    bulletRadius: 4,
    bulletColor: '#f39c12',
    bulletPoolSize: 50,
    spreadAngle: 0.1,
    levelUp: { cooldownMult: 0.85, cooldownMin: 0.15, damageAdd: 0.5, bulletSpeedAdd: 50, countAdd: 1, countCap: 5, rangeAdd: 30 },
    evoName: '审判之枪',
    evoDesc: '子弹翻倍，伤害 +3，同时攻击所有可见敌人',
  },
  orbit_sword: {
    damage: 1.0,
    cooldown: 0,
    range: 130,
    count: 3,
    maxLevel: 5,
    rotateSpeed: 2.5,
    rotateSpeedCap: 4.5,
    hitCooldown: 0.3,
    swordSize: 12,
    levelUp: { damageAdd: 0.6, countAdd: 2, countCap: 10, rangeAdd: 12, rangeCap: 250, rotateAdd: 0.2, sizeAdd: 2 },
    trailColor: 'rgba(155, 89, 182, %alpha%)',
    evoName: '万剑归宗',
    evoDesc: '飞剑数量翻倍，自动追踪附近敌人',
  },
  random_lightning: {
    damage: 2.5,
    cooldown: 3.0,
    range: 120,
    count: 1,
    maxLevel: 5,
    warningDuration: 0.6,
    strikeVisualDuration: 0.25,
    maxWarnings: 5,
    ringShrinkSpeed: 0.7,
    levelUp: { damageAdd: 0.8, cooldownMult: 0.85, cooldownMin: 1.0, rangeAdd: 15, countAdd: 1, countCap: 6 },
    evoName: '天雷灭世',
    evoDesc: '落雷无延迟，范围翻倍，每道雷电附带眩晕效果',
  },
}

// ==============================
//  武器发光特效（升级视觉反馈）
// ==============================
export const WEAPON_GLOW = [
  { minLevel: 1, blur: 0,  color: '#ffffff', scale: 1.00 },
  { minLevel: 3, blur: 6,  color: '#f1c40f', scale: 1.10 },
  { minLevel: 4, blur: 14, color: '#f39c12', scale: 1.20 },
  { minLevel: 5, blur: 24, color: '#ff6b6b', scale: 1.30 },
]

// ==============================
//  游戏内掉落/动态难度参数
// ==============================
export const DROP_RATES = {
  healBaseChance: 0.05,
  healChancePerMin: 0.02,
  healChanceMax: 0.20,
  premiumBaseChance: 0.02,
  premiumChancePerMin: 0.015,
  premiumChanceMax: 0.25,
  baseExp: 20,
  healBaseAmount: 15,
  healAmountPerMin: 5,
  premiumBaseExp: 50,
  premiumExpPer30s: 10,
}

export const ENEMY_SCALING = {
  spawnIntervalBase: 2.0,
  spawnIntervalMin: 0.4,
  spawnIntervalDecay: 0.02,
  hpBase: 40,
  hpGrowth: 1.5,
  hpRandomRange: [0.8, 1.5],
  speedBase: 100,
  speedGrowth: 0.08,
  damageBase: 20,
  damageGrowth: 0.1,
  bossSpawnTimes: [300, 600],
}

// ==============================
//  可破坏物生成参数
// ==============================
export const DESTRUCTIBLE_CONFIG = {
  spawnIntervalMin: 3.0,        // 最小生成间隔（秒）
  spawnIntervalMax: 8.0,        // 最大生成间隔（秒）
  maxDestructibles: 30,         // 地图上最大可破坏物数量
  spawnRadiusMin: 200,          // 距离玩家最小生成距离
  spawnRadiusMax: 500,          // 距离玩家最大生成距离
  typeWeights: {                // 类型权重
    barrel: 0.5,
    crate: 0.3,
    ore: 0.2,
  },
  goldPerDrop: 1,              // 每次金币掉落基础值
}
