# Feature Specification: Panel de Observabilidad y Monitoreo en Tiempo Real para Administradores

**Feature Branch**: `feat/observability`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Con la observabilidad ya implementada en el backend (módulo de métricas Prometheus en /metrics y health checks Terminus en /health/ready y /health/live), necesitamos implementar en el frontend una vista de observabilidad interactiva y en tiempo real a la que únicamente pueda acceder el superusuario/administrador (rol 'ADMIN'). La vista debe presentar las métricas del sistema y del negocio organizadas en dashboards visuales mediante gráficos (shadcn chart / Recharts) e indicadores de estado. Alcance y Requisitos Funcionales Clave: 1. Control de Acceso y Navegación: Acceso restringido exclusivamente a usuarios autenticados con rol 'ADMIN' utilizando la infraestructura existente (AdminRoute y ProtectedRoute). Si un usuario no autenticado intenta acceder, debe redirigirse al login (/login). Si un usuario con rol 'USUARIO' intenta acceder, debe denegarse el acceso y redirigirse a la vista principal con advertencia de seguridad. Añadir enlace de navegación a la vista de observabilidad en el header/navbar (navegacion.ts), visible única y exclusivamente para usuarios con rol 'ADMIN'. 2. Visualización de Métricas de Negocio y Dominio (mediante componentes gráficos shadcn / Recharts): Métricas de Marketplace y Trading: volumen de operaciones, órdenes creadas desglosadas por tipo (compra/venta) y mercado (primario/secundario), transacciones ejecutadas, volumen transaccionado en centavos, latencia de settlement e indicador de órdenes de venta activas. Métricas de Cotizaciones (Pricing): ejecuciones de recálculo masivo (exitosas vs fallidas), duración de recálculos, jugadores evaluados (procesados, sin estadísticas, fallidos) y estrategia activa. Métricas de Scraping (WhoScored / Playwright): historial de ejecuciones por estado, duración promedio por liga, tasa de asociación con el catálogo e incidentes. Métricas de Integraciones, Cache y Seguridad: solicitudes a API Football-Data y rate limit restante, estado de Team of the Week, ratio de cache hits/misses en Redis, e intentos/latencia de autenticación. 3. Sondas de Salud e Infraestructura (Health Checks): Tarjetas de estado visual para el Readiness Probe (/health/ready): conectividad en tiempo real de PostgreSQL, Redis y API Football-Data. Tarjetas de estado para el Liveness Probe (/health/live): consumo de memoria Heap y RSS contra sus umbrales operativos. 4. Controles de Operabilidad en UI: Botón de refresco manual instantáneo. Selector de auto-actualización (polling periódico configurable: pausado, 5s, 10s, 30s) con indicador de última sincronización. Manejo de estados de carga (skeletons/spinners) y estados de error con mensajes comprensibles si el backend o algún endpoint no responde."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control de Acceso y Navegación Exclusiva para Administradores (Priority: P1)

Como superusuario o administrador del sistema,  
quiero acceder a una vista dedicada de observabilidad y monitoreo desde la barra de navegación principal y a través de una ruta protegida exclusiva, garantizando que los usuarios no autenticados o con rol estándar no puedan visualizar la información técnica ni los indicadores de negocio,  
para salvaguardar la confidencialidad de la telemetría operativa y contar con un punto de entrada confiable para la supervisión de la plataforma.

**Why this priority**: Es la base de seguridad y gobierno de la funcionalidad. La telemetría expone métricas sensibles de volumen transaccional, cuotas de APIs de terceros y salud de la infraestructura; permitir el acceso no autorizado representaría una vulnerabilidad de información crítica.

**Independent Test**: Puede probarse de forma aislada intentando acceder a la ruta del panel de observabilidad en tres escenarios: como visitante no autenticado (verificando redirección al login), como usuario autenticado con rol estándar 'USUARIO' (verificando bloqueo, redirección al inicio y despliegue de advertencia de seguridad), y como usuario con rol 'ADMIN' (verificando navegación exitosa y visibilidad del enlace en la barra de navegación).

