@echo off
REM 构建游戏并将输出复制到扩展的 web/ 目录
REM 用法: build-web.bat

echo ========================================
echo  荆棘收割者 — 构建 Webview 游戏资源
echo ========================================

REM 切换到项目根目录
cd /d "%~dp0..\.."

REM 构建游戏
echo [1/2] 构建游戏...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 构建失败！
    exit /b %ERRORLEVEL%
)

REM 复制构建产物到扩展目录
echo [2/2] 复制构建产物到扩展...
set EXT_WEB_DIR="%~dp0..\web"

REM 清空旧的 web 目录
if exist %EXT_WEB_DIR% (
    rmdir /s /q %EXT_WEB_DIR%
)
mkdir %EXT_WEB_DIR%

REM 复制 dist 内容
xcopy /e /i /q /y "dist\*" %EXT_WEB_DIR%

REM 复制 favicon
if exist "public\favicon.svg" (
    copy /y "public\favicon.svg" %EXT_WEB_DIR%\favicon.svg >nul
)

echo ========================================
echo  构建完成！扩展资源已更新到 web/ 目录
echo ========================================
exit /b 0
