<template>
  <div class="game-wrapper" :class="{ 'screen-shake': shaking }"
       :style="{ '--shake-duration': shakeDuration + 's' }" ref="wrapperRef"
       @touchstart="onTouchStart"
       @touchmove="onTouchMove"
       @touchend="onTouchEnd"
       @touchcancel="onTouchEnd">

    <!-- ====== Canvas 双层架构 ====== -->
    <div v-show="gameState === 'playing'" class="canvas-container" ref="containerRef">
      <canvas ref="bgCanvasRef" class="bg-canvas"></canvas>
      <div class="canvas-viewport" ref="viewportRef">
        <canvas ref="entityCanvasRef" class="entity-canvas"></canvas>
      </div>
    </div>

    <!-- ====== HUD ====== -->
    <template v-if="gameState === 'playing'">
      <div class="hud-top">
        <div class="hud-info-row">
          <span class="hud-stat" @mouseenter="showTooltipText($event, '等级', '当前等级 Lv.' + level)" @mouseleave="hideTooltip">Lv.<b>{{ level }}</b></span>
          <span class="hud-stat" @mouseenter="showTooltipText($event, '分数', '当前得分：' + score)" @mouseleave="hideTooltip">🏆<b>{{ score }}</b></span>
          <span class="hud-stat" @mouseenter="showTooltipText($event, '击杀数', '已击杀 ' + killCount + ' 个敌人')" @mouseleave="hideTooltip">💀<b>{{ killCount }}</b></span>
          <span class="hud-stat" @mouseenter="showTooltipText($event, '游戏时间', '已坚持 ' + gameTimeFormatted)" @mouseleave="hideTooltip">⏱<b>{{ gameTimeFormatted }}</b></span>
          <span class="hud-stat hud-exp" @mouseenter="showTooltipText($event, '经验值', exp + ' / ' + expToNext)" @mouseleave="hideTooltip">✨<b>{{ exp }}/{{ expToNext }}</b></span>
          <!-- 技能图标：悬停显示描述，进化技能替换旧图标 -->
          <span
            v-for="(id, i) in uniqueSkills" :key="i"
            class="hud-skill-icon"
            :class="{ 'is-evolution': isEvoSkill(id) }"
            @mouseenter="showTooltip($event, id)"
            @mouseleave="hideTooltip"
          >{{ skillIcon(id) }}</span>
          <div class="hud-exp-bar-mini">
            <div class="hud-exp-fill-mini" :style="{ width: expPercent + '%' }"></div>
          </div>
        </div>
        <span v-if="gamepadConnected" class="hud-gamepad-indicator" title="🎮 手柄已连接">🎮</span>
        <!-- 暂停按钮（右上角） -->
        <span class="btn-pause-icon pc-pause" @click="togglePause" title="暂停 (ESC)">⏸</span>
      </div>

      <!-- 自定义 tooltip 浮层 -->
      <div v-if="tooltipVisible" class="hud-tooltip" :style="tooltipStyle">
        <div class="hud-tooltip-name">{{ tooltipName }}</div>
        <div class="hud-tooltip-desc">{{ tooltipDesc }}</div>
      </div>
    </template>

    <div v-if="jSkillShow && gameState === 'playing'" class="skill-flash-overlay">
      <div class="skill-flash-label">⚡ 技能</div>
    </div>

    <!-- ====== 暂停菜单 ====== -->
    <div v-if="gameState === 'paused'" class="overlay-screen pause-overlay">
      <div class="pause-panel">
        <h2>⏸ 暂停</h2>
        <div class="pause-stats">
          <p>等级：<strong>{{ level }}</strong></p>
          <p>分数：<strong>{{ score }}</strong></p>
          <p>击杀：<strong>{{ killCount }}</strong></p>
          <p>时间：<strong>{{ gameTimeFormatted }}</strong></p>
        </div>
        <!-- 操作键位说明 -->
        <div class="pause-controls">
          <h3>⌨️ 操作键位</h3>
          <div class="controls-grid">
            <div class="control-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键</div>
            <div class="control-item"><kbd>空格</kbd> / <kbd>J</kbd> / 右半屏点击</div>
            <div class="control-item"><kbd>ESC</kbd></div>
            <div class="control-item">虚拟摇杆（左半屏拖拽）</div>
            <div class="control-label">移动</div>
            <div class="control-label">爆发技能（雷霆风暴，冷却 10 秒）</div>
            <div class="control-label">暂停 / 继续</div>
            <div class="control-label">移动（触屏）</div>
          </div>
          <p class="controls-note">💡 爆发技能默认自带：按空格/J 触发雷霆风暴，在周围召唤 12 道闪电（冷却 10 秒，无消耗）。<br>该技能不可选择或替换。</p>
        </div>
        <div class="pause-actions">
          <button class="btn-pause-action" @click="resumeGame">继续游戏</button>
          <button class="btn-pause-action btn-restart" @click="restartGame">重新开始</button>
          <button class="btn-pause-action btn-exit" @click="exitToMenu">🚪 退出游戏</button>
        </div>
      </div>
    </div>

    <!-- ====== 升级菜单（卡片式华丽弹窗） ====== -->
    <div v-if="showLevelUpMenu" class="levelup-overlay" @click.self="() => {}">
      <div class="levelup-panel">
        <!-- 标题 -->
        <div class="levelup-header">
          <div class="levelup-glow"></div>
          <h2>🎉 升级！</h2>
          <p class="levelup-sub">等级 <strong>Lv.{{ level }}</strong> — 选择一个强化</p>
        </div>

        <!-- 技能选项卡片区 -->
        <div class="upgrade-cards">
          <div
            v-for="(skill, idx) in currentSkillOptions" :key="skill.id"
            class="upgrade-card"
            :class="[
              `card-${skill.category || 'stat'}`,
              { 'card-evolution': skill.isEvolution, 'card-maxed': skill.maxed }
            ]"
            :style="{ '--card-delay': idx * 0.08 + 's' }"
            @click="selectSkill(skill.id)"
          >
            <!-- 卡片顶部发光条 -->
            <div class="card-accent"></div>

            <!-- 分类标签 -->
            <div class="card-badge-row">
              <span v-if="skill.isEvolution" class="card-badge badge-evolution">🌟 超武进化</span>
              <span v-else-if="skill.isUpgrade" class="card-badge badge-upgrade">⬆ 武器升级</span>
              <span v-else-if="skill.isUnlock" class="card-badge badge-unlock">🔓 武器解锁</span>
              <span v-else class="card-badge badge-stat">📈 数值强化</span>
            </div>

            <!-- 图标区 -->
            <div class="card-icon-wrapper">
              <span class="card-icon">{{ skill.icon }}</span>
              <div v-if="skill.isEvolution" class="card-evo-ring"></div>
            </div>

            <!-- 名称 & 描述 -->
            <div class="card-info">
              <span class="card-name">{{ skill.name }}</span>
              <span class="card-desc">{{ skill.desc }}</span>
            </div>

            <!-- 等级进度条 -->
            <div v-if="!skill.isEvolution && !skill.maxed" class="card-level-bar">
              <div class="card-level-label">
                <span>Lv.{{ skill.currentLevel ?? 0 }}</span>
                <span>Lv.{{ skill.maxLevel }}</span>
              </div>
              <div class="card-level-track">
                <div class="card-level-fill" :style="{ width: ((skill.currentLevel ?? 0) / skill.maxLevel * 100) + '%' }"></div>
              </div>
            </div>

            <!-- MAX 标签 -->
            <div v-if="skill.maxed" class="card-maxed-badge">MAX</div>

            <!-- 悬停光效 -->
            <div class="card-hover-glow"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 死亡结算 ====== -->
    <div v-if="gameState === 'gameOver'" class="overlay-screen gameover-overlay">
      <div class="gameover-panel">
        <h2>💀 你阵亡了</h2>
        <div class="gameover-stats">
          <div class="stat-block">
            <span class="stat-icon">🎯</span>
            <span class="stat-label">击杀数</span>
            <span class="stat-value">
              {{ killCount }}
              <span v-if="newRecordKills" class="new-record-badge">🏆 新纪录！</span>
            </span>
            <span v-if="bestKills > 0" class="stat-sub">最高 {{ bestKills }}</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">⏱</span>
            <span class="stat-label">坚持时间</span>
            <span class="stat-value">
              {{ gameTimeFormatted }}
              <span v-if="newRecordTime" class="new-record-badge">🏆 新纪录！</span>
            </span>
            <span v-if="bestTime > 0" class="stat-sub">最长 {{ formatSeconds(bestTime) }}</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">🏆</span>
            <span class="stat-label">最终分数</span>
            <span class="stat-value">{{ score }}</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">📊</span>
            <span class="stat-label">最终等级</span>
            <span class="stat-value">Lv.{{ level }}</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">💰</span>
            <span class="stat-label">获得金币</span>
            <span class="stat-value">+{{ goldEarned }}</span>
          </div>
        </div>
        <button class="btn-start" @click="exitToMenu">🔄 返回主菜单</button>
      </div>
    </div>

    <!-- ====== 虚拟摇杆（触屏设备始终底座可见） ====== -->
    <div v-if="(jActive || jPersistentVisible) && gameState === 'playing'" class="joystick-zone">
      <!-- 静态模式（触屏）使用 CSS bottom/left 定位，稳定可靠；
           非静态模式（鼠标）使用 JS 动态 left/top 跟随触摸点 -->
      <div class="joystick-base"
           :class="{
             'joystick-base-static': jPersistentVisible && !jActive,
             'joystick-base-fixed': jPersistentVisible
           }"
           :style="jPersistentVisible ? {} : { left: jDisplayX + 'px', top: jDisplayY + 'px' }">
        <div class="joystick-thumb" :style="{ transform: 'translate(' + jThumbX + 'px, ' + jThumbY + 'px)' }"></div>
      </div>
    </div>

    <!-- ====== 触屏设备：右下角暂停按钮（移动端显示，PC端隐藏） ====== -->
    <div v-if="gameState === 'playing'" class="touch-pause-btn" @click.stop="togglePause()">
      <span>⏸</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ALL_SKILLS, SKILL_EVOLUTIONS } from '../game/SkillDefs.js'