**Acceptance Scenarios**:

1. **Given** un visitante que no ha iniciado sesión, **When** intenta ingresar de forma directa a la ruta de observabilidad (`/admin/observability`), **Then** el sistema interrumpe el acceso y lo redirige a la pantalla de inicio de sesión (`/login`), sin renderizar ningún dato del sistema.
2. **Given** un usuario autenticado con rol estándar (`USUARIO`), **When** intenta ingresar a la ruta de observabilidad (`/admin/observability`), **Then** el sistema bloquea el acceso de inmediato, lo redirige a la vista principal (`/`) y despliega una notificación visible de advertencia de seguridad en español informando que el acceso es exclusivo para administradores.
3. **Given** un usuario autenticado con rol `ADMIN`, **When** examina la barra de navegación superior, **Then** visualiza un enlace directo hacia la vista de Observabilidad junto con los demás enlaces del sistema.
4. **Given** un usuario autenticado con rol estándar (`USUARIO`) o un visitante no autenticado, **When** examina la barra de navegación, **Then** el enlace hacia Observabilidad permanece completamente oculto e inaccesible.
5. **Given** un usuario autenticado con rol `ADMIN`, **When** pulsa el enlace de Observabilidad en el menú de navegación, **Then** el sistema carga y renderiza de inmediato el panel de observabilidad interactivo.

---

### User Story 2 - Monitoreo Visual de Salud de Servicios e Infraestructura (Readiness y Liveness) (Priority: P1)

Como administrador del sistema,  
quiero visualizar tarjetas de estado e indicadores en tiempo real sobre la salud de los servicios de persistencia, almacenamiento temporal y APIs externas, así como los niveles de memoria de ejecución del servidor frente a sus límites operativos,  
para identificar de inmediato si algún componente crítico está degradado o fuera de línea antes de que los usuarios experimenten indisponibilidad.

**Why this priority**: La verificación de salud (sondas de preparación y vitalidad) es el primer indicador ante una emergencia técnica. Sin ella, el equipo de administración desconoce si la base de datos relacional, la capa de caché o la memoria del servidor se encuentran en estado crítico.

**Independent Test**: Puede probarse cargando el panel de observabilidad y verificando que el bloque de salud exhibe con claridad el estado de cada servicio externo y de almacenamiento (activo/inactivo/degradado), así como los indicadores de memoria de ejecución con códigos de color e información de límites.

**Acceptance Scenarios**:

1. **Given** que la base de datos relacional, el almacén de caché y la API externa de datos de fútbol se encuentran operativos, **When** el administrador consulta el panel de salud, **Then** visualiza tarjetas individuales para cada dependencia con indicador visual en verde/saludable y confirmación de disponibilidad.
2. **Given** que alguno de los componentes (base de datos, caché o API externa) pierde conectividad o no responde, **When** se actualiza la vista de salud, **Then** la tarjeta del servicio afectado cambia inmediatamente a estado de alerta o fallo, indicando claramente cuál es la dependencia afectada.
3. **Given** que el consumo de memoria de ejecución del servidor se encuentra dentro de los márgenes seguros establecidos, **When** el administrador consulta el bloque de vitalidad, **Then** visualiza los niveles de memoria utilizados frente a sus límites operativos con indicadores visuales nominales.
4. **Given** que el consumo de memoria supera los umbrales de advertencia predeterminados, **When** se refresca el bloque de vitalidad, **Then** se despliega una advertencia visual prominente alertando sobre el riesgo de agotamiento de memoria.

---

### User Story 3 - Telemetría y Dashboards Visuales de Trading y Marketplace (Priority: P1)

