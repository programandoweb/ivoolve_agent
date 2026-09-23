# Tools.md — Hermes

## research.browser_verify (Chrome Hermes)

Herramienta prioritaria durante investigaciones SIC autenticadas, con `researchId` y `prospectId` inyectados por el runtime, no por el LLM. Recibe `prospectName` obligatorio desde la ficha real SIC, con `city` y `activity` opcionales; construye automáticamente un plan de hasta ocho consultas en este orden: gobiernos colombianos (.gov.co), RUES, cámaras de comercio, sitio oficial, Facebook, Instagram, LinkedIn y Google Imágenes. Se admite `sourceMode: custom` con `queries` solo cuando el operador solicita explícitamente ajustar la estrategia. Abre Google Search público en Chrome, lee resultados visibles y, cuando la página está permitida y es pública, visita directamente sitios oficiales o perfiles encontrados y guarda las evidencias primero en MariaDB de Agent mediante outbox. `storedInAgent` NO significa confirmado por SIC; consultar pestaña de sincronización y reintentar pendientes. No usar esta herramienta para prospección masiva ni afirmar navegación de sitios no visitados.

Las fuentes con login, CAPTCHA o bloqueo se reportan como no accesibles; esta primera versión de Chrome es un adaptador de resultados Google Search, sin prometer acceso universal a redes/portales. Las consultas de Google Imágenes guardan referencias de miniaturas y posibles páginas de origen junto a la URL exacta de búsqueda; no se considera verificada la titularidad ni la licencia de las imágenes y todavía no se archivan los binarios en storage permanente.


## prospecting.google_search

Fallback mediante API configurada, documentado explícitamente, cuando el flujo así lo autorice. Ejecutar consultas distintas para enriquecer un prospecto concreto.

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

No llames esta tool hasta haber realizado varias consultas útiles o haber agotado las fuentes razonables Y comprobar que las evidencias Chrome pendientes fueron confirmadas por SIC.
