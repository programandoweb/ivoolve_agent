# 2026-09-22 — Persistencia determinística de prospectos hacia SIC

## Problema

Argos podía obtener resultados reales desde Google Places y mostrarlos en el chat, pero la persistencia dependía de que el LLM emitiera posteriormente una llamada textual a `sic.prospects.upsert`. Un modelo local podía responder con una tabla o incluso inventar un `executionId`, dejando datos útiles sin guardar.

## Contrato revisado

SIC ya expone el contrato durable:

`POST /api/internal/agent/campaign-runs/{executionId}/prospects`

El endpoint resuelve la campaña real, ingiere el prospecto mediante `ProspectService`, deduplica por claves verificables, conserva la fuente JSON y enlaza el prospecto con la ejecución y la campaña.

## Cambio en Agent

Cuando `prospecting.google_maps_search` corre dentro de una ejecución que nació en SIC:

1. Google Places devuelve objetos estructurados.
2. El runtime serializa cada resultado al contrato SIC.
3. Se preservan `placeId`, dirección, teléfono, sitio, URL Maps, categoría, rating, número de reseñas y estado operativo.
4. Ciudad, departamento y país se completan desde el contexto real de la campaña SIC.
5. Cada prospecto se persiste inmediatamente usando el `executionId` real del contexto.
6. El resultado de la tool incluye `serializedProspects` y un bloque `persistence` con el conteo guardado.

La persistencia ya no depende de una decisión posterior del LLM.

## Seguridad de executionId

`sic.prospects.upsert` toma el `executionId` del contexto del runtime. Si el modelo intenta suministrar otro ID, la ejecución se rechaza. Fuera de una campaña real de SIC no se permite persistir con esta tool.

## Chat interactivo

Una búsqueda iniciada manualmente desde el chat de Argos continúa siendo útil para diagnóstico, pero no se guarda automáticamente en SIC porque no existe una ejecución/campaña SIC asociada.

## Flujo oficial

SIC campaña -> CampaignRun -> NestJS SIC -> Ivoolve Agent -> Argos -> Google Places -> serialización -> SIC ProspectService.

## Pruebas

Se añadieron pruebas unitarias para persistencia automática, ausencia de persistencia en chat interactivo y rechazo de executionId inventado. No se ejecutó el suite desde esta sesión.