Como administrador u operador de la plataforma,  
quiero examinar dashboards interactivos con gráficos e indicadores cuantitativos sobre el comportamiento transaccional del marketplace (volumen operado en centavos/moneda, órdenes de compra y venta por tipo de mercado, transacciones cerradas, latencia de liquidación y órdenes de venta activas),  
para evaluar el ritmo económico de la plataforma, vigilar la liquidez de mercado y detectar cuellos de botella en la liquidación de órdenes.

**Why this priority**: Las transacciones del marketplace constituyen el núcleo del negocio y la actividad con mayor impacto financiero. Disponer de indicadores agregados y gráficos visuales permite tomar decisiones operativas y vigilar el comportamiento del intercambio de tokens.

**Independent Test**: Puede probarse consultando la sección de Marketplace del panel de observabilidad y comprobando que los gráficos de barras/líneas y tarjetas métricas reflejan de manera coherente el volumen monetario total, la distribución de órdenes creadas, la cantidad de operaciones ejecutadas y el indicador de ofertas de venta activas.

**Acceptance Scenarios**:

1. **Given** órdenes registradas en la plataforma, **When** el administrador consulta el panel de trading, **Then** visualiza gráficos que desglosan la cantidad de órdenes generadas por tipo de operación (compra frente a venta) y por modalidad de mercado (primario frente a secundario).
2. **Given** transacciones completadas satisfactoriamente, **When** se revisan las métricas de volumen, **Then** se presenta el importe monetario total transaccionado acumulado expresado en la denominación correspondiente, junto con el conteo de transacciones ejecutadas.
3. **Given** órdenes que han completado su proceso de liquidación, **When** se examina la latencia de settlement, **Then** se presenta la distribución o valor representativo del tiempo requerido para asentar las operaciones.
4. **Given** ofertas de venta publicadas en el mercado secundario pendientes de ejecución, **When** se consulta el estado del mercado, **Then** un indicador numérico prominente exhibe la cantidad de órdenes de venta activas en espera de contraparte.
5. **Given** órdenes rechazadas por sobrepasar la tolerancia de variación de precio, **When** se inspeccionan las métricas operativas, **Then** se exhibe el contador acumulado de rechazos por variación de precio para detectar anomalías de cotización.

---

### User Story 4 - Supervisión del Motor de Valuación y Cotizaciones (Priority: P2)

Como administrador del sistema,  
quiero monitorear los ciclos de recálculo masivo de cotizaciones de futbolistas, observando la proporción de ejecuciones exitosas frente a fallidas, los tiempos de procesamiento, la cantidad de jugadores clasificados según la calidad de sus datos y la estrategia de precios activa,  
para constatar que la valorización de activos se realiza de manera oportuna, sin interrupciones y con información deportiva consistente.

**Why this priority**: El motor de precios fija el valor de referencia de los activos en el mercado primario y secundario. Un fallo masivo en el cálculo distorsiona el mercado; supervisar las ejecuciones y los futbolistas evaluados sin estadísticas permite anticipar inconsistencias.

**Independent Test**: Puede probarse navegando al bloque de cotizaciones dentro del panel de observabilidad y verificando que se muestre el estado de la estrategia activa, la tasa de recálculos correctos vs. fallidos, el tiempo de cálculo y el desglose de jugadores procesados.

**Acceptance Scenarios**:

1. **Given** que se han ejecutado ciclos de actualización de precios en la plataforma, **When** el administrador visualiza el bloque de cotizaciones, **Then** se exhibe una gráfica o indicador cuantitativo que compara las corridas completadas con éxito frente a las fallidas.
2. **Given** un conjunto de futbolistas evaluados durante las corridas de precios, **When** se examina el detalle de los datos, **Then** el panel muestra la cantidad de jugadores procesados con estadísticas deportivas completas, la cantidad procesada bajo reglas por defecto (sin estadísticas recientes) y la cantidad que registró errores durante la evaluación.
3. **Given** ciclos de recálculo masivo registrados, **When** se consulta el desempeño del motor, **Then** se presenta la duración promedio de las corridas para evaluar la eficiencia temporal del cálculo.
4. **Given** una estrategia de valuación configurada en el sistema, **When** se consulta el panel de cotizaciones, **Then** se exhibe una tarjeta destacada con el nombre, versión y estado de la regla de pricing vigente.

