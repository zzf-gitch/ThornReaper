# 📦 荆棘收割者 — 发布到 VS Code 扩展市场指南

本指南详细说明如何将「荆棘收割者」发布到 [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=thorn-reaper-dev.thorn-reaper)，让用户可以直接从扩展市场搜索安装。

> ⚠️ **中国大陆网络说明**：微软市场网站 `marketplace.visualstudio.com` 在国内可能无法直接访问。创建 Publisher 需要在网页操作，后续登录和发布可通过命令行完成。如果网页无法访问，请参考下方「常见问题 → 国内网络如何解决？」配置 hosts 或代理。

## 📋 两种发布方式速览

| 方式 | 操作途径 | 需要步骤 | 推荐场景 |
|------|---------|---------|---------|
| **A：网页上传 VSIX** ✅ 推荐 | 浏览器操作 | 步骤 1 → 步骤 4 → 步骤 5 → 上传 | 首次发布、偶尔更新、不想折腾 PAT/网络 |
| **B：命令行发布** | CLI 命令行 | 步骤 1 → 步骤 2 → 步骤 3 → 步骤 4 → 步骤 6 | 频繁更新、CI/CD 自动化、一键脚本发布 |

---

## 方式 A：网页上传 VSIX（推荐，无需 PAT）

> 这是最简单的发布方式，只需打包 VSIX 后通过浏览器直接上传，**完全不需要步骤 2（生成 PAT）和步骤 3（CLI 登录）**。

操作流程：
1. 完成下方 **步骤 1：创建 Publisher**
2. 完成下方 **步骤 4：构建游戏资源**
3. 完成下方 **步骤 5：打包 VSIX**
4. 访问 [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) → 选择你的 Publisher → 点击右上角 **"..."** → **Upload VSIX** → 选择生成的 `.vsix` 文件上传
5. 等待自动发布完成（通常 1-2 分钟即可在市场中搜索到）

---

## 方式 B：命令行发布（适合自动化/频繁更新）

如果需要将发布流程集成到脚本或 CI/CD 中，请按下方 **步骤 2 → 步骤 3 → 步骤 4 → 步骤 6** 的顺序操作。

---

## 前置条件

- 一个 **Microsoft / GitHub / Azure DevOps 账号**
- **VS Code** 已安装
- **Node.js** (>= 18.x) 和 npm（项目已安装）

## 步骤 1：创建 Publisher（通过网页）

> ⚠️ **注意**：`vsce create-publisher` 命令已被官方移除，现在必须通过网页创建 Publisher。

