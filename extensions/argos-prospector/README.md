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

Al pulsar el icono, Argos se abre en el **panel lateral derecho nativo de Chrome** (Side Panel, Chrome 116+), inspirado en el panel deslizante del ejemplo Migo proporcionado. El panel permanece visible al navegar, tiene diseño oscuro violeta, contador, estado y un input editable para la URL del Socket.IO. La URL se guarda en `chrome.storage.local` y el botón **Guardar y conectar** reconecta inmediatamente.

La URL debe resolver **directamente al backend NestJS** que atiende `/socket.io` (por defecto se sugiere `https://socket.orchestrator.programandoweb.net`, pero no está verificado que ese DNS y el proxy estén configurados). No agregues `/argos-browser` al input; la extensión lo incorpora internamente.

El panel muestra los detalles de `connect_error`, desconexión y rechazo del backend. Si dice «Sin acceso al socket», revisa antes el DNS, la configuración WebSocket en Nginx Proxy Manager y el modo directo; cambiar únicamente la URL en Chrome no puede habilitar un backend que rechaza conexiones.

## Conexión más sencilla: aprobar una vez desde el dashboard

La extensión ya no necesita habilitar sockets anónimos. El modo directo puede permanecer desactivado (`ARGOS_BROWSER_DIRECT_ENABLED=false`). El backend genera automáticamente un código de seis dígitos visible en la extensión cuando el navegador solicita conexión por primera vez.

1. Actualiza y reconstruye el backend y frontend de Ivoolve Agent.
2. En Chrome, instala o recarga la extensión desde `extensions/argos-prospector` después de `npm install && npm run build`.
3. Pulsa el icono de Argos: en el panel lateral aparecerá un código temporal (válido durante cinco minutos).
4. Abre el dashboard de `/dashboard/agents/argos-prospector?tab=connect` con una cuenta administradora.
5. Comprueba que coincide el código de la extensión y pulsa **Autorizar**.
6. La extensión recibe y almacena localmente una credencial aleatoria por el socket original y se reconecta sola al backend. No hay que copiar tokens, registrar IP o repetir el emparejamiento en cada inicio de Chrome.

Las credenciales autorizadas solo se guardan como hashes SHA-256 en el volumen de datos del backend (`RUNTIME_DATA_PATH`); la extensión conserva la credencial original en `chrome.storage.local`. El código temporal no autentica por sí mismo: únicamente un administrador que ya ha iniciado sesión puede aprobarlo. No compartas códigos de emparejamiento con desconocidos; verifica siempre el código que se muestra en tu propia extensión.

Para mejorar la seguridad, el proxy público **no requiere modo anónimo** y debe usar HTTPS/WSS. Enviar credenciales por HTTP público no está permitido. El backend permite como máximo ocho solicitudes de emparejamiento por IP y hora y cuarenta pendientes en una instancia. El modo directo anterior sigue siendo una alternativa exclusivamente para una red privada, nunca para el proxy público.

Si la extensión muestra un código antiguo, pulsa **Guardar y conectar** para generar uno nuevo. Si ves `Invalid namespace`, actualiza y reconstruye el backend NestJS antes de investigar el proxy. Si el panel no recibe el código, revisa que `https://socket.orchestrator.programandoweb.net` apunta al servicio del backend y que Nginx Proxy Manager tiene WebSockets habilitados.

## Probar con Argos

Con la extensión abierta y socket conectado, en el dashboard del agente Argos envía:

> Busca 10 empresas automotrices en Pereira usando prospecting.browser_maps_search. Recupera y enumera únicamente fichas que realmente devuelva el navegador, con sus enlaces de Maps.

Las búsquedas **desde el chat autenticado de Argos** también envían automáticamente los resultados observados al catálogo de prospectos SIC mediante el endpoint interno `POST /api/internal/agent/argos/prospects`; no crean campañas ni ejecuciones SIC artificiales. En las campañas reales se conserva la persistencia con ejecución y relación con campaña. Requiere desplegar las versiones nuevas de ambos repositorios y mantener configurados `IVOOLVE_SIC_BASE_URL` y `IVOOLVE_SIC_INTERNAL_TOKEN` en Agent. Revisa el histórico y las trazas de tools del agente.

## Restricciones y soporte

- **Solo 1 tarea simultánea / 1 Chrome**; las demás esperan en memoria de ese proceso. Si el backend reinicia, las búsquedas pendientes se perderán y deberá reintentarse la campaña; BullMQ registra el estado del run.
- El proceso mantiene el WebSocket activo en Chrome 116+. Con Chrome cerrado se rechaza la ejecución; no se simula el resultado.
- Cuando Google muestre un desafío de acceso o cambie su HTML, la extensión debe detenerse o devolver los campos visibles disponibles; nunca automatizar la evasión.
- `maxResults` es un objetivo. 5 segundos son el retardo entre scrolls, no la garantía de respuesta del sitio.
- `sourceType=google_maps` mantiene la compatibilidad con la deduplicación actual en SIC, con `capturedAt` y `searchQuery` como trazabilidad.

## Recuperación automática cuando SIC falla

La búsqueda terminada por Chrome se almacena como un **outbox de base de datos MariaDB en Ivoolve Agent** antes de empezar a sincronizar con SIC. Si SIC devuelve 500 o hay un corte de red, los datos y enlaces originales permanecen en Agent y cada ficha registra intentos, último error, próximo reintento y el ID confirmado por SIC cuando se completa. El backend reintenta en intervalos de 30 segundos, aplicando backoff por elemento. **No es necesario repetir la búsqueda**.

En el dashboard de Argos abre **Sincronización SIC**: `/dashboard/agents/argos-prospector?tab=sync`. Allí se ven pendientes, errores y confirmados, y puedes pulsar **Reintentar** individualmente o **Reintentar pendientes** para todos los registros mostrados hasta el máximo del lote. La lista está protegida por login y separada por tenant.

La base de datos Agent debe estar operativa (`DATABASE_URL`); sin MariaDB la herramienta se detiene explícitamente en lugar de declarar que guardó resultados. No se inventan campañas: en búsquedas por chat usa la importación interna, y en campañas conserva el `executionId` original. Los registros confirmados no se vuelven a enviar. Esta garantía cubre resultados recibidos y persistidos por la **nueva versión** de Agent; no recupera automáticamente búsquedas antiguas que fallaron antes de desplegar la outbox.
