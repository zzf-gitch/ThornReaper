# ⚔️ 荆棘收割者 — Thorn Reaper

<div align="center">

![版本](https://img.shields.io/badge/version-1.0.2-blue.svg)
![许可证](https://img.shields.io/badge/license-MIT-green.svg)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite)
![Electron](https://img.shields.io/badge/Electron-42.3-47848F?logo=electron)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-007ACC?logo=visual-studio-code)

**「荆棘收割者」是一款受《吸血鬼幸存者》启发的 Survivor-like 割草游戏。**  
在无尽的敌人浪潮中生存下去，击败敌人获取经验，解锁强力技能与武器，挑战极限！

<p align="center">
  <strong>🌐 三端畅玩 | 🔫 6 种独特武器 | ⚡ 8 种技能进化 | 🎮 键盘/鼠标/触摸/手柄</strong>
</p>

</div>

---

## 📋 目录

- [⚔️ 荆棘收割者 — Thorn Reaper](#️-荆棘收割者--thorn-reaper)
  - [📋 目录](#-目录)
  - [🎮 游戏简介](#-游戏简介)
    - [核心玩法](#核心玩法)
  - [🕹️ 操作方式](#️-操作方式)
  - [🌐 一、Web 网页端](#-一web-网页端)
    - [在线游玩（GitHub Pages）](#在线游玩github-pages)
    - [本地运行开发服务器](#本地运行开发服务器)
      - [前置要求](#前置要求)
      - [克隆并运行](#克隆并运行)
      - [其他启动方式](#其他启动方式)
    - [构建生产版本](#构建生产版本)
    - [部署到 GitHub Pages](#部署到-github-pages)
  - [🖥️ 二、Electron 桌面端（Windows）](#️-二electron-桌面端windows)
    - [下载安装程序](#下载安装程序)
      - [安装方法](#安装方法)
    - [从源码构建桌面端](#从源码构建桌面端)
      - [开发模式运行 Electron](#开发模式运行-electron)
      - [构建配置说明](#构建配置说明)
  - [🧩 三、VS Code 扩展端](#-三vs-code-扩展端)
    - [安装方式](#安装方式)
      - [方式一：从 VS Code 扩展市场安装（推荐）](#方式一从-vs-code-扩展市场安装推荐)
      - [方式二：从 VSIX 文件安装](#方式二从-vsix-文件安装)
    - [启动游戏](#启动游戏)
    - [构建扩展](#构建扩展)
      - [前置条件](#前置条件)
      - [场景 A：修改了游戏源代码（`src/` 目录）](#场景-a修改了游戏源代码src-目录)
      - [场景 B：只修改了扩展代码（`extension.js` / `package.json`）](#场景-b只修改了扩展代码extensionjs--packagejson)
      - [一键完整构建 + 安装](#一键完整构建--安装)
    - [发布到市场](#发布到市场)
      - [方式 A：网页上传 VSIX（推荐，无需 PAT）](#方式-a网页上传-vsix推荐无需-pat)
      - [方式 B：命令行发布](#方式-b命令行发布)
  - [🎯 游戏特色详解](#-游戏特色详解)
    - [6 种武器系统](#6-种武器系统)
    - [技能进化（超武）系统](#技能进化超武系统)
    - [8 种技能联动](#8-种技能联动)
    - [8 种敌人类型](#8-种敌人类型)
    - [局外成长（天赋树）](#局外成长天赋树)
  - [📁 项目结构](#-项目结构)
  - [🛠️ 技术栈](#️-技术栈)
    - [核心设计原则](#核心设计原则)
  - [⚙️ 开发指南](#️-开发指南)
    - [前置要求](#前置要求-1)
    - [快速开始](#快速开始)
    - [常用命令](#常用命令)
    - [平衡性修改](#平衡性修改)
  - [📄 许可证](#-许可证)

---

## 🎮 游戏简介

| 项目 | 说明 |
|------|------|
| **游戏名称** | 荆棘收割者 — Thorn Reaper |
| **当前版本** | v1.0.2 |
| **游戏类型** | Survivor-like 割草游戏 |
| **技术栈** | Vue 3 + Vite + Canvas 2D（纯原生渲染，无游戏引擎） |
| **数据存储** | localStorage（无后端服务，数据完全在本地） |
| **音效引擎** | Web Audio API（程序化合成音效，无外部音频文件） |
| **目标平台** | Web（桌面/移动端） + Electron（Windows 桌面） + VS Code 扩展 |

### 核心玩法

- 🎯 **自动攻击**：角色自动射击，专注走位即可
- 🔄 **升级成长**：每升一级选择新技能或强化已有技能
- 💀 **生存挑战**：敌人越来越强，你能撑多久？
- 💰 **局外成长**：获取金币，升级天赋，让下次开局更强

---

## 🕹️ 操作方式

| 功能 | 键盘 | 鼠标/触摸 | 手柄 |
|------|------|-----------|------|
| **移动** | `W` `A` `S` `D` / 方向键 | 虚拟摇杆（左下角） | 左摇杆 |
| **人物技能** | `空格` / `J` | 右下角技能按钮 | 右扳机 |
| **暂停** | `ESC` | 右上角暂停按钮 | Start 键 |
| **升级选择** | 鼠标点击 | 触摸点击 | 方向键 + A |

---

## 🌐 一、Web 网页端

### 在线游玩（GitHub Pages）

> 项目部署后，可通过 GitHub Pages 直接在线游玩，无需安装任何软件。

访问地址：**[https://your-username.github.io/thorn-reaper/](https://your-username.github.io/thorn-reaper/)**

### 本地运行开发服务器

#### 前置要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| [Node.js](https://nodejs.org/) | ≥ 18.0 | JavaScript 运行时（推荐 LTS 版） |
| npm | 随 Node.js 自带 | 包管理器 |
| [Git](https://git-scm.com/downloads) | ≥ 2.30 | 版本控制（如需克隆仓库） |

验证安装：

```bash
node --version       # 应输出 v18.0+
npm --version        # 应输出 9.0+
git --version        # 应输出 git 2.30+
```

#### 克隆并运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/thorn-reaper.git
cd thorn-reaper

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认端口 8080）
npm run dev
```

启动后浏览器自动打开 **[http://localhost:8080](http://localhost:8080)**，游戏即可游玩。

> 💡 开发服务器支持热更新（HMR），修改 `src/` 下的文件后浏览器自动刷新。

#### 其他启动方式

```bash
# 使用 Vite 默认端口（5173）启动
npx vite

# 指定自定义端口
npx vite --port 3000

# 预览构建后的生产版本
npm run preview
```

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录：

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-xxxxxx.css    # 压缩后的 CSS（约 22KB）
    └── index-xxxxxx.js     # 压缩后的 JS（约 184KB）
```

构建完成后可以用任意静态服务器部署。

### 部署到 GitHub Pages

```bash
# 一键构建并部署到 gh-pages 分支
npm run deploy
```

确保在 [`vite.config.js`](vite.config.js) 中已正确配置 `base: './'`（已默认配置）。

---

## 🖥️ 二、Electron 桌面端（Windows）

### 下载安装程序

> 构建后的安装程序位于 [`release/`](release/) 目录。

| 文件 | 说明 |
|------|------|
| `Thorn Reaper Setup x.x.x.exe` | Windows 安装程序（NSIS 打包） |
| `Thorn Reaper x.x.x.exe` | 便携版（免安装，直接运行） |

#### 安装方法

1. 运行 `Thorn Reaper Setup x.x.x.exe`
2. 选择安装目录（默认 `C:\Program Files\Thorn Reaper\`）
3. 选择是否创建桌面快捷方式
4. 点击「安装」完成
5. 安装完成后从开始菜单或桌面快捷方式启动游戏

> 安装程序基于 [electron-builder NSIS](https://www.electron.build/configuration/nsis) 打包，支持自定义安装路径。

### 从源码构建桌面端

```bash
# 一键构建（Vite 构建 + electron-builder 打包 + 设置图标）
npm run electron:build
```

构建过程将依次执行：

1. **Vite 构建前端**：`npx vite build` — 构建 Web 资源到 `dist/`
2. **electron-builder 打包**：`npx electron-builder build --win --x64` — 打包为 Windows 安装程序
3. **设置 exe 图标**：自动为生成的 `.exe` 文件设置应用图标

构建产物输出到 [`release/`](release/) 目录。

#### 开发模式运行 Electron

```bash
# 同时启动 Vite 开发服务器 + Electron 窗口（热更新）
npm run electron:dev
```

> 开发模式下，Electron 窗口加载 Vite 开发服务器（`http://localhost:5173`），支持热更新。

#### 构建配置说明

Electron 构建配置位于 [`package.json`](package.json) 的 `"build"` 字段：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `appId` | `com.zzf.app` | 应用唯一标识符 |
| `productName` | `Thorn Reaper` | 产品名称 |
| `win.target` | `nsis` | Windows 安装包格式 |
| `win.arch` | `x64`, `ia32` | 支持的架构 |
| `nsis.oneClick` | `false` | 允许自定义安装选项 |
| `nsis.allowToChangeInstallationDirectory` | `true` | 允许用户更改安装路径 |

---

## 🧩 三、VS Code 扩展端

**在 VS Code 中直接游玩！无需离开编辑器，即刻开玩！**

扩展文件位置：[`vscode-extension/thorn-reaper.vsix`](vscode-extension/thorn-reaper.vsix)

### 安装方式

#### 方式一：从 VS Code 扩展市场安装（推荐）

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索「荆棘收割者」或「Thorn Reaper」
4. 点击「安装」按钮
5. 安装完成后，按 `Ctrl+Alt+T` 即可开始游戏

> 市场安装版本会自动接收更新，无需手动操作。

#### 方式二：从 VSIX 文件安装

```bash
# 命令行安装
code --install-extension vscode-extension/thorn-reaper.vsix

# 或者强制覆盖旧版本
code --install-extension vscode-extension/thorn-reaper.vsix --force
```

也可以在 VS Code 中手动安装：

1. 打开 VS Code，按 `Ctrl+Shift+X` 打开扩展面板
2. 点击面板右上角的 `···` → 「从 VSIX 安装...」
3. 选择 `vscode-extension/thorn-reaper.vsix` 文件
4. 安装完成后即可使用

### 启动游戏

安装后可通过以下任意方式启动：

| 方式 | 操作 |
|------|------|
| 🎯 **活动栏图标** | 点击左侧活动栏的 ⚔️ 交叉剑图标 → 侧边栏 → 点击「🎮 开始游戏」 |
| ⌨️ **快捷键** | `Ctrl+Alt+T`（Windows） / `Cmd+Alt+T`（macOS） |
| 📋 **命令面板** | `F1` 或 `Ctrl+Shift+P` → 输入「荆棘收割者」→ 回车 |

### 构建扩展

#### 前置条件

- 已安装项目依赖：在项目根目录执行 `npm install`

#### 场景 A：修改了游戏源代码（`src/` 目录）

```bash
# 1. 构建游戏并复制到扩展目录（一步完成）
npm run build:web

# 2. 打包为 VSIX
cd vscode-extension && npx vsce package --out thorn-reaper.vsix

# 3. 安装到 VS Code（--force 强制覆盖旧版本）
code --install-extension thorn-reaper.vsix --force
```

#### 场景 B：只修改了扩展代码（`extension.js` / `package.json`）

```bash
# 只需重新打包，不需要构建游戏
cd vscode-extension && npx vsce package --out thorn-reaper.vsix
```

#### 一键完整构建 + 安装

```bash
npm run build:web; cd vscode-extension; npx @vscode/vsce package -o thorn-reaper.vsix; code --install-extension thorn-reaper.vsix --force
```

### 发布到市场

> 详细发布指南请参阅 [`vscode-extension/PUBLISH.md`](vscode-extension/PUBLISH.md)

#### 方式 A：网页上传 VSIX（推荐，无需 PAT）

1. 访问 [https://aka.ms/vscode-create-publisher](https://aka.ms/vscode-create-publisher) 创建 Publisher
2. 执行 `npm run build:web` 构建游戏资源
3. 执行 `npm run package` 打包 VSIX
4. 访问 [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
5. 选择 Publisher → 点击 `...` → **Upload VSIX** → 上传 `.vsix` 文件

#### 方式 B：命令行发布

```bash
# 1. 创建 Publisher（仅首次，通过网页）
# 2. 构建游戏资源
npm run build:web

# 3. 登录（首次需要 PAT Token）
npx vsce login thorn-reaper-dev

# 4. 发布（补丁版本，自动 +1）
npm run publish:patch

# 或发布指定版本
npm run publish
```

---

## 🎯 游戏特色详解

### 6 种武器系统

| 武器 | 名称 | 特点 | 进化（超武） | 进化效果 |
|------|------|------|-------------|----------|
| 🔪 | **旋转飞刀** | 无 CD 环绕旋转，每把飞刀独立伤害敌人 | 🌀 无尽回旋 | 飞刀翻倍，范围 +50%，持续切割 |
| ⚡ | **闪电链** | 链式跳跃传导，打击范围内多个敌人 | ⚡ 雷霆风暴 | 无 CD，额外范围雷击 |
| 💣 | **地雷** | 走过路径自动放置，敌人触发爆炸 | 💥 炼狱雷场 | 地雷永久存在，范围翻倍，连锁爆炸 |
| 🔫 | **自动手枪** | 自动锁定最近敌人发射直线子弹 | 🔫 审判之枪 | 子弹翻倍，伤害 +3，全屏攻击 |
| 🗡️ | **环绕飞剑** | 多把飞剑环绕旋转，独立命中冷却 | ⚔️ 万剑归宗 | 飞剑翻倍，自动追踪敌人 |
| 🌩️ | **随机落雷** | 预警后落雷，AOE 范围伤害 | 🌩️ 天雷灭世 | 无延迟，范围翻倍，附带眩晕 |

### 技能进化（超武）系统

当技能达到最大等级后，下一次升级菜单中会出现进化选项（金框高亮）。

| 基础技能 | 进化名称 | 效果 |
|----------|----------|------|
| ⚡ 移动加速 | 🌪️ 疾风步 | 移速 +40%，20% 闪避率 |
| 🚀 子弹加速 | 🌌 贯穿全屏 | 子弹速度翻倍，无限射程 |
| 🔫 双发 | 🌀 弹幕风暴 | 子弹数 +5，射速 +50% |
| 🗡️ 穿透 | 🗡️ 无限穿透 | 子弹可无限穿透 |
| ⚡ 速射 | 🔥 机关枪 | 射速翻倍 |
| 🔵 巨弹 | 🔴 巨型弹 | 体积翻倍，伤害 +3 |
| 🔥 伤害强化 | ☠️ 毁灭之力 | 伤害 +8 |
| 🩸 生命偷取 | 🧛 鲜血渴望 | 吸血翻倍，低血额外 +20% |

### 8 种技能联动

特定技能组合触发额外效果：

| 联动 | 需求技能 | 效果 |
|------|----------|------|
| 🔥 烈焰穿透 | 火 + 穿透 | 穿透路径留下燃烧地面，3 DPS 持续 2s |
| ❄️ 冰爆 | 冰 + 爆炸 | 爆炸范围减速 50% 持续 2s |
| ⚡ 电弧 | 雷 + 双发 | 双发子弹 40% 概率连锁 |
| 🔥 焚化 | 火 + 伤害强化 | 伤害附加灼烧，2 DPS 持续 3s |
| ❄️ 寒冰护甲 | 冰 + 护盾 | 护盾每 5 秒脉冲冻结附近敌人 |
| ⚡ 风暴 | 雷 + 速射 | 速射子弹连锁概率翻倍 |
| 🔥 烈焰新星 | 死亡新星 + 火 | 死亡新星留下燃烧区域 |
| 💥 链式爆炸 | 穿透 + 爆炸 | 穿透每次触发小型爆炸 |

### 8 种敌人类型

| 类型 | 行为特点 | 应对策略 |
|------|----------|----------|
| 🟢 **追敌** (chaser) | 直冲玩家，移速中等 | 保持移动，利用走位 |
| 🔴 **冲锋** (charger) | 接近后突然冲锋（2倍速） | 预判闪避，不要直线后退 |
| 🔵 **远程** (ranger) | 保持距离射击 | 优先击杀，快速接近 |
| 💥 **自爆** (suicider) | 高速追敌后爆炸（范围 100px） | 保持距离，远距离击杀 |
| 🛡️ **盾牌** (shield) | 正面免疫子弹（90° 免疫角） | 绕到背后攻击 |
| 🐛 **自爆虫** (suicide_bug) | 靠近后变红 2 秒爆炸 | 变红后立刻远离 |
| 🎯 **精英射手** (elite_ranger) | 站桩发射慢速高伤飞行物 | 走位躲避，趁机击杀 |
| 👑 **Boss** | 多阶段巨型敌人（HP ×20） | 第 5/10 分钟出现，3 阶段 AI |

### 局外成长（天赋树）

9 种天赋，使用金币升级，让每次开局更强：

| 天赋 | 图标 | 最大等级 | 效果（每级） | 满级总费用 |
|------|:----:|:--------:|-------------|:----------:|
| 生命强化 | ❤️ | 5 | +20 最大 HP | 3,100 |
| 敏捷 | 💨 | 3 | +15 移速 | 1,050 |
| 攻击强化 | ⚔️ | 5 | +1 伤害 | 6,200 |
| 护盾强化 | 🛡️ | 3 | +1 初始护盾 | 2,100 |
| 缓慢恢复 | 💚 | 5 | +1 HP/秒 | 6,200 |
| 弹道加速 | 🚀 | 3 | +50 子弹速度 | 1,050 |
| 理财专家 | 💰 | 5 | +20% 金币 | **12,400** |
| 防御强化 | 🔰 | **10** | -5% 受伤 | **25,700** |
| 吸取范围 | 🧲 | **10** | +10% 拾取范围 | **23,000** |

> 全部满级需要约 **80,800** 金币。

---

## 📁 项目结构

```
thorn-reaper/
├── index.html                     # 入口 HTML
├── package.json                   # 项目配置（依赖/脚本/Electron 构建）
├── vite.config.js                 # Vite 构建配置
├── .gitignore                     # Git 忽略规则
│
├── src/                           # ★ 游戏源码
│   ├── main.js                    # Vue 应用入口
│   ├── App.vue                    # 根组件
│   ├── router/index.js            # 路由配置
│   ├── pages/
│   │   ├── HomePage.vue           # 主菜单（开始游戏/天赋/成就）
│   │   └── GamePage.vue           # 游戏页面（Canvas + HUD + 菜单）
│   ├── composables/
│   │   ├── useGameState.js        # 响应式状态桥接层
│   │   └── useGameEngine.js       # ★ 游戏主引擎（~1665行）
│   └── game/                      # 游戏对象层（纯 JS Class）
│       ├── GameConfig.js          # ★ 集中配置表（所有可调数值）
│       ├── Player.js              # 玩家类
│       ├── Enemy.js               # 敌人类（8 种 AI）
│       ├── WeaponBase.js          # 武器基类
│       ├── BoomerangWeapon.js     # 旋转飞刀
│       ├── OrbitSwordWeapon.js    # 环绕飞剑
│       ├── AutoPistolWeapon.js    # 自动手枪
│       ├── LightningWeapon.js     # 闪电链
│       ├── MineWeapon.js          # 地雷
│       ├── RandomLightningWeapon.js # 随机落雷
│       ├── BulletPool.js          # ★ 子弹对象池（Float64Array）
│       ├── SkillDefs.js           # 技能定义 + 抽取逻辑
│       ├── SkillSynergy.js        # 技能联动引擎
│       ├── WaveManager.js         # 波次与潮汐事件
│       ├── GameLoop.js            # 游戏循环（固定时间步长）
│       ├── Camera.js              # 平滑跟随相机
│       ├── AudioManager.js        # 程序化音效（Web Audio API）
│       └── ...                    # 其他辅助模块
│
├── electron/
│   └── main.js                    # Electron 主进程
│
├── scripts/
│   ├── build-electron.cjs         # Electron 构建脚本
│   └── generate-icon.cjs          # 图标生成脚本
│
├── vscode-extension/              # VS Code 扩展
│   ├── extension.js               # 扩展入口
│   ├── package.json               # 扩展配置
│   ├── README.md                  # 扩展 README
│   ├── PUBLISH.md                 # 发布指南
│   ├── icon.png                   # 扩展图标
│   ├── thorn-reaper.vsix          # 打包好的扩展文件
│   └── scripts/
│       ├── build-web.bat          # 构建游戏资源到扩展
│       └── publish.bat            # 一键发布脚本
│
├── docs/
│   ├── 开发手册.md                # 完整开发手册
│   └── VS-Code-扩展使用手册.md     # 扩展使用手册
│
└── public/
    ├── favicon.ico                # 网站图标
    └── favicon.svg                # SVG 图标
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) | 前端框架（页面路由/UI 组件） |
| [Vite](https://vitejs.dev/) | 构建工具与开发服务器 |
| [Canvas 2D](https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D) | 游戏渲染（纯原生，无游戏引擎） |
| [Electron](https://www.electronjs.org/) | 桌面应用框架 |
| [electron-builder](https://www.electron.build/) | Windows 安装程序打包 |
| [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API) | 程序化音效合成 |
| [Gamepad API](https://developer.mozilla.org/zh-CN/docs/Web/API/Gamepad_API) | 手柄支持 |
| [VS Code Extension API](https://code.visualstudio.com/api) | VS Code 扩展（Webview） |
| [vsce](https://github.com/microsoft/vscode-vsce) | VS Code 扩展打包与发布 |

### 核心设计原则

1. **纯 JavaScript 游戏对象**：Player/Enemy/WeaponBase 等都是普通 JS 类，不依赖 Vue 响应式
2. **Canvas 原生渲染**：所有游戏画面用 Canvas 2D 绘制，保证 60FPS
3. **双 Canvas 分层**：背景层 + 实体层，背景只在相机移动超过 5px 时重绘
4. **独立武器系统**：每个武器拥有独立冷却计时器和 AI 逻辑
5. **集中配置**：所有可调数值集中在 [`GameConfig.js`](src/game/GameConfig.js)
6. **对象池**：子弹使用 `Float64Array` 扁平数组对象池，避免 GC 抖动
7. **程序化音效**：所有音效通过 Web Audio API 合成，无外部音频文件
8. **零后端依赖**：数据存储在 `localStorage`，无需服务器

---

## ⚙️ 开发指南

### 前置要求

- [Node.js](https://nodejs.org/) ≥ 18.0
- npm ≥ 9.0（随 Node.js 自带）
- [Git](https://git-scm.com/) ≥ 2.30（可选，用于版本控制）

### 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 在浏览器中打开 http://localhost:8080 开始游玩
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 构建生产版本到 `dist/` |
| `npm run preview` | 预览构建后的生产版本 |
| `npm run deploy` | 构建并部署到 GitHub Pages |
| `npm run electron:dev` | Electron + Vite 开发模式 |
| `npm run electron:build` | 构建 Windows 桌面安装程序 |
| `npm run build:web` | 构建游戏 + 复制到 VS Code 扩展目录 |

### 平衡性修改

所有游戏数值集中在 [`GameConfig.js`](src/game/GameConfig.js)，修改后保存即可自动生效（Vite 热更新）。

| 要修改的内容 | 配置块 | 示例 |
|-------------|--------|------|
| 武器伤害/冷却/范围 | `WEAPON_CONFIGS.*` | `boomerang.damage: 1.5 → 2.0` |
| 技能每级数值/最大等级 | `STAT_SKILLS.*` | `speed.perLevel: 1.15 → 1.20` |
| 发光特效 | `WEAPON_GLOW` | 修改颜色/模糊/缩放 |
| 掉落概率/经验 | `DROP_RATES` | `baseExp: 20 → 30` |
| 敌人难度 | `ENEMY_SCALING` | `hpBase: 40 → 30` |
| 可破坏物参数 | `DESTRUCTIBLE_CONFIG` | `goldPerDrop: 1 → 2` |

> 详细开发文档请参阅 [`docs/开发手册.md`](docs/开发手册.md)

---

## 📄 许可证

[MIT License](LICENSE) © 2024 thorn-reaper-dev

---

<div align="center">
  <sub>Made with ❤️ by thorn-reaper-dev</sub>
  <br>
  <sub>如果喜欢这个项目，请给 ⭐ Star 支持！</sub>
</div>
