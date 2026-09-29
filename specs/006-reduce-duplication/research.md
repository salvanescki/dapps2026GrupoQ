# Research & Duplication Evaluation: Code Duplication Reduction

**Feature**: `006-reduce-duplication`  
**Date**: 2026-09-28  

---

## 1. Línea Base y Mediciones Iniciales

### 1.1 Reporte de Duplicación Local (`jscpd`)

#### Reporte A: `--min-lines 5 --min-tokens 50` (código TypeScript, TSX y CSS)
- **Archivos analizados**: 102
- **Líneas totales**: 10,642
- **Tokens totales**: 59,852
- **Clones encontrados**: 50
- **Líneas duplicadas**: 683 (6.42%)
- **Distribución por tipo**:
  - `tsx`: 27 clones, 294 líneas duplicadas (10.06%) — Principalmente en tests de integración y vistas.
  - `typescript`: 16 clones, 329 líneas duplicadas (5.81%) — Principalmente en setup de Testcontainers y specs de backend.
  - `css`: 7 clones, 60 líneas duplicadas (2.92%) — Reglas duplicadas entre `components.css`, `login.css` y `home.css`.

#### Reporte B: `--min-lines 10 --min-tokens 100` (bloques grandes)
- **Archivos analizados**: 91
- **Líneas totales**: 10,469
- **Tokens totales**: 58,996
- **Clones encontrados**: 9
- **Líneas duplicadas**: 245 (2.34%)
- **Clones principales**:
  1. `test/integration/jugador.service.spec.ts` ↔ `test/integration/player-detail.spec.ts` (setup y seed data de jugadores)
  2. `test/integration/player-detail.spec.ts` ↔ `test/integration/players-filters.spec.ts` (setup de repositorios y base de datos)
  3. `src/components/auth/LoginForm.tsx` ↔ `src/components/auth/RegisterForm.tsx` (handlers manuales de formulario)
  4. `tests/integration/ProtectedRoute.test.tsx` (bloques repetidos de renderizado de rutas)
  5. `tests/views/EmptyStateFilterReset.spec.tsx` ↔ `tests/views/PlayersCatalogView.spec.tsx` (mocks repetidos de hooks)

---

### 1.2 Snapshot de Línea Base de Tests

Conteos estáticos verificados contra el código (títulos `it(` y llamadas `expect(`). La fuente de verdad para las comparaciones es el snapshot exacto que captura la tarea T001.

| Suite | Archivos | Tests Totales | Llamadas expect() | Estado |
|---|---|---|---|---|
| **Frontend (Vitest)** | 8 | 106 | 187 | PASS |
| **Backend (Jest)** | 10 | 48 | 166 | PASS |

#### Frontend (tests / expect)
1. `tests/unit/validaciones.test.ts` (17 / 25)
2. `tests/unit/validaciones-registro.test.ts` (31 / 44)
3. `tests/unit/storage.service.test.ts` (12 / 20)
4. `tests/views/PlayersCatalogView.spec.tsx` (4 / 16)
5. `tests/views/EmptyStateFilterReset.spec.tsx` (3 / 12)
6. `tests/integration/ProtectedRoute.test.tsx` (6 / 12)
7. `tests/integration/LoginView.test.tsx` (14 / 23)
8. `tests/integration/RegisterView.test.tsx` (19 / 35)

#### Backend (tests / expect)
1. `test/unit/domain/usuario.entity.spec.ts` (7 / 18)
2. `test/unit/domain/usuario-login.spec.ts` (2 / 4)
3. `test/unit/domain/jugador.entity.spec.ts` (14 / 43)
4. `test/unit/domain/criterio-filtro.spec.ts` (5 / 14)
5. `test/integration/usuario.typeorm-repository.spec.ts` (3 / 11)
6. `test/integration/auth.service.spec.ts` (7 / 17)
7. `test/integration/auth-perfil.spec.ts` (3 / 8)
8. `test/integration/jugador.service.spec.ts` (2 / 18)
9. `test/integration/player-detail.spec.ts` (2 / 18)
10. `test/integration/players-filters.spec.ts` (3 / 15)

---

## 2. Evaluación Bloque por Bloque y Decisiones Técnicas

