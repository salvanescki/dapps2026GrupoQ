# Feature Specification: Backend Observability, Domain Metrics & Health Checks

**Feature Branch**: `017-backend-observability`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Implementar observabilidad, métricas de dominio y health checks en el backend de Football Player Token Marketplace utilizando @willsoto/nestjs-prometheus, prom-client y @nestjs/terminus."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Métricas del Marketplace y Trading (Priority: P1)

El equipo de operaciones accede al endpoint de métricas para monitorizar en tiempo real el volumen de operaciones del marketplace: órdenes de compra/venta creadas, transacciones ejecutadas, volumen monetario procesado, latencia de liquidación, rechazos por slippage y órdenes de venta activas. Esto permite detectar anomalías operativas (caídas de volumen, picos de latencia, acumulación de rechazos) antes de que impacten a los usuarios finales.

**Why this priority**: Las métricas de trading son la columna vertebral de la observabilidad del negocio. Sin visibilidad sobre las operaciones del marketplace, es imposible detectar degradaciones de servicio, cuellos de botella en la liquidación o comportamientos anómalos en el flujo de compra/venta que afecten directamente los ingresos y la experiencia del usuario.

**Independent Test**: Puede testearse ejecutando operaciones de compra y venta en el marketplace y verificando que el endpoint de métricas refleja los contadores, histogramas y gauges actualizados con los valores correspondientes.

**Acceptance Scenarios**:

1. **Given** el sistema está en ejecución, **When** un operador accede al endpoint de métricas, **Then** se exponen contadores para órdenes totales desglosadas por tipo (compra/venta), mercado (primario/secundario) y estado.
2. **Given** se ejecuta una transacción de compra exitosa, **When** se consultan las métricas, **Then** el contador de transacciones totales se incrementa en 1, discriminando el mercado y la versión de la estrategia de pricing.
3. **Given** se procesan múltiples órdenes, **When** se consulta el volumen monetario, **Then** el contador acumulado en centavos refleja la suma de los montos operados, desglosado por mercado.
4. **Given** una orden pasa por el flujo de liquidación, **When** se consultan las métricas, **Then** un histograma registra la duración del proceso de settlement con buckets adecuados para latencias típicas.
5. **Given** una orden es rechazada por exceder el umbral de slippage, **When** se consultan las métricas, **Then** el contador de rechazos por slippage se incrementa.
6. **Given** existen órdenes de venta pendientes, **When** se consultan las métricas, **Then** un gauge refleja la cantidad actual de órdenes de venta activas.

---

### User Story 2 - Métricas de Cotizaciones y Precios (Priority: P1)

El equipo de producto y operaciones monitoriza el proceso de recalculación de cotizaciones de jugadores: cuántas recalculaciones se ejecutaron, su duración, cuántos jugadores fueron evaluados (procesados, sin estadísticas o fallidos) y qué estrategia de pricing está activa. Esto permite garantizar la integridad del motor de precios y detectar degradaciones en la calidad de los datos de entrada.

**Why this priority**: El sistema de cotizaciones es un componente crítico del negocio. Una degradación silenciosa (recalculaciones lentas, jugadores sin estadísticas no detectados, estrategia incorrecta activa) puede distorsionar los precios de los tokens y generar pérdidas financieras o desconfianza de los usuarios.

**Independent Test**: Puede testearse disparando un ciclo de recalculación de cotizaciones y verificando que las métricas registran la cantidad de ejecuciones, duración, jugadores evaluados por categoría y la estrategia activa.

**Acceptance Scenarios**:

1. **Given** se ejecuta un ciclo de recalculación de cotizaciones, **When** se consultan las métricas, **Then** el contador de recalculaciones se incrementa indicando la estrategia utilizada y el resultado (éxito/fallo).
2. **Given** un ciclo de recalculación procesa jugadores, **When** se consultan las métricas, **Then** el contador de jugadores evaluados se incrementa desglosado por categoría: procesados, sin estadísticas y fallidos.
3. **Given** el ciclo de recalculación toma un tiempo variable, **When** se consultan las métricas, **Then** un histograma registra la duración de cada recalculación con buckets apropiados.
4. **Given** una estrategia de pricing está activa, **When** se consultan las métricas, **Then** un gauge indica la estrategia vigente.

---

### User Story 3 - Métricas de Scraping WhoScored / Playwright (Priority: P2)

El equipo de operaciones monitoriza las ejecuciones del scraper de WhoScored: cantidad de ejecuciones por estado (exitoso, fallido, recuperada de atasco), duración por liga, tasa de asociación de jugadores extraídos vs. catálogo interno e incidentes. Esto permite detectar bloqueos, cambios en el sitio fuente o degradaciones en la calidad de datos de entrada que alimentan las cotizaciones.

