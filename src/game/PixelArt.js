/**
 * PixelArt — 像素画精灵生成器
 *
 * 用 Canvas fillRect 绘制像素风格的游戏角色，
 * 替代原有的纯色方块／径向渐变圆形。
 * 每个精灵在离屏 Canvas 上预渲染，SpriteCache 直接 drawImage。
 *
 * 设计风格：8-bit 复古风，16×16 / 24×24 像素网格。
 */

export class PixelArt {
  /**
   * 生成玩家角色（32×32）— 持剑冒险者
   * @returns {HTMLCanvasElement}
   */
  static generatePlayer() {
    const SIZE = 32, S = 2 // 每个像素点 2×2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    // 按像素网格绘制
    const p = (x, y, color) => {
      ctx.fillStyle = color
      ctx.fillRect(x * S, y * S, S, S)
    }

    // === 身体用像素坐标（0~15），最后都 ×S ===
    // 为了方便，直接在 S 倍尺寸上绘制
    // 改为以原始像素坐标操作，扩大 S 倍
    const C = (x, y, w = 1, h = 1) => {
      ctx.fillRect(x * S, y * S, w * S, h * S)
    }

    // ---- 头盔/头发 (gold/brown) ----
    ctx.fillStyle = '#8B4513'
    // 头发顶部
    C(3, 0, 10, 1)   // 第0行 3-12
    C(2, 1, 12, 1)   // 第1行 2-13
    C(1, 2, 14, 1)   // 第2行 1-14

    // ---- 脸 (skin) ----
    ctx.fillStyle = '#F5C6A0'
    C(4, 3, 8, 2)    // 眼睛区域 行3-4, 4-11
    C(3, 5, 10, 2)   // 鼻子/嘴区域 行5-6, 3-12

    // ---- 眼睛 (dark) ----
    ctx.fillStyle = '#1a1a2e'
    C(5, 3, 2, 1)    // 左眼
    C(9, 3, 2, 1)    // 右眼

    // ---- 嘴 (smile) ----
    ctx.fillStyle = '#c0392b'
    C(5, 6, 6, 1)

    // ---- 身体/铠甲 (blue-gray) ----
    ctx.fillStyle = '#4A6FA5'
    C(3, 7, 10, 1)
    C(2, 8, 12, 3)   // 胸甲 行8-10

    // ---- 铠甲细节 (lighter) ----
    ctx.fillStyle = '#6B8FC4'
    C(5, 8, 6, 1)    // 胸甲中线
    C(4, 9, 8, 1)

    // ---- 金色腰带 ----
    ctx.fillStyle = '#D4A017'
    C(2, 11, 12, 1)

    // ---- 腿 (dark blue) ----
    ctx.fillStyle = '#2C3E50'
    C(3, 12, 4, 3)   // 左腿
    C(9, 12, 4, 3)   // 右腿

    // ---- 靴子 (brown) ----
    ctx.fillStyle = '#5D4037'
    C(3, 14, 4, 1)
    C(9, 14, 4, 1)
    C(2, 15, 5, 1)
    C(9, 15, 5, 1)

    // ---- 剑 (右手举剑) ----
    ctx.fillStyle = '#95a5a6' // 剑刃
    C(13, 4, 2, 6)
    ctx.fillStyle = '#D4A017' // 剑柄
    C(13, 3, 2, 1)
    C(12, 10, 4, 1)

    // ---- 披风 (red) ----
    ctx.fillStyle = '#C0392B'
    C(1, 7, 2, 4)    // 左披风
    C(13, 7, 2, 4)   // 右披风
    C(0, 10, 2, 2)
    C(14, 10, 2, 2)

    return c
  }

