// Electron 构建脚本 — 带状态提示
// 在项目根目录执行: npm run electron:build
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, description) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔧 ${description}...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const start = Date.now();

  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
      timeout: 600000 // 10 分钟超时
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ ${description} — 完成 (${elapsed}s)`);
    return true;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n❌ ${description} — 失败 (${elapsed}s)`);
    return false;
  }
}

// 设置 exe 图标（内联自 set-icon.cjs）
function setExeIcon() {
  const RELEASE_DIR = path.resolve(ROOT, 'release');
  const ICO_PATH = path.resolve(ROOT, 'public/favicon.ico');
  const RCEDIT_PATH = path.join(
    process.env.LOCALAPPDATA || 'C:\\Users\\Administrator\\AppData\\Local',
    'electron-builder/Cache/winCodeSign/winCodeSign-2.6.0/rcedit-x64.exe'
  );

  if (!fs.existsSync(RCEDIT_PATH)) {
    console.log('⚠️  rcedit 未找到，跳过设置图标');
    return;
  }
  if (!fs.existsSync(ICO_PATH)) {
    console.log('⚠️  ICO 文件未找到，跳过设置图标');
    return;
  }

  // 查找所有 unpacked 目录中的 exe
  const dirs = fs.readdirSync(RELEASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.endsWith('-unpacked'));

  let success = false;
  for (const dir of dirs) {
    const exeName = fs.readdirSync(path.join(RELEASE_DIR, dir.name))
      .find(f => f.endsWith('.exe') && f.toLowerCase().startsWith('thorn-reaper'));
    if (!exeName) continue;

    const exePath = path.join(RELEASE_DIR, dir.name, exeName);
    const cmd = `"${RCEDIT_PATH}" "${exePath}" --set-icon "${ICO_PATH}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      console.log(`   ✅ 图标设置: ${exeName}`);
      success = true;
    } catch (err) {
      console.log(`   ⚠️ 图标设置失败: ${exeName}`);
    }
  }

  if (!success) console.log('⚠️  未设置任何 exe 图标');
}

function main() {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║     🚀  Thorn Reaper 构建开始             ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  // Step 1: Vite 构建前端
  if (!run('npx vite build', 'Vite 构建前端')) {
    console.error('\n❌ 构建失败: Vite 构建出错，请检查代码');
    process.exit(1);
  }

  // Step 2: electron-builder 打包
  if (!run('npx electron-builder build --win --x64', 'electron-builder 打包')) {
    console.error('\n❌ 构建失败: electron-builder 打包出错');
    process.exit(1);
  }

  // Step 3: 设置 exe 图标（内联，不再依赖外部脚本）
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔧 设置 exe 图标...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  setExeIcon();

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║     ✅  Thorn Reaper 构建成功!            ║`);
  console.log(`║     输出目录: release/                    ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
}

main();