import {
  gameState, assetsLoaded,
  level, exp, expToNext, score, killCount, acquiredSkills,
  showLevelUpMenu, currentSkillOptions, gameTime,
  gold, goldEarned,
  highScore, bestKills, bestTime, newRecordKills, newRecordTime,
  jActive, jDisplayX, jThumbX, jThumbY, jSkillShow, jPersistentVisible,
  gamepadConnected, shaking, shakeDuration, gameTimeFormatted, expPercent,
  refreshPersistenceUI, formatSeconds
} from '../composables/useGameState.js'
import {
  setupGameEngine, teardownGameEngine,
  startGame, pauseGame, resumeGame, saveRunProgress,
  clearGameActive,
  selectSkill, onTouchStart, onTouchMove, onTouchEnd,
  onKeyDown, onResize
} from '../composables/useGameEngine.js'

const router = useRouter()
const bgCanvasRef = ref(null)
const entityCanvasRef = ref(null)
const wrapperRef = ref(null)
const containerRef = ref(null)
const viewportRef = ref(null)

// ===== Tooltip 响应式状态 =====
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipName = ref('')
const tooltipDesc = ref('')
const tooltipStyle = computed(() => ({
  left: tooltipX.value + 'px',
  top: tooltipY.value + 'px',
}))
/** 估算 tooltip 高度（近似值） */
const TOOLTIP_HEIGHT_EST = 60

