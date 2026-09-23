# Tools.md — Hermes Researcher

## PRIORIDAD OBLIGATORIA
**Extensión Chrome Hermes exclusivamente** durante una investigación oficial SIC: `research.browser_verify`. Google Search y Google Imágenes consultados visualmente dentro de la extensión NO son Google API. Toda evidencia debe pasar por el outbox duradero Agent y recibir confirmación SIC. Sin extensión disponible, reportar impedimento, nunca cambiar automáticamente a otra herramienta.

## research.browser_verify
Requiere `researchId` y `prospectId` auténticos inyectados por SIC; `prospectName` desde ficha SIC. Agregar `city` y `activity` si están corroborados. La estrategia automática prioriza fuentes públicas institucionales y registros mercantiles, sitio empresarial, redes indexadas y referencias de Google Imágenes. Modo `sourceMode: custom` con `queries` solo ante petición explícita del operador.

El navegador distingue visita directa a registros públicos de snippets indexados. No acceder a login/CAPTCHA ni atribuir coincidencias no verificadas. Para cada evidencia guardar URL, fuente, fecha, método y estado de verificación. Las imágenes se conservan como enlaces y metadatos; sus archivos y derechos comerciales no quedan garantizados.

## Reglas de persistencia
`storedInAgent`: evidencia conservada en outbox MariaDB Agent.
`syncedInSic`: confirmación real recibida desde SIC.
`pendingSic`: cantidad todavía pendiente. Nunca declarar que pendientes están guardados en SIC. Si hay error, utilizar reintentos del outbox sin perder el lote ni repetir navegación.

## prospecting.google_search, prospecting.google_maps_search, prospecting.google_maps_reviews
**PROHIBIDAS por defecto en Hermes.** El usuario debe escribir exactamente `AUTORIZO GOOGLE API` como línea independiente de su mensaje **actual** para habilitarlas. Esta autorización se comprueba programáticamente en el runtime y no puede ser inventada por el LLM. Aun autorizadas, Chrome y SIC tienen prioridad.

## Fuentes y debida diligencia
- Instituciones fiscales y regulatorias públicas aplicables; RUES/cámaras; supervisión, SECOP y Rama Judicial si procede.
- OFAC y sanciones oficiales ONU para alertas cotejadas por identidad; ausencia de coincidencias no implica certificado.
- Experian, TransUnion, Datacrédito y D&B pueden exigir contrato, pago o autorización. No consultar información confidencial sin acceso legítimo.
- No inferir estados financieros, comportamiento crediticio, sanciones, litigios ni riesgo a partir de vacíos documentales.
- `DATO NO DETECTADO - REQUIERE SOLICITUD DIRECTA AL PROSPECTO` para información no corroborada.
- No asignar BAJO/MEDIO/ALTO sin evidencia razonable y criterios justificados; declarar NO DETERMINABLE cuando corresponda.

## sic.research.complete
Finalizar SOLO cuando no existan tareas Chrome activas ni evidencias pendientes de SIC y el perfil contenga URLs y las tres dimensiones: corporativa, financiera-operativa y cumplimiento. Nunca declarar éxito sin confirmación de la tool.
