@echo off
echo ===================================================
echo   Building TSMusicBot Docker Image (Local Build)
echo ===================================================

docker build -f scripts/docker/Dockerfile -t tsmusicbot:latest .

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   Docker Image Built Successfully: tsmusicbot:latest
echo ===================================================
echo.
echo You can run the container with:
echo   docker run -d --name tsmusicbot --restart unless-stopped -p 3000:3000 -v tsmusicbot-data:/app/data tsmusicbot:latest
echo.
pause
