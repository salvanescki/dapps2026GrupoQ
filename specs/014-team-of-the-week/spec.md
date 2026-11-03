cu# Feature Specification: Equipo de la Semana (Team of the Week)

**Feature Branch**: `014-team-of-the-week`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Funcionalidad: Equipo de la Semana (Team of the Week). Quiero que la plataforma muestre cada semana un 'Equipo de la Semana': el once ideal de los jugadores mejor valorados del mercado según su cotización (crédito) vigente, respetando su posición táctica. Se presenta en una pantalla propia, accesible desde la barra de navegación para cualquier usuario autenticado, con un esquema de cancha de fútbol donde cada jugador aparece en su posición con su nombre (todavía no hay fotos), su equipo y su cotización. Reglas de negocio: Formación fija 4-3-3: 1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros. Las posiciones son las del catálogo actual (Portero, Defensa, Mediocampista, Delantero). En cada posición se eligen los jugadores con mayor cotización vigente de las 5 ligas. Desempate: mayor score y luego nombre alfabético. Se excluyen jugadores sin estadísticas deportivas (los que solo tienen la cotización base inicial) y jugadores inactivos. El equipo se calcula una vez por semana, los lunes, usando las cotizaciones ya actualizadas con las estadísticas de la semana. Cada equipo queda guardado como un historial inmutable de esa semana (semana, formación, jugadores elegidos, su cotización y score de ese momento, estrategia de valuación vigente), para poder consultar semanas anteriores aunque las cotizaciones cambien después. Un administrador puede disparar manualmente la generación del equipo de la semana en curso (por ejemplo si falló la ejecución automática). Un usuario común no puede. Si todavía no existe ningún equipo generado (instalación nueva o primera semana), la pantalla muestra un estado vacío claro en español. Si no hay jugadores suficientes en alguna posición para completar la formación, el sistema no inventa jugadores: genera el equipo incompleto o lo rechaza según lo que se defina en las clarificaciones. Pantalla: Cancha vertical (portero abajo, delanteros arriba) que se vea bien en celular y en escritorio. Selector para navegar a semanas anteriores. Al seleccionar un jugador se abre su detalle existente (ficha, estadísticas y operación del marketplace). Estados de carga, error con reintento y vacío, todos en español. Fuera de alcance: fotos de jugadores, formaciones alternativas, selección de liga, notificaciones, votaciones de usuarios."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualización del Equipo de la Semana Vigente en Cancha Táctica (Priority: P1)

Como usuario autenticado de la plataforma,
quiero ingresar a la sección "Equipo de la Semana" desde la barra de navegación principal y visualizar la alineación ideal de la semana dispuesta sobre un esquema de cancha vertical,
para identificar rápidamente a los 11 futbolistas más valiosos del mercado según su posición táctica oficial.

**Why this priority**: Es el núcleo de la experiencia de usuario y el entregable principal de la funcionalidad. Sin esta vista interactiva sobre la cancha, el usuario no puede apreciar el valor comparativo de los mejores jugadores del mercado.

**Independent Test**: Puede probarse accediendo con cualquier usuario autenticado a la ruta del Equipo de la Semana una vez generado un equipo: debe renderizarse la cancha de fútbol en orientación vertical (portero abajo, 4 defensas, 3 mediocampistas y 3 delanteros arriba), mostrando en cada nodo táctico el nombre del jugador, su club/equipo y su cotización oficial en créditos.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado y un equipo de la semana vigente generado, **When** el usuario navega a la sección "Equipo de la Semana" desde el menú de navegación, **Then** el sistema presenta una cancha de fútbol vertical adaptada a escritorio y dispositivos móviles con los 11 jugadores ubicados en el esquema 4-3-3 (1 Portero en la base inferior, 4 Defensas en la línea baja, 3 Mediocampistas en la línea media y 3 Delanteros en la línea superior).
2. **Given** la visualización de cada jugador en la cancha táctica, **When** el usuario observa cada casilla de jugador, **Then** el sistema muestra con claridad su nombre completo, club al que pertenece y el valor exacto de su cotización vigente en créditos al momento de la conformación semanal.
3. **Given** una pantalla en formato móvil o de escritorio reducido, **When** el usuario visualiza el esquema de la cancha, **Then** la disposición vertical se preserva sin desbordes horizontales, manteniendo legibles los nombres, equipos y cotizaciones de los 11 futbolistas.

