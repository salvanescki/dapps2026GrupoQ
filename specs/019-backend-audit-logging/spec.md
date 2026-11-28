# Feature Specification: Auditoría de Web-Services y Eventos Críticos de Negocio

**Feature Branch**: `feature/logger`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "Se espera implementar auditoría de los web-services mediante un logger con la librería nestjs-pino para poder loguear timestamp, user, operación/método, parámetros, tiempoEjecucion, etc. Además de eventos como: Cuando corre el scraper, Cuando se calculan las cotizaciones, Cuando se calcula el team of the week, y Transacciones de tokens entre usuarios. Analizar la viabilidad de dichos logs teniendo en cuenta la infraestructura que ya está en producción del proyecto, la cual consiste en: API: Render (plan gratuito) con uptimerobot (disponibilidad 100%), DB: PostgreSQL en Supabase (plan gratuito), Proxies para scrapping (webshare.io), Frontend: Vercel (gratuito), Caché: Verificar si redis está a nivel local, se supone que en producción aún no está hosteado (considerar). Ante cualquier ambigüedad, preguntar al desarrollador por su decisión. También considerar que el backend ya loggea información por default, pensar si es mejor sacar esos logs y reemplazarlos por pino o no."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auditoría Estructurada de Solicitudes a los Web-Services (Priority: P1)

Como administrador u operador de la plataforma, quiero que cada solicitud relevante procesada por los web-services del backend genere un registro de auditoría estructurado con marca temporal (`timestamp`), identificador de usuario (o anónimo), operación/método invocado, parámetros sanitizados, resultado y tiempo de ejecución, para poder rastrear incidentes, diagnosticar cuellos de botella y reconstruir quién ejecutó cada acción y cuándo.

**Why this priority**: La trazabilidad de las solicitudes entrantes constituye la base de cualquier sistema de auditoría. Sin un registro uniforme y estructurado por operación, es imposible correlacionar errores reportados desde el frontend, detectar abuso o medir tiempos de respuesta reales de cada operación de negocio.

**Independent Test**: Puede probarse invocando endpoints públicos y autenticados (exitosos y con error) y verificando que cada solicitud cubierta produzca un registro estructurado único que contenga `timestamp`, identidad del usuario, operación/método, parámetros redactados, código de resultado y `tiempoEjecucion` en milisegundos.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado realiza una solicitud a un web-service auditado, **When** la operación concluye exitosamente, **Then** se emite un registro estructurado que incluye `timestamp` en formato estándar ISO-8601, identificador del usuario autenticado, método y ruta de la operación, parámetros de entrada sin datos sensibles, código de estado de respuesta y `tiempoEjecucion` en milisegundos.
2. **Given** un visitante no autenticado invoca un endpoint público auditado, **When** la operación se completa, **Then** el registro identifica explícitamente al actor como usuario anónimo e incluye el resto de los campos de auditoría obligatorios.
3. **Given** una solicitud incluye información confidencial (contraseñas, credenciales de autenticación, encabezados de autorización o tokens de sesión), **When** el sistema emite el registro de auditoría, **Then** todos los campos sensibles aparecen redactados u ocultos antes de salir del servicio, sin exponer su valor real.
4. **Given** una solicitud falla por validación de entrada, regla de negocio o error interno inesperado, **When** se devuelve la respuesta de error al cliente, **Then** se emite el registro de auditoría correspondiente indicando el nivel de severidad acorde al tipo de fallo, el código de error y el `tiempoEjecucion` hasta el fallo.

---

### User Story 2 - Auditoría de Transacciones de Tokens entre Usuarios y del Marketplace (Priority: P1)

Como responsable de cumplimiento y operaciones del marketplace, quiero disponer de registros de auditoría explícitos y estructurados cada vez que se procesa o rechaza una transacción de tokens (en especial intercambios entre usuarios en el mercado secundario, además de compras en mercado primario y creación/cancelación de órdenes de venta), para contar con una pista auditable del flujo financiero y detectar anomalías o intentos fallidos.

**Why this priority**: Las transacciones de tokens involucran saldos monetarios y transferencia de activos entre usuarios. Son el evento de mayor impacto financiero y de cumplimiento del negocio, por lo que requieren trazabilidad completa e inequívoca de participantes, cantidades, importes y resultado.