---

### User Story 5 - Monitoreo de Extracción de Datos (Scraping), Servicios Auxiliares y Caché (Priority: P2)

Como administrador del sistema,  
quiero supervisar la actividad de extracción automatizada de datos deportivos, el consumo de cuota de APIs externas, el rendimiento del almacenamiento en memoria caché y la telemetría de seguridad,  
para prevenir bloqueos por exceso de solicitudes externas, anticipar fallas en los procesos de recolección de estadísticas y asegurar la alta velocidad de respuesta del sistema.

**Why this priority**: Las integraciones externas y los procesos de extracción son vulnerables a cambios de terceros o cuotas estrictas de consumo. Visibilizar el uso de cuota, la tasa de aciertos de caché y los tiempos de autenticación evita degradaciones de servicio invisibles.

**Independent Test**: Puede probarse accediendo a los bloques de scraping, caché y seguridad, confirmando que se exponen las tasas de asociación de jugadores, el tiempo promedio de recolección por liga deportiva, la cuota restante de la API externa y la relación entre aciertos y fallos de caché.

**Acceptance Scenarios**:

1. **Given** ejecuciones periódicas de extracción de estadísticas deportivas, **When** el administrador consulta el bloque de scraping, **Then** visualiza la cantidad de ejecuciones por estado (exitosas, fallidas o atascadas recuperadas) y el tiempo promedio invertido por cada liga deportiva.
2. **Given** jugadores extraídos durante los ciclos de scraping, **When** se verifica la concordancia de información, **Then** se exhibe la tasa porcentual de vinculación exitosa con el catálogo oficial y el registro de incidentes ocurridos.
3. **Given** peticiones efectuadas hacia el servicio externo de datos de fútbol, **When** se examina la integración externa, **Then** se muestra el total de llamadas agrupadas por resultado y el margen de solicitudes restantes antes de alcanzar el límite de cuota (rate limit).
4. **Given** consultas gestionadas mediante almacenamiento en memoria caché, **When** se analiza el desempeño, **Then** se presenta la proporción gráfica y porcentual entre accesos satisfechos desde memoria (hits) y solicitudes que requirieron recálculo (misses), así como las degradaciones mitigadas.
5. **Given** eventos de autenticación de usuarios, **When** se inspeccionan las métricas de seguridad, **Then** se expone la frecuencia de intentos de acceso y el tiempo de respuesta del proceso de verificación de credenciales.

---

### User Story 6 - Controles de Operabilidad, Frecuencia de Actualización y Resiliencia en UI (Priority: P3)

Como administrador que supervisa la plataforma en tiempo real,  
quiero disponer de un botón de refresco instantáneo, un selector de auto-actualización periódica con opciones configurables (pausado, 5s, 10s, 30s), una marca de tiempo visible de la última sincronización, e indicadores de carga y mensajes comprensibles en caso de fallas de conexión,  
para tener control total sobre la frecuencia de consultas y poder reaccionar ordenadamente ante cualquier interrupción temporal en los servicios de telemetría.

**Why this priority**: Asegura una experiencia de usuario interactiva y fluida para el administrador, evitando sobrecargas de red cuando la vista está abierta en segundo plano y ofreciendo retroalimentación transparente ante demoras o errores de red.

**Independent Test**: Puede probarse accionando el botón de refresco manual, cambiando las opciones del selector de auto-actualización para comprobar la ejecución de las consultas según el intervalo establecido, y desconectando temporalmente la red para verificar los mensajes de error comprensibles con botón de reintento.

**Acceptance Scenarios**:

1. **Given** el administrador en el panel de observabilidad, **When** pulsa el botón de actualización manual, **Then** el sistema dispara inmediatamente la consulta de todas las métricas y actualiza la marca de tiempo de la última sincronización.
2. **Given** que el administrador selecciona un intervalo de auto-actualización periódico (5s, 10s o 30s), **When** transcurre el intervalo configurado, **Then** el panel solicita y refresca automáticamente los indicadores sin provocar parpadeos ni recargas completas de la página.
3. **Given** que el administrador establece el selector de auto-actualización en 'Pausado', **When** transcurre el tiempo, **Then** el sistema suspende las peticiones periódicas hasta que el usuario elija un nuevo intervalo o presione el botón de refresco manual.
4. **Given** una solicitud de datos en curso, **When** la respuesta se encuentra pendiente, **Then** el panel muestra estados visuales de carga (indicadores de progreso o estructuras esqueleto) en las tarjetas afectadas sin congelar la navegación.
5. **Given** un error de red o falta de respuesta por parte de uno de los servicios de telemetría, **When** se produce el fallo, **Then** el sistema presenta un mensaje informativo comprensible en español explicando la incidencia y ofreciendo una acción directa de reintento, preservando en pantalla los últimos datos conocidos de los servicios que sí respondieron.

---

### Edge Cases

