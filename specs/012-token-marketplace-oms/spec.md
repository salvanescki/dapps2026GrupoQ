# Feature Specification: Marketplace de Tokens de Jugadores y Sistema de Gestión de Órdenes (OMS)

**Feature Branch**: `012-token-marketplace-oms`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "Se pide un marketplace de 100 tokens por jugador, que tienen valor 1 inicialmente. El valor del token depende de un score el cual se calcula a partir de una estrategia. Se espera que hayan 2 estrategias diferentes para calcular el valor. Ejemplo (normalizando cada métrica en [0,1]): goals, assists, shots, keyPasses, dribbles, tackles, rating. Fórmula de score: score = 0.25*goals + 0.15*assists + 0.10*shots + 0.10*keyPasses + 0.10*dribbles + 0.10*tackles + 0.20*rating y su conversión a precio: valor = valorBase + (score * factorEscala) el factorEscala ponelo en 1. Se puede ponderar distinto según posición (FW prioriza goals/shots, DF prioriza tackles). El cálculo se ejecuta en un job semanal y se guarda el histórico de cotizaciones. Debe registrarse la versión de la estrategia usada en cada cotización. El superusuario, el cual tiene originalmente todos los tokens es aquel que puede definir la estrategia a utilizar. Definir un rol que tenga dichos permisos (admin). Se espera un OMS (Order Management System) para administrar las compras de tokens en el marketplace. El sistema debe guardar los históricos de las transacciones. Los usuarios, posteriormente, podrán tradear tokens entre ellos. Se debe guardar el histórico de las transacciones del usuario."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Emisión Inicial y Consulta del Mercado de Tokens (Priority: P1)

Como usuario o inversor de la plataforma,
quiero ingresar a la sección de marketplace y visualizar los tokens disponibles por cada jugador de fútbol, su cotización actual y la cantidad disponible para comprar,
para evaluar oportunidades de inversión y decidir qué tokens incorporar a mi portafolio.

**Why this priority**: Es el punto de partida del marketplace. Cada jugador cuenta con 100 tokens iniciales a valor 1.00 en poder del superusuario; sin la exposición de este suministro y precio base, ninguna compra puede originarse.

**Independent Test**: Puede probarse de manera aislada consultando la lista de tokens de jugadores creados en el sistema: debe verificarse que cada jugador posee exactamente 100 tokens emitidos en poder del administrador, con valor unitario 1.00 y estado listo para operar.

**Acceptance Scenarios**:

1. **Given** un nuevo jugador registrado en el catálogo del sistema, **When** se inicializa en el marketplace, **Then** el sistema emite exactamente 100 tokens indivisibles asociados al jugador, asignados en su totalidad a la cuenta del superusuario (admin), con una cotización base inicial de 1.00 crédito.
2. **Given** un usuario autenticado o visitante en el marketplace, **When** consulta la cartelera de cotizaciones, **Then** el sistema despliega el nombre del jugador, equipo, posición, valor actual del token, variación respecto a la cotización previa y suministro disponible para compra.
3. **Given** un intento de alterar el suministro total emitido de un jugador, **When** se valida la regla de negocio, **Then** el sistema rechaza cualquier creación o destrucción de tokens que vulnere la invariante inmutable de 100 tokens totales por jugador.

---

### User Story 2 - Cotización Dinámica por Estrategias y Recálculo Semanal (Priority: P1)

Como operador del mercado o analista financiero,
quiero que el sistema calcule semanalmente el valor del token de cada jugador a partir de sus métricas de rendimiento deportivo aplicando una estrategia de ponderación formal,
para que la cotización refleje fielmente el desempeño real del futbolista y se preserve el histórico inmutable de valoraciones.

**Why this priority**: Es el motor central de valuación del mercado. Garantiza que el precio de los tokens fluctúe de manera transparente en función de fórmulas de rendimiento objetivas y verificables.

