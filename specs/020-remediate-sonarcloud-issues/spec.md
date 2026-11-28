# Feature Specification: Remediación Integral de los 49 Issues Abiertos en SonarQube Cloud

**Feature Branch**: `020-remediate-sonarcloud-issues`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "Remediación integral de la totalidad de los 49 issues abiertos en SonarQube Cloud (17 reglas activas en los módulos backend y frontend, todas las severidades: CRITICAL, MAJOR y MINOR) del proyecto salvanescki_dapps2026GrupoQ, llevando el conteo de hallazgos abiertos a cero sin regresiones funcionales, respetando la arquitectura y constitución del proyecto y manteniendo la cobertura mínima de pruebas del 80%."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reducción de Complejidad Cognitiva Crítica en Observabilidad y Auditoría (Priority: P1)

Como responsable de calidad operativa y evolución del producto, quiero que los flujos de auditoría, recolección de métricas y visualización de observabilidad que superan el umbral permitido de complejidad cognitiva sean simplificados en unidades cohesivas y comprensibles, para disminuir el riesgo de defectos ocultos, acelerar la revisión de incidentes y eliminar la totalidad de los 6 hallazgos de severidad `CRITICAL` distribuidos entre `backend` y `frontend`.

**Why this priority**: Los 6 hallazgos de severidad `CRITICAL` (concentrados en la regla `typescript:S3776`, con 2 ocurrencias en `backend` y 4 en `frontend`, y 69 minutos de deuda técnica) representan el riesgo más alto para la mantenibilidad, legibilidad y confiabilidad evolutiva de los módulos de observabilidad y auditoría.

**Independent Test**: Se puede verificar de forma independiente comprobando en el análisis estático de SonarQube Cloud que la regla `typescript:S3776` registra exactamente 0 ocurrencias abiertas en todo el repositorio, mientras los flujos de sanitización de auditoría, recopilación de métricas de aplicación y consulta/formateo del panel de observabilidad producen resultados funcionales idénticos.

**Acceptance Scenarios**:

1. **Given** los 2 flujos críticos del módulo `backend` (sanitización de trazas de auditoría y recopilación de métricas operativas) que actualmente superan el límite máximo permitido de 15 puntos de complejidad cognitiva (registrando 31 y 22 puntos respectivamente), **When** se descomponen en responsabilidades claras y acotadas preservando el comportamiento de enmascaramiento de datos sensibles y el cómputo de indicadores, **Then** cada unidad evaluada registra una complejidad cognitiva menor o igual a 15 y las 2 ocurrencias en `backend` quedan resueltas sin pérdida de información ni alteración de métricas.
2. **Given** los 4 flujos críticos del módulo `frontend` (consumo de datos de observabilidad, coordinación de estado y actualización periódica del tablero, formateo de indicadores y lectura del reporte de métricas) que actualmente superan los 15 puntos de complejidad cognitiva (registrando 19, 22, 16 y 19 puntos respectivamente), **When** se simplifican manteniendo intactos los cálculos, el manejo de estados de carga/error y la presentación visual de los indicadores, **Then** cada unidad evaluada registra una complejidad cognitiva menor o igual a 15 y las 4 ocurrencias en `frontend` quedan resueltas sin degradar la experiencia del operador.

---

### User Story 2 - Prevención de Degradación de Rendimiento y Protección de Invariantes de Dominio (Priority: P2)

Como responsable de operación, seguridad y consistencia de negocio, quiero eliminar los patrones de procesamiento de texto vulnerables a degradación superlineal de tiempo de ejecución y reforzar la inmutabilidad y seguridad de los datos en entidades de dominio, para prevenir bloqueos ante entradas extensas o atípicas y eliminar la totalidad de los 8 hallazgos de severidad `MAJOR` en `backend` y `frontend`.