### 2.1 Código Productivo Frontend

#### Bloque F1: Handlers manuales de inputs en `LoginForm.tsx` y `RegisterForm.tsx`
- **Ubicación**: `frontend/src/components/auth/LoginForm.tsx` y `frontend/src/components/auth/RegisterForm.tsx` (~19 líneas duplicadas).
- **Análisis**: Ambos formularios manejan por separado estado de inputs, `onChange`, `onBlur` y limpieza de errores; esa responsabilidad ya existe en `useForm.ts`. Pero `useForm` no encaja tal cual: su `sanitize` devuelve el mismo tipo (Register sanitiza `DatosRegistro` a `SolicitudRegistroApi`), usa `any`, no notifica `onClearError`, y `LoginForm` recibe `cargando` por props y vacía la contraseña tras enviar.
- **Decisión**: **REFACTORIZAR CON CONDICIÓN**.
- **Justificación**: Misma responsabilidad y misma razón de cambio (ciclo de vida del formulario), y ya estaba comprometido en la spec 005.
- **Condición**: primero generalizar el tipado de `useForm` (sin cambiar su comportamiento) y hacerlo al final de US1. Si la integración exige contorsiones o cambia algún comportamiento observable, se revierte, se registra como Duplicación Aceptada y se consulta al usuario.
- **Abstracción propuesta**: `useForm` (hook existente, tipado generalizado) en `frontend/src/hooks/useForm.ts`.

#### Bloque F2: Verificación de sesión y spinner en `ProtectedRoute.tsx` y `PublicRoute.tsx`
- **Ubicación**: `frontend/src/routes/ProtectedRoute.tsx` y `frontend/src/routes/PublicRoute.tsx` (~12 líneas).
- **Análisis**: Ambas rutas duplican el bloque de carga con estilos inline.
- **Decisión**: **REFACTORIZAR**.
- **Justificación**: Mismo componente visual y misma responsabilidad; además elimina estilos inline.
- **Abstracción propuesta**: `RouteLoading` en `frontend/src/components/layout/RouteLoading.tsx`, con clase `.route-loading` en `components.css` y `aria-label="Cargando sesión"` conservado.

#### Bloque F3: Cliente HTTP y normalización de errores en `auth-api.client.ts` y `playersApi.ts`
- **Ubicación**: `frontend/src/api/auth-api.client.ts` y `frontend/src/api/playersApi.ts` (~16 líneas).
- **Análisis**: Ambos implementan su propio `fetch`, cabeceras JSON y parsing de errores; hay dos clases de error (`HttpError` y `PlayersApiError`).
- **Decisión**: **REFACTORIZAR**.
- **Justificación**: Ambas capas hablan con la misma API REST y el manejo uniforme de errores tiene valor propio.
- **Restricciones**: `HttpError` debe seguir importándose desde `auth-api.client` (los tests de Login y Register mockean ese módulo con su propia clase y `instanceof` se rompería); `playersApi` mantiene los nombres de sus exports (los tests de vistas lo mockean).
- **Cambios de comportamiento asumidos**: los errores de red del catálogo pasan del mensaje técnico del navegador a un mensaje en español; desaparece `PlayersApiError` (sin consumidores externos).
- **Abstracción propuesta**: `httpRequest` y `HttpError` en `frontend/src/api/http-client.ts`.

#### Bloque F4: Reglas CSS duplicadas entre `components.css` y `login.css`
- **Ubicación**: `frontend/src/styles/components.css` y `frontend/src/styles/login.css` (~15 líneas, incluidas reglas repetidas dentro de `components.css`).
- **Análisis**: Reglas repetidas con selectores base (`.login-page`, `.login-card`, `.spinner`, botones).
- **Decisión**: **REFACTORIZAR (acotado)**.
- **Justificación**: Se eliminan solo las reglas exactamente repetidas. El resultado depende del orden de importación de las hojas, por lo que se valida con capturas antes y después de `/login`, `/register` y `/players`.
- **Exclusión**: `home.css` no se toca (dashboard).

---

### 2.2 Código Productivo Backend

