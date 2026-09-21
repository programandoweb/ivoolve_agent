# Plan de QA integral — Ivoolve Agent

Este documento define el QA posterior a las fases de construcción. No sustituye la ejecución: cada caso debe registrar resultado, evidencia y defectos encontrados.

## 1. Instalación limpia

- clonar `main` en carpeta vacía;
- copiar `.env.example → .env`;
- generar hash admin y JWT secret;
- levantar Redis + MariaDB con Docker Compose;
- instalar dependencias backend/frontend;
- comprobar que el working tree permanece limpio;
- compilar backend y frontend;
- arrancar ambos servicios.

Criterio: instalación reproducible sin modificaciones inesperadas al repositorio.

## 2. Infraestructura y persistencia

- `GET /health` devuelve NestJS/Redis/MariaDB sanos;
- tablas se crean de forma idempotente;
- reiniciar backend no pierde usuarios/providers/approvals/trazas;
- reiniciar Redis pierde solo estado temporal permitido;
- credenciales Baileys persisten en volumen configurado.

## 3. Autenticación y RBAC

Crear tres cuentas: admin, operator y viewer.

Validar:

- login/logout;
- cookie HttpOnly;
- JWT expirado/inválido;
- usuario deshabilitado;
- admin gestiona usuarios;
- operator no entra a Accesos/Aprobaciones;
- viewer no ejecuta mutaciones;
- viewer no puede saltar RBAC solicitando una tool por chat;
- operator no elimina providers;
- solo admin usa Agent Builder.

## 4. Multi-tenant

Crear tenant B con usuario propio.

Verificar que un usuario de tenant A no pueda:

- listar/abrir/modificar provider B;
- ver ejecuciones o métricas B;
- usar provider B desde una tool;
- acceder a approvals B;
- reutilizar sesión Redis de B.

## 5. Agent Builder y registry

- crear agente conversacional completo;
- preguntas solo por campos faltantes;
- impedir colisión con `jorge`;
- confirmar publicación explícita;
- comprobar reload del registry;
- delegación Jorge → agente;
- sesión hija aislada;
- reinicio conserva agente cuando MariaDB está activa.

## 6. Providers / WhatsApp

Con un número controlado:

- crear provider;
- escanear QR;
- conectar;
- persistir estado;
- recibir texto;
- encolar BullMQ;
- seleccionar agente;
- generar respuesta;
- responder por el mismo número;
- ignorar `fromMe`;
- evitar doble respuesta a mensaje duplicado;
- reconectar tras caída;
- logout/QR nuevo.

## 7. BullMQ y retries

- job exitoso;
- fallo temporal del LLM;
- fallo temporal del provider;
- backoff/retry;
- claim liberado en fallo;
- claim retenido al completar;
- jobs fallidos visibles en Runtime.

## 8. Tools y approvals

- `provider.list` respeta ACL + tenant;
- `provider.send_message` genera approval;
- comprobar que el mensaje NO sale antes de aprobar;
- aprobar y confirmar envío;
- rechazar y confirmar no envío;
- doble aprobación devuelve conflicto;
- fallo al ejecutar aprobación vuelve a pending;
- viewer no puede crear write approval.

## 9. Multi-instancia

Levantar dos instancias NestJS con el mismo Redis/MariaDB.

- instancia A adquiere provider;
- instancia B no puede adquirirlo;
- A renueva lease;
- al detener A, expira/libera lease;
- B puede tomar ownership posteriormente;
- simular pérdida de lease y verificar cierre del socket local.

## 10. Observabilidad

- métricas por tenant;
- success rate;
- promedio;
- P95;
- alerta de tasa de fallos;
- alerta P95;
- ejecuciones recientes;
- audit events para user/tenant/approval;
- ningún secreto aparece en logs/UI.

## 11. Frontend

Desktop, tablet y móvil:

- login;
- sidebar por rol;
- agents;
- Agent Builder sin scroll de página;
- providers;
- approvals;
- access;
- chat;
- runtime;
- estados loading/error/empty;
- formularios y drawers;
- logout.

## 12. CI

El commit sometido a QA debe cumplir:

- backend Jest verde;
- NestJS build verde;
- Next.js build verde;
- package-lock sincronizado;
- working tree limpio.

## Definition of Done del QA

El QA se considera cerrado cuando:

1. todos los casos críticos pasan;
2. defectos bloqueantes/altos están corregidos y revalidados;
3. CI del HEAD final está verde;
4. prueba real WhatsApp E2E pasa;
5. persistencia sobre restart pasa;
6. aislamiento tenant/RBAC pasa;
7. approvals y leases pasan;
8. queda un informe final con evidencias y pendientes no bloqueantes.
