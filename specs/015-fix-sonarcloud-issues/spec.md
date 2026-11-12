# Feature Specification: Remediación Integral de Issues Abiertos en SonarQube Cloud

**Feature Branch**: `015-fix-sonarcloud-issues`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Remediación integral de los 73 issues abiertos de SonarQube Cloud (20 reglas activas en backend y frontend) del proyecto salvanescki_dapps2026GrupoQ para llevar el conteo de hallazgos abiertos a cero sin regresión funcional y manteniendo la cobertura de pruebas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolución de Hallazgos Críticos de Mantenibilidad y Complejidad Cognitiva (Priority: P1)

Como responsable de calidad y evolución del producto, quiero que los flujos de negocio y de interfaz que actualmente superan el umbral permitido de complejidad cognitiva o contienen operaciones anuladas innecesarias sean simplificados en unidades cohesivas y comprensibles, para reducir el riesgo de defectos ocultos, facilitar futuras auditorías y eliminar la totalidad de los 13 hallazgos de severidad crítica (`CRITICAL`) tanto en `backend` como en `frontend`.

**Why this priority**: Los hallazgos de severidad `CRITICAL` (12 ocurrencias de exceso de complejidad cognitiva `typescript:S3776` y 1 ocurrencia de operador de anulación innecesario `typescript:S3735`) representan el mayor riesgo para la estabilidad, legibilidad y mantenibilidad evolutiva del sistema.

**Independent Test**: Se puede verificar de forma independiente comprobando en el análisis estático de calidad que las reglas `typescript:S3776` y `typescript:S3735` registran exactamente 0 ocurrencias abiertas, mientras que la totalidad de los escenarios de negocio e interfaz existentes continúan respondiendo con idénticos resultados.

**Acceptance Scenarios**:

1. **Given** los 9 flujos del módulo `backend` y los 3 flujos del módulo `frontend` que superan el umbral máximo de complejidad cognitiva de 15 puntos (`typescript:S3776`), **When** se descomponen en responsabilidades semánticas más acotadas preservando las reglas de dominio, **Then** cada unidad evaluada registra una complejidad cognitiva menor o igual a 15 y los 12 hallazgos quedan resueltos sin alterar ningún resultado funcional.
2. **Given** la vista de equipo de la semana en el módulo `frontend` con un hallazgo crítico por uso innecesario de operador de descarte (`typescript:S3735`), **When** se normaliza la invocación del flujo sin operadores redundantes, **Then** el análisis de calidad reporta 0 ocurrencias abiertas de `typescript:S3735` y la vista mantiene su comportamiento interactivo intacto.

---

### User Story 2 - Accesibilidad Inclusiva, Rendimiento y Calidad Mayor en Interfaz y Servicios (Priority: P2)

Como usuario final y responsable de experiencia de producto, quiero que la plataforma respete los estándares de accesibilidad en todos los dispositivos (controles interactivos semánticos, contraste visual suficiente y respeto por la preferencia de reducción de movimiento) y prevenga degradaciones de rendimiento o legibilidad de severidad `MAJOR`, para garantizar una experiencia inclusiva, fluida y libre de los 18 hallazgos mayores detectados en `frontend` y `backend`.

**Why this priority**: Los 18 hallazgos de severidad `MAJOR` afectan directamente la accesibilidad para usuarios con tecnologías de asistencia o sensibilidad al movimiento (`typescript:S6819`, `typescript:S6847`, `css:S9440`, `css:S7924`), la eficiencia de procesamiento en la interfaz (`typescript:S8786`, `typescript:S6481`, `typescript:S6564`) y la claridad estructural en el módulo `backend` (`typescript:S3358`, `typescript:S2933`, `typescript:S7761`).

**Independent Test**: Se puede verificar de manera independiente auditando que las 10 reglas de severidad `MAJOR` alcancen 0 hallazgos abiertos, validando además que las tarjetas de jugadores, el modal de detalle, los filtros de ranking y los gráficos de portafolio operen con navegación accesible por teclado, contraste adecuado y respeto por la preferencia de movimiento reducido.

**Acceptance Scenarios**:

1. **Given** los componentes interactivos y modales del `frontend` con roles manuales o eventos sobre contenedores no interactivos (`typescript:S6819` con 5 ocurrencias y `typescript:S6847` con 1 ocurrencia), **When** el usuario interactúa mediante teclado, lector de pantalla o puntero, **Then** todos los elementos responden mediante controles semánticos nativos sin alterar el diseño visual ni los flujos de selección y cierre.
2. **Given** un usuario con preferencia del sistema activa para reducir el movimiento (`css:S9440`, 3 ocurrencias) o con requerimientos de lectura de alto contraste en el detalle de jugador (`css:S7924`, 1 ocurrencia), **When** visualiza el catálogo y el modal de detalle de jugador, **Then** las transiciones respetan la preferencia de movimiento reducido y los textos cumplen con la relación mínima de contraste exigible.
3. **Given** las validaciones de formato de mercado (`typescript:S8786`, 1 ocurrencia), la provisión de contexto de gráficos (`typescript:S6481`, 1 ocurrencia) y las definiciones de tipos del mercado (`typescript:S6564`, 1 ocurrencia) en `frontend`, **When** se procesan entradas extensas o actualizaciones de estado en pantalla, **Then** la evaluación se ejecuta en tiempo lineal predecible sin recreaciones innecesarias ni definiciones redundantes.
4. **Given** las operaciones de extracción y dominio en `backend` con condicionales anidados (`typescript:S3358`, 2 ocurrencias), miembros inmutables sin restricción explícita (`typescript:S2933`, 2 ocurrencias) y lectura de atributos de datos (`typescript:S7761`, 1 ocurrencia), **When** se sanean bajo las reglas de calidad, **Then** el reporte de severidad `MAJOR` en `backend` se reduce a 0 manteniendo intacta la captura y persistencia de datos.

---

### User Story 3 - Estandarización de Procesamiento Asíncrono e Higiene de Código Menor (Priority: P3)

Como equipo de ingeniería y operaciones de la plataforma, quiero resolver los 42 hallazgos de severidad `MINOR` vinculados con esperas secuenciales en iteraciones, contratos asíncronos innecesarios y convenciones de claridad expresiva, para optimizar el procesamiento por lotes donde sea seguro, mantener la predictibilidad en secuencias dependientes y alcanzar deuda técnica cero en SonarQube Cloud.

**Why this priority**: Aunque cada hallazgo individual es de severidad `MINOR`, en conjunto representan el 57,5% del volumen total de hallazgos abiertos (42 de 73 issues, distribuidos en 8 reglas), cuya resolución completa permite limpiar por completo el tablero de calidad del proyecto.

**Independent Test**: Se puede probar independientemente verificando que las 8 reglas de severidad `MINOR` (`typescript:S9382`, `typescript:S7503`, `typescript:S7773`, `typescript:S4323`, `typescript:S6582`, `typescript:S7763`, `typescript:S6606`, `typescript:S6594`) pasen a 0 ocurrencias abiertas y que todos los procesos de ingesta, órdenes de mercado, emisión de tokens y selección semanal completen sus pruebas sin errores.

**Acceptance Scenarios**:

1. **Given** las 27 ocurrencias de espera secuencial dentro de ciclos (`typescript:S9382`) en el módulo `backend`, **When** se procesan colecciones de cotizaciones, jugadores, tokens o páginas de extracción estadística, **Then** se eliminan las esperas secuenciales innecesarias o se estructuran las secuencias con dependencia de orden sin violar la regla de análisis estático, preservando la integridad transaccional y el orden de negocio esperado.
2. **Given** las 5 operaciones en servicios del `backend` declaradas como asíncronas sin espera diferida real (`typescript:S7503`), **When** se alinean sus firmas y contratos con su naturaleza de ejecución, **Then** desaparecen las 5 advertencias manteniendo la compatibilidad con sus consumidores internos y externos.
3. **Given** las 10 ocurrencias restantes de higiene y expresividad en `backend` y `frontend` (`typescript:S7773` con 4, `typescript:S4323` con 2, `typescript:S6582` con 1, `typescript:S7763` con 1, `typescript:S6606` con 1 y `typescript:S6594` con 1), **When** se estandarizan las validaciones numéricas, definiciones de tipos y expresiones condicionales, **Then** el total de issues abiertos de severidad `MINOR` llega a 0 sin cambios en el comportamiento observable.

