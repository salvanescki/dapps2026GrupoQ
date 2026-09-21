# Feature Specification: Catálogo y Filtros de Jugadores de las 5 Grandes Ligas

**Feature Branch**: `003-player-catalog`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Vamos a implementar una funcionalidad de catálogo de jugadores. Para esto vamos a consumir una API externa de football-data.org. De la misma, vamos a traer la información de los jugadores de los equipos de las 5 ligas más grandes de europa (Premier League, Ligue1, Serie A, Bundesliga, La Liga). Como usuario, quiero poder acceder desde nuestro frontend (sitio web) al catálogo de jugadores y poder filtrarlos por liga, posición y equipo. Esto se va a mostrar como una lista de jugadores y un menú donde puedo escoger los filtros que se aplican. El listado de jugadores, una vez traído de la API externa, se guardará en la base de datos local de postgresql. Por ende, no es necesario cada vez que se traen los jugadores llamar a la API."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exploración del Catálogo de Jugadores (Priority: P1)

Como usuario o visitante de la plataforma de tokens de fútbol,
quiero acceder al catálogo de jugadores desde el frontend y visualizar un listado organizado de futbolistas de las 5 grandes ligas europeas con sus datos esenciales (nombre, equipo, liga, posición y nacionalidad),
para conocer la oferta completa de jugadores disponibles en el mercado.

**Why this priority**: Es el núcleo funcional del catálogo. Sin una lista clara y accesible de jugadores, no es posible explorar activos ni aplicar filtros posteriores.

**Independent Test**: Puede probarse de manera autónoma navegando a la sección del catálogo en el sitio web y verificando que se despliega una lista de jugadores pertenecientes a las 5 ligas con sus datos básicos legibles y ordenados.

**Acceptance Scenarios**:

1. **Given** un usuario navegando en la plataforma web, **When** accede a la sección de "Catálogo de Jugadores", **Then** el sistema presenta un listado de jugadores pertenecientes a los clubes de las 5 ligas europeas (Premier League, Ligue 1, Serie A, Bundesliga, La Liga) con su nombre, equipo, liga, posición y nacionalidad.
2. **Given** un usuario visualizando el catálogo, **When** los datos se encuentran en proceso de obtención, **Then** la interfaz despliega un indicador visual de carga (*loading state*) que comunica la actividad en curso sin bloquear abruptamente la pantalla.
3. **Given** un usuario en el catálogo con un volumen extenso de futbolistas, **When** navega por la lista, **Then** el contenido se presenta de forma fluida y paginada (o por lotes progresivos) evitando degradación en el rendimiento visual.

---

### User Story 2 - Filtrado por Liga, Equipo y Posición (Priority: P1)

Como usuario interesado en un perfil específico de futbolista,
quiero utilizar un menú de filtros para seleccionar una liga particular, un equipo concreto y/o una posición táctica (portero, defensa, mediocampista, delantero),
para acotar rápidamente la lista de jugadores a aquellos que cumplen con mis criterios de interés.

**Why this priority**: Es un requerimiento indispensable solicitado expresamente por el usuario para poder explorar y encontrar jugadores de forma dirigida y ágil.

**Independent Test**: Puede probarse seleccionando un valor en cualquiera de los filtros (por ejemplo, "Premier League" o "Delantero") y comprobando que la lista de resultados se reduce inmediatamente mostrando únicamente a los jugadores correspondientes.

**Acceptance Scenarios**:

1. **Given** un usuario en el catálogo de jugadores, **When** selecciona una liga específica en el menú de filtros (ej. "La Liga"), **Then** la lista se actualiza mostrando únicamente futbolistas que pertenecen a clubes de esa competición.
2. **Given** un usuario con una liga seleccionada, **When** despliega el filtro de equipos, **Then** el selector ofrece los clubes que compiten en dicha liga, permitiéndole elegir uno puntual (ej. "Real Madrid") para acotar los resultados a ese club.
3. **Given** un usuario en el catálogo, **When** selecciona una posición táctica (ej. "Mediocampista"), **Then** el listado se actualiza mostrando exclusivamente a los jugadores cuyo rol registrado coincide con dicha posición.
4. **Given** un usuario que aplica múltiples filtros a la vez (ej. Liga: "Serie A" AND Posición: "Delantero"), **Then** el sistema aplica una intersección lógica estricta mostrando solamente a los jugadores que satisfacen simultáneamente todos los criterios seleccionados.