**Independent Test**: Puede probarse ejecutando el proceso de cálculo sobre un jugador con estadísticas conocidas aplicando cada una de las dos estrategias definidas, verificando que la fórmula produce el score matemático exacto, genera el nuevo precio con `valorBase = 1.0` y `factorEscala = 1.0`, y almacena el registro histórico con fecha y versión de estrategia.

**Acceptance Scenarios**:

1. **Given** un jugador con estadísticas registradas (goles, asistencias, tiros, pases clave, regates, entradas, rating) y la Estrategia 1 (Ponderación Global) activa, **When** se ejecuta el recálculo, **Then** el sistema normaliza cada métrica en el intervalo [0, 1], calcula el score con los coeficientes (`0.25*goles + 0.15*asistencias + 0.10*tiros + 0.10*pasesClave + 0.10*regates + 0.10*entradas + 0.20*rating`), computa el precio según `1.0 + (score * 1.0)` y persiste una nueva cotización registrando la versión exacta de la estrategia.
2. **Given** la Estrategia 2 (Ponderación por Posición) activa, **When** se procesa un Delantero (FW) y un Defensa (DF), **Then** el Delantero recibe mayor ponderación en goles y tiros mientras que el Defensa prioriza entradas y recuperaciones defensivas, reflejando perfiles de rendimiento diferenciados por posición.
3. **Given** la culminación del ciclo semanal programado, **When** se completa la corrida, **Then** todos los jugadores activos cuentan con su nuevo registro de cotización en el histórico, sin sobrescribir ni modificar las cotizaciones anteriores.

---

### User Story 3 - Configuración y Administración de Estrategias por Superusuario (Priority: P2)

Como superusuario administrador (`admin`),
quiero poder seleccionar y conmutar la estrategia de cotización activa del marketplace entre las opciones aprobadas, y consultar las versiones vigentes,
para dirigir la política económica del marketplace con permisos exclusivos restringidos a mi rol.

**Why this priority**: Cumple con el requisito de gobernanza del sistema, asegurando que solo usuarios con rol de administrador puedan modificar las reglas de valoración del mercado sin intervención de usuarios convencionales.

**Independent Test**: Puede probarse enviando una solicitud de cambio de estrategia con credenciales de usuario estándar (debe ser rechazada con código de autorización denegada) y con credenciales de superusuario (debe aplicarse exitosamente para las siguientes ejecuciones).

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con rol `admin`, **When** solicita seleccionar la Estrategia por Posición como estrategia activa del sistema, **Then** el sistema actualiza la configuración del marketplace, asocia la versión de estrategia correspondiente y confirma el cambio con éxito.
2. **Given** un usuario con rol estándar (`usuario`), **When** intenta modificar la estrategia activa o alterar parámetros de valuación, **Then** el sistema bloquea la acción y retorna una respuesta de acceso denegado por falta de privilegios administrativos.
3. **Given** un administrador que ejecuta el recálculo manual bajo demanda, **When** se dispara la acción, **Then** el sistema recalcula inmediatamente las cotizaciones de todos los jugadores bajo la estrategia activa sin esperar al vencimiento del ciclo semanal.

---

### User Story 4 - Compra de Tokens en Mercado Primario vía OMS (Priority: P1)

Como usuario inversor con saldo disponible en mi cuenta,
quiero adquirir tokens de un jugador directamente desde el inventario del marketplace (mercado primario) a la cotización oficial vigente mediante el sistema de gestión de órdenes (OMS),
para comenzar a construir mi cartera de activos de futbolistas.

**Why this priority**: Es la vía primaria de entrada de liquidez y adquisición de tokens por parte de los usuarios, transfiriendo los tokens desde el superusuario emisor hacia los tenedores privados.

**Independent Test**: Puede probarse emitiendo una orden de compra por 5 tokens de un jugador a precio 1.00 con un usuario que posee 10 créditos: debe debitarse 5 créditos de su billetera, acreditarse 5 tokens en su inventario, reducirse el balance del superusuario de 100 a 95 tokens, y registrarse la transacción en el histórico del sistema y del usuario.