---

### User Story 2 - Navegación y Consulta del Histórico de Semanas Anteriores (Priority: P1)

Como usuario autenticado de la plataforma,
quiero seleccionar semanas pasadas mediante un selector temporal en la pantalla,
para revisar las alineaciones ideales históricas, conociendo qué futbolistas integraron el once ideal y qué cotizaciones tenían en ese momento específico sin que se vean afectadas por cambios posteriores de precio.

**Why this priority**: Garantiza la inmutabilidad y transparencia histórica del sistema. Permite a los usuarios realizar análisis retrospectivo del mercado de tokens y auditar el historial de rendimiento de las distintas semanas.

**Independent Test**: Puede probarse teniendo al menos dos semanas generadas en el sistema: al seleccionar una semana previa en el desplegable temporal, la cancha debe actualizarse de inmediato mostrando los jugadores, cotizaciones y scores congelados en esa semana histórica.

**Acceptance Scenarios**:

1. **Given** la existencia de múltiples semanas históricas registradas, **When** el usuario despliega el selector de semanas, **Then** el sistema lista las semanas disponibles ordenadas de forma descendente (la semana más reciente primero), indicando el identificador de semana y año (ejemplo: "Semana 44, 2026 - generado el 2/11").
2. **Given** la selección de una semana pasada en el selector, **When** el usuario confirma la elección, **Then** el sistema carga y renderiza en la cancha los jugadores seleccionados en dicha semana con su cotización, score y estrategia vigentes en esa fecha histórica, sin reflejar las cotizaciones actuales de mercado.
3. **Given** un usuario navegando una semana anterior, **When** recarga la página o comparte el enlace que incluye la semana en la dirección de la pantalla, **Then** el sistema recupera determinísticamente la misma semana seleccionada.

---

### User Story 3 - Interacción con Jugador y Acceso a Ficha / Marketplace (Priority: P2)

Como usuario o inversor en el marketplace,
quiero hacer clic o pulsar sobre cualquiera de los jugadores presentes en la cancha del Equipo de la Semana,
para abrir su modal de detalle preexistente (ficha técnica, estadísticas deportivas acumuladas y panel de compraventa de tokens en el marketplace).

**Why this priority**: Conecta la vitrina del Equipo de la Semana con la economía transaccional de la plataforma, facilitando que el usuario opere tokens del futbolista directamente tras descubrirlo en el once ideal.

**Independent Test**: Puede probarse haciendo clic en un delantero del Equipo de la Semana: debe abrirse el modal de detalle del jugador cargando sus estadísticas completas y los controles de compra de tokens sin redirigir fuera de la pantalla.

**Acceptance Scenarios**:

1. **Given** un jugador visible en el esquema táctico de la cancha, **When** el usuario hace clic o presiona sobre la tarjeta o nodo del jugador, **Then** el sistema abre el modal de detalle existente del futbolista mostrando su perfil deportivo, historial estadístico y las opciones de operación en el marketplace de tokens.
2. **Given** el modal de detalle abierto tras interactuar con un jugador de la cancha, **When** el usuario cierra el modal, **Then** la vista regresa al esquema táctico de la semana exactamente en el mismo estado de navegación previo.

---

### User Story 4 - Cálculo Semanal Automático del Once Ideal (Priority: P1)

Como sistema automatizado de la plataforma,
quiero ejecutar un proceso programado cada lunes que filtre y seleccione a los 11 mejores jugadores según su cotización vigente por posición respetando las reglas de negocio,
para congelar y publicar de manera inmutable el nuevo Equipo de la Semana.

**Why this priority**: Es la regla de negocio central que construye los datos. Sin la selección automatizada, rigurosa y determinista del once ideal, no existe contenido que presentar en la interfaz.

