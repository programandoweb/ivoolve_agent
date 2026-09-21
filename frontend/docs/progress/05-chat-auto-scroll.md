# 05 — Auto-scroll del chat

Fecha: 2026-09-20

## Objetivo

Hacer que el historial del chat baje automáticamente cuando aparece contenido nuevo, como en una interfaz de mensajería tradicional.

## Implementación

Se agregó una referencia al contenedor desplazable:

```ts
const messagesContainerRef = useRef<HTMLDivElement | null>(null);
```

Cada vez que cambian:

- `messages`;
- `sending`;

se ejecuta un `scrollTo()` hacia `scrollHeight` con comportamiento suave.

Se utiliza `requestAnimationFrame()` para esperar a que React haya renderizado el nuevo contenido antes de calcular la altura final.

## Archivo afectado

- `src/components/agent-chat.tsx`

## Resultado esperado

Al:

- enviar un mensaje;
- mostrar el indicador de procesamiento;
- recibir respuesta del agente;
- recibir un error;

el chat mantiene visible la parte más reciente de la conversación.

## Pruebas ejecutadas

No se ejecutó el navegador desde el conector GitHub.
