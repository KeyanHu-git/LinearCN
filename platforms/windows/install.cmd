@echo off
setlocal
cd /d "%~dp0"

if not exist "runtime\node.exe" (
  echo LinearCN installer runtime is missing.
  pause
  exit /b 1
)

"runtime\node.exe" install.mjs %*
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" pause
exit /b %exitCode%
