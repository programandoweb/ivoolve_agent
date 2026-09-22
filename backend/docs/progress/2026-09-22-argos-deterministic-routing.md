# 2026-09-22 — Enrutamiento determinista de prospección hacia Argos

## Hallazgo
Una petición de usuario realizada desde el chat de Jorge, por ejemplo "búscame una empresa de software en Pereira", podía ser resuelta directamente por Jorge porque todas las tools ejecutables están visibles en el runtime y la delegación dependía de que el LLM devolviera el envelope JSON de delegación.

Eso provocó que la ejecución quedara asociada a Jorge y que Jorge intentara usar `prospecting.google_maps_search` directamente.

## Corrección
- El gateway ahora detecta intención explícita de descubrimiento/prospección de empresas cuando el agente de entrada es Jorge.
- En esos casos el `effectiveAgent` pasa a ser `argos-prospector` antes de crear la ejecución.
- La traza queda asociada a Argos desde el comienzo.
- Se registra el evento `agent.routed` con agente solicitado, agente efectivo y motivo.
- El prompt versionado de Jorge ahora establece como regla obligatoria que la prospección comercial corresponde a Argos.

## Ejemplo
```text
Chat de Jorge
"búscame una empresa de software en Pereira"
        ↓
agent.routed
requestedAgent = jorge
effectiveAgent = argos-prospector
        ↓
Argos
        ↓
prospecting.google_maps_search
```

## Configuración Google Maps
La tool lee `GOOGLE_MAPS_API_KEY` desde la configuración del backend. En despliegue Docker el valor canónico se define en el `.env` de la raíz de `ivoolve_agent`, porque `docker-compose.yml` lo inyecta al contenedor backend.

## Pruebas
No se ejecutaron tests ni build desde esta sesión. El cambio fue revisado en código y pusheado a `main`.

## Riesgos
El enrutamiento usa una regla conservadora basada en intención + objetivo empresarial. Peticiones meramente informativas sobre Argos o sobre empresas que no pidan descubrir/buscar no se redirigen automáticamente.
