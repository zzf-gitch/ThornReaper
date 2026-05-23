# 🎮 荆棘收割者 — VS Code 扩展使用手册

> **项目名称**：荆棘收割者 — Thorn Reaper
> **扩展文件**：[`vscode-extension/thorn-reaper.vsix`](../vscode-extension/thorn-reaper.vsix)
> **扩展版本**：v1.0.2
> **更新日期**：2026-05-23

---

## 📑 目录

1. [扩展简介](#1-扩展简介)
2. [安装方法](#2-安装方法)
3. [启动游戏](#3-启动游戏)
4. [游戏控制](#4-游戏控制)
5. [构建与更新](#5-构建与更新)
6. [常见问题](#6-常见问题)
7. [附录：构建命令详解](#7-附录构建命令详解)

---

## 1. 扩展简介

本扩展将「荆棘收割者」割草游戏打包为 VS Code 扩展，让你无需离开编辑器即可畅玩游戏。

### 扩展特性

- **⚔️ 活动栏图标**：左侧活动栏显示交叉剑图标（透明背景 + 白色剑形，VS Code 自动着色）
- **⌨️ 快捷键支持**：`Ctrl+Alt+T`（Win）/ `Cmd+Alt+T`（Mac）一键启动
- **📌 命令面板**：`F1` → 输入「荆棘收割者」→ 回车
- **📖 扩展详情**：在扩展面板中可查看完整 README，了解游戏介绍和操作说明
- **🖥️ 全屏游戏**：游戏在独立编辑器中打开，支持窗口拖拽和缩放
- **🎯 完整功能**：与 Web 版完全一致，支持所有武器、技能、天赋和存档

### 启动方式对比

| 方式 | 操作 | 适合场景 |
|------|------|----------|
| **活动栏图标** ⚔️ | 点击左侧活动栏交叉剑图标 → 侧边栏 → 点击"开始游戏" | 最直观，推荐 |
| **快捷键** | `Ctrl+Alt+T` (Win) / `Cmd+Alt+T` (Mac) | 快速启动 |
| **命令面板** | `F1` → 输入"荆棘收割者" → 回车 | 不记得快捷键时 |

---

## 2. 安装方法

### 2.1 前置要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| [Visual Studio Code](https://code.visualstudio.com/) | ≥ 1.85.0 | 代码编辑器 |

### 2.2 通过 VSIX 文件安装

> VSIX 文件位置：[`vscode-extension/thorn-reaper.vsix`](../vscode-extension/thorn-reaper.vsix)

**方法一：VS Code 界面安装（推荐）**

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 点击扩展面板右上角的 `⋯` 菜单
4. 选择 **「从 VSIX 安装...」**
5. 选择 `vscode-extension/thorn-reaper.vsix` → 点击「安装」

**方法二：命令行安装**

```bash
code --install-extension vscode-extension/thorn-reaper.vsix
```

### 2.3 验证安装

安装成功后：

1. VS Code 右下角弹出安装成功提示
2. **左侧活动栏出现 ⚔️ 交叉剑图标**（白色剑形，VS Code 会自动着色）
3. 点击 ⚔️ → 侧边栏显示游戏启动器
4. 按 `Ctrl+Alt+T` 可直接启动游戏
5. 在扩展面板中可查看游戏介绍

> **⚠️ 注意：若活动栏图标未显示，请完全重启 VS Code，不要只重载窗口**

---

## 3. 启动游戏

### 3.1 通过活动栏启动（推荐）

```
点击左侧活动栏 ⚔️ 交叉剑图标
  → 侧边栏显示游戏启动器
    → 点击 "🎮 开始游戏" 按钮
      → 主编辑器区域打开全屏游戏
```

侧边栏启动器包含：
- ⚔️ 游戏图标
- 游戏标题「荆棘收割者」与副标题「Thorn Reaper」
- 金色「开始游戏」按钮
- 快捷键提示（`Ctrl+Alt+T`）
- 支持键盘 / 鼠标 / 触摸 / 手柄

### 3.2 通过快捷键启动

| 操作系统 | 快捷键 |
|----------|--------|
| Windows | `Ctrl + Alt + T` |
| macOS | `Cmd + Alt + T` |

### 3.3 通过命令面板启动

1. 按 `F1`（或 `Ctrl+Shift+P`）打开命令面板
2. 输入 `荆棘收割者` 或 `Thorn Reaper`
3. 选择 **「游戏: 荆棘收割者 — 启动游戏」**
4. 回车确认

### 3.4 游戏操作说明

| 功能 | 键盘 | 鼠标/触摸 | 手柄 |
|------|------|-----------|------|
| 移动 | `WASD` / 方向键 | 虚拟摇杆（左下角） | 左摇杆 |
| 人物技能 | `空格` / `J` | 右下角技能按钮 | 右扳机 |
| 暂停 | `ESC` | 右上角暂停按钮 | Start 键 |
| 升级选择 | 鼠标点击 | 触摸点击 | 方向键 + A |
| 自动攻击 | 自动触发 | — | — |

---

## 4. 游戏控制

### 4.1 游戏窗口调整

游戏在 Webview 面板中运行，你可以：

- **拖拽标签**：将游戏标签拖到新的编辑器组
- **调整大小**：拖拽编辑器边框调整游戏窗口大小
- **分屏游玩**：将游戏拖到右侧，左侧继续编码

### 4.2 数据存档

游戏数据存储在 Webview 的 **localStorage** 中：

| 数据类型 | 说明 |
|----------|------|
| 最高分 | 单局最高得分 |
| 最高击杀 | 单局最多击杀数 |
| 最长生存 | 单局最长生存时间 |
| 游戏进度 | 页面关闭时自动保存 |

> **注意**：VS Code Webview 中的 localStorage 与浏览器隔离，数据不互通。

### 4.3 关闭与恢复

- **关闭游戏面板**：点击标签页的关闭按钮
- **重新打开**：按 `Ctrl+Alt+T` 或点击活动栏 ⚔️ 图标
- **关闭后进度**：游戏自动保存，重新打开回到首页

---

## 5. 构建与更新

### 5.1 构建流程概览

扩展包含三部分，修改不同的代码需要执行不同的构建步骤：

```
┌───────────────────────────────────────────────────────────────┐
│ 修改源代码 (src/) → npm run build:web  → 打包               │
│                                （构建 + 复制到 web/ 一步完成）  │
│ 修改扩展代码 (extension.js/package.json) → 只需重新打包        │
│ 修改图标 (generate-icon.cjs) → node generate-icon.cjs → 打包  │
└───────────────────────────────────────────────────────────────┘
```

> 💡 **`npm run build:web`** 是 `vscode-extension/scripts/build-web.bat` 的 npm script 别名，它内部会自动执行 `vite build` 构建游戏 + 复制产物到 `vscode-extension/web/`。**一步完成，无需手动先后执行 `npm run build` 和 `build-web.bat`。**

### 5.2 分场景构建命令

#### 📦 场景 A：只改了扩展代码（推荐新手使用）

修改了 [`extension.js`](../vscode-extension/extension.js) 或 [`package.json`](../vscode-extension/package.json)，**只需重新打包**：

```bash
cd vscode-extension && npx vsce package --out thorn-reaper.vsix
```

| 参数 | 说明 |
|------|------|
| `cd vscode-extension` | 进入扩展目录 |
| `&&` | 前一条命令成功后才执行下一条 |
| `npx vsce` | VS Code 扩展打包工具（`@vscode/vsce` 的简写） |
| `--out thorn-reaper.vsix` | 输出文件名为 `thorn-reaper.vsix` |

#### 🎮 场景 B：改了游戏源代码

修改了 `src/` 下的游戏逻辑、角色、武器等：

```bash
# 1. 构建游戏并复制到扩展目录（一步完成，等效于 npm run build + 复制）
npm run build:web

# 2. 重新打包 VSIX
cd vscode-extension && npx vsce package --out thorn-reaper.vsix

# 3. 安装到 VS Code（--force 覆盖旧版本）
code --install-extension thorn-reaper.vsix --force
```

> 💡 `npm run build:web` 在项目根目录执行。如果需要在 vscode-extension 目录下直接执行批处理文件，也可以用 `scripts\build-web.bat`（等效）。

#### 🖼️ 场景 C：改了扩展图标

修改了 [`scripts/generate-icon.cjs`](../scripts/generate-icon.cjs) 后：

```bash
# 1. 在项目根目录重新生成图标
node scripts/generate-icon.cjs

# 2. 进入扩展目录打包
cd vscode-extension && npx vsce package --out thorn-reaper.vsix
```

此命令会重新生成：
- [`icon.png`](../vscode-extension/icon.png) — 256×256 扩展市场图标
- [`icon48.png`](../vscode-extension/icon48.png) — 48×48 活动栏图标（透明背景 + 白色剑形）

### 5.3 一键构建与安装

如果你修改了游戏源码，需要**完整构建 + 打包 + 安装**，可以使用以下命令：

```bash
# ⚠️ cmd.exe（本机终端）使用分号 ; 分隔多条命令
npm run build:web; cd vscode-extension; npx @vscode/vsce package -o thorn-reaper.vsix; code --install-extension thorn-reaper.vsix --force
```

各段含义：

| 分段 | 说明 |
|------|------|
| `npm run build:web` | 构建游戏 + 复制产物到 web/（一步完成） |
| `cd vscode-extension` | 进入扩展目录 |
| `npx @vscode/vsce package -o thorn-reaper.vsix` | 打包 VSIX（`-o` = `--out` 的简写） |
| `code --install-extension thorn-reaper.vsix --force` | 安装到 VS Code（`--force` 强制覆盖旧版本） |

### 5.4 卸载扩展

```
VS Code 扩展面板 (Ctrl+Shift+X)
  → 搜索 "荆棘收割者"
    → 点击齿轮图标 ⚙
      → 选择 "卸载"
```

---

## 6. 常见问题

### Q1：安装后活动栏没有显示 ⚔️ 图标？

**原因**：VS Code 可能没有完全重启，或图标文件存在问题。

**排查步骤**：
1. **完全关闭 VS Code**（`File → Exit`），然后重新打开
2. 确认 VS Code 版本 ≥ 1.85.0（`帮助 → 关于`）
3. 如果仍然不行，尝试用快捷键 `Ctrl+Alt+T` 或 `F1` → 「荆棘收割者」启动
4. 确认扩展已激活：在扩展面板中查看「荆棘收割者」→ 确认状态为已启用

### Q2：点击"开始游戏"后页面空白？

**原因**：扩展未包含游戏构建产物。

**解决**：
```bash
cd vscode-extension && scripts\build-web.bat
```
然后重新打包安装。

### Q3：游戏卡顿或 FPS 低？

**原因**：Webview 性能受限于 VS Code 的渲染上下文。

**优化建议**：
1. 关闭其他编辑器标签页
2. 在 [`GameConfig.js`](../src/game/GameConfig.js) 中降低敌人生成密度
3. 确保没有其他占用 GPU 的应用在运行

### Q4：如何修改游戏内容？

所有游戏平衡性参数集中在 [`GameConfig.js`](../src/game/GameConfig.js)，修改后运行构建脚本即可更新扩展。

详情请参阅 [开发手册](开发手册.md)。

### Q5：两个构建命令有什么区别？

两个常见命令的对比：

| 命令 | 是否构建游戏 | 是否打包 | 是否安装 | 适用场景 |
|------|:-----------:|:--------:|:--------:|----------|
| `npm run build:web; cd vscode-extension; npx @vscode/vsce package -o thorn-reaper.vsix; code --install-extension thorn-reaper.vsix --force` | ✅ | ✅ | ✅ | 修改了游戏源码后的**完整构建+安装** |
| `cd vscode-extension && npx vsce package --out thorn-reaper.vsix` | ❌ | ✅ | ❌ | 只修改了扩展代码的**快速打包** |

### Q6：如何自定义图标？

编辑 [`scripts/generate-icon.cjs`](../scripts/generate-icon.cjs)，修改绘制参数后运行：
```bash
node scripts/generate-icon.cjs
```

> **重要**：活动栏图标必须是 **透明背景 + 白色/浅色设计**，VS Code 会自动着色。不要使用不透明背景，否则会显示灰色方块。

---

## 6. 常见问题

### Q1：安装后活动栏没有显示 ⚔️ 图标？

**原因**：VS Code 可能没有完全重启，或图标文件存在问题。

**排查步骤**：
1. **完全关闭 VS Code**（`File → Exit`），然后重新打开
2. 确认 VS Code 版本 ≥ 1.85.0（`帮助 → 关于`）
3. 如果仍然不行，尝试用快捷键 `Ctrl+Alt+T` 或 `F1` → 「荆棘收割者」启动
4. 确认扩展已激活：在扩展面板中查看「荆棘收割者」→ 确认状态为已启用

### Q2：点击"开始游戏"后页面空白？

**原因**：扩展未包含游戏构建产物。

**解决**：
```bash
cd vscode-extension && scripts\build-web.bat
```
然后重新打包安装。

### Q3：游戏卡顿或 FPS 低？

**原因**：Webview 性能受限于 VS Code 的渲染上下文。

**优化建议**：
1. 关闭其他编辑器标签页
2. 在 [`GameConfig.js`](../src/game/GameConfig.js) 中降低敌人生成密度
3. 确保没有其他占用 GPU 的应用在运行

### Q4：如何修改游戏内容？

所有游戏平衡性参数集中在 [`GameConfig.js`](../src/game/GameConfig.js)，修改后运行构建脚本即可更新扩展。

详情请参阅 [开发手册](开发手册.md)。

### Q5：两个构建命令有什么区别？

| 命令 | 是否构建游戏 | 是否打包 | 是否安装 | 适用场景 |
|------|:-----------:|:--------:|:--------:|----------|
| `npm run build:web; cd vscode-extension; npx @vscode/vsce package -o thorn-reaper.vsix; code --install-extension thorn-reaper.vsix --force` | ✅ | ✅ | ✅ | 修改了游戏源码后的**完整构建+安装** |
| `cd vscode-extension && npx vsce package --out thorn-reaper.vsix` | ❌ | ✅ | ❌ | 只修改了扩展代码的**快速打包** |

### Q6：如何自定义图标？

编辑 [`scripts/generate-icon.cjs`](../scripts/generate-icon.cjs)，修改绘制参数后运行：
```bash
node scripts/generate-icon.cjs
```

> **重要**：活动栏图标必须是 **透明背景 + 白色/浅色设计**，VS Code 会自动着色。不要使用不透明背景，否则会显示灰色方块。

---

## 7. 附录：构建命令详解

### 7.1 两个常见命令的完整对比

#### 命令 A：完整构建 + 安装（用于修改游戏后）

```bash
npm run build:web; cd vscode-extension; npx @vscode/vsce package -o thorn-reaper.vsix; code --install-extension thorn-reaper.vsix --force
```

- **分隔符 `;`**：cmd.exe 的顺序执行符，无论上一条是否成功都执行下一条
- **`npm run build:web`**：一步完成构建游戏 + 复制到 `web/`（内部调用 `build-web.bat`，该脚本自动执行 `vite build` + 复制 `dist/` → `web/`）
- **`npx @vscode/vsce`**：使用完整的 npm 包名 `@vscode/vsce`
- **`-o`**：`--out` 的简写形式
- **`code --install-extension ... --force`**：自动安装到 VS Code（`--force` 强制覆盖）

#### 命令 B：仅快速打包（只改了扩展代码后）

```bash
cd vscode-extension && npx vsce package --out thorn-reaper.vsix
```

- **分隔符 `&&`**：条件执行符，只有 `cd` 成功后才执行打包
- **`npx vsce`**：使用工具短名 `vsce`（npx 自动解析）
- **`--out`**：详细参数名形式
- **不安装**：只生成 `.vsix` 文件，需要手动通过扩展面板安装

### 7.2 生成图标详解

活动栏图标的设计原理：

```bash
node scripts/generate-icon.cjs
```

生成过程：
1. 创建 48×48 全透明画布
2. 用白色绘制两把交叉的剑（25° 夹角）
3. 剑尖到剑柄渐变透明度（剑尖更亮）
4. 交叉点绘制白色菱形宝石
5. 保存为 RGBA PNG（非透明像素仅占 ~15%）

> **为什么必须是透明背景？** VS Code 活动栏会对图标进行主题着色。白色形状 + 透明背景 = VS Code 正确着色显示。不透明背景 = 整个区域被当作灰色方块。

---

> 📝 **最后提示**：
> - 扩展安装在 VS Code 扩展目录，卸载后不会影响项目源码
> - 每次修改游戏代码后，需要重新构建和打包
> - 游戏性能受限于 VS Code Webview，建议在独立浏览器中获得最佳体验
> - 扩展图标为 ⚔️ 交叉剑设计，透明背景 + 白色剑形，由 VS Code 自动主题着色