**Independent Test**: Puede probarse ejecutando una compra entre usuarios (mercado secundario), una compra primaria, la creación y cancelación de una orden de venta secundaria y un intento rechazado (por saldo insuficiente o límite de precio), y verificando que se emitan eventos de auditoría estructurados con comprador, vendedor (cuando corresponda), jugador, cantidad, precio unitario, monto total, tipo de mercado, resultado y duración.

**Acceptance Scenarios**:

1. **Given** un usuario comprador adquiere tokens de una orden de venta publicada por otro usuario (mercado secundario), **When** la transacción se liquida exitosamente, **Then** se registra un evento de auditoría estructurado con tipo de evento de transacción de tokens, mercado secundario, identificador del comprador, identificador del vendedor, identificador de la orden y transacción, identificador del jugador, cantidad de tokens, precio unitario, monto total, `timestamp` y `tiempoEjecucion`.
2. **Given** un usuario compra tokens directamente en el mercado primario, **When** la transacción se completa, **Then** se registra un evento de auditoría equivalente indicando mercado primario, comprador, jugador, cantidad, precio unitario, monto total y duración.
3. **Given** una transacción de tokens es rechazada por regla de negocio (saldo insuficiente, orden ya liquidada, auto-compra o variación excesiva de precio), **When** el sistema rechaza la operación, **Then** se registra un evento de auditoría con resultado rechazado, motivo resumido de negocio, actor solicitante y duración, sin alterar la consistencia del flujo de respuesta.
4. **Given** un usuario publica o cancela una orden de venta en el mercado secundario (de forma exitosa o rechazada por regla de negocio), **When** la operación concluye, **Then** se registra un evento de auditoría estructurado del ciclo de vida de la orden (`CREAR_VENTA` o `CANCELAR_VENTA`) indicando vendedor, orden, jugador, cantidad, precio unitario, estado de la orden, resultado, motivo en caso de rechazo y `tiempoEjecucion`.

---

### User Story 3 - Auditoría de Cálculo de Cotizaciones y Team of the Week (Priority: P1)

Como equipo de producto y operaciones, quiero que cada ejecución del cálculo/recálculo de cotizaciones de jugadores y cada cálculo del Team of the Week (ya sea disparado de forma programada o manual por un administrador) emita eventos de auditoría estructurados con su origen, estrategia o período evaluado, métricas de resumen y tiempo total de ejecución, para verificar que los procesos periódicos se ejecuten a tiempo y con datos completos.

**Why this priority**: Los cálculos de cotizaciones fijan los precios de referencia de todo el marketplace y el Team of the Week es una funcionalidad destacada semanal. Fallos silenciosos, ejecuciones omitidas o degradaciones de rendimiento impactan directamente la confianza de los usuarios y la integridad económica del sistema.

**Independent Test**: Puede probarse disparando un recálculo de cotizaciones (y un cambio de estrategia de cotización) y una generación de Team of the Week (tanto manual como automática), comprobando que se registran eventos de inicio/cierre o resumen estructurado con actor/origen, parámetros clave, contadores de resultado y `tiempoEjecucion`.

**Acceptance Scenarios**:

1. **Given** se dispara un recálculo de cotizaciones (programado o manual por un administrador), **When** el proceso finaliza exitosamente, **Then** se registra un evento de auditoría con `timestamp`, origen o usuario administrador, estrategia de cotización aplicada, cantidad de jugadores procesados, omitidos sin estadísticas y fallidos, resultado y `tiempoEjecucion`.
2. **Given** un administrador modifica la estrategia activa de cotizaciones, **When** el cambio se persiste, **Then** se registra un evento de auditoría indicando el administrador responsable, la estrategia anterior/nueva y el momento del cambio.
3. **Given** se ejecuta el cálculo del Team of the Week para una semana calendario (programado o manual), **When** el cálculo finaliza, se omite por existencia previa o falla por falta de datos suficientes, **Then** se registra un evento de auditoría estructurado con año/semana evaluada, origen/usuario, cantidad de jugadores seleccionados o motivo de omisión/fallo, resultado y `tiempoEjecucion`.

---

