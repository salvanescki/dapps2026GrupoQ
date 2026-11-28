# Research & Architectural Decisions: Auditoría de Web-Services y Eventos Críticos de Negocio

**Feature**: `019-backend-audit-logging` | **Date**: 2026-11-28 | **Branch**: `019-backend-audit-logging` (`feature/logger`)

Este documento consolida la investigación técnica de Fase 0, el análisis de viabilidad sobre la infraestructura productiva actual (capa gratuita) y las decisiones arquitectónicas que resuelven todas las incógnitas del contexto técnico antes del diseño detallado de Fase 1.

---

## 1. Compatibilidad de Dependencias (`nestjs-pino`, `pino`, `pino-http`, `pino-pretty`)

### Decision
Instalar en `backend/package.json`:
- **Dependencies**: `nestjs-pino@^4.6.1`, `pino@^9.14.0`, `pino-http@^10.5.0`
- **DevDependencies**: `pino-pretty@^13.2.0` (cargado exclusivamente en `NODE_ENV=development` cuando `LOG_PRETTY !== 'false'`).

### Rationale
- El proyecto utiliza `@nestjs/common@^11.2.5` y `@nestjs/core@^11.2.5`, pero tanto el pipeline de CI (`.github/workflows/ci.yml`) como el workflow programado del scraper (`.github/workflows/whoscored-scraper.yml`) y `@types/node` (`^20.11.24`) operan sobre **Node.js 20**.
- `nestjs-pino@5.3.2` exige `engines.node >= 22.12.0`, lo que provocaría incompatibilidades en CI y en Render si el runtime es Node 20.
- En cambio, `nestjs-pino@4.6.1` declara `engines.node >= 14` y `peerDependencies`: `@nestjs/common: ^8 || ^9 || ^10 || ^11`, `pino: ^7.5 || ^8 || ^9 || ^10`, `pino-http: ^6.4 || ^7 || ^8 || ^9 || ^10 || ^11`, `rxjs: ^7.1`. Funciona de forma nativa tanto en Node 20 (CI / GitHub Actions / Render) como en Node 24 (entorno local).
- Pino serializa JSON de forma extremadamente rápida (~10x más veloz que alternativas como Winston) y con mínima presión sobre el recolector de basura (GC), crucial para cumplir **SC-004** (< 5 ms de overhead promedio) dentro de los 512 MB RAM de Render plan gratuito.

### Alternatives Considered
- **`nestjs-pino@5.x` + `pino@10` + `pino-http@11`**: Descartado por requerir Node `>= 22.12.0` mientras CI y GitHub Actions están fijados en Node 20.
- **`winston` / `nest-winston`**: Descartado porque la especificación solicita explícitamente `nestjs-pino` y porque Winston introduce mayor overhead de CPU/RAM en la serialización JSON por solicitud.
- **Interceptor puro de NestJS con `Logger` nativo**: Descartado porque el logger nativo de NestJS no emite JSON estructurado nativo, no incluye `pino-http` ni propagación basada en `AsyncLocalStorage`, y un interceptor por sí solo no captura errores previos al ciclo de NestJS (404 de rutas inexistentes, 400 de `body-parser`, 401/403 en `Guards`).

---

## 2. Viabilidad en Infraestructura Productiva (Capa Gratuita)

### Decision
Emitir el **100% de los registros de auditoría (HTTP y negocio) en formato JSON NDJSON hacia `stdout`** sin archivos locales en disco, sin `pino-pretty` en producción, sin nuevas tablas de auditoría en PostgreSQL, y filtrando sondas técnicas de monitoreo y alertas por ausencia de Redis.

### Rationale
Análisis verificado contra la infraestructura productiva real del proyecto:
1. **API en Render (Plan Gratuito) + UptimeRobot**:
   - Recursos limitados (~512 MB RAM, CPU compartida, disco efímero que se descarta en cada redeploy/reinicio).
   - Escribir logs en disco local (rotación de archivos) no es viable: se pierden al reiniciar, consumen I/O y riesgo de llenar disco efímero.
   - Ejecutar `pino-pretty` como worker thread en producción consume memoria adicional (~30–50 MB) y CPU innecesaria. En producción se emite JSON crudo directo a `stdout`, que Render captura automáticamente en su consola de logs.
   - UptimeRobot consulta `/health/live` o `/health/ready` cada ~5 minutos (~8.640 requests/mes) y Prometheus consulta `/metrics`. Excluir `/health/*`, `/metrics` y `/api/docs*` de la auditoría estándar (habilitables solo bajo `LOG_LEVEL=debug`) reduce en >90% el ruido técnico (**FR-002**, **SC-005**).
