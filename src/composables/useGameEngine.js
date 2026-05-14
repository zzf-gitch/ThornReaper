/**
 * useGameEngine — 游戏引擎核心逻辑
 *
 * 封装所有游戏对象、碰撞检测、生成/发射、状态切换、更新/渲染循环。
 * GameCanvas.vue 只需调用 setupGameEngine() 获取函数引用即可。
 */
import { GameLoop } from '../game/GameLoop.js'
import { Player } from '../game/Player.js'
import { Enemy } from '../game/Enemy.js'
import { ExperienceOrb, createHealOrb } from '../game/ExperienceOrb.js'
import { HitFlash } from '../game/HitFlash.js'
import { DamageNumber } from '../game/DamageNumber.js'
import { audioManager } from '../game/AudioManager.js'
import { SpriteCache } from '../game/SpriteCache.js'
import { BulletPool } from '../game/BulletPool.js'
import { spawnDeathParticles } from '../game/DeathParticle.js'
import { AssetLoader } from '../game/AssetLoader.js'
import { Camera } from '../game/Camera.js'
import { PersistenceManager } from '../game/PersistenceManager.js'
import { SkillSynergy } from '../game/SkillSynergy.js'
import { Background } from '../game/Background.js'
import { EnemyBullet } from '../game/EnemyBullet.js'
import { VirtualJoystick } from '../game/VirtualJoystick.js'
import { GamepadManager } from '../game/GamepadManager.js'
import { ALL_SKILLS, SKILL_EVOLUTIONS, rollSkillOptions } from '../game/SkillDefs.js'
import { BoomerangWeapon } from '../game/BoomerangWeapon.js'
import { LightningWeapon } from '../game/LightningWeapon.js'
import { MineWeapon } from '../game/MineWeapon.js'
import { AutoPistolWeapon } from '../game/AutoPistolWeapon.js'
import { OrbitSwordWeapon } from '../game/OrbitSwordWeapon.js'
import { RandomLightningWeapon } from '../game/RandomLightningWeapon.js'
import { DestructibleObject, DESTRUCTIBLE_TYPES } from '../game/DestructibleObject.js'
import { WaveManager } from '../game/WaveManager.js'
import { DESTRUCTIBLE_CONFIG } from '../game/GameConfig.js'
import {
  gameState, assetsLoaded, loadProgress,
  level, exp, expToNext, score, killCount, acquiredSkills,
  showLevelUpMenu, currentSkillOptions, gameTime,
  showTalentPanel, gold, totalKills, talentLevels, goldEarned,
  highScore, bestKills, bestTime, newRecordKills, newRecordTime,
  debugMode, jActive, jDisplayX, jDisplayY, jThumbX, jThumbY, jSkillShow,
  jPersistentVisible, isTouchDevice,
  gamepadConnected, shaking, shakeDuration, gameTimeFormatted, expPercent,
  refreshPersistenceUI, saveHighScore, loadDebugMode, toggleDebugMode,
  formatSeconds
} from './useGameState.js'

// ===== 常量 =====
const LOGIC_WIDTH = 1600
const LOGIC_HEIGHT = 900
const GAME_ACTIVE_KEY = 'mowing_survivor_active'
const SAVE_KEY = 'mowing_survivor_save'
const BG_REDRAW_THRESHOLD = 5

// 爆发技能（雷霆风暴）冷却时间
const SKILL_COOLDOWN_SECONDS = 10

// ===== 难度曲线常量 =====
const BASE_SPAWN_INTERVAL = 1.0
const MIN_SPAWN_INTERVAL = 0.25
const SPAWN_DECAY_RATE = 0.012
const BASE_ENEMY_HP = 1
const HP_GROWTH_RATE = 0.2
const ENEMY_SPEED_BASE = 100
const ENEMY_SPEED_GROWTH = 5
const ENEMY_DAMAGE_BASE = 8
const ENEMY_DAMAGE_GROWTH = 5  // 每分钟 +5 伤害

// ===== 内部可变状态（非响应式，游戏循环专用） =====
/** @type {CanvasRenderingContext2D} */
let bgCtx = null
/** @type {CanvasRenderingContext2D} */
let entityCtx = null
/** @type {Player} */
let player = null
/** @type {GameLoop} */
let gameLoop = null
/** @type {Enemy[]} */
let enemies = []
/** @type {BulletPool} */
let bulletPool = null
/** @type {Camera} */
let camera = null
/** @type {Background} */
let background = null
/** @type {ExperienceOrb[]} */
let orbs = []
/** @type {HitFlash[]} */
let hitFlashes = []
/** @type {DamageNumber[]} */
let damageNumbers = []
/** @type {import('../game/DeathParticle.js').DeathParticle[]} */
let deathParticles = []
/** @type {EnemyBullet[]} */
let enemyBullets = []
/** @type {import('../game/WeaponBase.js').WeaponBase[]} */
let weapons = []

// 计时器
let enemySpawnTimer = 0
let bulletFireTimer = 0
let hitstopTimer = 0
let _syncUITimer = 0
let shakeTimer = 0
let _saveThrottleTimer = 0
let _skillCooldownTimer = 0  // 爆发技能冷却倒计时（秒）
/** @type {{x1:number,y1:number,x2:number,y2:number,timer:number}[]} */
let _skillLightningArcs = []  // 雷霆风暴闪电弧线绘制数据
let _lastBgCamX = undefined
let _lastBgCamY = undefined
let _bossSpawned300 = false   // 第 5 分钟 Boss（300 秒）
let _bossSpawned600 = false   // 第 10 分钟 Boss（600 秒）

// 可破坏物
/** @type {DestructibleObject[]} */
let destructibles = []
let destructibleSpawnTimer = 0

// 波次管理器
let waveManager = null
let _currentTideInfo = null
let _tideMessageTimer = 0

// 调试
let debugInvincible = false
let debugFastLevel = false
let _debugKeySeq = ''
const DEBUG_UNLOCK_SEQ = 'debug'

// Canvas 尺寸
let canvasWidth = LOGIC_WIDTH
let canvasHeight = LOGIC_HEIGHT

// Canvas refs（由 setupGameEngine 注入）
let bgCanvasRef = null
let entityCanvasRef = null
let viewportRef = null

// ===== 摇杆 =====
const joystick = new VirtualJoystick()

// ===== 手柄 =====
const gamepadManager = new GamepadManager()

// ===== 工具函数 =====
function _delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function wasGameActive() {
  try { return localStorage.getItem(GAME_ACTIVE_KEY) === 'true' }
  catch { return false }
}

export function clearGameActive() {
  try { localStorage.removeItem(GAME_ACTIVE_KEY) } catch {}
}

function setGameActive(active) {
  try {
    if (active) localStorage.setItem(GAME_ACTIVE_KEY, 'true')
    else localStorage.removeItem(GAME_ACTIVE_KEY)
  } catch { /* ignore */ }
}

// ===== 难度曲线 =====
export function getSpawnInterval(gameSeconds) {
  const interval = BASE_SPAWN_INTERVAL - gameSeconds * SPAWN_DECAY_RATE
  return Math.max(MIN_SPAWN_INTERVAL, interval)
}

export function getEnemyHp(gameSeconds) {
  const minutes = gameSeconds / 60
  return Math.floor(BASE_ENEMY_HP * (1 + minutes * 0.2))
}

export function getEnemySpeed(gameSeconds) {
  const minutes = gameSeconds / 60
  return ENEMY_SPEED_BASE + Math.floor(minutes * ENEMY_SPEED_GROWTH) + Math.random() * 50
}

export function getEnemyDamage(gameSeconds) {
  // 基础伤害 8，每分钟 +5，前 60 秒为最低伤害区间
  const minutes = gameSeconds / 60
  return ENEMY_DAMAGE_BASE + Math.floor(Math.max(0, minutes - 0.5) * ENEMY_DAMAGE_GROWTH)
}

