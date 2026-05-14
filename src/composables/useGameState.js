/**
 * useGameState — 游戏响应式状态管理
 *
 * 将所有 Vue reactive ref / computed 集中在此，
 * 子组件可导入使用，GameCanvas.vue 作为编排者。
 */
import { ref, computed } from 'vue'
import { PersistenceManager } from '../game/PersistenceManager.js'

// ===== 游戏状态 =====
export const gameState = ref('start')

// ===== 加载进度 =====
export const assetsLoaded = ref(false)
export const loadProgress = ref(0)

// ===== 玩家统计（触发 UI 更新的响应式副本） =====
export const level = ref(1)
export const exp = ref(0)
export const expToNext = ref(100)
export const score = ref(0)
export const killCount = ref(0)
export const acquiredSkills = ref([])
export const showLevelUpMenu = ref(false)
export const currentSkillOptions = ref([])
export const gameTime = ref(0)

// ===== 局外成长 / 天赋 =====
export const showTalentPanel = ref(false)
export const gold = ref(PersistenceManager.getGold())
export const totalKills = ref(PersistenceManager.getTotalKills())
export const talentLevels = ref(PersistenceManager.getTalentLevels())
export const goldEarned = ref(0)

// ===== 历史记录 =====
const STORAGE_KEY = 'mowing_survivor_highscore'
export const highScore = ref(loadHighScore())
export const bestKills = ref(PersistenceManager.getBestKills())
export const bestTime = ref(PersistenceManager.getBestTime())
export const newRecordKills = ref(false)
export const newRecordTime = ref(false)

function loadHighScore() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? parseInt(v, 10) : 0
  } catch { return 0 }
}

export function saveHighScore(scoreVal) {
  try {
    if (scoreVal > loadHighScore()) {
      localStorage.setItem(STORAGE_KEY, String(scoreVal))
      highScore.value = scoreVal
    }
  } catch { /* ignore */ }
}

// ===== 调试模式 =====
export const debugMode = ref(false)
const DEBUG_KEY = 'mowing_survivor_debug'

export function loadDebugMode() {
  try {
    debugMode.value = localStorage.getItem(DEBUG_KEY) === 'true'
  } catch { debugMode.value = false }
}

export function toggleDebugMode() {
  debugMode.value = !debugMode.value
  try { localStorage.setItem(DEBUG_KEY, String(debugMode.value)) } catch {}
}

// ===== 摇杆 UI =====
export const jActive = ref(false)
export const jDisplayX = ref(0)
export const jDisplayY = ref(0)
export const jThumbX = ref(0)
export const jThumbY = ref(0)
export const jSkillShow = ref(false)
export const jPersistentVisible = ref(false) // 静态模式下始终显示底座

// ===== 触屏设备检测 =====
function detectTouchDevice() {
  return (
    ('ontouchstart' in window && navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches
  )
}
export const isTouchDevice = ref(detectTouchDevice())

// ===== 手柄连接 =====
export const gamepadConnected = ref(false)

// ===== 屏幕抖动 =====
export const shaking = ref(false)
export const shakeDuration = ref(0.15)

// ===== HUD 计算属性 =====
export const gameTimeFormatted = computed(() => {
  const s = Math.floor(gameTime.value)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
})

export const expPercent = computed(() => Math.min(100, (exp.value / expToNext.value) * 100))

// ===== 持久化 UI 刷新 =====
export function refreshPersistenceUI() {
  gold.value = PersistenceManager.getGold()
  totalKills.value = PersistenceManager.getTotalKills()
  talentLevels.value = { ...PersistenceManager.getTalentLevels() }
  bestKills.value = PersistenceManager.getBestKills()
  bestTime.value = PersistenceManager.getBestTime()
}

// ===== 格式化工具 =====
export function formatSeconds(seconds) {
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
