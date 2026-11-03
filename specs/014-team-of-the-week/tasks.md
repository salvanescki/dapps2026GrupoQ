# Tasks: Equipo de la Semana (Team of the Week)

**Input**: Design documents from `specs/014-team-of-the-week/`

**Prerequisites**: `plan.md` ✅ | `spec.md` ✅ | `research.md` ✅ | `data-model.md` ✅ | `contracts/` ✅ | `quickstart.md` ✅

**Tests**: Incluidos — La constitución del proyecto exige cobertura mínima del 80% en líneas y branches por stack, con Testcontainers en backend y Vitest en frontend. Ningún test existente puede ser modificado.

**Organización**: Las tareas están agrupadas por historia de usuario para habilitar implementación y validación independiente de cada historia.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias incompletas)
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1…US5)
- Se incluyen rutas exactas de archivo en cada descripción

---

## Phase 1: Setup (Infraestructura Compartida)

**Propósito**: Registrar la migración nueva en el listado explícito de `database.config.ts` y crear los directorios de código fuente que alojarán los nuevos artefactos.

- [x] T001 Registrar la migración `CreateTeamOfTheWeekTables1730500000000` en el array `migrations` de `backend/src/config/database.config.ts` (importar la clase al tope del archivo; agregarla como último elemento de la lista; no modificar las migraciones ni entradas existentes)
- [x] T002 [P] Crear el archivo vacío `backend/src/domain/equipo-semanal.repository.interface.ts` para reservar el token DI
- [x] T003 [P] Crear los directorios `backend/src/persistence/typeorm/entities/` y `backend/src/persistence/typeorm/repositories/` si no existen (verificar con `ls`)

---

## Phase 2: Foundational — Dominio, Persistencia y Caché (Bloqueantes)

**Propósito**: Implementar todos los artefactos de infraestructura que son prerequisito estricto de todas las historias de usuario: entidades de dominio ricas, migración, ORM entities, repositorio y extensión de caché.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede comenzar hasta que esta fase esté completa y los tests unitarios de dominio pasen.

### Migración de Base de Datos

- [x] T004 Crear la migración `backend/src/migrations/1730500000000-create-team-of-the-week-tables.ts` implementando `MigrationInterface` con:
  - Método `up`: `CREATE TABLE IF NOT EXISTS equipos_semanales` con columnas `id UUID PRIMARY KEY`, `ano INTEGER NOT NULL CHECK (ano >= 2024)`, `semana_iso INTEGER NOT NULL CHECK (semana_iso >= 1 AND semana_iso <= 53)`, `formacion VARCHAR(20) NOT NULL DEFAULT '4-3-3'`, `estrategia_id VARCHAR(50) NOT NULL`, `estrategia_version VARCHAR(50) NOT NULL`, `fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now()`, y `CONSTRAINT uq_equipos_semanales_ano_semana UNIQUE (ano, semana_iso)`
  - Método `up` (continuación): `CREATE TABLE IF NOT EXISTS miembros_equipos_semanales` con columnas `id UUID PRIMARY KEY`, `equipo_semanal_id UUID NOT NULL REFERENCES equipos_semanales(id) ON DELETE CASCADE`, `jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT`, `nombre VARCHAR(100) NOT NULL`, `equipo_nombre VARCHAR(100) NOT NULL`, `posicion VARCHAR(30) NOT NULL CHECK (posicion IN ('Portero', 'Defensa', 'Mediocampista', 'Delantero'))`, `cotizacion NUMERIC(10,4) NOT NULL CHECK (cotizacion >= 1.0)`, `score NUMERIC(6,4) NOT NULL CHECK (score >= 0.0 AND score <= 1.0)`, `orden INTEGER NOT NULL CHECK (orden >= 1 AND orden <= 11)`, y `CONSTRAINT uq_miembro_equipo_jugador UNIQUE (equipo_semanal_id, jugador_id)`
  - Método `up` (continuación): `CREATE INDEX IF NOT EXISTS idx_equipos_semanales_fecha ON equipos_semanales(fecha_generacion DESC)` e `idx_equipos_semanales_ano_semana ON equipos_semanales(ano DESC, semana_iso DESC)` e `idx_miembros_equipo_id` e `idx_miembros_jugador_id`
  - Método `down`: `DROP TABLE IF EXISTS miembros_equipos_semanales CASCADE` y `DROP TABLE IF EXISTS equipos_semanales CASCADE`

### Entidades de Dominio (Rich Domain Model)

