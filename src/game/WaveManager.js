/**
 * WaveManager — 波次管理器
 *
 * 根据游戏时间（gameTick）动态调整敌人的生成频率、类型和属性。
 * 提供"节奏感"：杂鱼期 → 精英期 → Boss 战 → 特殊潮汐。
 */
import { Enemy } from './Enemy.js'

// ==============================
//  波次定义
// ==============================
export const WAVE_DEFS = [
  {
    // 0~30 秒：新手期，杂鱼为主
    startTime: 0,
    endTime: 30,
    name: '新手期',
    spawnIntervalMult: 1.0,
    enemyTypes: ['chaser', 'charger'],
    typeWeights: { chaser: 0.7, charger: 0.3 },
    hpMult: 0.8,
    speedMult: 0.9,
    damageMult: 0.8,
    baseCount: 1,
    maxConcurrent: 15,
  },
  {
    // 30~90 秒：过渡期
    startTime: 30,
    endTime: 90,
    name: '过渡期',
    spawnIntervalMult: 0.85,
    enemyTypes: ['chaser', 'charger', 'ranger', 'shield'],
    typeWeights: { chaser: 0.3, charger: 0.25, ranger: 0.25, shield: 0.2 },
    hpMult: 1.0,
    speedMult: 1.0,
    damageMult: 1.0,
    baseCount: 1,
    maxConcurrent: 25,
  },
  {
    // 90~180 秒：精英挑战
    startTime: 90,
    endTime: 180,
    name: '精英挑战',
    spawnIntervalMult: 0.7,
    enemyTypes: ['chaser', 'charger', 'ranger', 'shield', 'elite_ranger'],
    typeWeights: { chaser: 0.2, charger: 0.2, ranger: 0.25, shield: 0.2, elite_ranger: 0.15 },
    hpMult: 1.2,
    speedMult: 1.1,
    damageMult: 1.2,
    baseCount: 1,
    maxConcurrent: 35,
  },
  {
    // 180~300 秒：地狱模式
    startTime: 180,
    endTime: 300,
    name: '地狱模式',
    spawnIntervalMult: 0.55,
    enemyTypes: ['chaser', 'charger', 'ranger', 'shield', 'elite_ranger', 'suicide_bug'],
    typeWeights: { chaser: 0.15, charger: 0.15, ranger: 0.2, shield: 0.15, elite_ranger: 0.2, suicide_bug: 0.15 },
    hpMult: 1.5,
    speedMult: 1.2,
    damageMult: 1.5,
    baseCount: 1,
    maxConcurrent: 50,
  },
  {
    // 300 秒+：无尽深渊
    startTime: 300,
    endTime: Infinity,
    name: '无尽深渊',
    spawnIntervalMult: 0.4,
    enemyTypes: ['chaser', 'charger', 'ranger', 'shield', 'elite_ranger', 'suicide_bug'],
    typeWeights: { chaser: 0.1, charger: 0.15, ranger: 0.15, shield: 0.1, elite_ranger: 0.3, suicide_bug: 0.2 },
    hpMult: 2.0,
    speedMult: 1.4,
    damageMult: 2.0,
    baseCount: 2,
    maxConcurrent: 70,
  },
]

// ==============================
//  特殊潮汐事件
// ==============================
export const TIDE_EVENTS = [
  {
    // 第 60 秒：自爆怪潮（持续 10 秒）
    triggerTime: 60,
    duration: 10,
    name: '💥 自爆怪潮！',
    color: '#ff4444',
    spawnOverride: {
      type: 'suicider',
      interval: 0.3,
      maxCount: 20,
    },
  },
  {
    // 第 120 秒：远程怪潮
    triggerTime: 120,
    duration: 12,
    name: '🏹 远程怪潮！',
    color: '#e67e22',
    spawnOverride: {
      type: 'ranger',
      interval: 0.4,
      maxCount: 15,
    },
  },
  {
    // 第 200 秒：冲锋怪潮
    triggerTime: 200,
    duration: 10,
    name: '⚡ 冲锋怪潮！',
    color: '#f1c40f',
    spawnOverride: {
      type: 'charger',
      interval: 0.25,
      maxCount: 25,
    },
  },
  {
    // 第 400 秒：精英潮
    triggerTime: 400,
    duration: 15,
    name: '👑 精英潮！',
    color: '#9b59b6',
    spawnOverride: {
      type: 'elite_ranger',
      interval: 0.5,
      maxCount: 12,
    },
  },
]