---

### User Story 3 - Restablecimiento de Filtros y Manejo de Búsquedas sin Coincidencias (Priority: P2)

Como usuario que ha configurado múltiples filtros o búsquedas en el catálogo,
quiero disponer de una acción inmediata para restablecer todos los filtros y poder ver mensajes claros cuando no existan resultados para una búsqueda determinada,
para retomar la exploración global sin tener que desmarcar manualmente cada criterio ni quedar desorientado ante listas vacías.

**Why this priority**: Evita callejones sin salida en la navegación y garantiza una recuperación fluida cuando una combinación de filtros resulta demasiado restrictiva.

**Independent Test**: Puede probarse aplicando filtros combinados, pulsando la opción de "Limpiar filtros" o "Restablecer" y verificando que el catálogo regresa de inmediato al estado general sin filtros activos.

**Acceptance Scenarios**:

1. **Given** un usuario que ha aplicado uno o más filtros en el menú, **When** presiona la acción "Limpiar Filtros" o "Restablecer", **Then** el sistema desmarca todas las selecciones y restaura la vista del catálogo general con todos los jugadores disponibles.
2. **Given** un usuario que aplica una combinación de filtros para la cual no existen jugadores registrados (ej. un equipo con una posición sin futbolistas dados de alta en el sistema), **When** se evalúa la consulta, **Then** la interfaz muestra un estado vacío amigable con el mensaje "No se encontraron jugadores que coincidan con los filtros seleccionados" junto a un botón directo para restablecer los filtros.

---

### User Story 4 - Búsqueda Rápida de Jugadores por Texto (Priority: P3)

Como usuario que conoce el nombre o apodo del futbolista que desea encontrar,
quiero disponer de un campo de búsqueda por texto en la cabecera del catálogo,
para ubicar directamente al jugador sin necesidad de recorrer manualmente los menús de ligas y equipos.

**Why this priority**: Acelera significativamente el acceso directo para usuarios con un objetivo de inversión o consulta concreto, complementando la navegación por categorías.

**Independent Test**: Puede probarse escribiendo las primeras letras del nombre de un jugador en la barra de búsqueda y confirmando que la lista se filtra en tiempo real mostrando las coincidencias exactas y parciales.

**Acceptance Scenarios**:

1. **Given** un usuario en el catálogo de jugadores, **When** escribe el nombre o parte del nombre de un jugador en el campo de búsqueda (ej. "Modrić" o "Haaland"), **Then** el listado se filtra mostrando al instante a los futbolistas cuyo nombre coincide parcialmente con el término ingresado.
2. **Given** un usuario que utiliza la barra de búsqueda junto con filtros de menú activos (ej. filtro de posición "Defensa" y término de búsqueda "Van"), **Then** el sistema combina ambos criterios mostrando defensas que coincidan con el texto ingresado.
3. **Given** un usuario que borra el texto de la barra de búsqueda, **When** el campo queda vacío, **Then** el catálogo recupera el listado previo condicionado únicamente por los filtros de menú que estuviesen vigentes.

---

### User Story 5 - Consulta de Ficha Individual de Jugador (Priority: P2)

Como usuario de la plataforma o cliente de la API,
quiero consultar la información individual y detallada de un jugador específico mediante su identificador único (`/players/:id`),
para acceder a su perfil completo con dorsal, fecha de nacimiento, nacionalidad, equipo y liga de pertenencia.

**Why this priority**: Permite obtener la vista de detalle de cualquier futbolista seleccionado en el catálogo, facilitando futuras operaciones de cotización y tokens.

**Independent Test**: Puede probarse enviando una solicitud HTTP `GET /players/{id}` con un UUID válido y verificando que retorna el objeto completo del jugador, y un código `404 Not Found` ante un UUID inexistente.

**Acceptance Scenarios**:

1. **Given** un identificador único válido de un futbolista existente en el sistema, **When** se consulta `GET /players/{id}`, **Then** el sistema retorna la información completa del jugador (id, nombre, dorsal, posición táctica y original, fecha de nacimiento, nacionalidad, equipo y liga) con código `200 OK`.
2. **Given** un identificador que no corresponde a ningún jugador registrado o un formato inválido, **When** se consulta `GET /players/{id}`, **Then** el sistema responde con código `404 Not Found` y un mensaje de error descriptivo en español.

---

### Edge Cases

- ¿Qué ocurre si la fuente de datos externa experimenta demoras o indisponibilidad en el momento en que los usuarios navegan por el catálogo? Las consultas, filtros y búsquedas de los usuarios no se ven afectados, ya que se resuelven exclusivamente contra la base de datos local de la plataforma sin contactar a la API externa en tiempo real.
- ¿Qué ocurre durante el proceso de sincronización o guardado inicial desde la API externa a la base de datos local? El proceso de persistencia debe ser idempotente, actualizando o insertando los registros de ligas, equipos y jugadores sin generar duplicados ni inconsistencias.
- ¿Qué sucede si el usuario selecciona un equipo y luego cambia a una liga a la que ese equipo no pertenece? El sistema debe reiniciar automáticamente la selección de equipo al cambiar de liga para garantizar consistencia entre los filtros.
- ¿Qué ocurre si el nombre de un jugador contiene tildes, diéresis o caracteres especiales (ej. "Ødegaard", "Kroos", "Mbappé")? El motor de búsqueda y filtrado local debe permitir coincidencias insensibles a mayúsculas/minúsculas y tolerar variantes con o sin caracteres diacríticos.
- ¿Qué sucede si un jugador cuenta con una posición táctica no clasificada o ambigua proveniente del proveedor de datos? El sistema debe clasificarlo en la categoría más representativa o asignarle una categoría general sin excluirlo del catálogo global.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer una sección dedicada de "Catálogo de Jugadores" accesible desde la navegación principal de la plataforma web.
- **FR-002**: El sistema DEBE presentar un listado de futbolistas pertenecientes exclusivamente a los clubes de las 5 grandes ligas europeas: Premier League (Inglaterra), Ligue 1 (Francia), Serie A (Italia), Bundesliga (Alemania) y La Liga (España).
- **FR-003**: Cada elemento o tarjeta de jugador en el catálogo DEBE mostrar como información visible: nombre completo, equipo al que pertenece, liga de procedencia, posición táctica y país o nacionalidad.
- **FR-004**: La interfaz DEBE incorporar un menú interactivo de filtros que permita seleccionar de forma independiente: Liga, Equipo y Posición.
- **FR-005**: El selector de Liga DEBE permitir escoger entre las 5 grandes ligas o la opción de "Todas las Ligas".
- **FR-006**: El selector de Equipo DEBE actualizar dinámicamente sus opciones según la liga seleccionada, mostrando únicamente los clubes correspondientes a dicha liga o todos los clubes si no hay liga fija.
- **FR-007**: El selector de Posición DEBE contemplar las categorías: Portero/Arquero, Defensa, Centrocampista/Mediocampista y Delantero, así como la opción de "Todas las Posiciones".
- **FR-008**: El sistema DEBE aplicar los filtros de forma combinada utilizando una regla de intersección (Liga AND Equipo AND Posición).
- **FR-009**: El sistema DEBE proveer un control visible para limpiar o restablecer todos los filtros aplicados en una sola interacción, regresando al estado general del catálogo.
- **FR-010**: La interfaz DEBE incluir una barra de búsqueda textual que permita filtrar jugadores por coincidencia en su nombre de forma rápida e insensible a mayúsculas/minúsculas y acentos.
- **FR-011**: El catálogo DEBE implementar navegación paginada o visualización escalonada para asegurar tiempos de respuesta óptimos ante listas extensas de jugadores.
- **FR-012**: El sistema DEBE mostrar un mensaje amigable y claro en caso de que no existan jugadores que coincidan con la combinación de filtros y búsqueda seleccionada.
- **FR-013**: El sistema DEBE proveer indicadores visuales de estado de carga mientras se recuperan o procesan los datos del catálogo.
- **FR-014**: El sistema DEBE gestionar errores de comunicación con el origen de datos local, desplegando un mensaje explicativo y una opción de reintento para el usuario.
- **FR-015**: El sistema DEBE almacenar y persistir la información de ligas, equipos y jugadores en la base de datos relacional local de la plataforma tras su obtención desde la API externa.
- **FR-016**: Las operaciones de consulta, búsqueda y filtrado del catálogo DEBEN resolverse íntegramente a partir de los datos almacenados localmente en la plataforma, sin realizar llamadas a la API externa en cada interacción o navegación del usuario.
- **FR-017**: El backend DEBE exponer el endpoint `GET /players/:id` para consultar la información individual y detallada de un jugador específico por su identificador único (UUID), retornando sus atributos completos junto a su club y liga, o un error `404 Not Found` en caso de no existir.

