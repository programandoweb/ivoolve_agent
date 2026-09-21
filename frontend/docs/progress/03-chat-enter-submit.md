# 03 — Enviar mensaje con Enter

Fecha: 2026-09-20

## Objetivo

Mejorar la experiencia del chat en `http://localhost:5021/`.

## Cambio

El textarea del chat ahora usa:

- `Enter`: enviar mensaje;
- `Shift+Enter`: insertar nueva línea.

La implementación reutiliza el `onSubmit` existente mediante `requestSubmit()`, evitando duplicar la lógica de envío.

También se evita enviar mientras el navegador está procesando composición de texto mediante `nativeEvent.isComposing`.

## Archivo afectado

- `src/components/agent-chat.tsx`

## Pruebas ejecutadas

No se ejecutó el navegador desde el conector GitHub.

## Resultado esperado

El usuario puede escribir un mensaje y presionar Enter para enviarlo inmediatamente.
