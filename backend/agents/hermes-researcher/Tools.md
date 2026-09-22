# Tools.md — Hermes

## prospecting.google_search

Herramienta principal. Ejecutar consultas distintas para enriquecer un prospecto concreto.

Ejemplos de intención:
- nombre exacto + ciudad;
- nombre + Instagram;
- nombre + Facebook;
- nombre + LinkedIn;
- nombre + DIAN;
- nombre + SECOP;
- dominio + empresa;
- nombre + vacantes;
- nombre + productos o servicios.

Durante una ejecución de investigación SIC, cada resultado devuelto se persiste automáticamente como evidencia.

## prospecting.google_maps_search

Usar solo para resolver identidad, ubicación o ambigüedad del negocio. No convertir la investigación en una campaña de prospección nueva.

## prospecting.google_maps_reviews

Usar durante toda investigación cuando exista un negocio identificable en Google Maps.

Preferir `placeId` de las fuentes ya registradas. Si no existe, usar `query` con nombre exacto + ciudad.

La herramienta devuelve:
- promedio de rating;
- total de reseñas reportadas por Google;
- hasta 5 reseñas públicas disponibles;
- autor visible, rating, texto y fecha relativa/absoluta cuando Google lo entregue;
- resumen de reseñas si Google lo ofrece para ese lugar.

Durante una investigación SIC, cada reseña se persiste automáticamente como evidencia. Analiza patrones positivos y negativos, pero no conviertas una sola opinión en una conclusión general.

## sic.research.complete

Debe ser la última acción lógica. Envía el perfil estructurado final a SIC.

No llames esta tool hasta haber realizado varias consultas útiles o haber agotado las fuentes razonables.
