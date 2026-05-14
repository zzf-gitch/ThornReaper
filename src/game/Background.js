/**
 * Background — 无限过程化视差滚动背景系统
 *
 * 使用网格哈希（Grid Hashing）实现无限世界：
 * 根据相机位置动态生成可见区域的装饰元素，无论玩家走到哪里都有背景。
 * 每个网格单元用确定性的哈希函数决定其 tile 内容（位置/颜色/类型），
 * 因此同一位置总是生成相同的背景元素（可复现）。
 *
 * 三层视差：
 * - 远层 (0.2x)：半透明云朵 / 雾气
 * - 中层 (0.5x)：山丘轮廓
 * - 近层 (0.8x)：草地 / 碎石
 */

const CELL_SIZE = 300          // 每个网格单元的大小（像素）
const RENDER_RADIUS = 2        // 相机周围渲染的网格圈数
const MARGIN = 100             // 屏幕裁剪边距

/**
 * 简易哈希函数：对 (x, y, seed) 三元组生成 0~1 的伪随机数
 */
function hash(x, y, seed) {
  // 使用位运算混合整数坐标，保证分布均匀
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0
  h = ((h ^ (h >> 13)) * 1274126177) | 0
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
}

/**
 * 对 (x, y, seed) 生成的伪随机数，映射到 [min, max)
 */
function hashRange(x, y, seed, min, max) {
  return hash(x, y, seed) * (max - min) + min
}

/**
 * 从哈希值中随机选择一个数组元素
 */
function hashPick(x, y, seed, arr) {
  const idx = Math.floor(hash(x, y, seed + 999) * arr.length)
  return arr[idx]
}

export class Background {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    // LRU 缓存：避免每帧重复生成相同 tile
    this._cache = new Map()
    this._cacheMaxSize = 200

    // 每层的种子偏移（保证三层互不干扰）
    this._seeds = { far: 12345, mid: 67890, near: 111213 }