  /**
   * 生成默认敌人（28×28）— 绿色哥布林
   * @param {string} tintColor - 主色调覆盖
   * @returns {HTMLCanvasElement}
   */
  static generateEnemyChaser(tintColor = '#4CAF50') {
    const SIZE = 28, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 身体 (可着色) ----
    ctx.fillStyle = tintColor
    C(4, 2, 6, 2)     // 头顶
    C(3, 4, 8, 2)     // 头部
    C(2, 6, 10, 4)    // 身体
    C(3, 10, 8, 3)    // 下身

    // ---- 肚子稍浅 ----
    ctx.fillStyle = '#66BB6A'
    C(4, 7, 6, 2)

    // ---- 眼睛 (白底红瞳) ----
    ctx.fillStyle = '#fff'
    C(4, 4, 2, 2)     // 左眼白
    C(8, 4, 2, 2)     // 右眼白
    ctx.fillStyle = '#E53935'
    C(5, 5, 1, 1)     // 左瞳孔
    C(9, 5, 1, 1)     // 右瞳孔

    // ---- 嘴 (锯齿) ----
    ctx.fillStyle = '#1a1a2e'
    C(4, 7, 6, 1)
    ctx.fillStyle = '#fff'
    C(5, 7, 1, 1)     // 牙齿
    C(7, 7, 1, 1)
    C(9, 7, 1, 1)

    // ---- 小短腿 ----
    ctx.fillStyle = '#388E3C'
    C(4, 13, 3, 1)
    C(7, 13, 3, 1)

    // ---- 小尖角 ----
    ctx.fillStyle = '#795548'
    C(5, 1, 1, 2)
    C(8, 1, 1, 2)

    return c
  }

  /**
   * 生成冲锋型敌人（28×28）— 牛头恶魔
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemyCharger(tintColor = '#FF8C00') {
    const SIZE = 28, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 大弯角 ----
    ctx.fillStyle = '#8D6E63'
    C(2, 1, 2, 3)
    C(10, 1, 2, 3)
    C(1, 2, 2, 2)
    C(11, 2, 2, 2)

    // ---- 头部/身体 (橙色) ----
    ctx.fillStyle = tintColor
    C(3, 3, 8, 2)
    C(2, 5, 10, 5)   // 躯干
    C(3, 10, 8, 3)

    // ---- 胸肌高光 ----
    ctx.fillStyle = '#FFB74D'
    C(4, 6, 4, 2)

    // ---- 怒目 ----
    ctx.fillStyle = '#fff'
    C(4, 4, 3, 2)
    C(7, 4, 3, 2)
    ctx.fillStyle = '#E53935'
    C(5, 5, 1, 1)
    C(8, 5, 1, 1)
    // 眉毛 (怒)
    ctx.fillStyle = '#4E342E'
    C(3, 3, 3, 1)
    C(8, 3, 3, 1)

    // ---- 嘴 (獠牙) ----
    ctx.fillStyle = '#4E342E'
    C(4, 8, 2, 1)
    C(8, 8, 2, 1)
    ctx.fillStyle = '#fff'
    C(5, 8, 1, 1)
    C(8, 8, 1, 1)

    // ---- 腿 (粗壮) ----
    ctx.fillStyle = '#E65100'
    C(3, 13, 4, 1)
    C(7, 13, 4, 1)
    C(4, 12, 3, 1)
    C(7, 12, 3, 1)

    return c
  }

  /**
   * 生成远程型敌人（28×28）— 漂浮之眼
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemyRanger(tintColor = '#3F51B5') {
    const SIZE = 28, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 身体 (蓝紫色球体) ----
    ctx.fillStyle = tintColor
    C(2, 2, 10, 2)
    C(1, 4, 12, 4)
    C(2, 8, 10, 2)

    // ---- 中心巨眼 ----
    ctx.fillStyle = '#fff'
    C(3, 4, 8, 4)    // 眼白
    ctx.fillStyle = '#E53935'
    C(5, 5, 4, 2)    // 虹膜
    ctx.fillStyle = '#1a1a2e'
    C(6, 5, 2, 2)    // 瞳孔

    // ---- 小翅膀 ----
    ctx.fillStyle = '#5C6BC0'
    C(0, 4, 1, 2)
    C(13, 4, 1, 2)
    C(0, 6, 1, 2)
    C(13, 6, 1, 2)

    // ---- 底部触须 ----
    ctx.fillStyle = tintColor
    C(3, 10, 2, 2)
    C(9, 10, 2, 2)
    C(4, 12, 2, 1)
    C(8, 12, 2, 1)

    return c
  }

  /**
   * 生成自爆型敌人（28×28）— 炸弹魔
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemySuicider(tintColor = '#9C27B0') {
    const SIZE = 28, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 圆胖身体 ----
    ctx.fillStyle = tintColor
    C(2, 3, 10, 2)
    C(1, 5, 12, 4)
    C(2, 9, 10, 2)

    // ---- 导火索 (头顶) ----
    ctx.fillStyle = '#795548'
    C(6, 0, 2, 2)
    C(6, 2, 1, 1)
    C(8, 1, 1, 1)
    // 火花
    ctx.fillStyle = '#FF5722'
    C(8, 0, 2, 1)

    // ---- 眼睛 (惊恐) ----
    ctx.fillStyle = '#fff'
    C(3, 5, 3, 3)
    C(8, 5, 3, 3)
    ctx.fillStyle = '#1a1a2e'
    C(4, 6, 2, 1)
    C(9, 6, 2, 1)

    // ---- 嘴 (O型) ----
    ctx.fillStyle = '#1a1a2e'
    C(5, 8, 4, 1)

    // ---- 小脚 ----
    ctx.fillStyle = '#7B1FA2'
    C(3, 11, 3, 1)
    C(8, 11, 3, 1)

    // ---- 危险条纹 ----
    ctx.fillStyle = '#FF5722'
    C(0, 7, 1, 1)
    C(13, 7, 1, 1)

    return c
  }

  /**
   * 生成子弹（10×10）— 火球
   * @returns {HTMLCanvasElement}
   */
  static generateBullet() {
    const SIZE = 10, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 外发光 (半透明) ----
    ctx.fillStyle = 'rgba(255,200,50,0.2)'
    C(0, 0, 10, 10)
    ctx.fillStyle = 'rgba(255,200,50,0.4)'
    C(1, 1, 8, 8)

    // ---- 弹体 (黄-橙渐变近似) ----
    ctx.fillStyle = '#FFD54F'
    C(2, 2, 6, 6)
    ctx.fillStyle = '#FF8F00'
    C(3, 3, 4, 4)
    ctx.fillStyle = '#FF6F00'
    C(4, 4, 2, 2)

    // ---- 白芯 ----
    ctx.fillStyle = '#fff'
    C(5, 5, 1, 1)

    return c
  }