**Acceptance Scenarios**:

1. **Given** un usuario con fondos suficientes y un jugador con tokens disponibles en poder del superusuario, **When** el usuario emite una orden de compra en el OMS por una cantidad determinada de tokens, **Then** el OMS valida la disponibilidad de tokens y saldo, debita el importe total (`cantidad * cotizacionActual`), acredita los tokens en el portafolio del usuario, deduce los tokens del inventario del superusuario y genera un registro inmutable de transacción.
2. **Given** un usuario cuyo saldo en billetera es menor al costo total de la orden, **When** intenta confirmar la compra en el OMS, **Then** el sistema rechaza la transacción con un mensaje indicando fondos insuficientes, sin modificar saldos ni inventarios.
3. **Given** una orden de compra que solicita una cantidad superior al suministro restante en manos del vendedor o superusuario, **When** se procesa en el OMS, **Then** el sistema bloquea la ejecución notificando que la cantidad solicitada supera la disponibilidad en el mercado.

---

### User Story 5 - Trading de Tokens entre Usuarios en Mercado Secundario vía OMS (Priority: P2)

Como usuario poseedor de tokens de un jugador,
quiero publicar órdenes de venta en el mercado secundario y comprar tokens ofrecidos por otros usuarios a través del OMS,
para obtener liquidez, realizar ganancias sobre la valorización de mis jugadores o adquirir tokens que ya no están disponibles en el mercado primario.

**Why this priority**: Habilita el ecosistema completo de intercambio P2P entre usuarios, permitiendo que la oferta y demanda secundaria circule libremente respetando la propiedad y el suministro total.

**Independent Test**: Puede probarse creando una orden de venta de 2 tokens por el Usuario A a un precio fijado, y ejecutando la compra por parte del Usuario B: se verifica la transferencia atómica de tokens y fondos entre ambos usuarios, y el asentamiento en los historiales individuales.

**Acceptance Scenarios**:

1. **Given** un usuario tenedor de tokens de un jugador, **When** publica en el OMS una orden de venta especificando cantidad y precio unitario solicitado, **Then** el sistema bloquea en custodia preventiva los tokens de su balance disponible y publica la oferta en el libro del mercado secundario.
2. **Given** una orden de venta activa en el mercado secundario y un segundo usuario con saldo monetario suficiente, **When** el comprador ejecuta la orden de compra sobre dicha oferta, **Then** el OMS liquida atómicamente la operación: transfiere los tokens al comprador, transfiere los fondos al vendedor y marca la orden como cumplida.
3. **Given** un usuario que intenta emitir una orden de venta por una cantidad de tokens superior a la que efectivamente posee en estado disponible, **When** el OMS valida la orden, **Then** el sistema rechaza la solicitud por saldo de tokens insuficiente.
4. **Given** un usuario con una orden de venta pendiente que no ha sido tomada, **When** solicita cancelar su orden, **Then** el OMS libera los tokens en custodia devolviéndolos al saldo disponible del usuario y cambia el estado de la orden a cancelada.

---

### User Story 6 - Consulta de Histórico de Cotizaciones y Transacciones del Usuario (Priority: P2)

Como usuario o administrador de la plataforma,
quiero consultar el historial cronológico completo de cotizaciones de cada jugador y mi registro personal de transacciones ejecutadas en el OMS,
para auditar la evolución de precios en el tiempo y verificar todos los movimientos económicos de mi cuenta.

**Why this priority**: Aporta transparencia total al mercado financiero, permitiendo la rendición de cuentas, la trazabilidad de precios pasados y el seguimiento del portafolio personal.

