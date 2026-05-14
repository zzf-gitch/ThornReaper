/**
 * AssetLoader — 精灵图资源加载管理器
 *
 * 支持配置表驱动，可随时用"僵尸.png"替换"红色方块"。
 * 如果图片不存在，SpriteCache 会自动回退到渐变色块渲染。
 *
 * 使用范例：
 *   await AssetLoader.loadAll((total, loaded) => {
 *     console.log(`${loaded}/${total}`)
 *   })
 *   const img = AssetLoader.getImage('enemy')
 *   if (img) ctx.drawImage(img, x, y)
 */
export class AssetLoader {
  /**
   * 本项目使用 PixelArt 生成的像素画精灵渲染所有游戏对象，
   * 不需要外部图片资源。SpriteCache 会回退到像素画绘制。
   *
   * 如需替换为真实 PNG 图片，在此添加配置即可。
   */
  static config = {}

  /** Image 缓存字典 */
  static _images = {}

  /** 已加载标记 */
  static _loaded = false

  /** 总加载项数 */
  static _totalCount = 0

  /**
   * 加载所有配置的精灵图
   * @param {function} onProgress - (loaded: number, total: number) => void
   * @returns {Promise<void>}
   */
  static async loadAll(onProgress) {
    if (this._loaded) return
    const entries = Object.entries(this.config)
    this._totalCount = entries.length || 1
    let loaded = 0

    if (entries.length === 0) {
      // 无外部图片 — 标记加载完成
      this._loaded = true
      onProgress?.(1, 1)
      return
    }

    const promises = entries.map(([name, cfg]) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          this._images[name] = img
          loaded++
          onProgress?.(loaded, this._totalCount)
          resolve()
        }
        img.onerror = () => {
          // 图片不存在 — 静默忽略
          loaded++
          onProgress?.(loaded, this._totalCount)
          resolve()
        }
        img.src = cfg.path
      })
    })

    await Promise.all(promises)
    this._loaded = true
  }

  /** 获取缓存的 Image 对象，不存在返回 null */
  static getImage(name) {
    return this._images[name] || null
  }

  /** 检查某精灵图是否加载成功 */
  static hasImage(name) {
    return !!this._images[name]
  }

  /** 获取精灵配置 */
  static getConfig(name) {
    return this.config[name] || null
  }

  /** 获取总加载项数 */
  static get totalCount() {
    return this._totalCount
  }
}
