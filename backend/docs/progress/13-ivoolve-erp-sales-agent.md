# 13 — Agente comercial para Ivoolve ERP

## Fecha

2026-09-21

## Objetivo

Incorporar a Ivoolve Agent un agente core especializado en prospección comercial de Ivoolve ERP usando Google Maps como fuente primaria y Google Search como enriquecimiento.

## Decisiones

- Google Maps/Places será la fuente principal de descubrimiento.
- Google Search será opcional y complementario.
- Las claves se inyectan por entorno; no se copian ni versionan secretos.
- Cada resultado conserva procedencia y nivel de confianza.
- El scoring es determinista y reproducible.
- El agente no realiza spam ni inventa datos.
- El handoff a Jorge ocurre ante intención comercial real.
- Los mensajes salientes continúan protegidos por el approval existente de `provider.send_message`.

## Alcance

- agente core `ivoolve-erp-sales`;
- tool de Google Maps;
- tool de Google Search;
- tool de scoring;
- configuración por variables de entorno;
- documentación de operación.

## Pruebas

No ejecutadas desde el conector GitHub. Deben ejecutarse local/CI: Jest, Nest build y Next build.

## Siguiente paso

Persistir campañas/prospectos/seguimientos y agregar scheduler BullMQ para ejecución continua una vez validado el flujo de búsqueda real con las credenciales del entorno.
