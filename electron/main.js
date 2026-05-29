const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('path');

// 使用 app.isPackaged 判断生产/开发环境
// 注意：安装后双击运行 exe 时 process.env.NODE_ENV 是 undefined，
// 不能用它来判断是否生产环境！
const isDev = !app.isPackaged;

// Vite 开发服务器端口（必须与 Vite 默认端口 5173 一致）
const VITE_DEV_PORT = 5173;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: isDev
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico'),
    webPreferences: {
      nodeIntegration: true, // 注意安全风险，生产环境建议关闭或使用 preload
      contextIsolation: false // 同上
    }
  });

  // 开发环境下加载本地服务
  // 检查 NODE_ENV，或者你可以设置一个专门的开发环境变量
  console.log(`Is development environment? ${isDev}`); // 添加日志确认环境判断

  if (isDev) {
    const devUrl = `http://localhost:${VITE_DEV_PORT}`; // 与 Vite 端口一致
    // 增加延时确保 Vite 服务器完全启动
    win.loadURL(devUrl)
    win.webContents.openDevTools();
  } else {
    // 生产环境下加载打包后的index.html
    const indexPath = path.resolve(__dirname, '../dist/index.html');
    console.log(`Loading production build from: ${indexPath}`);

    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // 尝试使用相对路径
      const fallbackPath = './dist/index.html';
      console.log('Trying fallback path:', fallbackPath);
      win.loadFile(fallbackPath).catch(innerErr => {
        console.error('Fallback load failed:', innerErr);
      });
    });
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Page failed to load: ${validatedURL}`, errorDescription, `Error Code: ${errorCode}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(err => {
  console.error('App ready error:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 移除顶部菜单栏
Menu.setApplicationMenu(null);