- **Respuesta parcial de telemetría**: Si el servicio de métricas responde satisfactoriamente pero la sonda de salud experimenta tiempo de espera (o a la inversa), el panel no debe bloquearse por completo; debe renderizar con normalidad las secciones funcionales y mostrar un estado de advertencia localizado únicamente sobre la sección con problemas.
- **Expiración de sesión durante el monitoreo en vivo**: Si la sesión del administrador caduca mientras la auto-actualización periódica está en marcha, el sistema debe pausar de inmediato los ciclos de consulta, limpiar los datos en memoria y redirigir al usuario hacia la pantalla de inicio de sesión con un mensaje explicativo, evitando peticiones continuas no autenticadas en bucle.
- **Sistema recién inicializado sin operaciones previas**: Si la plataforma se despliega desde cero y aún no registra órdenes, transacciones o recálculos, los gráficos y contadores numéricos deben inicializarse en cero o exhibir estados informativos claros en español (por ejemplo: "Sin operaciones registradas en el período"), sin arrojar errores de renderizado ni divisiones por cero en porcentajes.
- **Cuota de peticiones externas cercana al agotamiento**: Si el margen de consultas restantes de la API externa cae por debajo de un umbral crítico de seguridad, el indicador visual debe resaltarse con advertencia visual prioritaria para alertar al operador antes del bloqueo total.
- **Pérdida de conectividad en el navegador del operador**: Si el equipo del administrador pierde acceso a internet mientras el panel tiene activa la auto-actualización, la interfaz debe suspender las reintentos agresivos, notificar el estado de desconexión mediante un aviso no intrusivo y reanudar la sincronización automáticamente una vez que se restablezca la conexión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE restringir el acceso a la vista de observabilidad de forma exclusiva a usuarios que cuenten con una sesión activa y rol de Administrador ('ADMIN').
- **FR-002**: El sistema DEBE redirigir de manera automática a la pantalla de inicio de sesión (`/login`) a cualquier usuario no autenticado que intente ingresar a la ruta de observabilidad.
- **FR-003**: El sistema DEBE impedir el acceso, redirigir a la vista principal (`/`) y mostrar una advertencia de seguridad explícita en español a todo usuario autenticado con rol estándar ('USUARIO') que intente ingresar a la vista de observabilidad.
- **FR-004**: El sistema DEBE incluir un enlace directo hacia la vista de observabilidad en el menú de navegación principal, siendo visible únicamente para usuarios con rol 'ADMIN' y permaneciendo invisible para los demás usuarios.
- **FR-005**: El sistema DEBE presentar un panel de salud que refleje el estado de preparación (Readiness) de las dependencias críticas: base de datos relacional, almacén de caché y servicio externo de datos deportivos.
- **FR-006**: El sistema DEBE presentar un panel de salud que refleje el estado de vitalidad (Liveness) y consumo de memoria de ejecución del servidor frente a sus umbrales operativos.
- **FR-007**: El sistema DEBE presentar gráficos visuales interactivos y tarjetas métricas que representen el volumen total de órdenes creadas en el Marketplace, desglosadas por tipo de operación (compra y venta) y por modalidad de mercado (primario y secundario).
- **FR-008**: El sistema DEBE presentar el importe monetario total transaccionado acumulado y la cantidad consolidada de transacciones ejecutadas en el Marketplace.
- **FR-009**: El sistema DEBE presentar la métrica de latencia del proceso de liquidación (settlement) de operaciones de compraventa.
- **FR-010**: El sistema DEBE presentar un indicador numérico en tiempo real con la cantidad de órdenes de venta activas pendientes en el mercado secundario y el conteo de órdenes rechazadas por variación de precio (slippage).
- **FR-011**: El sistema DEBE presentar indicadores y gráficos comparativos de los ciclos de recálculo masivo de cotizaciones, mostrando la cantidad de ejecuciones exitosas frente a las fallidas y la duración de procesamiento.
- **FR-012**: El sistema DEBE mostrar el desglose de futbolistas evaluados en los recálculos de precios, clasificándolos en procesados con estadísticas, procesados sin estadísticas deportivas y evaluaciones con error.
- **FR-013**: El sistema DEBE destacar visualmente la estrategia de cotización actualmente activa en la plataforma, incluyendo su denominación y versión.
- **FR-014**: El sistema DEBE presentar métricas sobre el proceso de extracción de datos deportivos (scraping), exponiendo el historial de ejecuciones clasificadas por estado (exitosas, fallidas y recuperadas) y el tiempo promedio invertido por liga deportiva.
- **FR-015**: El sistema DEBE presentar la tasa porcentual de asociación entre los jugadores obtenidos por extracción y el catálogo oficial, junto con el contador de incidentes registrados.
- **FR-016**: El sistema DEBE presentar el volumen de consultas hacia la API externa de fútbol, el desglose de códigos de respuesta y el margen restante del límite de cuota (rate limit).
- **FR-017**: El sistema DEBE presentar el historial de ejecuciones, estado y duración de los procesos de conformación del Equipo de la Semana.
- **FR-018**: El sistema DEBE presentar la tasa de aciertos y fallos (hit/miss ratio) del sistema de caché en memoria y el conteo de activaciones del mecanismo de respaldo (fallback).
- **FR-019**: El sistema DEBE presentar métricas de seguridad que reflejen la frecuencia de intentos de autenticación de usuarios y el tiempo promedio de verificación de contraseñas.
- **FR-020**: El sistema DEBE proveer un control de refresco manual inmediato que permita al administrador solicitar los datos actualizados de telemetría y salud en cualquier momento.
- **FR-021**: El sistema DEBE ofrecer un selector de auto-actualización periódica configurable con opciones para pausar la sincronización o ejecutarla a intervalos de 5 segundos, 10 segundos y 30 segundos.
- **FR-022**: El sistema DEBE mostrar de forma visible la marca de tiempo (fecha y hora) en que se realizó la última sincronización satisfactoria de datos.
- **FR-023**: El sistema DEBE presentar estados visuales de carga (indicadores de progreso o estructuras esqueleto) mientras se recuperan o actualizan los datos de telemetría.
- **FR-024**: El sistema DEBE presentar mensajes informativos comprensibles en español ante demoras, desconexiones o fallos en los servicios de telemetría, proporcionando un botón para reintentar la operación.
- **FR-025**: El sistema DEBE aislar visual y funcionalmente las diferentes secciones del panel para que la indisponibilidad de un servicio de telemetría no impida la visualización ni el funcionamiento de los demás bloques operativos.

