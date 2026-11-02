# Research: Marketplace de Tokens de Jugadores y Order Management System (OMS)

**Feature**: `012-token-marketplace-oms`  
**Date**: 2026-11-01  
**Status**: Completed

Este documento consolida las decisiones de arquitectura, diseño de dominio e ingeniería para la implementación del marketplace de tokens, el sistema de cotizaciones dinámicas mediante estrategias y el Order Management System (OMS).

---

## 1. Patrón Estrategia para Cotizaciones (Valuación de Tokens)

### Decisión
Implementar el patrón de diseño **Strategy** (`EstrategiaCotizacion`) en la capa de dominio (`domain/strategies/`), desacoplado de TypeORM mediante el objeto de valor/puerto de dominio `MetricasJugadorParaCotizacion`, con una interfaz común y dos implementaciones concretas aprobadas:

1. `EstrategiaGlobal` (`id: 'GLOBAL'`, `version: 'GLOBAL_v1'`):
   - Fórmula estándar universal (suma de pesos $= 1.00$):
     $$\text{score} = 0.25\cdot\text{goals} + 0.15\cdot\text{assists} + 0.10\cdot\text{shots} + 0.10\cdot\text{keyPasses} + 0.10\cdot\text{dribbles} + 0.10\cdot\text{tackles} + 0.20\cdot\text{rating}$$
2. `EstrategiaPosicional` (`id: 'POSICIONAL'`, `version: 'POSICIONAL_v1'`):
   - Adapta las ponderaciones según la posición táctica normalizada del jugador (`PosicionJugador`: `'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero' | 'No Clasificado'`), conservando estrictamente la suma de pesos igual a $1.00$ en cada perfil:
   - **Delantero (FW)**: `goals` (0.35), `shots` (0.20), `assists` (0.15), `rating` (0.15), `dribbles` (0.10), `keyPasses` (0.05), `tackles` (0.00).
   - **Mediocampista (MF)**: `assists` (0.25), `keyPasses` (0.20), `dribbles` (0.15), `rating` (0.15), `goals` (0.10), `tackles` (0.10), `shots` (0.05).
   - **Defensa (DF)**: `tackles` (0.30), `interceptions` (0.25), `rating` (0.25), `keyPasses` (0.05), `assists` (0.05), `dribbles` (0.05), `goals` (0.05).
   - **Portero (GK)**: `rating` (0.55), `savePercentage` (0.30), `saves` (0.15).
   - **No Clasificado**: Fallback determinista a las ponderaciones de `GLOBAL_v1`.

Conversión de score a precio:
$$\text{valor} = \text{round}_2\left(\text{valorBase} + (\text{score} \times \text{factorEscala})\right)$$
donde $\text{valorBase} = 1.00$, $\text{factorEscala} = 1.00$, `score` se redondea a 4 decimales en $[0, 1]$ y `valor` se redondea a 2 decimales (half-up) en $[1.00, 2.00]$ para operar con centavos exactos en `Dinero`.

### Agregación Contextual y Normalización de Métricas
Dado que `EstadisticaJugador` admite múltiples registros por jugador según contexto (`temporada`, `competencia`, `etapa`), `MetricasJugadorParaCotizacion.desdeEstadisticas(estadisticas: EstadisticaJugador[])`:
1. Filtra registros con `partidosJugados > 0`. Si no existen registros válidos, marca `sinEstadisticas = true`, generando `score = 0.00` y `valor = 1.00`.
2. Selecciona la `temporada` más reciente disponible.
3. Si existen múltiples filas en esa temporada, suma acumulados (`goles`, `asistencias`, `atajadas`) y pondera por `partidosJugados` las métricas por partido/porcentaje (`tirosPorPartido`, `pasesClavePorPartido`, `regatesCompletadosPorPartido`, `entradasPorPartido`, `intercepccionesPorPartido`, `porcentajeAtajadas`, `rating`).