export class WaveManager {
  constructor() {
    this._activeTides = []       // 当前激活的潮汐
    this._tideTimers = {}        // 潮汐计时器 { triggerTime: remaining }
    this._tideSpawned = {}       // 潮汐已生成计数
    this._tideTriggered = {}     // 是否已触发
    this._tideSpawnTimer = 0     // 潮汐生成累积计时器
    this._lastWaveIdx = -1
    this._currentWaveIdx = 0
  }

  /**
   * 根据游戏时间获取当前波次定义
   * @param {number} gameSeconds
   * @returns {object}
   */
  getCurrentWave(gameSeconds) {
    for (let i = WAVE_DEFS.length - 1; i >= 0; i--) {
      if (gameSeconds >= WAVE_DEFS[i].startTime) {
        this._currentWaveIdx = i
        if (i !== this._lastWaveIdx) {
          this._lastWaveIdx = i
        }
        return WAVE_DEFS[i]
      }
    }
    return WAVE_DEFS[0]
  }

  /**
   * 获取波次名称（用于 UI 显示）
   * @param {number} gameSeconds
   * @returns {string}
   */
  getWaveName(gameSeconds) {
    return this.getCurrentWave(gameSeconds).name
  }

  /**
   * 根据波次随机选择一个敌人类型
   * @param {number} gameSeconds
   * @returns {string}
   */
  rollEnemyType(gameSeconds) {
    const wave = this.getCurrentWave(gameSeconds)
    const weights = wave.typeWeights
    const roll = Math.random()
    let cumulative = 0
    for (const [type, weight] of Object.entries(weights)) {
      cumulative += weight
      if (roll < cumulative) return type
    }
    return 'chaser'
  }

  /**
   * 根据波次获取生成间隔倍率
   * @param {number} gameSeconds
   * @returns {number}
   */
  getSpawnIntervalMult(gameSeconds) {
    return this.getCurrentWave(gameSeconds).spawnIntervalMult
  }

  /**
   * 根据波次获取属性倍率
   * @param {number} gameSeconds
   * @returns {{ hp: number, speed: number, damage: number }}
   */
  getStatMultipliers(gameSeconds) {
    const wave = this.getCurrentWave(gameSeconds)
    return {
      hp: wave.hpMult,
      speed: wave.speedMult,
      damage: wave.damageMult,
      maxConcurrent: wave.maxConcurrent,
    }
  }

  /**
   * 获取基本生成数量（波次越高一次生成越多）
   * @param {number} gameSeconds
   * @returns {number}
   */
  getBaseSpawnCount(gameSeconds) {
    return this.getCurrentWave(gameSeconds).baseCount
  }

  /**
   * 更新潮汐事件
   * @param {number} gameSeconds
   * @param {number} deltaTime
   * @param {Function} spawnCallback - (type, count) => void
   * @param {Array} enemies - 敌人列表引用（用于检查数量上限）
   * @returns {object|null} 当前激活的潮汐信息 { name, color } 或 null
   */
  updateTides(gameSeconds, deltaTime, spawnCallback, enemies) {
    let activeTideInfo = null

    // 1. 检查新触发的潮汐
    for (const event of TIDE_EVENTS) {
      if (!this._tideTriggered[event.triggerTime] && gameSeconds >= event.triggerTime) {
        this._tideTriggered[event.triggerTime] = true
        this._tideTimers[event.triggerTime] = event.duration
        this._tideSpawned[event.triggerTime] = 0
      }
    }

    // 2. 更新激活中的潮汐
    for (const event of TIDE_EVENTS) {
      const timerKey = event.triggerTime
      if (this._tideTimers[timerKey] > 0) {
        this._tideTimers[timerKey] -= deltaTime
        activeTideInfo = { name: event.name, color: event.color }

        // 按潮汐间隔生成指定类型的敌人
        const override = event.spawnOverride
        const count = this._tideSpawned[timerKey]
        if (count < override.maxCount && enemies.length < 100) {
          // 每帧按间隔尝试生成
          this._tideSpawnTimer += deltaTime
          const spawnInterval = override.interval
          while (this._tideSpawnTimer >= spawnInterval && this._tideSpawned[timerKey] < override.maxCount && enemies.length < 100) {
            this._tideSpawnTimer -= spawnInterval
            spawnCallback(override.type, 1)
            this._tideSpawned[timerKey]++
          }
        }

        // 结束清理
        if (this._tideTimers[timerKey] <= 0) {
          this._tideTimers[timerKey] = 0
        }
      }
    }

    return activeTideInfo
  }

  /** 重置所有状态 */
  reset() {
    this._activeTides = []
    this._tideTimers = {}
    this._tideSpawned = {}
    this._tideTriggered = {}
    this._tideSpawnTimer = 0
    this._lastWaveIdx = -1
    this._currentWaveIdx = 0
  }
}