**Why this priority**: Los 8 hallazgos `MAJOR` (distribuidos en 4 reglas: `typescript:S8786` con 5 ocurrencias, `typescript:S5869` con 1, `typescript:S4043` con 1 y `typescript:S2933` con 1; sumando 112 minutos de deuda técnica) inciden directamente en la resiliencia operativa frente a entradas costosas de procesar (auditoría y observabilidad) y en la integridad del modelo de dominio (equipo semanal y estadísticas de jugadores).

**Independent Test**: Se puede verificar de manera independiente auditando que las 4 reglas de severidad `MAJOR` alcancen 0 hallazgos abiertos, validando que las entradas extensas en auditoría y observabilidad se procesen con tiempo de respuesta lineal predecible y que el cálculo de equipo semanal y la gestión de estadísticas de jugadores conserven exactamente sus resultados de negocio.

**Acceptance Scenarios**:

1. **Given** los 5 patrones de validación, sanitización o extracción de texto señalados por riesgo de degradación superlineal de rendimiento (`typescript:S8786`: 2 en `backend` sobre eventos y sanitización de auditoría, y 3 en `frontend` sobre consumo y lectura de métricas), **When** se procesan entradas extensas, malformadas o con gran cantidad de repeticiones, **Then** la evaluación se completa en tiempo lineal acotado, conserva las mismas coincidencias válidas e inválidas y las 5 ocurrencias desaparecen del análisis de calidad.
2. **Given** el patrón de clasificación de eventos de auditoría con elementos duplicados en una misma regla de coincidencia (`typescript:S5869`, 1 ocurrencia en `backend`), **When** se depura la definición eliminando redundancias, **Then** la clasificación de eventos mantiene resultados idénticos y el hallazgo queda en 0.
3. **Given** la operación de ordenamiento sobre la selección del equipo semanal (`typescript:S4043`, 1 ocurrencia en `backend`) y el atributo interno no reasignable de las estadísticas de jugador (`typescript:S2933`, 1 ocurrencia en `backend`), **When** se evita la mutación colateral inesperada durante el ordenamiento y se explicita la inmutabilidad del atributo de dominio, **Then** los rankings semanales y las estadísticas de jugadores mantienen exactamente sus invariantes de negocio y ambos hallazgos `MAJOR` quedan resueltos.

---

### User Story 3 - Fidelidad de Registros de Auditoría, Contratos Claros y Validación Numérica Estricta (Priority: P3)

Como operador del sistema y analista de incidentes, quiero que los registros de auditoría y error muestren siempre información legible en lugar de marcadores genéricos sin significado, que los puntos de control de salud y métricas declaren contratos coherentes con su comportamiento real, y que las validaciones numéricas y definiciones de categoría del panel de observabilidad sean precisas, resolviendo los 18 hallazgos `MINOR` de impacto directo en diagnóstico y claridad de datos.

**Why this priority**: Aunque clasificados como `MINOR`, estos 18 hallazgos (agrupados en 4 reglas: `typescript:S6551` con 8 ocurrencias, `typescript:S7773` con 5, `typescript:S7503` con 3 y `typescript:S6571` con 2; sumando 75 minutos de deuda técnica) afectan directamente la legibilidad de logs de auditoría en producción, la claridad de contratos de salud/métricas y la precisión de validaciones numéricas en el monitoreo.

**Independent Test**: Se puede probar de forma independiente verificando que las reglas `typescript:S6551`, `typescript:S7773`, `typescript:S7503` y `typescript:S6571` lleguen a 0 ocurrencias abiertas, confirmando que los registros de auditoría expresan valores y errores de forma legible (sin marcadores genéricos sin valor diagnóstico), que los puntos de consulta de salud y métricas conservan sus contratos de respuesta y que los indicadores numéricos de observabilidad manejan correctamente valores válidos, faltantes o fuera de rango.

**Acceptance Scenarios**:

