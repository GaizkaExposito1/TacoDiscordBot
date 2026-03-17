@echo off
echo [SCRIPT] Deteniendo procesos de Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SCRIPT] Procesos detenidos correctamente.
) else (
    echo [SCRIPT] No se encontraron procesos de Node.js corriendo.
)

echo.
echo [SCRIPT] Actualizando comandos (Slash Commands)...
call npm run deploy:test

echo.
echo [SCRIPT] Iniciando el bot de pruebas (Environment: TEST)...
cd /d "%~dp0"
npm run start:test
pause