Cada métrica $m$ (`null` se trata como `0`) se normaliza de forma determinista $O(1)$ con límites superiores fijos representativos de las 5 grandes ligas europeas y clamp en $[0, 1]$:
$$m_{\text{norm}} = \min\left(1.0, \max\left(0.0, \frac{m}{M_{\text{max}}}\right)\right)$$
- `goals` (`goles`): $M_{\text{max}} = 30$
- `assists` (`asistencias`): $M_{\text{max}} = 20$
- `shots` (`tirosPorPartido`): $M_{\text{max}} = 5.0$
- `keyPasses` (`pasesClavePorPartido`): $M_{\text{max}} = 4.0$
- `dribbles` (`regatesCompletadosPorPartido`): $M_{\text{max}} = 4.0$
- `tackles` (`entradasPorPartido`): $M_{\text{max}} = 5.0$
- `interceptions` (`intercepccionesPorPartido`): $M_{\text{max}} = 4.0$
- `saves` (`atajadas`): $M_{\text{max}} = 120.0$
- `savePercentage` (`porcentajeAtajadas`): $M_{\text{max}} = 100.0$
- `rating`: $M_{\text{max}} = 10.0$

Cada `Cotizacion` almacena además el snapshot JSON de métricas normalizadas (`metricas`) y el indicador `sinEstadisticas`, permitiendo auditar y exponer el desglose histórico completo.

### Rationale
- Cumple con el Principio II de la Constitución (Rich Domain Model y DDD), encapsulando la agregación, normalización y cálculo matemático en el dominio puro sin dependencias de infraestructura.
- Permite añadir futuras estrategias sin alterar el código existente (Open/Closed).
- Garantiza cotizaciones reproducibles y auditables en tiempo constante $O(1)$ sin acoplarse al tamaño ni varianza muestral de toda la tabla.

### Alternativas Consideradas
- *Cálculo directo en SQL / Stored Procedures*: Rechazado por violar los Principios I y II de la Constitución.
- *Normalización dinámica min-max contra la muestra completa*: Rechazado por introducir inestabilidad ante datasets constantes (`max == min`), dependencia del orden del lote y sobrecosto de consulta global.

---

## 2. Arquitectura del Order Management System (OMS), Oferta Puntual y Trazabilidad de Estrategia

### Decisión
El OMS se implementa como un orquestador en `OmsService` respaldado por agregados ricos de dominio (`Orden`, `BalanceToken`, `Transaccion`, `Usuario`, `Dinero`):

1. **Aritmética Monetaria Segura (`Dinero`)**:
   - Se introduce el Value Object `Dinero` (`domain/dinero.value-object.ts`) basado en centavos enteros para eliminar errores de coma flotante IEEE-754 en saldos, precios unitarios y montos totales.
2. **Política de Ejecución de Órdenes**:
   - Las órdenes de **compra** (`COMPRA`) son siempre de ejecución inmediata (*Immediate-Or-Cancel*): se liquidan íntegramente en el acto creando una `Orden` en estado `COMPLETADA` (`cantidadRestante = 0`) o se rechazan sin crear órdenes `PENDIENTE`, evitando reservas monetarias huérfanas.
   - Las órdenes de **venta** (`VENTA`) en mercado secundario bloquean tokens en custodia preventiva (`cantidadBloqueada`) y siguen el ciclo `PENDIENTE -> PARCIAL -> COMPLETADA` o `CANCELADA`.
3. **Mercado Primario (`POST /orders/buy` sin `ordenVentaId`)**:
   - El comprador adquiere tokens directamente del `BalanceToken` disponible del superusuario `ADMIN` al precio oficial vigente de la última `Cotizacion` del jugador (respetando `precioMaximoUnitario` si se envía).
