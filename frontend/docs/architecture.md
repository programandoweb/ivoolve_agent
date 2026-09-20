# Arquitectura frontend

```text
Browser
  |
  v
Next.js UI
  |
  v
Route Handler /api/backend/*
  |
  v
NestJS :4000
  |
  +--> Redis
  +--> Agent Registry
  +--> LLM
```

## Razón del BFF

El navegador no consume `BACKEND_URL` directamente.

Esto:

- evita depender de CORS;
- mantiene la URL interna fuera del bundle cliente;
- crea una frontera para autenticación futura;
- permite transformar errores y contratos sin acoplar la UI.
