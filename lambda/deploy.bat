@echo off
chcp 65001 >nul
echo =========================================
echo AWS Lambda Deployment Script (SAM)
echo =========================================
echo.

REM Check AWS CLI
where aws >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] AWS CLI not found. Please install it first.
    echo Download: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM Check SAM CLI
where sam >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] AWS SAM CLI not found. Please install it first.
    echo Download: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
    pause
    exit /b 1
)

echo.
echo [0/3] Install dependencies (per function)
call :npm_install_if_needed "PFTryonUploadTool"
if %ERRORLEVEL% NEQ 0 exit /b 1
call :npm_install_if_needed "PFTryonGetListTool"
if %ERRORLEVEL% NEQ 0 exit /b 1
call :npm_install_if_needed "PFTryonDeleteTool"
if %ERRORLEVEL% NEQ 0 exit /b 1

echo.
echo [1/3] Select deployment environment
echo   1) dev  (development)
echo   2) prod (production)
set /p choice="Enter option [1-2]: "

if "%choice%"=="1" (
    set ENV=dev
    set STACK_NAME=vrc-tryon-dev
) else if "%choice%"=="2" (
    set ENV=prod
    set STACK_NAME=vrc-tryon-prod
) else (
    echo Using default environment: prod
    set ENV=prod
    set STACK_NAME=vrc-tryon-prod
)

echo.
echo ***********Build Start***********
call sam build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] SAM build failed.
    pause
    exit /b 1
)

echo.
echo ***********Deploy Start***********
echo Environment: %ENV%
echo Stack name : %STACK_NAME%
echo Region     : ap-northeast-1
echo.
call sam deploy ^
    --stack-name %STACK_NAME% ^
    --region ap-northeast-1 ^
    --capabilities CAPABILITY_IAM ^
    --parameter-overrides Environment=%ENV% ^
    --resolve-s3 ^
    --no-confirm-changeset ^
    --no-fail-on-empty-changeset

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed.
    echo Please check:
    echo   1. AWS credentials (run: aws configure)
    echo   2. IAM permissions
    echo   3. CloudFormation console error details
    pause
    exit /b 1
)

echo.
echo =========================================
echo Deployment succeeded!
echo =========================================
echo.
echo Fetching API endpoint (ApiUrl output):
call aws cloudformation describe-stacks ^
    --stack-name %STACK_NAME% ^
    --region ap-northeast-1 ^
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" ^
    --output text

echo.
echo Add the API URL above to your frontend .env.local:
echo AWS_API_URL=<API_URL>
echo.
echo NOTE:
echo - Do NOT use NEXT_PUBLIC_* for secrets.
echo - If you enabled API Key auth, also set:
echo   AWS_API_KEY=<YOUR_API_KEY>
echo.
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
if %ERRORLEVEL% NEQ 0 (
  popd
  echo [ERROR] npm install failed in %DIR%
  exit /b 1
)
popd
exit /b 0
