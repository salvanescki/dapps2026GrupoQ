# Feature Specification: Reducción Integral de Duplicación de Código en SonarQube Cloud

**Feature Branch**: `016-reduce-sonar-duplications`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Reducir la duplicación de código detectada por SonarQube Cloud (actualmente 562 líneas / 2.0% en Overall Code y 1.47% en New Code, distribuidas en 10 archivos y 23 bloques) eliminando la totalidad de la duplicación en los 7 archivos de código productivo (199 líneas duplicadas en dominio, acceso a datos, servicios de caché, ingesta estadística y tipos de vista) y excluyendo de la evaluación de duplicación las 3 migraciones históricas de esquemas (363 líneas duplicadas), llevando la duplicación reportada a ~0% (0 líneas duplicadas) sin alterar el comportamiento funcional, manteniendo la arquitectura en 5 capas, la inmutabilidad de las pruebas preexistentes y la cobertura mínima de 80% en líneas y ramas tanto en backend como en frontend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidación de Lógica Duplicada en Dominio, Persistencia y Servicios de Caché (Priority: P1)

Como responsable de la calidad y evolución del producto, quiero que las reglas de negocio del modelo de jugador, las consultas de persistencia de transacciones y los mecanismos de almacenamiento temporal en caché del mercado y de la ingesta estadística operen sin bloques duplicados, para garantizar que cualquier ajuste futuro en las reglas de cotización, historial de operaciones o políticas de expiración se realice en un único punto coherente sin riesgo de divergencia funcional.

**Why this priority**: Concentra 131 de las 199 líneas duplicadas en código productivo (65,8% de la duplicación productiva), abarcando el núcleo de negocio del jugador (43 líneas), el acceso a datos de transacciones (34 líneas) y la gestión de caché de mercado e ingesta (54 líneas en 2 componentes). Cualquier inconsistencia al mantener código duplicado en estas capas impacta directamente en la exactitud de precios, saldos, transacciones y disponibilidad de datos.

**Independent Test**: Se puede verificar de forma independiente comprobando que el análisis de duplicación sobre las áreas de dominio de jugador, persistencia de transacciones y servicios de caché reporta 0 líneas y 0 bloques duplicados, mientras que todas las operaciones de catálogo, mercado, órdenes e ingesta conservan intacto su comportamiento y sus garantías transaccionales.

**Acceptance Scenarios**:

1. **Given** la entidad de dominio de jugador con 43 líneas duplicadas distribuidas en 2 bloques internos de validación y actualización de estado, **When** se unifica el comportamiento común dentro de la propia capa de dominio preservando un modelo de dominio rico, **Then** la entidad registra 0 líneas duplicadas y mantiene idénticas todas sus invariantes de negocio y cálculos de cotización.
2. **Given** el repositorio de acceso a datos de transacciones con 34 líneas duplicadas en 2 bloques de consulta y filtrado, **When** se consolida la construcción de criterios de consulta respetando el aislamiento de la capa de acceso a datos, **Then** el componente reporta 0 líneas duplicadas y devuelve exactamente los mismos registros y ordenamientos para todas las consultas de historial.
3. **Given** los servicios de caché del mercado (27 líneas duplicadas) y de ingesta estadística (27 líneas duplicadas) que repiten 54 líneas en 2 bloques de gestión de almacenamiento temporal y tolerancia a fallos, **When** se centraliza el mecanismo común dentro de la capa de servicios sin mezclar responsabilidades de negocio, **Then** ambos servicios reportan 0 líneas duplicadas y mantienen intactas sus políticas de lectura, escritura, invalidación y degradación elegante.

---

### User Story 2 - Unificación de Estructuras de Métricas Estadísticas entre Dominio, Ingesta y Vista (Priority: P2)

Como analista deportivo y usuario de la plataforma, quiero que las definiciones y estructuras de métricas de desempeño de los jugadores sean consistentes y libres de duplicación entre el modelo de dominio estadístico, el flujo de extracción de datos y la vista de detalle del jugador, para asegurar que todos los indicadores deportivos se procesen y visualicen de forma uniforme sin definiciones redundantes en ambos módulos (`backend` y `frontend`).

**Why this priority**: Representa las 68 líneas restantes de duplicación en código productivo (34,2% del código productivo duplicado, distribuidas en 5 bloques a través de 3 archivos en `backend` y `frontend`), permitiendo completar la eliminación del 100% de la duplicación en código de aplicación.