2. **PostgreSQL en Supabase (Plan Gratuito)**:
   - Límite de 500 MB de almacenamiento y pool de conexiones reducido.
   - Persistir trazas HTTP en una tabla `audit_logs` agotaría rápidamente la cuota y generaría contención de escritura en cada request.
   - Las tablas transaccionales ya existentes (`transacciones`, `ordenes`, `cotizaciones`, `equipos_semanales`, `ejecuciones_scraping`) actúan como respaldo histórico persistente del dominio (**FR-008**). No se requieren migraciones TypeORM.
3. **Proxies Webshare.io (Scraper)**:
   - Las variables `SCRAPING_PROXY_URL`, `SCRAPING_PROXY_USERNAME` y `SCRAPING_PROXY_PASSWORD` contienen credenciales reales (tanto en formato `http://user:pass@host:port` como separadas).
   - Se implementa sanitización en doble capa (redacción nativa de Pino + sanitizador recursivo con regex de credenciales embebidas en URLs y errores) para garantizar 0% de fugas (**FR-003**, **FR-007**, **SC-003**).
4. **Frontend en Vercel (Plan Gratuito)**:
   - No requiere cambios obligatorios. El backend acepta `x-request-id` entrante si existe o genera un UUID v4 nuevo y lo devuelve en el encabezado de respuesta `x-request-id` para correlación futura end-to-end.
5. **Caché Redis (Local en Docker, no hosteado en Producción)**:
   - En el repositorio actual, `docker-compose.yml` provee Redis solo localmente (`127.0.0.1:6379`). En producción no está provisionado y `BaseRedisCacheService` emitía un `WARN` en cada lectura, escritura o invalidación fallida.
   - Siguiendo **FR-010**, cuando `NODE_ENV === 'production'` y no existen `REDIS_URL` ni `REDIS_HOST` (o cuando `REDIS_ENABLED === 'false'`), Redis se considera deshabilitado: `BaseRedisCacheService` asigna `redisClient = null` directamente (sin abrir sockets ni emitir advertencias) preservando la degradación controlada hacia PostgreSQL.

### Alternatives Considered
- **Persistir eventos de auditoría en PostgreSQL (Supabase)**: Descartado por riesgo de agotar la cuota de 500 MB y añadir latencia/contención de pool.
- **Rotación de archivos locales (`pino-roll`)**: Descartado por filesystem efímero en Render.
- **Log Drain / SaaS externo (Axiom / Better Stack / Datadog)**: No requerido en este alcance; la salida JSON estandarizada a `stdout` deja el sistema listo para conectar cualquier colector externo en el futuro sin cambiar código.

---

## 3. Estrategia de Logger Global Unificado y Gestión de Logs Preexistentes

### Decision
Configurar `LoggerModule.forRootAsync(...)` de `nestjs-pino` dentro de `ObservabilityModule` (módulo `@Global()`) y registrarlo como logger global de NestJS mediante `app.useLogger(app.get(Logger))` en `backend/src/main.ts` (con `bufferLogs: true`), así como de forma segura en `backend/src/run-scraper.ts` y `backend/src/run-sync-players.ts`. Reemplazar los dos `console.log` de `main.ts` por `logger.log(...)`.

### Rationale
- Actualmente existen ~16 servicios con `private readonly logger = new Logger(ServiceName.name)` de `@nestjs/common`.
- Al registrar el `Logger` de `nestjs-pino` con `app.useLogger(...)`, **todas** las llamadas existentes a `this.logger.log/warn/error` de `@nestjs/common` se enrutan automáticamente a Pino en formato JSON homogéneo (con `timestamp` ISO-8601 y `context` del servicio), sin refactorizar manualmente los 16 servicios ni alterar sus constructores o contratos de prueba (**FR-009**, **FR-012**).
- En `run-scraper.ts` y `run-sync-players.ts`, los tests unitarios existentes (`run-scraper.spec.ts` y `run-sync-players.spec.ts`) mockean `app` solo con `get` y `close`. Por ello, el acoplamiento en esos entrypoints se resguarda verificando `if (typeof app.useLogger === 'function')` y `app.get(Logger, { strict: false })`, garantizando 100% de retrocompatibilidad sin tocar tests existentes (Constitución Principio IV).

