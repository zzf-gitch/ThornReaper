@echo off
REM 荆棘收割者 — 一键发布到 VS Code 扩展市场
REM 用法: publish.bat [patch|minor|major]
REM   patch - 补丁版本 (默认)
REM   minor - 次版本
REM   major - 主版本

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "EXT_DIR=%SCRIPT_DIR%.."
set "ROOT_DIR=%SCRIPT_DIR%..\.."

echo ========================================
echo  荆棘收割者 — 发布到扩展市场
echo ========================================
echo.

REM 检查参数
set "VERSION_TYPE=patch"
if not "%1"=="" set "VERSION_TYPE=%1"

echo [1/3] 构建游戏资源...
cd /d "%ROOT_DIR%"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [失败] 构建失败！
    exit /b %ERRORLEVEL%
)

echo [2/3] 复制构建产物到扩展目录...
set EXT_WEB_DIR="%EXT_DIR%\web"
if exist %EXT_WEB_DIR% (
    rmdir /s /q %EXT_WEB_DIR%
)
mkdir %EXT_WEB_DIR%
xcopy /e /i /q /y "dist\*" %EXT_WEB_DIR%
if exist "public\favicon.svg" (
    copy /y "public\favicon.svg" %EXT_WEB_DIR%\favicon.svg >nul
)

echo [3/3] 发布到市场（版本类型: %VERSION_TYPE%）...
cd /d "%EXT_DIR%"
call npx vsce publish %VERSION_TYPE%
if %ERRORLEVEL% neq 0 (
    echo [失败] 发布失败！
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo  发布成功！
echo  版本类型: %VERSION_TYPE%
echo  请前往 VS Code 扩展市场验证
echo ========================================
exit /b 0