- [x] T005 Crear `backend/src/domain/miembro-equipo-semanal.entity.ts` como clase inmutable con constructor privado, propiedades readonly `_id`, `_equipoSemanalId`, `_jugadorId`, `_nombre`, `_equipoNombre`, `_posicion` (tipo `PosicionJugador`), `_cotizacion` (number ≥ 1.00), `_score` (number en [0,1]), `_orden` (integer 1–11), método de fábrica estático `crear(props)` que valida invariantes (nombre y equipoNombre no vacíos, cotizacion ≥ 1.00, score en [0,1]) arrojando `ReglaDeNegocioException` en español ante violaciones, y getters públicos para todas las propiedades
- [x] T006 Crear `backend/src/domain/equipo-semanal.entity.ts` como Agregado Raíz Rico con:
  - Constructor privado y propiedades readonly: `_id`, `_ano`, `_semanaIso`, `_formacion` (`'4-3-3'`), `_estrategiaId`, `_estrategiaVersion`, `_fechaGeneracion`, `_miembros: MiembroEquipoSemanal[]`
  - Método de fábrica estático `seleccionarOnceIdeal(params: ParametrosSeleccionEquipo): EquipoSemanal` que recibe jugadores activos, mapa de últimas cotizaciones, año, semana ISO, estrategiaId y estrategiaVersion; filtra jugadores donde `activo === false` o `cotizacion.sinEstadisticas === true`; agrupa por posición canónica; verifica cupos exactos (1 Portero, 4 Defensas, 3 Mediocampistas, 3 Delanteros) arrojando `ReglaDeNegocioException` con mensaje descriptivo en español si algún cupo no se alcanza; ordena cada grupo por `cotizacion.valor DESC`, `cotizacion.score DESC`, `jugador.nombre ASC` (locale-insensitive ASCII); toma los mejores de cada grupo y construye los `MiembroEquipoSemanal` con snapshot congelado
  - Método `validarInvariantes(): void` que verifica cantidades por posición, ausencia de duplicados por `jugadorId` y tipos válidos, arrojando `ReglaDeNegocioException` si falla
  - Getters públicos para todas las propiedades y para `miembros` como array readonly

### Interfaz del Repositorio

- [x] T007 Implementar `backend/src/domain/equipo-semanal.repository.interface.ts` exportando la interfaz `IEquipoSemanalRepository` con métodos: `guardarOSobrescribir(equipo: EquipoSemanal): Promise<void>`, `obtenerVigente(): Promise<EquipoSemanal | null>`, `obtenerPorSemana(ano: number, semanaIso: number): Promise<EquipoSemanal | null>`, `listarSemanasDisponibles(): Promise<{ ano: number; semanaIso: number; fechaGeneracion: Date }[]>`; y exportar el token de inyección `export const EQUIPO_SEMANAL_REPOSITORY = 'EQUIPO_SEMANAL_REPOSITORY'`

### Entidades ORM (TypeORM)

- [x] T008 [P] Crear `backend/src/persistence/typeorm/entities/equipo-semanal.orm-entity.ts` con decoradores `@Entity('equipos_semanales')`, columnas mapeadas con `@Column(...)` para `ano`, `semana_iso`, `formacion`, `estrategia_id`, `estrategia_version`, `fecha_generacion`, y relación `@OneToMany(() => MiembroEquipoSemanalOrmEntity, m => m.equipoSemanal, { cascade: true, eager: true })`
- [x] T009 [P] Crear `backend/src/persistence/typeorm/entities/miembro-equipo-semanal.orm-entity.ts` con decoradores `@Entity('miembros_equipos_semanales')`, columnas `jugador_id`, `nombre`, `equipo_nombre`, `posicion`, `cotizacion`, `score`, `orden`, relación `@ManyToOne(() => EquipoSemanalOrmEntity, e => e.miembros, { onDelete: 'CASCADE' })` y `@ManyToOne(() => JugadorOrmEntity)` (sin eager)

### Repositorio TypeORM Concreto

- [x] T010 Crear `backend/src/persistence/typeorm/repositories/equipo-semanal.typeorm-repository.ts` implementando `IEquipoSemanalRepository` usando `DataSource` con `getRepository(EquipoSemanalOrmEntity)`; implementar `guardarOSobrescribir` con lógica idempotente: dentro de una transacción, si existe un registro con `(ano, semana_iso)`, eliminar sus miembros y actualizar los campos del equipo antes de insertar los nuevos miembros; si no existe, insertar registro nuevo; implementar `obtenerVigente` con `ORDER BY fecha_generacion DESC LIMIT 1`; implementar `obtenerPorSemana` con `WHERE ano = :ano AND semana_iso = :semanaIso`; implementar `listarSemanasDisponibles` con `SELECT ano, semana_iso, fecha_generacion ORDER BY ano DESC, semana_iso DESC`; incluir mapeo bidireccional entre ORM entity y dominio en métodos privados `toDomain` y `toOrmEntity`

### Extensión de Caché Redis

- [x] T011 Extender `backend/src/services/marketplace-cache.service.ts` agregando tres nuevos métodos sin modificar ni los métodos existentes ni la construcción del cliente Redis:
  - `guardarEquipoSemanal(clave: string, datos: any, ttlSegundos: number = 1800): Promise<void>` usando prefijo `marketplace:team-of-the-week:` con el mismo patrón try/catch y `logger.warn` de degradación controlada existente
  - `obtenerEquipoSemanal<T>(clave: string): Promise<T | null>` con el mismo patrón de lectura y fallback a `null`
  - `invalidarEquipoSemanal(): Promise<void>` usando `keys('marketplace:team-of-the-week:*')` y `del(...)` con el mismo patrón de manejo de errores

### Tests Unitarios de Dominio

- [x] T012 [P] Crear `backend/test/unit/domain/equipo-semanal.entity.spec.ts` cubriendo al menos los siguientes escenarios sin base de datos ni servicios externos:
  - Happy path: `seleccionarOnceIdeal` con exactamente 11 candidatos elegibles (1 POR, 4+ DEF, 3+ MED, 3+ DEL) genera equipo con invariantes correctas
  - Desempate por `valor DESC` → `score DESC` → nombre `ASC`
  - Exclusión correcta de jugadores `activo === false`
  - Exclusión correcta de jugadores con `cotizacion.sinEstadisticas === true`
  - Edge case: cupo insuficiente en Porteros → `ReglaDeNegocioException` con mensaje en español
  - Edge case: cupo insuficiente en Defensas → `ReglaDeNegocioException`
  - Edge case: cupo insuficiente en Mediocampistas → `ReglaDeNegocioException`
  - Edge case: cupo insuficiente en Delanteros → `ReglaDeNegocioException`
  - Resultado determinista: misma entrada → misma alineación siempre
  - `validarInvariantes` arroja `ReglaDeNegocioException` si hay jugador duplicado