### User Story 4 - Auditoría de Ejecuciones del Scraper de Estadísticas (Priority: P2)

Como operador de la plataforma, quiero que cada corrida del proceso de scraping de estadísticas deportivas (iniciada por endpoint administrativo, tarea programada o proceso independiente) quede auditada con su origen, ligas objetivo, resultado por liga y global, cantidad de jugadores asociados/descartados, incidencias detectadas y `tiempoEjecucion`, protegiendo estrictamente las credenciales de los proxies utilizados.

**Why this priority**: El scraping interactúa con fuentes externas y proxies de terceros, por lo que es el proceso más propenso a bloqueos, timeouts o caídas parciales. Su auditoría permite diagnosticar fallos de ingesta sin comprometer las credenciales del servicio de proxy.

**Independent Test**: Puede probarse disparando una corrida del scraper (exitosa, con fallo parcial por liga o bloqueada por ejecución concurrente) y verificando que los registros de auditoría reporten el estado de ejecución, duración y resumen de asociación sin exponer usuarios ni contraseñas de proxy.

**Acceptance Scenarios**:

1. **Given** se inicia una corrida del scraper (manual por administrador o programada/standalone), **When** finaliza la ejecución, **Then** se emite un evento de auditoría estructurado con identificador de ejecución, disparador/usuario, ligas procesadas, tasa de asociación de jugadores, conteo de incidencias, estado final y `tiempoEjecucion`.
2. **Given** el scraper utiliza un proxy externo autenticado para navegar la fuente de datos, **When** se registra información operativa o de error relacionada con la conexión, **Then** ninguna credencial de proxy (usuario, contraseña ni cadena de conexión autenticada) aparece en texto claro en los registros.
3. **Given** se detecta una ejecución huérfana previa al iniciar el servicio o se intenta iniciar una corrida mientras otra sigue en curso, **When** el sistema resuelve la situación, **Then** queda registrado el evento de recuperación o rechazo por concurrencia con su contexto y marca temporal.

---

### User Story 5 - Viabilidad Operativa en Producción y Gestión de Logs Preexistentes (Priority: P2)

Como equipo de ingeniería que opera el sistema sobre infraestructura de capa gratuita, quiero que la estrategia de emisión, almacenamiento y consolidación de registros funcione dentro de las restricciones reales de memoria, CPU, almacenamiento efímero y cuota de base de datos, evitando la saturación por sondeos automáticos de disponibilidad o por la ausencia actual de caché distribuida en producción.

**Why this priority**: Una auditoría mal dimensionada en planes gratuitos puede agotar la cuota de almacenamiento de la base de datos, consumir memoria excesiva junto al scraper o inundar la consola de producción con cientos de advertencias irrelevantes que ocultan los verdaderos eventos de auditoría.

**Independent Test**: Puede probarse simulando un entorno de producción sin servidor de caché disponible y con sondeos periódicos de salud, verificando que el volumen de registros se mantiene acotado, el formato es consistente, no se degrada la respuesta de las operaciones y no se genera ruido repetitivo por la ausencia de caché.

**Acceptance Scenarios**:

1. **Given** la aplicación corre en producción sin servicio de caché Redis configurado ni provisionado, **When** los usuarios operan sobre el marketplace o el catálogo, **Then** el sistema mantiene su degradación controlada hacia la base de datos y suprime por completo las alertas o advertencias de caché no implementada/no disponible, evitando inundar los registros de auditoría.
2. **Given** el sistema recibe tráfico periódico de monitoreo de disponibilidad y recolección de métricas, **When** esos sondeos se ejecutan continuamente, **Then** su registro se gestiona conforme a la política de filtrado definida para no opacar los eventos de negocio ni inflar innecesariamente el volumen de auditoría.
3. **Given** existen múltiples servicios en el backend que ya emiten mensajes operativos por defecto, **When** se integra la nueva capa de auditoría estructurada, **Then** el tratamiento de dichos mensajes previos sigue una política uniforme y explícita que evita duplicación caótica o formatos mezclados en la salida de producción.

---

### Edge Cases