### Key Entities *(include if feature involves data)*

- **Liga**: Representa una de las 5 grandes competiciones del fútbol europeo. Atributos conceptuales: identificador único, nombre oficial (ej. Premier League, La Liga, Ligue 1, Serie A, Bundesliga), país o código territorial y emblema representativo.
- **Equipo**: Representa a un club de fútbol que compite en una de las ligas soportadas. Atributos conceptuales: identificador único, nombre oficial del club, nombre abreviado, escudo oficial y liga a la que pertenece.
- **Jugador**: Representa a un futbolista profesional que integra el plantel de un equipo de las 5 grandes ligas. Atributos conceptuales: identificador único, nombre completo, dorsal de camiseta (si aplica), posición en el campo (portero, defensa, mediocampista, delantero), fecha de nacimiento/edad, nacionalidad, equipo al que pertenece y liga asociada.
- **CriterioDeFiltro**: Representa la selección activa de parámetros elegidos por el usuario en el menú; comprende la liga elegida, el equipo elegido, la posición elegida y el texto de búsqueda ingresado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La vista del catálogo despliega la lista inicial de futbolistas en menos de 2 segundos desde el ingreso del usuario en condiciones habituales de red.
- **SC-002**: La aplicación o modificación de un filtro (liga, posición o equipo) actualiza los resultados en pantalla en menos de 300 milisegundos.
- **SC-003**: El 100% de los futbolistas y clubes expuestos en el catálogo corresponden rigurosamente a las 5 grandes ligas europeas definidas.
- **SC-004**: El 95% de los usuarios evalúan como intuitivo y directo el uso del menú de filtros para ubicar a un futbolista determinado en menos de 3 clics.
- **SC-005**: Cuando una combinación de filtros no arroja resultados, el 100% de los casos presenta un estado visual comprensible junto a un botón inmediato de restablecimiento de filtros.
- **SC-006**: La interfaz del catálogo y su menú de filtros se adaptan de forma receptiva tanto a pantallas de escritorio como a dispositivos móviles sin pérdida de contenido ni rupturas de maquetación.
- **SC-007**: El 100% de las consultas y filtrados del catálogo en el frontend se resuelven exclusivamente sobre la base de datos local de la plataforma, registrando 0 llamadas hacia la API externa durante la navegación de los usuarios.

## Assumptions

- La información de ligas, equipos y jugadores obtenida desde la API externa de football-data.org se almacena y persiste de forma permanente en la base de datos relacional local de la plataforma (PostgreSQL). Las consultas, filtros y navegación del catálogo operan exclusivamente sobre esta base de datos local, desacoplando el uso cotidiano de la disponibilidad y límites de tasa (rate limits) de la API externa.
- El catálogo de jugadores es accesible para consulta y filtrado tanto para usuarios con sesión activa como para visitantes de la plataforma web, funcionando como escaparate principal de los activos del mercado; las operaciones de compra y venta de acciones/tokens se integrarán en etapas posteriores con los perfiles autenticados.
- Las posiciones provistas por la fuente de datos externa se estandarizan en las 4 categorías tradicionales: Portero, Defensa, Mediocampista y Delantero.
- Cada jugador pertenece a un único equipo activo a la vez dentro de la temporada en curso en las ligas consideradas.