---

### Edge Cases

- ¿Qué ocurre cuando una iteración con operaciones asíncronas (`typescript:S9382`) requiere preservar estrictamente el orden secuencial (por ejemplo, interacciones paso a paso con una interfaz externa o persistencia ordenada)?
  → El flujo conserva su semántica determinista y secuencial restructurando la coordinación o agrupación de pasos para satisfacer la regla de calidad sin introducir condiciones de carrera ni paralelismo inseguro.
- ¿Qué ocurre al reemplazar contenedores genéricos con roles manuales por controles semánticos nativos (`typescript:S6819`, `typescript:S6847`) respecto de los estilos visuales existentes y los selectores utilizados por las pruebas automatizadas?
  → La presentación visual, el comportamiento de foco/teclado y los contratos observables verificados por la suite de pruebas existente se mantienen 100% compatibles, evitando cualquier ruptura visual o de pruebas.
- ¿Qué ocurre si al reducir la complejidad cognitiva (`typescript:S3776`) en entidades de dominio o servicios existe riesgo de desplazar reglas de negocio fuera de la capa de dominio?
  → Toda regla e invariante de negocio permanece estrictamente dentro de la capa de dominio conforme a los principios arquitectónicos del proyecto, extrayendo únicamente subtareas cohesivas dentro de la capa que corresponda.
- ¿Qué ocurre si la remediación de una regla pudiera dejar ramas condicionales nuevas sin cobertura de pruebas?
  → Cualquier flujo reorganizado debe mantener o incrementar la cobertura de líneas y bifurcaciones vigente (mínimo 80% independiente en `backend` y `frontend`), agregando pruebas nuevas solo cuando sea necesario sin modificar ni eliminar ninguna prueba preexistente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST resolver la totalidad de los **73 issues abiertos** distribuidos en las **20 reglas** reportadas por SonarQube Cloud para el proyecto `salvanescki_dapps2026GrupoQ` (54 en `backend` y 19 en `frontend`), llevando el contador de hallazgos abiertos a **0**.
- **FR-002**: El sistema MUST reducir la complejidad cognitiva de los 12 métodos y funciones señalados por la regla `typescript:S3776` (9 en `backend` y 3 en `frontend`) a un valor menor o igual a 15 puntos en cada caso, y eliminar el uso redundante del operador de descarte señalado por `typescript:S3735` (1 en `frontend`).
- **FR-003**: El módulo `frontend` MUST garantizar la accesibilidad semántica y visual resolviendo los hallazgos de controles y roles nativos (`typescript:S6819`: 5 ocurrencias), eventos sobre elementos no interactivos (`typescript:S6847`: 1 ocurrencia), soporte de preferencia de movimiento reducido (`css:S9440`: 3 ocurrencias) y relación mínima de contraste de texto (`css:S7924`: 1 ocurrencia).
- **FR-004**: El módulo `frontend` MUST eliminar el riesgo de degradación exponencial en validación de formato de mercado (`typescript:S8786`: 1 ocurrencia), estabilizar la referencia del valor provisto en el contexto de gráficos (`typescript:S6481`: 1 ocurrencia) y suprimir el alias de tipo redundante (`typescript:S6564`: 1 ocurrencia).
- **FR-005**: El módulo `backend` MUST resolver las 27 ocurrencias de espera dentro de bucles (`typescript:S9382`) y las 5 ocurrencias de métodos asíncronos sin espera (`typescript:S7503`), garantizando que ningún flujo de persistencia, mercado o extracción pierda atomicidad, orden determinista ni manejo de errores.
- **FR-006**: Ambos módulos (`backend` y `frontend`) MUST resolver la totalidad de los hallazgos de claridad, inmutabilidad y estandarización restantes (`typescript:S7773`: 4, `typescript:S4323`: 2, `typescript:S3358`: 2, `typescript:S2933`: 2, `typescript:S6582`: 1, `typescript:S7763`: 1, `typescript:S6606`: 1, `typescript:S6594`: 1 y `typescript:S7761`: 1).
- **FR-007**: La remediación MUST preservar el 100% del comportamiento funcional observable, los contratos de la API REST pública (OpenAPI/Swagger y colección Postman) y la separación de responsabilidades en 5 capas con modelo de dominio rico.
- **FR-008**: La remediación MUST respetar de forma irrestricta la inmutabilidad de las suites de pruebas existentes (prohibido modificar o eliminar pruebas preexistentes sin autorización explícita del usuario) y mantener o superar el umbral mínimo de 80% de cobertura de líneas y 80% de bifurcaciones de manera independiente en `backend` y en `frontend`.