- ¿Qué ocurre si una operación de auditoría falla al serializar un parámetro complejo o un objeto con referencias circulares? El fallo de registro no debe interrumpir ni hacer fallar la operación de negocio ni la respuesta HTTP al cliente.
- ¿Qué ocurre si un payload de solicitud es muy grande o contiene campos anidados sensibles (por ejemplo, `password`, `contrasena`, `authorization`, `cookie`, `token`, credenciales de proxy)? Los campos sensibles deben redactarse de forma recursiva y los payloads extensos deben truncarse o resumirse para evitar picos de memoria en el entorno de producción con recursos limitados.
- ¿Qué ocurre si una petición HTTP falla antes de pasar por la capa de autenticación (por ejemplo, token expirado o ruta inexistente `404`)? El registro debe generarse igual identificando al usuario como no autenticado/anónimo, el código de error correspondiente y el `tiempoEjecucion`.
- ¿Qué ocurre si el scraper se ejecuta desde el script independiente fuera del ciclo HTTP? Debe emitir exactamente el mismo esquema de evento de auditoría de negocio indicando el origen programado/standalone.
- ¿Qué ocurre si el entorno de producción no tiene configurado el servidor de caché Redis? La aplicación debe operar en degradación controlada hacia la base de datos suprimiendo por completo las alertas y advertencias de Redis no disponible/no configurado en producción, manteniendo intacto el comportamiento normal cuando Redis sí está configurado en desarrollo local o inyectado en pruebas automatizadas.
- ¿Qué ocurre con las trazas de solicitudes emitidas desde el frontend hospedado externamente? Cada solicitud debe contar con un identificador de correlación único (aceptando uno entrante si existe o generando uno nuevo) para poder vincular el registro HTTP con los eventos de negocio disparados durante esa misma petición.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST registrar en formato estructurado (JSON en producción y formato legible opcional en desarrollo local) los eventos de auditoría de solicitudes web-service incluyendo como mínimo: `timestamp` (ISO-8601), identificador de correlación (`requestId`), usuario (`usuario.id`, rol y email si está autenticado, o indicador de anónimo), operación/método (método HTTP y ruta/operación), parámetros de entrada sanitizados, código de estado de respuesta y `tiempoEjecucion` en milisegundos.
- **FR-002**: El sistema MUST auditar todas las solicitudes HTTP dirigidas a rutas funcionales de negocio capturando parámetros de ruta, consulta y cuerpo sanitizados, y MUST excluir de la auditoría estándar (o registrar únicamente en nivel de depuración) las rutas técnicas de infraestructura y documentación (`/health/*`, `/metrics` y `/api/docs*`) para evitar el ruido generado por sondeos continuos de disponibilidad y consultas periódicas de monitoreo.
- **FR-003**: El sistema MUST redactar y ocultar automáticamente antes de la emisión cualquier dato sensible presente en encabezados, parámetros, cuerpos de solicitud o errores, incluyendo como mínimo: encabezados `Authorization` y `Cookie`, campos de contraseña (`password`, `contrasena`, `passwordHash`), tokens de acceso/JWT y credenciales de proxies externos.
- **FR-004**: El sistema MUST emitir un evento de auditoría de negocio estructurado cada vez que se ejecute o rechace una transacción de tokens (mercado secundario entre usuarios y mercado primario), incluyendo `timestamp`, tipo de evento, mercado (`PRIMARIO` / `SECUNDARIO`), `compradorId`, `vendedorId` (cuando aplique), `transaccionId`, `ordenId`, `jugadorId`, `cantidad`, `precioUnitario`, `montoTotal`, `resultado`, motivo en caso de rechazo y `tiempoEjecucion`, así como cada vez que se cree o cancele (o rechace) una orden de venta en el mercado secundario (`vendedorId`, `ordenId`, `jugadorId`, `cantidad`, `precioUnitario`, `estadoOrden`, `resultado`, `motivo` y `tiempoEjecucion`).
- **FR-005**: El sistema MUST emitir un evento de auditoría de negocio estructurado cada vez que se ejecute un cálculo/recálculo de cotizaciones (programado o manual) o un cambio de estrategia de cotización, incluyendo `timestamp`, disparador o usuario responsable, estrategia aplicada, resumen de jugadores evaluados (procesados, sin estadísticas, fallidos), resultado y `tiempoEjecucion`.
- **FR-006**: El sistema MUST emitir un evento de auditoría de negocio estructurado cada vez que se ejecute el cálculo del Team of the Week (programado o manual), incluyendo `timestamp`, disparador o usuario responsable, año y semana ISO evaluados, resultado (generado, omitido, fallido), cantidad de miembros o motivo, y `tiempoEjecucion`.
- **FR-007**: El sistema MUST emitir eventos de auditoría de negocio estructurados para cada ejecución del scraper de estadísticas (vía API administrativa, proceso programado o ejecución standalone), incluyendo: (a) evento global con `timestamp`, identificador de ejecución, disparador o usuario responsable, ligas procesadas, tasa de asociación, conteo de incidencias, estado final y `tiempoEjecucion`; (b) evento por liga procesada con jugadores descubiertos, deduplicados, asociados, descartados, tasa de asociación, incidencias y rechazo por cobertura; y (c) eventos de recuperación de ejecuciones huérfanas/atascadas y rechazos por concurrencia, garantizando en todos los casos la no exposición de credenciales de proxy.
- **FR-008**: El sistema MUST emitir todos los registros de auditoría (solicitudes de web-services y eventos críticos de negocio) en formato estructurado JSON hacia la salida estándar (`stdout`) sin escribir archivos en disco local ni persistir trazas HTTP en la base de datos relacional, apoyándose en las tablas de dominio ya existentes como respaldo histórico persistente de negocio para proteger la cuota gratuita de base de datos y los recursos de la instancia productiva.
- **FR-009**: El sistema MUST adoptar el nuevo mecanismo de registro estructurado como logger global unificado de la aplicación para enrutar automáticamente todos los registros operativos preexistentes de los servicios hacia una salida JSON homogénea, reemplazar los mensajes directos por consola del arranque del servidor y emitir los nuevos eventos de auditoría sin refactorizar manualmente los servicios ni alterar contratos de pruebas existentes.
- **FR-010**: El sistema MUST suprimir por completo las alertas y advertencias operativas por ausencia de caché distribuida (Redis) cuando dicho servicio no esté configurado o habilitado en el entorno de producción, preservando la degradación controlada hacia la base de datos y manteniendo el registro normal de fallos cuando la caché sí se encuentre configurada explícitamente o en entornos de prueba.
- **FR-011**: El sistema MUST garantizar que ningún fallo en la emisión, formateo o despacho de registros de auditoría interrumpa, supere el presupuesto de latencia de `SC-004` (`< 5 ms` promedio) ni altere el resultado funcional de las operaciones de negocio o respuestas HTTP.
- **FR-012**: El sistema MUST mantener intacta la retrocompatibilidad con toda la suite de pruebas existente (Política de Inmutabilidad de Tests) e incorporar pruebas unitarias y de integración que verifiquen la emisión, estructura, redacción de datos sensibles y cálculo de `tiempoEjecucion` de los registros de auditoría.

