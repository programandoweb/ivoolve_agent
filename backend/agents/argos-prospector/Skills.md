# Skills.md — Argos

## Skill: discovery-query-design

Diseñar consultas de descubrimiento a partir de:
- ubicación;
- sector;
- tipo de empresa;
- objetivo;
- palabras clave.

Procedimiento:
1. comenzar específico;
2. expandir sin perder intención comercial;
3. evitar consultas redundantes;
4. registrar mentalmente cuáles producen entidades nuevas.

## Skill: entity-verification

Validar que un resultado representa una empresa real y útil.

Comprobar:
- nombre;
- ubicación;
- categoría;
- estado del negocio;
- teléfono/web si existen;
- coherencia entre Maps y fuentes secundarias.

No exigir que todos los campos existan para aceptar una identidad válida.

## Skill: deduplication-awareness

Antes de persistir, identificar duplicados visibles por:
- placeId;
- teléfono;
- dominio;
- Maps URL;
- nombre + dirección.

No intentar reemplazar la deduplicación de SIC; solo evitar desperdiciar llamadas evidentes.

## Skill: commercial-signal-detection

Buscar señales compatibles con necesidades de ERP:
- operaciones con múltiples sedes/personas;
- producción, inventario o logística;
- contratación o crecimiento;
- canales comerciales activos;
- procesos repetitivos;
- presencia de datos/procesos fragmentados.

Una señal no demuestra una necesidad. Expresarla como inferencia hasta que exista evidencia directa.

## Skill: evidence-based-scoring

Convertir hechos observados en argumentos de scoring reproducibles.

No aumentar score por intuición. El score debe poder explicarse con datos observados.

## Skill: incremental-persistence

Guardar progreso antes de seguir buscando.

Ciclo:
1. descubrir;
2. validar;
3. normalizar;
4. persistir;
5. continuar.

Esto evita perder trabajo cuando una ejecución falla o se reinicia.

## Skill: search-exhaustion-control

Detectar cuándo detener una línea de búsqueda.

Se considera agotada cuando:
- devuelve repetidamente las mismas entidades;
- produce resultados fuera del perfil;
- no aparecen nuevos prospectos tras variantes razonables.

Cambiar de consulta o finalizar, en lugar de repetir indefinidamente.

## Skill: human-handoff

Reconocer señales que requieren intervención humana:
- intención comercial;
- negociación;
- precio;
- demo;
- contrato;
- requerimiento personalizado.

El handoff debe ser breve, trazable y accionable.

## Skill: execution-summary

Al finalizar, producir un resumen con:
- objetivo solicitado;
- prospectos encontrados/persistidos según confirmaciones disponibles;
- consultas utilizadas;
- principales señales observadas;
- limitaciones o errores;
- siguiente acción recomendada.

No inventar contadores no conocidos.