**Independent Test**: Puede probarse ejecutando el proceso de cálculo sobre un catálogo de jugadores con cotizaciones conocidas: debe validar que selecciona exactamente 1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros con las mayores cotizaciones vigentes de las 5 ligas, aplicando desempates por score y nombre, excluyendo inactivos y jugadores sin estadísticas.

**Acceptance Scenarios**:

1. **Given** el catálogo de jugadores de las 5 grandes ligas con cotizaciones actualizadas al inicio del lunes, **When** se ejecuta el proceso semanal, **Then** el sistema selecciona determinísticamente:
   - Los mejores 3 Delanteros según mayor cotización vigente.
   - Los mejores 3 Mediocampistas según mayor cotización vigente.
   - Los mejores 4 Defensas según mayor cotización vigente.
   - El mejor 1 Portero según mayor cotización vigente.
2. **Given** dos o más jugadores de la misma posición con la misma cotización vigente, **When** se evalúa el criterio de selección, **Then** el sistema desempata priorizando al jugador con mayor score deportivo en dicha cotización; si persiste el empate, desempata en orden alfabético por nombre (A-Z ascendente).
3. **Given** jugadores en el catálogo marcados como inactivos o jugadores que solo cuentan con la cotización base inicial sin estadísticas deportivas reales registradas, **When** se procesa la selección, **Then** el sistema los excluye estrictamente de la consideración para el Equipo de la Semana.
4. **Given** la finalización del cálculo semanal, **When** se persiste el equipo, **Then** el sistema guarda el registro de forma inmutable con: año, número de semana, esquema táctico 4-3-3, identificador de cada jugador elegido, cotización congelada, score congelado y estrategia/versión de valuación vigente al momento del cálculo.

---

### User Story 5 - Disparo Manual y Gobernanza Administrativa (Priority: P2)

Como superusuario administrador (`ADMIN`),
quiero poder disparar manualmente la generación del Equipo de la Semana en curso a través de la plataforma,
para subsanar contingencias operativas (como fallas en la ejecución automática o retrasos en la carga de estadísticas) y garantizar la disponibilidad del once ideal.

**Why this priority**: Proporciona herramientas de operación y contingencia indispensables para los administradores sin depender de intervenciones manuales en base de datos.

**Independent Test**: Puede probarse enviando una solicitud de generación manual autenticado como usuario común (`USUARIO`, debe ser rechazada con código de prohibido) y como `ADMIN` (debe procesar y registrar el Equipo de la Semana).

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con rol `ADMIN`, **When** solicita la generación manual del Equipo de la Semana en curso, **Then** el sistema ejecuta el algoritmo de selección, genera el registro de la semana correspondiente y emite un mensaje de éxito en español.
2. **Given** un usuario convencional con rol `USUARIO`, **When** intenta invocar la acción de generación manual del Equipo de la Semana, **Then** el sistema bloquea inmediatamente la operación devolviendo un error de acceso no autorizado o prohibido.
3. **Given** un administrador ejecutando la generación manual cuando ya existe un equipo generado para la semana en curso, **When** se procesa la solicitud, **Then** el sistema recalcula y sobrescribe el registro de la semana en curso con los jugadores y cotizaciones más actualizados al momento de la ejecución forzada, siempre que la semana siga abierta (hasta el lunes siguiente a las 00:00 UTC).

---

### Edge Cases

