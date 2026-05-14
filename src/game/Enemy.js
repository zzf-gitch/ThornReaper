/**
 * Enemy 类 — 多种 AI 行为（FSM 有限状态机）
 *
 * 敌人类型：
 * - 'chaser'   （普通追敌）默认，直冲玩家
 * - 'charger'  （冲锋型）  接近后突然加速冲锋
 * - 'ranger'   （远程型）  保持距离，周期性射击
 * - 'suicider' （自爆型）  高速追敌，死亡后延迟爆炸
 */
import { SpriteCache } from './SpriteCache.js'

export class Enemy {
  /**
   * @param {number} x 初始 X
   * @param {number} y 初始 Y
   * @param {number} speed 移动速度（像素/秒）
   * @param {number} hpMax 最大生命值
   * @param {'chaser'|'charger'|'ranger'|'suicider'|'shield'|'suicide_bug'|'elite_ranger'|'boss'} [type='chaser'] 敌人类型
   */
  constructor(x, y, speed = 120, hpMax = 1, type = 'chaser') {
    this.x = x
    this.y = y
    this.type = type
    this.alive = true

    // === 通用属性 ===
    this.state = 'idle'
    this.stateTimer = 0
    this.statusEffects = []

    /** 受击闪白计时器（秒），>0 时身体变白 */
    this._flashWhiteTimer = 0

    // === 按类型初始化 ===
    if (type === 'charger') {
      this.size = 32
      this.speed = speed
      this.baseSpeed = speed
      this.burstSpeed = speed * 2            // 冲锋速度翻倍
      this.burstDuration = 2.0                // 冲锋持续 2 秒
      this.burstCooldown = 1.5                // 冲锋后冷却 1.5 秒
      this.chargeRange = 150                  // 冲锋触发距离
      this.maxHp = Math.floor(hpMax * 1.5)    // 血量略高
      this.hp = this.maxHp
      // 橙色系颜色
      const r = 240 + Math.floor(Math.random() * 15)
      const g = 120 + Math.floor(Math.random() * 40)
      const b = 20 + Math.floor(Math.random() * 20)
      this.color = `rgb(${r},${g},${b})`
    } else if (type === 'ranger') {
      this.size = 24
      this.rangerSpeed = speed * 0.6           // 更慢
      this.speed = this.rangerSpeed
      this.baseSpeed = this.rangerSpeed
      this.shootCooldown = 1.5 + Math.random() * 1.0  // 射击间隔 1.5~2.5 秒
      this.shootTimer = Math.random() * this.shootCooldown  // 错开首次射击时间
      this.needsShoot = false                  // 由 GameCanvas 消费的射击标记
      this.keepMinDist = 200                   // 保持最小距离
      this.keepMaxDist = 350                   // 保持最大距离
      this.fleeThreshold = 120                 // 后退触发距离
      this.maxHp = Math.floor(hpMax * 0.7)     // 血量略低
      this.hp = this.maxHp
      // 蓝色系颜色
      const r = 40 + Math.floor(Math.random() * 40)
      const g = 100 + Math.floor(Math.random() * 40)
      const b = 220 + Math.floor(Math.random() * 35)
      this.color = `rgb(${r},${g},${b})`
    } else if (type === 'suicider') {
      this.size = 30
      this.speed = speed * 1.3                 // 更快
      this.baseSpeed = this.speed
      this.explosionRadius = 100               // 爆炸半径
      this.explosionDamage = 30                // 爆炸伤害
      this.explodeTimer = 0.3                  // 死亡后 0.3 秒爆炸
      this._exploding = false                  // 是否处于爆炸倒计时
      this.maxHp = Math.max(1, Math.floor(hpMax * 0.5))  // 血量减半
      this.hp = this.maxHp
      // 紫色系颜色
      const r = 180 + Math.floor(Math.random() * 40)
      const g = 40 + Math.floor(Math.random() * 40)
      const b = 180 + Math.floor(Math.random() * 50)
      this.color = `rgb(${r},${g},${b})`
    } else if (type === 'shield') {
      // 盾牌兵 — 移动缓慢，正面免疫子弹，逼迫绕后
      this.size = 32
      this.speed = speed * 0.5                  // 移速减半
      this.baseSpeed = this.speed
      this.maxHp = Math.floor(hpMax * 2.5)      // 血量极高
      this.hp = this.maxHp
      this.shieldDir = { x: 0, y: 0 }           // 盾牌朝向（朝玩家）
      this.shieldFrontAngle = Math.PI / 2        // 正面 90° 免疫角度
      // 灰铁色系
      const gr = 100 + Math.floor(Math.random() * 40)
      const gg = 110 + Math.floor(Math.random() * 30)
      const gb = 120 + Math.floor(Math.random() * 30)
      this.color = `rgb(${gr},${gg},${gb})`
    } else if (type === 'suicide_bug') {
      // 自爆虫 — 移速快，靠近后变红闪烁 2 秒爆炸
      this.size = 20
      this.speed = speed * 1.5                  // 高速
      this.baseSpeed = this.speed
      this.explosionRadius = 90                 // 爆炸范围
      this.explosionDamage = 35                 // 爆炸伤害
      this._exploding = false
      this.suicideTimer = 0                     // 自爆倒计时
      this.SUICIDE_DELAY = 2.0                  // 2 秒后爆炸
      this.explodeTimer = 0.3                   // 死后爆炸延迟（与 suicider 保持一致）
      this.maxHp = Math.floor(hpMax * 0.4)      // 血量很低
      this.hp = this.maxHp
      // 绿色系
      const gr = 40 + Math.floor(Math.random() * 30)
      const gg = 140 + Math.floor(Math.random() * 50)
      const gb = 40 + Math.floor(Math.random() * 30)
      this.color = `rgb(${gr},${gg},${gb})`
    } else if (type === 'elite_ranger') {
      // 精英射手 — 停在远处向玩家发射慢速飞行物
      this.size = 28
      this.speed = speed * 0.4                  // 很慢（站桩输出）
      this.baseSpeed = this.speed
      this.shootCooldown = 1.2 + Math.random() * 0.6  // 射击间隔 1.2~1.8 秒
      this.shootTimer = Math.random() * this.shootCooldown
      this.needsShoot = false
      this.keepMinDist = 250                    // 保持更远距离
      this.keepMaxDist = 400
      this.fleeThreshold = 180
      // 精英射手的子弹更慢但伤害更高
      this.bulletSpeed = 150                    // 慢速飞行物
      this.bulletDamage = 12                    // 较高伤害
      this.maxHp = Math.floor(hpMax * 1.2)      // 血量略高
      this.hp = this.maxHp
      // 金色/红色系
      const rr = 200 + Math.floor(Math.random() * 55)
      const gg = 140 + Math.floor(Math.random() * 40)
      const bb = 20 + Math.floor(Math.random() * 30)
      this.color = `rgb(${rr},${gg},${bb})`
    } else if (type === 'boss') {
      // Boss — 巨型敌人，多阶段 AI
      this.size = 64                          // 体型巨大
      this.speed = speed * 0.3                // 移动缓慢
      this.baseSpeed = this.speed
      this.maxHp = Math.floor(hpMax * 20)     // 血量极高
      this.hp = this.maxHp
      this.bossPhase = 1                      // 阶段 1/2/3
      this.phaseTimer = 0
      this.shootCooldown = 2.0 + Math.random() * 1.0
      this.shootTimer = Math.random() * this.shootCooldown
      this.needsShoot = false
      this.keepMinDist = 200
      this.keepMaxDist = 350
      this.fleeThreshold = 150
      this.bulletSpeed = 120                  // Boss 子弹
      this.bulletDamage = 15
      this.chargeRange = 120                  // Boss 冲锋距离
      this.burstSpeed = speed * 1.0           // 冲锋速度
      this.burstDuration = 1.5
      this.isBoss = true                      // 标记为 Boss
      this.dropSuperChest = true              // 死后掉落超级宝箱
      // 暗紫色系
      const rr = 80 + Math.floor(Math.random() * 40)
      const gg = 30 + Math.floor(Math.random() * 30)
      const bb = 120 + Math.floor(Math.random() * 50)
      this.color = `rgb(${rr},${gg},${bb})`
    } else {
      // 默认普通追敌型
      this.size = 28
      this.speed = speed
      this.baseSpeed = speed
      this.maxHp = hpMax
      this.hp = hpMax
      const r = 200 + Math.floor(Math.random() * 55)
      const g = 40 + Math.floor(Math.random() * 40)
      const b = 40 + Math.floor(Math.random() * 40)
      this.color = `rgb(${r},${g},${b})`
    }
  }