function showTooltip(e, id) {
  const evo = Object.values(SKILL_EVOLUTIONS).find(ev => ev.id === id)
  if (evo) {
    tooltipName.value = '🌟 ' + evo.name
    tooltipDesc.value = evo.desc
  } else {
    const skill = ALL_SKILLS.find(s => s.id === id)
    if (skill) {
      tooltipName.value = skill.icon + ' ' + skill.name
      tooltipDesc.value = skill.desc
    } else {
      tooltipName.value = id
      tooltipDesc.value = ''
    }
  }
  tooltipX.value = e.clientX
  // 智能定位：如果上方空间不足 80px，则在鼠标下方显示
  const spaceAbove = e.clientY
  if (spaceAbove < TOOLTIP_HEIGHT_EST + 10) {
    tooltipY.value = e.clientY + 20
  } else {
    tooltipY.value = e.clientY - TOOLTIP_HEIGHT_EST - 5
  }
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}

/** 显示纯文字 tooltip（用于 HUD 统计数据）— 带智能定位 */
function showTooltipText(e, name, desc) {
  tooltipName.value = name
  tooltipDesc.value = desc
  tooltipX.value = e.clientX
  const spaceAbove = e.clientY
  if (spaceAbove < TOOLTIP_HEIGHT_EST + 10) {
    tooltipY.value = e.clientY + 20
  } else {
    tooltipY.value = e.clientY - TOOLTIP_HEIGHT_EST - 5
  }
  tooltipVisible.value = true
}