**Independent Test**: Puede probarse realizando compras y ventas con un usuario, ejecutando dos recálculos de cotizaciones, y consultando los endpoints de historial de cotizaciones de jugador y de transacciones de usuario, comprobando que se devuelven todos los registros ordenados cronológicamente con sus metadatos completos.

**Acceptance Scenarios**:

1. **Given** un jugador con múltiples cotizaciones generadas a lo largo de las semanas, **When** un usuario consulta el historial de cotizaciones del jugador, **Then** el sistema entrega la lista ordenada cronológicamente con fecha, valor resultante, score, versión de estrategia empleada y desglose de métricas.
2. **Given** un usuario que ha realizado operaciones de compra en mercado primario y transacciones en mercado secundario, **When** consulta su historial de transacciones, **Then** el sistema retorna la lista exhaustiva de sus movimientos (compras, ventas, precios unitarios, cantidades, totales, contrapartes o mercado, marcas de tiempo y estado).
3. **Given** un administrador que consulta la auditoría general del OMS, **When** solicita el reporte global de transacciones, **Then** el sistema expone el consolidado de todas las transacciones históricas procesadas en la plataforma con filtros por jugador, usuario y rango de fechas.

---

### Edge Cases

- ¿Qué ocurre si un jugador no cuenta con estadísticas registradas en la base de datos al momento de ejecutar el job semanal de cotización? El sistema asigna a dicho jugador una cotización de valor base predeterminado (1.00) con score 0.00, registrando en los metadatos de la cotización que no se dispuso de métricas deportivas recientes.
- ¿Qué sucede si dos usuarios intentan comprar simultáneamente el último lote de tokens disponible de un mismo jugador en el mercado secundario? El OMS debe resolver la concurrencia garantizando aislamiento transaccional (A.C.I.D.): la primera orden que bloquee los activos se procesa exitosamente y la segunda se rechaza por falta de disponibilidad remanente.
- ¿Qué ocurre si el cálculo de la estrategia produce un score con valores fuera del rango esperado por métricas atípicas? La función de normalización acota estrictamente cada métrica al rango cerrado [0, 1] mediante min-max scaling y clamp, garantizando que el score siempre pertenezca a [0, 1] y que el precio resultante nunca sea inferior a `valorBase`.
- ¿Qué sucede con los tokens de un jugador si el futbolista es desactivado o transferido fuera de las ligas soportadas? Los tokens existentes en posesión de los usuarios se congelan en el portafolio para consulta histórica y rescate según políticas del administrador, suspendiéndose la emisión de nuevas cotizaciones y órdenes en el OMS para ese activo.
- ¿Qué ocurre si un usuario intenta transferirse o comprarse tokens a sí mismo en el mercado secundario? El OMS valida que el comprador y el vendedor sean cuentas de usuario diferentes, rechazando cualquier intento de autocontratación (*wash trading*).

---

## Requirements *(mandatory)*

### Functional Requirements

#### 1. Suministro y Gestión de Tokens
- **FR-001**: Cada jugador registrado en el catálogo del sistema DEBE contar con un suministro fijo e inalterable de exactamente 100 tokens.
- **FR-002**: Al darse de alta un jugador en el marketplace, la totalidad de sus 100 tokens iniciales DEBEN ser asignados al saldo del superusuario con rol `admin`.
- **FR-003**: El valor de cotización inicial de cada token recién emitido DEBE ser exactamente de 1.00 unidad monetaria/crédito.
- **FR-004**: El sistema DEBE garantizar la invariante estricta de suministro: para cualquier jugador en cualquier instante, la suma de los tokens en posesión de todos los usuarios (incluido el superusuario) y los tokens retenidos en órdenes activas DEBE ser exactamente igual a 100.
- **FR-005**: Los tokens son indivisibles; todas las operaciones de compra, venta y transferencia DEBEN realizarse en cantidades enteras positivas mayores o iguales a 1.