1. **Given** los 8 puntos del subsistema de auditoría y registro estructurado en `backend` que actualmente pueden convertir objetos arbitrarios o errores en una representación textual genérica inservible (`typescript:S6551`), **When** se registra un evento con metadatos de usuario, mensajes complejos o errores no estándar, **Then** el registro produce una representación textual comprensible y segura para diagnóstico y las 8 ocurrencias quedan resueltas.
2. **Given** las 5 verificaciones y conversiones numéricas en el módulo `frontend` de observabilidad que dependen de comprobaciones globales ambiguas (`typescript:S7773`), **When** el tablero interpreta métricas numéricas, valores ausentes o entradas no numéricas, **Then** los cálculos y formatos continúan produciendo exactamente los mismos valores visuales con semántica numérica estricta y 0 hallazgos abiertos.
3. **Given** las 3 operaciones de consulta de estado de salud y métricas en `backend` declaradas como asíncronas sin espera diferida efectiva (`typescript:S7503`), **When** se alinea su declaración con su ejecución real preservando los contratos de respuesta y el consumo por clientes, **Then** los servicios de salud y métricas responden de manera idéntica y las 3 ocurrencias pasan a 0.
4. **Given** la definición de categoría de mercado en el modelo de datos de observabilidad del `frontend` donde los valores específicos quedan absorbidos por una categoría genérica (`typescript:S6571`, 2 ocurrencias), **When** se clarifica la definición sin restringir valores legítimos provenientes del servicio, **Then** desaparecen las 2 advertencias sin romper la compatibilidad con los datos de mercado mostrados en pantalla.

---

### User Story 4 - Estandarización, Higiene Expresiva y Deuda Técnica Cero en Todo el Repositorio (Priority: P4)

Como equipo de ingeniería responsable de la sostenibilidad del producto, quiero resolver los 17 hallazgos `MINOR` restantes de estandarización y claridad expresiva en `backend` y `frontend` para alcanzar exactamente 0 issues abiertos en SonarQube Cloud y mantener una base uniforme, concisa y fácil de auditar.

**Why this priority**: Completar estas 8 reglas restantes (`typescript:S7772` con 5, `typescript:S6606` con 3, `typescript:S7744` con 2, `typescript:S6582` con 2, `typescript:S6353` con 2, `typescript:S7778` con 1, `typescript:S6594` con 1 y `typescript:S5906` con 1; sumando 81 minutos de deuda técnica) lleva el tablero completo de calidad de SonarQube Cloud a deuda técnica cero.

**Independent Test**: Se puede verificar de forma independiente comprobando que las 8 reglas listadas registren 0 ocurrencias abiertas en SonarQube Cloud y que la navegación del usuario, el registro de auditoría, el panel de observabilidad y las suites automatizadas funcionen sin ningún cambio observable negativo.

**Acceptance Scenarios**:

1. **Given** las 5 referencias a utilidades estándar del entorno de ejecución en el subsistema de auditoría del `backend` sin la convención estandarizada de módulo nativo (`typescript:S7772`), **When** se normalizan dichas referencias, **Then** el subsistema de auditoría opera de manera idéntica y los 5 hallazgos desaparecen.
2. **Given** las expresiones condicionales verbosas para valores por defecto (`typescript:S6606`: 1 en `backend`, 2 en `frontend`), las verificaciones encadenadas de presencia (`typescript:S6582`: 1 en `backend`, 1 en `frontend`) y las estructuras vacías sin efecto al construir estados iniciales de observabilidad (`typescript:S7744`: 2 en `frontend`), **When** se simplifican preservando estrictamente la semántica ante valores nulos, indefinidos, cero o cadenas vacías, **Then** los 7 hallazgos quedan resueltos sin alterar el comportamiento en casos límite.
3. **Given** los patrones de lectura del reporte de métricas en `frontend` con definiciones de clases de caracteres extensas o invocaciones no estandarizadas (`typescript:S6353`: 2 ocurrencias y `typescript:S6594`: 1 ocurrencia) y la construcción incremental de opciones de navegación en `frontend` (`typescript:S7778`: 1 ocurrencia), **When** se expresan en forma concisa y estándar, **Then** las métricas interpretadas y los elementos de navegación según rol de usuario permanecen idénticos y los 4 hallazgos desaparecen.
4. **Given** el único hallazgo ubicado en una prueba unitaria preexistente de sanitización de auditoría (`typescript:S5906`, 1 ocurrencia en `backend`) que solicita una aserción más específica para verificar la longitud máxima del texto truncado, **When** se cuenta con la autorización explícita del usuario exigida por la política constitucional de inmutabilidad de pruebas y se actualiza únicamente la forma de esa aserción manteniendo exactamente el mismo contrato de longitud verificada, **Then** el hallazgo queda resuelto sin debilitar la verificación ni modificar ninguna otra prueba existente.