/**
 * 构建进化基座 ID → 进化 ID 的映射表
 * e.g. { weapon_lightning: 'evo_weapon_lightning', speed: 'evo_speed', ... }
 */
const _baseToEvoMap = {}
for (const [baseId, evoDef] of Object.entries(SKILL_EVOLUTIONS)) {
  _baseToEvoMap[baseId] = evoDef.id
}

/**
 * 已获取技能的去重列表。
 * 如果有某个技能的进化（超武）已获取，则隐藏其基础版本图标，
 * 只显示超武图标（一个替换多个）。
 */
const uniqueSkills = computed(() => {
  const set = new Set(acquiredSkills.value)
  // 收集所有已拥有的进化 ID
  const ownedEvoIds = new Set()
  for (const id of set) {
    // 如果某个 skill id 本身就是进化技能 ID（如 evo_weapon_lightning）
    const isEvo = Object.values(SKILL_EVOLUTIONS).some(e => e.id === id)
    if (isEvo) ownedEvoIds.add(id)
  }
  // 过滤：如果一个技能有对应的进化已被拥有，则过滤掉该基础技能
  const result = []
  for (const id of set) {
    // 检查此 id 是否是一个基础技能，且其进化已被拥有
    const evoId = _baseToEvoMap[id]
    if (evoId && ownedEvoIds.has(evoId)) {
      // 跳过基础技能，不加入列表（进化图标会单独加入）
      continue
    }
    result.push(id)
  }
  return result
})

/** 判断某个 ID 是否是进化（超武）技能 */
function isEvoSkill(id) {
  return Object.values(SKILL_EVOLUTIONS).some(e => e.id === id)
}

/** 根据技能 ID 获取图标（支持普通技能和进化技能） */
function skillIcon(id) {
  const evo = Object.values(SKILL_EVOLUTIONS).find(e => e.id === id)
  if (evo) return evo.icon
  return ALL_SKILLS.find(s => s.id === id)?.icon || '❓'
}

/**
 * 生成技能 tooltip 文本：名称 + 描述
 * 例如："闪电链\n每 1.5 秒随机打击 3 个敌人，闪电链式传导"
 */
function skillTooltip(id) {
  // 检查是否是进化技能
  const evo = Object.values(SKILL_EVOLUTIONS).find(e => e.id === id)
  if (evo) {
    return `${evo.name}\n${evo.desc}`
  }
  // 普通技能
  const skill = ALL_SKILLS.find(s => s.id === id)
  if (skill) {
    return `${skill.name}\n${skill.desc}`
  }
  return id
}

// ===== 暂停切换 =====
function togglePause() {
  if (gameState.value === 'playing') pauseGame()
  else if (gameState.value === 'paused') resumeGame()
}

// ===== 重新开始/退出 =====
function restartGame() {
  // 重新开始: 不退出页面, 直接在原地重置游戏
  showLevelUpMenu.value = false
  saveRunProgress()
  startGame()
}
function exitToMenu() {
  // 退出到首页: 保存进度, 清除标识, 导航到首页
  saveRunProgress()
  clearGameActive()
  sessionStorage.removeItem('game_started')
  gameState.value = 'start'
  router.push('/')
}

// ===== 生命周期 =====
onMounted(() => {
  setupGameEngine(bgCanvasRef, entityCanvasRef, viewportRef)

  // 等待资源加载完成后自动开始游戏
  const unwatch = watch(assetsLoaded, (loaded) => {
    if (loaded) {
      unwatch()
      startGame()
    }
  })
  if (assetsLoaded.value) {
    startGame()
  }
})
onUnmounted(() => {
  teardownGameEngine()
})
</script>

<style scoped>
/* ===== 全局 ===== */
.game-wrapper {
  position: relative;
  width: 100vw; height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
}

.screen-shake { animation: shakeAnim var(--shake-duration, 0.15s) ease-in-out; }
@keyframes shakeAnim {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-6px, 3px); }
  20% { transform: translate(5px, -4px); }
  30% { transform: translate(-4px, 5px); }
  40% { transform: translate(3px, -3px); }
  50% { transform: translate(-5px, 2px); }
  60% { transform: translate(4px, -5px); }
  70% { transform: translate(-2px, 4px); }
  80% { transform: translate(3px, -2px); }
  90% { transform: translate(-3px, 1px); }
}