#### 2. Modelos y Estrategias de Cotización
- **FR-006**: El valor de mercado de cada token DEBE calcularse a partir de un puntaje de rendimiento (*score*) derivado de la evaluación de métricas deportivas aplicando el patrón de diseño Estrategia (*Strategy Pattern*).
- **FR-007**: La fórmula general de conversión de score a precio DEBE ser: `valor = valorBase + (score * factorEscala)`, donde `valorBase` es 1.00 y `factorEscala` es 1.00.
- **FR-008**: Todas las métricas de rendimiento deportivo utilizadas en el cálculo DEBEN normalizarse previamente en el rango continuo [0, 1].
- **FR-009**: El sistema DEBE soportar y disponer de al menos 2 estrategias de cálculo formalmente diferenciadas:
  - **Estrategia 1 (Ponderación Global / Estándar):** Aplica ponderaciones fijas universales independientemente de la posición del jugador según la fórmula:
    `score = 0.25*goals + 0.15*assists + 0.10*shots + 0.10*keyPasses + 0.10*dribbles + 0.10*tackles + 0.20*rating`.
  - **Estrategia 2 (Ponderación Posicional Específica):** Pondera las métricas de manera diferenciada según la posición táctica registrada del jugador:
    - *Delantero (FW):* Prioriza finalización y ataque (mayor ponderación a goles y tiros por partido).
    - *Mediocampista (MF):* Prioriza generación de juego y balance (asistencias, pases clave y regates).
    - *Defensa (DF):* Prioriza contención y recuperación (entradas/tackles e intercepciones).
    - *Portero (GK):* Prioriza efectividad defensiva, calificación (*rating*) y métricas de guardameta disponibles.
- **FR-010**: El sistema DEBE ejecutar el recálculo masivo de cotizaciones para todos los jugadores activos mediante un proceso automatizado periódico programado con frecuencia semanal (job semanal).
- **FR-011**: Cada cotización generada y persistida en el sistema DEBE registrar obligatoriamente: identificador del jugador, valor numérico calculado, score obtenido, marca de tiempo precisa, identificador de la estrategia utilizada y versión explícita de dicha estrategia (ej. `GLOBAL_v1`, `POSICIONAL_v1`).
- **FR-012**: El sistema DEBE almacenar el histórico inmutable de cotizaciones de cada jugador, permitiendo consultar la evolución temporal de sus precios sin permitir la modificación o eliminación de registros pasados.

#### 3. Roles, Autorización y Gobernanza
- **FR-013**: El sistema DEBE definir y diferenciar formalmente al menos dos roles de usuario:
  - `ADMIN` (Superusuario / Administrador): Poseedor del inventario inicial de tokens y facultado con permisos de administración económica.
  - `USUARIO` (Trader / Inversor): Usuario convencional facultado para consultar el mercado, poseer saldo y operar órdenes de compraventa.
- **FR-014**: ÚNICAMENTE los usuarios autenticados con rol `admin` DEBEN tener autorización para configurar o conmutar la estrategia activa de cotización del sistema.
- **FR-015**: El superusuario `admin` DEBE contar con la facultad de disparar manualmente la ejecución inmediata del recálculo de cotizaciones de todos los jugadores sin esperar al ciclo semanal automático.
- **FR-016**: Toda solicitud de modificación de estrategia o ejecución forzada proveniente de un usuario que no posea rol `admin` DEBE ser rechazada de inmediato con un error de acceso no autorizado.