#### Bloque B1: Columnas id/fechas en entidades TypeORM (`UsuarioOrmEntity`, `JugadorOrmEntity`, `EquipoOrmEntity`, `LigaOrmEntity`)
- **Ubicación**: `backend/src/data-access/*.orm-entity.ts`
- **Análisis**: Todas las entidades ORM definen `@PrimaryColumn('uuid') id: string`, `@CreateDateColumn() creadoEn: Date`, `@UpdateDateColumn() actualizadoEn: Date`.
- **Decisión**: **ACEPTAR (Duplicación Aceptada)**.
- **Justificación**:
  1. Cada entidad ORM mapea una tabla SQL independiente con esquemas que pueden diferir en el futuro (algunas tablas no requieren `actualizadoEn` o usan llaves compuestas).
  2. La herencia en TypeORM (`BaseEntity` o `@ChildEntity`) introduce complejidad innecesaria en migraciones y metadatos.
  3. Mantenerlas explícitas y declarativas es más legible y respeta la simplicidad de la capa Data Access (Principio I).

#### Bloque B2: Entidades de Dominio Ricas (`Usuario`, `Jugador`, `Equipo`, `Liga`)
- **Ubicación**: `backend/src/domain/`
- **Análisis**: Similitudes estructurales en constructores o getters.
- **Decisión**: **ACEPTAR (Duplicación Aceptada)**.
- **Justificación**:
  1. **Principio II (Rich Domain Model & DDD)**: cada entidad de dominio representa un concepto de negocio autónomo con sus propias invariantes.
  2. Forzar una clase base genérica de dominio acoplaría agregados independientes y debilitaría el modelo de dominio.

---

### 2.3 Suites de Testing (Frontend y Backend)

#### Bloque T1: Inicialización de Testcontainers (`setup-testcontainers.ts` y `setup-players-testcontainers.ts`)
- **Ubicación**: `backend/test/integration/`
- **Análisis**: Dos clases estáticas casi idénticas (~55 líneas repetidas). Difieren en las entidades registradas (`UsuarioOrmEntity` vs `Liga/Equipo/Jugador`), el nombre de la base y la limpieza (`clear()` sobre usuarios vs `TRUNCATE ... CASCADE`). Consumidores: `usuario.typeorm-repository.spec.ts`, `auth.service.spec.ts` y `auth-perfil.spec.ts` (el primero) y `jugador.service.spec.ts`, `player-detail.spec.ts` y `players-filters.spec.ts` (el segundo).
- **Decisión**: **REFACTORIZAR**.
- **Justificación**: Unificar en `TestDatabaseHelper` que registre las cuatro entidades y limpie con `TRUNCATE TABLE jugadores, equipos, ligas, usuarios CASCADE;` (equivalente para los tests de usuario). No reduce el número de contenedores: Jest aísla los módulos por archivo y cada archivo sigue levantando el suyo.
- **Restricción**: los dos archivos viejos se eliminan solo después de migrar los seis consumidores y verificar que nadie los importa.
- **Abstracción propuesta**: `TestDatabaseHelper` en `backend/test/integration/test-database.helper.ts`.

#### Bloque T2: Setup repetido en tests de jugadores
- **Ubicación**: `backend/test/integration/player-detail.spec.ts`, `players-filters.spec.ts`, `jugador.service.spec.ts`
- **Análisis**: Lo idéntico entre los tres archivos (~60 líneas) es el `beforeAll`: instanciar los tres repositorios TypeORM, el mock de `FootballDataClient` y compilar el módulo de testing (además de imports, `afterAll` y `beforeEach`). Los datos semilla NO son comunes: viven dentro de cada `it` y difieren entre archivos.
- **Decisión**: **REFACTORIZAR (solo el setup)**.
- **Justificación**: Extraer un contexto de setup elimina la duplicación sin tocar datos ni valores esperados. Un seed "canónico" único quedaría descartado por alterar los datos de los tests (Principio IV).
- **Abstracción propuesta**: `createPlayersTestContext(dataSource)` en `backend/test/integration/players-test.context.ts`; devuelve servicio, repositorios y el mock; sin seeds ni aserciones.