  /**
   * 生成经验球（12×12）— 绿宝石
   * @returns {HTMLCanvasElement}
   */
  static generateOrb() {
    const SIZE = 12, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 外发光 ----
    ctx.fillStyle = 'rgba(46,204,113,0.15)'
    C(0, 0, 12, 12)

    // ---- 宝石主体 ----
    ctx.fillStyle = '#27AE60'
    C(2, 1, 8, 2)
    C(1, 3, 10, 6)
    C(2, 9, 8, 2)

    // ---- 切面高光 ----
    ctx.fillStyle = '#2ECC71'
    C(3, 3, 6, 1)
    C(4, 4, 4, 1)
    ctx.fillStyle = '#A9DFBF'
    C(4, 2, 2, 1)   // 顶部高光

    // ---- 白芯 ----
    ctx.fillStyle = '#fff'
    C(5, 4, 2, 2)

    return c
  }

  /**
   * 生成 HitFlash（20×20）— 白色冲击波
   * @returns {HTMLCanvasElement}
   */
  static generateHitFlash() {
    const SIZE = 20, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 圆形冲击波 (用像素近似) ----
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    C(0, 0, 20, 20)  // 全透明底

    // 环形
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    C(1, 1, 18, 1)
    C(1, 18, 18, 1)
    C(1, 1, 1, 18)
    C(18, 1, 1, 18)

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    C(2, 2, 16, 1)
    C(2, 17, 16, 1)
    C(2, 2, 1, 16)
    C(17, 2, 1, 16)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    C(3, 3, 14, 1)
    C(3, 16, 14, 1)
    C(3, 3, 1, 14)
    C(16, 3, 1, 14)

    // ---- 四角星芒 ----
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    C(0, 9, 1, 2)    // 左
    C(19, 9, 1, 2)   // 右
    C(9, 0, 2, 1)    // 上
    C(9, 19, 2, 1)   // 下

    // ---- 中心光晕 ----
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    C(6, 6, 8, 8)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    C(8, 8, 4, 4)
    ctx.fillStyle = '#fff'
    C(9, 9, 2, 2)

    return c
  }