### Alternatives Considered
- **Refactorizar todos los servicios para inyectar `@InjectPinoLogger`**: Descartado porque rompería constructores instanciados manualmente en decenas de tests unitarios e incumpliría FR-009 ("sin refactorizar manualmente los servicios ni alterar contratos de pruebas existentes").
- **Mantener ambos loggers separados (NestJS default + Pino solo para HTTP)**: Descartado porque mezclaría texto plano con JSON en `stdout`, dificultando el parseo y búsqueda de incidentes en producción.

---

## 4. Arquitectura Orientada a Aspectos (AOP) para Reutilización del Logger

### Decision
Implementar la auditoría como una **capa transversal basada en Aspect-Oriented Programming (AOP)** con dos mecanismos idiomáticos y complementarios en NestJS/TypeScript, centralizando toda la lógica de medición de tiempo, correlación, sanitización, clasificación de severidad y resiliencia fail-safe para evitar duplicación de código:

1. **Aspecto HTTP (`AuditLoggingInterceptor` — NestJS `NestInterceptor`, *Around Advice*)**:
   - Registrado globalmente mediante `APP_INTERCEPTOR` en `ObservabilityModule` (el patrón AOP oficial de NestJS).
   - **Pointcut**: todas las invocaciones a handlers HTTP de Controllers en rutas funcionales (excluyendo `/health/*`, `/metrics`, `/api/docs*`).
   - **Around Advice**:
     - *Before*: registra tiempo de inicio (`performance.now()`), resuelve `requestId` desde `AuditContextService` (`AsyncLocalStorage`), captura el nombre de operación (`Controller.metodo`) y parámetros sanitizados (`req.params`, `req.query`, `req.body`).
     - *After Returning (`tap`)*: calcula `tiempoEjecucion`, resuelve `usuario` (autenticado o `ANONIMO`) y `codigoEstado`, emite exactamente 1 registro `HTTP_AUDIT` vía `AuditLoggerService` y marca `req.__httpAuditLogged = true`.
     - *After Throwing (`catchError`)*: calcula `tiempoEjecucion`, determina `codigoEstado` y resumen sanitizado del error, emite el registro `HTTP_AUDIT` con severidad `warn` (4xx) o `error` (5xx), marca `req.__httpAuditLogged = true` y re-lanza la excepción intacta hacia `HttpExceptionFilter`.
   - **Red de seguridad para errores pre-Interceptor (`pino-http` fallback)**:
     - Solicitudes que fallan antes de entrar al ciclo de Interceptors (401 en `JwtAuthGuard`, 403 en `RolesGuard`, 404 ruta inexistente, 400 de `body-parser`) no pasan por `AuditLoggingInterceptor`.
     - `pino-http` verifica `if (req.__httpAuditLogged) return true` dentro de `autoLogging.ignore` (o nivel `silent`), emitiendo `HTTP_AUDIT` **únicamente** cuando el interceptor AOP no se ejecutó. Esto garantiza **exactamente 1 registro `HTTP_AUDIT`** en el 100% de los casos (**SC-001**), sin duplicados.

2. **Aspecto de Negocio (`@AuditarOperacion(...)` — TypeScript Method Decorator, *Around Advice*)**:
   - Decorador declarativo reutilizable aplicado sobre los métodos críticos de negocio (`OmsService`, `QuotesService`, `QuotesSchedulerService`, `EquipoSemanalService`, `TeamOfTheWeekSchedulerService`, `ScrapingService`).
   - **Around Advice centralizado**:
     - *Before*: abre un alcance efímero de metadatos por ejecución en `AuditContextService` (`AsyncLocalStorage`), inicia cronómetro (`Date.now()`) y ejecuta `extraerPreContexto?(args, instance)` si se declaró.
     - *After Returning*: calcula `tiempoEjecucion`, evalúa `debeEmitir?(result, args, preContexto)` (por defecto `true`), combina los metadatos de `extraerDatosExito(result, args, preContexto)` con cualquier dato contextual enriquecido durante la ejecución (ej. `vendedorId` o resumen de ligas, sin modificar DTOs de retorno) y delega la emisión a `AuditLoggerService`.
     - *After Throwing*: calcula `tiempoEjecucion`, clasifica automáticamente el resultado (`RECHAZADO` ante `HttpException` 4xx / `ReglaDeNegocioException`; `FALLIDO` ante 5xx o errores inesperados), extrae y sanitiza `motivo`, invoca `extraerDatosError?(error, args, preContexto)`, emite el evento de forma fail-safe (`try/catch`) y re-lanza el error original sin alterarlo.
   - **Preservación estricta de metadatos `Reflect`**:
     - Al envolver `descriptor.value`, el decorador copia todas las claves de metadatos existentes (`Reflect.getMetadataKeys(originalMethod)` → `Reflect.defineMetadata(...)`) hacia la función wrapper, garantizando total compatibilidad con decoradores de NestJS como `@Cron(...)` en `QuotesSchedulerService` y `TeamOfTheWeekSchedulerService`.
   - **Resolución desacoplada del logger (`AuditAspectRegistry`)**:
     - El decorador resuelve la instancia activa mediante `(this as any)?.auditLogger ?? AuditAspectRegistry.getLogger()`.
     - `ObservabilityModule.onModuleInit()` registra `AuditLoggerService` en `AuditAspectRegistry` (y `onModuleDestroy()` lo limpia).
     - En tests unitarios aislados donde un servicio se instancia manualmente (`new OmsService(...)`) sin `ObservabilityModule`, el aspecto hace no-op seguro sin lanzar errores ni exigir cambios en constructores de servicios ni en tests existentes (Constitución Principio IV).

