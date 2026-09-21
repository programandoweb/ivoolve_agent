# Ivoolve Agent

Monorepo para construir, estudiar y gestionar agentes de IA.

## Puertos

- NestJS + Socket.IO: 5020
- Next.js: 5021
- Redis: 6379
- LM Studio: 1234

## Dashboard seguro

Acceso:

```text
http://localhost:5021/login
```

Antes del primer login configura el backend.

### 1. Instala dependencias

```powershell
cd D:\ivoolve_agent\backend
npm install
```

### 2. Genera el hash de tu contraseña

```powershell
npm run auth:hash -- "TuClaveSegura"
```

### 3. Genera un secreto JWT

```powershell
npm run auth:secret
```

### 4. Coloca ambos valores en backend/.env

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash bcrypt generado>
JWT_SECRET=<secreto generado>
JWT_EXPIRES_IN=8h
```

No versiones el archivo `.env`.

## Inicio

```bat
D:\ivoolve_agent\iniciar.bat
```

Luego abre:

```text
http://localhost:5021
```

## Seguridad incluida

- contraseña almacenada únicamente como hash bcrypt;
- JWT firmado con expiración;
- cookie HttpOnly;
- SameSite=Lax;
- cookie Secure automáticamente en producción;
- REST de gestión protegido;
- Socket.IO autenticado durante el handshake;
- secretos exclusivamente por variables de entorno.

## Dashboard

Rutas iniciales:

- `/dashboard` — resumen;
- `/dashboard/agents` — agentes registrados;
- `/dashboard/chat` — conversación Socket.IO;
- `/dashboard/runtime` — estado del runtime;
- `/dashboard/security` — controles de seguridad activos.

Esta primera fase usa un único administrador bootstrap. La evolución a múltiples usuarios y roles se hará sobre almacenamiento durable, no sobre Redis.
