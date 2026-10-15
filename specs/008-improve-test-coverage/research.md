# Research: Mejora de Cobertura de Tests (Frontend y Backend >= 80%)

**Feature Branch**: `008-improve-test-coverage`  
**Date**: 2026-10-15  
**Spec Reference**: [spec.md](spec.md)

---

## 1. Executive Summary & Baseline Analysis

Tras ejecutar los suites de cobertura existentes en el repositorio:
- **Backend (`npm run test:cov`)**:
  - Líneas actuales: **84.98%** (Cumple umbral global de líneas >= 80%)
  - Bifurcaciones (Branches) actuales: **69.53%** (Brecha de **10.47%** para alcanzar el umbral mínimo del 80%)
  - Principales brechas en backend: `src/services/jugadores.service.ts` (14.58% branches), `src/services/clients/football-data.client.ts` (20% branches), `src/data-access/equipo.typeorm-repository.ts` (25% branches), `src/data-access/liga.typeorm-repository.ts` (50% branches), `src/common/filters/domain-exception.filter.ts` (42.85% branches), y el archivo bootstrap `src/main.ts` (0% cobertura sin lógica de negocio).
- **Frontend (`npm run test:coverage`)**:
  - Líneas actuales: **64.38%** (Brecha de **15.62%** para alcanzar el umbral mínimo del 80%)
  - Bifurcaciones (Branches) actuales: **50.93%** (Brecha de **29.07%** para alcanzar el umbral mínimo del 80%)
  - Principales brechas en frontend: `src/api` (0%), `src/components/ui` (`Button.tsx`, `Card.tsx`, `PasswordInput.tsx`, `Spinner.tsx` en 0%), `src/components/layout/AppLayout.tsx` (0%), `src/components/catalog/FiltersBar.tsx` (35.71% branches), `src/components/catalog/FilterModal.tsx` (28% branches), `src/hooks/useInfinitePlayers.ts` (29.78% branches), `src/hooks/usePlayerFilters.ts` (38.29% branches), `src/context/AuthProvider.tsx` (37.5% branches), `src/views/HomeView.tsx` (0%), `src/routes/AppRoutes.tsx` (0%).

---

## 2. Research Decisions

### Decision 1: Configuración y Exclusiones de Cobertura en Backend (Jest)

- **Decision**: 
  1. Configurar `coverageThreshold` en `backend/jest.config.js` con:
     ```javascript
     coverageThreshold: {
       global: {
         lines: 80,
         branches: 80,
         functions: 80,
         statements: 80,
       },
     }
     ```
  2. Ajustar `collectCoverageFrom` en `backend/jest.config.js` para excluir archivos bootstrap puros de infraestructura sin lógica de negocio:
     ```javascript
     collectCoverageFrom: [
       'src/**/*.(t|j)s',
       '!src/main.ts',
       '!src/**/*.module.ts',
       '!src/**/*.dto.ts',
       '!src/**/*.interface.ts',
       '!src/config/database.config.ts',
     ]
     ```
- **Rationale**: 
  - `src/main.ts` es únicamente el punto de entrada de arranque de NestJS (`NestFactory.create(AppModule)` y `app.listen(port)`), cuyo testeo unitario es artificial o redundante con tests e2e.
  - Los DTOs e interfaces son estructuras declarativas de TypeScript sin lógica condicional propia.
  - La exclusión de bootstrap está explícitamente contemplada en los supuestos de la especificación técnica (`spec.md: Assumptions`).
- **Alternatives considered**:
  - *No configurar `coverageThreshold` y validarlo manualmente*: Rechazado porque viola el Principio VI de la Constitución y el requisito funcional FR-007 (enforcement automático y efecto ratchet).
  - *Incluir `main.ts` y levantar un proceso HTTP en cada corrida de Jest*: Rechazado porque genera fragilidad de puertos ocupados y retrasa la suite sin aportar validación de lógica de negocio.

---

### Decision 2: Estrategia de Pruebas en Backend según Arquitectura en 5 Capas

- **Decision**: 
  1. **Dominio (`src/domain`)**: Pruebas unitarias en aislamiento total (`test/unit/domain/*.spec.ts`). Validar constructores, métodos de negocio, invariantes y ramas de error (`Liga.crear`, `Jugador.actualizarPrecio`, `Usuario.autenticar`, `JugadorNoEncontradoException`).
  2. **Servicios y Clientes (`src/services`)**: Pruebas de integración (`test/integration/`).
     - Para `jugadores.service.ts`: Pruebas de integración con Testcontainers provisionando PostgreSQL real y mocks/stubs de `FootballDataClient` para cubrir todas las ramas de sincronización, cacheo, filtrado y excepciones de red.
     - Para `football-data.client.ts`: Pruebas de integración/unitarias con mock de `fetch` o `http` para validar branches de reintentos, errores 404/500 y mapeo de datos.
  3. **Repositorios (`src/data-access`)**: Pruebas de integración con Testcontainers (`test/integration/*.spec.ts`) contra PostgreSQL real para cubrir ramas no visitadas en `equipo.typeorm-repository.ts`, `liga.typeorm-repository.ts` y `jugador.typeorm-repository.ts` (búsqueda por filtros, entidades no encontradas, relaciones nulas).
  4. **Filtros y Controladores (`src/common/filters`, `src/controllers`)**: Pruebas unitarias/integración de `domain-exception.filter.ts` simulando excepciones de dominio y evaluando el payload JSON y código HTTP devuelto.
