# Agent.md — Metodología obligatoria de Ivoolve Agent

## 1. Propósito

Ivoolve Agent es un laboratorio y futuro runtime multiagente construido para aprender, entender y posteriormente operar agentes de IA reales.

El código debe ser útil en producción, pero también debe ser didáctico. Toda pieza importante del runtime debe poder ser estudiada por una persona que está aprendiendo cómo funciona un agente.

## 2. Autoridad

Prioridad de instrucciones:

1. Solicitud explícita del usuario.
2. Este `Agent.md`.
3. `docs/`.
4. Decisiones registradas en `docs/decisions/`.
5. Patrones existentes del código.

## 3. Principio pedagógico obligatorio

El runtime debe favorecer claridad sobre magia.

Reglas:

- comentar código importante;
- explicar por qué existe cada servicio;
- evitar abstracciones innecesarias;
- documentar el flujo usuario -> orquestador -> agente -> herramienta -> memoria -> respuesta;
- diferenciar claramente memoria, estado, cola, proveedor LLM y agente;
- no ocultar comportamiento crítico dentro de helpers genéricos;
- cualquier optimización que reduzca legibilidad debe justificarse.

## 4. Arquitectura base

El monorepo tendrá inicialmente:

- `apps/orchestrator`: NestJS, API y runtime multiagente;
- `agents`: definiciones declarativas de cada agente;
- Redis: estado temporal y coordinación;
- BullMQ: trabajos asíncronos y de larga duración;
- proveedor LLM intercambiable;
- documentación técnica y pedagógica.

## 5. Jorge

`Jorge` es el primer agente.

Responsabilidades:

- recibir toda petición cuando no se especifique agente;
- actuar como fallback;
- consultar agentes disponibles;
- decidir si puede responder o debe delegar;
- coordinar subagentes;
- conservar el contexto de sesión;
- devolver una respuesta final coherente.

Jorge no debe convertirse en un módulo monolítico. La orquestación debe vivir en servicios reutilizables.

## 6. Convención de agentes

Cada agente vive en:

```text
agents/<agent-id>/
├── Agent.md
├── Memory.md
└── Tools.md
```

Ejemplo futuro:

```text
agents/pedro/
├── Agent.md
├── Memory.md
└── Tools.md
```

El runtime debe descubrir agentes por carpeta. No crear un `switch` central con nombres hardcodeados.

## 7. Memoria y estado

No confundir:

- `Agent.md`: identidad e instrucciones del agente;
- `Memory.md`: memoria base/versionada en Git;
- Redis: estado temporal y conversaciones;
- base de datos futura: memoria durable estructurada;
- cola BullMQ: trabajo pendiente, no memoria.

## 8. Proveedores LLM

El dominio del agente no debe depender directamente de un proveedor.

El adapter actual usa una API compatible con OpenAI para permitir LM Studio y otros proveedores.

Toda integración LLM debe definir:

- endpoint;
- modelo;
- timeout;
- errores;
- configuración;
- fallback cuando sea incorporado;
- observabilidad.

## 9. Trabajos largos

Una petición HTTP no debe quedar abierta indefinidamente.

Cuando una tarea sea larga, reintentable o distribuida:

1. se crea un job;
2. BullMQ lo almacena en Redis;
3. un worker lo procesa;
4. el estado del trabajo queda disponible;
5. el agente puede continuar posteriormente.

## 10. Sistema documental obligatorio

Toda tarea relevante crea un archivo en `docs/progress/`.

Toda decisión arquitectónica importante crea un ADR en `docs/decisions/`.

El registro de progreso debe contener:

- fecha;
- objetivo;
- contexto;
- decisiones;
- alcance;
- archivos afectados;
- cambios;
- pruebas ejecutadas;
- resultado;
- riesgos;
- pendientes;
- siguiente paso sugerido.

## 11. Flujo obligatorio para modificar el repo

1. Leer este archivo.
2. Revisar progreso reciente.
3. Revisar decisiones relacionadas.
4. Definir alcance.
5. Implementar.
6. Ejecutar pruebas posibles.
7. Actualizar documentación.
8. Crear registro de progreso.
9. Hacer commit/push.
10. Informar exactamente qué quedó probado y qué no.

## 12. Definición de terminado

Una tarea está terminada cuando:

- cumple el alcance;
- código y arquitectura son entendibles;
- no introduce secretos;
- variables de entorno están documentadas;
- pruebas posibles fueron ejecutadas;
- documentación fue actualizada;
- progreso quedó registrado;
- el cambio quedó versionado.

## 13. Prohibiciones

Sin autorización explícita no se debe:

- guardar API keys reales;
- acoplar agentes directamente a un único proveedor;
- usar Redis como base de datos de negocio;
- afirmar pruebas no ejecutadas;
- crear agentes fuera de `agents/`;
- introducir lógica de routing por nombres hardcodeados;
- dejar decisiones relevantes solo en conversaciones;
- eliminar comentarios pedagógicos para reducir líneas.