---

### Edge Cases

- **Política constitucional de inmutabilidad de pruebas frente a `typescript:S5906`**: El Principio IV de la Constitución del proyecto prohíbe modificar o eliminar cualquier prueba existente sin autorización explícita del usuario. Dado que 1 de los 49 issues confirmados en el alcance (`typescript:S5906`) reside dentro de una prueba unitaria existente del `backend`, los otros 48 hallazgos en código de producción deben remediarse sin tocar ninguna prueba preexistente, y la edición de esa única aserción debe preservar exactamente el mismo contrato funcional y requerir confirmación explícita del usuario antes de aplicarse en la fase de implementación.
- **Preservación de valores válidos que representan cero, texto vacío o falso al simplificar valores por defecto (`typescript:S6606`) y accesos encadenados (`typescript:S6582`)**: Al simplificar evaluaciones de ausencia en métricas, estados de observabilidad o metadatos de auditoría, valores numéricos iguales a cero, textos vacíos significativos o estados booleanos falsos no deben ser sobrescritos erróneamente por valores de respaldo.
- **Entradas maliciosas o anormalmente largas en auditoría y lectura de métricas (`typescript:S8786`)**: Al reescribir patrones susceptibles a retroceso excesivo, textos con miles de caracteres repetidos, delimitadores sin cierre o encabezados atípicos deben procesarse sin congelamiento y mantener intacta la ocultación de secretos/credenciales (sanitización de auditoría) y la extracción fiel de series de métricas.
- **Representación segura de valores no textuales en auditoría (`typescript:S6551`)**: Cuando un metadato de usuario, mensaje o error contiene estructuras anidadas, referencias circulares, valores vacíos o errores sin mensaje textual, la conversión a texto debe ser determinista, acotada en longitud y libre de fallos secundarios que interrumpan la operación auditada.
- **Separación estricta de capas al reducir complejidad cognitiva (`typescript:S3776`)**: Al descomponer funciones complejas en `backend` y `frontend`, ninguna regla de negocio puede desplazarse fuera de la capa de dominio hacia controladores, servicios o repositorios, respetando la arquitectura en 5 capas y el modelo de dominio rico definidos en la Constitución.
- **Cobertura de bifurcaciones en nuevas unidades auxiliares**: Al dividir funciones de alta complejidad en subtareas más pequeñas, la cobertura independiente de líneas y bifurcaciones en `backend` y `frontend` debe mantenerse igual o superior al 80% sin disminuir los umbrales vigentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto MUST resolver la totalidad de los **49 issues abiertos** distribuidos en **17 reglas** reportadas por SonarQube Cloud para `salvanescki_dapps2026GrupoQ` (**26** en `backend` y **23** en `frontend`), reduciendo el conteo total de hallazgos abiertos a **0**.
- **FR-002**: El proyecto MUST reducir la complejidad cognitiva de las **6** unidades señaladas por la regla `typescript:S3776` (**2** en `backend` y **4** en `frontend`) a un valor menor o igual a **15 puntos** en cada caso, eliminando el 100% de los hallazgos de severidad `CRITICAL`.
- **FR-003**: Ambos módulos (`backend` y `frontend`) MUST eliminar los riesgos de degradación superlineal en procesamiento de texto (`typescript:S8786`: **5** ocurrencias) y la redundancia en patrones de clasificación de eventos (`typescript:S5869`: **1** ocurrencia), preservando integralmente la sanitización de datos sensibles y la precisión en la lectura de métricas.
- **FR-004**: El módulo `backend` MUST reforzar la integridad e inmutabilidad del modelo de dominio eliminando el ordenamiento que muta directamente la colección original en la entidad de equipo semanal (`typescript:S4043`: **1** ocurrencia) y protegiendo explícitamente el atributo interno no reasignable en la entidad de estadísticas de jugador (`typescript:S2933`: **1** ocurrencia).
- **FR-005**: El módulo `backend` MUST garantizar que los registros estructurados y de auditoría conviertan valores y errores a texto de manera legible y segura sin producir representaciones genéricas inútiles (`typescript:S6551`: **8** ocurrencias), alinee los contratos asíncronos de los servicios de salud y métricas con su ejecución real (`typescript:S7503`: **3** ocurrencias) y estandarice las referencias a capacidades nativas del entorno (`typescript:S7772`: **5** ocurrencias).
- **FR-006**: El módulo `frontend` MUST aplicar validaciones y conversiones numéricas estrictas en observabilidad (`typescript:S7773`: **5** ocurrencias), clarificar las categorías de mercado del modelo de observabilidad (`typescript:S6571`: **2** ocurrencias), suprimir estructuras vacías sin efecto (`typescript:S7744`: **2** ocurrencias), concisar patrones y extracción de coincidencias en lectura de métricas (`typescript:S6353`: **2** ocurrencias y `typescript:S6594`: **1** ocurrencia) y consolidar la construcción de elementos de navegación (`typescript:S7778`: **1** ocurrencia).
- **FR-007**: Ambos módulos (`backend` y `frontend`) MUST simplificar la asignación de valores por defecto ante ausencia (`typescript:S6606`: **3** ocurrencias) y las verificaciones encadenadas de presencia (`typescript:S6582`: **2** ocurrencias) preservando intacto el manejo de valores válidos iguales a cero, cadenas vacías o estados booleanos falsos.
- **FR-008**: La remediación MUST preservar el 100% del comportamiento funcional observable, la separación estricta en 5 capas con modelo de dominio rico (`Rich Domain Model`), el carácter `Stateless` del `backend`, los contratos públicos de la API REST y su documentación sincronizada (sin requerir cambios de contrato externo).
- **FR-009**: La remediación MUST respetar estrictamente la Constitución del proyecto en materia de pruebas y cobertura: mantener intactas e inmutables todas las suites de pruebas existentes para los 48 hallazgos en código de producción, solicitar confirmación explícita del usuario antes de aplicar el refinamiento de la única aserción señalada por `typescript:S5906` (**1** ocurrencia en `backend`) conservando exactamente su contrato de verificación, y sostener de manera independiente una cobertura mínima del **80% en líneas** y **80% en bifurcaciones** tanto en `backend` como en `frontend` sin degradar los niveles vigentes.