- [x] T013 [P] Crear `backend/test/unit/domain/miembro-equipo-semanal.entity.spec.ts` cubriendo:
  - Happy path: `crear(props)` con valores válidos genera instancia con getters correctos
  - Invariante: `cotizacion < 1.00` → `ReglaDeNegocioException`
  - Invariante: `score > 1.0` → `ReglaDeNegocioException`
  - Invariante: `nombre` vacío → `ReglaDeNegocioException`
  - Invariante: `equipoNombre` vacío → `ReglaDeNegocioException`

**Checkpoint**: Fase Foundational completa — todos los tests unitarios pasan, la migración aplica sin errores sobre una BD limpia y la caché tiene los tres métodos nuevos. Las historias de usuario pueden comenzar.

---

## Phase 3: US4 — Cálculo Semanal Automático del Once Ideal (Priority: P1)

**Goal**: Implementar el servicio de orquestación `EquipoSemanalService` y el scheduler semanal `TeamOfTheWeekSchedulerService` que generan y persisten el equipo de forma automática cada lunes y pueden ser invocados manualmente.

**Independent Test**: Ejecutar `EquipoSemanalService.generarEquipoSemanaActual()` sobre una BD de Testcontainers con jugadores activos con estadísticas → verifica que se persiste un `EquipoSemanal` con exactamente 11 miembros respetando la formación 4-3-3.

### Tests de Integración — US4

- [x] T014 Crear `backend/test/integration/equipo-semanal.service.spec.ts` con Testcontainers (reutilizar el helper `MarketplaceTestDatabaseHelper` o crear `TeamOfTheWeekTestDatabaseHelper` si corresponde) cubriendo:
  - Setup: jugadores activos con estadísticas en BD, cotizaciones calculadas (no `sinEstadisticas`)
  - Happy path: `generarEquipoSemanaActual()` devuelve equipo con 11 miembros en formación 4-3-3 y lo persiste
  - Idempotencia: segunda llamada para la misma semana sobrescribe el equipo sin duplicar registros
  - Exclusión: jugador inactivo no aparece en el once final
  - Cupo insuficiente: si no hay porteros elegibles → método arroja o retorna error descriptivo

### Implementación — US4

- [x] T015 Crear `backend/src/services/equipo-semanal.service.ts` con decorador `@Injectable()`, inyección de `IJugadorRepository` (token `I_JUGADOR_REPOSITORY`), `ICotizacionRepository` (token `COTIZACION_REPOSITORY`), `IConfiguracionMercadoRepository` (token `CONFIGURACION_MERCADO_REPOSITORY`), `IEquipoSemanalRepository` (token `EQUIPO_SEMANAL_REPOSITORY`), `MarketplaceCacheService` y `Logger`; implementar método público `generarEquipoSemanaActual(): Promise<EquipoSemanal>` que:
  1. Obtiene la configuración de estrategia activa con `configRepo.obtenerConfiguracion()`
  2. Obtiene jugadores activos con `jugadorRepo.listarActivos()`
  3. Obtiene las últimas cotizaciones con `cotizacionRepo.obtenerUltimasPorJugadores(jugadorIds)`
  4. Calcula año y semana ISO de la fecha actual (lunes)
  5. Delega la selección al dominio con `EquipoSemanal.seleccionarOnceIdeal({...})`
  6. Persiste con `equipoSemanalRepo.guardarOSobrescribir(equipo)`
  7. Invalida la caché con `cacheService.invalidarEquipoSemanal()`
  8. Retorna el agregado generado; método público `obtenerVigente(): Promise<EquipoSemanal | null>` con caché (TTL 1800 s, clave `'vigente'`); método `obtenerPorSemana(ano, semanaIso)` con caché (TTL 86400 s para semanas históricas, clave `'${ano}:${semanaIso}'`); método `listarSemanasDisponibles()` con caché (TTL 1800 s, clave `'semanas'`)
- [x] T016 Crear `backend/src/services/scheduler/team-of-the-week-scheduler.service.ts` con:
  - `@Injectable()` y `private readonly logger = new Logger(TeamOfTheWeekSchedulerService.name)`
  - `private static readonly ADVISORY_LOCK_ID = 20261102` (distinto del de `QuotesSchedulerService = 20261101`)
  - Decorador `@Cron(process.env.TEAM_OF_THE_WEEK_CRON || '0 1 * * 1')` (lunes 01:00 UTC por defecto, no modifica el cron existente de QuotesSchedulerService)
  - Método `ejecutarGeneracionSemanal()` que adquiere `pg_try_advisory_lock(20261102)` mediante `queryRunner`, si falla el lock emite `logger.warn` y retorna `{ ejecutado: false }`; si lo adquiere invoca `equipoSemanalService.generarEquipoSemanaActual()` y en `finally` libera el lock con `pg_advisory_unlock(20261102)` y llama `queryRunner.release()`
  - Manejo de errores con `logger.error` re-lanzando la excepción

**Checkpoint — US4**: El servicio y el scheduler están operativos. `generarEquipoSemanaActual()` puede invocarse con curl o Postman en modo local y persiste el equipo correctamente.