3. **Propagación de Contexto (`AuditContextService` + `AuditContextMiddleware`)**:
   - Un middleware liviano ejecuta cada solicitud dentro de `AsyncLocalStorage` (`{ requestId, metadatosOperacion }`) de modo que cualquier evento emitido por `@AuditarOperacion` durante una petición HTTP herede automáticamente el mismo `requestId`, y sea `null` en ejecuciones `@Cron` o scripts standalone (`run-scraper.ts`).

### Rationale
- Aplicar AOP elimina completamente la repetición de código de auditoría (`Date.now()`, `try/catch`, clasificación de errores, sanitización y llamadas al logger) a lo largo de 6 servicios y 8 controllers, favoreciendo mantenibilidad, claridad del código de negocio y cero duplicaciones en SonarQube.
- Separar el *pointcut* (decorador `@AuditarOperacion` / `APP_INTERCEPTOR`) del *advice* (motor único en `audit-aspect` + `AuditLoggerService`) permite probar el aspecto de forma unitaria exhaustiva una sola vez y verificar su integración en cada proceso crítico.
- Mantener el fallback coordinado en `pino-http` evita el punto ciego clásico de los interceptores de NestJS (errores 401/403 en Guards y 404 de rutas inexistentes).

### Alternatives Considered
- **Instrumentación imperativa manual en cada servicio (`try/catch` + `Date.now()` + `auditLogger.emit()` repetido)**: Descartado por alta duplicación de código transversal en los servicios de aplicación y mayor riesgo de inconsistencia en cálculo de `tiempoEjecucion` o manejo de rechazos.
- **Solo `NestInterceptor` HTTP sin fallback `pino-http`**: Descartado porque los errores 401/403 (Guards), 404 (ruta no encontrada) y 400 de `body-parser` ocurren fuera del ciclo del Interceptor y quedarían sin auditar (violando el Edge Case de la especificación).
- **Usar `Scope.REQUEST` de NestJS para correlación**: Descartado por degradación de rendimiento y por ser incompatible con `@Cron` schedulers y `OnModuleInit`. `AsyncLocalStorage` mantiene todos los servicios como singletons con overhead despreciable.

---

## 5. Política de Redacción, Sanitización y Resiliencia (FR-003, FR-011)

### Decision
Implementar defensa en profundidad con dos mecanismos complementarios:
1. **Sanitizador puro determinista (`audit-sanitizer.ts`)**:
   - Recorre recursivamente `parametros` (`ruta`, `consulta`, `cuerpo`) y metadatos de negocio.
   - Redacta cualquier clave que coincida (case-insensitive) con patrones sensibles: `password`, `contrasena`, `passwordhash`, `contrasenahash`, `authorization`, `cookie`, `set-cookie`, `token`, `tokendeacceso`, `accesstoken`, `refreshtoken`, `jwt`, `secret`, `apikey`, `x-api-key`, `x-auth-token`, `proxy`, `proxyurl`, `proxyusername`, `proxypassword`, `scraping_proxy_*`, `http_proxy`, `https_proxy`.
   - Sanitiza strings mediante regex para redactar credenciales embebidas en URLs (`protocol://user:pass@host` → `protocol://[REDACTED]@host`) y tokens Bearer (`Bearer <jwt>` → `Bearer [REDACTED]`).
   - Protege contra referencias circulares (`WeakSet` → `"[CIRCULAR]"`), `Buffer` (`"[Buffer N bytes]"`), profundidad máxima (`MAX_DEPTH = 5`), longitud máxima de strings (`512` chars), máximo de ítems de array (`25`) y máximo de claves por objeto (`30`), acotando el tamaño serializado de `parametros` (~4 KB) para evitar picos de memoria en Render.