  /** 受到伤害（返回 true 表示死亡） */
  takeDamage(amount) {
    this.hp -= amount
    this._flashWhiteTimer = 0.08  // 受击闪白 80ms
    if (this.hp <= 0) {
      this.alive = false
      // 自爆型不立即死亡，进入爆炸倒计时
      if (this.type === 'suicider' || this.type === 'suicide_bug') {
        this._exploding = true
        this.speed = 0  // 停止移动
      }
      return true
    }
    return false
  }

  /** 击退效果 */
  knockback(dirX, dirY, force = 8) {
    if (this._exploding) return  // 爆炸倒计时中不再被击退
    this.x += dirX * force
    this.y += dirY * force
  }

  /** 添加/刷新状态效果 */
  addStatusEffect(type, dps, duration) {
    const existing = this.statusEffects.find((e) => e.type === type)
    if (existing) {
      existing.dps = Math.max(existing.dps, dps)
      existing.remaining = Math.max(existing.remaining, duration)
    } else {
      this.statusEffects.push({ type, dps, remaining: duration })
    }
  }

  /** 处理状态效果 */
  _processStatusEffects(deltaTime) {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const se = this.statusEffects[i]
      se.remaining -= deltaTime

      switch (se.type) {
        case 'burn':
          this.hp -= se.dps * deltaTime
          if (this.hp <= 0) {
            this.hp = 0
            this.alive = false
            if (this.type === 'suicider') {
              this._exploding = true
              this.speed = 0
            }
          }
          break
        case 'slow':
          this.speed = this.baseSpeed * 0.5
          break
        case 'freeze':
          this.speed = 0
          break
      }

      if (se.remaining <= 0) {
        this.statusEffects.splice(i, 1)
      }
    }

