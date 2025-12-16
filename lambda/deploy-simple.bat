@echo off
chcp 65001 >nul
echo =========================================
echo AWS Lambda Deployment Script (SAM) - Simple
echo =========================================
echo.

echo [0/2] Install dependencies (per function)
call :npm_install_if_needed "PFTryonUploadTool"
if %errorlevel% neq 0 goto :eof
call :npm_install_if_needed "PFTryonGetListTool"
if %errorlevel% neq 0 goto :eof
call :npm_install_if_needed "PFTryonDeleteTool"
if %errorlevel% neq 0 goto :eof

echo.
echo *********** Build Start ***********
call sam build
if %errorlevel% neq 0 (
    echo [ERROR] sam build failed.
    pause
    goto :eof
)
echo *********** Deploy Start ***********
call sam deploy --stack-name vrc-tryon-prod --capabilities CAPABILITY_IAM --region ap-northeast-1 --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset
if %errorlevel% neq 0 (
    echo [ERROR] sam deploy failed.
    pause
    goto :eof
)
echo *********** Deploy End ***********
pause
goto :eof

:npm_install_if_needed
set "DIR=%~1"
if not exist "%DIR%\package.json" (
  echo [WARN] %DIR%\package.json not found, skip npm install.
  exit /b 0
)
if exist "%DIR%\node_modules\" (
  echo [OK] %DIR% dependencies already installed.
  exit /b 0
)
echo [RUN] npm install in %DIR%
pushd "%DIR%"
call npm install
if %errorlevel% neq 0 (
  popd
  echo [ERROR] npm install failed in %DIR%
  exit /b 1
)
popd
exit /b 0
