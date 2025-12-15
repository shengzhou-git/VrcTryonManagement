@echo off
chcp 65001 >nul
echo =========================================
echo AWS Lambda 部署脚本 (SAM)
echo =========================================
echo.

REM 检查 AWS CLI 是否安装
where aws >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 AWS CLI，请先安装！
    echo 下载地址: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM 检查 SAM CLI 是否安装
where sam >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 AWS SAM CLI，请先安装！
    echo 下载地址: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
    pause
    exit /b 1
)

echo.
echo [1/3] 选择部署环境
echo   1) dev  (开发环境)
echo   2) prod (生产环境)
set /p choice="请输入选项 [1-2]: "

if "%choice%"=="1" (
    set ENV=dev
    set STACK_NAME=vrc-tryon-dev
) else if "%choice%"=="2" (
    set ENV=prod
    set STACK_NAME=vrc-tryon-prod
) else (
    echo 使用默认环境: prod
    set ENV=prod
    set STACK_NAME=vrc-tryon-prod
)

echo.
echo ***********Build Start***********
call sam build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] SAM 构建失败！
    pause
    exit /b 1
)

echo.
echo ***********Deploy Start***********
echo 环境: %ENV%
echo 堆栈名称: %STACK_NAME%
echo 区域: ap-northeast-1
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
    echo [错误] 部署失败！
    echo 请检查:
    echo   1. AWS 凭证是否正确配置 (运行 aws configure)
    echo   2. IAM 权限是否足够
    echo   3. CloudFormation 控制台的错误信息
    pause
    exit /b 1
)

echo.
echo =========================================
echo 部署成功！
echo =========================================
echo.
echo 获取 API 端点地址:
call aws cloudformation describe-stacks ^
    --stack-name %STACK_NAME% ^
    --region ap-northeast-1 ^
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" ^
    --output text

echo.
echo 请将上面的 API URL 添加到前端的 .env.local 文件:
echo NEXT_PUBLIC_API_URL=<API_URL>
echo.
pause
