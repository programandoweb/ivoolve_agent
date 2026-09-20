@echo off
setlocal

title Ivoolve Agent - Entorno local

:: Ir al disco D y a la raiz del proyecto.
D:
cd /d D:\ivoolve_agent

echo ---------------------------------------------------
echo  Ivoolve Agent
echo  Backend NestJS : http://localhost:5020
echo  Frontend Next  : http://localhost:5021
echo ---------------------------------------------------
echo.

:: Levantar Redis en Docker.
echo [1/3] Iniciando Redis...
cd /d D:\ivoolve_agent\backend
docker compose up -d redis

:: Iniciar backend NestJS en una consola independiente.
echo [2/3] Iniciando backend NestJS en puerto 5020...
start "Ivoolve Agent - Backend 5020" cmd /K "cd /d D:\ivoolve_agent\backend && set PORT=5020 && npm run start:dev"

:: Iniciar frontend Next.js en una consola independiente.
echo [3/3] Iniciando frontend Next.js en puerto 5021...
start "Ivoolve Agent - Frontend 5021" cmd /K "cd /d D:\ivoolve_agent\frontend && set PORT=5021 && npm run dev"

echo.
echo ---------------------------------------------------
echo  Servicios iniciados
echo  NestJS : http://localhost:5020
echo  Next.js: http://localhost:5021
echo ---------------------------------------------------
echo.
echo Redis se ejecuta mediante Docker Compose.
echo Puedes cerrar esta ventana despues de verificar las otras consolas.

pause
endlocal