/* ===== 分层 Canvas ===== */
.canvas-container {
  position: absolute; inset: 0;
  pointer-events: none;
  background: #0f0f1a;
  z-index: 0;
}
.bg-canvas {
  position: absolute; left: 0; top: 0;
  image-rendering: auto;
  display: block;
  pointer-events: none;
  z-index: 0;
}
.canvas-viewport {
  position: absolute; left: 0; top: 0;
  overflow: hidden;
  pointer-events: auto;
  z-index: 1;
}
.canvas-viewport .entity-canvas {
  image-rendering: auto;
  display: block;
  pointer-events: none;
}

/* ===== 遮罩层通用 ===== */
.overlay-screen {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

/* ===== HUD ===== */
.hud-top {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 8px 12px;
  background: linear-gradient(180deg, rgba(0,0,0,0.5), transparent);
  z-index: 50; pointer-events: none; gap: 8px;
}
.hud-info-row {
  display: flex; align-items: center; gap: 10px;
  flex: 1; flex-wrap: wrap;
  min-width: 0; /* 防止溢出 */
}
.hud-stat {
  font-size: 13px; color: rgba(255,255,255,0.7);
  font-family: monospace;
  pointer-events: auto;
}
.hud-stat b { color: #ecf0f1; margin-left: 2px; }
.hud-exp { font-size: 11px; }
.hud-skill-icon { font-size: 16px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.3)); }
.hud-exp-bar-mini {
  width: 60px; height: 4px;
  background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;
}
.hud-exp-fill-mini {
  height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60);
  border-radius: 4px; transition: width 0.1s ease;
}
.btn-pause-icon {
  font-size: 20px; background: none; border: none;
  cursor: pointer; pointer-events: auto;
  padding: 6px; line-height: 1; color: #ecf0f1;
  transition: transform 0.15s ease;
  margin-left: auto; /* 推至最右侧 */
  flex-shrink: 0;
}
.btn-pause-icon:hover { transform: scale(1.2); }
.hud-gamepad-indicator { font-size: 16px; opacity: 0.6; }