#### Bloque T3: Repetición dentro de los tests de integración de frontend
- **Ubicación**: `frontend/tests/integration/ProtectedRoute.test.tsx`, `LoginView.test.tsx`, `RegisterView.test.tsx`
- **Análisis**: La duplicación es interna de cada archivo. `ProtectedRoute.test.tsx` repite el bloque `AuthContext.Provider` (contexto mock) + `MemoryRouter` + `Routes` en cada caso (~150 líneas duplicadas). `LoginView.test.tsx` y `RegisterView.test.tsx` ya tienen su helper de render y repiten los flujos de completar campos y enviar el formulario.
- **Decisión**: **REFACTORIZAR con helpers locales**.
- **Justificación**: Un archivo compartido no aporta: cada helper tiene un único consumidor y los wrappers son distintos entre archivos. `ProtectedRoute` usa un contexto mock, no el `AuthProvider` real, y usar el real cambiaría el comportamiento del test.
- **Abstracción propuesta**: helpers locales dentro de cada archivo; solo interacciones y render, sin `expect`.

#### Bloque T4: Mocks en vistas de catálogo (`EmptyStateFilterReset.spec.tsx` y `PlayersCatalogView.spec.tsx`)
- **Ubicación**: `frontend/tests/views/`
- **Análisis**: Lo repetido (~13 líneas) es el bloque `vi.mock('../../src/hooks/useAuth', ...)`. Los datos de ambas specs no se repiten.
- **Decisión**: **ACEPTAR (Duplicación Aceptada)**.
- **Justificación**: `vi.mock` se hoistea por archivo; compartirlo exige trucos (`vi.hoisted`, imports dinámicos) más complejos que la repetición de 13 líneas. No se modifican estos archivos.

---

## 3. Registro de Duplicación Aceptada (Accepted Duplication)

| Bloque / Archivos | Razón de Similitud | Justificación de Preservación | Principios Respaldados |
|---|---|---|---|
| **Entidades de Dominio** (`Usuario`, `Jugador`, `Liga`) | Getters y propiedades básicas | Cada entidad encapsula reglas de negocio distintas; acoplarlas en una clase base debilita el modelo de dominio. | Principio II (Rich Domain Model & DDD) |
| **Entidades ORM TypeORM** (`*.orm-entity.ts`) | Decoradores de columnas (`@PrimaryColumn`, `@CreateDateColumn`) | Mantener el mapeo de tablas explícito, independiente y sin acoplamiento por herencia TypeORM. | Principio I (Arquitectura en 5 Capas / Data Access) |
| **Validaciones Específicas de Dominio** | Estructuras de retorno `{ esValido, errores }` | Cada esquema valida invariantes propias del caso de uso (login vs registro vs filtros). | Principio II y V |
| **Bloques `vi.mock`** (`useAuth` en las dos specs de catálogo; fábrica de `HttpError` en Login y Register) | Mocks de módulo idénticos | Vitest hoistea `vi.mock` por archivo; compartirlos requiere abstracciones más complejas que la repetición. | Principio IV (no alterar los tests) |
| **`LoginForm` / `RegisterForm`** (condicional) | Handlers de formulario | Integración exitosa con `useForm` generalizado sin forzar abstracciones ni alterar comportamiento. | Regla de "refactorizar solo con sentido" |

---

## 4. Resultados Posteriores al Refactor y Comparación Final

### 4.1 Métricas de Duplicación (`jscpd`)

| Umbral | Métrica | Antes (Línea Base) | Después (Refactorizado) | Reducción |
|---|---|---|---|---|
| **5 líneas / 50 tokens** | Clones encontrados | 50 clones | 24 clones | -52.0% |
| | Líneas duplicadas | 683 (6.42%) | 323 (3.09%) | -52.7% |
| **10 líneas / 100 tokens** | Clones encontrados | 9 clones | 4 clones | -55.5% |
| | Líneas duplicadas | 245 (2.34%) | 99 (0.97%) | -59.6% |

### 4.2 Paridad de Tests y Aserciones

| Suite | Tests Totales (Antes / Después) | expect() Totales (Antes / Después) | expect() en Helpers | Estado |
|---|---|---|---|---|
| **Frontend (Vitest)** | 106 / 106 | 187 / 187 | 0 | PASS |
| **Backend (Jest)** | 48 / 48 | 166 / 166 | 0 | PASS |
| **Total** | 154 / 154 | 353 / 353 | 0 | PASS |