1. 访问 [https://aka.ms/vscode-create-publisher](https://aka.ms/vscode-create-publisher) 或 [VS Code Publisher 创建页](https://marketplace.visualstudio.com/manage/createpublisher)
2. 使用你的 **Microsoft 账号**登录（⭐ 强烈推荐）—— 后续生成 PAT Token 也在 Azure DevOps（微软服务），统一账号最省事；GitHub 账号也可用，但仍需 Microsoft 账号访问 Azure DevOps
3. 填写以下信息：
   - **Publisher Name**: `thorn-reaper-dev`（这是唯一标识，创建后不可修改）(ID)
   - **Display Name**: `Thorn Reaper`（显示名称，可后期修改）(Name)
   - **Description**: `荆棘收割者 — 在 VS Code 中直接游玩的割草游戏`
4. 点击 **Create** 完成创建

> 💡 国内访问 `marketplace.visualstudio.com` 可能受限，请参考下文「常见问题 → 国内网络如何解决？」配置 hosts 或代理。

### Publisher 创建后能做什么

创建成功后，你可以在 VS Code 扩展市场中搜索 `@id:thorn-reaper-dev` 看到你的 publisher 页面。

## 步骤 2：生成 Personal Access Token (PAT) 🔴 网页上传可跳过

> 🟢 **如果使用「方式 A：网页上传 VSIX」，此步骤完全不需要，直接跳到步骤 4。**

`vsce` 发布工具需要一个 PAT 令牌来验证身份（仅命令行发布需要）：

1. 访问 [Azure DevOps](https://dev.azure.com)（国内可访问）
2. 使用 **与第 1 步相同的 Microsoft 账号**登录（确保是同一个账号，否则可能无权限发布）
3. 如果没有组织，按提示创建一个（名称任意，如 `thorn-reaper-pub`）
4. 点击右上角用户头像 → **Personal access tokens**
5. 点击 **New Token**
6. 填写：
   - **名称**: `vsce-publish-thorn-reaper`
   - **组织**: 选择你刚创建的组织
   - **过期时间**: 建议选 1 年（到期后重新生成即可）
   - **作用域**: 选择 **Custom defined** → 勾选 **Marketplace (Publish)**
7. 点击 **Create**
8. **立即复制 Token 并保存**（关闭页面后不再显示）

## 步骤 3：登录 Publisher 🔴 网页上传可跳过

> 🟢 **如果使用「方式 A：网页上传 VSIX」，此步骤完全不需要，直接跳到步骤 4。**

```bash
# 使用上一步生成的 PAT Token 登录（仅命令行发布需要）
npx vsce login thorn-reaper-dev
```

系统提示 `Personal Access Token:` 时，粘贴刚才复制的 Token（粘贴时窗口不会显示变化，直接回车即可）。

成功后会显示：`Info: Successfully logged in as 'thorn-reaper-dev'`

## 步骤 4：构建游戏资源

在打包前，需要先构建前端游戏资源：

```bash
# 方式 1：直接运行构建脚本
npm run build:web

# 方式 2：手动运行批处理文件
cd vscode-extension && scripts\build-web.bat
```

这会将前端构建产物复制到 `vscode-extension/web/` 目录。

## 步骤 5：打包 VSIX（测试用）

先本地打包验证：

```bash
# 使用 npm script
npm run package
```

生成的 `.vsix` 文件在 `vscode-extension/` 目录下。

### 验证打包内容

```bash
# 查看 VSIX 中包含的文件
npx vsce ls
```

确保包含：
- `extension.js`
- `package.json`
- `README.md`
- `LICENSE`
- `icon.png`
- `web/` 目录及其内容

## 步骤 6：发布到市场

```bash
# 发布（补丁版本，自动 +1）
npm run publish
```

### 版本号管理

| 命令 | 说明 |
|------|------|
| `npm run publish:patch` | 补丁版本 (1.0.0 → 1.0.1) |
| `npm run publish:minor` | 次版本 (1.0.0 → 1.1.0) |
| `npm run publish:major` | 主版本 (1.0.0 → 2.0.0) |

> `npx vsce publish` 会自动更新 `package.json` 中的 `version` 字段并提交发布，无需手动改版本号。

## 步骤 7：验证发布

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索「荆棘收割者」或「Thorn Reaper」
4. 确认扩展出现在搜索结果中并可安装

> 发布后可能需要等待 5-10 分钟才能在搜索结果中出现。

## 更新版本

### 方式 A：网页上传 VSIX

1. 手动修改 [`vscode-extension/package.json`](package.json) 中的 `version` 字段（如 `1.0.1` → `1.0.2`）
2. 构建并打包：
   ```bash
   npm run build:web
   npm run package
   ```
3. 访问 [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) → 选择 Publisher → Upload VSIX → 上传新的 `.vsix` 文件

### 方式 B：命令行发布

```bash
# 1. 构建最新游戏资源
npm run build:web

# 2. 更新版本号并发布（自动 +1 补丁版本）
npm run publish:patch

# 或者手动修改 package.json 中的 version 字段，然后：
npm run publish
```

或者使用一键发布脚本：
```bash
cd vscode-extension && scripts\publish.bat
```

## 卸载本地 VSIX 安装的版本

如果需要先卸载之前通过 VSIX 安装的版本：

```bash
code --uninstall-extension thorn-reaper-dev.thorn-reaper
```

## 常见问题

### Q: 国内网络下 `marketplace.visualstudio.com` 打不开？
A: 这是正常现象，微软市场域名在国内被 DNS 污染。解决方法：

1. **修改 hosts 文件**（推荐）：
   - 以管理员身份打开 `C:\Windows\System32\drivers\etc\hosts`
   - 在文件末尾添加：
   ```
   185.199.108.133 marketplace.visualstudio.com
   185.199.109.133 marketplace.visualstudio.com
   185.199.110.133 marketplace.visualstudio.com
   185.199.111.133 marketplace.visualstudio.com
   ```
   - 保存后执行 `ipconfig /flushdns` 刷新 DNS

2. **使用代理**：如果开启了系统代理，`vsce` 默认会走系统代理设置。

3. **使用国内镜像**：部分国内服务商提供 VS Code 市场镜像。

### Q: `npx vsce login` 超时？
A: 这是网络问题。解决方案：

1. 为 npm 和 vsce 配置代理：
   ```bash
   # 如果使用 HTTP 代理（如 Clash、v2ray 等）
   npx vsce login thorn-reaper-dev --proxy http://127.0.0.1:7890
   ```

2. 或者设置系统环境变量 `HTTP_PROXY` 和 `HTTPS_PROXY`。

3. 如果无法使用代理，尝试多试几次，偶尔能连接成功。

### Q: 有没有不需要访问微软服务器的方式让用户安装？
A: 有，但无法实现「自动更新」。以下为替代方案：

1. **GitHub Releases**：将 VSIX 文件上传到 GitHub Releases，用户下载后手动安装。
2. **私服/镜像**：部分企业或组织搭建了 VS Code 扩展镜像（如 Open VSX Registry）。

### Q: 提示 `vsce` 不是内部或外部命令？
A: `@vscode/vsce` 安装在项目根目录的 `node_modules` 中，需要使用 `npx vsce` 而非直接写 `vsce`。推荐使用 `package.json` 中定义好的 npm scripts：

```bash
npm run package      # 打包 VSIX
npm run publish      # 发布到市场
```

### Q: `vsce package` 失败，提示缺少文件？
A: 确保已先运行 `npm run build:web` 构建前端资源。

### Q: 「Publisher 'thorn-reaper-dev' is not known」？
A: 先通过网页创建 publisher：访问 [https://aka.ms/vscode-create-publisher](https://aka.ms/vscode-create-publisher)，使用 Microsoft 账号登录后填写信息创建。

### Q: PAT 令牌无效或过期？
A: 在 [Azure DevOps Token 页面](https://dev.azure.com) 重新生成令牌，然后运行 `npx vsce login thorn-reaper-dev` 重新登录。

### Q: 市场搜索不到扩展？
A: 发布后可能需要等待几分钟才能在搜索结果中出现。如果等待后仍然没有，检查 publisher 名称是否与 package.json 一致。

### Q: 如何更新扩展的市场描述？
A: `README.md` 的内容会自动成为扩展市场页面描述，更新后重新发布即可。

---

## 完整发布流程（速查）

### 方式 A：网页上传 VSIX ✅ 推荐

```bash
# 1. 创建 publisher（仅首次，通过网页）
#    访问 https://aka.ms/vscode-create-publisher
#    使用 Microsoft 账号登录，填写信息创建

# 2. 构建前端资源
npm run build:web

# 3. 打包 VSIX
npm run package

# 4. 访问 https://marketplace.visualstudio.com/manage
#    → 选择 Publisher → ... → Upload VSIX → 选择 .vsix 文件上传
```

### 方式 B：命令行发布

```bash
# 1. 创建 publisher（仅首次，通过网页）
#    访问 https://aka.ms/vscode-create-publisher
#    使用 Microsoft 账号登录，填写信息创建

# 2. 构建前端资源
npm run build:web

# 3. 登录（仅首次，需要 PAT Token）
npx vsce login thorn-reaper-dev

# 4. 检查文件列表
npx vsce ls

# 5. 发布
npm run publish
```
