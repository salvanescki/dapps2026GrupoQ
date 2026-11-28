# Runtime & Correlation Contract: Auditoría Backend

**Feature**: `019-backend-audit-logging` | **Date**: 2026-11-28

---

## 1. Contrato de Encabezado HTTP de Correlación (`x-request-id`)

Aunque esta funcionalidad **no modifica ningún endpoint, ruta, método, payload ni cuerpo de respuesta JSON de la API REST**, estandariza el encabezado transversal de correlación:

- **Request Header (opcional)**: `x-request-id`
  - Si el cliente (por ejemplo, el frontend en Vercel o un consumidor externo) envía `x-request-id` con un valor válido (cadena no vacía, recortada a máximo 128 caracteres, restringida a `[a-zA-Z0-9._:-]`), el backend lo adopta como `requestId`.
  - Si no se envía o contiene caracteres inválidos, el backend genera un UUID v4 (`crypto.randomUUID()`).
- **Response Header (siempre presente)**: `x-request-id`
  - Se devuelve en la respuesta HTTP para correlacionar errores visibles en el frontend con las trazas `HTTP_AUDIT` y `BUSINESS_AUDIT` en la consola de Render.

---

## 2. Contrato de Variables de Entorno

| Variable | Valores permitidos | Valor por defecto | Efecto |
|---|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | Determina formato de salida (`pino-pretty` solo en `development`), nivel de log por defecto y política automática de Redis. |
| `LOG_LEVEL` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent` | `info` en `production`/`development`, `silent` en `test` | Nivel mínimo de emisión de Pino. Si es `debug`, las rutas técnicas (`/health/*`, `/metrics`, `/api/docs*`) se registran en nivel `debug`. |
| `LOG_PRETTY` | `'true'` \| `'false'` | `'true'` en `development`, `'false'` en `production`/`test` | Permite desactivar `pino-pretty` en local para inspeccionar JSON crudo idéntico a producción. En `production` se ignora/mantiene desactivado para proteger CPU y RAM. |
| `REDIS_ENABLED` | `'true'` \| `'false'` | Inferido por `NODE_ENV` y `REDIS_URL`/`REDIS_HOST` | Override explícito de la caché Redis L1. En `production`, si no existen `REDIS_URL` ni `REDIS_HOST` y `REDIS_ENABLED` no es `'true'`, Redis queda deshabilitado sin warnings. |

---

## 3. Contrato de Salida de Eventos (`stdout`) y Aspectos AOP

- **Transporte**: `stdout` exclusivo (NDJSON: 1 objeto JSON por línea en producción y test; formato legible opcional con `pino-pretty` solo en desarrollo local).
- **Aspecto HTTP (`AuditLoggingInterceptor` + Fallback `pino-http`) — Garantía de Cardinalidad (SC-001)**:
  - `AuditLoggingInterceptor` (AOP `NestInterceptor`) audita todas las invocaciones que alcanzan un handler NestJS (incluidos errores `400` de `ValidationPipe`) y marca `req.__httpAuditLogged = true`.
  - `pino-http` suprime su log automático cuando `req.__httpAuditLogged === true` y actúa exclusivamente como red de seguridad para fallos previos al interceptor (`401`, `403`, `404`), garantizando **exactamente 1** registro `tipoEvento: "HTTP_AUDIT"` por solicitud funcional.
- **Aspecto de Negocio (`@AuditarOperacion`) — Reutilización y Transparencia**:
  - Todo el cronometraje (`tiempoEjecucion`), correlación (`requestId`), clasificación de errores (`RECHAZADO` vs `FALLIDO`), sanitización y protección fail-safe se centraliza en el decorador AOP `@AuditarOperacion`.
  - Preserva íntegramente los metadatos `Reflect` del método decorado (compatibilidad con `@Cron` y demás decoradores NestJS), nunca altera el valor de retorno ni suprime excepciones de negocio, y hace no-op silencioso en tests unitarios aislados sin `ObservabilityModule`.
- **Garantía de Exclusión Técnica (FR-002)**: Las rutas `/health`, `/health/*`, `/metrics`, `/api/docs`, `/api/docs/*`, `/api/docs-json` y `/api/docs-yaml` producen **0** registros en nivel `info` (producción).
- **Garantía de Cero Fuga de Secretos (FR-003 / SC-003)**: Ningún campo de contraseña, header `Authorization`/`Cookie`, JWT o credencial de proxy (incluyendo `http://user:pass@host:port`) se emite en texto claro.
- **Garantía de Inocuidad Operativa (FR-011)**: Ninguna excepción interna de serialización o escritura del logger se propaga al flujo de negocio ni altera la respuesta HTTP.

---

## 4. Impacto en OpenAPI (Swagger) y Colección de Postman (DoD #3)

- **Cambios en endpoints REST**: **Ninguno**. No se agregan, eliminan ni renombran endpoints, códigos de estado, DTOs de entrada ni DTOs de respuesta.
- **Colección de Postman**: No requiere modificación de requests ni scripts funcionales. Durante la fase de implementación se ejecutará la verificación formal contra la especificación OpenAPI generada por Swagger y la colección versionada en `postman/`, dejando constancia explícita del resultado en cumplimiento de la Constitución (DoD #3).