---

## Phase 4: US1 — Visualización del Equipo de la Semana en Cancha Táctica (Priority: P1)

**Goal**: Implementar los endpoints de consulta REST y la vista de cancha táctica en React con su cancha vertical 4-3-3, tarjetas de jugador, estados de carga/error/vacío, e integración con la barra de navegación.

**Independent Test**: Autenticarse como usuario común, navegar a `/team-of-the-week` y verificar que la cancha vertical renderiza correctamente los 11 jugadores con nombre, equipo y cotización en la formación 4-3-3.

### Tests de Integración Backend — US1

- [x] T017 Crear `backend/test/integration/team-of-the-week.controller.spec.ts` con Testcontainers cubriendo:
  - `GET /team-of-the-week` sin equipo generado → `404` con mensaje en español
  - `GET /team-of-the-week` con equipo generado → `200` con `EquipoSemanalRespuestaDto` completo (11 miembros, formación 4-3-3)
  - `GET /team-of-the-week` sin autenticación → `401`
  - `GET /team-of-the-week/weeks` con 0 semanas → `200` con array vacío
  - `GET /team-of-the-week/weeks` con N semanas → `200` con array ordenado `ano DESC, semana_iso DESC`
  - `GET /team-of-the-week/weeks/:year/:week` con semana existente → `200` con snapshot correcto
  - `GET /team-of-the-week/weeks/:year/:week` con semana inexistente → `404`
  - `GET /team-of-the-week/weeks/:year/:week` con year no entero → `400`

### DTOs Backend — US1

- [x] T018 [P] Crear `backend/src/controllers/dto/equipo-semanal-respuesta.dto.ts` exportando `MiembroEquipoSemanalDto` con propiedades `@ApiProperty` decoradas: `jugadorId: string`, `nombre: string`, `equipoNombre: string`, `posicion: 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero'`, `cotizacion: number`, `score: number`, `orden: number`; y `EquipoSemanalRespuestaDto` con `id: string`, `ano: number`, `semanaIso: number`, `formacion: string`, `estrategiaId: string`, `estrategiaVersion: string`, `fechaGeneracion: string`, `miembros: MiembroEquipoSemanalDto[]`
- [x] T019 [P] Crear `backend/src/controllers/dto/semana-disponible.dto.ts` exportando `SemanaDisponibleDto` con `@ApiProperty` en `ano: number`, `semanaIso: number`, `fechaGeneracion: string`
- [x] T020 [P] Crear `backend/src/controllers/dto/resumen-generacion-equipo.dto.ts` exportando `ResumenGeneracionEquipoDto` con `mensaje: string` y `equipo: EquipoSemanalRespuestaDto`

### Controller Backend — US1 (GET endpoints)

- [x] T021 Crear `backend/src/controllers/team-of-the-week.controller.ts` con:
  - `@ApiTags('Equipo de la Semana')`, `@Controller('team-of-the-week')`
  - `@Get()` → `obtenerEquipoVigente()`: protegido con `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`, delega a `equipoSemanalService.obtenerVigente()`; si retorna `null` arroja `NotFoundException` con mensaje `'No se ha generado ningún Equipo de la Semana todavía.'`; en caso exitoso mapea a `EquipoSemanalRespuestaDto`; documenta `@ApiResponse` para 200, 401, 404
  - `@Get('weeks')` → `listarSemanasDisponibles()`: protegido con `@UseGuards(JwtAuthGuard)`, retorna array de `SemanaDisponibleDto`; documenta 200, 401
  - `@Get('weeks/:year/:week')` → `obtenerEquipoPorSemana(@Param('year', ParseIntPipe) ano, @Param('week', ParseIntPipe) semanaIso)`: protegido con `@UseGuards(JwtAuthGuard)`, delega al service; si retorna `null` arroja `NotFoundException`; documenta 200, 400, 401, 404
  - Incluir método privado `mapearADto(equipo: EquipoSemanal): EquipoSemanalRespuestaDto` que mapea el dominio al DTO

### Registro del Módulo Backend — US1

- [x] T022 Actualizar `backend/src/app.module.ts` (o el módulo principal correspondiente) para:
  - Importar y registrar `EquipoSemanalOrmEntity` y `MiembroEquipoSemanalOrmEntity` en `TypeOrmModule.forFeature([...])`
  - Proveer `{ provide: EQUIPO_SEMANAL_REPOSITORY, useClass: EquipoSemanalTypeOrmRepository }`
  - Proveer `EquipoSemanalService` y `TeamOfTheWeekSchedulerService`
  - Importar y registrar `TeamOfTheWeekController` en los controllers del módulo

### Frontend — API Client US1

- [x] T023 [P] Crear `frontend/src/api/teamOfTheWeekApi.ts` exportando las funciones:
  - `obtenerEquipoVigente(signal?: AbortSignal): Promise<EquipoSemanalUI | null>` que hace `GET /team-of-the-week` usando `http-client.ts`; si el status es 404 retorna `null`; re-lanza otros errores
  - `obtenerSemanasDisponibles(signal?: AbortSignal): Promise<SemanaDisponibleUI[]>` que hace `GET /team-of-the-week/weeks`
  - `obtenerEquipoPorSemana(ano: number, semanaIso: number, signal?: AbortSignal): Promise<EquipoSemanalUI>` que hace `GET /team-of-the-week/weeks/${ano}/${semanaIso}`
  - `generarEquipoManual(signal?: AbortSignal): Promise<ResumenGeneracionEquipoUI>` que hace `POST /team-of-the-week/generate` con token de autorización