### Key Entities

- **Registro de Auditoría de Web-Service**: Representa el rastro completo de una invocación HTTP. Contiene `timestamp`, identificador de correlación (`requestId`), actor (`usuario.id`, email, rol o anónimo), operación (`metodo`, `ruta`, `controlador`), `parametros` sanitizados, `codigoEstado`, `tiempoEjecucion` (ms) y nivel de severidad.
- **Evento de Auditoría de Negocio**: Representa un hito auditable del dominio (transacción de tokens, recálculo de cotizaciones, generación de Team of the Week o ejecución de scraping). Contiene `timestamp`, nombre estandarizado del evento, identificador de correlación (cuando se origina en una petición HTTP), disparador/actor, metadatos específicos del dominio, resultado (`exito`, `rechazado`, `omitido`, `fallido`) y `tiempoEjecucion` (ms).
- **Política de Sanitización y Filtrado**: Conjunto de reglas que determina qué campos deben redactarse por confidencialidad, qué rutas técnicas se excluyen o degradan de nivel para controlar volumen y qué nivel mínimo de registro aplica por entorno (desarrollo, pruebas, producción).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las solicitudes web-service incluidas en el alcance generan exactamente un registro de auditoría estructurado con todos los campos obligatorios (`timestamp`, usuario, operación/método, parámetros sanitizados, resultado y `tiempoEjecucion`).
- **SC-002**: El 100% de las ejecuciones de los cuatro procesos críticos de negocio (scraper, cálculo de cotizaciones, cálculo de Team of the Week y transacciones de tokens) generan su evento de auditoría estructurado correspondiente, tanto en resultados exitosos como en rechazos o fallos.
- **SC-003**: El 0% de los registros emitidos expone credenciales sensibles en texto claro (contraseñas, encabezados de autorización, tokens de sesión o credenciales de proxy) bajo pruebas automatizadas de sanitización.
- **SC-004**: La incorporación de la auditoría no incrementa el tiempo de respuesta promedio de las operaciones web-service en más de 5 ms ni compromete la estabilidad de memoria de la instancia productiva en plan gratuito.
- **SC-005**: En producción sin servicio de caché configurado y con monitoreo continuo de disponibilidad activo, se emiten 0 alertas/advertencias por ausencia de caché no implementada y el volumen total de ruido técnico por sondeos de infraestructura se reduce en al menos un 90% respecto a un registro sin filtrado.
- **SC-006**: El 100% de los tests preexistentes continúa pasando sin modificaciones, y el código nuevo incorporado alcanza al menos un 80% de cobertura en líneas y bifurcaciones.