  /**
   * 生成盾牌兵（32×32）— 灰铁甲 + 大盾
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemyShield(tintColor = '#78909C') {
    const SIZE = 32, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 头盔 (dark gray) ----
    ctx.fillStyle = '#546E7A'
    C(4, 1, 8, 2)
    C(3, 3, 10, 1)
    // 护目缝
    ctx.fillStyle = '#FF8F00'
    C(5, 3, 2, 1)
    C(9, 3, 2, 1)
    ctx.fillStyle = '#1a1a2e'
    C(6, 3, 1, 1)
    C(10, 3, 1, 1)

    // ---- 身体 (armor) ----
    ctx.fillStyle = tintColor
    C(3, 4, 10, 1)   // 肩甲
    C(2, 5, 12, 4)   // 胸甲
    C(3, 9, 10, 3)   // 下摆

    // ---- 铠甲细节 ----
    ctx.fillStyle = '#90A4AE'
    C(4, 6, 8, 1)
    C(5, 8, 6, 1)

    // ---- 大盾 (right side) ----
    ctx.fillStyle = '#607D8B'
    C(11, 4, 5, 8)    // 盾牌主体
    ctx.fillStyle = '#78909C'
    C(12, 5, 3, 6)    // 盾牌高光
    // 盾牌边缘
    ctx.fillStyle = '#455A64'
    C(11, 3, 5, 1)
    C(11, 11, 5, 1)

    // ---- 腿 ----
    ctx.fillStyle = '#37474F'
    C(3, 12, 3, 2)
    C(8, 12, 3, 2)
    // 靴子
    ctx.fillStyle = '#455A64'
    C(2, 14, 4, 1)
    C(7, 14, 4, 1)

    return c
  }

  /**
   * 生成自爆虫（22×22）— 绿色小虫，腹部发光
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemySuicideBug(tintColor = '#66BB6A') {
    const SIZE = 22, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 虫身 (椭圆) ----
    ctx.fillStyle = tintColor
    C(3, 2, 5, 1)     // 头顶
    C(2, 3, 7, 2)     // 头部
    C(1, 5, 9, 4)     // 身体
    C(2, 9, 7, 2)     // 尾部

    // ---- 腹部发光 (黄色) ----
    ctx.fillStyle = '#FFEB3B'
    C(3, 6, 5, 2)

    // ---- 复眼 (红色) ----
    ctx.fillStyle = '#E53935'
    C(3, 3, 2, 1)
    C(6, 3, 2, 1)

    // ---- 小颚 ----
    ctx.fillStyle = '#388E3C'
    C(2, 4, 1, 1)
    C(8, 4, 1, 1)

    // ---- 触角 ----
    ctx.fillStyle = '#2E7D32'
    C(4, 0, 1, 2)
    C(6, 0, 1, 2)

    // ---- 腿 ----
    ctx.fillStyle = '#388E3C'
    C(0, 6, 1, 1)
    C(10, 6, 1, 1)
    C(0, 8, 1, 1)
    C(10, 8, 1, 1)

    return c
  }

  /**
   * 生成精英射手（28×28）— 金色华丽远程兵
   * @param {string} tintColor
   * @returns {HTMLCanvasElement}
   */
  static generateEnemyEliteRanger(tintColor = '#FFD54F') {
    const SIZE = 28, S = 2
    const c = document.createElement('canvas')
    c.width = c.height = SIZE * S
    const ctx = c.getContext('2d')
    const C = (x, y, w = 1, h = 1) => ctx.fillRect(x * S, y * S, w * S, h * S)

    // ---- 皇冠 (gold) ----
    ctx.fillStyle = '#FF8F00'
    C(4, 0, 6, 1)
    C(3, 1, 8, 1)
    ctx.fillStyle = '#FFC107'
    C(5, 0, 1, 1)
    C(7, 0, 1, 1)

    // ---- 头部 (pale) ----
    ctx.fillStyle = '#F5C6A0'
    C(4, 2, 6, 2)
    C(3, 4, 8, 1)

    // ---- 眼睛 (金色发光) ----
    ctx.fillStyle = '#FF8F00'
    C(5, 3, 1, 1)
    C(8, 3, 1, 1)
    ctx.save()
    ctx.shadowColor = '#FF8F00'
    ctx.shadowBlur = 4
    C(5, 3, 1, 1)
    C(8, 3, 1, 1)
    ctx.restore()

    // ---- 身体 (红色+金色) ----
    ctx.fillStyle = '#C62828'
    C(2, 5, 10, 2)   // 上装
    ctx.fillStyle = tintColor
    C(3, 7, 8, 1)     // 金色腰带

    // ---- 披风 (red) ----
    ctx.fillStyle = '#B71C1C'
    C(0, 5, 2, 4)
    C(12, 5, 2, 4)
    C(0, 9, 2, 2)
    C(12, 9, 2, 2)

    // ---- 下装 (dark) ----
    ctx.fillStyle = '#37474F'
    C(2, 8, 10, 2)
    C(3, 10, 8, 2)

    // ---- 法杖/弓 (gold) ----
    ctx.fillStyle = '#FF8F00'
    C(13, 4, 1, 6)   // 武器竖杆
    ctx.fillStyle = '#FFC107'
    C(13, 3, 1, 1)   // 顶端宝石
    C(13, 10, 1, 1)  // 底端

    // ---- 飘带 ----
    ctx.fillStyle = '#C62828'
    C(14, 6, 1, 2)

    return c
  }