### Frontend — Tipos UI US1

- [x] T024 [P] Crear `frontend/src/types/team-of-the-week.types.ts` exportando: `PosicionTactica = 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero'`, `MiembroEquipoSemanalUI`, `EquipoSemanalUI`, `SemanaDisponibleUI`, `ResumenGeneracionEquipoUI` con las mismas propiedades definidas en `contracts/frontend-team-of-the-week.contract.ts`

### Frontend — Hook US1

- [x] T025 Crear `frontend/src/hooks/useTeamOfTheWeek.ts` exportando el hook `useTeamOfTheWeek()` con estados internos: `equipo: EquipoSemanalUI | null`, `semanasDisponibles: SemanaDisponibleUI[]`, `semanaSeleccionada: { ano; semanaIso } | null`, `cargando: boolean`, `error: string | null`; `jugadorModalId: string | null`; en `useEffect` inicial carga en paralelo `obtenerEquipoVigente` y `obtenerSemanasDisponibles` usando `AbortController`; función `seleccionarSemana(ano, semanaIso)` que llama `obtenerEquipoPorSemana` y actualiza el estado; función `recargar()` que repite la carga inicial; funciones `abrirModalJugador(id)` y `cerrarModalJugador()`; manejo de cancelación de requests al desmontar con `controller.abort()`; manejo de error seteando `error` en español

### Frontend — Componentes de Cancha US1

- [x] T026 [P] Crear `frontend/src/components/team-of-the-week/PitchPlayerCard.tsx` como componente funcional que recibe props `{ miembro: MiembroEquipoSemanalUI; onClick: (jugadorId: string) => void }` y renderiza: nombre del jugador, nombre del equipo y cotización formateada en créditos; aplicar cursor pointer y al hacer clic invocar `onClick(miembro.jugadorId)`; usar clases CSS con tokens de `styles/tokens.css` (`--bg-card`, `--text-primary`, `--color-emerald-400`, `--border-subtle`)
- [x] T027 Crear `frontend/src/components/team-of-the-week/SoccerPitch.tsx` como componente funcional que recibe props `{ equipo: EquipoSemanalUI; onSeleccionarJugador: (id: string) => void }` y renderiza:
  - Un contenedor vertical responsivo con la imagen de fondo de la cancha (verde sólido CSS sin imagen, usando `--color-emerald-900` o similar) con relación de aspecto 3:4 que se adapta a `width: 100%` en móvil y `max-width: 480px` en desktop
  - 4 filas tácticas como `div` con `display: flex; justify-content: space-evenly; align-items: center`: fila superior (3 Delanteros), fila media (3 Mediocampistas), fila baja (4 Defensas), fila base (1 Portero)
  - Cada posición renderiza un `PitchPlayerCard` filtrado por `posicion` y ordenado por `orden`
  - Aplicar CSS que garantice que en resolución ≥ 360px no haya desborde horizontal (overflow-x hidden)

### Frontend — Vista Principal US1

- [x] T028 Crear `frontend/src/views/TeamOfTheWeekView.tsx` como componente funcional que:
  - Usa el hook `useTeamOfTheWeek()`
  - Renderiza un `<AppLayout>` con `navbarProps` construidos con `construirItemsNavegacion(usuario?.rol)` y `onLogout`
  - Estado cargando: muestra un spinner o skeleton con texto `"Cargando Equipo de la Semana..."`
  - Estado error: muestra mensaje de error en español y botón `"Reintentar"` que llama a `recargar()`
  - Estado vacío (`equipo === null` y no cargando y no error): muestra mensaje `"Aún no hay ningún Equipo de la Semana disponible"`
  - Estado con datos: muestra `<WeekSelector>` (a implementar en US2) y `<SoccerPitch equipo={equipo} onSeleccionarJugador={abrirModalJugador} />`
  - Al final del árbol renderiza `<PlayerDetailModal playerId={jugadorModalId} onClose={cerrarModalJugador} onMarketMutation={() => {}} />` (reutilizando el componente existente sin modificarlo)

### Frontend — Ruta y Navegación US1

- [x] T029 Agregar en `frontend/src/routes/AppRoutes.tsx` la ruta `<Route path="/team-of-the-week" element={<ProtectedRoute><TeamOfTheWeekView /></ProtectedRoute>} />` antes del catch-all `*` (importar `TeamOfTheWeekView` en el tope del archivo; no modificar ninguna ruta existente)
- [x] T030 Agregar en `frontend/src/utils/navegacion.ts` el item `{ label: 'Equipo de la Semana', to: '/team-of-the-week', id: 'nav-team-of-the-week' }` al array `items` dentro de `construirItemsNavegacion`, entre el item de "Portfolio" y la verificación de rol `ADMIN` (no modificar ni reubicar ningún item existente)

### Tests Frontend — US1

