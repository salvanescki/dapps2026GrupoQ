# Research: Marketplace de Tokens de Jugadores y Order Management System (OMS)

**Feature**: `012-token-marketplace-oms`  
**Date**: 2026-10-31  
**Status**: Completed

Este documento consolida las decisiones de arquitectura, diseño de dominio e ingeniería para la implementación del marketplace de tokens, el sistema de cotizaciones dinámicas mediante estrategias y el Order Management System (OMS).

---

## 1. Patrón Estrategia para Cotizaciones (Valuación de Tokens)

### Decisión
Implementar el patrón de diseño **Strategy** (`EstrategiaCotizacion`) en la capa de dominio (`domain/strategies/`), definiendo una interfaz común y dos implementaciones concretas:
1. `EstrategiaPonderacionGlobal` (`GLOBAL_v1`):
   - Fórmula: $\text{score} = 0.25\cdot\text{goals} + 0.15\cdot\text{assists} + 0.10\cdot\text{shots} + 0.10\cdot\text{keyPasses} + 0.10\cdot\text{dribbles} + 0.10\cdot\text{tackles} + 0.20\cdot\text{rating}$.
2. `EstrategiaPonderacionPosicional` (`POSICIONAL_v1`):
   - Adapta las ponderaciones según la posición táctica normalizada del jugador (`Portero`, `Defensa`, `Mediocampista`, `Delantero`).
   - Delantero (FW): Prioriza `goals` (0.35) y `shots` (0.20), rating (0.15), assists (0.15), dribbles (0.10), keyPasses (0.05), tackles (0.00).
   - Mediocampista (MF): Prioriza `assists` (0.25), `keyPasses` (0.20), dribbles (0.15), tackles (0.10), rating (0.15), goals (0.10), shots (0.05).
   - Defensa (DF): Prioriza `tackles` (0.45), rating (0.25), keyPasses (0.10), assists (0.05), dribbles (0.05), shots (0.05), goals (0.05).
   - Portero (GK): Prioriza `rating` (0.60), tackles/duelos (0.20), pases/distribución (0.20).

Conversión de score a precio:
$$\text{valor} = \text{valorBase} + (\text{score} \times \text{factorEscala})$$
donde $\text{valorBase} = 1.00$ y $\text{factorEscala} = 1.00$.

### Normalización de Métricas
Para garantizar que $\text{score} \in [0, 1]$, cada métrica $m$ de las estadísticas disponibles en `estadisticas_jugadores` se normaliza mediante un escalado de referencia con límite superior representativo de las 5 grandes ligas:
$$m_{\text{norm}} = \min\left(1.0, \max\left(0.0, \frac{m}{M_{\text{max}}}\right)\right)$$
- `goals`: $M_{\text{max}} = 30$ (o goles por partido escalados a 38 fechas).
- `assists`: $M_{\text{max}} = 20$.
- `shots` (tirosPorPartido): $M_{\text{max}} = 5.0$.
- `keyPasses` (pasesClavePorPartido): $M_{\text{max}} = 4.0$.
- `dribbles` (regatesCompletadosPorPartido): $M_{\text{max}} = 4.0$.
- `tackles` (entradasPorPartido): $M_{\text{max}} = 5.0$.
- `rating`: Normalizado directamente dividiendo entre $10.0$ (rating en $[0, 10]$).

### Rationale
- Cumple fielmente con el principio II de la Constitución (Rich Domain Model y DDD), encapsulando el cálculo matemático dentro del dominio puro sin dependencias de infraestructura.
- Permite añadir futuras estrategias sin alterar el código existente (Principio Open/Closed de SOLID).
- Garantiza cotizaciones reproducibles y auditables al registrar el identificador y la versión de la estrategia utilizada en cada cotización generada.

### Alternativas Consideradas
- *Cálculo directo en SQL / Stored Procedures*: Rechazado tajantemente por violar el Principio I y II de la Constitución (la lógica de negocio debe residir exclusivamente en la capa Model del backend).
- *Normalización dinámica basada en el percentil 99 de la muestra*: Evaluada, pero introduce acoplamiento a la base completa en cada cálculo individual; los límites máximos estandarizados ofrecen determinismo y rendimiento constante $O(1)$.

---

## 2. Arquitectura del Order Management System (OMS) y Garantías Transaccionales

### Decisión
El OMS se diseña como un orquestador en la capa Service respaldado por agregados de dominio (`Orden`, `BalanceToken`, `Transaccion`, `Billetera`) que resuelven dos flujos de mercado:

1. **Mercado Primario (Emisión)**:
   - Los usuarios compran directamente del inventario asignado al superusuario (`admin`), quien originalmente posee los 100 tokens de cada jugador.
   - El precio unitario de compra es estrictamente la cotización oficial más reciente del jugador.
