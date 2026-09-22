# Ivoolve SIC integration

Ivoolve Agent accepts durable campaign runs from SIC at:

`POST /internal/v1/integrations/ivoolvesic/campaign-runs`

SIC authenticates with `IVOOLVE_SIC_SERVICE_TOKEN`. Agent callbacks use `IVOOLVE_SIC_BASE_URL` and `IVOOLVE_SIC_INTERNAL_TOKEN`.

The run is queued in BullMQ, executed by the selected registered agent and persists prospects incrementally with `sic.prospects.upsert`.