**Independent Test**: Se puede probar de forma independiente verificando que las unidades de estadísticas de dominio (26 líneas), el servicio de extracción estadística (26 líneas) y las definiciones de vista de jugador en `frontend` (16 líneas) reducen su duplicación reportada a 0 bloques y 0 líneas, manteniendo sin cambios la captura, almacenamiento y visualización de métricas por partido y temporada.

**Acceptance Scenarios**:

1. **Given** la repetición de 26 líneas (2 bloques) entre la entidad de estadísticas de jugador y el servicio de extracción estadística en el módulo `backend`, **When** se reutiliza una definición común respetando la dirección de dependencias hacia la capa de dominio, **Then** ambos componentes quedan con 0 líneas duplicadas y el proceso de ingesta continúa registrando las calificaciones y métricas sin alteraciones.
2. **Given** el bloque de 16 líneas (1 bloque) de atributos estadísticos en las definiciones de jugador del módulo `frontend` que duplica la estructura declarada en el módulo `backend`, **When** se estructura la representación de la vista de manera cohesiva y desacoplada entre capas, **Then** el módulo `frontend` reduce su duplicación del 0,1% (16 líneas) al 0,0% (0 líneas) manteniendo intacta la presentación de estadísticas en el catálogo, detalle de jugador y equipo de la semana.

---

### User Story 3 - Delimitación del Alcance de Análisis Frente a Migraciones Históricas de Esquemas (Priority: P3)

Como responsable de auditoría técnica y gobernanza de calidad, quiero que las definiciones históricas e inmutables de creación de esquemas de datos queden excluidas de la medición de duplicación de código mientras todo el código productivo permanece bajo control estricto, para que los indicadores de calidad reflejen fielmente la mantenibilidad real del sistema sin incentivar la alteración riesgosa de migraciones ya ejecutadas.

**Why this priority**: Las 3 migraciones históricas concentran 363 líneas y 12 bloques duplicados (64,6% del total de líneas duplicadas del proyecto) producto de definiciones declarativas de tablas y columnas que por principio de integridad histórica no deben reescribirse ni acoplarse a código compartido cambiante.

**Independent Test**: Se puede verificar de manera independiente comprobando que el análisis de SonarQube Cloud excluye exclusivamente las rutas de migraciones históricas de la detección de duplicados y reporta 0 líneas duplicadas tanto en el código global (`Overall Code`) como en el código nuevo (`New Code`).

**Acceptance Scenarios**:

1. **Given** los 3 archivos históricos de migración de esquemas que registran 363 líneas duplicadas (188, 98 y 77 líneas respectivamente, en 12 bloques), **When** se configura la exclusión de detección de duplicación únicamente para las migraciones de esquemas, **Then** las migraciones permanecen íntegras e inalteradas y dejan de distorsionar el indicador de duplicación del proyecto.
2. **Given** la exclusión de las migraciones históricas combinada con la remediación de los 7 archivos de código productivo, **When** se ejecuta la verificación integral de calidad en SonarQube Cloud, **Then** la densidad de duplicación global (`Overall Code`) baja de 2,0% (562 líneas) a 0,0% (0 líneas) y la de código nuevo (`New Code`) baja de 1,47% a 0,0%.

---

### Edge Cases

- ¿Qué ocurre si al consolidar lógica compartida entre la entidad de estadísticas de jugador y el servicio de extracción estadística se corre el riesgo de invertir la dependencia entre capas?
  → La definición de conceptos y estructuras del negocio reside siempre en la capa de dominio, de modo que la capa de servicios dependa del dominio y nunca el dominio de capas superiores, respetando estrictamente la arquitectura en 5 capas.
- ¿Qué ocurre si al eliminar la duplicación entre las definiciones estadísticas del `backend` y las del `frontend` se intenta acoplar ambos módulos mediante dependencias cruzadas incompatibles con su despliegue independiente?
  → Cada módulo conserva su independencia de compilación y despliegue, expresando sus contratos de acuerdo con su responsabilidad (modelo de dominio/ingesta en `backend` y representación de vista en `frontend`) sin compartir bloques idénticos que disparen alertas de duplicación.
- ¿Qué ocurre cuando uno de los servicios de caché unificados enfrenta una caída o indisponibilidad temporal del almacén de caché?
  → La lógica consolidada preserva el comportamiento resiliente existente (degradación elegante y registro de advertencia sin interrumpir el flujo principal del usuario).