// ===== 资源预加载 =====
async function loadAssets() {
  const steps = [
    { label: '初始化音效引擎', weight: 20 },
    { label: '配置画布', weight: 15 },
    { label: '加载精灵图资源', weight: 50 },
    { label: '初始化游戏核心', weight: 15 },
  ]
  const totalWeight = steps.reduce((s, st) => s + st.weight, 0)
  let done = 0

  audioManager.init()
  done += steps[0].weight
  loadProgress.value = Math.round((done / totalWeight) * 100)
  await _delay(50)

  done += steps[1].weight
  loadProgress.value = Math.round((done / totalWeight) * 100)
  await _delay(50)

  await AssetLoader.loadAll((loaded, total) => {
    loadProgress.value = Math.round(((done + (loaded / total) * steps[2].weight) / totalWeight) * 100)
  })
  done += steps[2].weight
  loadProgress.value = Math.round((done / totalWeight) * 100)
  await _delay(50)

  done += steps[3].weight
  loadProgress.value = Math.round((done / totalWeight) * 100)
  await _delay(50)

  assetsLoaded.value = true
}

// ===== 响应式同步 =====
function syncPlayerStats() {
  level.value = player.level
  exp.value = player.exp
  expToNext.value = player.expToNext
  score.value = player.score
  killCount.value = player.kills
  acquiredSkills.value = [...player.acquiredSkills]
}

function triggerShake(duration = 0.15) {
  shaking.value = true
  shakeTimer = duration
  shakeDuration.value = duration
}

// ===== Canvas 尺寸计算 =====
export function resizeCanvas() {
  const viewport = viewportRef.value
  if (!viewport) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const windowW = window.innerWidth
  const windowH = window.innerHeight

  viewport.style.width = windowW + 'px'
  viewport.style.height = windowH + 'px'

  canvasWidth = LOGIC_WIDTH
  canvasHeight = LOGIC_HEIGHT

  const bgCanvas = bgCanvasRef.value
  if (bgCanvas) {
    bgCanvas.width = windowW * dpr
    bgCanvas.height = windowH * dpr
    bgCanvas.style.width = windowW + 'px'
    bgCanvas.style.height = windowH + 'px'
  }

  const eCanvas = entityCanvasRef.value
  if (!eCanvas) return
  eCanvas.width = windowW * dpr
  eCanvas.height = windowH * dpr
  eCanvas.style.width = windowW + 'px'
  eCanvas.style.height = windowH + 'px'

  const scaleX = windowW / LOGIC_WIDTH
  const scaleY = windowH / LOGIC_HEIGHT
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (windowW - LOGIC_WIDTH * scale) / 2
  const offsetY = (windowH - LOGIC_HEIGHT * scale) / 2

  if (bgCtx) {
    bgCtx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY)
  }
  if (entityCtx) {
    entityCtx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY)
  }

  _lastBgCamX = undefined
  _lastBgCamY = undefined

  if (player) player.resize(LOGIC_WIDTH, LOGIC_HEIGHT)
}

// ===== 存档 =====
function saveGameState() {
  try {
    const data = {
      level: level.value, exp: exp.value, expToNext: expToNext.value,
      score: score.value, killCount: killCount.value, gameTime: gameTime.value,
      acquiredSkills: acquiredSkills.value,
      playerHp: player?.hp ?? 100, playerMaxHp: player?.maxHp ?? 100,
      playerSpeed: player?.speed ?? 1, playerBulletSpeed: player?.bulletSpeed ?? 1,
      playerBulletCount: player?.bulletCount ?? 1,
      bulletDamage: player?.bulletDamage ?? 1,
      bulletPenetration: player?.bulletPenetration ?? 1,
      bulletExplosion: player?.bulletExplosion ?? 0,
      bulletSize: player?.bulletSize ?? 5,
      bulletFireRate: player?.bulletFireRate ?? 1.0,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw || !player) return false
    const data = JSON.parse(raw)
    level.value = data.level; exp.value = data.exp; expToNext.value = data.expToNext
    score.value = data.score; killCount.value = data.killCount; gameTime.value = data.gameTime
    acquiredSkills.value = data.acquiredSkills
    player.hp = data.playerHp; player.maxHp = data.playerMaxHp
    player.speed = data.speed ?? 1
    player.bulletSpeed = data.playerBulletSpeed; player.bulletCount = data.playerBulletCount
    player.bulletDamage = data.bulletDamage ?? 1
    player.bulletPenetration = data.bulletPenetration ?? 1
    player.bulletExplosion = data.bulletExplosion ?? 0
    player.bulletSize = data.bulletSize ?? 5
    player.bulletFireRate = data.bulletFireRate ?? 1.0
    player.bulletFireInterval = 0.5 / player.bulletFireRate
    return true
  } catch { return false }
}

function clearGameSave() {
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

// ===== 游戏逻辑 =====

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4)
  let x, y
  const margin = 20
  const cx = camera ? camera.x : 0
  const cy = camera ? camera.y : 0
  switch (edge) {
    case 0: x = cx + Math.random() * canvasWidth; y = cy - margin; break
    case 1: x = cx + Math.random() * canvasWidth; y = cy + canvasHeight + margin; break
    case 2: x = cx - margin; y = cy + Math.random() * canvasHeight; break
    case 3: x = cx + canvasWidth + margin; y = cy + Math.random() * canvasHeight; break
  }
  const speed = getEnemySpeed(gameTime.value)
  const hp = getEnemyHp(gameTime.value)

  // 每波固定 20% 概率生成自爆怪
  if (Math.random() < 0.20) {
    const type = gameTime.value < 30 ? 'suicider' : 'suicide_bug'
    enemies.push(new Enemy(x, y, speed, hp, type))
    return
  }

  let type = 'chaser'
  const t = gameTime.value
  const r = Math.random()
  if (t < 30) {
    if (r < 0.75) type = 'chaser'
    else if (r < 0.90) type = 'charger'
    else type = 'shield'
  } else if (t < 60) {
    if (r < 0.35) type = 'chaser'
    else if (r < 0.55) type = 'charger'
    else if (r < 0.75) type = 'ranger'
    else type = 'shield'
  } else if (t < 120) {
    if (r < 0.25) type = 'chaser'
    else if (r < 0.40) type = 'charger'
    else if (r < 0.55) type = 'ranger'
    else if (r < 0.70) type = 'shield'
    else type = 'elite_ranger'
  } else {
    if (r < 0.20) type = 'chaser'
    else if (r < 0.35) type = 'charger'
    else if (r < 0.50) type = 'ranger'
    else if (r < 0.65) type = 'shield'
    else type = 'elite_ranger'
  }

  enemies.push(new Enemy(x, y, speed, hp, type))
}

/**
 * 在地图上随机生成一个可破坏物（远离玩家一定距离）
 */
function spawnDestructible() {
  if (!camera || destructibles.length >= DESTRUCTIBLE_CONFIG.maxDestructibles) return

  const cx = camera.x + canvasWidth / 2
  const cy = camera.y + canvasHeight / 2
  const minDist = DESTRUCTIBLE_CONFIG.spawnRadiusMin
  const maxDist = DESTRUCTIBLE_CONFIG.spawnRadiusMax

  // 在玩家周围环形区域随机选点
  const angle = Math.random() * Math.PI * 2
  const dist = minDist + Math.random() * (maxDist - minDist)
  const x = cx + Math.cos(angle) * dist
  const y = cy + Math.sin(angle) * dist

  // 根据权重选择类型
  const weights = DESTRUCTIBLE_CONFIG.typeWeights
  const roll = Math.random()
  let cumulative = 0
  let chosenType = 'barrel'
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight
    if (roll < cumulative) { chosenType = type; break }
  }

  destructibles.push(new DestructibleObject(x, y, chosenType))
}

/**
 * 潮汐事件专用：生成指定类型的敌人（不经过随机类型选择）
 */
function spawnEnemyOfType(type, overrideSpeed, overrideHp) {
  const edge = Math.floor(Math.random() * 4)
  let x, y
  const margin = 20
  const cx = camera ? camera.x : 0
  const cy = camera ? camera.y : 0
  switch (edge) {
    case 0: x = cx + Math.random() * canvasWidth; y = cy - margin; break
    case 1: x = cx + Math.random() * canvasWidth; y = cy + canvasHeight + margin; break
    case 2: x = cx - margin; y = cy + Math.random() * canvasHeight; break
    case 3: x = cx + canvasWidth + margin; y = cy + Math.random() * canvasHeight; break
  }
  const speed = overrideSpeed || getEnemySpeed(gameTime.value)
  const hp = overrideHp || getEnemyHp(gameTime.value)
  enemies.push(new Enemy(x, y, speed, hp, type))
}