  static generateBoss(tintColor = '#8E24AA') {
    const size = 64
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')

    // ---- 身体：暗紫色巨块 ----
    ctx.fillStyle = tintColor
    ctx.fillRect(8, 8, 48, 48)  // 48×48 主体

    // ---- 铠甲/外骨骼 (darker) ----
    ctx.fillStyle = '#4A148C'
    ctx.fillRect(12, 12, 40, 4)  // 肩甲
    ctx.fillRect(12, 44, 40, 4)  // 下摆
    ctx.fillRect(12, 20, 4, 24)  // 左护甲
    ctx.fillRect(48, 20, 4, 24)  // 右护甲

    // ---- 头盔 (gold) ----
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(20, 4, 24, 8)   // 头盔顶部
    ctx.fillStyle = '#B8860B'
    ctx.fillRect(24, 2, 16, 4)   // 头盔顶饰

    // ---- 眼睛 (red glow) ----
    ctx.fillStyle = '#FF1744'
    ctx.fillRect(22, 22, 6, 6)   // 左眼
    ctx.fillRect(36, 22, 6, 6)   // 右眼
    ctx.fillStyle = '#FF5252'
    ctx.fillRect(24, 24, 2, 2)   // 左瞳孔
    ctx.fillRect(38, 24, 2, 2)   // 右瞳孔

    // ---- 嘴巴 (dark slit) ----
    ctx.fillStyle = '#1A1A2E'
    ctx.fillRect(24, 36, 16, 3)

    // ---- 武器/权杖 (right side) ----
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(54, 12, 4, 28)  // 权杖竖杆
    ctx.fillStyle = '#E53935'
    ctx.fillRect(52, 8, 8, 6)    // 权杖顶端宝石

    // ---- 王冠 (gold) ----
    ctx.fillStyle = '#FFC107'
    ctx.fillRect(18, 0, 28, 4)
    ctx.fillRect(22, -2, 4, 6)   // 冠齿1
    ctx.fillRect(30, -3, 4, 7)   // 冠齿2
    ctx.fillRect(38, -2, 4, 6)   // 冠齿3

    // ---- 披风 (red) ----
    ctx.fillStyle = '#B71C1C'
    ctx.fillRect(8, 44, 48, 12)
    ctx.fillRect(6, 50, 52, 10)

    // ---- 装饰闪光 ----
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(16, 16, 4, 4)
    ctx.fillRect(44, 16, 4, 4)

    return c
  }

  /**
   * 绘制超级宝箱图标（用于掉落展示）
   */
  static generateSuperChest() {
    const size = 32
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')

    // ---- 宝箱主体 (brown) ----
    ctx.fillStyle = '#8D6E63'
    ctx.fillRect(4, 10, 24, 18)

    // ---- 箱盖 (darker brown) ----
    ctx.fillStyle = '#6D4C41'
    ctx.fillRect(2, 6, 28, 6)

    // ---- 金边装饰 ----
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(4, 10, 24, 2)  // 箱顶金边
    ctx.fillRect(4, 24, 24, 2)  // 箱底金边

    // ---- 锁扣 (gold) ----
    ctx.fillStyle = '#FFC107'
    ctx.fillRect(13, 8, 6, 6)   // 锁
    ctx.fillStyle = '#FF8F00'
    ctx.fillRect(15, 10, 2, 4)   // 锁孔

    // ---- 宝石装饰 ----
    ctx.fillStyle = '#E53935'
    ctx.fillRect(10, 14, 4, 4)
    ctx.fillRect(18, 14, 4, 4)

    // ---- 闪光效果 ----
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(6, 16, 2, 2)
    ctx.fillRect(22, 16, 2, 2)

    return c
  }
}