### Matriz de Trazabilidad de Reglas e Issues en Alcance (17 Reglas / 49 Issues)

| # | Regla | Severidad | `backend` | `frontend` | Total Actual | Meta Final | Esfuerzo Estimado | Propósito de Calidad y Negocio (QUÉ y POR QUÉ) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `typescript:S3776` | `CRITICAL` | 2 | 4 | 6 | 0 | 69 min | Reducir la complejidad cognitiva a ≤ 15 en flujos de auditoría, métricas y panel de observabilidad para mejorar comprensibilidad, diagnóstico y mantenibilidad. |
| 2 | `typescript:S8786` | `MAJOR` | 2 | 3 | 5 | 0 | 100 min | Garantizar tiempo de ejecución lineal en patrones de sanitización, auditoría y lectura de métricas para prevenir bloqueos ante entradas extensas. |
| 3 | `typescript:S5869` | `MAJOR` | 1 | 0 | 1 | 0 | 5 min | Eliminar duplicidades en reglas de coincidencia de eventos de auditoría para evitar ambigüedad en la clasificación operativa. |
| 4 | `typescript:S4043` | `MAJOR` | 1 | 0 | 1 | 0 | 5 min | Evitar mutaciones colaterales inesperadas al ordenar integrantes del equipo semanal en el modelo de dominio. |
| 5 | `typescript:S2933` | `MAJOR` | 1 | 0 | 1 | 0 | 2 min | Explicitar la inmutabilidad de atributos internos no reasignables en la entidad de estadísticas de jugador. |
| 6 | `typescript:S6551` | `MINOR` | 8 | 0 | 8 | 0 | 40 min | Asegurar que errores y metadatos en registros de auditoría se serialicen de forma legible y útil para diagnóstico operativo en lugar de marcadores genéricos. |
| 7 | `typescript:S7772` | `MINOR` | 5 | 0 | 5 | 0 | 25 min | Estandarizar la referencia explícita a capacidades nativas del entorno en el subsistema de auditoría para mayor claridad y portabilidad. |
| 8 | `typescript:S7773` | `MINOR` | 0 | 5 | 5 | 0 | 10 min | Aplicar validaciones y conversiones numéricas estrictas en observabilidad sin conversiones implícitas ambiguas. |
| 9 | `typescript:S6606` | `MINOR` | 1 | 2 | 3 | 0 | 15 min | Expresar valores por defecto ante ausencia de forma directa y legible sin alterar el tratamiento de valores válidos como cero o texto vacío. |
| 10 | `typescript:S7503` | `MINOR` | 3 | 0 | 3 | 0 | 15 min | Alinear la declaración de operaciones asíncronas de salud y métricas con su naturaleza real de ejecución para evitar contratos engañosos. |
| 11 | `typescript:S6571` | `MINOR` | 0 | 2 | 2 | 0 | 10 min | Clarificar la definición de categorías de mercado en observabilidad evitando valores específicos anulados por una categoría genérica. |
| 12 | `typescript:S7744` | `MINOR` | 0 | 2 | 2 | 0 | 10 min | Eliminar estructuras vacías redundantes en el procesamiento de datos de observabilidad para mejorar la claridad del flujo. |
| 13 | `typescript:S6582` | `MINOR` | 1 | 1 | 2 | 0 | 10 min | Simplificar comprobaciones encadenadas de presencia en métricas de aplicación y lectura de reportes para reducir ruido y riesgo de error. |
| 14 | `typescript:S6353` | `MINOR` | 0 | 2 | 2 | 0 | 10 min | Expresar patrones de coincidencia numérica y alfanumérica de forma concisa y uniforme al interpretar métricas. |
| 15 | `typescript:S5906` | `MINOR` | 1 | 0 | 1 | 0 | 1 min | Mejorar la precisión del reporte de fallo al verificar longitud de texto sanitizado en la suite de auditoría (sujeto a autorización explícita del Principio IV). |
| 16 | `typescript:S7778` | `MINOR` | 0 | 1 | 1 | 0 | 5 min | Consolidar la incorporación de elementos de navegación en una operación clara y compacta. |
| 17 | `typescript:S6594` | `MINOR` | 0 | 1 | 1 | 0 | 5 min | Estandarizar la extracción de coincidencias de texto al interpretar reportes de métricas. |
| **Total** | **17 reglas** | **6C / 8M / 35m** | **26** | **23** | **49** | **0** | **337 min** | **Eliminación del 100% de los 49 issues abiertos y de los 337 minutos de deuda técnica reportada.** |