/**
 * 查找最近的敌人，如果不存在敌人则查找最近的可破坏物
 * 这样玩家可以自动攻击木桶/箱子/矿石
 */
function findNearestTarget() {
  // 优先攻击敌人
  if (enemies.length > 0) {
    let nearest = null, minDist = Infinity
    for (const e of enemies) {
      const dx = e.x - player.x, dy = e.y - player.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) { minDist = dist; nearest = e }
    }
    if (nearest) return { type: 'enemy', ref: nearest }
  }
  // 没有敌人时攻击可破坏物
  if (destructibles.length > 0) {
    let nearest = null, minDist = Infinity
    for (const d of destructibles) {
      if (d._broken) continue  // 已破碎的不可攻击
      const dx = d.x - player.x, dy = d.y - player.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) { minDist = dist; nearest = d }
    }
    if (nearest) return { type: 'destructible', ref: nearest }
  }
  return null
}

function fireBullet() {
  const target = findNearestTarget()
  if (!target) return
  const targetX = target.ref.x
  const targetY = target.ref.y
  const count = player.bulletCount
  for (let i = 0; i < count; i++) {
    const offsetAngle = count > 1 ? (i - (count - 1) / 2) * 0.15 : 0
    const dx = targetX - player.x, dy = targetY - player.y
    const angle = Math.atan2(dy, dx) + offsetAngle
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)
    bulletPool.allocate(
      player.x, player.y, dirX, dirY, player.bulletSpeed,
      player.bulletPenetration, player.bulletSize
    )
  }
  audioManager.playShoot()
}

// ===== 碰撞检测 =====

function rectCollision(r1, r2) {
  return r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top
}

function circleRectCollision(cx, cy, radius, rect) {
  const cx2 = Math.max(rect.left, Math.min(cx, rect.right))
  const cy2 = Math.max(rect.top, Math.min(cy, rect.bottom))
  return (cx - cx2) ** 2 + (cy - cy2) ** 2 < radius * radius
}

function checkOrbPickup() {
  const pickupRange = (player.pickupRangeMultiplier || 1.0)
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i], dx = player.x - o.x, dy = player.y - o.y
    const effectiveRadius = o.pickupRadius * pickupRange
    if (dx * dx + dy * dy < effectiveRadius * effectiveRadius) {
      if (o.isHeal) {
        // 回血球 — 恢复 HP（受药水强化倍率影响）
        const healAmount = Math.floor(o.value * (player.healOrbMultiplier || 1.0))
        player.hp = Math.min(player.maxHp, player.hp + healAmount)
        damageNumbers.push(new DamageNumber(player.x, player.y - 30, `+${healAmount} HP`, '#2ecc71', 20))
      } else {
        // 经验球
        player.addExp(o.value)
      }
      audioManager.playPickup()
      orbs.splice(i, 1)
    }
  }
}

function checkBulletEnemyCollisions() {
  let hitAny = false
  const bulletDamage = player.bulletDamage
  const bulletExplosion = player.bulletExplosion

  bulletPool.forEach((bullet) => {
    const bulletRect = {
      left: bullet.x - bullet.radius, right: bullet.x + bullet.radius,
      top: bullet.y - bullet.radius, bottom: bullet.y + bullet.radius,
    }
    for (let e = enemies.length - 1; e >= 0; e--) {
      const enemy = enemies[e]

      // 盾牌兵 — 正面 90° 免疫子弹
      if (enemy.type === 'shield') {
        const dx = bullet.x - enemy.x, dy = bullet.y - enemy.y
        const bDist = Math.sqrt(dx * dx + dy * dy)
        if (bDist > 0.5) {
          const bDirX = dx / bDist, bDirY = dy / bDist
          const dot = bDirX * enemy.shieldDir.x + bDirY * enemy.shieldDir.y
          // 子弹从正面来（dot > cos45°）→ 被盾牌挡住
          if (dot > Math.cos(enemy.shieldFrontAngle / 2)) continue
        }
      }

      if (rectCollision(bulletRect, enemy.getBounds())) {
        const hitX = (bullet.x + enemy.x) / 2
        const hitY = (bullet.y + enemy.y) / 2

        enemy.knockback(bullet.dirX, bullet.dirY, 8)
        hitFlashes.push(new HitFlash(enemy.x, enemy.y, enemy.size))
        audioManager.playHit()
        hitAny = true

        const dead = enemy.takeDamage(bulletDamage)
        damageNumbers.push(new DamageNumber(hitX, hitY, `-${bulletDamage}`, '#ff6b6b', 10))

        // 生命偷取：按造成伤害百分比回血（含低血量额外加成）
        if (player.lifestealPercent > 0) {
          let effectiveLifesteal = player.lifestealPercent
          if (player._lowHpLifestealBonus && player.hp / player.maxHp < 0.3) {
            effectiveLifesteal += player._lowHpLifestealBonus
          }
          const healAmount = Math.max(1, Math.floor(bulletDamage * effectiveLifesteal))
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          damageNumbers.push(new DamageNumber(hitX, hitY - 15, `+${healAmount}`, '#ff6b6b', 12))
        }

        SkillSynergy.onBulletHit(
          { x: bullet.x, y: bullet.y, dirX: bullet.dirX, dirY: bullet.dirY, penetration: bullet.penetration, radius: bullet.radius },
          enemy, player,
          { hitX, hitY, hitFlashes, damageNumbers, enemies, HitFlash, DamageNumber }
        )

        // ★ 立即更新穿透计数（避免 forEach 快照中批处理导致的无限穿透 bug）
        const penLeft = bullet.penetration - 1
        if (penLeft > 0) {
          bulletPool.setPenetration(bullet.index, penLeft)
        } else {
          bulletPool.deallocate(bullet.index)
        }

        if (dead) {
          player.kills++
          audioManager.playExplosion()
          damageNumbers.push(new DamageNumber(enemy.x, enemy.y - 10, '💥', '#f1c40f'))
          deathParticles.push(...spawnDeathParticles(enemy.x, enemy.y, enemy.color))
          spawnEnemyDrops(enemy.x, enemy.y)
          SkillSynergy.onEnemyKill(enemy, player, { hitX, hitY })

          // Boss 死亡 — 掉落超级宝箱：全武器升一级
          if (enemy.isBoss) {
            for (const w of weapons) {
              w.upgrade()
            }
            // 额外经验和金币
            player.addExp(500)
            damageNumbers.push(new DamageNumber(enemy.x, enemy.y - 50, '🌟 超级宝箱！全武器升级！', '#FFD700'))
            // Boss 死亡大爆炸特效
            for (let pi = 0; pi < 5; pi++) {
              const angle = (Math.PI * 2 / 5) * pi
              const bx = enemy.x + Math.cos(angle) * 40
              const by = enemy.y + Math.sin(angle) * 40
              deathParticles.push(...spawnDeathParticles(bx, by, '#FFD700', 8))
            }
            triggerShake(0.4)
            audioManager.playExplosion()
          }

          if (bulletExplosion > 0) {
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
              if (ei === e) continue
              const other = enemies[ei]
              const dx = other.x - enemy.x, dy = other.y - enemy.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < bulletExplosion) {
                const splashDmg = Math.ceil(bulletDamage * 0.5)
                const dead2 = other.takeDamage(splashDmg)
                damageNumbers.push(new DamageNumber(other.x, other.y - 5, `-${splashDmg}`, '#e67e22', 10))
                hitFlashes.push(new HitFlash(other.x, other.y, other.size))
                if (dead2) {
                  player.kills++
                  audioManager.playExplosion()
                  damageNumbers.push(new DamageNumber(other.x, other.y - 10, '💥', '#f1c40f'))
                  deathParticles.push(...spawnDeathParticles(other.x, other.y, other.color))
                  spawnEnemyDrops(other.x, other.y)
                  enemies.splice(ei, 1)
                  if (ei < e) e--
                }
              }
            }
          }

          enemies.splice(e, 1)
        }

        if (penLeft <= 0) break // 穿透耗尽，跳出敌人循环
      }
    }
  })

  if (hitAny) hitstopTimer = 0.03
}

