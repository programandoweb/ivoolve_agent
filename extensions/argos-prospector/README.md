# Ivoolve Argos · Prospecting (Chrome MV3)

Extensión especializada **solo para argos-prospector**. Se ejecuta en el Chrome del operador, escucha la cola de Socket.IO del Orchestrator y utiliza Google Maps en una pestaña visible para explorar fichas comerciales públicas. No se conecta a Google Custom Search ni pide claves de Google.

## Qué hace

1. Argos recibe desde SIC una campaña, por ejemplo «100 empresas automotrices en Pereira».
2. Su herramienta `prospecting.browser_maps_search` entrega consulta y cantidad (1 a 100) al backend.
3. La extensión conectada abre Google Maps, espera la carga, lee la lista de resultados visibles y desplaza el panel cada **5 segundos** (hasta 40 desplazamientos).
4. Visita las fichas obtenidas, lee **únicamente los campos visibles** que estén disponibles: nombre, dirección, teléfono, categoría, página, enlace de Maps y, cuando los muestre, calificación y cantidad de opiniones.
5. Devuelve resultados estructurados por Socket.IO. El orquestador guarda incrementalmente en SIC durante campañas mediante `executionId` real; SIC controla duplicados.
6. Si encuentra menos fichas de las solicitadas informa la diferencia; Argos puede dividir la búsqueda en sectores/barrios.

**No garantiza 100 empresas por búsqueda.** Google Maps es dinámico: los selectores pueden cambiar, los resultados dependen del área de búsqueda y algunas fichas no muestran todos los campos. No fuerza páginas privadas, ni evade CAPTCHA, limitaciones del sitio ni controles de acceso. Respeta condiciones de uso de Google Maps; para operaciones masivas hay que revisar las restricciones aplicables.

## Compilar e instalar

```bash
cd extensions/argos-prospector
npm install
npm run build
```

En Chrome: `chrome://extensions` → Modo desarrollador → Cargar descomprimida → elige **la carpeta `extensions/argos-prospector`** (no `dist/`). El build genera `dist/icon-16.png`, `dist/icon-32.png`, `dist/icon-48.png`, `dist/icon-128.png`, `dist/background.js`, `dist/maps.js` y `dist/popup.js`.

En el popup Argos hay una única opción: URL del Socket.IO de Orchestrator (por defecto `https://socket.orchestrator.programandoweb.net`; confirma que DNS y tu reverse proxy realmente envíen `/socket.io` al backend NestJS). No hay token, registro de IP, contraseña ni alta manual del trabajador.

## Activar modo directo en el backend

Por seguridad, las conexiones sin credenciales están **deshabilitadas por defecto**. El administrador de despliegue puede permitirlas en **una red privada** (VPN o ingress protegido) agregando al `.env` raíz:

```env
ARGOS_BROWSER_DIRECT_ENABLED=true
# Opcional: restringir los IDs de Chrome autorizados, separados por comas.
ARGOS_BROWSER_ALLOWED_EXTENSION_IDS=
```

Reinicia/recrea el backend y verifica que tu proxy permita WebSocket. Los IDs de extensión no son credenciales ni protegen frente a clientes externos capaces de falsificar la cabecera `Origin`. **Nunca publiques el namespace directo `/argos-browser` en Internet sin aislamiento adicional de red o autenticación real**: permitiría que un desconocido se hiciera pasar por un navegador, capturara tareas y enviara datos falsos a SIC. El backend acepta solo tareas MAPS_SEARCH y solo entrega tareas al primer worker conectado, pero eso no reemplaza la seguridad de la conexión.

Si quieres conectarlo desde Chrome fuera de una red privada, habilita autenticación automática con aprobación única de dispositivo; no sería seguro exponer el modo directo anónimo.

## Probar con Argos

Con la extensión abierta y socket conectado, en el dashboard del agente Argos envía:

> Busca 10 empresas automotrices en Pereira usando prospecting.browser_maps_search. Recupera y enumera únicamente fichas que realmente devuelva el navegador, con sus enlaces de Maps.

Para persistir automáticamente en SIC, inicia una campaña real desde SIC. Las búsquedas interactivas en el chat solo muestran resultados: no crean ejecuciones SIC falsas. Revisa el histórico y las trazas de tools del agente.

## Restricciones y soporte

- **Solo 1 tarea simultánea / 1 Chrome**; las demás esperan en memoria de ese proceso. Si el backend reinicia, las búsquedas pendientes se perderán y deberá reintentarse la campaña; BullMQ registra el estado del run.
- El proceso mantiene el WebSocket activo en Chrome 116+. Con Chrome cerrado se rechaza la ejecución; no se simula el resultado.
- Cuando Google muestre un desafío de acceso o cambie su HTML, la extensión debe detenerse o devolver los campos visibles disponibles; nunca automatizar la evasión.
- `maxResults` es un objetivo. 5 segundos son el retardo entre scrolls, no la garantía de respuesta del sitio.
- `sourceType=google_maps` mantiene la compatibilidad con la deduplicación actual en SIC, con `capturedAt` y `searchQuery` como trazabilidad.
