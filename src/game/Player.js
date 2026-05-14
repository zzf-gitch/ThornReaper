/**
 * Player 类 — 纯 JavaScript 对象，不依赖 Vue 响应式
 * 坐标存储在普通属性中，由 Canvas 直接绘制，保证 60FPS 性能
 */
import { SpriteCache } from './SpriteCache.js'

export class Player {
  constructor(canvasWidth, canvasHeight) {
    // 出生点在画布中央
    this.x = canvasWidth / 2
    this.y = canvasHeight / 2

    // 尺寸
    this.radius = 16

    // 移动速度（像素/秒）—— 惯性系统下的最大速度
    this.speed = 300

    // === 惯性/摩擦力系统 ===
    this._vx = 0                // 当前 X 方向速度
    this._vy = 0                // 当前 Y 方向速度
    this._friction = 6.0        // 摩擦系数（越大越快停止）
    this._acceleration = 1200   // 加速度（像素/秒²）

    // 生命值
    this.maxHp = 100
    this.hp = this.maxHp

    // 受伤无敌时间（秒），防止连续掉血
    this.invincibleDuration = 0.5
    this._invincibleTimer = 0

    // 受击闪白计时器
    this._flashWhiteTimer = 0

    // === 子弹/攻击属性（供技能系统修改） ===
    this.bulletSpeed = 500       // 子弹飞行速度（像素/秒）
    this.bulletCount = 1         // 每次发射子弹数
    this.bulletFireInterval = 0.5 // 发射间隔（秒）
    this.bulletRange = 1.0       // 攻击范围倍率

    // === 新增数值属性（供技能系统修改） ===
    this.bulletDamage = 1        // 子弹基础伤害
    this.bulletPenetration = 1   // 子弹穿透次数（1=不穿透，2=穿透1个敌人）
    this.bulletExplosion = 0     // 子弹爆炸半径（0=无爆炸）
    this.bulletSize = 5          // 子弹半径
    this.bulletFireRate = 1.0    // 射速倍率（1.0=原始速度）

    // 已获取的技能 ID 列表
    this.acquiredSkills = []

    // === 独立武器系统（WeaponBase 实例数组） ===
    /** @type {import('./WeaponBase.js').WeaponBase[]} */
    this.weapons = []

    // === 护盾 / 回复 / 金币加成（由天赋提供） ===
    this.shields = 0
    this.hpRegen = 0
    this.goldMultiplier = 1.0

    // === 永久强化（由局外天赋提供） ===
    this.damageReduction = 0        // 减伤比例（0~0.5）
    this.pickupRangeMultiplier = 1.0 // 经验球吸取范围倍率

    // === 吸血 ===
    this.lifestealPercent = 0       // 子弹命中回血百分比（0~1）
    this.healOrbMultiplier = 1.0    // 回血球恢复量倍率

    // === 进化技能属性 ===
    this.evasionChance = 0          // 闪避几率（0~0.5）
    this.bulletInfiniteRange = false // 子弹无限射程

    // === 击杀统计 ===
    this.kills = 0

    // === 经验 / 等级 / 分数 系统 ===
    this.level = 1
    this.exp = 0
    this.expToNext = 100
    this.score = 0

    // 升级回调（由 Vue 组件设置，用于触发升级菜单暂停）
    this.onLevelUp = null

    // 画布边界引用（用于限制移动范围）
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    // 当前按下的按键集合
    this._keys = new Set()

    // === 残影 Trail 系统 ===
    this._trailPositions = []        // { x, y, age } 数组
    this._trailMaxLength = 10        // 最多保留 10 个残影
    this._trailSpawnTimer = 0
    this._trailSpawnInterval = 0.03  // 每 30ms 生成一个残影
    this._trailLifetime = 0.3        // 残影持续 0.3 秒淡出

    // 摇杆方向（由 VirtualJoystick 驱动）
    this._joystickDx = 0
    this._joystickDy = 0

    // === 手柄输入（由 GamepadManager 驱动） ===
    this._gamepadAxes = [0, 0]

    // === 特殊技能触发（手柄 B/RB 或右屏点击） ===
    this._skillPressed = false
    // 外部设置的回调，当技能触发时执行（例如瞬移/爆发）
    this.onSkill = null

    // _bindInput 由外部在 setup 时显式调用，以避免构造函数内自动绑定导致的
    // 生命周期管理混乱（如刷新/继续游戏时重复绑定）
  }