- **Instalación limpia o primera semana sin registros**: Si todavía no existe ningún equipo de la semana generado en la base de datos, la pantalla presenta un estado vacío explícito y amigable en español ("Aún no hay ningún Equipo de la Semana disponible"), sin errores ni pantallas en blanco.
- **Jugadores insuficientes en una posición táctica**: Si en alguna de las 4 posiciones tácticas no se alcanza el cupo reglamentario (ej. menos de 4 defensas, menos de 3 mediocampistas, menos de 3 delanteros o menos de 1 portero con estadísticas activas y estado activo), el sistema rechaza la generación de esa semana, no publica una alineación incompleta, deja constancia en el registro de la aplicación y, si el disparo fue manual, responde con un error claro en español indicando qué posiciones no alcanzan el cupo. En la interfaz se continúa mostrando la última semana completa disponible (o el estado vacío si es la primera semana).
- **Empates triples o múltiples exactos**: Si varios jugadores empatan en cotización y en score, el ordenamiento alfabético ascendente estricto por nombre garantiza un resultado 100% determinista e idempotente.
- **Cambio posterior de cotización o traspaso de un jugador**: Si un futbolista que integró el Equipo de la Semana 40 es transferido, desactivado o sufre una depreciación drástica en la Semana 42, el registro de la Semana 40 permanece intacto, mostrando su cotización, score y equipo con los que fue seleccionado originalmente.
- **Fallas de red o conectividad al cargar la vista**: Si ocurre un error al consultar el equipo semanal o el histórico, la interfaz despliega un mensaje claro de error en español acompañado de un botón de "Reintentar" que permite recuperar el contenido sin recargar completamente la página.
- **Concurrencia de generación manual**: Si dos administradores disparan la generación manual simultáneamente, el sistema garantiza que exista un único registro para esa semana, sin duplicados ni registros incompletos.

---

## Requirements *(mandatory)*

### Functional Requirements

#### 1. Reglas de Selección y Esquema Táctico
- **FR-001**: El sistema DEBE conformar el Equipo de la Semana respetando un esquema táctico fijo e inalterable 4-3-3: exactamente 1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros.
- **FR-002**: Las posiciones tácticas elegibles DEBEN ser estrictamente las posiciones canónicas del catálogo existente: `Portero`, `Defensa`, `Mediocampista` y `Delantero`.
- **FR-003**: En cada una de las 4 posiciones tácticas, el sistema DEBE seleccionar a los futbolistas que posean la mayor cotización vigente en créditos entre todas las ligas registradas en la plataforma.
- **FR-004**: En caso de empate en la cotización vigente entre dos o más jugadores de la misma posición, el sistema DEBE desempatar priorizando al jugador con mayor `score` registrado en dicha cotización; de persistir el empate, DEBE desempatar en orden alfabético por nombre completo (A-Z ascendente).
- **FR-005**: El sistema DEBE excluir taxativamente del proceso de selección a:
  - Jugadores que se encuentren inactivos (`activo == false`).
  - Jugadores que no posean estadísticas deportivas registradas en la temporada (aquellos que mantienen únicamente la cotización base inicial sin métricas de rendimiento).
  - Jugadores con menos de 270 minutos jugados acumulados en la temporada (equivalente a 3 partidos completos), para evitar que una única actuación aislada alcance el once ideal.
- **FR-006**: Si en alguna de las 4 posiciones tácticas no existen suficientes futbolistas elegibles (activos, con estadísticas deportivas y con el mínimo de minutos acumulados) para cubrir el cupo reglamentario del esquema 4-3-3 (1 Portero, 4 Defensas, 3 Mediocampistas, 3 Delanteros), el sistema DEBE rechazar la generación de la semana, abortar la publicación del equipo y dejar constancia de la advertencia en el registro de la aplicación (y, ante un disparo manual, devolver un error claro en español a la persona administradora), conservando la visualización de la última semana completa disponible en la plataforma sin generar alineaciones incompletas ni inventar jugadores.

#### 2. Temporalidad, Inmutabilidad e Historial
- **FR-007**: El sistema DEBE ejecutar el cálculo del Equipo de la Semana de forma periódica automatizada una vez por semana, los días lunes (zona horaria de referencia: UTC), tras el recálculo y actualización semanal de cotizaciones con base en las estadísticas deportivas.
- **FR-007b**: La generación automática DEBE ser idempotente: si ya existe un equipo para la semana ISO de la ejecución, no DEBE crear un segundo registro ni modificar el existente.
- **FR-008**: Cada Equipo de la Semana generado DEBE persistirse como un registro histórico que contenga obligatoriamente:
  - Identificador unívoco temporal compuesto por año y número de semana ISO del día en que se genera (lunes), junto con la fecha de generación, que la pantalla DEBE mostrar junto a la semana (ejemplo: "Semana 45, 2026 - generado el 2/11"). Refleja los datos acumulados a esa fecha.
  - Esquema táctico utilizado (`4-3-3`).
  - Lista de los 11 jugadores seleccionados, almacenando para cada uno: identificador de jugador, nombre, club/equipo, posición táctica asignada en el equipo, cotización vigente al momento del cálculo y score al momento del cálculo.
  - Identificador y versión de la estrategia de valuación que se encontraba activa al momento de la conformación semanal.
  - Marca de tiempo exacta de generación.