#### 4. Sistema de Gestión de Órdenes (OMS) y Mercados
- **FR-017**: El sistema DEBE incorporar un Order Management System (OMS) responsable de recibir, validar, encolar, ejecutar y conciliar todas las órdenes de compraventa de tokens.
- **FR-018**: En el **Mercado Primario**, el OMS DEBE permitir a los usuarios comprar tokens directamente de la existencia disponible en poder del superusuario al precio oficial de cotización vigente del jugador.
- **FR-019**: En el **Mercado Secundario**, el OMS DEBE permitir a los usuarios publicar órdenes de venta fijando la cantidad de tokens a vender y el precio unitario solicitado.
- **FR-020**: En el **Mercado Secundario**, el OMS DEBE permitir a otros usuarios comprar total o parcialmente las órdenes de venta activas ofrecidas por sus pares.
- **FR-021**: Al publicarse una orden de venta en el mercado secundario, el OMS DEBE reservar en custodia los tokens correspondientes del vendedor, impidiendo que puedan ser vendidos dos veces o retirados mientras la orden permanezca activa.
- **FR-022**: El creador de una orden de venta en el mercado secundario DEBE poder cancelarla en cualquier momento previo a su ejecución, liberando de inmediato los tokens en custodia de regreso a su saldo disponible.
- **FR-023**: La liquidación de cualquier orden en el OMS DEBE ejecutarse bajo una transacción atómica A.C.I.D. que realice en forma simultánea: débito de fondos del comprador, crédito de fondos al vendedor, débito de tokens del vendedor y crédito de tokens al comprador.
- **FR-024**: El OMS DEBE validar rigurosamente que el comprador posea saldo monetario suficiente antes de procesar cualquier orden de compra.
- **FR-025**: El OMS DEBE validar rigurosamente que el vendedor posea saldo de tokens suficiente antes de aceptar cualquier orden de venta.
- **FR-026**: El OMS DEBE prohibir y rechazar cualquier orden en la que el comprador y el vendedor sean el mismo usuario (prohibición de autofinanciamiento / wash trading).

#### 5. Registro y Consulta de Históricos de Transacciones
- **FR-027**: El sistema DEBE registrar un histórico inmutable de todas las transacciones concluidas en el marketplace, documentando: identificador de transacción, tipo de mercado (primario o secundario), identificador del jugador, usuario comprador, usuario vendedor, cantidad de tokens, precio unitario, monto total liquidado y fecha/hora exacta.
- **FR-028**: Cada usuario DEBE poder consultar en cualquier momento su historial personal de transacciones, filtrando por jugador, tipo de operación (compra o venta) y rango de fechas.
- **FR-029**: El sistema DEBE proveer a cada usuario un resumen consolidado de su portafolio de activos: lista de jugadores en posesión, cantidad de tokens propios por jugador, precio promedio de adquisición, cotización actual de mercado y valorización total del portafolio.
- **FR-030**: Los usuarios administradores DEBEN poder consultar el historial global consolidado de todas las transacciones operadas en la plataforma con fines de auditoría y monitoreo.

---

### Key Entities *(Dominio Funcional)*