- ¿Qué ocurre con las pruebas automatizadas existentes y los umbrales de cobertura al extraer o consolidar comportamiento duplicado?
  → Ninguna prueba preexistente se modifica ni elimina (cumpliendo la política no negociable de inmutabilidad de pruebas), y toda unidad nueva o refactorizada mantiene una cobertura mínima de 80% en líneas y 80% en bifurcaciones de forma independiente en `backend` y en `frontend`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST reducir a **0 líneas duplicadas** y **0 bloques duplicados** la totalidad de la duplicación reportada por SonarQube Cloud en el proyecto `salvanescki_dapps2026GrupoQ` (actualmente **562 líneas** y **23 bloques** en **10 archivos**, equivalentes a **2,0%** en `Overall Code` y **1,47%** en `New Code`).
- **FR-002**: El módulo `backend` MUST eliminar las **43 líneas duplicadas** (2 bloques, 13,7% de densidad) en la entidad de dominio de jugador, preservando todas las reglas de negocio, validaciones e invariantes dentro de la capa de dominio bajo el enfoque de modelo de dominio rico.
- **FR-003**: El módulo `backend` MUST eliminar las **34 líneas duplicadas** (2 bloques, 28,8% de densidad) en el repositorio de acceso a datos de transacciones, manteniendo el aislamiento de la capa de persistencia sin incorporar reglas de negocio ni alterar los resultados de consulta.
- **FR-004**: El módulo `backend` MUST eliminar las **54 líneas duplicadas** (2 bloques: 27 líneas / 18,6% en caché de mercado y 27 líneas / 21,6% en caché de ingesta estadística) consolidando las operaciones comunes de gestión de caché dentro de la capa de servicios y preservando las políticas de expiración, invalidación y tolerancia a fallos.
- **FR-005**: Los módulos `backend` y `frontend` MUST eliminar las **68 líneas duplicadas** asociadas a las estructuras de métricas estadísticas de jugadores (26 líneas / 2 bloques en la entidad de dominio de estadísticas, 26 líneas / 2 bloques en el servicio de extracción estadística y 16 líneas / 1 bloque en las definiciones de vista de jugador en `frontend`), respetando la separación unidireccional de las 5 capas arquitectónicas.
- **FR-006**: La configuración de análisis de calidad del repositorio MUST excluir de la evaluación de duplicación de código exclusivamente las migraciones históricas de esquemas (**3 archivos**, **363 líneas duplicadas**, **12 bloques**), sin modificar el contenido de dichas migraciones ni excluir ningún archivo de código productivo.
- **FR-007**: La remediación MUST preservar el 100% del comportamiento funcional observable del sistema, la compatibilidad de los contratos de la API REST pública (documentación OpenAPI/Swagger y colección Postman) y la separación estricta en 5 capas (`Frontend`, `Controller`, `Service`, `Model`, `Data Access`).
- **FR-008**: La remediación MUST cumplir de manera estricta la política de inmutabilidad de pruebas (queda prohibido modificar o eliminar cualquier test existente sin autorización explícita del usuario) y mantener o superar el umbral mínimo de **80% de cobertura de líneas (`lines`) y 80% de bifurcaciones (`branches`)** medido por separado en `backend` y en `frontend`.

### Matriz de Trazabilidad de Grupos y Áreas de Duplicación en Alcance (10 Archivos / 23 Bloques / 562 Líneas)

| # | Grupo / Área Funcional en Alcance | Módulo | Capa Arquitectónica | Archivos Actuales | Bloques Actuales | Líneas Dup. Actuales | Meta Líneas / Bloques | Estrategia y Justificación de Negocio (QUÉ y POR QUÉ) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Reglas y actualización de estado en entidad de Jugador | `backend` | `Model (Dominio)` | 1 | 2 | 43 | 0 / 0 | Consolidar validaciones y transiciones internas del jugador para garantizar una única fuente de verdad en las reglas de dominio. |
| 2 | Consultas y filtrado en repositorio de Transacciones | `backend` | `Data Access (Repository)` | 1 | 2 | 34 | 0 / 0 | Unificar la construcción de consultas repetidas para evitar discrepancias al recuperar historiales de operaciones. |
| 3 | Gestión de caché de Mercado e Ingesta Estadística | `backend` | `Service` | 2 | 2 | 54 (27 + 27) | 0 / 0 | Centralizar el manejo común de almacenamiento temporal y resiliencia ante fallos sin duplicar infraestructura de servicio. |
| 4 | Estructuras y contratos de Métricas Estadísticas de Jugador | `backend` / `frontend` | `Model`, `Service` y `Frontend` | 3 (2 BE + 1 FE) | 5 (4 BE + 1 FE) | 68 (52 BE + 16 FE) | 0 / 0 | Eliminar definiciones redundantes de atributos estadísticos entre dominio, ingesta y vista manteniendo el desacoplamiento por capas. |
| 5 | Migraciones históricas declarativas de esquemas de datos | `backend` | Persistencia (Historial de Esquemas) | 3 | 12 | 363 (188 + 98 + 77) | 0 / 0 | Excluir del cálculo de duplicación las migraciones históricas inmutables para reflejar fielmente la calidad del código productivo sin alterar esquemas pasados. |
| **Subtotal Productivo** | **Código de Aplicación (Grupos 1 a 4)** | **`backend` + `frontend`** | **5 Capas** | **7 (6 BE + 1 FE)** | **11 (10 BE + 1 FE)** | **199 (183 BE + 16 FE)** | **0 / 0** | **Eliminación del 100% de la duplicación en código productivo mediante refactorización limpia.** |
| **Total General** | **Proyecto Completo (`salvanescki_dapps2026GrupoQ`)** | **`backend` + `frontend`** | **Todas** | **10 (9 BE + 1 FE)** | **23 (22 BE + 1 FE)** | **562 (546 BE + 16 FE)** | **0 / 0** | **Reducción de la densidad de duplicación de 2,0% (`Overall`) y 1,47% (`New Code`) a 0,0%.** |