- [x] T031 [P] Crear `frontend/tests/unit/api/teamOfTheWeekApi.test.ts` con Vitest usando dobles de red (`vi.mock` de `http-client.ts`) cubriendo: respuesta 200 → `EquipoSemanalUI` deserializado correctamente; respuesta 404 en `obtenerEquipoVigente` → retorna `null`; cancelación de request con `AbortSignal` → no actualiza estado; error de red → lanza error
- [x] T032 [P] Crear `frontend/tests/unit/hooks/useTeamOfTheWeek.test.ts` con Vitest + `renderHook` cubriendo: carga inicial correcta (estado `cargando` → datos cargados); `seleccionarSemana` actualiza el equipo mostrado; `recargar` re-ejecuta la carga; `abrirModalJugador` / `cerrarModalJugador` gestionan el estado del modal
- [x] T033 [P] Crear `frontend/tests/unit/components/SoccerPitch.test.tsx` con Vitest + React Testing Library cubriendo: renderiza exactamente 1 Portero en fila inferior, 4 Defensas, 3 Mediocampistas y 3 Delanteros; cada tarjeta muestra nombre, equipo y cotización; al hacer clic en una tarjeta se invoca `onSeleccionarJugador` con el `jugadorId` correcto

**Checkpoint — US1**: El usuario autenticado puede navegar a `/team-of-the-week` y ver la cancha táctica con los 11 jugadores en formación 4-3-3.

---

## Phase 5: US2 — Navegación y Consulta del Histórico de Semanas (Priority: P1)

**Goal**: Implementar el selector de semanas históricas que permite al usuario elegir cualquier semana pasada y ver el snapshot inmutable de ese equipo.

**Independent Test**: Con al menos dos semanas generadas en la BD, seleccionar una semana anterior en el desplegable y verificar que la cancha se actualiza con los jugadores y cotizaciones congeladas históricas.

### Componente WeekSelector — US2

- [x] T034 Crear `frontend/src/components/team-of-the-week/WeekSelector.tsx` como componente funcional que recibe props `{ semanas: SemanaDisponibleUI[]; semanaActual: { ano: number; semanaIso: number } | null; onSeleccionar: (ano: number, semanaIso: number) => void }` y renderiza:
  - Un `<select>` nativo o componente controlado que lista las semanas con etiqueta formateada: `"Semana ${semanaIso}, ${ano}"` e indicador de fecha de generación formateada
  - El valor seleccionado por defecto coincide con `semanaActual` (la más reciente)
  - Al cambiar el `select`, invoca `onSeleccionar(ano, semanaIso)` parseando los valores del event
  - Si `semanas` está vacía renderiza sin opciones (vacío manejado por el padre)
  - Usar clases CSS coherentes con el design system de la app

### Integración del WeekSelector en la Vista — US2

- [x] T035 Integrar `<WeekSelector>` en `frontend/src/views/TeamOfTheWeekView.tsx`: pasar `semanas={semanasDisponibles}`, `semanaActual={semanaSeleccionada}`, `onSeleccionar={seleccionarSemana}`; añadir estado de carga parcial para cuando se está cambiando de semana sin afectar el skeleton inicial

### Tests Frontend — US2

- [x] T036 [P] Crear `frontend/tests/unit/components/WeekSelector.test.tsx` cubriendo: renderiza las opciones de semana con formato `"Semana N, YYYY"`; al seleccionar una opción distinta invoca `onSeleccionar` con el año y semana correctos; si la lista está vacía no renderiza opciones
- [x] T037 [P] Crear `frontend/tests/unit/views/TeamOfTheWeekView.test.tsx` con Vitest + React Testing Library cubriendo: estado vacío muestra mensaje en español; estado cargando muestra spinner; estado con datos renderiza `SoccerPitch` y `WeekSelector`; estado error muestra botón "Reintentar"

**Checkpoint — US2**: El usuario puede navegar entre semanas y la cancha muestra el snapshot histórico correcto.

---

## Phase 6: US3 — Interacción con Jugador y Acceso a Ficha / Marketplace (Priority: P2)

**Goal**: Al hacer clic en cualquier jugador de la cancha se abre el modal de detalle preexistente `PlayerDetailModal` mostrando su ficha y opciones de marketplace; al cerrarlo la vista vuelve al estado previo.

**Independent Test**: Hacer clic en el nodo de un Delantero en la cancha, verificar que se abre `PlayerDetailModal` con el `playerId` correspondiente y que al cerrarlo la cancha persiste en el estado anterior.

> **Nota**: La integración con `PlayerDetailModal` fue parcialmente incluida en T028. Esta fase valida y completa la cobertura de tests para esa interacción.

### Tests Frontend — US3

- [x] T038 [P] Extender `frontend/tests/unit/views/TeamOfTheWeekView.test.tsx` agregando escenarios para US3 (no modificar los tests existentes, agregar `describe` anidado):
  - Al hacer clic en `PitchPlayerCard` se llama a `abrirModalJugador` con el ID correcto
  - `PlayerDetailModal` recibe `playerId !== null` cuando un jugador está seleccionado
  - Al invocar `onClose` del modal el `jugadorModalId` vuelve a `null`
- [x] T039 [P] Crear `frontend/tests/unit/components/PitchPlayerCard.test.tsx` cubriendo:
  - Renderiza nombre, equipo y cotización con el formato correcto
  - Al hacer clic invoca `onClick(jugadorId)` del prop
  - El elemento tiene `role="button"` o similar accesible y cursor pointer

**Checkpoint — US3**: La cancha táctica actúa como entrada directa al marketplace: un clic en cualquier jugador abre su detalle sin salir de la vista.

---

## Phase 7: US5 — Disparo Manual Administrativo (Priority: P2)

**Goal**: Permitir al administrador generar o regenerar el Equipo de la Semana en curso mediante un endpoint `POST /team-of-the-week/generate` protegido con `ADMIN`, con feedback claro de éxito o error en la interfaz.