function checkEnemyPlayerCollisions() {
  const contactDmg = getEnemyDamage(gameTime.value)
  for (let e = enemies.length - 1; e >= 0; e--) {
    const enemy = enemies[e]
    if (circleRectCollision(player.x, player.y, player.radius, enemy.getBounds())) {
      const dmg = player.takeDamage(contactDmg)
      if (dmg) {
        triggerShake(0.15)
        audioManager.playHurt()
        damageNumbers.push(new DamageNumber(player.x, player.y - 20, `-${contactDmg}`, '#e74c3c', 15))
        // 击退玩家（朝远离敌人的方向）
        const dx = player.x - enemy.x
        const dy = player.y - enemy.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        player.knockback(dx / dist, dy / dist, 150)
      }
      enemies.splice(e, 1)
      if (player.hp <= 0) gameOver()
    }
  }
}

/**
 * 子弹 vs 可破坏物碰撞检测
 */
function checkBulletDestructibleCollisions() {
  const toDeallocate = []
  const bulletDamage = player.bulletDamage

  bulletPool.forEach((bullet) => {
    const bulletRect = {
      left: bullet.x - bullet.radius, right: bullet.x + bullet.radius,
      top: bullet.y - bullet.radius, bottom: bullet.y + bullet.radius,
    }
    for (let d = destructibles.length - 1; d >= 0; d--) {
      const dest = destructibles[d]
      if (dest.destroyed) continue

      // 可破坏物矩形碰撞
      const destRect = {
        left: dest.x - dest.size, right: dest.x + dest.size,
        top: dest.y - dest.size, bottom: dest.y + dest.size,
      }
      if (rectCollision(bulletRect, destRect)) {
        const destroyed = dest.takeDamage(bulletDamage)
        hitFlashes.push(new HitFlash(dest.x, dest.y, dest.size))
        audioManager.playHit()
        toDeallocate.push({ index: bullet.index, dealloc: true })

        if (destroyed) {
          // 破碎特效
          deathParticles.push(...spawnDeathParticles(dest.x, dest.y, dest.color, 6))
          // 掉落的回调引用
          dest.spawnDrops({
            DamageNumber,
            damageNumbers,
            player,
            orbs,
            enemies,
            deathParticles,
            audioManager,
            spawnDeathParticles,
            enemyDrops: spawnEnemyDrops,
            onGoldDrop: (amount) => {
              PersistenceManager.addGold(amount * DESTRUCTIBLE_CONFIG.goldPerDrop)
              damageNumbers.push(new DamageNumber(dest.x, dest.y - 25, `💰 +${amount}`, '#FFD700'))
            },
          })
        }
        break // 一个子弹只能打一个可破坏物
      }
    }
  })

  for (const item of toDeallocate) {
    if (item.dealloc) bulletPool.deallocate(item.index)
  }
}

function checkEnemyBulletPlayerCollisions() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i]
    const dx = player.x - b.x
    const dy = player.y - b.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < player.radius + b.radius) {
      const dmg = player.takeDamage(b.damage)
      if (dmg) {
        triggerShake(0.1)
        audioManager.playHurt()
        damageNumbers.push(new DamageNumber(player.x, player.y - 20, `-${b.damage}`, '#e74c3c', 15))
        // 子弹击退（方向来自子弹入射方向，力度较小）
        if (dist > 0.5) player.knockback(dx / dist, dy / dist, 80)
      }
      if (player.hp <= 0) gameOver()
      enemyBullets.splice(i, 1)
    }
  }
}

function handleLevelUp() {
  currentSkillOptions.value = rollSkillOptions(player.acquiredSkills, player.weapons || [])
  showLevelUpMenu.value = true
  syncPlayerStats()
}

// ===== 对象清理 =====
function cleanupObjects() {
  for (let i = 0; i < bulletPool.size; i++) {
    if (bulletPool.isOutOfBounds(i)) bulletPool.deallocate(i)
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    const margin = 300
    const cx = camera ? camera.x : 0
    const cy = camera ? camera.y : 0
    if (e.x < cx - margin || e.x > cx + canvasWidth + margin ||
        e.y < cy - margin || e.y > cy + canvasHeight + margin) {
      enemies.splice(i, 1)
    }
  }
  for (let i = hitFlashes.length - 1; i >= 0; i--) {
    if (!hitFlashes[i].alive) hitFlashes.splice(i, 1)
  }
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    if (!damageNumbers[i].alive) damageNumbers.splice(i, 1)
  }
  for (let i = deathParticles.length - 1; i >= 0; i--) {
    if (!deathParticles[i].alive) deathParticles.splice(i, 1)
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i]
    const margin = 500
    const cx = camera ? camera.x : 0
    const cy = camera ? camera.y : 0
    if (b.x < cx - margin || b.x > cx + canvasWidth + margin ||
        b.y < cy - margin || b.y > cy + canvasHeight + margin) {
      enemyBullets.splice(i, 1)
    }
  }
  const MAX_ENEMIES = 200
  if (enemies.length > MAX_ENEMIES) enemies.splice(MAX_ENEMIES)
  const MAX_ORBS = 200
  if (orbs.length > MAX_ORBS) orbs.splice(MAX_ORBS)
  const MAX_DMG_NUMBERS = 60
  if (damageNumbers.length > MAX_DMG_NUMBERS) damageNumbers.splice(MAX_DMG_NUMBERS)
  const MAX_DEATH_PARTICLES = 100
  if (deathParticles.length > MAX_DEATH_PARTICLES) deathParticles.splice(MAX_DEATH_PARTICLES)

  // 清理超出范围的可破坏物
  for (let i = destructibles.length - 1; i >= 0; i--) {
    const d = destructibles[i]
    const margin = 400
    const cx = camera ? camera.x : 0
    const cy = camera ? camera.y : 0
    if ((d.destroyed && d._breakTimer <= 0) ||
        d.x < cx - margin || d.x > cx + canvasWidth + margin ||
        d.y < cy - margin || d.y > cy + canvasHeight + margin) {
      destructibles.splice(i, 1)
    }
  }
}

// ===== 游戏状态切换 =====

