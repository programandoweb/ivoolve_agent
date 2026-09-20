# 02 — Redis y el estado

Redis no llama al agente por sí solo.

NestJS es quien lee y escribe Redis.

Analogía:

- NestJS = trabajador;
- Redis = libreta rápida;
- LLM = cerebro al que se consulta;
- Agent.md = instrucciones del cargo;
- BullMQ = bandeja de tareas pendientes.

Cuando llega otra petición, NestJS abre la libreta, recupera el contexto y continúa.
