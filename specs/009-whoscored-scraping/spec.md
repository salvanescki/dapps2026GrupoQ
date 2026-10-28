# Feature Specification: Módulo de Scraping de Estadísticas WhoScored

**Feature Branch**: `009-whoscored-scraping`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Generar un módulo de scraping en el backend que traiga estadísticas de WhoScored.com para jugadores de las 5 grandes ligas europeas usando Playwright. Cronjob en GitHub Actions cada 7 días."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar estadísticas actualizadas de jugadores (Priority: P1)

Como usuario de la plataforma, quiero visualizar estadísticas detalladas y actualizadas de los jugadores de las 5 grandes ligas europeas para poder tomar decisiones informadas sobre la compra/venta de tokens.

**Why this priority**: Es el propósito central de la feature. Sin datos reales, el mercado de tokens carece de fundamento objetivo.

**Independent Test**: Puede probarse consultando el endpoint de estadísticas de un jugador específico y verificando que se retornan datos provenientes de una fuente real.

**Acceptance Scenarios**:

1. **Given** que el proceso de scraping se ejecutó exitosamente, **When** un usuario solicita las estadísticas de un jugador, **Then** el sistema retorna goles, asistencias, minutos jugados, partidos jugados y rating WhoScored.
2. **Given** que se solicitan estadísticas de un portero, **When** se consultan sus datos, **Then** el sistema retorna estadísticas de portero (atajadas, goles recibidos, % atajadas, penales atajados, goles evitados) y omite las que no aplican.
3. **Given** que se solicitan estadísticas de un delantero, **When** se consultan sus datos, **Then** el sistema retorna estadísticas ofensivas (goles, tiros, xG, grandes ocasiones) y omite las que no aplican.

---

### User Story 2 - Ejecución automática periódica del scraping (Priority: P2)

Como administrador del sistema, quiero que las estadísticas se actualicen automáticamente cada 7 días sin intervención manual.

**Why this priority**: La automatización es crítica para la sostenibilidad del producto. Datos desactualizados generan desconfianza.

**Independent Test**: Verificar que el cronjob de GitHub Actions está configurado correctamente y que la base de datos registra una fecha de última actualización renovada.

**Acceptance Scenarios**:

1. **Given** que el workflow de GitHub Actions está configurado, **When** transcurren 7 días, **Then** el scraping se ejecuta automáticamente y actualiza la base de datos.
2. **Given** que el scraping automático falla, **When** se produce el error, **Then** el pipeline reporta el fallo y los datos previos permanecen intactos.
3. **Given** que el scraping se ejecutó exitosamente, **When** termina, **Then** todos los jugadores procesados muestran fecha de actualización renovada.

---

### User Story 3 - Actualización incremental sin duplicados (Priority: P3)

Como sistema, quiero que el proceso actualice registros existentes en lugar de duplicarlos para mantener la integridad de la base de datos.

**Why this priority**: Sin upsert, cada ejecución generaría duplicados o inconsistencias que afectarían el mercado de tokens.

**Independent Test**: Ejecutar el scraping dos veces y verificar que el número de registros de jugadores no crece.

**Acceptance Scenarios**:

1. **Given** que un jugador ya existe en la base de datos, **When** el scraping se ejecuta nuevamente, **Then** el registro se actualiza sin crear duplicado.
2. **Given** que un jugador nuevo ficha en alguna de las 5 ligas, **When** se ejecuta el scraping, **Then** el nuevo jugador se inserta con todas sus estadísticas disponibles.

---

### Edge Cases

