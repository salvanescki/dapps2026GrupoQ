# Feature Specification: Estandarización de Estrategia de Testing por Perfiles (Backend y Frontend)

**Feature Branch**: `007-standardize-testing-profiles`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Separar y estandarizar la estrategia de testing del backend y frontend mediante perfiles independientes para tests unitarios, de integración y end-to-end (E2E)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ejecución Aislada de Pruebas Unitarias para Feedback Rápido (Priority: P1)

Como desarrollador que implementa o refactoriza lógica de negocio o componentes, quiero ejecutar únicamente la suite de pruebas unitarias de forma aislada y ultrarrápida, para obtener retroalimentación inmediata sin requerir servicios externos, bases de datos ni infraestructura levantada.

**Why this priority**: Es el ciclo de retroalimentación más frecuente en el desarrollo diario (TDD o refactorización continua). Garantiza que las reglas de negocio y utilidades se validen en segundos sin dependencias externas.

**Independent Test**: Puede probarse de forma totalmente independiente ejecutando el comando de perfil unitario en backend o en frontend en un entorno desconectado de la red y sin servicios auxiliares activos, verificando que todas las pruebas unitarias pasan con éxito.

**Acceptance Scenarios**:

1. **Given** un entorno de desarrollo local sin contenedores ni bases de datos iniciadas, **When** el desarrollador ejecuta el perfil de pruebas unitarias del backend, **Then** todas las pruebas de dominio se ejecutan en memoria en menos de 10 segundos y reportan su estado sin intentar conectarse a servicios externos.
2. **Given** un entorno de desarrollo en frontend, **When** el desarrollador ejecuta el perfil de pruebas unitarias del frontend, **Then** las pruebas de validaciones, lógica pura y utilidades se ejecutan en aislamiento reportando el resultado sin interactuar con servidores de API.

---

### User Story 2 - Verificación de Integración con Dependencias Aisladas (Priority: P2)

Como desarrollador o responsable de calidad, quiero ejecutar un perfil específico de pruebas de integración para validar la interoperabilidad entre servicios, repositorios de datos y adaptadores con entornos aislados y reproducibles, sin mezclar estas pruebas lentas con las pruebas unitarias.

**Why this priority**: Asegura que las capas de persistencia y servicios orquestadores funcionen correctamente contra almacenes de datos reales y contratos de servicio, aislando los fallos de integración de los fallos de lógica pura.

**Independent Test**: Se valida ejecutando exclusivamente el comando del perfil de integración en backend o frontend, comprobando que se levantan los entornos aislados requeridos, se ejecutan las pruebas de persistencia/componentes integrados y se destruyen los recursos temporales al finalizar.

**Acceptance Scenarios**:

1. **Given** un entorno con soporte de virtualización/contenedores, **When** el desarrollador ejecuta el perfil de integración del backend, **Then** se inicializa un entorno de base de datos aislado y limpio, se ejecutan las pruebas de repositorios y servicios, y se limpian los recursos al concluir.
2. **Given** componentes de interfaz de usuario conectados con estado y navegación, **When** el desarrollador ejecuta el perfil de integración del frontend, **Then** se ejecutan las pruebas de interacción de vistas, rutas protegidas y formularios integrados, reportando el resultado de forma independiente a los tests unitarios.

---

### User Story 3 - Validación de Flujos Críticos de Extremo a Extremo (E2E) (Priority: P3)

Como responsable del producto y del release, quiero ejecutar una suite de pruebas de extremo a extremo que valide los flujos críticos de la aplicación completa (autenticación y catálogo de jugadores), para asegurar que el sistema satisface los recorridos esenciales del usuario antes de desplegar.

**Why this priority**: Protege el valor del negocio verificando que los puntos de contacto críticos (registro, login, consulta de perfil y navegación/filtrado de catálogo) operen de principio a fin según lo esperado por el usuario.

**Independent Test**: Se valida ejecutando el perfil E2E de forma aislada, comprobando que recorre los flujos de extremo a extremo de las APIs y de la interfaz de usuario con aserciones sobre el resultado final visible.

**Acceptance Scenarios**:

1. **Given** la suite E2E de API backend, **When** se ejecuta el perfil E2E, **Then** se validan de principio a fin los flujos de registro de usuario, inicio de sesión, obtención de token y consumo de endpoints protegidos y de catálogo, verificando códigos de estado y respuestas completas.
2. **Given** la suite E2E de interfaz de usuario, **When** se ejecuta el perfil E2E en frontend, **Then** se valida el flujo crítico completo del usuario (autenticación, acceso a vistas protegidas y visualización del catálogo) sin colisionar con las pruebas unitarias ni de integración.

---

### User Story 4 - Diagnóstico Modular en Integración Continua (Priority: P4)

Como ingeniero de DevOps o mantenedor del repositorio, quiero que el pipeline de integración continua ejecute cada perfil de prueba en etapas diferenciadas, para identificar rápidamente la causa raíz de cualquier fallo sin interrumpir opacamente el análisis del resto de suites.

**Why this priority**: Reduce drásticamente el tiempo medio de resolución de incidencias en pull requests, permitiendo a los desarrolladores saber si un fallo proviene de una regla de dominio, una rotura de persistencia o una regresión en un flujo integral.

**Independent Test**: Se prueba ejecutando el pipeline de CI simulado o en GitHub Actions, verificando que los pasos correspondientes a unit, integration y e2e se identifican por separado con sus respectivos tiempos y estados de salida.

**Acceptance Scenarios**:

1. **Given** un pull request con un fallo introducido deliberadamente en una prueba de integración, **When** se ejecuta el flujo automatizado de CI, **Then** el paso de pruebas unitarias finaliza en verde, el paso de integración falla explícitamente identificando el perfil afectado, y el reporte refleja con claridad la etapa defectuosa.
2. **Given** una ejecución completa en CI, **When** todos los perfiles pasan satisfactoriamente, **Then** los artefactos de cobertura de código generados por los perfiles configurados se consolidan y publican sin solapamiento destructivo.

---

### Edge Cases

- ¿Qué sucede si el entorno donde se ejecutan las pruebas de integración carece de soporte para dependencias de infraestructura (ej. Docker no disponible)?
  El sistema debe emitir un mensaje de diagnóstico claro y explícito indicando el requisito de entorno no cumplido en lugar de producir un error ambiguo o silencioso.
- ¿Cómo se comporta la ejecución global cuando un perfil falla prematuramente?
  Los comandos que invocan la totalidad de las pruebas deben reportar el código de salida de error acumulado indicando qué perfil puntual experimentó la falla.
- ¿Qué ocurre si existen pruebas preexistentes que combinan características de varios perfiles?
  Ningún test preexistente debe ser eliminado ni alterado en sus aserciones; deben reclasificarse o asignarse al perfil correspondiente respetando la política estricta de inmutabilidad (Principio IV de la Constitución).
- ¿Qué sucede con la generación de métricas de cobertura cuando se ejecuta un perfil aislado frente a la ejecución total?
  Cada perfil ejecutable de forma aislada debe poder generar su propio reporte de cobertura en un directorio diferenciado, garantizando que un perfil no sobreescriba ni corrompa los resultados de otro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer tres perfiles de testing explícitamente diferenciados tanto en el backend como en el frontend: Unitario (`unit`), Integración (`integration`) y Extremo a Extremo (`e2e`).
