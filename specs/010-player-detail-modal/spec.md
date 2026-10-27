# Feature Specification: Modal de Detalle de Jugador con Estadísticas

**Feature Branch**: `010-player-detail-modal`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Como usuario quiero poder ver las estadísticas detalladas de cada jugador al clickear su card en el catálogo de jugadores del sitio web. Deberá abrirse un modal que muestre todos los detalles del jugador que brinde el backend, los cuales son scrapeados desde whoscored.com. Se deberán traer las estadísticas por el mismo endpoint /players/:id desde el cual se traían y se siguen trayendo las stats del endpoint de football-data.org."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir modal de detalle al hacer click en una card de jugador (Priority: P1)

Como usuario del catálogo de jugadores, quiero hacer click en la card de cualquier jugador y que se abra un modal con toda la información detallada del mismo, incluyendo sus estadísticas de rendimiento de WhoScored, para poder evaluar su desempeño sin abandonar la vista del catálogo.

**Why this priority**: Es la interacción central de la feature. Sin el modal, el usuario no tiene forma de acceder a las estadísticas detalladas desde el catálogo. Es la funcionalidad que directamente satisface el requerimiento del usuario.

**Independent Test**: Puede probarse haciendo click en una card del catálogo y verificando que se despliega un modal con la ficha del jugador y sus estadísticas.

**Acceptance Scenarios**:

1. **Given** que el catálogo de jugadores está cargado y visible, **When** el usuario hace click en la card de un jugador de campo (no portero), **Then** se abre un modal que muestra los datos básicos del jugador (nombre, posición, nacionalidad, equipo, liga, dorsal) y sus estadísticas ofensivas/defensivas relevantes (goles, asistencias, rating, partidos jugados, minutos jugados, tiros por partido, precisión de pase, xG, xA, regates, entradas, intercepciones, entre otras).
2. **Given** que el catálogo de jugadores está cargado y visible, **When** el usuario hace click en la card de un portero, **Then** se abre un modal que muestra los datos básicos del jugador y sus estadísticas específicas de portero (atajadas, goles recibidos, porcentaje de atajadas, despejes por partido, errores que generaron gol).
3. **Given** que el modal de detalle está abierto, **When** el usuario hace click fuera del modal o en el botón de cierre, **Then** el modal se cierra y el catálogo queda visible en el mismo estado en que se encontraba.

---

### User Story 2 - Unificación de datos en el endpoint /players/:id (Priority: P1)

Como usuario, quiero que al consultar el detalle de un jugador, el sistema unifique los datos que ya provenían de football-data.org (nombre, equipo, posición, liga) con las estadísticas scrapeadas de WhoScored.com, todo en una misma respuesta del endpoint `/players/:id`, para obtener un panorama completo del jugador en una sola consulta.

**Why this priority**: Es co-esencial con la US1. Si el endpoint no integra las estadísticas, el modal no puede mostrarlas. Es el habilitador técnico directo de la experiencia de usuario.

**Independent Test**: Puede probarse invocando `GET /players/:id` y verificando que la respuesta contiene tanto la información básica del jugador como el bloque de estadísticas de WhoScored para la temporada activa.

**Acceptance Scenarios**:

1. **Given** que un jugador tiene estadísticas de WhoScored almacenadas para la temporada activa, **When** se consulta `GET /players/:id`, **Then** la respuesta incluye un campo de estadísticas con los datos disponibles de WhoScored diferenciados por rol (portero o jugador de campo).
2. **Given** que un jugador no tiene estadísticas de WhoScored almacenadas (por ejemplo, el scraping aún no se ejecutó o el jugador no fue matcheado), **When** se consulta `GET /players/:id`, **Then** la respuesta contiene la información básica del jugador con el campo de estadísticas ausente o explícitamente nulo, sin producir error.
3. **Given** que un jugador tiene información existente de football-data.org, **When** se agregan estadísticas de WhoScored, **Then** la información previa de football-data.org se conserva intacta y las estadísticas se agregan como complemento.

---

### User Story 3 - Estado de carga y manejo de errores en el modal (Priority: P2)

Como usuario, quiero ver indicadores claros de carga cuando se están obteniendo los datos de un jugador y mensajes informativos si ocurre un error, para entender en todo momento qué está sucediendo.

**Why this priority**: Mejora la experiencia de usuario proporcionando feedback visual durante la carga de datos y manejo gracioso de errores. Es secundaria porque la funcionalidad base puede existir sin ella, pero es necesaria para una experiencia de calidad.

**Independent Test**: Puede probarse simulando un delay o error en la respuesta del endpoint y verificando que el modal muestra un spinner y/o un mensaje de error apropiado.

**Acceptance Scenarios**:

1. **Given** que el usuario hizo click en una card del catálogo, **When** los datos del jugador están siendo cargados desde el endpoint, **Then** el modal muestra un indicador de carga (spinner o skeleton) mientras espera la respuesta.
2. **Given** que la consulta al endpoint `/players/:id` falla por un error de red o del servidor, **When** el modal recibe el error, **Then** muestra un mensaje de error amigable indicando que no se pudieron cargar las estadísticas y ofrece la opción de reintentar.
3. **Given** que el jugador no posee estadísticas de WhoScored, **When** se abre el modal, **Then** se muestra la información básica del jugador y un mensaje indicando que las estadísticas no están disponibles, sin mostrar el bloque de estadísticas vacío.

