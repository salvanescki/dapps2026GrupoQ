# Data Model & Abstraction Interfaces: Code Duplication Reduction

**Feature**: `006-reduce-duplication`  
**Date**: 2026-09-28  

---

## Interfaces y Firmas de Abstracciones Propuestas

### 1. Cliente HTTP Compartido Frontend (`frontend/src/api/http-client.ts`)

```typescript
export class HttpError extends Error {
  constructor(
    public readonly codigoEstado: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T>;
```

Reglas de compatibilidad:
- `auth-api.client.ts` sigue exportando `HttpError` (reexportada), `loginUsuario`, `obtenerPerfilAutenticado` y `registrarUsuario`. Los consumidores (`AuthProvider`, `RegisterView`, `auth.service`) siguen importando `HttpError` desde `auth-api.client`, porque los tests de Login y Register mockean ese módulo con su propia clase.
- `playersApi.ts` sigue exportando `getPlayers`, `getPlayerById` y `getPlayerFilterOptions` (los tests de vistas mockean ese módulo). `PlayersApiError` se reemplaza por `HttpError` (no tiene consumidores externos).
- La construcción de query params queda en `playersApi.ts`; el mapeo específico de 400/409/5xx de registro queda en `registrarUsuario`.

---

### 2. Componente de Carga de Rutas (`frontend/src/components/layout/RouteLoading.tsx`)

```typescript
export interface RouteLoadingProps {
  mensaje?: string;
  className?: string;
}

export const RouteLoading: React.FC<RouteLoadingProps>;
```

Reemplaza el bloque con estilos inline de `ProtectedRoute` y `PublicRoute` por una clase `.route-loading` en `components.css`, manteniendo `aria-label="Cargando sesión"`.

---

### 3. Hook `useForm` con tipado generalizado (`frontend/src/hooks/useForm.ts`)

Cambios necesarios para poder integrarlo sin alterar el comportamiento:
- Eliminar `any` (valores de campo tipados por `T`).
- `sanitize` puede devolver un tipo distinto al de los valores (`RegisterForm` sanitiza `DatosRegistro` a `SolicitudRegistroApi`, sin `confirmarContrasena`).
- Permitir notificar cambios de campo para conservar la llamada a `onClearError`.
- `LoginForm` conserva `cargando` recibido por props y el vaciado de la contraseña tras enviar.

Si la integración exige contorsiones, se revierte y `LoginForm`/`RegisterForm` pasan a "Duplicación Aceptada" (se consulta antes).

---

### 4. Helper Unificado de Testcontainers Backend (`backend/test/integration/test-database.helper.ts`)

```typescript
export class TestDatabaseHelper {
  static async start(): Promise<{
    container: StartedPostgreSqlContainer;
    dataSource: DataSource;
  }>;

  static async cleanDatabase(): Promise<void>;

  static async stop(): Promise<void>;
}
```

- Registra las cuatro entidades ORM (`UsuarioOrmEntity`, `LigaOrmEntity`, `EquipoOrmEntity`, `JugadorOrmEntity`) con `synchronize: true`.
- `cleanDatabase()` ejecuta `TRUNCATE TABLE jugadores, equipos, ligas, usuarios CASCADE;` (equivalente al `clear()` previo sobre `usuarios` para los tests de usuario).
- Cada archivo de test sigue levantando su propio contenedor: Jest aísla los módulos por archivo, por lo que no se comparte una instancia entre archivos.

---

### 5. Contexto de Setup Compartido para Tests de Jugadores (`backend/test/integration/players-test.context.ts`)

```typescript
export interface PlayersTestContext {
  jugadorService: JugadorService;
  ligaRepo: LigaTypeOrmRepository;
  equipoRepo: EquipoTypeOrmRepository;
  jugadorRepo: JugadorTypeOrmRepository;
  mockFootballDataClient: Partial<FootballDataClient>;
}

export async function createPlayersTestContext(
  dataSource: DataSource
): Promise<PlayersTestContext>;
```

- Encapsula lo que hoy repiten `player-detail`, `players-filters` y `jugador.service`: instanciar los tres repositorios, el mock de `FootballDataClient` (resuelve `{ competition: { id: 2021, name: 'Premier League', code: 'PL' }, teams: [] }`) y compilar el módulo de testing con `JugadorService` y `SincronizacionJugadoresService`.
- NO incluye datos semilla: cada `it` sigue creando sus propios datos, que son distintos entre archivos.
- NO incluye aserciones.

---

### 6. Helpers locales en tests de frontend (sin archivos compartidos nuevos)

- `ProtectedRoute.test.tsx`: helpers locales que encapsulan `AuthContext.Provider` con un contexto mock (`createMockContext`, que ya existe en el archivo) + `MemoryRouter` + `Routes`. No se usa el `AuthProvider` real.
- `LoginView.test.tsx` y `RegisterView.test.tsx`: helpers locales para los flujos repetidos de completar campos y enviar el formulario (solo interacciones de `userEvent`, sin `expect`).
- Los bloques `vi.mock` permanecen en cada archivo.
