<template>
  <div class="home-wrapper">
    <!-- ====== 标题界面 ====== -->
    <div class="overlay-screen start-screen">
      <div class="float-particles">
        <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)"></span>
      </div>
      <div class="start-content">
        <h1 class="logo">⚔️ 荆棘收割者</h1>
        <p class="subtitle">THORN REAPER</p>
        <div class="divider"></div>
        <div v-if="highScore > 0 || bestKills > 0 || bestTime > 0" class="records-area">
          <div v-if="highScore > 0" class="record-badge">🏆 最高分：<strong>{{ highScore.toLocaleString() }}</strong></div>
          <div v-if="bestKills > 0" class="record-badge">💀 最高击杀：<strong>{{ bestKills }}</strong></div>
          <div v-if="bestTime > 0" class="record-badge">⏱ 最长生存：<strong>{{ formatSeconds(bestTime) }}</strong></div>
        </div>
        <div class="controls-info">
          <div class="control-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>移动</span></div>
          <div class="control-row"><kbd>Esc</kbd><span>暂停</span></div>
          <div class="control-row"><kbd>Space</kbd><kbd>J</kbd><span>人物技能</span></div>
          <div class="control-row"><span class="auto-text">🔫 自动攻击</span></div>
        </div>

        <!-- ====== 技能介绍 ====== -->
        <div class="skills-section">
          <button class="btn-skills-toggle" @click="showSkillsPanel = !showSkillsPanel">
            <span class="toggle-icon">{{ showSkillsPanel ? '📖' : '📕' }}</span>
            <span class="toggle-label">技能图鉴</span>
            <span class="toggle-arrow">{{ showSkillsPanel ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showSkillsPanel" class="skills-panel">
            <!-- 属性技能 -->
            <div class="skill-category">
              <h3 class="skill-cat-title">📊 属性强化</h3>
              <div class="skill-grid">
                <div v-for="s in statSkills" :key="s.id" class="skill-card stat-skill">
                  <span class="skill-icon">{{ s.icon }}</span>
                  <div class="skill-card-info">
                    <span class="skill-card-name">{{ s.name }}</span>
                    <span class="skill-card-desc">{{ s.desc }}</span>
                  </div>
                  <span class="skill-card-max">Lv.{{ s.maxLevel }}</span>
                </div>
              </div>
            </div>
            <!-- 武器技能 -->
            <div class="skill-category">
              <h3 class="skill-cat-title">⚔️ 武器解锁</h3>
              <div class="skill-grid">
                <div v-for="s in weaponSkills" :key="s.id" class="skill-card weapon-skill">
                  <span class="skill-icon">{{ s.icon }}</span>
                  <div class="skill-card-info">
                    <span class="skill-card-name">{{ s.name }}</span>
                    <span class="skill-card-desc">{{ s.desc }}</span>
                  </div>
                  <span class="skill-card-max">Lv.{{ s.maxLevel }}</span>
                </div>
              </div>
            </div>
            <!-- 超武进化 -->
            <div class="skill-category">
              <h3 class="skill-cat-title">🌟 超武进化</h3>
              <div class="skill-grid">
                <div v-for="evo in evolutionList" :key="evo.id" class="skill-card evolution-skill">
                  <span class="skill-icon">{{ evo.icon }}</span>
                  <div class="skill-card-info">
                    <span class="skill-card-name">{{ evo.name }}</span>
                    <span class="skill-card-desc">{{ evo.desc }}</span>
                  </div>
                  <span class="skill-card-max-evo">进化</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="start-buttons">
          <button class="btn-start" @click="goToGame">开始游戏</button>
          <button class="btn-talent" @click="showTalentPanel = true">
            🧬 强化商店 (💰{{ gold }})
          </button>
        </div>
        <div class="debug-toggle-area">
          <button class="btn-debug-toggle" @click.stop="toggleDebugMode()">
            {{ debugMode ? '🔧 关闭调试模式' : '⚙️ 调试模式' }}
          </button>
          <div v-if="debugMode" class="debug-note">
            <span>🛠️ 调试模式已启用 (F1=无敌, F2=快速升级)</span>
          </div>
        </div>
        <p class="version">version {{ version }}</p>
      </div>
    </div>
    <!-- ====== 强化商店面板 ====== -->
    <div v-if="showTalentPanel" class="overlay-screen talent-overlay">
      <div class="talent-panel">
        <div class="talent-header">
          <div class="talent-header-glow"></div>
          <h2>🧬 强化商店</h2>
          <p class="talent-subtitle">积攒金币，永久强化你的收割者</p>
        </div>
        <div class="talent-stats">
          <div class="talent-stat-item">
            <span class="stat-icon">💰</span>
            <span class="stat-label">金币</span>
            <span class="stat-value gold-text">{{ gold }}</span>
          </div>
          <div class="talent-stat-divider"></div>
          <div class="talent-stat-item">
            <span class="stat-icon">💀</span>
            <span class="stat-label">累计击杀</span>
            <span class="stat-value">{{ totalKills }}</span>
          </div>
        </div>
        <div class="talent-list">
          <div
            v-for="t in talentDefs"
            :key="t.id"
            class="talent-item"
            :class="{
              'talent-maxed-item': (talentLevels[t.id] || 0) >= t.maxLevel,
              'talent-affordable': gold >= (t.cost[talentLevels[t.id] || 0]) && (talentLevels[t.id] || 0) < t.maxLevel
            }"
          >
            <div class="talent-item-glow"></div>
            <div class="talent-icon-wrap" :style="{ background: talentColor(t.id) }">
              <span class="talent-icon">{{ t.icon }}</span>
            </div>
            <div class="talent-info">
              <div class="talent-name-row">
                <span class="talent-name">{{ t.name }}</span>
                <span class="talent-lv-badge">Lv.{{ talentLevels[t.id] || 0 }}/{{ t.maxLevel }}</span>
              </div>
              <span class="talent-desc">{{ t.desc }}</span>
              <div class="talent-progress-bar">
                <div
                  class="talent-progress-fill"
                  :style="{ width: ((talentLevels[t.id] || 0) / t.maxLevel) * 100 + '%' }"
                ></div>
              </div>
              <div class="talent-effects">
                <span class="talent-effect-tag current">当前 {{ talentEffect(t, talentLevels[t.id] || 0) }}</span>
                <span v-if="(talentLevels[t.id] || 0) < t.maxLevel" class="talent-effect-tag next">
                  → {{ talentEffect(t, (talentLevels[t.id] || 0) + 1) }}
                </span>
              </div>
            </div>
            <div class="talent-action">
              <button
                v-if="(talentLevels[t.id] || 0) < t.maxLevel"
                class="btn-talent-upgrade"
                :disabled="gold < (t.cost[talentLevels[t.id] || 0])"
                @click="upgradeTalent(t.id)"
              >
                <span class="btn-upgrade-text">升级</span>
                <span class="btn-upgrade-cost">💰{{ t.cost[talentLevels[t.id] || 0] }}</span>
              </button>
              <div v-else class="talent-maxed-badge">
                <span>⭐ 已满级</span>
              </div>
            </div>
          </div>
        </div>
        <button class="btn-talent-close" @click="showTalentPanel = false">✕ 返回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { PersistenceManager } from '../game/PersistenceManager.js'
import {
  gameState, highScore, bestKills, bestTime,
  showTalentPanel, gold, totalKills, talentLevels,
  debugMode, formatSeconds, toggleDebugMode
} from '../composables/useGameState.js'
import { ALL_SKILLS, SKILL_EVOLUTIONS } from '../game/SkillDefs.js'

const router = useRouter()
const talentDefs = PersistenceManager.TALENTS

/** 当前版本号 */
const version = __APP_VERSION__

/** 技能介绍面板是否展开 */
const showSkillsPanel = ref(false)

/** 按分类分组的技能列表 */
const statSkills = ALL_SKILLS.filter(s => s.category === 'stat')
const weaponSkills = ALL_SKILLS.filter(s => s.category === 'weapon')
const evolutionList = Object.entries(SKILL_EVOLUTIONS).map(([baseId, evo]) => ({
  baseId,
  ...evo,
}))

function particleStyle(i) {
  const left = Math.random() * 100
  const size = 2 + Math.random() * 4
  const duration = 4 + Math.random() * 6
  const delay = Math.random() * 5
  return {
    left: left + '%',
    width: size + 'px', height: size + 'px',
    animationDuration: duration + 's',
    animationDelay: delay + 's',
  }
}

function upgradeTalent(talentId) {
  const result = PersistenceManager.upgradeTalent(talentId)
  if (result) {
    gold.value = PersistenceManager.getGold()
    talentLevels.value = { ...PersistenceManager.getTalentLevels() }
  }
}

function talentEffect(talent, level) {
  switch (talent.id) {
    case 'hp_up': return `+${20 * level} HP`
    case 'speed_up': return `+${15 * level} 移速`
    case 'dmg_up': return `+${1 * level} 伤害`
    case 'shield_up': return `${level} 层护盾`
    case 'regen': return `+${1 * level} HP/秒`
    case 'bullet_speed_up': return `+${50 * level} 弹速`
    case 'gold_bonus': return `+${level * 20}% 金币`
    case 'defense': return `-${level * 5}% 受伤`
    case 'pickup_range': return `+${level * 10}% 范围`
    default: return `Lv.${level}`
  }
}

function talentColor(id) {
  const map = {
    hp_up:          'linear-gradient(135deg, #e74c3c, #c0392b)',
    speed_up:       'linear-gradient(135deg, #3498db, #2980b9)',
    dmg_up:         'linear-gradient(135deg, #e67e22, #d35400)',
    shield_up:      'linear-gradient(135deg, #9b59b6, #8e44ad)',
    regen:          'linear-gradient(135deg, #2ecc71, #27ae60)',
    bullet_speed_up:'linear-gradient(135deg, #1abc9c, #16a085)',
    gold_bonus:     'linear-gradient(135deg, #f1c40f, #f39c12)',
    defense:        'linear-gradient(135deg, #95a5a6, #7f8c8d)',
    pickup_range:   'linear-gradient(135deg, #00cec9, #00b894)',
  }
  return map[id] || 'linear-gradient(135deg, #636e72, #2d3436)'
}

function goToGame() {
  // 写入标识，路由守卫据此放行
  sessionStorage.setItem('game_started', 'true')
  router.push('/game')
}
</script>

<style scoped>
.home-wrapper {
  position: relative;
  width: 100vw; height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
  touch-action: none;
  user-select: none;
}
.overlay-screen {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.start-screen { background: radial-gradient(ellipse at center, #16213e 0%, #0f0f23 100%); }
.start-content {
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
  max-height: 100vh;
  overflow-y: auto;
  padding: 20px 0;
  scrollbar-width: thin;
}
.start-content::-webkit-scrollbar { width: 3px; }
.start-content::-webkit-scrollbar-track { background: transparent; }
.start-content::-webkit-scrollbar-thumb { background: rgba(241,196,15,0.15); border-radius: 2px; }
.logo {
  font-size: 52px;
  color: #f1c40f;
  text-shadow: 0 0 40px rgba(241,196,15,0.5), 0 0 80px rgba(241,196,15,0.2);
  margin: 0 0 6px;
  font-family: sans-serif;
  letter-spacing: 4px;
}
.subtitle {
  font-size: 14px; color: rgba(255,255,255,0.3);
  letter-spacing: 8px; text-transform: uppercase;
  margin: 0 0 30px; font-family: monospace;
}
.divider {
  width: 80px; height: 2px;
  background: linear-gradient(90deg, transparent, #f1c40f, transparent);
  margin: 0 auto 30px;
}
.controls-info {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.control-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: rgba(255,255,255,0.6);
  font-family: sans-serif;
}
.control-row kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; height: 26px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px; padding: 0 5px;
  font-size: 12px; color: #ecf0f1; font-family: monospace;
}
.auto-text { color: #2ecc71; font-weight: bold; }
.float-particles {
  position: absolute; inset: 0; overflow: hidden;
  pointer-events: none; z-index: 0;
}
.particle {
  position: absolute;
  background: rgba(241,196,15,0.3);
  border-radius: 50%;
  animation: particleUp linear infinite;
}
@keyframes particleUp {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.3; }
  100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
}
.records-area {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px; margin-bottom: 14px;
}
.record-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 14px;
  background: linear-gradient(135deg, rgba(241,196,15,0.12), rgba(243,156,18,0.08));
  border: 1px solid rgba(241,196,15,0.25);
  border-radius: 16px;
  font-size: 13px; color: #f1c40f; font-family: sans-serif;
}
.record-badge strong { font-size: 15px; letter-spacing: 0.5px; }
.debug-toggle-area { margin-top: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.btn-debug-toggle {
  font-size: 11px; padding: 5px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px; color: rgba(255,255,255,0.45);
  cursor: pointer; font-family: monospace; transition: all 0.15s ease;
}
.btn-debug-toggle:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.25); }
.debug-note {
  padding: 4px 14px; display: inline-block;
  background: rgba(231,76,60,0.15);
  border: 1px solid rgba(231,76,60,0.3);
  border-radius: 12px; font-size: 11px; color: #e74c3c; font-family: monospace;
  animation: fadeInUp 0.4s ease-out;
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
.start-buttons { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.btn-talent {
  font-size: 14px; padding: 10px 28px;
  background: linear-gradient(135deg, #2d3436, #636e72);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px; color: #dfe6e9;
  cursor: pointer; font-family: sans-serif;
  transition: all 0.2s ease; position: relative;
}
.btn-talent:hover { background: linear-gradient(135deg, #636e72, #2d3436); border-color: #f1c40f; color: #f1c40f; }
.btn-talent:active { transform: scale(0.96); }
/* ===== 天赋面板 - 暗黑奇幻风格 ===== */
.talent-overlay {
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
}
.talent-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 1px solid rgba(241,196,15,0.2);
  border-radius: 20px;
  padding: 0;
  min-width: 420px;
  max-width: 500px;
  width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  animation: fadeInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 60px rgba(241,196,15,0.08), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
}

/* 头部 */
.talent-header {
  flex-shrink: 0;
  position: relative;
  text-align: center;
  padding: 24px 28px 16px;
  overflow: hidden;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.talent-header-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(241,196,15,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.talent-header h2 {
  margin: 0 0 4px;
  font-size: 24px;
  color: #f1c40f;
  text-shadow: 0 0 30px rgba(241,196,15,0.3);
  font-family: sans-serif;
  letter-spacing: 2px;
}
.talent-subtitle {
  margin: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  font-family: sans-serif;
}

/* 统计栏 */
.talent-stats {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 10px 28px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.talent-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
}
.stat-icon { font-size: 16px; }
.stat-label { font-size: 12px; color: rgba(255,255,255,0.4); font-family: sans-serif; }
.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #ecf0f1;
  font-family: monospace;
}
.stat-value.gold-text { color: #f1c40f; text-shadow: 0 0 8px rgba(241,196,15,0.4); }
.talent-stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.08);
}

/* 天赋列表 - 独立滚动区域 */
.talent-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
}
.talent-list::-webkit-scrollbar { width: 4px; }
.talent-list::-webkit-scrollbar-track { background: transparent; }
.talent-list::-webkit-scrollbar-thumb { background: rgba(241,196,15,0.3); border-radius: 2px; }

/* 单个天赋项 */
.talent-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  transition: all 0.2s ease;
}
.talent-item:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
  transform: translateX(2px);
}
.talent-affordable {
  border-color: rgba(241,196,15,0.2);
  background: rgba(241,196,15,0.03);
}
.talent-affordable:hover {
  border-color: rgba(241,196,15,0.4);
  box-shadow: 0 0 20px rgba(241,196,15,0.05);
}
.talent-maxed-item {
  opacity: 0.85;
  border-color: rgba(46,204,113,0.15);
  background: rgba(46,204,113,0.03);
}
.talent-item-glow {
  display: none;
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(ellipse, rgba(241,196,15,0.03) 0%, transparent 70%);
  pointer-events: none;
}
.talent-affordable .talent-item-glow { display: block; }

/* 图标容器 */
.talent-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.35);
}
.talent-icon { font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

/* 信息区 */
.talent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.talent-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.talent-name {
  font-size: 14px;
  color: #ecf0f1;
  font-weight: bold;
  font-family: sans-serif;
}
.talent-lv-badge {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 8px;
  font-family: monospace;
  white-space: nowrap;
  flex-shrink: 0;
}
.talent-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  font-family: sans-serif;
  line-height: 1.4;
}

/* 进度条 */
.talent-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}
.talent-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f1c40f, #f39c12);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.talent-maxed-item .talent-progress-fill {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

