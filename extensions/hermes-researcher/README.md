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
Adaptador inicial de Google Search y Google Imágenes visibles; cuando Google ofrece enlaces a portales públicos .gov.co, RUES, Cámara de Comercio de Pereira o páginas empresariales públicas de redes, Chrome puede abrirlos si están dentro de los permisos declarados. Los portales bloqueados o con login se omiten. La prioridad de consultas la determina el backend, no un resultado especulativo del LLM.

**Evidencia visual:** la extensión conserva URLs de miniaturas, su texto alternativo, la URL donde fueron observadas, la página de procedencia sugerida, el método de observación y el timestamp. Se incluyen en la evidencia durable y SIC recibe el extracto. **No se descargan ni archivan binarios de imágenes en esta versión.** URLs externas pueden caducar; no se deben publicar imágenes ajenas en propuestas sin comprobar su licencia/autorización. El almacenamiento permanente y la selección de imágenes con derechos aclarados son una fase independiente.

**Fuentes y límites:** SECOP y otros portales solo se consideran consultados directamente si se pudo abrir su página pública. Un resultado indexado por Google es una pista de investigación, no un certificado legal. El primer adaptador de cámaras incluye Pereira; otras cámaras requieren permisos/dominos declarados o una ampliación posterior. El backend debe proveer consultas ya autorizadas para un único prospecto.