    const hasMovementEffect = this.statusEffects.some(
      (se) => se.type === 'slow' || se.type === 'freeze'
    )
    if (!hasMovementEffect) {
      this.speed = this.baseSpeed
    }
  }

  /** 每帧更新 — 按类型分发 FSM */
  update(deltaTime, playerX, playerY) {
    this._processStatusEffects(deltaTime)
    if (this._flashWhiteTimer > 0) this._flashWhiteTimer -= deltaTime  // 受击闪白倒计时
    if (!this.alive && !this._exploding) return  // 已死且非爆炸中

    // 爆炸倒计时（自爆型死亡后继续更新，不计入 FSM）
    if (this._exploding) {
      this.explodeTimer -= deltaTime
      return
    }

    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const dirX = dist > 0.5 ? dx / dist : 0
    const dirY = dist > 0.5 ? dy / dist : 0

    // 按类型分发
    switch (this.type) {
      case 'charger': this._updateCharger(deltaTime, dirX, dirY, dist); break
      case 'ranger': this._updateRanger(deltaTime, dirX, dirY, dist, playerX, playerY); break
      case 'suicider': this._updateSuicider(deltaTime, dirX, dirY, dist); break
      case 'shield': this._updateShield(deltaTime, dirX, dirY, dist); break
      case 'suicide_bug': this._updateSuicideBug(deltaTime, dirX, dirY, dist, playerX, playerY); break
      case 'elite_ranger': this._updateEliteRanger(deltaTime, dirX, dirY, dist, playerX, playerY); break
      case 'boss': this._updateBoss(deltaTime, dirX, dirY, dist, playerX, playerY); break
      default: this._updateChaser(deltaTime, dirX, dirY, dist); break
    }
  }

  /** 普通追敌型 — 直线冲向玩家 */
  _updateChaser(deltaTime, dirX, dirY, dist) {
    if (dist > 0.5) {
      this.x += dirX * this.speed * deltaTime
      this.y += dirY * this.speed * deltaTime
    }
  }

  /** 冲锋型 — 接近后加速 */
  _updateCharger(deltaTime, dirX, dirY, dist) {
    this.stateTimer -= deltaTime

    if (this.state === 'burst') {
      // 冲锋状态
      if (this.stateTimer <= 0 || dist > 250) {
        this.state = 'cooldown'
        this.stateTimer = this.burstCooldown
      } else {
        const speed = this.speed * 2  // 冲锋速度 = 2x 当前速度
        this.x += dirX * speed * deltaTime
        this.y += dirY * speed * deltaTime
      }
    } else if (this.state === 'cooldown') {
      // 冲锋后冷却
      if (this.stateTimer <= 0) {
        this.state = 'idle'
      }
      // 冷却时仍正常追逐
      if (dist > 0.5) {
        this.x += dirX * this.speed * deltaTime
        this.y += dirY * this.speed * deltaTime
      }
    } else {
      // 普通追逐
      if (dist > 0.5) {
        this.x += dirX * this.speed * deltaTime
        this.y += dirY * this.speed * deltaTime
      }
      // 距离足够近 → 触发冲锋
      if (dist < this.chargeRange) {
        this.state = 'burst'
        this.stateTimer = this.burstDuration
      }
    }
  }

  /** 远程型 — 保持距离 + 射击 */
  _updateRanger(deltaTime, dirX, dirY, dist, playerX, playerY) {
    this.needsShoot = false
    this.shootTimer -= deltaTime

    if (dist < this.fleeThreshold) {
      // 被逼近 → 后退
      this.x -= dirX * this.speed * deltaTime
      this.y -= dirY * this.speed * deltaTime
    } else if (dist < this.keepMinDist) {
      // 距离略近 → 横向绕圈
      const perpX = -dirY, perpY = dirX
      this.x += perpX * this.speed * 0.7 * deltaTime
      this.y += perpY * this.speed * 0.7 * deltaTime
    } else if (dist > this.keepMaxDist) {
      // 距离太远 → 靠近
      this.x += dirX * this.speed * 0.8 * deltaTime
      this.y += dirY * this.speed * 0.8 * deltaTime
    } else {
      // 理想距离 → 横向游走
      const wanderDirX = -dirY * 0.5, wanderDirY = dirX * 0.5
      this.x += wanderDirX * this.speed * deltaTime
      this.y += wanderDirY * this.speed * deltaTime
    }

    // 射击
    if (this.shootTimer <= 0) {
      this.needsShoot = true
      this.shootTimer = this.shootCooldown
    }
  }

  /** 自爆型 — 直奔玩家 */
  _updateSuicider(deltaTime, dirX, dirY, dist) {
    if (dist > 0.5) {
      this.x += dirX * this.speed * deltaTime
      this.y += dirY * this.speed * deltaTime
    }
  }

  /** 盾牌兵 — 移动缓慢，正面朝玩家，子弹从背后命中才生效 */
  _updateShield(deltaTime, dirX, dirY, dist) {
    // 始终朝向玩家
    this.shieldDir.x = dirX
    this.shieldDir.y = dirY

    if (dist > 0.5) {
      this.x += dirX * this.speed * deltaTime
      this.y += dirY * this.speed * deltaTime
    }
  }

  /** 自爆虫 — 靠近玩家后变红闪烁 2 秒爆炸 */
  _updateSuicideBug(deltaTime, dirX, dirY, dist, playerX, playerY) {
    if (this._exploding) {
      this.explodeTimer -= deltaTime
      return
    }

    // 玩家在 80px 内 → 开始 2 秒自爆倒计时
    if (dist < 80) {
      this._exploding = true
      this.speed = 0
      this.explodeTimer = this.SUICIDE_DELAY  // 2 秒倒计时
      return
    }

    // 正常追逐
    if (dist > 0.5) {
      this.x += dirX * this.speed * deltaTime
      this.y += dirY * this.speed * deltaTime
    }
  }

  /** 精英射手 — 站桩远程发射慢速高伤飞行物 */
  _updateEliteRanger(deltaTime, dirX, dirY, dist, playerX, playerY) {
    this.needsShoot = false
    this.shootTimer -= deltaTime

    if (dist < this.fleeThreshold) {
      // 被逼近 → 后退
      this.x -= dirX * this.speed * deltaTime
      this.y -= dirY * this.speed * deltaTime
    } else if (dist < this.keepMinDist) {
      // 略近 → 横向绕圈
      const perpX = -dirY, perpY = dirX
      this.x += perpX * this.speed * 0.6 * deltaTime
      this.y += perpY * this.speed * 0.6 * deltaTime
    } else if (dist > this.keepMaxDist) {
      // 太远 → 靠近
      this.x += dirX * this.speed * 0.7 * deltaTime
      this.y += dirY * this.speed * 0.7 * deltaTime
    } else {
      // 理想距离 → 横向游走
      const wanderDirX = -dirY * 0.4, wanderDirY = dirX * 0.4
      this.x += wanderDirX * this.speed * deltaTime
      this.y += wanderDirY * this.speed * deltaTime
    }

    // 射击
    if (this.shootTimer <= 0) {
      this.needsShoot = true
      this.shootTimer = this.shootCooldown
    }
  }

  /** Boss AI — 多阶段战斗 */
  _updateBoss(deltaTime, dirX, dirY, dist, playerX, playerY) {
    this.needsShoot = false
    this.shootTimer -= deltaTime

    // Boss 阶段判定（基于血量比例）
    const hpRatio = this.hp / this.maxHp
    if (hpRatio < 0.3) {
      this.bossPhase = 3  // 狂暴阶段
    } else if (hpRatio < 0.6) {
      this.bossPhase = 2  // 半血阶段
    }

    this.phaseTimer += deltaTime

    switch (this.bossPhase) {
      case 3:
        // 阶段 3 - 狂暴：冲锋 + 3way 射击 + 快速
        this.speed = this.baseSpeed * 1.8
        if (this.phaseTimer > 1.5) {
          this.phaseTimer = 0
          // 扇形三发射击
          this.needsShoot = true  // 一发直射
        }
        // 随机冲锋
        if (dist < 200 && Math.random() < 0.02) {
          // 快速冲撞
          this.x += dirX * this.burstSpeed * deltaTime * 5
          this.y += dirY * this.burstSpeed * deltaTime * 5
        } else if (dist > 0.5) {
          this.x += dirX * this.speed * deltaTime
          this.y += dirY * this.speed * deltaTime
        }
        break

      case 2:
        // 阶段 2 - 半血：射击加速 + 召唤小兵
        this.speed = this.baseSpeed * 1.3
        if (dist < this.fleeThreshold) {
          this.x -= dirX * this.speed * deltaTime
          this.y -= dirY * this.speed * deltaTime
        } else if (dist > this.keepMaxDist) {
          this.x += dirX * this.speed * 0.8 * deltaTime
          this.y += dirY * this.speed * 0.8 * deltaTime
        } else {
          const perpX = -dirY, perpY = dirX
          this.x += perpX * this.speed * 0.5 * deltaTime
          this.y += perpY * this.speed * 0.5 * deltaTime
        }
        break

      default:
        // 阶段 1 — 基础：缓慢追击 + 远程射击
        this.speed = this.baseSpeed
        if (dist < this.fleeThreshold) {
          this.x -= dirX * this.speed * deltaTime
          this.y -= dirY * this.speed * deltaTime
        } else if (dist > this.keepMaxDist) {
          this.x += dirX * this.speed * 0.6 * deltaTime
          this.y += dirY * this.speed * 0.6 * deltaTime
        } else {
          const perpX = -dirY, perpY = dirX
          this.x += perpX * this.speed * 0.3 * deltaTime
          this.y += perpY * this.speed * 0.3 * deltaTime
        }
        break
    }

    // 射击
    if (this.shootTimer <= 0) {
      this.needsShoot = true
      this.shootTimer = this.shootCooldown / (this.bossPhase === 3 ? 2.0 : this.bossPhase === 2 ? 1.3 : 1.0)
    }
  }

  /** 绘制敌人 — 使用 PixelArt 像素画精灵 */
  draw(ctx) {
    // 爆炸倒计时中的自爆型特殊绘制（保留闪烁效果）
    if (this._exploding) {
      this._drawExploding(ctx)
      return
    }

    const half = this.size / 2
    ctx.save()

    // 使用 PixelArt 精灵按类型绘制
    SpriteCache.drawEnemyByType(ctx, this.x, this.y, this.type)

    // 受击闪白 — 白色半透明叠加层
    if (this._flashWhiteTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, this._flashWhiteTimer * 8)})`
      ctx.fillRect(this.x - half, this.y - half, this.size, this.size)
    }

    // HP 血条
    if (this.maxHp > 1) {
      this._drawHpBar(ctx, half)
    }

    // 状态效果可视化
    this._drawStatusEffects(ctx, half)

    ctx.restore()
  }

  // ----- 以下方法保留，但不再作为主绘制路径 -----

  /** 爆炸倒计时绘制 — 红色闪烁 */
  _drawExploding(ctx) {
    const half = this.size / 2
    ctx.save()
    const blink = Math.floor(Date.now() / 100) % 2 === 0
    ctx.fillStyle = blink ? '#ff0000' : '#ff6600'
    ctx.shadowColor = '#ff0000'
    ctx.shadowBlur = 20
    ctx.fillRect(this.x - half, this.y - half, this.size, this.size)
    ctx.shadowBlur = 0
    // 危险标记
    ctx.fillStyle = '#fff'
    ctx.font = `${this.size}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('💥', this.x, this.y)
    ctx.restore()
  }

  /** 状态效果可视化 */
  _drawStatusEffects(ctx, half) {
    const hasSlow = this.statusEffects.some((se) => se.type === 'slow')
    const hasFreeze = this.statusEffects.some((se) => se.type === 'freeze')
    const hasBurn = this.statusEffects.some((se) => se.type === 'burn')

    if (hasFreeze || hasSlow) {
      ctx.fillStyle = hasFreeze
        ? 'rgba(100, 180, 255, 0.35)'
        : 'rgba(100, 180, 255, 0.15)'
      ctx.fillRect(this.x - half, this.y - half, this.size, this.size)
    }

    if (hasBurn) {
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#ff6600'
      ctx.shadowBlur = 8
      ctx.strokeRect(this.x - half, this.y - half, this.size, this.size)
      ctx.shadowBlur = 0
    }
  }

  /** 绘制头顶 HP 血条 */
  _drawHpBar(ctx, half) {
    const barWidth = this.size
    const barHeight = 3
    const barX = this.x - barWidth / 2
    const barY = this.y - half - 6
    const hpRatio = this.hp / this.maxHp

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const color = hpRatio > 0.5 ? '#e74c3c' : '#ff6b6b'
    ctx.fillStyle = color
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight)
  }

  /** 获取碰撞矩形 */
  getBounds() {
    const half = this.size / 2
    return {
      left: this.x - half,
      right: this.x + half,
      top: this.y - half,
      bottom: this.y + half,
    }
  }
}
