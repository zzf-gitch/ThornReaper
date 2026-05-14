/**
 * WeaponBase — 武器系统基类
 *
 * 所有武器的抽象基类，定义通用接口：
 * - update(deltaTime, player, enemies, references) — 每帧更新
 * - draw(ctx, camera) — 每帧绘制
 *
 * 武器与玩家子弹系统完全独立，各自拥有冷却计时器，
 * 互不干扰地自动攻击。
 *
 * 通用属性：
 * - level        武器等级（1~maxLevel）
 * - cd           冷却时间（秒），子类通过 this._cooldown 读写
 * - lastFireTime 上次攻击时间戳（游戏时间，秒），用于独立冷却判断
 * - damage       当前武器伤害值（由 getDmg() 基于 player.bulletDamage 计算）
 *
 * 所有可调数值均引用 GameConfig.js 中的配置表。
 */
import { WEAPON_GLOW } from './GameConfig.js'
export class WeaponBase {
  /**
   * @param {object} opts
   * @param {string} opts.id          武器唯一 ID
   * @param {number} opts.damage      伤害倍率（× player.bulletDamage）
   * @param {number} opts.cooldown    攻击间隔（秒）
   * @param {number} opts.range       攻击范围（像素）
   * @param {number} [opts.count=1]   基础数量（飞刀数/链数/地雷数）
   */
  constructor(opts = {}) {
    this.id = opts.id || 'unknown'
    this._damageMult = opts.damage || 1
    this._cooldown = opts.cooldown || 1.0
    this._range = opts.range || 200
    this._count = opts.count || 1

    // 内部状态
    this.level = 1
    this.maxLevel = 5
    this.cooldownTimer = 0       // 冷却倒计时（秒），递减到 0 后可攻击
    this.lastFireTime = 0        // 上次攻击时的游戏时间戳（由外部 update 传入 deltaTime 累计）
    this.active = true
  }

  /**
   * 根据武器等级返回发光配置，用于绘制时添加 ShadowBlur 升级特效
   * 数值由 GameConfig.js 中的 WEAPON_GLOW 配置表控制
   * @returns {{ blur: number, color: string, scale: number }}
   */
  getGlowConfig() {
    for (let i = WEAPON_GLOW.length - 1; i >= 0; i--) {
      if (this.level >= WEAPON_GLOW[i].minLevel) return WEAPON_GLOW[i]
    }
    return WEAPON_GLOW[0]
  }

  /**
   * 便捷方法：对 ctx 应用当前等级的发光特效
   * @param {CanvasRenderingContext2D} ctx
   */
  applyGlow(ctx) {
    const g = this.getGlowConfig()
    if (g.blur > 0) {
      ctx.shadowColor = g.color
      ctx.shadowBlur = g.blur
    }
  }

  /** @returns {number} 当前冷却时间（秒） */
  get cd() {
    return this._cooldown
  }

  /** 子类重写 — 每帧更新逻辑 */
  update(deltaTime, player, enemies, refs) {
    // 默认空实现
  }

  /** 子类重写 — 每帧绘制逻辑 */
  draw(ctx, camera) {
    // 默认空实现
  }

  /** 计算实际伤害（基于玩家当前子弹伤害 × 武器倍率） */
  getDmg(player) {
    return Math.max(1, Math.floor(player.bulletDamage * this._damageMult))
  }

  /** 获取当前伤害值（便捷方法） */
  get damage() {
    return this._damageMult
  }

  /** 升级武器 */
  upgrade() {
    if (this.level < this.maxLevel) {
      this.level++
      this._onLevelUp()
    }
  }

  /** 子类重写 — 升级时增强属性 */
  _onLevelUp() {
    // 默认：冷却缩短 10%，伤害 +0.5 倍率
    this._cooldown *= 0.9
    this._damageMult += 0.5
    this._count = Math.min(this._count + 1, 8)
  }

  /** 检查冷却是否就绪 */
  isCooldownReady() {
    return this.cooldownTimer <= 0
  }

  /** 重置冷却倒计时 */
  resetCooldown() {
    this.cooldownTimer = this._cooldown
  }

  /** 序列化存档 */
  toJSON() {
    return {
      id: this.id,
      level: this.level,
      cooldownTimer: this.cooldownTimer,
      lastFireTime: this.lastFireTime,
    }
  }

  /** 反序列化恢复 */
  fromJSON(data) {
    this.level = data.level || 1
    this.cooldownTimer = data.cooldownTimer || 0
    this.lastFireTime = data.lastFireTime || 0
  }
}
