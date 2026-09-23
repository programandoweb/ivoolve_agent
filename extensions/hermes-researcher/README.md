# Hermes Researcher — Chrome MV3 (fase de integración)
Worker independiente de Argos. Lee solamente resultados públicos renderizados en Google Search; limita consultas y respeta bloqueos. Nunca crea researchId ni prospectId: ambos son entregados por el backend SIC a través del orquestador.
## Instalación
```powershell
cd D:\ivoolve_agent\extensions\hermes-researcher
npm install
npm run build
```
Abrir chrome://extensions, activar modo desarrollador y «Cargar descomprimida» apuntando a esta carpeta (NO a dist). Abrir el panel lateral Hermes. Autorizar el código desde el dashboard del administrador una vez esté desplegado el gateway Hermes.
## Entrega segura
La extensión conserva el lote en chrome.storage.local antes del envío. El evento hermes:stored significa exclusivamente INSERT confirmado en MariaDB de Agent; no significa que SIC haya sincronizado. Se reenvía el mismo lote si el socket se corta antes del ACK. No instalar ni activar en producción hasta desplegar el gateway compatible.
## Alcance de esta versión
Adaptador inicial de Google Search visible; no navega sitios que exigen login. Adaptadores de Maps, sitio oficial, RUES y redes se incorporan tras verificar permisos, contratos y límites. El backend debe proveer consultas ya autorizadas para un único prospecto.
