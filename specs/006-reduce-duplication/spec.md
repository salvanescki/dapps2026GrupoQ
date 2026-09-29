# Feature Specification: Reducción de Duplicación de Código y Calidad SonarCloud

**Feature Branch**: `006-reduce-duplication`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Reducir la duplicación de código detectada por SonarCloud (6,06% en código nuevo, requerido ≤ 3,0%), refactorizando únicamente donde tenga sentido técnico, en backend y frontend, incluyendo la estructura de los tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refactorización de Duplicación en Frontend Productivo (Priority: P1)

Como desarrollador y mantenedor del frontend,
quiero consolidar la lógica duplicada en formularios, rutas de navegación, clientes HTTP y estilos CSS,
para reducir el volumen de código redundante, facilitar el mantenimiento y asegurar que la interfaz siga comportándose y visualizándose exactamente igual.

**Why this priority**: Es la capa con mayor visibilidad de duplicación en formularios (`LoginForm` y `RegisterForm`) y clientes API, donde existen abstracciones ya preparadas (`useForm`, `components.css`) que deben aprovecharse.

**Independent Test**: Puede probarse de manera independiente ejecutando la suite completa de pruebas unitarias y de integración de frontend (106 tests en Vitest), validando que las pantallas de Login, Registro, Home y Catálogo conservan su comportamiento, estilos y flujos interactivos sin ninguna regresión.

**Acceptance Scenarios**:

1. **Given** los formularios de autenticación (`LoginForm` y `RegisterForm`), **When** se integran con el hook compartido de control de formulario (`useForm`), **Then** se eliminan los manejadores manuales duplicados de cambio y limpieza de errores sin alterar los eventos ni la validación en tiempo real.
2. **Given** las rutas de navegación (`ProtectedRoute` y `PublicRoute`), **When** se extrae el contenedor común de verificación de sesión, **Then** se reutiliza la estructura de carga eliminando código y estilos duplicados.
3. **Given** los clientes de comunicación con la API (`auth-api.client.ts` y `playersApi.ts`), **When** se unifica la lógica base de petición HTTP y mapeo de errores, **Then** ambas APIs consumen el mismo mecanismo robusto sin duplicar la lógica de deserialización ni de captura de fallos de red.
4. **Given** las hojas de estilo del frontend (`components.css` y `login.css`), **When** se limpian las reglas y selectores redundantes, **Then** las vistas mantienen su estética visual 100% idéntica bajo tema oscuro y glassmorphism.

---

### User Story 2 - Consolidación Segura en Backend Productivo y Dominio (Priority: P2)

Como desarrollador del backend,
quiero consolidar estructuras repetitivas en entidades ORM o de dominio únicamente donde exista cohesión real y misma razón de cambio,
para reducir duplicación sin violar la arquitectura en 5 capas ni degradar el Rich Domain Model.

**Why this priority**: Asegura que el backend optimice su código sin comprometer los principios de diseño DDD ni introducir acoplamiento indebido entre capas o agregados independientes.

**Independent Test**: Puede probarse ejecutando las suites de pruebas unitarias y de integración con PostgreSQL/Testcontainers del backend, validando que todas las entidades, servicios y controladores conservan sus invariantes y contratos intactos.

**Acceptance Scenarios**:

1. **Given** las entidades ORM de persistencia (`TypeORM`), **When** se identifican columnas comunes (como identificadores o marcas temporales), **Then** se evalúa la extracción de una clase base de persistencia siempre que no contenga lógica de negocio ni afecte el mapeo hacia las entidades de dominio.
2. **Given** las entidades de dominio ricas, **When** se analizan sus estructuras, **Then** se preserva su independencia y comportamiento específico de negocio, documentando como duplicación aceptada cualquier similitud meramente accidental o estructural.

---

### User Story 3 - Reestructuración de Setup y Helpers en Suites de Testing (Priority: P2)

Como desarrollador que ejecuta y mantiene la suite de tests,
quiero reutilizar código de inicialización y helpers de preparación entre y dentro de los archivos de prueba de backend y frontend,
para eliminar el ~85% de la duplicación detectada sin alterar ninguna aserción ni debilitar la cobertura.

**Why this priority**: La mayor parte de las líneas duplicadas (~85%) reside en los tests. El usuario autorizó explícitamente su reestructuración bajo la premisa de conservar el 100% del valor de cada aserción y test case.

**Independent Test**: Puede probarse comparando la cantidad de tests, nombres de suites y aserciones ejecutadas antes y después del refactor, asegurando que el total de casos y su resultado continúen siendo 100% exitosos.

**Acceptance Scenarios**:

1. **Given** los tests de integración del backend (`player-detail.spec.ts`, `players-filters.spec.ts`, `jugador.service.spec.ts`), **When** se centraliza el arranque de Testcontainers, la instanciación de repositorios y el armado del módulo de servicios en un helper compartido (los datos semilla permanecen dentro de cada test), **Then** se eliminan los bloques redundantes de inicialización conservando todas las aserciones de cada archivo.
2. **Given** los módulos de setup de Testcontainers (`setup-testcontainers.ts` y `setup-players-testcontainers.ts`), **When** se unifican en un único helper reutilizable, **Then** se erradica la duplicación de configuración de contenedores de base de datos.
3. **Given** los tests de componentes y vistas del frontend (`ProtectedRoute.test.tsx`, `LoginView.test.tsx`, `RegisterView.test.tsx`), **When** se extraen funciones auxiliares locales dentro de cada archivo (renderizado con router y contexto, y flujos repetidos de completar y enviar formularios), **Then** se reduce el código repetitivo de preparación manteniendo cada caso de prueba inmutable.

---

### Edge Cases

- ¿Qué sucede si dos bloques de código son idénticos en sintaxis pero representan conceptos de dominio que evolucionan por motivos distintos?  
  → Se decide **no refactorizar** para evitar acoplamiento accidental, y se documenta explícitamente en la sección de *Duplicación Aceptada*.
- ¿Qué sucede si la reducción estricta a ≤ 3,0% en SonarCloud exigiera crear abstracciones complejas o artificiales que degraden la legibilidad o violen principios constitucionales?  
  → Se detiene el proceso y se consulta al usuario con la justificación técnica correspondiente, sin forzar abstracciones inadecuadas ni excluir archivos de Sonar sin autorización.
- ¿Qué sucede si la extracción de un helper en tests altera sutilmente el orden de ejecución o el estado compartido?  
  → Cada helper debe garantizar aislamiento total entre ejecuciones (`beforeEach`, transacciones limpias o estados nuevos) para asegurar cero efectos colaterales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST reducir el porcentaje de líneas de código duplicadas en código nuevo medido por SonarCloud a un valor ≤ 3,0%, salvo duplicaciones justificadas y aprobadas.
- **FR-002**: El frontend productivo MUST reutilizar componentes, hooks y utilidades existentes (`useForm`, helpers HTTP, tokens de estilo) sin alterar el comportamiento observable ni la estética visual.
- **FR-003**: El backend productivo MUST mantener inalteradas las reglas de negocio en el Rich Domain Model y la separación estricta en 5 capas, sin introducir lógica de negocio en capas de persistencia o controladores.
- **FR-004**: La suite de pruebas (frontend y backend) MUST conservar exactamente los mismos escenarios, nombres de tests, aserciones y valores esperados, sin eliminar ni debilitar ninguna prueba existente (Principio IV de la Constitución).
- **FR-005**: Toda duplicación que se decida conservar por razones de diseño arquitectónico o desacoplamiento MUST quedar formalmente registrada con su justificación técnica.
- **FR-006**: Los artefactos y el código refactorizado MUST respetar las convenciones de idioma (documentación y mensajes en español, identificadores técnicos en inglés) y prescindir de comentarios superfluos o emojis en el código fuente.
- **FR-007**: Los helpers y fixtures de test MUST NOT contener aserciones ni valores esperados, y todo refactor de tests MUST poder verificarse contra una línea base exacta (títulos de tests y cantidad de aserciones) capturada antes de refactorizar.

### Key Entities

- **Duplicación de Código**: Porción de líneas de código que comparten sintaxis o estructura semántica idéntica entre dos o más ubicaciones.
- **Duplicación Aceptada**: Código cuya similitud es accidental o cuya abstracción generaría acoplamiento indebido, documentado y justificado para su preservación.
- **Test Fixture / Helper**: Utilidad compartida de inicialización, mock o renderizado que encapsula preparación repetitiva sin alterar las aserciones de prueba.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La tasa de duplicación sobre código nuevo en SonarCloud se sitúa en ≤ 3,0% (o en el mínimo óptimo justificado y aprobado por el usuario).
- **SC-002**: El 100% de la suite de pruebas del frontend (106 tests en Vitest) y del backend (Jest unitario e integración con Testcontainers) pasa exitosamente sin modificar el valor de ninguna aserción existente.
- **SC-003**: Cero cambios en los contratos de API pública (OpenAPI / Swagger y colección Postman se mantienen sincronizados y sin alteraciones de esquema).
- **SC-004**: Los comandos de compilación y verificación (`npm run build` en frontend y backend) completan exitosamente sin errores de TypeScript ni advertencias bloqueantes.
- **SC-005**: El snapshot posterior al refactor coincide con la línea base: mismos títulos de tests y misma cantidad total de llamadas `expect(` (sumando archivos de test y helpers, con cero aserciones en helpers).

## Assumptions

- Se asume que el Quality Gate de SonarCloud evalúa duplicación en código nuevo con base en bloques de 5+ líneas o 50+ tokens.
- Se asume que la reestructuración de código de tests no requiere la adición de nuevas dependencias externas en `package.json`.
- Se asume que la suite de Testcontainers de backend continuará ejecutándose contra imágenes reales de PostgreSQL en Docker.