4. **Mercado Secundario por Selección de Oferta Puntual (`GET /orders`, `POST /orders/sell`, `POST /orders/buy` con `ordenVentaId`, `DELETE /orders/:id`)**:
   - Los vendedores publican ofertas a precio fijo (`POST /orders/sell`) que se exponen en el libro de órdenes secundarias (`GET /orders?jugadorId=...`).
   - El comprador elige explícitamente una oferta activa enviando su `ordenVentaId` en `POST /orders/buy`, pudiendo comprarla de forma total o parcial (`cantidad <= cantidadRestante`), con prohibición estricta de autocontratación (`compradorId !== vendedorId`).
   - El propietario puede cancelar el remanente no ejecutado con `DELETE /orders/:id`, liberando los tokens en custodia.
5. **Trazabilidad de Estrategia en el Histórico de Compras (`estrategiaCotizacion`)**:
   - Toda `Transaccion` generada al liquidar una compra (tanto en mercado primario como secundario) persiste de forma inmutable el campo `estrategiaCotizacion` (ej. `'GLOBAL_v1'`, `'POSICIONAL_v1'`), tomado de la `Cotizacion` oficial vigente del jugador en ese instante. Este dato se expone en el resultado de compra, en el historial del usuario y en la auditoría administrativa.
6. **Concurrencia A.C.I.D. y Prevención de Deadlocks**:
   - Se emplea `DataSource.transaction` con bloqueo pesimista `SELECT ... FOR UPDATE` adquiriendo los locks de filas de `ordenes`, `usuarios` y `balances_tokens` en **orden determinista ascendente de UUID** para impedir deadlocks, dobles gastos y sobreventas concurrentes.
   - No se requiere cabecera de idempotencia HTTP adicional: el bloqueo pesimista transaccional garantiza cero sobreventas ante peticiones repetidas o simultáneas.

### Invariante Fundamental del Suministro
Para cada jugador inicializado $j$:
$$\sum_{u \in \text{Usuarios}} \left( \text{cantidadDisponible}_{u, j} + \text{cantidadBloqueada}_{u, j} \right) \equiv 100$$
Al inicializar un jugador en el marketplace (`TokensService`), se emiten de manera transaccional e idempotente sus 100 tokens a favor del `ADMIN` junto con su `Cotizacion` inicial base (`valor = 1.00`, `score = 0.00`, `sinEstadisticas = true`, estrategia activa vigente).

---

## 3. Seguridad, Roles, Bootstrap del Superusuario y Retrocompatibilidad de Tests

### Decisión
1. **Roles y Retrocompatibilidad con Suite Existente (Principio IV)**:
   - `Usuario` incorpora `rol` (`'ADMIN' | 'USUARIO'`, opcional en `UsuarioProps` con default `'USUARIO'`) y `saldo` (`Dinero`, opcional con default `1000.00`), preservando 100% intactos todos los tests unitarios, de integración y E2E preexistentes.
   - **No se modifica `JwtStrategy`** (cuyo contrato unitario espera `{ id, email }` de forma síncrona sin dependencias en el constructor). En su lugar, `AuthModule` exporta `USUARIO_REPOSITORY` y `RolesGuard` resuelve el usuario y su `rol` actual desde PostgreSQL usando `request.user.id`. Esto rechaza con `403 Forbidden` roles no autorizados, impide falsificación desde el cliente e invalida de forma inmediata cualquier privilegio si el rol cambia en base de datos.
2. **Bootstrap Idempotente del Único `ADMIN` (`AdminBootstrapService`)**:
   - Implementado mediante `OnApplicationBootstrap` leyendo `ADMIN_CORREO`, `ADMIN_CONTRASENA` y `ADMIN_NOMBRE` (default `'Administrador Marketplace'`).
   - Si las variables no están definidas (como ocurre en suites E2E preexistentes), registra una advertencia en el logger y omite el bootstrap sin fallar.
   - Si están definidas, crea o promueve de forma idempotente al único superusuario `ADMIN` (sin permitir un segundo `ADMIN` ni exponer `rol` en `POST /auth/register`) y ejecuta `TokensService.emitirFaltantes()` para asegurar la emisión inicial de los jugadores activos existentes.