## Assumptions

- **Hallazgo verificado sobre caché (Redis)**: En el repositorio actual, Redis está provisto únicamente a nivel local mediante contenedor de desarrollo y configuración por defecto a `127.0.0.1:6379`. En el backend, la capa de caché ya implementa degradación controlada hacia PostgreSQL, pero actualmente emite una advertencia (`WARN`) en cada lectura, escritura o invalidación fallida cuando Redis no está hosteado en producción. Por decisión explícita del desarrollador, dichas alertas por Redis no implementado deben suprimirse en producción cuando Redis no esté configurado/habilitado, manteniendo intacta la degradación controlada y los tests existentes donde Redis sí se utiliza o simula.
- **Viabilidad en Render (plan gratuito) + UptimeRobot**: La instancia productiva gratuita posee recursos acotados (~512 MB RAM, CPU compartida limitada, sistema de archivos efímero y retención breve de logs en consola sin Log Streams gratuitos). Por ello, escribir logs a archivos locales en disco NO es viable (se pierden en reinicios/despliegues y consumen espacio/IO), y formatear logs con salida embellecida en producción no es recomendable por consumo innecesario de CPU; la emisión JSON estructurada y asíncrona a salida estándar (`stdout`) sí es altamente viable y de bajísimo overhead. Además, UptimeRobot realiza aproximadamente ~8.600 peticiones mensuales de keep-alive que conviene filtrar para evitar ruido.
- **Viabilidad en Supabase PostgreSQL (plan gratuito)**: La cuota gratuita de base de datos es de 500 MB de almacenamiento y conexiones acotadas. Por ello, persistir cada solicitud HTTP en PostgreSQL NO es viable a mediano plazo (agotaría cuota y agregaría contención de conexiones). En cambio, las tablas transaccionales ya existentes (`transacciones`, `ejecuciones_scraping`, `cotizaciones`, `equipos_semanales`) ya ofrecen trazabilidad histórica del negocio.
- **Viabilidad con Proxies Webshare.io y Frontend Vercel**: Los proxies utilizados por el scraper manejan credenciales sensibles que deben quedar protegidas por políticas de redacción en el logger. El frontend alojado en Vercel no requiere cambios obligatorios para habilitar la auditoría backend, aunque puede beneficiarse de encabezados de correlación de solicitudes (`x-request-id`) si se incorporan en el futuro.
- **Transacciones de tokens**: Salvo indicación en contrario, los eventos de auditoría de transacciones cubren tanto las transferencias entre usuarios (mercado secundario) como las emisiones/compras en mercado primario, diferenciándolas explícitamente por campo de tipo de mercado.
- **Sin cambios de contrato API REST**: Esta funcionalidad es transversal de observabilidad/auditoría interna del backend y no modifica contratos de endpoints existentes ni requiere cambios en la colección de Postman (lo cual se verificará explícitamente al implementar).