- **Usuario**: Representa a la persona física o cuenta registrada en la plataforma. Posee identificador único, nombre, correo electrónico, rol en el sistema (`ADMIN` o `USUARIO`), estado activo y saldo en su billetera virtual de fondos.
- **Jugador**: Representa al futbolista federado del catálogo deportivo con su posición táctica, club, liga y estadísticas acumuladas.
- **TokenJugador**: Representa el activo financiero emitido sobre un futbolista específico. Posee identificador, referencia al jugador, suministro total fijo (100 unidades) y fecha de creación.
- **BalanceTokenUsuario**: Representa la tenencia de tokens de un jugador particular por parte de un usuario. Posee identificador de usuario, identificador de jugador, cantidad de tokens disponibles y cantidad de tokens en custodia por órdenes activas.
- **EstrategiaCotizacion**: Representa el algoritmo de valoración seleccionado. Define el nombre identificador, versión (ej. `v1.0`), ponderaciones por métrica (globales o diferenciadas por posición: Delantero, Mediocampista, Defensa, Portero) y estado de activación en el sistema.
- **CotizacionJugador**: Representa el precio histórico oficial de mercado de un token de jugador en un punto en el tiempo. Atributos: identificador del jugador, fecha de cotización, score obtenido, valor resultante calculado, identificador de la estrategia aplicada y versión de la misma.
- **Orden**: Representa una solicitud de compra o venta emitida en el OMS. Atributos: identificador único, tipo de mercado (primario o secundario), sentido (compra o venta), usuario emisor, jugador involucrado, cantidad de tokens solicitados, cantidad ejecutada, precio unitario fijado, estado (pendiente, completada, cancelada, parcialmente completada) y marcas de tiempo de creación y actualización.
- **Transaccion**: Representa la liquidación efectiva y definitiva de una orden en el marketplace. Atributos: identificador único, orden asociada, jugador, usuario vendedor, usuario comprador, cantidad de tokens transferidos, precio unitario pactado, importe total liquidado y marca de tiempo inmutable.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Integridad del Suministro**: El 100% de los jugadores en el marketplace mantienen exactamente 100 tokens distribuidos entre tenedores y custodia, con 0 discrepancias de emisión detectadas en auditorías.
- **SC-002**: **Tiempo de Respuesta en Cotizaciones**: El proceso semanal de recálculo procesa la totalidad del catálogo de jugadores activos a una velocidad promedio inferior a 50 milisegundos por jugador.
- **SC-003**: **Trazabilidad de Estrategia**: El 100% de las cotizaciones registradas en la base de datos consignan de forma explícita e inequívoca el nombre y la versión de la estrategia utilizada en su cálculo.
- **SC-004**: **Rendimiento del OMS en Ejecución de Órdenes**: Las operaciones de compra en mercado primario y secundario se liquidan de forma atómica en menos de 500 milisegundos desde la confirmación del usuario bajo condiciones normales de carga.
- **SC-005**: **Cero Sobrevendidos**: Cero incidencias (0%) de órdenes ejecutadas sin disponibilidad real de tokens o con saldo insuficiente de fondos.
- **SC-006**: **Transparencia Histórica**: El 100% de las transacciones financieras y órdenes liquidadas quedan asentadas en los historiales individuales de los usuarios y en el registro global del sistema sin omisiones.
- **SC-007**: **Segregación de Permisos**: Cero incidentes de acceso o modificación de estrategias por parte de usuarios sin rol `admin` (100% de efectividad en el control de acceso basado en roles).

---

## Assumptions

- **Billetera y Saldo Virtual**: Cada usuario registrado cuenta con una billetera interna en la plataforma con saldo expresado en créditos/moneda virtual del sistema. Para facilitar la experiencia inicial y pruebas, los nuevos usuarios reciben un balance inicial de cortesía (por ejemplo, 1.000 créditos) o pueden recargar saldo simulado en su cuenta.
- **Modelo de Mercado Secundario**: En la fase inicial del OMS, el mercado secundario opera bajo el modelo de órdenes de venta fijadas (*limit orders / listings*) donde los usuarios vendedores publican sus lotes a un precio unitario determinado y los compradores eligen y ejecutan directamente contra dichas órdenes publicadas, admitiendo ejecuciones parciales o totales.
- **Normalización de Métricas Deportivas**: La normalización de las métricas (`goals`, `assists`, `shots`, `keyPasses`, `dribbles`, `tackles`, `rating`) en el intervalo [0, 1] se realiza mediante límites superiores de referencia establecidos por posición/liga (o el valor máximo registrado en la base de datos para la temporada), acotando cualquier valor resultante mediante un clamp entre 0.0 y 1.0 para prevenir desbordes.
- **Frecuencia del Job Semanal**: El recálculo periódico se programa para ejecutarse una vez por semana (configurable por cron) en un horario de baja concurrencia, respetando la última fecha de actualización de estadísticas deportivas disponible en el sistema.
- **Compatibilidad con Usuarios Preexistentes**: Los usuarios ya existentes en la base de datos que carezcan de rol asignado serán asumidos por defecto con el rol de `USUARIO`, debiendo designarse al menos un usuario administrador como superusuario inicial para gobernar el inventario y las estrategias.