### Key Entities *(include if feature involves data)*

- **PanelDeObservabilidad**: Entidad principal que encapsula la vista integral, conteniendo las preferencias de sincronización activa (intervalo de auto-refresco), la marca de tiempo de la última consulta y los estados generales de carga y error.
- **SondaDeSalud**: Estructura de información que describe el estado de disponibilidad general y particular del backend:
  - Preparación (Readiness): conectividad individual de base de datos, memoria de caché y servicio externo de fútbol.
  - Vitalidad (Liveness): consumo actual de memoria de ejecución frente a los límites de tolerancia operativa.
- **MetricaDeMarketplace**: Conjunto de indicadores de negocio que reflejan la actividad transaccional del mercado: órdenes totales clasificadas por tipo y mercado, transacciones concretadas, volumen monetario acumulado, latencia de liquidación y órdenes de venta activas.
- **MetricaDeCotizaciones**: Conjunto de datos sobre la estabilidad y precisión del motor de precios: recálculos totales por estado, duración promedio, distribución de futbolistas según integridad de sus estadísticas deportivas y estrategia activa de valuación.
- **MetricaDeIngestion**: Registro de rendimiento de los extractores de estadísticas deportivas: cantidad de ejecuciones por estado, tiempos por liga, tasa de asociación con el catálogo oficial e incidentes reportados.
- **MetricaDeIntegracionYCache**: Indicadores sobre la eficiencia del almacenamiento en memoria (aciertos vs. fallos), uso y saldo de cuota de llamadas a APIs externas, y rendimiento de los procesos de autenticación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los intentos de acceso no autorizados a la vista de observabilidad por parte de usuarios anónimos o con rol 'USUARIO' son bloqueados y redirigidos en menos de 500 milisegundos tras la solicitud.
- **SC-002**: Un administrador que accede al panel puede comprobar el estado operativo de todas las dependencias críticas (base de datos, caché y servicios externos) dentro de los primeros 2 segundos desde la carga inicial de la pantalla.
- **SC-003**: El refresco manual de la vista actualiza y presenta la totalidad de las métricas y tarjetas de salud en menos de 1,5 segundos en condiciones normales de red.
- **SC-004**: La interfaz mantiene una visualización continua y sin saltos bruscos de diseño durante el ciclo de auto-actualización periódica en cualquiera de los intervalos disponibles (5s, 10s, 30s).
- **SC-005**: El 100% de los indicadores cuantitativos de negocio (volumen monetario, distribución de órdenes, transacciones y latencia) se presentan con etiquetas descriptivas en español y formatos numéricos legibles para operadores no técnicos.
- **SC-006**: Ante la indisponibilidad de cualquiera de las fuentes de datos, el sistema informa visualmente la incidencia al usuario en menos de 1 segundo tras la detección del fallo, permitiendo continuar interactuando con los módulos restantes sin bloqueos.

## Assumptions

- Se asume que los servicios backend correspondientes a métricas y health checks se encuentran implementados y accesibles para las solicitudes originadas desde la sesión del administrador.
- Se asume que la ruta designada para la vista dentro del enrutamiento de la aplicación es `/admin/observability`, manteniendo la convención de prefijo administrativo `/admin`.
- Se asume que los valores monetarios acumulados en las métricas (centavos) son formateados en la interfaz a la moneda o denominación estándar de la plataforma para su adecuada lectura e interpretación.
- Se asume que el intervalo de auto-actualización inicial al ingresar por primera vez al panel estará establecido en un valor conservador (por ejemplo, 10 segundos o pausado) para no saturar la red innecesariamente hasta que el usuario determine su ritmo de trabajo.
- Se asume que los componentes visuales de tarjetas, gráficos interactivos e indicadores de estado reutilizan los patrones visuales y estilos establecidos en el sistema de diseño del proyecto.