export function startGame() {
  _goldAlreadySaved = false  // 重置重复结算保护
  resizeCanvas()
  audioManager.init()
  // 销毁旧玩家，防止重复键盘监听器堆积
  if (player) player.destroy()
  player = new Player(canvasWidth, canvasHeight)
  player._bindInput()  // 显式绑定键盘监听
  player.onLevelUp = handleLevelUp
  player.onSkill = () => {
    // 冷却检查
    if (_skillCooldownTimer > 0) return
    _skillCooldownTimer = SKILL_COOLDOWN_SECONDS

    audioManager.playLevelUp()
    // 雷霆风暴：12 道闪电随机分布在玩家周围
    const stormRadius = 250
    const boltCount = 12
    /** @type {{x:number,y:number}[]} */
    const boltPositions = []
    for (let i = 0; i < boltCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 50 + Math.random() * stormRadius
      const bx = player.x + Math.cos(angle) * dist
      const by = player.y + Math.sin(angle) * dist
      boltPositions.push({ x: bx, y: by })

      // 每道雷霆发射 3 颗高穿透子弹
      for (let j = 0; j < 3; j++) {
        const spread = (Math.random() - 0.5) * 0.6
        const dx = Math.cos(angle + spread)
        const dy = Math.sin(angle + spread)
        bulletPool.allocate(bx, by, dx, dy, 800, 5, 8)
      }
      // 对范围内敌人直接造成伤害
      for (const e of enemies) {
        const ex = e.x - bx
        const ey = e.y - by
        if (ex * ex + ey * ey < 120 * 120) {
          e.takeDamage(8)
          e.knockback(ex, ey, 200)
        }
      }
    }

    // ===== 生成闪电弧线视觉特效 =====
    // 1) 从玩家到每个落雷点的主闪电链
    for (const bp of boltPositions) {
      _skillLightningArcs.push({
        x1: player.x, y1: player.y,
        x2: bp.x, y2: bp.y,
        timer: 0.5,
      })
    }
    // 2) 相邻落雷点之间的分支闪电
    for (let i = 0; i < boltPositions.length - 1; i++) {
      const dx = boltPositions[i + 1].x - boltPositions[i].x
      const dy = boltPositions[i + 1].y - boltPositions[i].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 200) {
        _skillLightningArcs.push({
          x1: boltPositions[i].x, y1: boltPositions[i].y,
          x2: boltPositions[i + 1].x, y2: boltPositions[i + 1].y,
          timer: 0.3,
        })
      }
    }
  }

  // 应用天赋
  PersistenceManager.applyTalents(player)

  // 重置游戏状态
  gameTime.value = 0
  level.value = 1; exp.value = 0; expToNext.value = 100
  score.value = 0; killCount.value = 0
  acquiredSkills.value = []
  newRecordKills.value = false
  newRecordTime.value = false
  enemies = []; orbs = []; hitFlashes = []; damageNumbers = []; deathParticles = []; enemyBullets = []
  _skillLightningArcs = []
  weapons = []
  destructibles = []; destructibleSpawnTimer = 0
  player.weapons = []
  // 重置协同效果系统（清除残留的火焰池/闪电链等视觉效果）
  SkillSynergy.reset()
  enemySpawnTimer = 0; bulletFireTimer = 0; hitstopTimer = 0; shakeTimer = 0; _syncUITimer = 0
  _bossSpawned300 = false   // 第 5 分钟 Boss（300 秒）
  _bossSpawned600 = false   // 第 10 分钟 Boss（600 秒）
  _lastBgCamX = undefined; _lastBgCamY = undefined
  _saveThrottleTimer = 0
  _currentTideInfo = null; _tideMessageTimer = 0

  // 初始化波次管理器
  waveManager = new WaveManager()

  camera = new Camera(canvasWidth, canvasHeight, 6, 0.08)
  camera.snapTo(player.x, player.y)
  background = new Background(canvasWidth, canvasHeight, 4)

  bulletPool = new BulletPool(300)
  gameState.value = 'playing'
  setGameActive(true)
  gameLoop.start()
  syncPlayerStats()
}

/** 保存当前游戏进度（分数/击杀/金币），供中途退出复用 */
let _goldAlreadySaved = false  // 防止 gameOver 后 exitToMenu 重复结算
export function saveRunProgress() {
  if (!player) return
  saveHighScore(player.score)
  // 应用 goldMultiplier（来自「理财专家」天赋）
  const baseGold = Math.floor(player.score / 100) + player.kills
  const earnedGold = Math.floor(baseGold * (player.goldMultiplier || 1))
  if (!_goldAlreadySaved) {
    PersistenceManager.addGold(earnedGold)
    PersistenceManager.addKills(player.kills)
    _goldAlreadySaved = true
  }
  goldEarned.value = earnedGold
  PersistenceManager.updateBestKills(player.kills)
  const seconds = Math.floor(gameTime.value)
  PersistenceManager.updateBestTime(seconds)
  if (seconds > bestTime.value) newRecordTime.value = true
  if (player.kills > bestKills.value) newRecordKills.value = true
  refreshPersistenceUI()
}

export function gameOver() {
  saveRunProgress()
  gameState.value = 'gameOver'
  setGameActive(false)
  clearGameSave()
  gameLoop.stop()
  player?.destroy()
}

export function pauseGame() {
  if (gameState.value === 'playing') {
    gameState.value = 'paused'
    saveGameState()
    // 停止游戏循环（停止 rAF，冻结所有逻辑和渲染）
    gameLoop?.pause()
    // 暂停音频上下文（静音，节省 CPU）
    audioManager.suspend()
  }
}

export function resumeGame() {
  if (gameState.value === 'paused') {
    gameState.value = 'playing'
    // 恢复游戏循环（重置 _lastTime 防止 deltaTime 跳跃）
    gameLoop?.resume()
    // 恢复音频上下文
    audioManager.resume()
  }
}

/**
 * 根据游戏时间计算回血球掉落概率
 * 时间越久，掉落高级奖励的概率越高
 */
function getHealDropChance() {
  const t = gameTime.value
  // 基础 5%，每过 60 秒 +2%，上限 20%
  return Math.min(0.20, 0.05 + t / 60 * 0.02)
}

/**
 * 根据游戏时间计算高级奖励掉落概率
 * 随难度递增，给玩家通关希望
 */
function getPremiumDropChance() {
  const t = gameTime.value
  // 基础 2%，每过 60 秒 +1.5%，上限 25%
  return Math.min(0.25, 0.02 + t / 60 * 0.015)
}

/**
 * 敌人死亡时生成掉落物（经验球 + 高级奖励）
 */
function spawnEnemyDrops(enemyX, enemyY) {
  // 1. 基础经验球
  orbs.push(new ExperienceOrb(enemyX, enemyY))

  // 2. 回血球（概率随游戏时间递增）
  if (Math.random() < getHealDropChance()) {
    const healAmount = 15 + Math.floor(gameTime.value / 60) * 5  // 随时间增加回复量
    orbs.push(createHealOrb(enemyX + (Math.random() - 0.5) * 30, enemyY + (Math.random() - 0.5) * 30, healAmount))
  }

  // 3. 高级奖励（大型经验球，随时间递增概率）
  if (Math.random() < getPremiumDropChance()) {
    const bonusExp = 50 + Math.floor(gameTime.value / 30) * 10  // 随时间增加经验值
    orbs.push(new ExperienceOrb(enemyX + (Math.random() - 0.5) * 20, enemyY + (Math.random() - 0.5) * 20, bonusExp))
    // 大经验球视觉提示
    damageNumbers.push(new DamageNumber(enemyX, enemyY - 25, '✨ 额外经验!', '#f1c40f'))
  }
}

// ===== 技能选择（含进化/升级支持） =====
/**
 * 武器技能 ID → 武器实例元信息映射
 */
const WEAPON_SKILL_MAP = {
  weapon_boomerang:        { id: 'boomerang',         ctor: BoomerangWeapon },
  weapon_lightning:        { id: 'lightning_weapon',  ctor: LightningWeapon },
  weapon_mine:             { id: 'mine',              ctor: MineWeapon },
  weapon_auto_pistol:      { id: 'auto_pistol',       ctor: AutoPistolWeapon },
  weapon_orbit_sword:      { id: 'orbit_sword',       ctor: OrbitSwordWeapon },
  weapon_random_lightning: { id: 'random_lightning',  ctor: RandomLightningWeapon },
}

export function selectSkill(skillId) {
  // ===== 1. 检查是否是进化技能 =====
  const evoEntry = Object.entries(SKILL_EVOLUTIONS).find(([_, e]) => e.id === skillId)
  if (evoEntry) {
    const [baseId, evoDef] = evoEntry
    const baseSkill = ALL_SKILLS.find(s => s.id === baseId)

    // 武器超武：在已有武器实例上调用特殊升级
    if (baseSkill && baseSkill.category === 'weapon') {
      const wpDef = WEAPON_SKILL_MAP[baseSkill.id]
      if (wpDef) {
        let existing = player.weapons.find(w => w.id === wpDef.id)
        if (existing) {
          // 超武升级：强制提升等级（即使已满级），直接调用 _onLevelUp()
          existing.level = Math.min(existing.level + 1, existing.maxLevel + 1) // maxLevel+1 表示超武
          existing._onLevelUp()
          // 超武额外强化：直接修改私有属性
          existing._damageMult = (existing._damageMult || 1) + 5
          existing._range = (existing._range || 150) * 1.3
          // 额外：冷却减半、数量翻倍
          existing._cooldown *= 0.5
          existing._count = Math.min(Math.floor(existing._count * 2), 20)
        }
      }
    } else {
      // 属性超武：直接 apply
      evoDef.apply(player)
    }

    player.acquiredSkills.push(skillId)
    audioManager.playLevelUp()
    showLevelUpMenu.value = false
    damageNumbers.push(new DamageNumber(player.x, player.y - 40, '🌟 超武进化！', '#f1c40f'))
    return
  }

  // ===== 2. 查找技能定义 =====
  const skill = ALL_SKILLS.find((s) => s.id === skillId)
  if (!skill) return

  // ===== 3. 武器技能：实例化/升级 =====
  if (skill.category === 'weapon') {
    if (!player.weapons) player.weapons = []
    const def = WEAPON_SKILL_MAP[skillId]
    if (def) {
      let existing = player.weapons.find(w => w.id === def.id)
      if (existing) {
        existing.upgrade()
      } else {
        const wp = new def.ctor()
        player.weapons.push(wp)
        weapons.push(wp)
      }
    }
    player.acquiredSkills.push(skillId)
    audioManager.playLevelUp()
    showLevelUpMenu.value = false
    return
  }

  // ===== 4. 数值强化技能 =====
  skill.apply(player)
  player.acquiredSkills.push(skillId)
  audioManager.playLevelUp()
  showLevelUpMenu.value = false
}