- **Rationale**: 
  - Cumple estrictamente con el Principio I (5 capas), Principio II (Rich Domain Model) y Principio III (Testcontainers para integración, unitarios para dominio) de la Constitución.
  - Aborda directamente los archivos con menor cobertura de branches en backend (`jugadores.service.ts` al 14.58%).
- **Alternatives considered**:
  - *Usar mocks de repositorios con SQLite en memoria*: Rechazado categóricamente por la Constitución (Principio III exige instancias reales de PostgreSQL provisionadas con Testcontainers).
  - *Mokear la base de datos completa con Jest mocks*: Inadecuado para probar el patrón Repository y consultas TypeORM reales.

---

### Decision 3: Configuración y Exclusiones de Cobertura en Frontend (Vitest v8)

- **Decision**:
  1. Configurar umbrales estrictos en `frontend/vite.config.ts`:
     ```typescript
     coverage: {
       provider: 'v8',
       reporter: ['text', ['lcov', { projectRoot: path.resolve(__dirname, '..') }], 'html'],
       reportsDirectory: './coverage',
       include: ['src/**/*.{ts,tsx}'],
       exclude: [
         'src/main.tsx',
         'src/vite-env.d.ts',
         'src/**/*.d.ts',
         'src/types/**/*',
       ],
       thresholds: {
         lines: 80,
         branches: 80,
         functions: 80,
         statements: 80,
       },
     }
     ```
  2. Excluir `src/types/**/*` ya que solo contiene definiciones de tipos TypeScript que no generan código JavaScript ejecutable en v8.
- **Rationale**:
  - Vitest v8 mide con exactitud el AST y los source maps.
  - Cumple el Principio VI y FR-002 / FR-007 de forma automática.
- **Alternatives considered**:
  - *Usar Istanbul en vez de v8*: v8 ya está instalado (`@vitest/coverage-v8`) y rinde sustancialmente más rápido en el entorno de desarrollo y CI.

---

### Decision 4: Estrategia de Pruebas en Frontend (Testing Library & Hooks)

- **Decision**:
  1. **Componentes UI Base (`src/components/ui`)**:
     - Crear pruebas unitarias con `@testing-library/react` para:
       - `Button.tsx`: variantes (primary, secondary, danger, outline), tamaños, estado disabled, estado loading, evento click.
       - `Card.tsx`: renderizado de children, estilos dinámicos, clases adicionales.
       - `PasswordInput.tsx`: alternancia visibilidad de contraseña (toggle show/hide password), validación, accesibilidad (`aria-label`).
       - `Spinner.tsx`: variantes de color y tamaño.
       - `Alert.tsx`: ramas no cubiertas (tipos info, warning, success, error, botón de cierre opcional).
  2. **Layout y Vistas (`src/components/layout`, `src/views`)**:
     - `AppLayout.tsx`: renderizado de Navbar, Sidebar o contenedor principal, comportamiento con usuario autenticado vs no autenticado.
     - `HomeView.tsx`: renderizado de héroe, llamadas a la acción, enlaces de navegación.
  3. **Componentes de Catálogo (`src/components/catalog`)**:
     - `FiltersBar.tsx`: interacción de botones de filtro rápido, apertura de modal, reseteo de filtros.
     - `FilterModal.tsx`: branches de selección de ligas, equipos, rangos de precio, confirmación y cancelación.
     - `PlayerCard.tsx` & `SearchBar.tsx`: casos límite con jugadores sin foto, precios decimales, debounce o vaciado de búsqueda.
  4. **Hooks Personalizados (`src/hooks`)**:
     - Usar `renderHook` de `@testing-library/react`.
     - `usePlayerFilters.ts`: pruebas exhaustivas con cambio de liga, rango de precios, ordenamiento y reset.
     - `useInfinitePlayers.ts`: branches de paginación infinita, carga inicial, scroll trigger, error de carga y fin de catálogo (`hasMore: false`).
  5. **Capa API y Servicios (`src/api`, `src/services`)**:
     - `http-client.ts`, `auth.api.client.ts`, `playersApi.ts`, `auth.service.ts`: pruebas unitarias mockeando `fetch` / `localStorage` para comprobar branches de cabeceras de autorización, manejo de errores HTTP (400, 401, 500) y respuestas exitosas.
- **Rationale**:
  - Permite alcanzar rápidamente un coverage superior al 85% de líneas y 82% de branches en frontend.
  - Todas las pruebas son independientes, rápidas y se ejecutan en jsdom.
- **Alternatives considered**:
  - *Pruebas E2E con Cypress/Playwright para todo*: Excesivamente lentas y costosas de mantener; Testing Library y pruebas unitarias/integración de Vitest son suficientes y más precisas para cobertura de branches.

---

### Decision 5: Preservación Absoluta de Tests Existentes (Inmutabilidad)

- **Decision**:
  - Todos los tests existentes en `backend/test` y `frontend/tests` permanecen intactos.
  - Los nuevos tests se ubican en archivos nuevos complementarios o se anexan nuevos bloques `describe`/`it` sin alterar ninguna aserción previa.
  - Verificación antes y después de cada cambio mediante ejecución completa de las suites.
- **Rationale**:
  - Cumplimiento estricto del Principio IV (Política Estricta de Inmutabilidad de Tests) de la Constitución.