**Why this priority**: El scraping es un proceso frágil por naturaleza (dependencia de sitios externos, navegación con Playwright/Chromium). Tener visibilidad sobre sus ejecuciones es crítico para actuar proactivamente ante fallos, pero su impacto es indirecto (alimenta cotizaciones), por lo que se prioriza ligeramente por debajo de las métricas de trading y cotizaciones.

**Independent Test**: Puede testearse ejecutando un ciclo de scraping y verificando que las métricas registran el estado de la ejecución, la duración por liga, la tasa de asociación y los incidentes.

**Acceptance Scenarios**:

1. **Given** se ejecuta un ciclo de scraping, **When** se consultan las métricas, **Then** el contador de ejecuciones se incrementa con la etiqueta del estado correspondiente (exitoso, fallido, recuperada de atasco).
2. **Given** un scraping se completa para una liga específica, **When** se consultan las métricas, **Then** un histograma registra la duración de la ejecución etiquetada con la liga (PL, PD, SA, BL1, FL1).
3. **Given** se realiza la asociación de jugadores extraídos con el catálogo, **When** se consultan las métricas, **Then** un gauge refleja la tasa de asociación actualizada.
4. **Given** ocurre un incidente durante el scraping, **When** se consultan las métricas, **Then** el contador de incidentes se incrementa con el tipo correspondiente.

---

### User Story 4 - Métricas de Integraciones Externas, Schedulers y Seguridad (Priority: P2)

El equipo de operaciones monitoriza las interacciones con la API Football-Data (requests por endpoint/status, rate limit restante), las generaciones de Team of the Week, el rendimiento del sistema de caché (hits/misses y degradaciones por fallback) y el flujo de autenticación (intentos y duración del hashing). Esto proporciona una vista integral de la salud de las dependencias externas y procesos auxiliares.

**Why this priority**: Estas métricas complementan las operativas principales y permiten detectar problemas en capas de soporte (caché, APIs externas, autenticación) que, aunque no son el núcleo del negocio, pueden degradar la experiencia cuando fallan.

**Independent Test**: Puede testearse realizando llamadas a la API Football-Data, ejecutando una generación de Team of the Week, provocando hits y misses de caché y realizando intentos de login, y verificando que las métricas correspondientes se actualizan.

**Acceptance Scenarios**:

1. **Given** el sistema realiza una petición a la API Football-Data, **When** se consultan las métricas, **Then** el contador de requests se incrementa con el endpoint y el código HTTP de respuesta, y un gauge refleja el rate limit restante.
2. **Given** se genera un Team of the Week, **When** se consultan las métricas, **Then** el contador de generaciones se incrementa con el estado (éxito/fallo) y un histograma registra la duración.
3. **Given** se realizan consultas al sistema de caché, **When** se consultan las métricas, **Then** el contador de requests de caché se incrementa desglosado por dominio y resultado (hit/miss), y las degradaciones por fallback se contabilizan.
4. **Given** un usuario intenta autenticarse, **When** se consultan las métricas, **Then** el contador de intentos de autenticación se incrementa con el estado del resultado y un histograma registra la duración de la operación de hashing.

---

### User Story 5 - Health Check de Readiness (Priority: P1)

Un orquestador de contenedores o balanceador de carga consulta la sonda de readiness para determinar si la instancia del backend está preparada para recibir tráfico. La sonda verifica la conectividad con la base de datos PostgreSQL, la disponibilidad de Redis y la accesibilidad de la API Football-Data. Mientras alguna de estas dependencias no esté disponible, la instancia no recibe tráfico nuevo, evitando errores en cascada.

**Why this priority**: Sin una sonda de readiness, las instancias que arrancan sin conectividad a PostgreSQL o Redis recibirían tráfico y generarían errores masivos. Es un requisito fundamental para cualquier despliegue en contenedores y directamente vinculado a la disponibilidad del servicio.

**Independent Test**: Puede testearse consultando el endpoint de readiness con todas las dependencias activas (respuesta saludable) y luego desconectando cada dependencia individualmente para verificar que la sonda reporta no disponible.

**Acceptance Scenarios**:

1. **Given** PostgreSQL, Redis y la API Football-Data están operativos, **When** se consulta la sonda de readiness, **Then** el endpoint responde con estado saludable e indica el estado individual de cada dependencia.
2. **Given** PostgreSQL no está disponible, **When** se consulta la sonda de readiness, **Then** el endpoint responde con estado no saludable indicando que la base de datos es el componente fallido.
3. **Given** Redis no está disponible, **When** se consulta la sonda de readiness, **Then** el endpoint responde con estado no saludable indicando que la caché es el componente fallido.
4. **Given** la API Football-Data no responde, **When** se consulta la sonda de readiness, **Then** el endpoint responde con estado no saludable indicando que la integración externa es el componente fallido.