/* 效果标签行 */
.talent-effects {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.talent-effect-tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: monospace;
  line-height: 1.4;
}
.talent-effect-tag.current { color: #2ecc71; background: rgba(46,204,113,0.08); }
.talent-effect-tag.next { color: rgba(241,196,15,0.8); background: rgba(241,196,15,0.08); }

/* 操作区 */
.talent-action {
  flex-shrink: 0;
  min-width: 80px;
  text-align: center;
}
.btn-talent-upgrade {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  border: none;
  border-radius: 10px;
  color: #1a1a2e;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(241,196,15,0.2);
  width: 100%;
}
.btn-talent-upgrade:disabled {
  cursor: not-allowed;
  box-shadow: none;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.3);
}
.btn-talent-upgrade:disabled .btn-upgrade-cost {
  color: rgba(255,255,255,0.35);
  text-shadow: none;
}
.btn-talent-upgrade:not(:disabled):hover {
  transform: scale(1.06);
  box-shadow: 0 4px 16px rgba(241,196,15,0.35);
}
.btn-talent-upgrade:not(:disabled):active { transform: scale(0.96); }
.btn-upgrade-text { font-size: 11px; line-height: 1.3; }
.btn-upgrade-cost {
  font-size: 14px;
  font-weight: bold;
  color: #ffe066;
  text-shadow: 0 0 8px rgba(241,196,15,0.6), 0 0 16px rgba(241,196,15,0.3);
  line-height: 1.3;
  opacity: 1;
}
.talent-maxed-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  background: rgba(46,204,113,0.12);
  border: 1px solid rgba(46,204,113,0.25);
  border-radius: 10px;
  font-size: 11px;
  color: #2ecc71;
  font-weight: bold;
  font-family: sans-serif;
}

