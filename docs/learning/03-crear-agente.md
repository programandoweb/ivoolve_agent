# 03 — Crear un nuevo agente

Para crear `Pedro`:

```text
agents/pedro/
├── Agent.md
├── Memory.md
└── Tools.md
```

No debe modificarse el registro central.

`AgentRegistryService` descubre automáticamente la nueva carpeta al iniciar NestJS.

Más adelante Jorge utilizará las descripciones de los agentes para decidir a quién delegar.