  /** 移除键盘事件（安全可重入） */
  _unbindInput() {
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown)
    }
    if (this._onKeyUp) {
      window.removeEventListener('keyup', this._onKeyUp)
    }
  }

  /** 绑定键盘事件 */
  _bindInput() {
    // 先移除旧监听器（如果有），防止重复绑定
    this._unbindInput()
    this._onKeyDown = (e) => {
      // 阻止方向键和 WASD 的默认滚动行为
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
      }
      this._keys.add(key)
    }

    this._onKeyUp = (e) => {
      this._keys.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  /** 造成伤害（带无敌判定 + 护盾抵消 + 永久减伤） */
  takeDamage(amount) {
    if (this._invincibleTimer > 0) return false
    // 闪避判定（进化技能「疾风步」）
    if (this.evasionChance > 0 && Math.random() < this.evasionChance) {
      console.log(`[Player] 闪避！`)
      this._invincibleTimer = this.invincibleDuration * 0.3
      return true
    }
    if (this.shields > 0) {
      this.shields--
      this._invincibleTimer = this.invincibleDuration
      console.log(`[Player] 护盾抵消！剩余护盾: ${this.shields}`)
      return true
    }
    // 应用永久减伤
    const reducedAmount = Math.max(1, Math.floor(amount * (1 - this.damageReduction)))
    this.hp = Math.max(0, this.hp - reducedAmount)
    this._invincibleTimer = this.invincibleDuration
    this._flashWhiteTimer = 0.1  // 受击闪白 100ms
    console.log(`[Player] 受到 ${reducedAmount} 点伤害（原${amount}，减伤${Math.round(this.damageReduction*100)}%）！剩余 HP: ${this.hp}`)
    return true
  }

  /**
   * 击退（由碰撞处理调用，将玩家朝反方向弹开）
   * @param {number} dirX 来自敌人的方向 X（单位向量）
   * @param {number} dirY 来自敌人的方向 Y（单位向量）
   * @param {number} [force=120] 击退力度（像素/秒速度）
   */
  knockback(dirX, dirY, force = 120) {
    this._vx = -dirX * force
    this._vy = -dirY * force
  }

  /** 增加经验值，达到上限时升级 */
  addExp(amount) {
    this.exp += amount
    this.score += amount * 5 // 每点经验额外加 5 分

    if (this.exp >= this.expToNext) {
      this.exp -= this.expToNext
      this.level++
      // 每级需要的经验递增 20%
      this.expToNext = Math.floor(this.expToNext * 1.2)
      console.log(`[Player] 升级！当前等级: ${this.level}`)

      // 触发升级回调（Vue 组件用此暂停游戏并显示菜单）
      if (this.onLevelUp) {
        this.onLevelUp(this.level)
      }

      return true // 表示升了一级
    }
    return false
  }

  /** 增加分数 */
  addScore(amount) {
    this.score += amount
  }

  /** 设置外部摇杆方向（由 VirtualJoystick 驱动） */
  setJoystick(dx, dy) {
    this._joystickDx = dx
    this._joystickDy = dy
  }

  /** 设置手柄摇杆方向（由 GamepadManager 驱动） */
  setGamepadAxes(ax, ay) {
    this._gamepadAxes[0] = ax
    this._gamepadAxes[1] = ay
  }

  /** 触发特殊技能（外部调用，例如触摸右屏或手柄 B 键） */
  triggerSkill() {
    this._skillPressed = true
  }

  /** 每帧更新（由 GameLoop 调用）*/
  update(deltaTime) {
    // 更新无敌计时器
    if (this._invincibleTimer > 0) {
      this._invincibleTimer -= deltaTime
    }
    // 更新受击闪白计时器
    if (this._flashWhiteTimer > 0) {
      this._flashWhiteTimer -= deltaTime
    }
    // 每秒回复（天赋）
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * deltaTime)
    }

    // === 计算期望输入方向（键盘 + 摇杆 + 手柄 混合） ===
    let inputX = 0
    let inputY = 0

    // 键盘输入
    if (this._keys.has('w') || this._keys.has('arrowup')) inputY -= 1
    if (this._keys.has('s') || this._keys.has('arrowdown')) inputY += 1
    if (this._keys.has('a') || this._keys.has('arrowleft')) inputX -= 1
    if (this._keys.has('d') || this._keys.has('arrowright')) inputX += 1

    // 手柄输入（优先于触屏摇杆，但键盘优先于手柄）
    if (inputX === 0 && inputY === 0) {
      if (this._gamepadAxes[0] !== 0 || this._gamepadAxes[1] !== 0) {
        inputX = this._gamepadAxes[0]
        inputY = this._gamepadAxes[1]
      }
    }

    // 触屏摇杆输入（如果摇杆活跃，并且键盘/手柄都没有输入）
    if (inputX === 0 && inputY === 0) {
      if (this._joystickDx !== 0 || this._joystickDy !== 0) {
        inputX = this._joystickDx
        inputY = this._joystickDy
      }
    }

    // 归一化输入方向（避免斜向移动更快）
    const len = Math.sqrt(inputX * inputX + inputY * inputY)
    if (len > 0) {
      inputX /= len
      inputY /= len
    }

    // === 特殊技能触发 ===
    if (this._skillPressed) {
      this._skillPressed = false
      if (this.onSkill) {
        this.onSkill()
      }
    }

    // === 惯性物理系统 ===
    // 目标速度 = 输入方向 * 最大速度
    const targetVx = inputX * this.speed
    const targetVy = inputY * this.speed

    // 向目标速度平滑插值（摩擦 + 加速度）
    const frictionFactor = Math.min(1, this._friction * deltaTime)
    this._vx += (targetVx - this._vx) * frictionFactor
    this._vy += (targetVy - this._vy) * frictionFactor

    // 应用摩擦力后的残余速度
    this.x += this._vx * deltaTime
    this.y += this._vy * deltaTime

    // === 残影 Trail 更新 ===
    const isMoving = Math.abs(this._vx) + Math.abs(this._vy) > 0.5
    if (isMoving) {
      this._trailSpawnTimer += deltaTime
      while (this._trailSpawnTimer >= this._trailSpawnInterval) {
        this._trailSpawnTimer -= this._trailSpawnInterval
        this._trailPositions.push({ x: this.x, y: this.y, age: 0 })
        if (this._trailPositions.length > this._trailMaxLength) {
          this._trailPositions.shift()
        }
      }
    }
    // 所有残影 aging
    for (let i = this._trailPositions.length - 1; i >= 0; i--) {
      this._trailPositions[i].age += deltaTime
      if (this._trailPositions[i].age >= this._trailLifetime) {
        this._trailPositions.splice(i, 1)
      }
    }

    // 遍历更新所有独立武器（各武器拥有独立冷却计时器）
    // 注意：武器实际的 update 逻辑由 useGameEngine 中的 weapons 数组驱动，
    // 但 Player 的 weapons 数组用于保持引用一致。
  }

  /** 在 Canvas 上绘制玩家（使用 SpriteCache 离屏缓存像素画，血条每帧画） */
  draw(ctx) {
    ctx.save()

    // 无敌闪烁效果（每 200ms 闪烁一次）
    const isInvincibleBlink = this._invincibleTimer > 0 && Math.floor(this._invincibleTimer * 1000) % 200 < 100

    // 玩家像素画身体（使用离屏缓存，像素画已包含眼睛/脸/铠甲/剑/披风）
    SpriteCache.drawPlayer(ctx, this.x, this.y, isInvincibleBlink)

    // 受击闪白覆盖
    if (this._flashWhiteTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, this._flashWhiteTimer * 7)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // === 残影 Trail 绘制（半透明，在本体之后） ===
    for (let i = 0; i < this._trailPositions.length - 2; i++) {
      const t = this._trailPositions[i]
      const alpha = Math.max(0, 1 - t.age / this._trailLifetime) * 0.3
      ctx.save()
      ctx.globalAlpha = alpha
      SpriteCache.drawPlayer(ctx, t.x, t.y, false)
      ctx.restore()
    }

    // HP 血条（画在头顶）
    this._drawHpBar(ctx)

    ctx.restore()
  }

  /** 绘制 HP 血条 */
  _drawHpBar(ctx) {
    const SPRITE_HALF = 32 // 像素画 64×64，半高 = 32
    // ★ 像素画角色只占 64×64 画布的左上 1/4 区域（0~31px），
    //    SpriteCache 以 cx=32,cy=32 居中绘制在 (this.x, this.y)，
    //    所以角色视觉中心在 (this.x - 16, this.y - 16)
    const VISUAL_SHIFT = 16
    const barWidth = 44
    const barHeight = 5
    const barX = this.x - VISUAL_SHIFT - barWidth / 2  // 以角色视觉中心居中
    const barY = this.y - SPRITE_HALF - 8               // 精灵头顶上方 8px
    const hpRatio = this.hp / this.maxHp

    // HP 条背景（半透明黑）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // 血量颜色
    let hpColor
    if (hpRatio > 0.6) hpColor = '#2ecc71'
    else if (hpRatio > 0.3) hpColor = '#f1c40f'
    else hpColor = '#e74c3c'

    ctx.fillStyle = hpColor
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight)
  }

  /** 更新画布尺寸（窗口 resize 时调用） */
  resize(canvasWidth, canvasHeight) {
    // 按比例调整玩家位置
    this.x = (this.x / this.canvasWidth) * canvasWidth
    this.y = (this.y / this.canvasHeight) * canvasHeight
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
  }

  /** 销毁，移除事件监听 */
  destroy() {
    this._unbindInput()
    this._keys.clear()
  }
}
