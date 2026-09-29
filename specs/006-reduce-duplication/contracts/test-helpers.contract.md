# Contract: Shared Test Infrastructure & Helpers

**Feature**: `006-reduce-duplication`  
**Date**: 2026-09-28  

## Reglas generales (Principio IV)
- Ningún helper contiene aserciones (`expect`) ni valores esperados.
- No se altera ningún título, escenario ni aserción de los tests existentes.
- Los `vi.mock` de Vitest permanecen en cada archivo de test.
- Verificación en cada checkpoint contra la línea base de la tarea T001: mismos títulos, mismo total de `expect(` (tests + helpers).

## 1. `TestDatabaseHelper` (`backend/test/integration/test-database.helper.ts`)
- **Propósito**: Administrar el ciclo de vida del contenedor PostgreSQL (Testcontainers) y la conexión TypeORM en los tests de integración.
- **Consumidores**: `usuario.typeorm-repository.spec.ts`, `auth.service.spec.ts`, `auth-perfil.spec.ts`, `jugador.service.spec.ts`, `player-detail.spec.ts`, `players-filters.spec.ts`.
- **Entidades registradas**: `UsuarioOrmEntity`, `LigaOrmEntity`, `EquipoOrmEntity`, `JugadorOrmEntity`.
- **Garantías**:
  - `start()`: inicia el contenedor si no existe en ese proceso e inicializa el `DataSource`.
  - `cleanDatabase()`: `TRUNCATE TABLE jugadores, equipos, ligas, usuarios CASCADE;` para aislamiento entre tests.
  - `stop()`: destruye el `DataSource` y detiene el contenedor.
- **Precondición de borrado**: `setup-testcontainers.ts` y `setup-players-testcontainers.ts` solo se eliminan cuando ningún archivo los importa.

## 2. `createPlayersTestContext` (`backend/test/integration/players-test.context.ts`)
- **Propósito**: Armar repositorios, mock de `FootballDataClient` y módulo de testing para los tests de jugadores.
- **Garantías**:
  - Devuelve `jugadorService`, `ligaRepo`, `equipoRepo`, `jugadorRepo` y `mockFootballDataClient`.
  - No inserta datos: los seeds permanecen dentro de cada test.
  - Los timeouts de `beforeAll` (90000) permanecen en cada spec.

## 3. Helpers locales de frontend
- **`ProtectedRoute.test.tsx`**: render con `AuthContext.Provider` (contexto mock existente) + `MemoryRouter` + `Routes`. Sin `AuthProvider` real.
- **`LoginView.test.tsx` / `RegisterView.test.tsx`**: helpers para completar campos y enviar el formulario (solo `userEvent`).
- No se crean archivos compartidos de fixtures para el catálogo: solo repiten bloques `vi.mock`.