### Matriz de Trazabilidad de Reglas e Issues en Alcance (20 Reglas / 73 Issues)

| # | Regla | Severidad | `backend` | `frontend` | Total Actual | Meta Final | Propósito de Calidad y Negocio (QUÉ y POR QUÉ) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `typescript:S9382` | `MINOR` | 27 | 0 | 27 | 0 | Evitar bloqueos secuenciales innecesarios en iteraciones y explicitar flujos por lotes o secuencias deterministas seguras. |
| 2 | `typescript:S3776` | `CRITICAL` | 9 | 3 | 12 | 0 | Reducir la complejidad cognitiva de cada función a ≤ 15 para mejorar la comprensión, mantenibilidad y facilidad de prueba. |
| 3 | `typescript:S6819` | `MAJOR` | 0 | 5 | 5 | 0 | Emplear elementos interactivos y semánticos nativos en lugar de roles manuales para asegurar accesibilidad multiplataforma. |
| 4 | `typescript:S7503` | `MINOR` | 5 | 0 | 5 | 0 | Alinear la declaración de operaciones asíncronas con la existencia real de operaciones diferidas para evitar contratos engañosos. |
| 5 | `typescript:S7773` | `MINOR` | 2 | 2 | 4 | 0 | Verificar valores numéricos inválidos sin conversiones implícitas ambiguas para evitar errores de validación. |
| 6 | `css:S9440` | `MAJOR` | 0 | 3 | 3 | 0 | Respetar la preferencia de movimiento reducido del usuario en animaciones y transiciones para prevenir sensibilidad vestibular. |
| 7 | `typescript:S4323` | `MINOR` | 2 | 0 | 2 | 0 | Definir alias semánticos reutilizables para uniones de tipos repetidas, mejorando la claridad del dominio y persistencia. |
| 8 | `typescript:S3358` | `MAJOR` | 2 | 0 | 2 | 0 | Desanidar expresiones condicionales ternarias en decisiones independientes y legibles. |
| 9 | `typescript:S2933` | `MAJOR` | 2 | 0 | 2 | 0 | Garantizar inmutabilidad explícita en propiedades internas que no se reasignan tras la inicialización. |
| 10 | `typescript:S6564` | `MAJOR` | 0 | 1 | 1 | 0 | Eliminar alias redundantes de tipos primitivos para simplificar el modelo de tipos del mercado. |
| 11 | `typescript:S6582` | `MINOR` | 1 | 0 | 1 | 0 | Simplificar verificaciones encadenadas de nulidad en el dominio para mayor concisión y seguridad. |
| 12 | `typescript:S7763` | `MINOR` | 1 | 0 | 1 | 0 | Unificar la reexportación de utilidades compartidas en un único paso directo y claro. |
| 13 | `typescript:S3735` | `CRITICAL` | 0 | 1 | 1 | 0 | Suprimir el uso innecesario del operador de anulación de retorno para evitar confusión en el flujo de la vista. |
| 14 | `typescript:S6481` | `MAJOR` | 0 | 1 | 1 | 0 | Estabilizar el valor entregado por proveedores de contexto visual para evitar actualizaciones redundantes en cada renderizado. |
| 15 | `typescript:S8786` | `MAJOR` | 0 | 1 | 1 | 0 | Simplificar la validación de texto para garantizar tiempo de respuesta lineal y prevenir bloqueos por backtracking. |
| 16 | `typescript:S6606` | `MINOR` | 1 | 0 | 1 | 0 | Expresar la asignación de valores por defecto ante nulidad de forma directa y concisa en entidades de dominio. |
| 17 | `typescript:S6594` | `MINOR` | 1 | 0 | 1 | 0 | Estandarizar la ejecución de búsqueda de coincidencias sobre patrones de texto. |
| 18 | `typescript:S6847` | `MAJOR` | 0 | 1 | 1 | 0 | Evitar la asignación de eventos de ratón o teclado a elementos contenedores no interactivos, asegurando accesibilidad. |
| 19 | `css:S7924` | `MAJOR` | 0 | 1 | 1 | 0 | Garantizar que el texto en el detalle del jugador cumpla con el umbral mínimo de contraste respecto de su fondo. |
| 20 | `typescript:S7761` | `MAJOR` | 1 | 0 | 1 | 0 | Acceder de manera estructurada a los atributos de datos personalizados de los elementos procesados. |
| **Total** | **20 reglas** | **13C / 18M / 42m** | **54** | **19** | **73** | **0** | **Eliminación del 100% de los issues abiertos y de los 559 min de deuda técnica reportada.** |

