# Fase 09 — Provider Registry + WhatsApp Baileys

## Objetivo

Separar los canales externos del runtime de agentes. Un agente no conoce Baileys directamente:
consume un **provider** autorizado. Esto permite añadir Slack, Telegram, email u otros adapters
sin rediseñar el dominio.

## Implementado

- Dominio `providers` con tipo inicial `whatsapp_baileys`.
- CRUD protegido por `AuthGuard`.
- Varias cuentas WhatsApp independientes.
- Sesión Baileys separada por provider.
- QR efímero generado desde `connection.update`.
- Credenciales persistentes mediante `useMultiFileAuthState`.
- Reconexión automática si existe sesión y `autoConnect=true`.
- Estado: disconnected / connecting / qr_pending / connected / error.
- Captura de número, nombre y última conexión.
- Registro de actividad cuando llegan mensajes.
- Asignación de uno o varios `agentIds`.
- Eliminación de provider elimina también la sesión asociada.
- `backend/data/providers/` excluido de Git.

## API

- `GET /providers`
- `POST /providers`
- `GET /providers/:id`
- `PATCH /providers/:id`
- `DELETE /providers/:id`
- `POST /providers/:id/connect`
- `POST /providers/:id/disconnect`
- `GET /providers/:id/connection`

## Persistencia

`PROVIDERS_DATA_PATH=data/providers`

En Docker/producción este path debe montarse en un volumen persistente.
Las claves Signal y credenciales de WhatsApp nunca deben entrar al repositorio.

## Decisión de versión

Se fija `@whiskeysockets/baileys@6.7.24` para evitar depender del release candidate 7.x
durante esta primera fase. El adapter aísla esta dependencia para poder migrarla después.

## Siguiente fase

Implementar Provider Tool Registry para que el runtime pueda:
1. consultar providers permitidos por agente;
2. enviar mensajes mediante una interfaz genérica;
3. normalizar mensajes entrantes;
4. aplicar routing agent/provider y políticas de aprobación.