/* 关闭按钮 */
.btn-talent-close {
  flex-shrink: 0;
  display: block;
  margin: 4px auto 20px;
  padding: 8px 28px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  font-family: sans-serif;
  font-size: 13px;
  transition: all 0.2s ease;
}
.btn-talent-close:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.15);
}
.version {
  margin-top: 20px;
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  font-family: monospace;
}

/* ===== 技能图鉴 ===== */
.skills-section {
  margin: 6px auto 8px;
  max-width: 400px;
  width: 100%;
}
.btn-skills-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 22px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  font-family: sans-serif;
  font-size: 13px;
  transition: all 0.2s ease;
}
.btn-skills-toggle:hover {
  background: rgba(255,255,255,0.1);
  color: #ecf0f1;
  border-color: rgba(241,196,15,0.3);
}
.toggle-icon { font-size: 16px; }
.toggle-label { letter-spacing: 1px; }
.toggle-arrow { font-size: 10px; color: rgba(255,255,255,0.3); margin-left: 4px; }
.skills-panel {
  margin-top: 12px;
  animation: fadeInUp 0.3s ease-out;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}
.skills-panel::-webkit-scrollbar { width: 3px; }
.skills-panel::-webkit-scrollbar-track { background: transparent; }
.skills-panel::-webkit-scrollbar-thumb { background: rgba(241,196,15,0.25); border-radius: 2px; }
.skill-category {
  margin-bottom: 12px;
  text-align: left;
}
.skill-cat-title {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  font-family: sans-serif;
  margin: 0 0 6px 4px;
  letter-spacing: 0.5px;
}
.skill-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.skill-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  transition: all 0.15s ease;
}
.skill-card:hover {
  background: rgba(255,255,255,0.06);
  transform: translateX(3px);
}
.stat-skill { border-left: 2px solid rgba(52,152,219,0.4); }
.weapon-skill { border-left: 2px solid rgba(231,76,60,0.4); }
.evolution-skill { border-left: 2px solid rgba(241,196,15,0.5); }
.skill-icon {
  font-size: 18px;
  flex-shrink: 0;
  width: 30px;
  text-align: center;
}
.skill-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.skill-card-name {
  font-size: 12px;
  color: #ecf0f1;
  font-weight: bold;
  font-family: sans-serif;
}
.skill-card-desc {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  font-family: sans-serif;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.skill-card-max {
  font-size: 9px;
  color: rgba(255,255,255,0.25);
  font-family: monospace;
  flex-shrink: 0;
  padding: 2px 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
}
.skill-card-max-evo {
  font-size: 9px;
  color: #f1c40f;
  font-family: monospace;
  flex-shrink: 0;
  padding: 2px 6px;
  background: rgba(241,196,15,0.1);
  border: 1px solid rgba(241,196,15,0.2);
  border-radius: 6px;
}
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* ===== 移动端适配 ===== */
@media (max-width: 600px) {
  .logo {
    font-size: 32px;
    letter-spacing: 2px;
  }
  .subtitle {
    font-size: 11px;
    letter-spacing: 4px;
    margin-bottom: 18px;
  }
  .divider { margin-bottom: 18px; }
  .controls-info { margin-bottom: 10px; }
  .control-row { font-size: 12px; }
  .control-row kbd { min-width: 24px; height: 22px; font-size: 10px; }
  .btn-start { padding: 12px 32px; font-size: 17px; }
  .btn-talent { font-size: 12px; padding: 9px 20px; }
  .record-badge { font-size: 11px; padding: 3px 10px; }
  .record-badge strong { font-size: 12px; }

  /* 天赋面板移动端 */
  .talent-panel {
    min-width: 0;
    width: 92vw;
    max-width: 92vw;
    max-height: 90vh;
    border-radius: 14px;
  }
  .talent-header { padding: 18px 20px 14px; }
  .talent-header h2 { font-size: 20px; }
  .talent-subtitle { font-size: 11px; }
  .talent-stats { padding: 10px 16px; }
  .talent-stat-item { padding: 0 10px; }
  .talent-list { padding: 12px 14px; gap: 8px; }
  .talent-item { padding: 14px 12px; gap: 10px; }
  .talent-icon-wrap { width: 36px; height: 36px; }
  .talent-icon { font-size: 17px; }
  .talent-name { font-size: 12px; }
  .talent-desc { font-size: 10px; }
  .talent-lv-badge { font-size: 9px; }
  .talent-effect-tag { font-size: 9px; }
  .talent-action { min-width: 72px; }
  .btn-talent-upgrade { padding: 4px 8px; }
  .btn-upgrade-text { font-size: 10px; }
  .btn-upgrade-cost { font-size: 12px; }
  .talent-maxed-badge { font-size: 10px; padding: 4px 6px; }
  .btn-talent-close { font-size: 12px; padding: 6px 20px; margin: 2px auto 14px; }
  .stat-value { font-size: 14px; }
  .stat-label { font-size: 11px; }

  /* 技能图鉴移动端 */
  .skills-section { max-width: 90vw; }
  .btn-skills-toggle { font-size: 12px; padding: 6px 16px; }
  .skills-panel { max-height: 220px; }
  .skill-cat-title { font-size: 11px; }
  .skill-card { padding: 7px 10px; gap: 8px; }
  .skill-icon { font-size: 18px; width: 30px; }
  .skill-card-name { font-size: 12px; }
  .skill-card-desc { font-size: 10px; }
  .skill-card-max { font-size: 9px; padding: 2px 6px; }
  .skill-card-max-evo { font-size: 9px; padding: 2px 6px; }
}
</style>