2. **Redacción nativa de Pino (`redact`)**:
   - Configurada en `pinoHttp.redact` con `censor: '[REDACTED]'` para encabezados HTTP (`req.headers.authorization`, `req.headers.cookie`, `res.headers['set-cookie']`, etc.) y rutas de primer/segundo nivel sensibles.
3. **Aislamiento de errores (`try/catch` fail-safe)**:
   - Tanto los serializadores/customProps de `pino-http` como todos los métodos de `AuditLoggerService` envuelven su ejecución en bloques `try/catch` silenciosos o de fallback mínimo para garantizar que ningún fallo de serialización o logging interrumpa una operación de negocio o respuesta HTTP (**FR-011**).

### Alternatives Considered
- **Solo `pino.redact`**: Insuficiente por sí solo porque `pino.redact` utiliza rutas estáticas/limitadas (no redacta claves arbitrariamente anidadas a profundidad N ni credenciales embebidas dentro de un string de error o URL de proxy).

---

## 6. Instrumentación Declarativa (AOP) de los 4 Procesos Críticos de Negocio (FR-004 a FR-007)

### Decision
Centralizar la lógica de emisión en `AuditLoggerService` (`backend/src/observability/services/audit-logger.service.ts`) y aplicar el decorador AOP **`@AuditarOperacion(...)`** (junto con `AuditContextService` para metadatos internos de ejecución sin alterar DTOs) en los servicios de aplicación afectados:
1. **`OmsService`** (`FR-004` / US2):
   - `@AuditarOperacion({ evento: 'TRANSACCION_TOKENS', ... })` sobre `ejecutarCompraPrimaria` y `ejecutarCompraSecundaria`, adjuntando `vendedorId` y metadatos intermedios en el contexto de operación para cubrir tanto liquidación exitosa como cualquier rechazo (`mercado`, `compradorId`, `vendedorId`, `transaccionId`, `ordenId`, `jugadorId`, `cantidad`, `precioUnitario`, `montoTotal`, `estrategiaCotizacion`, `resultado`, `motivo`, `tiempoEjecucion`).
   - `@AuditarOperacion({ evento: 'ORDEN_MERCADO_SECUNDARIO', ... })` sobre `crearOrdenVenta` y `cancelarOrdenVenta` (éxito y rechazo).
2. **`QuotesService` + `QuotesSchedulerService`** (`FR-005` / US3):
   - `@AuditarOperacion({ evento: 'CALCULO_COTIZACIONES', ... })` sobre `QuotesService.recalcularCotizacionesActivas(contexto?)` (con parámetro opcional retrocompatible `{ origen?, usuarioId? }`) y sobre `QuotesSchedulerService.ejecutarRecalculoSemanal()` (con `debeEmitir` / resultado `OMITIDO` ante lock concurrente o `FALLIDO` ante excepción, sin duplicar el evento de éxito ya emitido por `QuotesService`).
   - `@AuditarOperacion({ evento: 'CAMBIO_ESTRATEGIA_COTIZACION', ... })` sobre `QuotesService.cambiarEstrategiaActiva(estrategiaId, adminId)` (registrando `estrategiaAnterior` en contexto, `estrategiaNueva`, `versionNueva`, `usuarioId` y `tiempoEjecucion`).
3. **`EquipoSemanalService` + `TeamOfTheWeekSchedulerService`** (`FR-006` / US3):
   - `@AuditarOperacion({ evento: 'CALCULO_TEAM_OF_THE_WEEK', ... })` sobre `EquipoSemanalService.generarEquipoSemanaActual(ahora?, usuarioId?)`, `EquipoSemanalService.generarAutomatico(ahora?)` y `TeamOfTheWeekSchedulerService.ejecutarGeneracionSemanal()` (emitiendo `OMITIDO` cuando se omite por lock o existencia previa antes de delegar, sin duplicar cuando `generarAutomatico` ya emitió el resultado).