    // 每层速度倍率
    this.layers = [
      { speed: 0.2, label: 'far' },
      { speed: 0.5, label: 'mid' },
      { speed: 0.8, label: 'near' },
    ]
  }

  /**
   * 为指定网格单元和层生成 tile 数组
   * @param {number} gx 网格 X
   * @param {number} gy 网格 Y
   * @param {'far'|'mid'|'near'} layer
   * @returns {Array}
   */
  _generateCellTiles(gx, gy, layer) {
    const seed = this._seeds[layer]
    const tiles = []
    const baseX = gx * CELL_SIZE
    const baseY = gy * CELL_SIZE

    // 每个网格内生成 2~5 个装饰元素
    const count = Math.floor(hashRange(gx, gy, seed, 2, 6))

    for (let i = 0; i < count; i++) {
      // 用 i 作为额外种子，保证同一网格内每个 tile 位置不同
      const ix = gx * 10000 + gy * 100 + i
      const ox = hashRange(ix, gy, seed, 0, CELL_SIZE)     // 网格内偏移 X
      const oy = hashRange(gx, ix, seed + 1, 0, CELL_SIZE) // 网格内偏移 Y
      const worldX = baseX + ox
      const worldY = baseY + oy

      let tile

      if (layer === 'far') {
        const colors = [
          'rgba(180,210,255,0.25)',
          'rgba(200,220,255,0.2)',
          'rgba(160,200,240,0.3)',
          'rgba(220,230,255,0.15)',
        ]
        const blobCount = Math.floor(hashRange(ix, gy, seed + 2, 3, 6))
        const blobs = Array.from({ length: blobCount }, (_, bi) => ({
          ox: hashRange(ix + bi, gy, seed + 3, -15, 15),
          oy: hashRange(gx, ix + bi, seed + 4, -8, 8),
          r: hashRange(ix + bi, gy + bi, seed + 5, 6, 18),
        }))
        tile = {
          x: worldX, y: worldY,
          color: hashPick(ix, gy, seed + 6, colors),
          type: 'cloud',
          blobs,
        }
      } else if (layer === 'mid') {
        const isHill = hash(ix, gy, seed + 7) < 0.6
        if (isHill) {
          const colors = ['#1e2a4a', '#1a2444', '#22305a', '#182040']
          tile = {
            x: worldX, y: worldY,
            size: hashRange(ix, gy, seed + 8, 50, 120),
            h: hashRange(ix, gy, seed + 9, 25, 60),
            color: hashPick(ix, gy, seed + 10, colors),
            type: 'hill',
          }
        } else {
          // 小灌木丛
          const colors = ['#1e3a2a', '#2a4a3a', '#18302a']
          tile = {
            x: worldX, y: worldY,
            size: hashRange(ix, gy, seed + 11, 8, 20),
            color: hashPick(ix, gy, seed + 12, colors),
            type: 'bush',
            rotation: hash(ix, gy, seed + 13) * Math.PI * 2,
          }
        }
      } else {
        // 近层
        const isRock = hash(ix, gy, seed + 14) < 0.35
        if (isRock) {
          const colors = ['#3a3a4e', '#4a4a5e', '#2e2e42', '#50506a']
          tile = {
            x: worldX, y: worldY,
            size: hashRange(ix, gy, seed + 15, 4, 14),
            color: hashPick(ix, gy, seed + 16, colors),
            type: 'rock',
            rotation: hash(ix, gy, seed + 17) * Math.PI * 2,
          }
        } else {
          const colors = ['#2a4a2a', '#3a5a3a', '#2e5030', '#4a6a4a']
          tile = {
            x: worldX, y: worldY,
            size: hashRange(ix, gy, seed + 18, 3, 9),
            color: hashPick(ix, gy, seed + 19, colors),
            type: 'grass',
            rotation: hash(ix, gy, seed + 20) * Math.PI * 2,
          }
        }
      }

      tiles.push(tile)
    }

    return tiles
  }

  /**
   * 获取或生成指定网格 + 层的 tiles（带 LRU 缓存）
   */
  _getCellTiles(gx, gy, layer) {
    const key = `${layer}:${gx},${gy}`
    if (this._cache.has(key)) {
      return this._cache.get(key)
    }
    const tiles = this._generateCellTiles(gx, gy, layer)
    if (this._cache.size >= this._cacheMaxSize) {
      // 删除第一个（最简单的 LRU 策略）
      const firstKey = this._cache.keys().next().value
      this._cache.delete(firstKey)
    }
    this._cache.set(key, tiles)
    return tiles
  }

  /**
   * 每帧绘制背景
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX 相机世界 X
   * @param {number} cameraY 相机世界 Y
   */
  draw(ctx, cameraX, cameraY) {
    // 计算相机在世界坐标下的可见网格范围
    const camCellX = Math.floor((cameraX) / CELL_SIZE)
    const camCellY = Math.floor((cameraY) / CELL_SIZE)

    // 计算可见屏幕区域（世界坐标），用于精确裁剪
    const viewLeft = cameraX - MARGIN
    const viewRight = cameraX + this.canvasWidth + MARGIN
    const viewTop = cameraY - MARGIN
    const viewBottom = cameraY + this.canvasHeight + MARGIN

    ctx.save()

    for (const layer of this.layers) {
      const speed = layer.speed
      const offsetX = -cameraX * speed
      const offsetY = -cameraY * speed

      // 遍历相机周围 RENDER_RADIUS 圈的网格
      for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
        for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
          const gx = camCellX + dx
          const gy = camCellY + dy

          const tiles = this._getCellTiles(gx, gy, layer.label)
          for (const tile of tiles) {
            // 将世界坐标 tile 转为屏幕坐标（视差偏移后）
            const sx = tile.x + offsetX
            const sy = tile.y + offsetY

            // 屏幕裁剪：只绘制可见区域
            if (sx < -MARGIN || sx > this.canvasWidth + MARGIN ||
                sy < -MARGIN || sy > this.canvasHeight + MARGIN) {
              continue
            }

            this._drawTile(ctx, tile, sx, sy)
          }
        }
      }
    }

    ctx.restore()
  }

  /**
   * 根据 tile 类型绘制不同形状
   */
  _drawTile(ctx, tile, sx, sy) {
    if (tile.type === 'cloud') {
      ctx.save()
      ctx.globalAlpha = 0.25
      for (const blob of tile.blobs) {
        ctx.beginPath()
        ctx.arc(sx + blob.ox, sy + blob.oy, blob.r, 0, Math.PI * 2)
        ctx.fillStyle = tile.color
        ctx.fill()
      }
      ctx.restore()
    } else if (tile.type === 'hill') {
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.ellipse(sx, sy + tile.h * 0.3, tile.size / 2, tile.h, 0, 0, Math.PI * 2)
      ctx.fillStyle = tile.color
      ctx.fill()
      ctx.restore()
    } else if (tile.type === 'bush') {
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.translate(sx, sy)
      ctx.rotate(tile.rotation)
      ctx.fillStyle = tile.color
      ctx.beginPath()
      ctx.arc(0, 0, tile.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else if (tile.type === 'rock') {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.translate(sx, sy)
      ctx.rotate(tile.rotation)
      ctx.fillStyle = tile.color
      const hw = tile.size / 2
      ctx.beginPath()
      ctx.roundRect(-hw, -hw * 0.6, tile.size, tile.size * 0.8, 2)
      ctx.fill()
      ctx.restore()
    } else if (tile.type === 'grass') {
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.translate(sx, sy)
      ctx.rotate(tile.rotation)
      ctx.strokeStyle = tile.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -tile.size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -tile.size * 0.5)
      ctx.lineTo(tile.size * 0.4, -tile.size * 0.7)
      ctx.stroke()
      ctx.restore()
    }
  }

  /**
   * 窗口大小变更时更新逻辑尺寸
   */
  resize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
  }
}