- **FR-008b**: Una semana es regenerable (únicamente por un administrador, ver FR-013) hasta el lunes siguiente a las 00:00 UTC; a partir de ese momento el registro queda cerrado y es inmutable.
- **FR-009**: La consulta de semanas anteriores DEBE devolver con precisión los valores de cotización, score y equipo que fueron congelados en el momento de la generación histórica, garantizando que variaciones de precio o traspasos posteriores no alteren registros pasados (semanas cerradas).

#### 3. Control de Acceso y Operación Administrativa
- **FR-010**: Cualquier usuario autenticado en la plataforma DEBE tener acceso a la vista de consulta del Equipo de la Semana y al histórico de semanas anteriores.
- **FR-011**: ÚNICAMENTE los usuarios autenticados con rol de administrador (`ADMIN`) DEBEN estar autorizados para disparar manualmente el recálculo o generación del Equipo de la Semana en curso.
- **FR-012**: Cualquier intento de disparo manual de generación proveniente de un usuario sin rol `ADMIN` DEBE ser bloqueado de inmediato con un error de autorización denegada.
- **FR-013**: Si un usuario con rol `ADMIN` dispara manualmente la generación para la semana en curso y ya existe un registro de equipo generado para dicha semana, el sistema DEBE permitir la operación y sobrescribir el registro de la semana en curso con los jugadores y cotizaciones actualizadas al momento de la ejecución forzada. El sistema DEBE rechazar con un error claro en español cualquier intento de regenerar una semana ya cerrada (FR-008b).

#### 4. Experiencia de Usuario y Presentación Visual
- **FR-014**: La aplicación DEBE contar con un acceso directo y visible a la pantalla "Equipo de la Semana" en la barra de navegación principal para usuarios autenticados.
- **FR-015**: La pantalla DEBE desplegar un gráfico de cancha de fútbol vertical orientado con el portero en la zona inferior y los delanteros en la zona superior, asegurando un diseño responsive optimizado tanto para dispositivos móviles como para pantallas de escritorio.
- **FR-016**: Cada uno de los 11 puestos en la cancha DEBE exhibir claramente el nombre del futbolista, su equipo de fútbol y el valor numérico de su cotización en créditos.
- **FR-017**: La pantalla DEBE incluir un selector desplegable o control de navegación temporal que permita al usuario seleccionar y consultar cualquier semana histórica disponible, cargando por defecto la semana más reciente. Cada opción DEBE indicar semana, año y fecha de generación.
- **FR-018**: Al pulsar o hacer clic sobre cualquier jugador en la cancha, la aplicación DEBE abrir el modal de detalle del jugador preexistente, permitiendo al usuario consultar su ficha técnica, historial estadístico y acceder a la compra/venta de sus tokens en el marketplace.
- **FR-019**: La interfaz DEBE contemplar e implementar los siguientes estados de visualización, redactados íntegramente en español:
  - **Estado de carga**: Indicador visual durante la obtención de datos del equipo o el cambio de semana.
  - **Estado de error**: Mensaje descriptivo ante contingencias de red o servidor, incorporando un botón explícito de "Reintentar".
  - **Estado vacío**: Mensaje descriptivo cuando no existan equipos semanales generados en el sistema (ejemplo: instalaciones iniciales).
- **FR-020**: La semana seleccionada DEBE reflejarse en la dirección de la pantalla, de modo que recargar la página o compartir el enlace muestre la misma semana. Si la semana indicada no existe, la pantalla DEBE mostrar un mensaje claro en español y permitir volver a la semana más reciente.

---

### Key Entities *(Dominio Funcional)*