**Independent Test**: Enviar `POST /team-of-the-week/generate` con token de usuario común → `403`. Enviar el mismo request con token `ADMIN` → `200` con el equipo generado. Si ya existía equipo para la semana → lo sobrescribe. Si faltan jugadores elegibles → `409`.

### Test de Integración Backend — US5

- [x] T040 Ampliar `backend/test/integration/team-of-the-week.controller.spec.ts` con escenarios de US5 (agregar `describe` anidado sin tocar los tests de US1):
  - `POST /team-of-the-week/generate` sin autenticación → `401`
  - `POST /team-of-the-week/generate` con usuario `USUARIO` → `403`
  - `POST /team-of-the-week/generate` con usuario `ADMIN` y jugadores elegibles → `200` con `ResumenGeneracionEquipoDto`
  - Segunda ejecución `POST /team-of-the-week/generate` en la misma semana → `200` (idempotencia, sobrescribe)
  - `POST /team-of-the-week/generate` con cupo insuficiente → `409` con mensaje descriptivo en español

### Controller Backend — US5 (POST endpoint)

- [x] T041 Agregar en `backend/src/controllers/team-of-the-week.controller.ts` el método `POST`:
  - `@Post('generate')` → `generarManualmente(@Req() req)`: protegido con `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('ADMIN')`, `@ApiBearerAuth()`; invoca `equipoSemanalService.generarEquipoSemanaActual()`; en caso de éxito retorna `ResumenGeneracionEquipoDto` con `{ mensaje: 'Equipo de la Semana generado exitosamente.', equipo: mapearADto(resultado) }`; en caso de `ReglaDeNegocioException` deja que el filtro de excepciones existente lo maneje como `409 Conflict`; documentar `@ApiResponse` para 200, 401, 403, 409

### Frontend — Botón Administrativo US5

- [x] T042 Agregar en `frontend/src/views/TeamOfTheWeekView.tsx` el bloque condicional para administradores: si `esAdmin === true`, renderizar un botón `"Generar Equipo de la Semana Actual"` que invoca `dispararGeneracionManual()` del hook; mostrar spinner dentro del botón mientras `generandoManual === true`; mostrar `mensajeAdmin` (éxito en verde o error en rojo) debajo del botón por 5 segundos tras la respuesta; no modificar la lógica de renderizado de la cancha
- [x] T043 Ampliar `frontend/src/hooks/useTeamOfTheWeek.ts` con:
  - Estado `generandoManual: boolean` iniciado en `false`
  - Estado `mensajeAdmin: string | null` iniciado en `null`
  - Función `dispararGeneracionManual()` que setea `generandoManual = true`, llama `generarEquipoManual()` de `teamOfTheWeekApi`, en éxito actualiza el equipo con el resultado, setea el mensaje de éxito y resetea a `null` tras 5 s; en error setea mensaje de error en español; siempre setea `generandoManual = false` al finalizar

### Tests Frontend — US5

- [x] T044 [P] Extender `frontend/tests/unit/hooks/useTeamOfTheWeek.test.ts` agregando escenarios para US5 (no tocar los tests existentes de US1/US2): `dispararGeneracionManual` en éxito actualiza `equipo` y `mensajeAdmin`; `dispararGeneracionManual` ante error de red setea `mensajeAdmin` con texto descriptivo

**Checkpoint — US5**: El administrador puede refrescar el equipo de la semana desde la UI ante contingencias operativas.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Propósito**: Documentación, Postman, verificación de contrato OpenAPI, cobertura y validación end-to-end.

- [x] T045 Actualizar `postman/collection.json` agregando la carpeta `"7. Equipo de la Semana"` con las siguientes requests (sin modificar ninguna carpeta existente):
  - `GET {{base_url}}/team-of-the-week` con token `trader1_token`; script de test: verifica status 200 o 404; si 200 verifica que `miembros.length === 11` y que la propiedad `formacion` sea `"4-3-3"`
  - `GET {{base_url}}/team-of-the-week` sin Authorization header; script: verifica status 401
  - `GET {{base_url}}/team-of-the-week/weeks` con token; script: verifica status 200 y que la respuesta sea un array
  - `GET {{base_url}}/team-of-the-week/weeks/2026/44` con token; script: verifica status 200 o 404
  - `POST {{base_url}}/team-of-the-week/generate` con `admin_token`; script: verifica status 200 y que `equipo.miembros.length === 11`; guarda `pm.collectionVariables.set('team_of_the_week_ano', ...)` y `semana_iso`
  - `POST {{base_url}}/team-of-the-week/generate` con `trader1_token`; script: verifica status 403
- [x] T046 Verificar que los decoradores `@ApiResponse`, `@ApiOperation` y `@ApiBearerAuth` en `TeamOfTheWeekController` coincidan exactamente con el contrato `contracts/openapi-team-of-the-week.yaml`; documentar el resultado de la verificación en un comentario en `quickstart.md` bajo la sección "5. Colección de Postman": `"Verificación Swagger OK — contratos sincronizados: [fecha]"`
- [x] T047 Ejecutar `npm run test:cov` en `backend/` y verificar que el nuevo código de `equipo-semanal.entity.ts`, `miembro-equipo-semanal.entity.ts`, `equipo-semanal.service.ts` y `team-of-the-week.controller.ts` alcanza ≥ 80% de cobertura en líneas y branches; si hay branches no cubiertos, agregar los casos de test necesarios en los archivos de test existentes de esta feature (no tocar tests de otras features)
- [x] T048 [P] Ejecutar `npm run test:cov` en `frontend/` y verificar que `teamOfTheWeekApi.ts`, `useTeamOfTheWeek.ts`, `SoccerPitch.tsx` y `TeamOfTheWeekView.tsx` alcanzan ≥ 80% de cobertura en líneas y branches; agregar escenarios faltantes en los tests de esta feature si corresponde
- [x] T049 Ejecutar el escenario de validación punta a punta descrito en `quickstart.md` (Escenarios 1 a 5) en entorno local con Docker Compose levantado; documentar el resultado de cada escenario en `quickstart.md` bajo una nueva sección `## Evidencia de Validación` con fecha y resultado (OK / FALLO)

