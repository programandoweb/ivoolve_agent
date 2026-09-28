# 14 — Extensión de propuestas desde Ivoolve SIC

## Fecha

2026-09-28

## Objetivo

Permitir que Ivoolve SIC solicite una nueva versión de una propuesta pendiente usando el agente `ivoolve-erp-sales`, conservando la revisión humana como paso obligatorio.

## Decisiones

- Se reutiliza la integración autenticada existente SIC -> Agent.
- Se añade `POST /internal/v1/integrations/ivoolvesic/proposals/extend`.
- Agent no persiste versiones ni estado comercial.
- La entrada contiene propuesta actual, prospecto, campaña, instrucciones humanas y prompt configurado en SIC.
- La respuesta contiene `executionId`, `agentId` y el texto completo final.
- El runtime registra trazabilidad con operación `proposal.extend`.
- La tarea es de redacción; no ejecuta tools ni acciones externas.
- El texto debe basarse exclusivamente en el contexto recibido y no inventar precios, funcionalidades ni datos del prospecto.

## Seguridad

- Bearer service token `IVOOLVE_SIC_SERVICE_TOKEN`.
- DTO validado con límites de longitud.
- No se registra ningún secret adicional.
- La persistencia durable continúa en SIC.

## Pruebas

No se ejecutaron Jest/build desde el conector GitHub. Deben validarse localmente o en VPS después del merge.

## Pendientes

Validar el flujo extremo a extremo tras desplegar simultáneamente SIC y Agent.