- **EquipoSemanal**: Representa el agregado raíz del once ideal conformado para una semana específica.
  - *Atributos clave*: Identificador único, año calendario, número de semana (ISO), formación táctica (`4-3-3`), estrategia de cotización vigente (código y versión), marca de tiempo de creación y colección de miembros titulares.
- **MiembroEquipoSemanal**: Representa la participación y congelamiento de datos de un futbolista dentro de un Equipo Semanal determinado.
  - *Atributos clave*: Identificador del jugador, nombre del jugador, club del jugador, posición táctica asignada (`Portero`, `Defensa`, `Mediocampista`, `Delantero`), cotización monetaria congelada y score congelado.
- **FormacionTactica**: Objeto de valor que define la estructura posicional del equipo. En esta versión fija: 1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros.
- **Jugador**: Entidad del catálogo preexistente que provee identidad, posición táctica nativa, club, liga y estado de actividad.
- **Cotizacion**: Entidad preexistente que provee el precio histórico y score del jugador, utilizada como insumo para el ordenamiento y selección semanal.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Determinismo de la Alineación**: El 100% de las ejecuciones de generación semanal sobre el mismo conjunto de cotizaciones y estadísticas producen la misma alineación de 11 jugadores, sin discrepancias en desempates.
- **SC-002**: **Inmutabilidad Histórica Verificable**: El 100% de las consultas a semanas pasadas devuelven las cotizaciones y jugadores congelados al momento de su generación, sin sufrir alteraciones si los futbolistas cambian de precio o equipo después del cierre de la semana.
- **SC-003**: **Rendimiento de Carga de la Vista**: El 95% de las solicitudes de consulta de una semana (actual o histórica) se renderizan completamente en pantalla en menos de 1.5 segundos en condiciones estándar de red.
- **SC-004**: **Rendimiento de Cálculo**: El proceso semanal de selección y persistencia del once ideal entre los jugadores de las 5 ligas concluye en menos de 3 segundos.
- **SC-005**: **Adaptabilidad Responsive**: El 100% de los elementos de la cancha vertical (11 casillas con nombre, equipo y cotización) se visualizan de manera legible y sin desbordes horizontales en resoluciones móviles estándar (ancho $\ge$ 360px).
- **SC-006**: **Segregación de Accesos Administrativos**: 0% de ejecuciones manuales de generación exitosas por parte de usuarios que no tengan asignado el rol de `ADMIN`.

---

## Assumptions

- **Calendario y Numeración de Semanas**: Se adopta el estándar internacional ISO-8601 para numerar las semanas (semanas 1 a 52/53, comenzando el lunes).
- **Orden de Jobs Semanales**: El cálculo del Equipo de la Semana se ejecuta los lunes (UTC) después de que finalicen la ingesta de estadísticas semanales y el recálculo de cotizaciones del marketplace, asegurando que los datos de entrada reflejen los últimos valores actualizados. La coordinación concreta entre estas tareas se define en la planificación técnica.
- **Significado de la Semana**: La semana se identifica por la semana ISO del lunes de generación; el equipo refleja los datos acumulados de la temporada a esa fecha (incluida la actividad de la semana anterior).
- **Repetición entre Semanas**: Como las cotizaciones se basan en estadísticas acumuladas de la temporada, el once puede repetirse en semanas consecutivas. Una variante ordenada por variación semanal de cotización queda fuera de alcance.
- **Elegibilidad por Minutos**: El umbral de 270 minutos acumulados es un valor de referencia fijo en esta versión.
- **Integración con Modal Preexistente**: La apertura del detalle de jugador reutiliza el componente modal ya existente en el catálogo y marketplace (especificaciones `010-player-detail-modal` y `013-marketplace-frontend`, esta última con la sección de operación del marketplace), pasando el identificador del jugador seleccionado para no duplicar lógica de negocio ni componentes de presentación.
- **Moneda de Cotización**: Las cotizaciones mostradas en la cancha corresponden a la cotización oficial de mercado del token expresada en créditos de la plataforma.
- **Elegibilidad de Ligas**: Se evalúan todos los futbolistas activos de las 5 grandes ligas europeas soportadas en el sistema (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) de forma integrada sin requerir filtros por liga en esta versión.