- **FR-002**: El sistema MUST proporcionar comandos específicos e independientes en cada aplicación para ejecutar cada uno de los tres perfiles de forma aislada.
- **FR-003**: El sistema MUST proporcionar un comando para ejecutar la totalidad de las suites de pruebas de forma secuencial o coordinada por aplicación.
- **FR-004**: Los tests pertenecientes al perfil unitario MUST ejecutarse con aislamiento total de la infraestructura, sin realizar llamadas de red, sin acceder al sistema de archivos externo y sin depender de bases de datos externas o contenedores.
- **FR-005**: Los tests pertenecientes al perfil de integración MUST gestionar automáticamente sus dependencias de entorno aislado requeridas (almacenamiento y persistencia) y asegurar la limpieza completa de datos y recursos al finalizar cada suite.
- **FR-006**: Los tests pertenecientes al perfil E2E MUST verificar los flujos críticos de la aplicación (registro, autenticación, protección de recursos y catálogo/consulta), complementando la cobertura donde falte verificación de extremo a extremo sin duplicar innecesariamente pruebas de grano fino.
- **FR-007**: El sistema MUST preservar la totalidad de los tests existentes, su comportamiento y sus aserciones sin debilitar, eliminar o modificar contratos ya verificados (inmutabilidad estricta).
- **FR-008**: Cada perfil de prueba con soporte de cobertura MUST generar sus métricas e informes en rutas independientes para evitar colisiones entre perfiles y permitir la consolidación en herramientas de análisis estático.
- **FR-009**: El flujo de integración continua (CI) MUST ejecutar los perfiles de prueba de manera estructurada e identificable, permitiendo determinar con precisión qué perfil específico falló ante una regresión.
- **FR-010**: El sistema MUST documentar de forma clara y accesible los comandos de ejecución, variables de entorno opcionales y prerrequisitos de infraestructura para cada perfil en ambas aplicaciones.

### Key Entities *(include if feature involves data)*

- **Perfil de Prueba (Testing Profile)**: Agrupación lógica y configurable de casos de prueba según su alcance, velocidad de ejecución y dependencias requeridas (Unitario, Integración, E2E).
- **Entorno Aislado de Prueba (Isolated Test Environment)**: Configuración y aprovisionamiento temporal y hermético (en memoria, contenedores o simuladores de contexto) necesario para la ejecución reproducible de un perfil específico.
- **Flujo Crítico de Usuario (Critical User Journey)**: Secuencia esencial de operaciones que un usuario o cliente de API realiza en el sistema, cuya falla invalidaría la operatividad del producto (ej. registro -> login -> acceso a perfil -> consulta de catálogo de jugadores).
- **Artefacto de Cobertura y Diagnóstico (Coverage & Diagnostic Artifact)**: Conjunto de métricas, trazas de salida e informes generados durante la ejecución de uno o varios perfiles de prueba.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las pruebas unitarias de backend y frontend se ejecutan y completan en menos de 15 segundos en entornos locales estándar sin dependencias externas levantadas.
- **SC-002**: El 100% de las pruebas unitarias se ejecutan de manera exitosa en un entorno totalmente desconectado de la red y sin servicios de base de datos activos.
- **SC-003**: Cada uno de los perfiles (`unit`, `integration`, `e2e`) puede ejecutarse de forma 100% independiente mediante un único comando documentado, devolviendo códigos de salida estándar (0 éxito, != 0 fallo).
- **SC-004**: El 100% de los tests preexistentes en el repositorio permanecen activos y exitosos, cumpliendo con la política de no regresión e inmutabilidad.
- **SC-005**: En el pipeline de integración continua, el fallo de una prueba en un perfil determinado identifica de forma inmediata la fase o perfil responsable, sin requerir inspección manual de logs de otros perfiles.
- **SC-006**: La totalidad de los flujos críticos (registro, login, acceso a sesión y navegación de catálogo) cuentan con validación E2E verificada.

## Assumptions

- Las tecnologías y herramientas de prueba preexistentes en el repositorio (Jest, Testcontainers y Supertest en backend; Vitest y Testing Library en frontend) son suficientes y se reutilizan para estructurar los tres perfiles sin introducir frameworks pesados adicionales innecesarios.
- El perfil E2E de backend comprende las pruebas de endpoints HTTP completos sobre la aplicación levantada con persistencia real (como `auth-perfil.spec.ts` y complementos de catálogo).
- El perfil E2E de frontend comprende la verificación de flujos completos de vistas, navegación y autenticación a través del runner existente sin requerir infraestructura de navegadores pesados salvo que sea estrictamente necesario.
- Para los perfiles de integración y E2E que involucren persistencia real en el backend, el desarrollador o agente de CI cuenta con el motor de contenedores Docker operativo.
- La configuración existente de análisis de cobertura (SonarQube Cloud) mantendrá compatibilidad con las rutas de reportes generadas por los perfiles.