---

### Edge Cases

- ¿Qué sucede si el usuario hace click rápidamente en múltiples cards consecutivas? El modal debe mostrar siempre los datos del último jugador clickeado, cancelando cualquier petición en vuelo del jugador anterior.
- ¿Cómo se comporta el modal si la conexión a internet se pierde mientras se están cargando las estadísticas? Se muestra un mensaje de error con opción de reintentar.
- ¿Qué ocurre si un jugador tiene estadísticas con todos los campos opcionales en nulo? Se muestra la ficha básica y las estadísticas disponibles (partidos jugados, minutos, tarjetas), omitiendo las métricas nulas en lugar de mostrar campos vacíos.
- ¿Cómo se comporta el modal en resoluciones de pantalla pequeñas (móvil)? El modal se adapta responsivamente ocupando la mayor parte de la pantalla con scroll vertical para las estadísticas.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar un modal superpuesto al catálogo cuando el usuario hace click en cualquier card de jugador.
- **FR-002**: El modal MUST mostrar todos los datos básicos del jugador: nombre, posición (normalizada y original si difieren), nacionalidad, dorsal, equipo (con escudo), liga (con emblema y código).
- **FR-003**: El modal MUST mostrar las estadísticas de rendimiento del jugador obtenidas de WhoScored para la temporada activa, diferenciadas por rol (portero vs. jugador de campo), según lo que retorne el endpoint.
- **FR-004**: El endpoint `GET /players/:id` MUST enriquecer su respuesta actual incluyendo las estadísticas de WhoScored (si existen) junto con la información que ya proviene de football-data.org, manteniendo retrocompatibilidad con la estructura actual.
- **FR-005**: Si el jugador no posee estadísticas de WhoScored, el endpoint MUST retornar la información básica del jugador con el campo de estadísticas ausente (nulo o no presente), sin producir error HTTP.
- **FR-006**: El modal MUST poder cerrarse mediante click en un botón de cierre (X), click fuera del área del modal (overlay), o pulsando la tecla Escape.
- **FR-007**: Mientras los datos del jugador se están cargando, el modal MUST mostrar un indicador visual de carga (spinner o skeleton).
- **FR-008**: Si la consulta al endpoint falla, el modal MUST mostrar un mensaje de error amigable con opción de reintentar la carga.
- **FR-009**: Las estadísticas con valor nulo MUST ser omitidas del modal en lugar de mostrarse como campos vacíos o "N/A".
- **FR-010**: El modal MUST ser responsivo, adaptándose a resoluciones de escritorio y dispositivos móviles con scroll vertical cuando el contenido lo requiera.

### Key Entities *(include if feature involves data)*

- **Jugador** *(existente)*: Entidad de dominio que representa un futbolista. Contiene datos básicos provenientes de football-data.org (nombre, posición, nacionalidad, dorsal, equipo, liga). Se enriquece ahora con las estadísticas asociadas de WhoScored.
- **EstadisticaJugador** *(existente)*: Entidad de dominio que almacena las estadísticas de rendimiento de un jugador para una temporada y liga, scrapeadas desde WhoScored. Contiene métricas diferenciadas por rol (portero vs. jugador de campo).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las cards del catálogo son clickeables y abren el modal de detalle mostrando la información del jugador correcto.
- **SC-002**: Los datos del jugador (básicos + estadísticas si disponibles) se cargan y muestran en el modal en menos de 2 segundos bajo condiciones normales de red.
- **SC-003**: El modal se cierra correctamente en el 100% de los casos mediante las tres vías soportadas (botón X, overlay, tecla Escape).
- **SC-004**: El endpoint `GET /players/:id` retorna las estadísticas de WhoScored integradas junto con los datos existentes de football-data.org para al menos el 90% de los jugadores que tienen estadísticas almacenadas.
- **SC-005**: Cuando un jugador no tiene estadísticas, el modal muestra la ficha básica completa sin producir errores visuales ni de consola.
- **SC-006**: El modal se renderiza correctamente en resoluciones de escritorio (≥1024px) y móvil (320px-768px).

---

## Assumptions

- La entidad `Jugador` y la entidad `EstadisticaJugador` ya existen en el dominio del proyecto y están correctamente vinculadas por `jugadorId`.
- El scraping de WhoScored ya ha sido ejecutado al menos una vez, por lo que hay estadísticas disponibles para la mayoría de los jugadores en la base de datos.
- El endpoint `GET /players/:id` actualmente retorna la información de un jugador individual según la estructura `JugadorItemDto` existente; esta feature lo extiende con estadísticas sin romper la retrocompatibilidad.
- El frontend ya cuenta con una infraestructura de componentes de catálogo (`PlayerCard`, `PlayerGrid`, etc.) y el módulo HTTP (`httpRequest`) para realizar peticiones al backend.
- La autenticación no es requerida para visualizar el detalle de un jugador — el endpoint `GET /players/:id` es público, al igual que lo es actualmente.
- Las estadísticas de WhoScored se muestran únicamente para la temporada activa; el historial por temporadas está fuera del alcance de esta feature.