// ===== Canvas 绘制 =====
function drawGrid(ctx, w, h, camera) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  const gs = 50
  const cx = camera ? camera.x : 0
  const cy = camera ? camera.y : 0
  const startX = Math.floor(cx / gs) * gs
  const startY = Math.floor(cy / gs) * gs
  for (let x = startX; x <= cx + w; x += gs) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + h); ctx.stroke() }
  for (let y = startY; y <= cy + h; y += gs) { ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + w, y); ctx.stroke() }
  ctx.restore()
}

// ===== 摇杆 UI 同步 =====
function _syncJoystickUI() {
  jActive.value = joystick.active
  jDisplayX.value = joystick.displayX
  jDisplayY.value = joystick.displayY
  jThumbX.value = joystick.thumbOffsetX
  jThumbY.value = joystick.thumbOffsetY
  jPersistentVisible.value = joystick.persistentVisible
}

// ===== 触摸事件 =====
export function onTouchStart(e) {
  if (!player || gameState.value !== 'playing') return
  joystick.updateLayout()
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i]
    const result = joystick.onStart(touch.clientX, touch.clientY, touch.identifier)
    if (result === 'move') _syncJoystickUI()
    else if (result === 'skill') {
      jSkillShow.value = true
      if (player) player.triggerSkill()
      setTimeout(() => { jSkillShow.value = false }, 150)
    }
  }
}

export function onTouchMove(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i]
    const result = joystick.onMove(touch.clientX, touch.clientY, touch.identifier)
    if (result === 'move') _syncJoystickUI()
  }
}

export function onTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i]
    joystick.onEnd(touch.identifier)
  }
  _syncJoystickUI()
}

// ===== 键盘事件 =====
export function onKeyDown(e) {
  // 升级菜单打开时，ESC 不触发暂停，避免两个菜单重叠
  if (showLevelUpMenu.value) return

  // ESC 暂停/继续（必须在 length 过滤之前，因为 'Escape'.length=6）
  if (e.key === 'Escape') {
    if (gameState.value === 'playing') pauseGame()
    else if (gameState.value === 'paused') resumeGame()
    return
  }

  // 空格/J 键触发技能（闪避/爆发）
  if (e.key === ' ' || e.key === 'Space' || e.key.toLowerCase() === 'j') {
    if (gameState.value === 'playing' && player) {
      e.preventDefault()
      player.triggerSkill()
    }
    return
  }

  // 调试模式隐藏解锁
  if (e.key.toLowerCase() === 'f3') {
    _debugKeySeq = ''
  }
  _debugKeySeq += e.key.toLowerCase()
  if (_debugKeySeq.includes(DEBUG_UNLOCK_SEQ)) {
    _debugKeySeq = ''
    if (!debugMode.value) {
      debugMode.value = true
      try { localStorage.setItem('mowing_survivor_debug', 'true') } catch {}
    }
  }
  if (e.key.length > 3) return

  // 调试模式快捷键
  if (!debugMode.value) return
  if (e.key === 'F1') { debugInvincible = !debugInvincible; e.preventDefault() }
  if (e.key === 'F2') { debugFastLevel = !debugFastLevel; e.preventDefault() }
  if (e.key === 'F3') {
    // 快速生成敌人测试
    for (let i = 0; i < 10; i++) spawnEnemy()
    e.preventDefault()
  }
}

// ===== 窗口 Resize =====
export function onResize() {
  resizeCanvas()
  joystick.updateLayout()
  _syncJoystickUI()
  if (player) player.resize(canvasWidth, canvasHeight)
  if (background) background.resize(canvasWidth, canvasHeight)
}

// ===== 页面关闭 / 刷新 =====
// 刷新时自动结算保存数据（金币、击杀等），然后清除活跃标志，
// 路由守卫会将刷新后的页面重定向到首页，不再有继续游戏弹窗。
function onBeforeUnload() {
  if (gameState.value === 'playing' || gameState.value === 'paused') {
    saveRunProgress()  // 结算金币/击杀/历史记录
    setGameActive(false)  // 清除活跃标志，路由守卫会拦截
    clearGameSave()       // 清除存档数据
  }
}