4. **`ScrapingService` + `WhoScoredPlaywrightService`** (`FR-007` / US4):
   - `@AuditarOperacion({ evento: 'SCRAPING_ESTADISTICAS', ... })` sobre `ScrapingService.ejecutarPipeline(trigger?, usuarioId?)` (agregando por contexto de operación `ejecucionId`, `ligasProcesadas`, `tasaAsociacion`, `conteoIncidencias`, `jugadoresProcesados`, `errores` y clasificando `ConflictException` como `RECHAZO_CONCURRENCIA`) y sobre `recuperarEjecucionesAtascadas()` (`debeEmitir` solo cuando realmente recuperó una ejecución huérfana).
   - `@AuditarOperacion({ evento: 'SCRAPING_LIGA', ... })` sobre `ScrapingService.procesarLiga(...)` para trazabilidad estructurada por liga.
   - `WhoScoredPlaywrightService` sanitiza explícitamente la URL de proxy antes de emitir cualquier log y sanitiza mensajes de error de navegación.

### Rationale
- Al emplear el decorador AOP `@AuditarOperacion(...)` respaldado por `AuditAspectRegistry` + `AuditContextService`, los constructores de `OmsService`, `QuotesService`, `QuotesSchedulerService`, `EquipoSemanalService`, `TeamOfTheWeekSchedulerService` y `ScrapingService` **no requieren cambios obligatorios**, preservando 100% de retrocompatibilidad con toda la suite de tests unitarios e integración existente (Constitución Principio IV).
- Se elimina la duplicación de código transversal (`Date.now()`, `try/catch`, clasificación de errores, correlación y llamadas al logger) en los 6 servicios.
- Ningún archivo de la capa de dominio (`src/domain/`, `src/scraping/domain/`) requiere cambios, preservando el aislamiento puro del Rich Domain Model (Constitución Principios I y II).

---

## 7. Política de Supresión de Advertencias de Redis en Producción (FR-010)

### Decision
Extraer la función pura `esRedisHabilitado(env = process.env): boolean` en `backend/src/observability/utils/redis-policy.util.ts` (o `src/config/redis.policy.ts`):
- Si `env.REDIS_ENABLED === 'false'` → `false`.
- Si `env.REDIS_ENABLED === 'true'` → `true`.
- Si `env.NODE_ENV === 'production'` → `Boolean(env.REDIS_URL || env.REDIS_HOST)`.
- En cualquier otro entorno (`development`, `test`, sin definir) → `true`.

Aplicar esta política en:
1. **`BaseRedisCacheService`**: si `injectedRedis === undefined` y `!esRedisHabilitado()`, asignar `this.redisClient = null` sin crear cliente `ioredis` ni emitir advertencias. Cuando Redis sí está habilitado o inyectado, mantener intacto el comportamiento actual (incluidos los `WARN` de fallo operativo).
2. **`RedisHealthIndicator`**: si `!this.isInjectedClient` y `!esRedisHabilitado()`, evitar instanciar cliente y devolver `this.getStatus(key, true, { mode: 'disabled' })` sin emitir warnings. Cuando se inyecta cliente o en `test`/`development`, mantener el comportamiento actual idéntico (garantizando que `redis-health.indicator.spec.ts` y `modules-and-controllers.spec.ts` sigan pasando sin cambios).

### Rationale
- En producción (Render sin Redis), las variables `REDIS_URL` y `REDIS_HOST` no están definidas y `NODE_ENV=production`. Con esta política se emiten **0 advertencias** por Redis no implementado (**SC-005**), se evita consumo innecesario de sockets/timers y se preserva la degradación controlada hacia PostgreSQL.
- En pruebas unitarias (`NODE_ENV=test`) y desarrollo local (`NODE_ENV=development` con Docker Compose), `esRedisHabilitado()` retorna `true`, preservando el 100% de los tests preexistentes (en particular `base-redis-cache.service.spec.ts` líneas 72–80).

### Alternatives Considered
- **Silenciar todos los `this.logger.warn` de Redis globalmente**: Descartado porque ocultaría caídas reales cuando Redis sí esté configurado en producción o desarrollo (violaría FR-010).
- **Cambiar el comportamiento por defecto en `test` para devolver `null` si no hay `REDIS_URL`**: Descartado porque rompería `base-redis-cache.service.spec.ts` (violaría Constitución Principio IV).
