# Tools.md — Argos

## Herramientas autorizadas

### prospecting.browser_maps_search

Fuente primaria para Argos cuando Chrome esté conectado. Envía actividad + ciudad y el máximo deseado (1-100), espera los scrolls de 5 segundos. El navegador extrae datos visibles y enlaces; no inventes campos que Maps no entregue. En campañas SIC guarda cada resultado por el runtime; en el chat autenticado también los importa automáticamente a SIC. Envía además city y department si el usuario los proporcionó. Solo declara guardadas las fichas confirmadas en persistence.savedCount. No uses Custom Search.

### prospecting.google_maps_search

Alternativa mediante API, únicamente si está autorizada para la campaña.

Usarla para:
- encontrar empresas reales;
- verificar nombre y ubicación;
- obtener teléfono, sitio web, Maps URL, categoría, estado, rating y cantidad de reseñas;
- conservar `placeId` como identificador externo.

Estrategia:
- consultas específicas de actividad + ciudad/departamento;
- máximo 20 resultados por llamada;
- variar consulta cuando el conjunto deje de producir entidades nuevas.

### prospecting.google_search

Fuente secundaria de enriquecimiento.

Usarla después de identificar la empresa en Maps para:
- confirmar sitio o actividad;
- encontrar señales públicas de operación;
- buscar servicios, noticias, vacantes o crecimiento;
- resolver ambigüedades.

No usarla como sustituto automático de Maps para descubrimiento masivo.

### prospecting.score_lead

Scoring reproducible.

Usarla después de recopilar suficientes señales. No inventar valores booleanos para mejorar el score.

### sic.prospects.upsert

Persistencia durable de campaña.

Reglas:
- solo disponible dentro de una ejecución real iniciada por SIC;
- el `executionId` lo inyecta el runtime, el modelo no debe inventarlo ni escribirlo;
- los resultados de `prospecting.google_maps_search` ya se serializan y persisten automáticamente cuando la ejecución proviene de SIC;
- usar esta tool para lotes adicionales/enriquecidos;
- enviar entre 1 y 50 prospectos;
- preferir lotes de 5 a 20;
- preservar datos observados;
- esperar confirmación de la tool antes de considerar el lote guardado.

Formato recomendado por prospecto:

```json
{
  "name": "Empresa",
  "placeId": "google-place-id",
  "address": "Dirección observada",
  "phone": "+57...",
  "website": "https://...",
  "mapsUrl": "https://maps.google.com/...",
  "category": "categoría observada",
  "city": "Ciudad",
  "department": "Departamento",
  "country": "CO",
  "sourceType": "google_maps"
}
```

### provider.list

Solo para conocer providers autorizados cuando la tarea requiere contacto.

### provider.send_message

No usar durante prospección normal. Requiere intención explícita de contacto y debe respetar Human-in-the-Loop.

## Manejo de fallos

- Tool 4xx por datos: corregir payload una vez.
- Tool 5xx/red: reintentar de forma limitada; no entrar en bucle.
- Google sin resultados: variar consulta.
- SIC cancelado: detener ejecución.
- Falta de API key: terminar indicando dependencia faltante.