---

## Dependencies & Execution Order

### Dependencias entre Fases

- **Phase 1 (Setup)**: Sin dependencias → puede comenzar inmediatamente.
- **Phase 2 (Foundational)**: Depende de Phase 1 — **bloquea todas las historias de usuario**.
- **Phase 3 (US4)**: Depende de Phase 2 — bloquea las fases 4–7 (sin datos generados no hay nada que mostrar).
- **Phase 4 (US1)**: Depende de Phase 3.
- **Phase 5 (US2)**: Depende de Phase 4 (reutiliza `WeekSelector` y la vista).
- **Phase 6 (US3)**: Depende de Phase 4 (el modal ya está integrado en T028).
- **Phase 7 (US5)**: Depende de Phase 3 (el endpoint POST llama al mismo service).
- **Phase 8 (Polish)**: Depende de la completitud de las fases 4–7.

### Dependencias de Historias de Usuario

- **US4 (P1) — Cálculo Semanal**: Prerrequisito de US1, US2, US3 y US5.
- **US1 (P1) — Visualización**: Prerrequisito de US2 (comparten vista) y US3 (interacción en cancha).
- **US2 (P1) — Histórico**: Depende de US1.
- **US3 (P2) — Modal Jugador**: Depende de US1.
- **US5 (P2) — Admin Manual**: Depende de US4 (mismo service).

### Oportunidades de Paralelismo

- T004 y T005 pueden comenzar en paralelo (migración e entidades de dominio no se bloquean).
- T008 y T009 (ORM entities) pueden ejecutarse en paralelo entre sí.
- T018, T019, T020 (DTOs) pueden ejecutarse en paralelo.
- T023, T024 (API client y tipos frontend) pueden ejecutarse en paralelo.
- T026, T027, T031, T032, T033 pueden ejecutarse en paralelo (componentes y tests frontend).
- T036 y T037 pueden ejecutarse en paralelo.
- T039 y T044 pueden ejecutarse en paralelo.
- T047 y T048 pueden ejecutarse en paralelo.

---

## Parallel Example: Phase 4 (US1)

```bash
# Backend — en paralelo tras completar Phase 3:
Task T018: Crear equipo-semanal-respuesta.dto.ts
Task T019: Crear semana-disponible.dto.ts
Task T020: Crear resumen-generacion-equipo.dto.ts

# Frontend — en paralelo tras completar T024:
Task T023: teamOfTheWeekApi.ts
Task T026: PitchPlayerCard.tsx
Task T031: teamOfTheWeekApi.test.ts
Task T032: useTeamOfTheWeek.test.ts
Task T033: SoccerPitch.test.tsx
```

---

## Implementation Strategy

### MVP First (US4 + US1 — Cancha Táctica Funcional)

1. Completar **Phase 1** (Setup).
2. Completar **Phase 2** (Foundational — Dominio, Migración, Repositorio, Caché).
3. Completar **Phase 3** (US4 — Servicio de generación y scheduler).
4. Completar **Phase 4** (US1 — Endpoints GET + Vista React con cancha).
5. **STOP & VALIDAR**: El equipo visible en la cancha es el MVP entregable.
6. Desplegar / demostrar.

### Incremental Delivery

1. MVP (US4 + US1) → Vista de cancha táctica funcional.
2. Agregar US2 (Selector de semanas históricas) → Transparencia histórica.
3. Agregar US3 (Click en jugador → Modal) → Integración con marketplace.
4. Agregar US5 (Admin manual generate) → Operabilidad de contingencia.
5. Phase 8 (Polish) → Postman, cobertura y validación E2E.

---

## Notes

- `[P]` = archivos distintos, sin dependencias incompletas → pueden ejecutarse en paralelo.
- `[USn]` = tarea pertenece a la historia de usuario n para trazabilidad.
- **Ningún test existente puede ser modificado o eliminado** (Constitución Principio IV, NON-NEGOTIABLE). Nuevos `describe` anidados en archivos de test de esta feature son la única extensión permitida.
- El `ADVISORY_LOCK_ID = 20261102` es distinto al `20261101` del `QuotesSchedulerService` para evitar colisiones de lock distribuido.
- El cron de `QuotesSchedulerService` (`'0 0 * * 0'`) **no se modifica**. El nuevo scheduler corre los **lunes 01:00 UTC** (`'0 1 * * 1'`).
- Las tablas `equipos_semanales` y `miembros_equipos_semanales` usan `CREATE TABLE IF NOT EXISTS` para garantizar idempotencia en la migración.
- Los identificadores de dominio se escriben en español sin acentos ni ñ (`ano`, `semanaIso`, `cotizacion`, `equipoNombre`, `posicion`, `fechaGeneracion`) conforme a la Constitución Principio V.