### Key Entities

- **Bloque de Duplicación Productiva**: Fragmento de lógica, consulta o definición estructural repetido en uno o más archivos de aplicación activa (actualmente 11 bloques y 199 líneas en 7 archivos) que incrementa el costo de mantenimiento y el riesgo de inconsistencias funcionales.
- **Migración Histórica de Esquema**: Registro secuencial e inmutable de evolución de la estructura de datos (actualmente 3 archivos con 12 bloques y 363 líneas repetidas por naturaleza declarativa) que debe preservarse intacto en el tiempo y quedar fuera del cálculo de duplicación productiva.
- **Indicador de Densidad de Duplicación**: Métrica porcentual auditada por SonarQube Cloud sobre el total de líneas del proyecto (`Overall Code`: 2,0% actual; `New Code`: 1,47% actual) cuya meta objetivo tras la intervención es ~0,0% (0 líneas duplicadas).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las líneas duplicadas en los **7 archivos de código productivo** se reducen de **199 a 0** (de 183 a 0 en `backend` y de 16 a 0 en `frontend`), y los bloques duplicados productivos pasan de **11 a 0**.
- **SC-002**: Tras la remediación del código productivo y la exclusión de las **3 migraciones históricas** (363 líneas / 12 bloques), el reporte de SonarQube Cloud para `salvanescki_dapps2026GrupoQ` registra **0 líneas duplicadas**, **0 bloques duplicados**, **0 archivos con duplicación** y una densidad de duplicación de **0,0%** tanto en `Overall Code` (desde 2,0%) como en `New Code` (desde 1,47%).
- **SC-003**: El 100% de las suites de pruebas automatizadas existentes en `backend` y `frontend` finaliza con estado exitoso (**0 fallos**) y con **0 pruebas preexistentes modificadas o eliminadas**.
- **SC-004**: La cobertura de pruebas se mantiene en un nivel **≥ 80% en líneas (`lines`) y ≥ 80% en bifurcaciones (`branches`)** de forma independiente tanto en `backend` como en `frontend`, y cualquier código nuevo incorporado alcanza al menos un 80% de cobertura propia en ambas métricas.
- **SC-005**: El 100% de los contratos públicos de la API REST, la documentación OpenAPI/Swagger, la colección Postman del proyecto y los flujos de usuario de negocio mantienen un comportamiento idéntico sin regresiones ni nuevos issues de calidad o seguridad en SonarQube Cloud.

## Assumptions

- Las 3 migraciones de base de datos existentes constituyen artefactos históricos ya consolidados cuyo contenido no debe alterarse para evitar inconsistencias entre entornos; por tanto, la estrategia acordada es su exclusión explícita del detector de código duplicado.
- La eliminación de las 199 líneas duplicadas en los 7 archivos de código productivo es completamente realizable mediante abstracciones cohesivas internas dentro de cada capa arquitectónica correspondiente, sin requerir cambios en los contratos HTTP públicos ni en el esquema relacional persistido.
- Los nombres de conceptos de negocio que se introduzcan durante la consolidación respetarán la convención lingüística del proyecto (identificadores de dominio en español sin acentos ni letra `ñ`, y términos técnicos/arquitectónicos en inglés).