2. **Mercado Secundario (P2P entre Usuarios)**:
   - Los usuarios publican órdenes de venta (`POST /orders/sell`) especificando `jugadorId`, `cantidad` y `precioUnitario`.
   - Al publicar la orden, la cantidad de tokens se debita del saldo disponible y se mueve a `cantidadBloqueada` (custodia).
   - Los compradores ejecutan `POST /orders/buy`: el OMS toma la orden de venta disponible más conveniente (o una orden de venta específica) y liquida la transacción.
3. **Concurrencia y A.C.I.D.**:
   - Se utiliza aislamiento transaccional en PostgreSQL con bloqueo pesimista de fila (`SELECT ... FOR UPDATE`) sobre las filas de `balances_tokens` y `usuarios` (saldo) involucradas para prevenir dobles gastos (*double spending*) o sobreventas en concurrencia.

### Invariante Fundamental del Suministro
Para cada jugador $j$:
$$\sum_{u \in \text{Usuarios}} \left( \text{tokensDisponibles}_{u, j} + \text{tokensBloqueados}_{u, j} \right) \equiv 100$$
Esta invariante se valida en los tests unitarios y de integración de dominio.

### Alternativas Consideradas
- *Matching Engine asíncrono con colas de mensajes*: Descartado por sobreingeniería para la fase actual; el modelo síncrono transaccional en PostgreSQL garantiza consistencia estricta A.C.I.D. y respuesta inmediata $<500$ ms.
- *Trading directo sin custodia preventiva*: Rechazado; provocaría ventas fantasma si un usuario pone tokens a la venta y los vende en otra transacción paralela.

---

## 3. Seguridad, Roles y Autorización (Admin vs Usuario)

### Decisión
1. Incorporar el atributo `rol` en la entidad `Usuario`:
   - `'ADMIN'`: Superusuario del sistema. Posee inventario inicial de emisión y permisos exclusivos para:
     - Modificar o configurar la estrategia activa del sistema.
     - Disparar el recálculo manual de cotizaciones (`POST /quotes/recalculate`).
   - `'USUARIO'`: Usuario convencional / trader. Puede comprar/vender tokens, consultar mercado y su portafolio.
2. Control de Acceso:
   - Decorador `@Roles('ADMIN')` y guardia `RolesGuard` combinado con `JwtAuthGuard`.
   - Si un usuario con rol `'USUARIO'` invoca `POST /quotes/recalculate`, el sistema responde con `403 Forbidden`.

### Billetera y Fondos de Usuario
- Cada usuario cuenta con un atributo `saldo` monetario (por defecto 1,000.00 créditos virtuales de cortesía al registrarse).
- Las compras debitan saldo del comprador y acreditan saldo al vendedor (o al superusuario en el mercado primario).

### Alternativas Consideradas
- *Múltiples tablas separadas para Admin y Usuario*: Descartado para mantener simplicidad y consistencia en la autenticación JWT existente.

---

## 4. Job Semanal y Programación de Tareas

### Decisión
- Utilizar el módulo `@nestjs/schedule` con `@Cron('0 0 * * 0')` (cada domingo a la medianoche) para ejecutar el recálculo semanal automático de todos los jugadores activos.
- El servicio de recálculo reutiliza la misma lógica de dominio que invoca el endpoint manual `POST /quotes/recalculate`.
- Cada corrida genera registros inmutables en la tabla `cotizaciones` con fecha, score, valor, estrategia y versión.

---

## 5. Mapeo de los 7 Endpoints Requeridos

| Método | Endpoint | Controlador | Parámetros / Body | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/players/:id/quotes` | `QuotesController` / `PlayersController` | `:id` (UUID jugador) | Historial cronológico de cotizaciones del jugador |
| `GET` | `/players/ranking` | `PlayersController` / `QuotesController` | Query: `limit`, `posicion` | Ranking de jugadores ordenados por cotización/score de estrategia activa |
| `POST` | `/quotes/recalculate` | `QuotesController` | Body opcional `{ estrategiaId?: string }` (Solo ADMIN) | Recálculo manual de cotizaciones para todos los jugadores activos |
| `POST` | `/orders/buy` | `OrdersController` | Body: `{ jugadorId: string, cantidad: number }` | Comprar tokens de un jugador (primario o secundario) |
| `POST` | `/orders/sell` | `OrdersController` | Body: `{ jugadorId: string, cantidad: number, precioUnitario: number }` | Poner a la venta tokens propios en el mercado |
| `GET` | `/users/:id/portfolio` | `UsersController` | `:id` (UUID usuario) | Portfolio del usuario (tokens por jugador, cotización, saldos) |
| `GET` | `/users/:id/transactions` | `UsersController` | `:id` (UUID usuario) | Historial de transacciones de compra/venta del usuario |

