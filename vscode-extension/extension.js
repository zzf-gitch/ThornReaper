const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * VS Code 扩展入口 — 荆棘收割者
 * 
 * 功能：
 * 1. 左侧活动栏图标 → 点击显示启动器 (WebviewView)
 * 2. 启动器中点击"开始游戏" → 打开全屏游戏面板
 * 3. 命令面板 (F1 → "荆棘收割者")
 * 4. 快捷键 Ctrl+Alt+T (Mac: Cmd+Alt+T)
 */

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  console.log('[Thorn Reaper] 扩展已激活！');

  // 缓存 webview 面板，避免重复创建
  let gamePanel = undefined;

  // ===== 核心：打开游戏面板 =====
  function openGamePanel() {
    // 如果面板已存在，直接聚焦
    if (gamePanel) {
      gamePanel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'thornReaper',
      '荆棘收割者 — Thorn Reaper',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'web'))
        ]
      }
    );

    gamePanel = panel;

    // 加载游戏 HTML
    const webDir = path.join(context.extensionPath, 'web');
    const indexPath = path.join(webDir, 'index.html');

    if (!fs.existsSync(indexPath)) {
      vscode.window.showErrorMessage(
        '未找到游戏构建文件。请先运行构建脚本:\n' +
        'cd vscode-extension && scripts\\build-web.bat'
      );
      panel.dispose();
      gamePanel = undefined;
      return;
    }

    let htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // 转换资源路径为 Webview URI
    htmlContent = htmlContent.replace(
      /(src|href)=("|')(\.\/)?(assets\/[^"']+)("|')/g,
      (match, attr, quote1, prefix, assetPath, quote2) => {
        const assetUri = panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(webDir, assetPath))
        );
        return `${attr}=${quote1}${assetUri}${quote2}`;
      }
    );

    htmlContent = htmlContent.replace(
      /href=("|')(\.\/)?favicon\.svg("|')/,
      (match, quote1, prefix, quote2) => {
        const faviconUri = panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(webDir, 'favicon.svg'))
        );
        return `href=${quote1}${faviconUri}${quote2}`;
      }
    );

    // 注入 CSP
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src ${panel.webview.cspSource} 'unsafe-eval'; img-src ${panel.webview.cspSource} data: blob:;">`;
    htmlContent = htmlContent.replace('</head>', `${cspMeta}\n</head>`);

    panel.webview.html = htmlContent;

    // 面板关闭时清理引用
    panel.onDidDispose(() => {
      gamePanel = undefined;
    });
  }

  // ===== 注册命令 =====
  const startCommand = vscode.commands.registerCommand('thorn-reaper.start', () => {
    openGamePanel();
  });

  // ===== 侧边栏启动器 (WebviewView) =====
  class ThornReaperSidebarProvider {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'web')),
          vscode.Uri.file(context.extensionPath)  // 允许访问扩展根目录（icon.png）
        ]
      };

      // 读取图标
      const iconPath = vscode.Uri.file(path.join(context.extensionPath, 'icon.png'));
      const iconUri = webviewView.webview.asWebviewUri(iconPath);

      webviewView.webview.html = getSidebarHtml(iconUri);

      // 监听"开始游戏"按钮点击
      webviewView.webview.onDidReceiveMessage((message) => {
        if (message.command === 'startGame') {
          openGamePanel();
        }
      });
    }
  }

  context.subscriptions.push(
    startCommand,
    vscode.window.registerWebviewViewProvider('thorn-reaper-launcher', new ThornReaperSidebarProvider())
  );
}

function getSidebarHtml(iconUri) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--vscode-sideBar-background, #1e1e1e);
      color: var(--vscode-sideBar-foreground, #cccccc);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 12px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      margin-bottom: 16px;
      image-rendering: auto;
    }
    h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--vscode-editor-foreground, #ffffff);
    }
    .subtitle {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #888);
      margin-bottom: 20px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, #f1c40f, #e67e22);
      color: #1a1a2e;
      transition: transform 0.1s, box-shadow 0.2s;
      margin-bottom: 12px;
    }
    .btn:hover {
      transform: scale(1.03);
      box-shadow: 0 4px 16px rgba(241, 196, 15, 0.4);
    }
    .btn:active {
      transform: scale(0.97);
    }
    .shortcuts {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #666);
      line-height: 1.8;
    }
    .shortcuts kbd {
      display: inline-block;
      padding: 1px 5px;
      font-size: 10px;
      font-family: inherit;
      background: var(--vscode-badge-background, #333);
      color: var(--vscode-badge-foreground, #fff);
      border-radius: 3px;
      border: 1px solid var(--vscode-badge-background, #555);
    }
    .footer {
      margin-top: 16px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #555);
    }
  </style>
</head>
<body>
  <img class="icon" src="${iconUri}" alt="荆棘收割者">
  <h2>荆棘收割者</h2>
  <p class="subtitle">Thorn Reaper</p>
  <button class="btn" onclick="startGame()">🎮 开始游戏</button>
  <div class="shortcuts">
    快捷键: <kbd>Ctrl+Alt+T</kbd><br>
    F1 → 输入「荆棘收割者」
  </div>
  <div class="footer">v1.0.2 | 支持键盘/鼠标/触摸/手柄</div>
  <script>
    const vscode = acquireVsCodeApi();
    function startGame() {
      vscode.postMessage({ command: 'startGame' });
    }
  <\/script>
</body>
</html>`;
}

function deactivate() {
  console.log('[Thorn Reaper] 扩展已停用');
}

module.exports = {
  activate,
  deactivate
};
