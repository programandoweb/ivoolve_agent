# 2026-09-30 — Argos y Hermes apuntan al CRM de IVOOLVE ERP

Estado: parcial (verificación estática; ver pruebas)

## Objetivo

Integrar IVOOLVE SIC dentro de IVOOLVE ERP como dominio CRM multitenant. `ivoolve_agent` sigue siendo independiente y solo cambia su destino de persistencia comercial.

## Decisión

- `SicClientService` gana un **modo ERP-CRM**: si `IVOOLVE_CRM_BASE_URL` y `IVOOLVE_CRM_AGENT_TOKEN` están definidos, traduce las rutas históricas de SIC a `/api/internal/v1/crm/...` y autentica con `Authorization: Bearer crm_…`.
- La credencial pertenece a **un tenant** del ERP: el agente no envía ni decide `tenant_id`. Un despliegue de agente atiende un tenant; el fan-out multi-tenant queda pendiente.
- Sin esas variables se conserva el contrato transitorio de SIC (`IVOOLVE_SIC_*`), para no eliminar funcionalidad operativa hasta verificar equivalencia.
- Los DTO de `ivoolvesic-integration.controller.ts` dejan de exigir UUID en `prospectId` y `campaign_id` (el CRM usa `route_key` de 16 hex). `execution_id`, `correlation_id` y `researchId` siguen siendo UUID.
- El despacho (antes `api-nestjs/agent-dispatch` de SIC) lo hace ahora el ERP con `php artisan crm:dispatch-agent-work`, que llama a los mismos endpoints `/internal/v1/integrations/ivoolvesic/{campaign-runs,research-runs}` con `IVOOLVE_AGENT_SERVICE_TOKEN`.

## Archivos afectados

- `backend/apps/orchestrator/src/tools/sic-client.service.ts`
- `backend/apps/orchestrator/src/tools/sic-client.service.spec.ts`
- `backend/apps/orchestrator/src/integrations/ivoolvesic/ivoolvesic-integration.controller.ts`
- `.env.example`

## Pruebas realmente ejecutadas

- El repositorio no tiene `node_modules` instalados en este equipo, por lo que **no se ejecutó jest ni `nest build`**.
- Se transpiló `sic-client.service.ts` con TypeScript (sin errores de sintaxis) y se ejecutó un script Node que carga el módulo transpilado con stubs de `@nestjs/*` y verifica la traducción de las 7 rutas, ambos modos (ERP/SIC) y el error sin configuración: resultado `ALL_OK`.
- El spec jest `sic-client.service.spec.ts` cubre lo mismo y debe ejecutarse con `npm ci && npm test`.
- Contra el ERP real, las rutas y payloads fueron verificados por `CrmTest` (Argos crea prospecto en el tenant del token; Hermes adjunta investigación al prospecto correcto; ciclo de campañas) en el repositorio ivoolveERP.

## Pendientes

- Ejecutar `npm ci && npm test && npm run build` en este repositorio.
- Fan-out multi-tenant de un mismo agente (mapa tenant → credencial).
- Generación/extensión de propuestas por el agente hacia el CRM (hoy el ERP crea borradores deterministas).