- Si un campo de la lista candidata de estadísticas no existe en ninguna página de WhoScored (no lo ofrece la plataforma en absoluto): el campo se descarta del modelo de datos durante la etapa de diseño y no se implementa. Esta decisión se toma una vez, al analizar la estructura de la página, no en cada ejecución.
- Si WhoScored presenta captcha o bloqueo de bot: el proceso registra el error y detiene ese jugador/liga sin corromper datos existentes.
- Si la estructura HTML de WhoScored cambia: el proceso falla con error descriptivo, los datos previos permanecen inalterados.
- Si el scraping se interrumpe a mitad (p.ej. timeout de CI): los jugadores ya procesados quedan persistidos; los demás mantienen datos anteriores.
- Si un jugador cambia de club durante la temporada: se actualiza con su nuevo club y liga manteniendo el historial.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer un módulo dedicado en el backend que recolecte estadísticas de jugadores de las 5 grandes ligas europeas (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) desde WhoScored.com mediante navegación automatizada de páginas web.
- **FR-002**: Durante la fase de diseño, se MUST realizar una auditoría de la estructura real de las páginas de WhoScored para determinar cuáles de los siguientes campos candidatos están disponibles como datos estructurados en la plataforma. Solo los campos confirmados como presentes en WhoScored integrarán el modelo de datos final. Los campos no encontrados en la plataforma se descartan definitivamente del modelo. Los campos candidatos a evaluar son: goles, asistencias, tiros totales, tiros al arco, goles esperados (xG), asistencias esperadas (xA), grandes ocasiones generadas o falladas, pases clave, regates intentados, regates completados, pases completados, pases intentados, precisión de pase (%), centros completados, entradas, intercepciones, despejes, bloqueos de tiro, duelos ganados, porcentaje de duelos ganados, duelos aéreos ganados, errores que generaron jugadas peligrosas o de gol, atajadas, goles recibidos, porcentaje de atajadas (%), penales atajados, goles evitados, minutos jugados, partidos jugados, minutos jugados por partido, rating oficial WhoScored, tarjetas amarillas totales, tarjetas rojas totales, tarjetas amarillas por partido, tarjetas rojas por partido, faltas cometidas totales, faltas cometidas por partido y autogoles.
- **FR-003**: El conjunto de campos del modelo de datos de estadísticas MUST estar compuesto exclusivamente por los campos confirmados disponibles en WhoScored tras la auditoría de diseño. Los campos candidatos no encontrados en la plataforma NO se implementan ni se almacenan como null: se excluyen del modelo por completo.
- **FR-004**: El sistema MUST actualizar (upsert) los registros de jugadores existentes y crear nuevos registros para jugadores nuevos, garantizando ausencia de duplicados.
- **FR-005**: El sistema MUST registrar metadatos por ejecución: fecha/hora de inicio, fecha/hora de fin, cantidad de jugadores procesados, cantidad de errores y estado global (éxito/fallo).
- **FR-006**: El sistema MUST exponer un mecanismo de ejecución manual del scraping disparado administrativamente, independiente del cronjob automático.
- **FR-007**: El proceso de GitHub Actions MUST ejecutarse automáticamente cada 7 días mediante un cronjob configurado como workflow de CI/CD.
- **FR-008**: Ante un error de scraping en un jugador individual, el proceso MUST continuar con el siguiente jugador y registrar el error, sin interrumpir el resto del procesamiento.
- **FR-009**: Los datos extraídos MUST asociarse a la entidad Jugador existente en el dominio mediante nombre, club y liga como identificación cruzada mínima.
- **FR-010**: El módulo MUST respetar la arquitectura de 5 capas del proyecto (Controller, Service, Model, Repository) y los principios DDD de la Constitución.

### Key Entities *(include if feature involves data)*

- **EstadisticaJugador**: Representa el conjunto de estadísticas de rendimiento de un jugador para la temporada activa. Atributos: identificador único, referencia al jugador, temporada, liga, el subconjunto de campos estadísticos confirmados como disponibles en WhoScored tras la auditoría de FR-002 (los no disponibles no existen como columnas), fecha de última actualización, fuente de datos.
- **EjecucionScraping**: Registro de auditoría de cada corrida del proceso. Atributos: identificador, fecha/hora de inicio, fecha/hora de fin, cantidad de jugadores procesados, cantidad de errores, estado (exitoso/fallido), detalle de errores.
- **Jugador** *(existente)*: Entidad de dominio ya definida. Esta feature extiende su información con estadísticas vinculadas de WhoScored.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 95% de los jugadores activos de las 5 grandes ligas en WhoScored son procesados y persistidos correctamente en cada ejecución exitosa.
- **SC-002**: Las estadísticas en base de datos tienen una antigüedad máxima de 8 días en condiciones normales (7 días de ciclo + 1 de tolerancia).
- **SC-003**: Un error en el scraping de un jugador individual no impide la actualización de los demás; la tasa de fallo aislado no detiene el proceso global.
- **SC-004**: El cronjob de GitHub Actions se ejecuta automáticamente cada 7 días sin intervención manual y el resultado queda registrado en el historial del workflow.
- **SC-005**: Ejecutar el scraping dos veces consecutivas no incrementa el número total de registros de jugadores en la base de datos (idempotencia).
- **SC-006**: El tiempo total de ejecución del scraping completo (5 ligas) no supera las 4 horas dentro del entorno de CI.

---

## Assumptions

- WhoScored.com mantiene su estructura de páginas de estadísticas de jugadores por liga durante la temporada activa, con cambios menores ocasionales.
- La ejecución desde servidores de GitHub Actions no está bloqueada permanentemente por mecanismos anti-bot de WhoScored (aunque pueden requerirse estrategias de mitigación como delays y user-agent rotation).
- Los datos de estadísticas corresponden a la temporada activa en curso y WhoScored no requiere autenticación para acceder a las páginas de estadísticas.
- La entidad Jugador ya existe en el dominio del proyecto y es posible la vinculación cruzada por nombre, club y liga.
- La base de datos PostgreSQL puede ser alcanzada desde el entorno de GitHub Actions mediante secrets de conexión configurados en el repositorio.
- El módulo de scraping se implementará como un módulo NestJS independiente dentro del backend existente, sin necesidad de un servicio separado.
- La lista de estadísticas provista en FR-002 es un conjunto candidato, no un contrato fijo. Los campos efectivamente implementados dependen de la auditoría de la estructura real de WhoScored realizada en la fase de diseño; los campos ausentes en la plataforma se descartan del modelo y no requieren manejo en runtime.
- Si WhoScored no desglosa "grandes ocasiones generadas" y "grandes ocasiones falladas" por separado, se trata como un único campo combinado (si está disponible); de lo contrario, se descarta.
- La persistencia de historial de estadísticas por temporada está fuera del alcance de v1; se almacena únicamente la temporada activa.
- La exposición de estadísticas WhoScored al frontend es fuera de alcance de v1; esta feature prioriza la ingesta de datos.
