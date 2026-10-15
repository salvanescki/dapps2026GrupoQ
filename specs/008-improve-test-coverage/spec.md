# Feature Specification: Mejora de Cobertura de Tests (Frontend y Backend >= 80%)

**Feature Branch**: `test/improve-coverage`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Mejorar la cobertura de tests del frontend y backend hasta alcanzar al menos un 80% de coverage, cumpliendo la Constitution del proyecto. Analizar la configuración y los tests existentes, identificar gaps y definir una estrategia incremental de tests unitarios, de integración y E2E según corresponda. Establecer umbrales de coverage independientes para frontend y backend, medidos mediante las herramientas existentes. Priorizar lógica de negocio y casos límite, evitando tests redundantes o meramente orientados a aumentar métricas. No modificar código de producción salvo que sea necesario para facilitar el testing, en cuyo caso pedir permiso explícito para hacerlo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Garantía y Cobertura Integral del Backend (Priority: P1)

Como responsable de calidad y desarrollador del backend, necesito que la capa de dominio (Model), la capa de orquestación (Services), los adaptadores de persistencia (Repositories) y controladores alcancen al menos un 80% de cobertura de líneas y un 80% de cobertura de bifurcaciones (branches), validando exhaustivamente la lógica de negocio, cálculos de desempeño, invariantes y casos borde en aislamiento (unitario) y contra base de datos real (integración con Testcontainers).

**Why this priority**: El backend procesa las reglas de negocio críticas, transacciones y estados de dominio del sistema. Garantizar un 80% de líneas y branches en el backend mitiga fallos de concurrencia, datos corruptos y regresiones en la lógica central.

**Independent Test**: Puede validarse de manera independiente ejecutando la suite de pruebas del backend y su reporte de cobertura, verificando que el porcentaje de líneas sea >= 80%, el porcentaje de branches sea >= 80% y que todos los tests pasen exitosamente.

**Acceptance Scenarios**:

1. **Given** las entidades y objetos de valor del dominio (`src/domain`), **When** se ejecutan los tests unitarios en aislamiento sin dependencias externas, **Then** se validan todos los caminos válidos, errores de validación de invariantes y casos límite, alcanzando más del 80% de líneas y 80% de branches del dominio.
2. **Given** los servicios y repositorios de persistencia (`src/services`, `src/data-access`), **When** se ejecutan las pruebas de integración contra PostgreSQL real levantado dinámicamente con Testcontainers, **Then** se comprueba la persistencia, mapeo y orquestación ante respuestas exitosas y situaciones de error o datos no encontrados, superando el 80% de líneas y 80% de branches.
3. **Given** los controladores y filtros de excepción globales, **When** se evalúan las solicitudes HTTP y manejo de errores de dominio, **Then** se verifica que no exista lógica de negocio filtrada en los controladores y se cubren los mapeos de códigos de error HTTP adecuados.

---

### User Story 2 - Confiabilidad y Cobertura de la Interfaz y Flujos de Usuario en Frontend (Priority: P2)

Como desarrollador frontend y usuario final, necesito que los componentes visuales interactivos, formularios con validación, hooks personalizados, contexto de autenticación y servicios de comunicación con la API alcancen al menos un 80% de líneas y 80% de bifurcaciones en el frontend, garantizando una experiencia de usuario sólida ante cualquier flujo o error de red.

**Why this priority**: La interfaz de usuario es el punto de interacción directo con el usuario. Una cobertura robusta en componentes, hooks y contexto previene cuelgues de interfaz, estados inconsistentes y fallos de validación en el cliente.

**Independent Test**: Puede validarse de forma independiente ejecutando la suite de pruebas y reporte de cobertura del frontend, comprobando que las líneas y branches globales del frontend superen el 80% y que todos los componentes y hooks críticos estén probados.

**Acceptance Scenarios**:

1. **Given** los componentes de UI y catálogo (`src/components/ui`, `src/components/catalog`), **When** se ejecutan pruebas con diferentes combinaciones de props, eventos de usuario y estados vacíos o de carga, **Then** se cubren los renderizados condicionales y ramas de interacción alcanzando al menos 80% de líneas y branches.
2. **Given** los hooks de gestión de estado y filtros (`src/hooks`), **When** se invocan con parámetros válidos, límites de paginación o filtros complejos, **Then** se verifica la actualización del estado y el manejo de condiciones de borde.
3. **Given** los clientes y servicios de API (`src/api`, `src/services`), **When** se simulan respuestas exitosas, fallos de red o respuestas con errores HTTP, **Then** se constata que los errores sean transformados o propagados de forma controlada sin provocar excepciones no capturadas.

---

### User Story 3 - Establecimiento y Cumplimiento Automático de Umbrales Independientes (Priority: P3)

Como equipo de desarrollo y proceso de integración continua (CI), necesito que el frontend y el backend tengan configurados umbrales de cobertura obligatorios e independientes de al menos 80% en líneas y 80% en branches en sus herramientas de medición existentes, asegurando que ninguna ejecución con cobertura deficiente sea considerada exitosa ni se compense un stack con otro.

**Why this priority**: Automatizar el control de umbrales previene regresiones futuras y hace cumplir de forma vinculante el Principio VI de la Constitución del proyecto.

**Independent Test**: Se valida ejecutando los comandos de test con cobertura en ambos entornos; el proceso debe terminar con éxito si y solo si se cumple el umbral estipulado, y fallar si cualquier métrica cae por debajo del 80%.

**Acceptance Scenarios**:

1. **Given** la configuración de pruebas de backend, **When** se ejecuta el análisis de cobertura, **Then** la herramienta verifica umbrales mínimos de 80% en líneas y 80% en branches de forma autónoma.
2. **Given** la configuración de pruebas de frontend, **When** se ejecuta el análisis de cobertura, **Then** la herramienta verifica umbrales mínimos de 80% en líneas y 80% en branches de forma autónoma.
3. **Given** cualquier ejecución de prueba donde la cobertura de líneas o de branches sea menor al 80% en cualquiera de los dos stacks, **When** finaliza el runner de pruebas, **Then** el comando retorna un código de salida distinto de cero señalando el incumplimiento del umbral.

---

### Edge Cases

- **Bifurcaciones con valores por defecto y coalescencia nula**: Ramas lógicas originadas por operadores ternarios, coalescencia nula (`??`) o encadenamiento opcional (`?.`) que no se activan en los caminos normales deben ser contempladas mediante casos de prueba con valores nulos, indefinidos o vacíos.
- **Respuestas de error atípicas en clientes HTTP**: Respuestas con respuestas vacías, errores 500 del servidor o problemas de conexión deben ser probadas sin requerir dependencias de red vivas.
- **Inmutabilidad absoluta de tests existentes**: Ningún test existente puede ser alterado o eliminado para acomodar nuevas aserciones, salvo autorización expresa del usuario.
- **Código de producción difícil de testear**: Si se detecta una función o componente fuertemente acoplado que requiera modificaciones en el código de producción para permitir su prueba, se debe solicitar permiso explícito al usuario antes de tocarlo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE alcanzar un umbral mínimo de cobertura de código del 80% de líneas (*lines*) y 80% de bifurcaciones (*branches*) en el backend, medido de manera independiente sobre su código fuente.
- **FR-002**: El sistema DEBE alcanzar un umbral mínimo de cobertura de código del 80% de líneas (*lines*) y 80% de bifurcaciones (*branches*) en el frontend, medido de manera independiente sobre su código fuente.
- **FR-003**: La ampliación de tests en backend DEBE respetar la arquitectura de 5 capas: los tests de la capa de Dominio (Model) DEBEN ser unitarios en aislamiento total, mientras que los tests de Services y Repositories DEBEN ser de integración contra PostgreSQL real usando Testcontainers.
- **FR-004**: Los nuevos tests incorporados DEBEN enfocarse en validar lógica de negocio, reglas de dominio, validaciones de entrada, manejo de errores y casos de borde funcionales, quedando prohibidos tests triviales o artificiales diseñados únicamente para aumentar el porcentaje.
- **FR-005**: La totalidad de los tests existentes en el repositorio DEBE mantenerse intacta y continuar pasando exitosamente al 100%, conforme al principio de inmutabilidad de tests.
- **FR-006**: Si para posibilitar el testeo de alguna sección se requiere modificar código fuente de producción, se DEBE solicitar y obtener aprobación expresa del usuario antes de aplicar cambios en dichos archivos.
- **FR-007**: Las herramientas de prueba existentes (Jest en backend y Vitest en frontend) DEBEN quedar configuradas con los umbrales de cobertura (*coverage thresholds / limits*) correspondientes a un mínimo del 80% en líneas y 80% en branches para asegurar el principio de no regresión y efecto trinquete (*ratchet*).
- **FR-008**: Los scripts de ejecución de cobertura en frontend (`npm run test:coverage`) y backend (`npm run test:cov`) DEBEN emitir reportes legibles por terminal y generar los artefactos estándar de cobertura (LCOV, HTML) para su posterior inspección o integración.

### Key Entities *(include if feature involves data)*

- **Métrica de Cobertura (Coverage Metric)**: Cuantificación porcentual de la ejecución de código (líneas y branches) obtenida a partir del análisis estático y dinámico de las suites de prueba.
- **Umbral de Calidad (Coverage Threshold / Quality Gate)**: Criterio numérico mínimo obligatorio (80% líneas, 80% ramas) establecido individualmente por stack que determina si la suite de pruebas es aprobada.
- **Brecha de Cobertura (Coverage Gap)**: Conjunto de instrucciones, ramas de decisión o módulos de producción identificados como no ejecutados durante las pruebas automatizadas.
- **Suite de Pruebas (Test Suite)**: Colección organizada de pruebas unitarias, de integración y extremo a extremo clasificadas según su alcance arquitectónico y dependencias.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La cobertura de líneas del backend alcanza o supera el 80% y la cobertura de bifurcaciones (branches) alcanza o supera el 80%, verificado mediante el reporte de `test:cov`.
- **SC-002**: La cobertura de líneas del frontend alcanza o supera el 80% y la cobertura de bifurcaciones (branches) alcanza o supera el 80%, verificado mediante el reporte de `test:coverage`.
- **SC-003**: El 100% de los tests preexistentes en ambos proyectos se ejecutan y superan satisfactoriamente sin haber sido modificados ni eliminados.
- **SC-004**: Las configuraciones de Jest y Vitest detienen la ejecución con código de error ante cualquier reporte con cobertura inferior al 80% de líneas o 80% de ramas en sus respectivos entornos.
- **SC-005**: Ningún archivo de código de producción es modificado sin solicitud y consentimiento previo explícito del usuario.

## Assumptions

- Se utilizan exclusivamente las herramientas de testing y librerías ya instaladas en el repositorio (Jest, ts-jest, Supertest, Testcontainers en backend; Vitest, Testing Library, jsdom en frontend).
- Los archivos de configuración de bootstrapping como `main.ts` en backend o declaraciones de tipos globales (`.d.ts`) pueden ser excluidos de la cobertura si corresponden a puntos de entrada de infraestructura sin lógica de negocio, manteniéndose alineados con las mejores prácticas y configuración existente de Jest/Vitest.
- La ejecución de pruebas de integración con Testcontainers requiere un daemon de Docker en funcionamiento en el entorno local.
