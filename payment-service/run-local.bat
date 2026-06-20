@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if not exist ".env" (
  echo Missing .env - copy from env.example
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" (
    set "%%A=%%B"
  )
)

echo DB_URL=%DB_URL%
echo DB_USERNAME=%DB_USERNAME%

mvn spring-boot:run