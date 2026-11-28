# Contract Verification: Preservación de Endpoints Públicos de Observabilidad y Salud

**Feature**: `020-remediate-sonarcloud-issues`
**Regla asociada**: `typescript:S7503` (remoción de `async` sin `await` en 3 handlers de `Controller` en `backend`).
**Política de contrato**: **ZERO BREAKING CHANGES** — Ningún endpoint REST, esquema de payload, código de estado HTTP, cabecera `Content-Type`, especificación OpenAPI (Swagger) ni colección de Postman se modifica funcionalmente.

---

## 1. Endpoints Intervenidos en Capa `Controller` (Sin Cambios de Contrato Externo)

| Endpoint | Método HTTP | Controller / Handler | Cambio interno | Contrato HTTP & OpenAPI preservado |
| --- | --- | --- | --- | --- |
| `/health/ready` | `GET` | `HealthController.checkReadiness()` (`backend/src/health/health.controller.ts:39`) | `async checkReadiness(): Promise<HealthCheckResult>` → `checkReadiness(): Promise<HealthCheckResult>` | Decoradores `@Get('ready')`, `@HealthCheck()`, `@ApiOperation`, `@ApiResponse(200/503)` intactos. Retorna `Promise<HealthCheckResult>` desde `this.health.check(...)` (DB, Redis, Football-Data). |
| `/health/live` | `GET` | `HealthController.checkLiveness()` (`backend/src/health/health.controller.ts:62`) | `async checkLiveness(): Promise<HealthCheckResult>` → `checkLiveness(): Promise<HealthCheckResult>` | Decoradores `@Get('live')`, `@HealthCheck()`, `@ApiOperation`, `@ApiResponse(200/503)` intactos. Retorna `Promise<HealthCheckResult>` con umbrales Heap 300 MB / RSS 1 GB y campo `bytes`. |
| `/metrics` | `GET` | `MetricsController.index()` (`backend/src/observability/controllers/metrics.controller.ts:23`) | `async index(@Res({ passthrough: true }) response: Response): Promise<string>` → `index(@Res({ passthrough: true }) response: Response): Promise<string>` | Decoradores `@Get()`, `@ApiOperation`, `@ApiProduces('text/plain; version=0.0.4; charset=utf-8')`, `@ApiResponse(200)` intactos. Delega `return super.index(response)` (`Promise<string>`). |

---

## 2. Sincronización Swagger / OpenAPI y Colección Postman (Constitution DoD #3)

- **Colección versionada verificada**: `postman/football_tokens_auth.postman_collection.json` y `postman/football_tokens.postman_environment.json`.
- **Verificación requerida en implementación**:
  1. Confirmar que el diff de `backend/src/health/health.controller.ts` y `backend/src/observability/controllers/metrics.controller.ts` no altera decoradores `@Controller`, `@Get`, `@ApiOperation`, `@ApiProduces`, `@ApiResponse` ni rutas registradas.
  2. Confirmar que ningún otro `Controller` o DTO de la API REST fue modificado.
  3. Registrar explícitamente en el cierre de implementación (DoD #3) que no existieron cambios de contrato API y que `postman/football_tokens_auth.postman_collection.json` permanece 100% sincronizada con OpenAPI/Swagger.