// ===== 初始化引擎 =====
export function setupGameEngine(bgRef, entityRef, vpRef) {
  bgCanvasRef = bgRef
  entityCanvasRef = entityRef
  viewportRef = vpRef

  // 获取 Canvas 上下文
  const bgCanvas = bgCanvasRef.value
  bgCtx = bgCanvas.getContext('2d')
  const eCanvas = entityCanvasRef.value
  entityCtx = eCanvas.getContext('2d')

  resizeCanvas()

  // 初始化离屏精灵缓存
  SpriteCache.init()

  // 加载调试模式状态
  loadDebugMode()

  // ===== 触屏设备检测：自动切换静态摇杆 + 移动端适配 =====
  if (isTouchDevice.value) {
    joystick.enableStatic()
    _syncJoystickUI()
    // 触屏设备强制 AudioContext 初始化（用户触摸时自动触发）
    audioManager.init()
  }

  // 创建初始玩家对象
  player = new Player(canvasWidth, canvasHeight)
  player._bindInput()  // 显式绑定键盘监听
  player.onLevelUp = handleLevelUp
  syncPlayerStats()

  // 预加载资源
  loadAssets()

  // 创建游戏循环
  gameLoop = new GameLoop({
    update: (deltaTime) => {
      if (gameState.value !== 'playing') return
      if (showLevelUpMenu.value) return

      const gpConnected = gamepadManager.update()
      gamepadConnected.value = gpConnected
      if (gpConnected && player) {
        player.setGamepadAxes(gamepadManager.axes[0], gamepadManager.axes[1])
        if (gamepadManager.firePressed) player.triggerSkill()
      }

      if (hitstopTimer > 0) {
        hitstopTimer -= deltaTime
        for (const p of deathParticles) p.update(deltaTime)
        for (const d of damageNumbers) d.update(deltaTime)
        return
      }

      gameTime.value += deltaTime

      // 爆发技能冷却倒计时
      if (_skillCooldownTimer > 0) {
        _skillCooldownTimer -= deltaTime
        if (_skillCooldownTimer < 0) _skillCooldownTimer = 0
      }

      // 雷霆风暴闪电弧线淡出
      for (let i = _skillLightningArcs.length - 1; i >= 0; i--) {
        _skillLightningArcs[i].timer -= deltaTime
        if (_skillLightningArcs[i].timer <= 0) _skillLightningArcs.splice(i, 1)
      }

      if (shakeTimer > 0) {
        shakeTimer -= deltaTime
        if (shakeTimer <= 0) { shakeTimer = 0; shaking.value = false }
      }

      if (debugInvincible && player.hp < player.maxHp) player.hp = player.maxHp
      if (debugFastLevel) player.addExp(50 * deltaTime)

      // 将触屏摇杆方向传递给玩家
      if (player) player.setJoystick(joystick.dx, joystick.dy)

      player.update(deltaTime)
      camera?.update(deltaTime, player.x, player.y)

      // ===== 波次管理器：敌人生成 =====
      const waveSpawnInterval = getSpawnInterval(gameTime.value) * (waveManager ? waveManager.getSpawnIntervalMult(gameTime.value) : 1)
      enemySpawnTimer += deltaTime
      while (enemySpawnTimer >= waveSpawnInterval) {
        enemySpawnTimer -= waveSpawnInterval
        const baseCount = waveManager ? waveManager.getBaseSpawnCount(gameTime.value) : 1
        for (let i = 0; i < baseCount; i++) {
          spawnEnemy()
        }
      }

      // 潮汐事件（特殊怪潮）
      if (waveManager) {
        const tideInfo = waveManager.updateTides(
          gameTime.value, deltaTime,
          (type, count) => {
            for (let i = 0; i < count; i++) spawnEnemyOfType(type)
          },
          enemies
        )
        if (tideInfo) {
          _currentTideInfo = tideInfo
          _tideMessageTimer = 3.0
        }
      }

      // 潮汐提示计时
      if (_tideMessageTimer > 0) _tideMessageTimer -= deltaTime

      // Boss 生成检测（第 5 分钟和第 10 分钟）
      if (gameTime.value >= 300 && !_bossSpawned300) {
        _bossSpawned300 = true
        const bossSpeed = getEnemySpeed(gameTime.value)
        const bossHp = getEnemyHp(gameTime.value)
        enemies.push(new Enemy(player.x + 200, player.y - 200, bossSpeed, bossHp, 'boss'))
        damageNumbers.push(new DamageNumber(player.x, player.y - 60, '⚠️ Boss 出现！', '#e74c3c'))
        audioManager.playExplosion()
        triggerShake(0.3)
      }
      if (gameTime.value >= 600 && !_bossSpawned600) {
        _bossSpawned600 = true
        const bossSpeed = getEnemySpeed(gameTime.value)
        const bossHp = getEnemyHp(gameTime.value)
        enemies.push(new Enemy(player.x - 200, player.y + 200, bossSpeed, bossHp, 'boss'))
        damageNumbers.push(new DamageNumber(player.x, player.y - 60, '⚠️ 第 2 个 Boss 出现！', '#ff1744'))
        audioManager.playExplosion()
        triggerShake(0.3)
      }

      // 可破坏物生成（在玩家周围随机刷新）
      destructibleSpawnTimer += deltaTime
      const destSpawnInterval = DESTRUCTIBLE_CONFIG.spawnIntervalMin +
        Math.random() * (DESTRUCTIBLE_CONFIG.spawnIntervalMax - DESTRUCTIBLE_CONFIG.spawnIntervalMin)
      while (destructibleSpawnTimer >= destSpawnInterval) {
        destructibleSpawnTimer -= destSpawnInterval
        spawnDestructible()
      }

      bulletFireTimer += deltaTime
      while (bulletFireTimer >= player.bulletFireInterval) { bulletFireTimer -= player.bulletFireInterval; fireBullet() }

      for (const e of enemies) e.update(deltaTime, player.x, player.y)
      bulletPool.updateAll(deltaTime)
      SkillSynergy.update(deltaTime, player, enemies)
      for (const o of orbs) o.update(deltaTime, player.x, player.y, player.pickupRangeMultiplier || 1.0)
      for (const f of hitFlashes) f.update(deltaTime)
      for (const d of damageNumbers) d.update(deltaTime)
      for (const p of deathParticles) p.update(deltaTime)

      // 远程型敌人射击（伤害随时间递增）
      const bulletDmgScale = getEnemyDamage(gameTime.value)
      for (const e of enemies) {
        if (e.type === 'ranger' && e.needsShoot && e.alive && !e._exploding) {
          const dx = player.x - e.x, dy = player.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0.5) enemyBullets.push(new EnemyBullet(e.x, e.y, dx / dist, dy / dist, 200, Math.max(5, Math.floor(bulletDmgScale * 0.6))))
          e.needsShoot = false
        }
        // 精英射手 — 发射慢速高伤飞行物
        if (e.type === 'elite_ranger' && e.needsShoot && e.alive && !e._exploding) {
          const dx = player.x - e.x, dy = player.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0.5) {
            enemyBullets.push(new EnemyBullet(e.x, e.y, dx / dist, dy / dist, e.bulletSpeed, Math.max(8, Math.floor(bulletDmgScale * 1.2))))
          }
          e.needsShoot = false
        }
        // Boss — 发射子弹（阶段3时扇形三发）
        if (e.type === 'boss' && e.needsShoot && e.alive && !e._exploding) {
          const dx = player.x - e.x, dy = player.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0.5) {
            const baseAngle = Math.atan2(dy, dx)
            const bossDmg = Math.max(10, Math.floor(bulletDmgScale * 1.5))
            if (e.bossPhase === 3) {
              // 狂暴阶段：扇形三发
              for (let i = -1; i <= 1; i++) {
                const angle = baseAngle + i * 0.35
                enemyBullets.push(new EnemyBullet(e.x, e.y, Math.cos(angle), Math.sin(angle), e.bulletSpeed * 1.2, bossDmg))
              }
            } else {
              enemyBullets.push(new EnemyBullet(e.x, e.y, dx / dist, dy / dist, e.bulletSpeed, bossDmg))
            }
          }
          e.needsShoot = false
        }
      }

      // 自爆型爆炸
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        if (e._exploding && e.explodeTimer <= 0) {
          const pdx = player.x - e.x, pdy = player.y - e.y
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy)
          if (pDist < e.explosionRadius) {
            const scaledDmg = Math.floor(e.explosionDamage * (1 + getEnemyDamage(gameTime.value) / ENEMY_DAMAGE_BASE * 0.5))
            const dmg = player.takeDamage(scaledDmg)
            if (dmg) {
              triggerShake(0.15); audioManager.playHurt()
              damageNumbers.push(new DamageNumber(player.x, player.y - 20, `-${scaledDmg}`, '#e74c3c', 15))
              // 爆炸击退
              if (pDist > 0.5) player.knockback(pdx / pDist, pdy / pDist, 200)
            }
            if (player.hp <= 0) gameOver()
          }
          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            if (ei === i) continue
            const other = enemies[ei]
            const dx = other.x - e.x, dy = other.y - e.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < e.explosionRadius) {
              const dead = other.takeDamage(e.explosionDamage)
              hitFlashes.push(new HitFlash(other.x, other.y, other.size))
              damageNumbers.push(new DamageNumber(other.x, other.y - 5, `-${e.explosionDamage}`, '#e67e22', 10))
              if (dead && !other._exploding) { player.kills++; audioManager.playExplosion(); damageNumbers.push(new DamageNumber(other.x, other.y - 10, '💥', '#f1c40f')); deathParticles.push(...spawnDeathParticles(other.x, other.y, other.color)); spawnEnemyDrops(other.x, other.y); enemies.splice(ei, 1); if (ei < i) i-- }
            }
          }
          audioManager.playExplosion()
          deathParticles.push(...spawnDeathParticles(e.x, e.y, '#ff4444'))
          enemies.splice(i, 1)
        }
      }

      // 敌人子弹
      for (const b of enemyBullets) b.update(deltaTime)
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (!enemyBullets[i].alive) enemyBullets.splice(i, 1)
      }

      // 可破坏物更新（破碎动画）
      for (const d of destructibles) d.update(deltaTime)

      // 碰撞检测
      checkBulletEnemyCollisions()
      checkBulletDestructibleCollisions()  // 子弹 vs 可破坏物
      checkEnemyPlayerCollisions()
      checkEnemyBulletPlayerCollisions()
      checkOrbPickup()
      cleanupObjects()

      // 武器系统更新（各自拥有独立冷却计时器）
      const weaponRefs = { damageNumbers, hitFlashes, deathParticles, orbs, audioManager, HitFlash, spawnDeathParticles, ExperienceOrb, destructibles }
      for (const w of weapons) {
        if (w.active) w.update(deltaTime, player, enemies, weaponRefs)
      }

      // UI 同步节流
      _syncUITimer -= deltaTime
      if (_syncUITimer <= 0) { _syncUITimer = 0.5; syncPlayerStats() }

      // 自动保存
      _saveThrottleTimer -= deltaTime
      if (_saveThrottleTimer <= 0) { _saveThrottleTimer = 2.0; saveGameState() }
    },

    render: () => {
      if (gameState.value !== 'playing') return

      const _bgCanvas = bgCanvasRef.value
      const _eCanvas = entityCanvasRef.value
      if (!_bgCanvas || !_eCanvas) return

      const camX = camera ? camera.x : 0
      const camY = camera ? camera.y : 0
      const bgNeedsRedraw = (
        _lastBgCamX === undefined || _lastBgCamY === undefined ||
        Math.abs(camX - _lastBgCamX) > BG_REDRAW_THRESHOLD ||
        Math.abs(camY - _lastBgCamY) > BG_REDRAW_THRESHOLD
      )

      if (bgNeedsRedraw) {
        bgCtx.save()
        bgCtx.setTransform(1, 0, 0, 1, 0, 0)
        bgCtx.clearRect(0, 0, _bgCanvas.width, _bgCanvas.height)
        bgCtx.restore()

        bgCtx.save()
        if (camera) bgCtx.translate(-camera.x, -camera.y)
        drawGrid(bgCtx, canvasWidth, canvasHeight, camera)
        if (background) background.draw(bgCtx, camX, camY)
        bgCtx.restore()

        _lastBgCamX = camX
        _lastBgCamY = camY
      }

      entityCtx.save()
      entityCtx.setTransform(1, 0, 0, 1, 0, 0)
      entityCtx.clearRect(0, 0, _eCanvas.width, _eCanvas.height)
      entityCtx.restore()

      entityCtx.save()
      if (camera) entityCtx.translate(-camera.x, -camera.y)

      const sorted = [{ y: player.y, draw: () => player.draw(entityCtx) }]
      for (const e of enemies) sorted.push({ y: e.y, draw: () => e.draw(entityCtx) })
      sorted.sort((a, b) => a.y - b.y)
      for (const s of sorted) s.draw()

      for (const f of hitFlashes) f.draw(entityCtx)
      for (const o of orbs) o.draw(entityCtx)
      // 绘制可破坏物（在球之后、子弹之前，作为场景元素）
      for (const d of destructibles) d.draw(entityCtx)
      bulletPool.forEach((b) => SpriteCache.drawBullet(entityCtx, b.x, b.y))
      for (const b of enemyBullets) b.draw(entityCtx)
      for (const d of damageNumbers) d.draw(entityCtx)
      for (const p of deathParticles) p.draw(entityCtx)
      SkillSynergy.drawEffects(entityCtx)

      // 绘制雷霆风暴闪电弧线特效（锯齿状闪电链）
      for (const arc of _skillLightningArcs) {
        const alpha = Math.min(1, arc.timer / 0.2)
        if (alpha <= 0) continue
        const dx = arc.x2 - arc.x1
        const dy = arc.y2 - arc.y1
        const segLen = Math.sqrt(dx * dx + dy * dy)
        const segments = Math.max(6, Math.floor(segLen / 12))
        const jitter = 18

        // 外层主闪电（青蓝色）
        entityCtx.save()
        entityCtx.strokeStyle = `rgba(100, 200, 255, ${alpha})`
        entityCtx.lineWidth = 3 * alpha
        entityCtx.shadowColor = '#4488ff'
        entityCtx.shadowBlur = 15 * alpha
        entityCtx.beginPath()
        entityCtx.moveTo(arc.x1, arc.y1)
        for (let i = 1; i < segments; i++) {
          const t = i / segments
          const jx = arc.x1 + dx * t + (Math.random() - 0.5) * jitter * (1 - t * 0.5)
          const jy = arc.y1 + dy * t + (Math.random() - 0.5) * jitter * (1 - t * 0.5)
          entityCtx.lineTo(jx, jy)
        }
        entityCtx.lineTo(arc.x2, arc.y2)
        entityCtx.stroke()

        // 内层亮白线（高光）
        entityCtx.shadowBlur = 0
        entityCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        entityCtx.lineWidth = 1.5 * alpha
        entityCtx.beginPath()
        entityCtx.moveTo(arc.x1, arc.y1)
        for (let i = 1; i < segments; i++) {
          const t = i / segments
          const jx = arc.x1 + dx * t + (Math.random() - 0.5) * jitter * (1 - t * 0.5)
          const jy = arc.y1 + dy * t + (Math.random() - 0.5) * jitter * (1 - t * 0.5)
          entityCtx.lineTo(jx, jy)
        }
        entityCtx.lineTo(arc.x2, arc.y2)
        entityCtx.stroke()
        entityCtx.restore()

        // 落雷点光晕
        entityCtx.save()
        const glowRadius = 12 * alpha
        const grad = entityCtx.createRadialGradient(arc.x2, arc.y2, 0, arc.x2, arc.y2, glowRadius)
        grad.addColorStop(0, `rgba(180, 230, 255, ${alpha * 0.8})`)
        grad.addColorStop(1, `rgba(100, 150, 255, 0)`)
        entityCtx.fillStyle = grad
        entityCtx.beginPath()
        entityCtx.arc(arc.x2, arc.y2, glowRadius, 0, Math.PI * 2)
        entityCtx.fill()
        entityCtx.restore()
      }

      // 绘制武器系统
      for (const w of weapons) {
        if (w.active) {
          // 绘制武器视觉特效（地雷、闪电弧线）
          if (w.draw) w.draw(entityCtx, camera)
          // 绘制武器实体（旋转飞刀刀片）
          if (w.render) w.render(entityCtx, player)
        }
      }

      entityCtx.restore()

      entityCtx.save()
      entityCtx.fillStyle = 'rgba(255,255,255,0.4)'
      entityCtx.font = '11px monospace'
      entityCtx.textAlign = 'right'
      entityCtx.textBaseline = 'bottom'
      const spawnInt = getSpawnInterval(gameTime.value)
      const enemyHp = getEnemyHp(gameTime.value)
      // 波次/潮汐信息
      let debugText = `FPS:${gameLoop.fps} 敌:${enemies.length} 弹:${bulletPool.count} 球:${orbs.length} ` +
        `生成:${spawnInt.toFixed(2)}s HP:${enemyHp}`
      if (waveManager) {
        debugText += ` 波次:${waveManager.getWaveName(gameTime.value)}`
      }
      entityCtx.fillText(debugText, canvasWidth - 10, canvasHeight - 10)
      entityCtx.restore()

      // ===== 战争迷雾 ╱ 环形光晕暗角（屏幕空间） =====
      entityCtx.save()
      entityCtx.setTransform(1, 0, 0, 1, 0, 0)
      const vignetteGrad = entityCtx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.25,
        canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.85
      )
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vignetteGrad.addColorStop(0.5, 'rgba(0,0,0,0)')
      vignetteGrad.addColorStop(0.75, 'rgba(0,0,0,0.3)')
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.6)')
      entityCtx.fillStyle = vignetteGrad
      entityCtx.fillRect(0, 0, canvasWidth, canvasHeight)
      entityCtx.restore()
    
      // 潮汐事件提示（屏幕中央）
      if (_tideMessageTimer > 0 && _currentTideInfo) {
        entityCtx.save()
        entityCtx.setTransform(1, 0, 0, 1, 0, 0)
        const alpha = Math.min(1, _tideMessageTimer / 1.5)
        entityCtx.globalAlpha = alpha
        entityCtx.textAlign = 'center'
        entityCtx.textBaseline = 'middle'
        entityCtx.font = 'bold 36px sans-serif'
        entityCtx.fillStyle = _currentTideInfo.color || '#ff4444'
        entityCtx.shadowColor = 'rgba(0,0,0,0.8)'
        entityCtx.shadowBlur = 10
        entityCtx.fillText(_currentTideInfo.name, canvasWidth / 2, canvasHeight / 3)
        entityCtx.restore()
      }
    },
  })

  // 窗口事件
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
}

// ===== 清理 =====
export function teardownGameEngine() {
  gameLoop?.stop()
  player?.destroy()
  audioManager.destroy()
  gamepadManager.destroy()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  enemies.length = 0; orbs.length = 0; hitFlashes.length = 0
  damageNumbers.length = 0; deathParticles.length = 0; enemyBullets.length = 0
  weapons.length = 0; destructibles.length = 0
  if (waveManager) waveManager.reset()
  waveManager = null
  if (bulletPool) bulletPool.reset()
}