### Key Entities

- **Hallazgo de Calidad (SonarQube Issue)**: Observación activa detectada por el análisis estático sobre el proyecto `salvanescki_dapps2026GrupoQ`, clasificada por regla, severidad (`CRITICAL`, `MAJOR`, `MINOR`), módulo (`backend` o `frontend`), ubicación y esfuerzo estimado de remediación.
- **Regla de Calidad (SonarQube Rule)**: Criterio normativo de mantenibilidad, rendimiento o accesibilidad evaluado automáticamente en el repositorio (20 reglas activas con hallazgos abiertos en el alcance actual).
- **Umbral de Cobertura y No Regresión**: Garantía verificable de que el 100% de las pruebas existentes continúan pasando sin modificaciones y que cada módulo conserva al menos un 80% de cobertura de líneas y 80% de bifurcaciones de manera independiente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El total de issues abiertos reportados para las 20 reglas en alcance dentro del proyecto `salvanescki_dapps2026GrupoQ` se reduce de **73 a 0** (de 54 a 0 en `backend` y de 19 a 0 en `frontend`), reduciendo la deuda técnica asociada de **559 minutos a 0 minutos**.
- **SC-002**: El 100% de los hallazgos por severidad queda en cero: `CRITICAL` pasa de **13 a 0**, `MAJOR` pasa de **18 a 0** y `MINOR` pasa de **42 a 0**, sin introducir ningún nuevo hallazgo ni alerta de seguridad en los archivos intervenidos.
- **SC-003**: El 100% de las suites de pruebas existentes en `backend` y `frontend` se ejecuta exitosamente con **0 fallos** y **0 pruebas existentes modificadas o eliminadas**.
- **SC-004**: La cobertura de código medida de forma independiente en `backend` y en `frontend` se mantiene en un nivel **≥ 80% en líneas (`lines`) y ≥ 80% en bifurcaciones (`branches`)**, sin reducir los umbrales vigentes del proyecto.
- **SC-005**: El 100% de los flujos de usuario e integraciones (autenticación, catálogo, detalle de jugador, mercado primario/secundario, portafolio, ingesta estadística y equipo de la semana) mantiene sus contratos de entrada/salida y su comportamiento funcional sin alteraciones.

## Assumptions

- El alcance de remediación comprende exactamente los 73 issues abiertos (estado `OPEN` o `CONFIRMED`) relevados en la rama principal del proyecto `salvanescki_dapps2026GrupoQ` en SonarQube Cloud (región EU).
- No se requieren cambios en los contratos públicos de la API REST ni en el modelo de datos persistido en base de datos para resolver los 73 issues, dado que todos corresponden a mejoras internas de mantenibilidad, accesibilidad semántica/visual y estandarización de código.
- La validación de no regresión y cobertura se ejecuta utilizando la infraestructura de pruebas y compilación ya existente en el repositorio para ambos módulos.
