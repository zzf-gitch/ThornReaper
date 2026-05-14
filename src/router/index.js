import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import GamePage from '../pages/GamePage.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/game', name: 'game', component: GamePage },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

/**
 * 路由守卫：只允许从首页通过"开始游戏"按钮进入 /game 页面，
 * 直接地址栏输入或刷新页面都会重定向到首页。
 *
 * 标识机制：HomePage 点击"开始游戏"时写入 sessionStorage 标识，
 * 守卫检查该标识，进入后立即清除，保证仅一次有效。
 * 刷新前的数据结算由 beforeunload 事件处理。
 */
/**
 * 路由守卫：
 * 1. 进入 /game 必须有 game_started 标识（仅"开始游戏"按钮设置）。
 * 2. 在 /game 页面时禁止任何离开操作（浏览器后退、地址栏输入），
 *    只有 exitToMenu() 清除标识后才能离开。
 */
router.beforeEach((to, from) => {
  // 进入 /game 必须有标识
  if (to.name === 'game') {
    const started = sessionStorage.getItem('game_started')
    if (started !== 'true') {
      return { name: 'home' }
    }
    // 不清除标识，刷新后 sessionStorage 保留，可重新进入
  }

  // 在 /game 页面时禁止离开（除非标识已被 exitToMenu 清除）
  if (from.name === 'game') {
    const started = sessionStorage.getItem('game_started')
    if (started === 'true') {
      return false // 阻止导航
    }
  }
})

export default router