---

### User Story 6 - Health Check de Liveness (Priority: P1)

Un orquestador de contenedores consulta la sonda de liveness para detectar si la instancia del backend se encuentra en un estado irrecuperable (fuga de memoria provocada por procesos Chromium de Playwright, por ejemplo). La sonda verifica que el uso de memoria Heap esté por debajo de 300 MB y el RSS por debajo de 1 GB. Si se exceden estos umbrales, el orquestador reinicia la instancia, previniendo degradación progresiva.

**Why this priority**: Las fugas de memoria generadas por Playwright/Chromium pueden llevar la instancia a un estado irrecuperable sin que existan errores visibles. La sonda de liveness es la última línea de defensa contra este tipo de degradación silenciosa.

**Independent Test**: Puede testearse consultando el endpoint de liveness en condiciones normales (respuesta saludable) y simulando alta presión de memoria para verificar que la sonda reporta estado no saludable cuando se superan los umbrales.

**Acceptance Scenarios**:

1. **Given** el uso de memoria Heap está por debajo de 300 MB y el RSS por debajo de 1 GB, **When** se consulta la sonda de liveness, **Then** el endpoint responde con estado saludable.
2. **Given** el uso de memoria Heap supera los 300 MB, **When** se consulta la sonda de liveness, **Then** el endpoint responde con estado no saludable indicando exceso de Heap.
3. **Given** el uso de memoria RSS supera 1 GB, **When** se consulta la sonda de liveness, **Then** el endpoint responde con estado no saludable indicando exceso de RSS.

---

### Edge Cases

- ¿Qué sucede si el endpoint de métricas es consultado antes de que se haya registrado cualquier operación en el sistema? Las métricas deben existir con valor inicial 0 (contadores/histogramas) o reflejar el estado actual (gauges).
- ¿Qué sucede si un servicio instrumentado lanza una excepción durante la recolección de una métrica? La excepción de la métrica no debe afectar el flujo de negocio principal.
- ¿Qué sucede si Redis se desconecta entre la verificación de readiness y la siguiente solicitud? El sistema reporta no disponible en el siguiente chequeo.
- ¿Qué sucede si la API Football-Data responde con timeout durante el health check? La sonda debe respetar un timeout configurable y reportar no disponible si se excede.
- ¿Qué sucede si el proceso Chromium de Playwright consume memoria entre los intervalos de liveness? La sonda detecta el exceso en la siguiente consulta y reporta no saludable.
- ¿Qué sucede si múltiples instancias del backend exponen métricas simultáneamente? Cada instancia expone sus propias métricas de forma independiente sin colisiones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer un endpoint de métricas que presente todas las métricas estándar del runtime (event loop lag, uso de CPU, memoria, handles activos) y las métricas de dominio personalizadas en formato Prometheus.
- **FR-002**: El sistema MUST registrar un contador de órdenes del marketplace que se incremente con cada orden creada, etiquetado por tipo de operación (compra/venta), tipo de mercado (primario/secundario) y estado.
- **FR-003**: El sistema MUST registrar un contador de transacciones del marketplace que se incremente con cada transacción ejecutada, etiquetado por mercado y versión de la estrategia de pricing.
- **FR-004**: El sistema MUST registrar un contador de volumen monetario en centavos del marketplace que se incremente con el monto de cada operación, etiquetado por mercado.
- **FR-005**: El sistema MUST registrar un histograma de duración de liquidación de órdenes que capture la latencia del proceso de settlement, incluyendo el tiempo de locks pesimistas.
- **FR-006**: El sistema MUST registrar un contador de rechazos por slippage que se incremente cada vez que una orden es rechazada por exceder el umbral de tolerancia de precio.
- **FR-007**: El sistema MUST registrar un gauge de órdenes de venta activas que refleje la cantidad actual de órdenes de venta pendientes en el marketplace.
- **FR-008**: El sistema MUST registrar un contador de recalculaciones de cotizaciones etiquetado por estrategia y estado (éxito/fallo).
- **FR-009**: El sistema MUST registrar un histograma de duración de recalculación de cotizaciones.
- **FR-010**: El sistema MUST registrar un contador de jugadores evaluados durante recalculaciones, etiquetado por categoría (procesados, sin estadísticas, fallidos).
- **FR-011**: El sistema MUST registrar un gauge que indique la estrategia de cotización activa.
- **FR-012**: El sistema MUST registrar un contador de ejecuciones de scraping etiquetado por estado (exitoso, fallido, atascada recuperada).
- **FR-013**: El sistema MUST registrar un histograma de duración de ejecución de scraping etiquetado por liga.
- **FR-014**: El sistema MUST registrar un gauge de tasa de asociación de jugadores extraídos del scraping vs. catálogo interno.
- **FR-015**: El sistema MUST registrar un contador de incidentes de scraping etiquetado por tipo.
- **FR-016**: El sistema MUST registrar un contador de peticiones a la API Football-Data etiquetado por endpoint y código HTTP de respuesta, y un gauge del rate limit restante.
- **FR-017**: El sistema MUST registrar un contador de generaciones de Team of the Week etiquetado por estado (éxito/fallo) y un histograma de duración de generación.
- **FR-018**: El sistema MUST registrar un contador de requests al sistema de caché etiquetado por dominio y resultado (hit/miss), y un contador de degradaciones por fallback.
- **FR-019**: El sistema MUST registrar un contador de intentos de autenticación etiquetado por estado y un histograma de duración de la operación de hashing de contraseñas.
- **FR-020**: El sistema MUST exponer un endpoint de sonda de readiness que verifique la conectividad con PostgreSQL, Redis y la API Football-Data, y responda con estado saludable solo cuando todas las dependencias estén operativas.
- **FR-021**: El sistema MUST exponer un endpoint de sonda de liveness que verifique el uso de memoria Heap (umbral < 300 MB) y RSS (umbral < 1 GB), y responda con estado no saludable cuando alguno de los umbrales se supere.
- **FR-022**: El sistema MUST organizar la funcionalidad de métricas y health checks en módulos desacoplados e independientes del resto de la lógica de negocio.
- **FR-023**: La instrumentación de los servicios existentes MUST realizarse mediante inyección de dependencias o interceptores, sin acoplar la lógica de dominio pura a la infraestructura de métricas.
- **FR-024**: El sistema MUST garantizar que un fallo en la recolección o registro de una métrica no interrumpa ni degrade el flujo de negocio principal.
- **FR-025**: El sistema MUST incluir pruebas unitarias y de integración que verifiquen el registro correcto de métricas y el comportamiento de los endpoints de métricas, readiness y liveness.

