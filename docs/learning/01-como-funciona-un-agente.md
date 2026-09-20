# 01 — Cómo funciona un agente

Un agente no es un proceso mágico que piensa permanentemente.

En esta implementación un ciclo es:

1. llega una petición;
2. NestJS recupera el estado;
3. carga las instrucciones del agente;
4. construye el contexto;
5. llama al LLM;
6. recibe la respuesta;
7. guarda el nuevo estado;
8. termina la petición.

El siguiente mensaje inicia otro ciclo.

La sensación de continuidad aparece porque el nuevo ciclo recupera memoria/estado del ciclo anterior.
