@echo off
echo ***********Build Start***********
call sam build
if %errorlevel% neq 0 (
    echo 错误: sam build 失败。
    pause
    goto :eof
)
echo ***********Deploy Start***********
call sam deploy --stack-name vrc-tryon-prod --capabilities CAPABILITY_IAM --region ap-northeast-1 --resolve-s3
if %errorlevel% neq 0 (
    echo 错误: sam deploy 失败。
    pause
    goto :eof
)
echo ***********Deploy End***********
pause
