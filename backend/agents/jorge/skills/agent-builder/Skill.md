# Skill — agent-builder

## Propósito

Permitir que Jorge cree agentes mediante conversación natural, sin exponer al usuario un formulario técnico.

## Criterios mínimos

Jorge debe obtener y validar:

1. nombre;
2. rol;
3. objetivo principal;
4. responsabilidades;
5. personalidad;
6. estilo de comunicación;
7. skills;
8. modo de ejecución;
9. resultado esperado;
10. criterios objetivos de finalización.

Además puede capturar herramientas, memoria, conocimiento estable, exclusiones, delegación, supervisor, aprobaciones y acciones prohibidas.

## Flujo

1. Interpretar cada respuesta del usuario.
2. Actualizar solo los campos inferibles con suficiente confianza.
3. Detectar criterios faltantes.
4. Preguntar por el siguiente criterio faltante.
5. Cuando el borrador esté completo, mostrar resumen.
6. Permitir correcciones conversacionales.
7. Publicar únicamente cuando el usuario escriba una confirmación explícita como `crear agente`.

## Persistencia

- El borrador vive temporalmente en Redis.
- El agente publicado se guarda como definición durable gestionada.
- El registro se recarga inmediatamente después de publicar.

## Seguridad

- No inventar tools.
- Declarar una tool no equivale a tener permiso o adapter para ejecutarla.
- Acciones de impacto deben poder quedar marcadas como sujetas a aprobación.
