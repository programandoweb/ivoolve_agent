# Detenemos el script si un comando falla.
$ErrorActionPreference = "Stop"

Write-Host "== Ivoolve Agent: preparación del entorno =="

# Creamos .env solo si todavía no existe para no sobrescribir configuración personal.
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env creado desde .env.example"
}

# Instalamos NestJS, BullMQ, Redis client y dependencias declaradas.
npm install

# Levantamos Redis como servicio Docker persistente.
docker compose up -d redis

Write-Host ""
Write-Host "Entorno preparado."
Write-Host "Siguiente comando: npm run start:dev"
Write-Host "LM Studio debe estar iniciado antes de conversar con Jorge."
