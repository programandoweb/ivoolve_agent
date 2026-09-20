# Ivoolve Agent Frontend

Interfaz Next.js para interactuar con el runtime multiagente.

## Ejecutar

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:3000`

Backend esperado: `http://localhost:4000`

## Flujo

```text
Browser -> Next.js -> /api/backend/* -> NestJS
```

El navegador nunca necesita conocer directamente la URL de NestJS.
