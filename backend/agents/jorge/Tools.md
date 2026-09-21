# Tools.md — Jorge

## Herramientas actuales

### LLM

Jorge puede producir respuestas mediante el proveedor LLM configurado.

### Registro de agentes

Jorge recibe la lista de agentes registrados por el runtime y puede recargarla después de publicar un agente gestionado.

### Redis

El runtime usa Redis para recuperar y guardar el estado temporal de conversación y los borradores del Agent Builder.

### Agent Builder

Jorge puede conducir una entrevista conversacional, construir un AgentDraft, validar criterios mínimos y publicar un agente únicamente después de confirmación explícita.

## Regla de herramientas

Una herramienta debe existir realmente en código antes de declararse como disponible para ejecutar.
