# Instalación en Windows

## Automática

Desde PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

## Manual

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

## LM Studio

1. abrir LM Studio;
2. cargar un modelo;
3. iniciar Local Server;
4. comprobar el puerto configurado en `.env`;
5. ajustar `LLM_MODEL` al identificador servido.

## Prueba

```powershell
Invoke-RestMethod http://localhost:4000/health
```
