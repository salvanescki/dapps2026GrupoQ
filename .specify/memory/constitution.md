<!--
Sync Impact Report:
- Version change: [CONSTITUTION_VERSION] (unratified template) → 1.0.0
- Ratification Date: 2026-09-13
- Last Amended Date: 2026-09-13
- Modified principles:
  - PRINCIPLE_1_NAME → I. Arquitectura en 5 Capas y Backend Stateless
  - PRINCIPLE_2_NAME → II. Rich Domain Model y Domain-Driven Design (DDD)
  - PRINCIPLE_3_NAME → III. Estrategia de Testing Rigurosa y Testcontainers
  - PRINCIPLE_4_NAME → IV. Política Estricta de Inmutabilidad de Tests
  - PRINCIPLE_5_NAME → V. Convenciones de Idioma y Terminología Técnica
- Added sections:
  - SECTION_2_NAME → Stack Tecnológico y Estándares de Arquitectura
  - SECTION_3_NAME → Definición de Terminado (Definition of Done - DoD)
- Removed sections: None (all template sections populated).
- Follow-up TODOs: None.
-->

# Football Player Token Marketplace (Grupo Q) Constitution

## Core Principles

### I. Arquitectura en 5 Capas y Backend Stateless
El sistema se organiza de forma estricta en 5 capas con responsabilidades desacopladas y unidireccionales:
1. **Interfaz de Usuario (Frontend):** Implementada en React.
2. **Controller (Web-service / API REST):** Capa de exposición HTTP construida con NestJS. Actúa estrictamente como adaptador/pasamanos: recibe solicitudes HTTP, delega la ejecución al Service correspondiente, gestiona el mapeo de errores y emite respuestas con códigos de estado adecuados. Queda **terminantemente prohibido** incluir reglas o lógica de negocio en los Controllers.
3. **Service:** Capa de orquestación de aplicación. Coordina el flujo de interacción entre los objetos del dominio (Capa Model) y la persistencia. **No debe contener lógica de negocio**.
4. **Model (Dominio):** Núcleo del sistema. Contiene **toda** la lógica de negocio y las reglas de dominio.
5. **Data Access (Repository):** Implementa el patrón Repository para la persistencia. Tiene visibilidad **únicamente** de la capa de dominio. Queda **terminantemente prohibido** que contenga reglas de negocio o que acceda a capas superiores.

El backend (compuesto por Controller, Service, Model y Data Access) **MUST** ser completamente Stateless y garantizar la transaccionalidad bajo el estándar A.C.I.D. La persistencia primaria **MUST** ser una base de datos relacional (PostgreSQL) y Redis **MUST** utilizarse como caché de primer nivel (L1).

### II. Rich Domain Model y Domain-Driven Design (DDD)
La capa de dominio (Model) **MUST** modelar las entidades, agregados y value objects aplicando DDD mediante Rich Models.
- Los objetos anémicos ("objetos tontos" con solo getters/setters y sin comportamiento) están **estrictamente prohibidos**.
- Toda invariante de negocio, validación de estado, cálculo de desempeño de jugadores (Premier League, La Liga, Ligue 1, Serie A, Bundesliga), fluctuación de cotizaciones y reglas de compra/venta de tokens o balances de portfolio **MUST** residir exclusivamente en la capa de Model.

### III. Estrategia de Testing Rigurosa y Testcontainers
La calidad y confiabilidad del software se valida mediante una estrategia de pruebas en dos niveles complementarios:
- **Tests Unitarios:** Enfocados exclusivamente en la capa de dominio (Model). **MUST** ejecutarse en aislamiento total, sin interacción con bases de datos ni servicios externos.
- **Tests de Integración:** Enfocados en las capas de Services y Repositories. **MUST** ejecutarse contra instancias reales de PostgreSQL provisionadas dinámicamente mediante Testcontainers.
- **Cobertura de Casos:** Toda suite de pruebas **MUST** cubrir de manera explícita tanto los caminos felices (*happy paths*) como los casos límite y de error (*edge cases*).

