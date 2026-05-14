/**
 * BulletPool — 子弹对象池
 *
 * 避免频繁 new/splice 导致的内存 GC 抖动。
 * 预先分配 POOL_SIZE 个子弹对象，用 alive 标记复用。
 *
 * 使用范例：
 *   const pool = new BulletPool(500)
 *   const idx = pool.allocate(x, y, dirX, dirY, speed)
 *   // 遍历活跃子弹
 *   for (let i = 0; i < pool.length; i++) {
 *     const b = pool.get(i)
 *     if (!b) continue
 *     b.x += ...
 *   }
 *   // 回收
 *   pool.deallocate(idx)
 */
export class BulletPool {
  /**
   * @param {number} poolSize 最大子弹数
   */
  constructor(poolSize = 500) {
    this._poolSize = poolSize
    /** 扁平数据结构：每个子弹 7 个连续 float slot */
    this._data = new Float64Array(poolSize * 7)
    /** alive 标记（1=存活，0=死亡） */
    this._alive = new Uint8Array(poolSize)
    /** 当前存活子弹数量 */
    this.count = 0

    // 预填充索引列表（避免遍历所有池槽）
    this._aliveIndices = new Int32Array(poolSize)
    for (let i = 0; i < poolSize; i++) {
      this._aliveIndices[i] = -1
    }
  }

  /** 返回池的总容量 */
  get size() {
    return this._poolSize
  }

  /**
   * 从池中分配一颗子弹
   * @returns {number} 索引，-1 表示池满
   */
  allocate(x, y, dirX, dirY, speed, penetration = 1, radius = 5) {
    // 找第一个空闲槽（从上一分配位置开始线性探测）
    for (let i = 0; i < this._poolSize; i++) {
      if (!this._alive[i]) {
        const offset = i * 7
        this._data[offset] = x
        this._data[offset + 1] = y
        this._data[offset + 2] = dirX
        this._data[offset + 3] = dirY
        this._data[offset + 4] = speed
        this._data[offset + 5] = radius
        this._data[offset + 6] = penetration  // slot 6 = 剩余穿透次数
        this._alive[i] = 1
        this._aliveIndices[this.count] = i
        this.count++
        return i
      }
    }
    // 池满：先回收最旧子弹，再写入
    const idx = this._oldestAliveIndex()
    if (idx >= 0) {
      // 先正确 deallocate 释放计数和索引
      this._alive[idx] = 0
      this.count--
      for (let j = 0; j < this._poolSize; j++) {
        if (this._aliveIndices[j] === idx) {
          this._aliveIndices[j] = -1
          break
        }
      }
      // 再写入新数据
      const offset = idx * 7
      this._data[offset] = x
      this._data[offset + 1] = y
      this._data[offset + 2] = dirX
      this._data[offset + 3] = dirY
      this._data[offset + 4] = speed
      this._data[offset + 5] = radius
      this._data[offset + 6] = penetration
      this._alive[idx] = 1
      this._aliveIndices[this.count] = idx
      this.count++
      return idx
    }
    return -1
  }

  /**
   * 更新子弹穿透计数（游戏逻辑用）
   * @param {number} index 子弹索引
   * @param {number} pen 剩余穿透次数
   */
  setPenetration(index, pen) {
    if (index < 0 || index >= this._poolSize || !this._alive[index]) return
    this._data[index * 7 + 6] = pen
  }

  /** 标记子弹为死亡 */
  deallocate(index) {
    if (index < 0 || index >= this._poolSize) return
    if (!this._alive[index]) return
    this._alive[index] = 0
    this.count--
    // 从活跃索引列表中移除
    for (let i = 0; i < this._poolSize; i++) {
      if (this._aliveIndices[i] === index) {
        this._aliveIndices[i] = -1
        break
      }
    }
  }

  /** 获取当前第 i 个活跃子弹的快照对象（用于碰撞检测 / 绘制） */
  get(index) {
    if (index < 0 || index >= this._poolSize || !this._alive[index]) return null
    const offset = index * 7
    return {
      index,
      x: this._data[offset],
      y: this._data[offset + 1],
      dirX: this._data[offset + 2],
      dirY: this._data[offset + 3],
      speed: this._data[offset + 4],
      radius: this._data[offset + 5],
      penetration: this._data[offset + 6],
      alive: true,
    }
  }

  /**
   * 获取完整属性引用（避免对象分配）
   * 返回 { x, y, radius } 引用到 data
   */
  getRaw(index) {
    if (index < 0 || index >= this._poolSize || !this._alive[index]) return null
    const offset = index * 7
    return {
      x: () => this._data[offset],
      y: () => this._data[offset + 1],
      radius: () => this._data[offset + 5],
      speed: () => this._data[offset + 4],
    }
  }

  /** 更新所有活跃子弹位置，并自动回收越界子弹 */
  updateAll(deltaTime) {
    for (let i = 0; i < this._poolSize; i++) {
      if (this._alive[i]) {
        const offset = i * 7
        this._data[offset] += this._data[offset + 2] * this._data[offset + 4] * deltaTime
        this._data[offset + 1] += this._data[offset + 3] * this._data[offset + 4] * deltaTime

        // 帧内自动回收越界子弹（距离原点太远强制回收，避免无限飞行）
        const x = this._data[offset]
        const y = this._data[offset + 1]
        const MAX_DIST = 10000
        if (x < -MAX_DIST || x > MAX_DIST || y < -MAX_DIST || y > MAX_DIST) {
          this._alive[i] = 0
          this.count--
          for (let j = 0; j < this._poolSize; j++) {
            if (this._aliveIndices[j] === i) {
              this._aliveIndices[j] = -1
              break
            }
          }
        }
      }
    }
  }

  /** 遍历所有活跃子弹执行回调 */
  forEach(fn) {
    for (let i = 0; i < this._poolSize; i++) {
      if (this._alive[i]) {
        const offset = i * 7
        fn({
          index: i,
          x: this._data[offset],
          y: this._data[offset + 1],
          dirX: this._data[offset + 2],
          dirY: this._data[offset + 3],
          speed: this._data[offset + 4],
          radius: this._data[offset + 5],
          penetration: this._data[offset + 6],
          alive: true,
        })
      }
    }
  }

  /** 判断子弹是否越界（远距离回收） */
  isOutOfBounds(index) {
    if (index < 0 || index >= this._poolSize || !this._alive[index]) return true
    const offset = index * 7
    const x = this._data[offset]
    const y = this._data[offset + 1]
    const MAX_DIST = 10000
    return x < -MAX_DIST || x > MAX_DIST || y < -MAX_DIST || y > MAX_DIST
  }

  /**
   * 重置所有子弹（清空池）
   */
  reset() {
    this._alive.fill(0)
    this._aliveIndices.fill(-1)
    this.count = 0
  }

  /** 获取最旧活跃索引（用于池满覆盖） */
  _oldestAliveIndex() {
    for (let i = 0; i < this._poolSize; i++) {
      if (this._aliveIndices[i] >= 0) return this._aliveIndices[i]
    }
    return -1
  }
}