/* ===== 技能闪烁 ===== */
.skill-flash-overlay {
  position: absolute; right: 20px; bottom: 80px;
  z-index: 60; pointer-events: none;
  animation: skillPulse 0.3s ease-out;
}
.skill-flash-label {
  font-size: 18px; color: #f1c40f; font-weight: bold;
  text-shadow: 0 0 20px rgba(241,196,15,0.8);
}
@keyframes skillPulse {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* ===== 暂停菜单 ===== */
.pause-overlay { background: rgba(0,0,0,0.6); }
.pause-panel {
  background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 30px 36px;
  min-width: 280px; text-align: center;
  animation: fadeInUp 0.25s ease-out;
}
.pause-panel h2 { color: #f1c40f; margin: 0 0 16px; font-size: 24px; }
.pause-stats p { font-size: 14px; color: rgba(255,255,255,0.6); margin: 4px 0; }
.pause-stats strong { color: #ecf0f1; }
.pause-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
.btn-pause-action {
  padding: 10px 24px; font-size: 16px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; color: #ecf0f1;
  cursor: pointer; font-family: sans-serif;
  transition: all 0.15s ease;
}
.btn-pause-action:hover { background: rgba(255,255,255,0.15); }
.btn-restart { background: rgba(241,196,15,0.15); border-color: #f1c40f; color: #f1c40f; }
.btn-restart:hover { background: rgba(241,196,15,0.25); }
.btn-exit { background: rgba(231,76,60,0.1); border-color: rgba(231,76,60,0.3); color: #e74c3c; }
.btn-exit:hover { background: rgba(231,76,60,0.2); }

/* ============================================================
   升级菜单 — 卡片式华丽弹窗
   ============================================================ */
.levelup-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6);
  z-index: 150;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.levelup-panel {
  position: relative;
  padding: 28px 32px 32px;
  min-width: 480px;
  max-width: 960px;
  text-align: center;
  animation: cardPanelIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes cardPanelIn {
  0% { opacity: 0; transform: translateY(40px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ---- 标题区 ---- */
.levelup-header {
  position: relative;
  margin-bottom: 24px;
}
.levelup-header h2 {
  color: #f1c40f;
  margin: 0;
  font-size: 32px;
  text-shadow: 0 0 30px rgba(241,196,15,0.4);
  position: relative;
  z-index: 1;
}
.levelup-sub {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  margin: 4px 0 0;
  position: relative;
  z-index: 1;
}
.levelup-sub strong { color: #f1c40f; }
.levelup-glow {
  position: absolute;
  top: -20px; left: 50%;
  transform: translateX(-50%);
  width: 200px; height: 80px;
  background: radial-gradient(ellipse, rgba(241,196,15,0.2), transparent);
  pointer-events: none;
}

/* ---- 卡片容器 ---- */
.upgrade-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: stretch;
}

/* ---- 单张卡片 ---- */
.upgrade-card {
  position: relative;
  flex: 1 1 140px;
  min-width: 130px;
  max-width: 192px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px 14px;
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: cardSlideIn 0.35s ease-out var(--card-delay, 0s) both;
  border: 1px solid rgba(255,255,255,0.08);
}

@keyframes cardSlideIn {
  0% { opacity: 0; transform: translateY(24px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* 卡片顶部彩色装饰条 */
.card-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 14px 14px 0 0;
  transition: all 0.25s ease;
}

/* ---- 分类着色 ---- */
/* stat（数值强化）- 蓝色系 */
.card-stat { border-color: rgba(52,152,219,0.2); }
.card-stat .card-accent { background: linear-gradient(90deg, #3498db, #2980b9); }
.card-stat:hover {
  background: rgba(52,152,219,0.1);
  border-color: rgba(52,152,219,0.4);
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(52,152,219,0.15);
}

/* weapon（武器）- 金色系 */
.card-weapon { border-color: rgba(241,196,15,0.2); }
.card-weapon .card-accent { background: linear-gradient(90deg, #f1c40f, #f39c12); }
.card-weapon:hover {
  background: rgba(241,196,15,0.1);
  border-color: rgba(241,196,15,0.4);
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(241,196,15,0.15);
}

/* evolution（超武进化）- 紫色系 */
.card-evolution { border-color: rgba(155,89,182,0.3); }
.card-evolution .card-accent { background: linear-gradient(90deg, #9b59b6, #8e44ad); }
.card-evolution:hover {
  background: rgba(155,89,182,0.12);
  border-color: rgba(155,89,182,0.5);
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 8px 40px rgba(155,89,182,0.25);
}

/* maxed（已满）- 灰色 */
.card-maxed { opacity: 0.5; cursor: default; }
.card-maxed:hover { transform: none !important; box-shadow: none !important; }

/* ---- 分类标签行 ---- */
.card-badge-row {
  min-height: 20px;
  margin-bottom: 2px;
  position: relative;
  z-index: 2;
}
.card-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.badge-stat { background: rgba(52,152,219,0.2); color: #5dade2; }
.badge-upgrade { background: rgba(241,196,15,0.2); color: #f1c40f; }
.badge-unlock { background: rgba(46,204,113,0.2); color: #2ecc71; }
.badge-evolution {
  background: linear-gradient(135deg, rgba(155,89,182,0.3), rgba(142,68,173,0.3));
  color: #d7bde2;
  animation: badgeGlow 1.5s ease-in-out infinite alternate;
}
@keyframes badgeGlow {
  0% { box-shadow: 0 0 6px rgba(155,89,182,0.3); }
  100% { box-shadow: 0 0 16px rgba(155,89,182,0.6); }
}

/* ---- 图标区 ---- */
.card-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
}
.card-icon {
  font-size: 34px;
  line-height: 1;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));
}
.card-evolution .card-icon {
  animation: iconPulse 1s ease-in-out infinite alternate;
}
@keyframes iconPulse {
  0% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(155,89,182,0.4)); }
  100% { transform: scale(1.1); filter: drop-shadow(0 0 16px rgba(155,89,182,0.8)); }
}
/* 超武光环 */
.card-evo-ring {
  position: absolute;
  width: 56px; height: 56px;
  border: 2px solid rgba(155,89,182,0.4);
  border-radius: 50%;
  animation: evoSpin 3s linear infinite;
}
@keyframes evoSpin {
  0% { transform: rotate(0deg); border-color: rgba(155,89,182,0.4); }
  50% { border-color: rgba(155,89,182,0.8); }
  100% { transform: rotate(360deg); border-color: rgba(155,89,182,0.4); }
}

/* ---- 名称 & 描述 ---- */
.card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  position: relative;
  z-index: 2;
}
.card-name {
  font-size: 14px;
  font-weight: bold;
  color: #ecf0f1;
}
.card-evolution .card-name {
  color: #d7bde2;
  text-shadow: 0 0 12px rgba(155,89,182,0.4);
}
.card-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  line-height: 1.35;
}

/* ---- 等级进度条 ---- */
.card-level-bar {
  width: 100%;
  margin-top: 2px;
  position: relative;
  z-index: 2;
}
.card-level-label {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  margin-bottom: 2px;
}
.card-level-track {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  overflow: hidden;
}
.card-level-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  background: linear-gradient(90deg, #f1c40f, #e67e22);
}
.card-stat .card-level-fill {
  background: linear-gradient(90deg, #3498db, #2980b9);
}

/* ---- MAX 标签 ---- */
.card-maxed-badge {
  font-size: 11px;
  font-weight: bold;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.05);
  padding: 2px 12px;
  border-radius: 6px;
  position: relative;
  z-index: 2;
}

/* ---- 悬停光效 ---- */
.card-hover-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 70%);
}
.upgrade-card:hover .card-hover-glow {
  opacity: 1;
}

/* ===== 死亡结算 ===== */
.gameover-overlay { background: rgba(0,0,0,0.7); }
.gameover-panel {
  background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 30px 36px;
  min-width: 320px; text-align: center;
  animation: fadeInUp 0.4s ease-out;
}
.gameover-panel h2 { color: #e74c3c; margin: 0 0 20px; font-size: 28px; }
.gameover-stats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.stat-block {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}
.stat-icon { font-size: 20px; width: 28px; text-align: center; }
.stat-label { flex: 1; font-size: 13px; color: rgba(255,255,255,0.5); text-align: left; }
.stat-value {
  font-size: 16px; color: #ecf0f1; font-weight: bold;
  font-family: monospace;
}
.stat-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.new-record-badge {
  display: inline-block; margin-left: 6px;
  font-size: 11px; color: #f39c12;
  animation: recordPulse 0.8s ease-in-out infinite alternate;
}
@keyframes recordPulse {
  0% { opacity: 0.7; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.1); }
}

.btn-start {
  display: inline-block; padding: 14px 48px;
  font-size: 20px; font-weight: bold; color: #1a1a2e;
  background: linear-gradient(135deg, #f1c40f, #f39c12);
  border: none; border-radius: 10px; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 20px rgba(241,196,15,0.3), 0 0 40px rgba(241,196,15,0.1);
  font-family: sans-serif; position: relative; overflow: hidden;
}
.btn-start::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
  opacity: 0; transition: opacity 0.25s ease; border-radius: inherit; pointer-events: none;
}
.btn-start:hover { transform: scale(1.08); box-shadow: 0 6px 30px rgba(241,196,15,0.5); }
.btn-start:hover::after { opacity: 1; }
.btn-start:active { transform: scale(0.96); }

/* ===== 暂停按钮：PC显示右上角，移动端显示右下角 ===== */
/* PC端：右下角暂停按钮隐藏 */
.touch-pause-btn { display: none; }
/* PC端：右上角暂停按钮显示 */
.pc-pause { display: inline; }

/* 移动端 / 触屏设备 */
@media (hover: none) and (pointer: coarse) {
  .touch-pause-btn { display: flex; }
  .pc-pause { display: none; }
}

/* ===== 触屏暂停按钮（移动端） ===== */
.touch-pause-btn {
  position: absolute;
  right: 16px;
  bottom: 24px;
  z-index: 95;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  font-size: 22px;
  color: #ecf0f1;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.touch-pause-btn:active {
  transform: scale(0.9);
  background: rgba(255,255,255,0.15);
}

/* ===== 虚拟摇杆 ===== */
.joystick-zone {
  position: absolute; inset: 0; pointer-events: none; z-index: 90;
  touch-action: none;
}
.joystick-base {
  touch-action: none;
  position: absolute;
  width: 100px; height: 100px;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
/* 静态模式（触屏）：固定于左下角，不受 JS 坐标影响 */
.joystick-base-fixed {
  left: 80px !important;
  top: auto !important;
  bottom: 80px !important;
}
.joystick-thumb {
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.25);
  border-radius: 50%;
  position: absolute; left: 50%; top: 50%;
  margin-left: -20px; margin-top: -20px;
  pointer-events: none;
}

/* 静态摇杆底座（未触摸时半透明） */
.joystick-base-static {
  opacity: 0.4;
}

/* ===== 通用动画 ===== */
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* ===== 移动端适配 ===== */
@media (max-width: 600px) {
  .hud-top { padding: 6px 8px; gap: 4px; }
  .hud-info-row { gap: 6px; }
  .hud-stat { font-size: 11px; }
  .hud-skill-icon { font-size: 13px; }
  .hud-exp-bar-mini { width: 40px; }
  .btn-pause-icon { font-size: 18px; padding: 8px; }
  .hud-gamepad-indicator { font-size: 13px; }

  .pause-panel { padding: 24px 24px; min-width: 200px; }
  .pause-panel h2 { font-size: 20px; }
  .pause-stats p { font-size: 12px; }
  .btn-pause-action { padding: 8px 18px; font-size: 14px; }

  /* 升级菜单 - 移动端竖排 */
  .levelup-panel {
    padding: 16px 12px;
    min-width: unset;
    max-width: 94vw;
  }
  .levelup-header { margin-bottom: 14px; }
  .levelup-header h2 { font-size: 22px; }
  .levelup-sub { font-size: 11px; }

  /* 2列网格，更紧凑 */
  .upgrade-cards {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    align-items: stretch;
  }
  .upgrade-card {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
    max-width: none;
    flex-direction: column;
    padding: 10px 8px 8px;
    gap: 4px;
    animation: cardSlideIn 0.3s ease-out var(--card-delay, 0s) both;
  }
  .card-accent {
    height: 3px;
    width: auto;
    top: 0; left: 0; right: 0; bottom: auto;
    border-radius: 14px 14px 0 0;
  }
  .card-icon-wrapper {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }
  .card-icon { font-size: 22px; }
  .card-evo-ring { width: 38px; height: 38px; }
  .card-info { text-align: center; gap: 1px; }
  .card-name { font-size: 11px; }
  .card-desc {
    font-size: 9px;
    /* 限制描述行数，防止卡片过高 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-level-bar { max-width: 100%; margin-top: 0; }
  .card-level-label { font-size: 8px; }
  .card-level-track { height: 3px; }
  .card-badge-row { min-height: auto; margin-bottom: 0; }
  .card-badge { font-size: 8px; padding: 1px 5px; }

  .gameover-panel { padding: 24px 20px; min-width: 260px; }
  .gameover-panel h2 { font-size: 22px; }
  .stat-block { padding: 6px 10px; gap: 6px; }
  .stat-icon { font-size: 16px; width: 22px; }
  .stat-label { font-size: 12px; }
  .stat-value { font-size: 14px; }
  .stat-sub { font-size: 10px; }

  .btn-start { padding: 12px 32px; font-size: 17px; }

  .joystick-base { width: 80px; height: 80px; }
  .joystick-base-fixed { left: 60px !important; bottom: 60px !important; }
  .joystick-thumb { width: 32px; height: 32px; margin-left: -16px; margin-top: -16px; }
}

/* ===== 暂停菜单 — 操作键位 ===== */
.pause-controls {
  margin: 12px 0;
  padding: 10px 14px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
}
.pause-controls h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #aaa;
  text-align: center;
}
.controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  font-size: 12px;
}
.control-item {
  color: #ddd;
  display: flex;
  align-items: center;
  gap: 4px;
}
.control-item kbd {
  display: inline-block;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 11px;
  font-family: inherit;
  color: #fff;
  min-width: 18px;
  text-align: center;
}
.control-label {
  color: #888;
  font-size: 11px;
  text-align: right;
}
.controls-note {
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #999;
  line-height: 1.5;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 8px;
}

/* ===== HUD 技能图标 ===== */
.hud-skill-icon {
  position: relative;
  cursor: pointer;
  font-size: 16px;
  pointer-events: auto;
}

/* 进化（超武）图标高亮发光 */
.hud-skill-icon.is-evolution {
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.7));
  animation: evo-glow 1.5s ease-in-out infinite alternate;
}
@keyframes evo-glow {
  0% { filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.4)); }
  100% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.9)); }
}

/* ===== Vue 响应式 Tooltip 浮层 ===== */
.hud-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  background: rgba(0,0,0,0.9);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  max-width: 280px;
  min-width: 150px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.hud-tooltip-name {
  color: #ffd700;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 4px;
}
.hud-tooltip-desc {
  color: #ccc;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-line;
}
</style>