### IV. Política Estricta de Inmutabilidad de Tests (NON-NEGOTIABLE)
Los tests existentes representan los contratos y garantías funcionales establecidas del sistema.
- **Regla no negociable:** Bajo ninguna circunstancia, en ninguna fase del ciclo de vida o refactorización, se modificará o eliminará un test existente sin solicitar previamente permiso al usuario y recibir un "sí" explícito.
- Cualquier cambio o nueva funcionalidad **MUST** ser retrocompatible con la suite de pruebas preexistente salvo autorización expresa.

### V. Convenciones de Idioma y Terminología Técnica
El código fuente y sus artefactos respetan un estándar lingüístico dual riguroso:
- **Español:** Toda la documentación, especificaciones, comentarios explicativos y mensajes de error orientados al usuario o cliente API **MUST** redactarse en español. Los conceptos y nombres del dominio en identificadores de código (variables, métodos, entidades, tablas) **MUST** formularse en español sin acentos y sin la letra 'ñ' (ejemplo: `jugador`, `cotizacion`, `desempeno`, `activo`).
- **Inglés:** Términos técnicos, patrones de diseño, componentes arquitectónicos, palabras reservadas y terminología normativa **MUST** mantenerse en inglés (ejemplo: `Controller`, `Service`, `Repository`, `Stateless`, `A.C.I.D.`, `Testcontainers`, `L1 Cache`).

## Stack Tecnológico y Estándares de Arquitectura

El ecosistema tecnológico aprobado comprende:
- **Backend:** NestJS con TypeScript, estructurado según las capas definidas y principios DDD.
- **Frontend:** React para la interfaz de usuario interactiva y gestión de portfolio.
- **Base de Datos & Caché:** PostgreSQL (relacional, A.C.I.D.) como almacén principal; Redis como caché L1.
- **Entorno & Contenerización:** Docker para estandarización de despliegue y desarrollo local.
- **Testing:** Jest como runner de pruebas y Testcontainers para integración con PostgreSQL real.
- **Documentación de API:** Todos los endpoints públicos y privados de la API REST **MUST** estar exhaustivamente documentados bajo el estándar OpenAPI (Swagger).
- **Herramientas de Consumo:** La colección de Postman del repositorio **MUST** mantenerse sincronizada con los nuevos contratos y endpoints expuestos.

## Definición de Terminado (Definition of Done - DoD)

Un requerimiento, funcionalidad, issue o tarea se considera terminado (**DONE**) si y solo si satisface los tres criterios siguientes:
1. **Tests Completos y Exitosos:** Posee tests unitarios de dominio y tests de integración (Services/Repositories con Testcontainers), cubriendo casos felices y casos borde, y todos los tests pasan exitosamente.
2. **Compilación y Despliegue Local:** La aplicación compila sin errores de tipado o empaquetado y levanta correctamente con la configuración actual (Docker y entorno local).
3. **Colección Postman Actualizada:** La colección de Postman del proyecto se encuentra al día, reflejando fielmente los nuevos endpoints, esquemas de payload y respuestas.

## Governance

Esta Constitución rige de manera soberana sobre cualquier otra práctica, convención o atajo de desarrollo en el proyecto:
- **Supremacía:** Los principios aquí consagrados prevalecen sobre cualquier decisión individual o temporal. Todo Pull Request y revisión de código **MUST** verificar la estricta adherencia a la arquitectura en 5 capas, Rich Domain Model, política de tests y DoD.
- **Procedimiento de Enmienda:** Cualquier modificación, derogación o adición a los principios constitucionales requiere una propuesta formal, consenso explícito del usuario, actualización semántica de versión y plan de migración si aplica.
- **Versionado Semántico:**
  - **MAJOR:** Eliminación o cambio incompatible de principios fundamentales o reestructuración arquitectónica.
  - **MINOR:** Incorporación de nuevos principios, secciones o directrices sustanciales.
  - **PATCH:** Correcciones de redacción, aclaraciones o ajustes menores sin alteración de reglas.

**Version**: 1.0.0 | **Ratified**: 2026-09-13 | **Last Amended**: 2026-09-13