3. **Gobernanza y Auditoría exclusiva de `ADMIN`**:
   - `PUT /quotes/strategy`: Conmuta la estrategia activa del marketplace (`GLOBAL` o `POSICIONAL`) en `ConfiguracionMercado` (solo `ADMIN`).
   - `POST /quotes/recalculate`: Ejecuta el recálculo manual masivo bajo la estrategia activa (solo `ADMIN`).
   - `GET /admin/transactions`: Auditoría global consolidada de transacciones con filtros por jugador, usuario, mercado y fechas (solo `ADMIN`).

---

## 4. Job Semanal, Persistencia y Caché Redis L1

### Decisión
- **Scheduler Semanal**: `@nestjs/schedule` con `@Cron('0 0 * * 0')` en `QuotesSchedulerService`, protegido contra ejecuciones solapadas mediante `pg_try_advisory_lock`.
- **Tolerancia a Fallos Parciales**: El recálculo masivo persiste cada nueva `Cotizacion` de forma independiente por jugador (append-only, protegida además con triggers `BEFORE UPDATE OR DELETE` en `cotizaciones` y `transacciones`), asegurando que un error aislado en un jugador se contabilice en el resumen sin revertir ni sobrescribir el histórico de los demás, e ignorando jugadores inactivos. Antes de recalcular, invoca `TokensService.emitirFaltantes()` si existe `ADMIN`.
- **Caché L1 en Redis (`MarketplaceCacheService`)**: Siguiendo el patrón de degradación controlada con `ioredis` (`lazyConnect`, fallback transparente a PostgreSQL si Redis no está disponible), se cachea `GET /players/ranking` y se invalida automáticamente tras recálculos de cotización, cambios de estrategia o compras primarias.

---

## 5. Mapeo de los 12 Endpoints Expuestos

| Método | Endpoint | Controlador | Acceso | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/players/:id/quotes` | `PlayersController` | Público | Historial cronológico de cotizaciones del jugador con snapshot de métricas |
| `GET` | `/players/ranking` | `PlayersController` | Público | Ranking de jugadores activos con cotización, variación, estrategia y suministro disponible |
| `GET` | `/quotes/strategy` | `QuotesController` | Público | Consulta la estrategia activa vigente y las versiones aprobadas disponibles |
| `PUT` | `/quotes/strategy` | `QuotesController` | `ADMIN` | Conmuta la estrategia activa de cotización del marketplace (`ConfiguracionMercado`) |
| `POST` | `/quotes/recalculate` | `QuotesController` | `ADMIN` | Dispara manualmente el recálculo masivo de cotizaciones bajo la estrategia activa |
| `GET` | `/orders` | `OrdersController` | Público | Libro de órdenes de venta del mercado secundario filtrable por jugador, vendedor y estado |
| `POST` | `/orders/buy` | `OrdersController` | Autenticado | Compra inmediata de tokens (mercado primario o contra una oferta puntual `ordenVentaId`) |
| `POST` | `/orders/sell` | `OrdersController` | Autenticado | Publica orden de venta en mercado secundario bloqueando tokens en custodia |
| `DELETE` | `/orders/:id` | `OrdersController` | Propietario | Cancela una orden de venta propia pendiente/parcial y libera tokens en custodia |
| `GET` | `/users/:id/portfolio` | `UsersController` | Propio / `ADMIN` | Portfolio consolidado del usuario (tenencias, precio promedio, cotización, patrimonio) |
| `GET` | `/users/:id/transactions` | `UsersController` | Propio / `ADMIN` | Historial filtrable de transacciones del usuario incluyendo `estrategiaCotizacion` |
| `GET` | `/admin/transactions` | `AdminTransactionsController` | `ADMIN` | Auditoría global consolidada de transacciones del OMS con filtros avanzados |
