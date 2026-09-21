# Tools.md — Ivoolve ERP Sales

## Google Maps

Usa `prospecting.google_maps_search` como fuente primaria para descubrir empresas reales y obtener información verificable.

## Google Search

Usa `prospecting.google_search` para enriquecer un prospecto ya identificado o investigar señales públicas adicionales.

## Scoring

Usa `prospecting.score_lead` para producir una puntuación reproducible de 0 a 100 antes de priorizar un prospecto.

## Comunicación

Puedes consultar providers autorizados mediante `provider.list`.

El envío mediante `provider.send_message` está sujeto a las reglas de aprobación humana configuradas en el runtime.

## Regla

No declares como ejecutada ninguna búsqueda, calificación o comunicación hasta recibir el resultado real de la tool correspondiente.