### Key Entities

- **Hallazgo de Calidad (SonarQube Issue)**: Observación activa detectada por el análisis estático sobre el proyecto `salvanescki_dapps2026GrupoQ`, caracterizada por regla normativa, severidad (`CRITICAL`, `MAJOR`, `MINOR`), módulo afectado (`backend` o `frontend`), área funcional y esfuerzo estimado de remediación.
- **Regla de Calidad (SonarQube Rule)**: Criterio verificable de mantenibilidad, rendimiento, legibilidad o higiene evaluado de forma continua sobre el repositorio (17 reglas activas con ocurrencias abiertas en el alcance confirmado).
- **Garantía de No Regresión y Cobertura**: Contrato verificable que asegura la estabilidad funcional de todos los flujos de usuario y operación, el cumplimiento de la arquitectura constitucional y el sostenimiento independiente de al menos 80% de cobertura de líneas y bifurcaciones en cada módulo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El total de hallazgos abiertos para las 17 reglas en alcance dentro del proyecto `salvanescki_dapps2026GrupoQ` se reduce de **49 a 0** (de **26 a 0** en `backend` y de **23 a 0** en `frontend`), llevando la deuda técnica estimada asociada de **337 minutos a 0 minutos**.
- **SC-002**: El conteo de hallazgos abiertos llega a cero en cada nivel de severidad: `CRITICAL` pasa de **6 a 0**, `MAJOR` pasa de **8 a 0** y `MINOR` pasa de **35 a 0**, sin introducir ningún hallazgo nuevo, duplicación adicional ni alerta de seguridad en el análisis posterior.
- **SC-003**: El 100% de las pruebas automatizadas existentes en `backend` y `frontend` se ejecuta con **0 fallos**, manteniendo **0 modificaciones** sobre pruebas preexistentes correspondientes a los 48 hallazgos en código de producción y respetando el requisito de confirmación explícita del Principio IV para el único ajuste de aserción en `typescript:S5906`.
- **SC-004**: La cobertura de pruebas verificada de forma independiente por módulo cumple **≥ 80% en líneas** y **≥ 80% en bifurcaciones** tanto en `backend` como en `frontend`, sin reducir ninguno de los porcentajes o umbrales vigentes previos a la remediación.
- **SC-005**: El 100% de los flujos operativos y de usuario vinculados con los módulos intervenidos (auditoría de operaciones, sanitización de datos sensibles, verificación de salud del servicio, exposición y panel visual de observabilidad, navegación por rol, cálculo de equipo semanal e ingesta de estadísticas de jugadores) mantiene sus entradas, salidas y contratos externos sin alteraciones.
- **SC-006**: La aplicación completa compila, inicia correctamente en su entorno estándar y conserva sincronizados sus contratos de API pública y colección de consumo sin introducir desviaciones respecto de la arquitectura en 5 capas.

## Assumptions

- El alcance confirmado por el usuario comprende la totalidad de los **49 issues abiertos** relevados en SonarQube Cloud (región EU, organización `salvanescki`, proyecto `salvanescki_dapps2026GrupoQ`) a la fecha de creación de esta especificación, abarcando ambos módulos (`backend` y `frontend`) y todas las severidades (`CRITICAL`, `MAJOR`, `MINOR`).
- Ninguno de los 49 hallazgos requiere modificar contratos públicos de la API REST, esquemas de base de datos relacional ni flujos de negocio visibles para el usuario final; se trata íntegramente de mejoras internas de calidad, resiliencia de procesamiento, legibilidad operativa e higiene.
- Los flujos de validación (pruebas unitarias y de integración por módulo, reportes de cobertura, compilación local y verificación de contratos de API) se ejecutan sobre la infraestructura existente del repositorio.
- Conforme al Principio IV de la Constitución del proyecto, la resolución del único issue ubicado en una prueba existente (`typescript:S5906`, 1 ocurrencia) queda contemplada dentro del alcance de los 49 issues confirmados por el usuario, pero su aplicación efectiva sobre el archivo de prueba se condicionará a la confirmación explícita del usuario en la instancia previa a editar archivos de prueba.