### Key Entities

- **Métrica**: Representación de un punto de datos observacional del sistema. Tiene un nombre, un tipo (counter, gauge, histogram), etiquetas dimensionales y un valor numérico. Registra eventos y estados operacionales del dominio.
- **Sonda de Salud (Health Check)**: Verificación activa del estado de una dependencia o recurso del sistema. Tiene un nombre, un indicador de estado (saludable/no saludable), un detalle del componente verificado y opcionalmente un umbral de referencia.
- **Indicador de Dependencia**: Componente externo que la sonda verifica. Incluye base de datos, caché y servicios de terceros. Cada indicador evalúa su disponibilidad de forma independiente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los operadores pueden consultar el estado de todas las métricas de dominio (trading, cotizaciones, scraping, integraciones, caché y autenticación) en una única solicitud al endpoint de métricas, en menos de 2 segundos.
- **SC-002**: La sonda de readiness detecta correctamente la indisponibilidad de cualquiera de las tres dependencias (base de datos, caché, API externa) en menos de 5 segundos tras la desconexión.
- **SC-003**: La sonda de liveness detecta correctamente el exceso de uso de memoria por encima de los umbrales definidos y responde con estado no saludable.
- **SC-004**: La instrumentación de métricas no incrementa la latencia promedio de las operaciones de negocio en más de 5 ms.
- **SC-005**: Todas las métricas se inicializan con valores base al arrancar el sistema, sin requerir que ocurra un evento previo para que el endpoint las exponga.
- **SC-006**: Un fallo en la recolección de métricas no causa errores visibles para el usuario final ni interrumpe las transacciones del marketplace.
- **SC-007**: La suite de pruebas de observabilidad (unitarias e integración) alcanza al menos un 80% de cobertura sobre el código nuevo introducido.

## Assumptions

- Los servicios existentes a instrumentar (OmsService, QuotesService, ScrapingService, SincronizacionJugadoresService, BaseRedisCacheService, AuthService) ya están implementados y funcionando; esta feature los extiende sin modificar su lógica de dominio.
- El backend ya cuenta con conectividad a PostgreSQL y Redis configurada y operativa.
- La API Football-Data ya tiene configurada una API key y es accesible desde el entorno de ejecución del backend.
- Los umbrales de memoria para la sonda de liveness (Heap < 300 MB, RSS < 1 GB) son adecuados para el entorno de producción actual y pueden ajustarse mediante configuración si es necesario.
- Las métricas serán consumidas por un stack de monitorización externo (Prometheus + Grafana u otro) cuya configuración está fuera del alcance de esta feature.
- La exposición del endpoint de métricas es interna y no requiere autenticación adicional; la protección se gestiona a nivel de infraestructura de red.
- Los histogramas utilizarán buckets por defecto razonables para los rangos de latencia observados, pudiendo ajustarse en configuración futura.
