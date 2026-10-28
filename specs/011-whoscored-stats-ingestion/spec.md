# Feature Specification: Ingesta Integral de Estadísticas WhoScored e Identidad Externa (Top 5 Ligas)

**Feature Branch**: `feat/scraping-whoscored`  
**Feature Directory**: `specs/011-whoscored-stats-ingestion`  
**Created**: 2026-10-25  
**Last Updated**: 2026-10-25  
**Status**: Draft  

**Input**: User description: "Crear una única feature paraguas para corregir la ingesta de estadísticas de WhoScored en las cinco grandes ligas europeas: Premier League, La Liga, Serie A, Bundesliga y Ligue 1. La rama actual es `feat/scraping-whoscored` y no contiene la implementación de identidad externa/procedencia. Por lo tanto, esta feature debe incluirla desde cero como primera fase. El problema actual es que el scraper lee únicamente las filas visibles de la tabla general de WhoScored y obtiene aproximadamente 10 jugadores por liga, cuando debe obtener la mayoría de los jugadores disponibles, aproximadamente 2.500 en total. La feature debe cubrir estas fases: 1. Identidad externa y procedencia; 2. Descubrimiento de competición, temporada, etapa y equipos; 3. Bootstrap de navegador/sesión y extracción de estadísticas por equipo usando el feed disponible en WhoScored; 4. Agregación, deduplicación y validación de cobertura por liga; 5. Asociación con jugadores locales mediante IDs externos y fallback simple por nombre/equipo; 6. Publicación idempotente y segura después de validar la corrida; 7. Operación, errores, reintentos, observabilidad y tests. La solución debe mantener football-data y WhoScored como fuentes complementarias del mismo modelo local."

---

## 1. Alcance General y Organización en Fases

Esta especificación define una **única feature paraguas** para resolver de forma definitiva la ingesta completa de estadísticas de rendimiento desde WhoScored y dotar al dominio de capacidades de identidad externa multi-fuente y trazabilidad de procedencia.

La feature se organiza en **7 fases funcionales independientes**, diseñadas para implementarse, probarse y auditarse mediante commits separados:

1. **Identidad externa y procedencia:** Coexistencia de identificadores externos (`footballDataId`, `whoScoredPlayerId`, `whoScoredTeamId`), registro de procedencia (fuente, competencia, temporada, etapa), compatibilidad con datos legacy sin inventar valores ficticios y unicidad contextual de estadísticas.
2. **Descubrimiento de competición y equipos:** Identificación dinámica de la estructura de torneo (competencia, temporada activa, etapa) y resolución del catálogo canónico de equipos participantes para las 5 grandes ligas europeas (Premier League, La Liga, Serie A, Bundesliga y Ligue 1).
3. **Extracción completa por equipo:** Obtención del conjunto íntegro de jugadores y estadísticas de rendimiento disponibles por equipo, sin depender de la cantidad de filas visibles inicialmente en la interfaz web ni de la paginación visual sobre tablas, tolerando variaciones en la modalidad de entrega de datos de la fuente.
4. **Agregación, deduplicación y cobertura:** Consolidación de registros de jugadores a nivel de liga, resolución de transferencias y duplicaciones de jugadores entre equipos sin duplicar métricas, y evaluación de umbrales mínimos de cobertura por liga antes de habilitar la publicación.
5. **Asociación local:** Vinculación de jugadores extraídos con el catálogo local priorizando identificadores externos directos, con fallback determinístico por normalización estricta de nombre y equipo, persistiendo el vínculo para corridas subsiguientes y validando un umbral mínimo de asociación por liga.
6. **Publicación segura:** Aplicación de cambios aislada por liga e idempotente sobre las estadísticas vigentes únicamente tras validar satisfactoriamente la cobertura y asociación de dicha liga, preservando los datos existentes ante cualquier anomalía o rechazo.
7. **Operación y auditoría:** Registro integral del ciclo de vida de cada corrida, políticas de reintento automático ante fallas transitorias, emisión de diagnósticos y observabilidad operativa, respaldado por una suite de pruebas automatizadas con verificación sobre entorno real de persistencia.

### 1.1. Reglas y Umbrales Funcionales Unificados

Para garantizar coherencia estricta en toda la especificación, se establecen las siguientes reglas y umbrales por defecto (configurables por liga):

- **Cobertura mínima por liga:** Se establece como umbral operativo inicial configurable un piso de al menos **350 jugadores** con participación/minutos registrados en la temporada activa para considerar válida la extracción de una liga (con un global referencial de al menos **2.000 jugadores** para las 5 ligas combinadas, sobre un universo objetivo estimado de aproximadamente 2.500 jugadores activos). Este valor actúa como salvaguarda preventiva contra extracciones truncadas o incompletas, sin asumir que todas las ligas contarán invariablemente con exactamente ese volumen de jugadores con minutos.
- **Asociación mínima por liga:** Al menos el **85%** de los jugadores extraídos en una liga deben asociarse exitosamente con el catálogo local de jugadores.
- **Aislamiento por liga:** La unidad funcional de validación y publicación es la **liga**. Si una liga no alcanza su umbral operativo de cobertura (definido inicialmente en >= 350 jugadores) o de asociación (>= 85%), esa liga se marca como rechazada y **no publica** datos nuevos, pero **no afecta ni revierte** la publicación de las demás ligas que hayan resultado válidas, ni degrada los datos históricos o vigentes de la liga observada.

### 1.2. Fuera de Alcance (Out of Scope)

- Modificaciones en la interfaz de usuario (Frontend React): la feature impacta exclusivamente en backend y contratos de persistencia/servicio.
- Creación de microservicios, lambdas o módulos desacoplados del backend actual: todo se integra en el módulo existente de scraping y dominio de jugadores.
- Implementación de algoritmos genéricos de búsqueda difusa (*fuzzy matching* probabilístico o fonético no determinístico).
- Rediseño global de la infraestructura de persistencia o despliegue.
- Automatizaciones específicas de CI/CD fuera del requerimiento funcional de permitir ejecuciones tanto periódicas automáticas como manuales bajo demanda.
- Scraping de competiciones secundarias, copas nacionales o torneos internacionales fuera de las 5 ligas europeas principales.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Cobertura Masiva de Estadísticas en las 5 Grandes Ligas (Priority: P1)

Como analista del mercado de tokens deportivos, quiero que el sistema ingeste las estadísticas completas de los jugadores activos en las 5 grandes ligas (Premier League, La Liga, Serie A, Bundesliga, Ligue 1), para que el cálculo de valoraciones y cotizaciones esté fundamentado en el universo real de jugadores y no en una muestra reducida de aproximadamente 10 jugadores por tabla.

**Why this priority**: Es la necesidad primordial del producto. La captura parcial actual (~50 jugadores en total) inhabilita el funcionamiento de mercado para la inmensa mayoría del catálogo.

**Independent Test**: Ejecutar la ingesta para una liga (por ejemplo, Premier League) y verificar que se obtienen y procesan al menos 350 jugadores activos (umbral operativo inicial configurable), superando ampliamente el recorte inicial de filas visibles.

**Acceptance Scenarios**:
1. **Given** las 5 ligas europeas configuradas, **When** culmina una corrida completa del proceso de ingesta, **Then** el sistema almacena las estadísticas de al menos 2.000 jugadores activos únicos en total, alcanzando cada liga aprobada el umbral operativo inicial de al menos 350 jugadores.
2. **Given** un jugador de cualquier club de La Liga que no aparecía entre las primeras filas visibles de la tabla general, **When** se consultan sus métricas, **Then** el sistema retorna sus partidos, minutos, goles, asistencias y métricas de rendimiento reales provenientes de WhoScored.
3. **Given** una liga donde la extracción no alcanza el umbral operativo inicial de 350 jugadores con minutos, **When** la fase de validación evalúa la liga, **Then** se rechaza la publicación para esa liga, se registra la advertencia en la auditoría y los datos vigentes de esa liga permanecen inalterados.

---

### User Story 2 - Identidad Externa Multi-fuente y Trazabilidad de Procedencia (Priority: P1)

Como arquitecto de información del sistema, quiero que cada jugador y cada lote de estadísticas identifiquen con precisión sus orígenes externos (`footballDataId`, `whoScoredPlayerId`, `whoScoredTeamId`, fuente, competencia, temporada y etapa), para que football-data y WhoScored se complementen armoniosamente sin sobrescribir identificadores ni fusionar temporadas o fuentes erróneamente.

**Why this priority**: Es el cimiento estructural indispensable. Sin un modelo de identidad y procedencia multi-fuente, cualquier ingesta masiva corre el riesgo de colisionar identificadores o corromper datos históricos y legacy.

**Independent Test**: Instanciar un jugador que contenga tanto identificador de football-data como de WhoScored y comprobar que ambos coexisten de manera contextual, permitiendo consultas unívocas.

**Acceptance Scenarios**:
1. **Given** un jugador originado en football-data con su identificador correspondiente, **When** se le asocian estadísticas de WhoScored con su identificador externo de WhoScored, **Then** la entidad conserva ambos identificadores de forma explícita sin eliminar ni sobreescribir la referencia original.
2. **Given** registros preexistentes en el sistema que carecen de identificador de WhoScored (datos legacy), **When** se consultan o procesan, **Then** el sistema opera con compatibilidad total manteniendo dichos campos como ausentes sin inventar valores ficticios.
3. **Given** estadísticas de distintas fuentes o distintas temporadas para un mismo jugador, **When** se persisten en el sistema, **Then** se almacenan como registros diferenciados preservando su tupla de procedencia (jugador, fuente, competencia, etapa, temporada).

---

### User Story 3 - Extracción Completa por Equipo sin Dependencia Visual (Priority: P2)

Como administrador de la ingesta de datos, quiero que el sistema obtenga la totalidad de jugadores y estadísticas disponibles por equipo de manera directa, sin depender de la cantidad de filas visibles inicialmente ni de interacciones de paginación visual sobre tablas web.

**Why this priority**: La extracción basada en la vista visual de tablas generales recorta los datos y es susceptible a cambios de interfaz. La extracción por equipo garantiza cobertura completa y mayor resiliencia ante cambios de formato en la fuente.

**Independent Test**: Aislar la fase de extracción para un equipo puntual y constatar que se extrae la nómina íntegra de sus jugadores con participación en la temporada activa, independientemente de cómo se renderice la interfaz gráfica en el navegador.

**Acceptance Scenarios**:
1. **Given** un equipo participante de una liga, **When** se extraen sus estadísticas, **Then** el sistema captura la totalidad de los jugadores con métricas en la etapa activa sin truncarse a un subconjunto visible.
2. **Given** una secuencia de consultas para múltiples equipos de una misma competición, **When** se procesa la lista, **Then** el sistema aplica intervalos de espera controlados para prevenir bloqueos por tasa de uso en la fuente externa.

---

### User Story 4 - Agregación, Deduplicación y Validación de Cobertura por Liga (Priority: P2)

Como responsable de la consistencia de datos, quiero que el sistema unifique los registros de todos los equipos de una liga, consolide jugadores transferidos sin duplicar métricas y verifique que se alcance el umbral de cobertura antes de autorizar la publicación.

**Why this priority**: Evita publicar datos fragmentados o inflados artificialmente por dobles conteos de jugadores transferidos en la misma liga o entre competiciones.

**Independent Test**: Procesar una muestra de datos con un jugador transferido entre dos equipos de la misma liga y constatar que el sistema genera un registro unificado coherente asignado a su contexto vigente sin duplicar minutos ni goles.

**Acceptance Scenarios**:
1. **Given** datos recolectados de todos los equipos de una liga, **When** se ejecuta la agregación, **Then** se genera una nómina consolidada sin identificadores de jugador duplicados para la misma competencia y temporada.
2. **Given** un jugador con participación en dos clubes de la misma liga durante la temporada, **When** la fuente provee métricas acumuladas, **Then** el sistema conserva dichas métricas acumuladas sin sumarlas nuevamente; y si la fuente provee registros separados por club, el sistema los consolida sin duplicar métricas, vinculándolo a su club más reciente según el contexto disponible.
3. **Given** una liga donde el total de jugadores agregados resulta inferior al umbral operativo inicial de 350 jugadores, **When** se evalúa la cobertura, **Then** la liga se declara no apta para publicación y se genera un registro explícito en la auditoría.

---

### User Story 5 - Asociación Local y Fallback Determinístico (Priority: P2)

Como operador de la plataforma, quiero que los registros extraídos se asocien prioritariamente por ID externo de WhoScored, y en su defecto mediante coincidencia determinística por nombre y equipo normalizados, guardando el identificador externo en el jugador local para simplificar corridas posteriores.

**Why this priority**: La asociación por ID directo es certera e inmediata. El fallback determinístico permite descubrir y enriquecer gradualmente los identificadores del catálogo sin riesgo de falsos positivos derivados de aproximaciones difusas.

**Independent Test**: Procesar un jugador sin identificador de WhoScored que coincida unívocamente por nombre normalizado y equipo; verificar que se asocia su estadística y se registra su ID externo localmente para futuras ejecuciones.

**Acceptance Scenarios**:
1. **Given** un jugador local que ya posee su identificador externo de WhoScored, **When** se procesa un registro de WhoScored con ese mismo identificador, **Then** la vinculación se realiza directamente por ID sin recurrir a comparaciones de texto.
2. **Given** un jugador local sin identificador de WhoScored, **When** el registro extraído coincide unívocamente en nombre y equipo bajo normalización estricta (minúsculas, sin tildes ni diacríticos), **Then** se vincula la estadística y se almacena el identificador de WhoScored en la ficha del jugador local.
3. **Given** un registro extraído que no encuentra coincidencia unívoca o resulta ambiguo, **When** finaliza la asociación, **Then** se descarta de la publicación y se anota en el registro de no asociados de la auditoría.
4. **Given** una liga donde la tasa de jugadores asociados respecto a los extraídos es inferior al 85%, **When** se valida la liga, **Then** se rechaza la publicación para esa liga por baja asociación.

---

### User Story 6 - Publicación Aislada, Segura e Idempotente por Liga (Priority: P2)

Como administrador del sistema, quiero que la actualización de estadísticas sea aislada por liga e idempotente, de modo que cada liga aprobada se publique de forma segura sin alterar datos si no hay cambios, y que una liga rechazada no modifique datos propios ni de otras ligas.

**Why this priority**: Protege la integridad de la base de datos contra fallos parciales, evitando que la caída o rechazo de una liga contamine o bloquee las ligas que sí se extrajeron y validaron correctamente.

**Independent Test**: Ejecutar dos veces consecutivas la ingesta para una misma liga con datos idénticos y verificar que la segunda ejecución no incrementa la cantidad de registros ni altera valores numéricos.

**Acceptance Scenarios**:
1. **Given** una liga cuyos datos superaron el umbral operativo de cobertura (>= 350 jugadores) y de asociación (>= 85%), **When** se ejecuta la publicación, **Then** sus estadísticas se persisten bajo patrón de actualización/inserción segura de forma aislada.
2. **Given** una corrida donde La Liga supera las validaciones pero Serie A no alcanza el umbral de cobertura, **When** concluye la fase de publicación, **Then** las estadísticas de La Liga se publican exitosamente mientras que Serie A mantiene intactos sus datos vigentes previos.
3. **Given** la reejecución de una ingesta con los mismos datos de origen, **When** culmina la publicación, **Then** los registros existentes mantienen sus valores sin generar filas duplicadas ni inconsistencias numéricas.

---

### User Story 7 - Operación Resiliente, Reintentos y Auditoría Integral (Priority: P3)

Como equipo de operaciones y DevOps, quiero que el proceso cuente con reintentos automáticos ante contingencias de red y registre métricas detalladas por corrida y por liga (duración, jugadores descubiertos, asociados, rechazados y estado de publicación), tanto para ejecuciones automáticas periódicas como manuales.

**Why this priority**: Asegura la continuidad operativa del sistema y brinda transparencia para auditar la calidad de los datos y detectar oportunamente anomalías en la fuente externa.

**Independent Test**: Simular una falla transitoria de red en la consulta de un equipo y comprobar que el sistema reintenta la operación según la política configurada antes de reportar un error.

**Acceptance Scenarios**:
1. **Given** una falla de conexión temporal al consultar los datos de un equipo, **When** se activa la política de resiliencia, **Then** el sistema reintenta la operación hasta un máximo de 3 intentos con intervalo progresivo antes de registrar la falla.
2. **Given** la finalización de una corrida (sea total o parcialmente exitosa), **When** concluye el proceso, **Then** se genera un registro de auditoría con el resumen de métricas por liga: estado (aprobada/rechazada), total extraído, total asociado, total descartado y detalle de incidencias.

---

## 3. Edge Cases & Consideraciones de Dominio

1. **Jugadores transferidos entre dos ligas cubiertas durante la misma temporada:** Un jugador puede disputar partidos en Premier League y luego en La Liga en el mismo ciclo anual. El sistema debe permitir almacenar el registro de rendimiento correspondiente a cada competencia bajo la misma temporada deportiva, preservando el contexto de cada liga de forma independiente.
2. **Jugadores transferidos dentro de la misma liga:** Si la fuente provee métricas acumuladas de temporada, deben conservarse directamente sin sumar de nuevo; si provee registros parciales por equipo, deben consolidarse sin duplicar estadísticas y vinculándose al equipo más reciente del jugador en dicha liga.
3. **Respuesta bloqueada o desafío de acceso por la fuente externa:** Si la fuente emite códigos de saturación, bloqueo o desafío interactivo, el sistema debe abortar de forma controlada la extracción de la liga afectada, registrar el evento en la auditoría y preservar sin modificaciones las estadísticas vigentes de esa liga.
4. **Variaciones ortográficas y nombres compuestos:** Ante discrepancias entre nombres (por ejemplo, nombres artísticos o apodos frente a nombres completos), se utiliza prioritariamente el identificador externo. En ausencia de este, la normalización estricta resuelve tildes y diacríticos; de existir ambigüedad (dos jugadores locales posibles), el registro no se asocia a ciegas y se envía a revisión en la auditoría.
5. **Jugadores con minutos mínimos o juveniles:** Cualquier jugador que figure en la nómina con participación oficial en la temporada debe ser computado en la extracción y agregación, sin filtros arbitrarios de cantidad de partidos que lo excluyan indebidamente.
6. **Datos legacy preexistentes:** Los registros del catálogo local que provengan únicamente de football-data u otras cargas anteriores deben conservarse funcionales, admitiendo la ausencia de identificadores de WhoScored hasta que una ingesta los asocie válidamente.

---

## 4. Requirements *(mandatory)*

### 4.1. Functional Requirements

#### Fase 1: Identidad Externa y Procedencia
- **FR-101**: El modelo de dominio de jugador MUST admitir la coexistencia explícita y no excluyente de identificadores externos independientes: `footballDataId` (identificador originario de football-data) y `whoScoredPlayerId` (identificador originario de WhoScored).
- **FR-102**: El modelo de dominio de equipo MUST admitir la asociación con su identificador externo correspondiente (`whoScoredTeamId`) y alias conocidos para fines de correlación.
- **FR-103**: Toda estadística de rendimiento MUST registrar metadatos de procedencia completos cuando estén disponibles: fuente de datos (`fuente`), código de competición (`liga`), temporada deportiva (`temporada`) y etapa del torneo (`etapa`).
- **FR-104**: El sistema MUST operar con compatibilidad total sobre registros preexistentes (datos legacy) que carezcan de identificador de WhoScored o de campos de procedencia extendidos, manteniéndolos como ausentes sin inventar valores ficticios.
- **FR-105**: El sistema MUST garantizar unicidad contextual de estadísticas mediante la combinación unívoca de jugador, fuente, competencia, etapa y temporada, impidiendo colisiones entre fuentes complementarias o destrucción de historiales de temporadas o etapas distintas.

#### Fase 2: Descubrimiento de Competición y Equipos
- **FR-201**: El sistema MUST mantener la definición de las 5 grandes ligas europeas objeto de ingesta: Premier League, La Liga, Serie A, Bundesliga y Ligue 1.
- **FR-202**: El sistema MUST resolver la estructura competitiva externa activa (identificadores de torneo, temporada vigente y etapa correspondiente) para cada una de las 5 ligas antes de iniciar la extracción de plantillas.
- **FR-203**: El sistema MUST obtener la nómina canónica de equipos participantes en la etapa activa para cada una de las ligas, asociando a cada club su respectivo identificador externo.

#### Fase 3: Extracción Completa por Equipo
- **FR-301**: El sistema MUST obtener el conjunto completo de jugadores y estadísticas de rendimiento disponibles por equipo para la etapa activa de la competición.
- **FR-302**: La extracción MUST ser independiente de la cantidad de filas visibles inicialmente en la presentación visual de la fuente y no depender de controles de paginación sobre tablas web.
- **FR-303**: El mecanismo de extracción MUST tolerar variaciones en el formato o modalidad concreta en que la fuente entrega la información de las plantillas.
- **FR-304**: La extracción MUST capturar las métricas de rendimiento aprobadas en el catálogo del sistema: partidos jugados, minutos jugados, goles, asistencias, rating oficial de la fuente, tarjetas amarillas/rojas y métricas específicas por posición disponibles.
- **FR-305**: El proceso MUST incorporar pausas e intervalos regulados entre consultas de equipos para evitar saturación de peticiones a la fuente externa.

#### Fase 4: Agregación, Deduplicación y Cobertura
- **FR-401**: El sistema MUST consolidar en una nómina unificada por liga la totalidad de registros extraídos de los equipos pertenecientes a dicha liga.
- **FR-402**: Ante jugadores transferidos o presentes en más de un equipo dentro de la misma liga:
  - Si la fuente entrega estadísticas acumuladas de temporada, el sistema MUST conservarlas sin sumarlas nuevamente.
  - Si la fuente entrega registros separados por equipo, el sistema MUST consolidarlos sin duplicar métricas, vinculando al jugador con su equipo más reciente según el contexto disponible.
- **FR-403**: El sistema MUST evaluar que la nómina consolidada de cada liga alcance un umbral operativo inicial de cobertura mínima configurable, establecido por defecto en **350 jugadores** con minutos/participación registrados por liga como salvaguarda contra extracciones incompletas y calibrable por torneo.
- **FR-404**: Para una corrida global sobre las 5 ligas, el sistema MUST verificar que el volumen total combinado alcance al menos **2.000 jugadores** activos.
- **FR-405**: Si una liga no alcanza su umbral de cobertura mínima, el sistema MUST rechazar la validación de esa liga y bloquear su publicación, manteniendo intactos los datos vigentes de dicha liga.

#### Fase 5: Asociación Local y Fallback Determinístico
- **FR-501**: El sistema MUST asociar cada registro extraído con el jugador local correspondiente priorizando la coincidencia exacta por `whoScoredPlayerId`.
- **FR-502**: En ausencia de identificador externo en el jugador local, el sistema MUST aplicar un fallback determinístico basado en:
  - Normalización estricta de nombres (conversión a minúsculas, remoción de acentos, diacríticos y espacios sobrantes).
  - Coincidencia exacta del nombre normalizado dentro del mismo equipo local (o mediante alias de equipo normalizado de la misma liga).
- **FR-503**: Cuando un jugador local se asocie exitosamente a través del fallback determinístico, el sistema MUST registrar su `whoScoredPlayerId` en su ficha local para habilitar asociación directa por ID en corridas futuras.
- **FR-504**: Todo registro extraído que presente ambigüedad (coincidencia con múltiples jugadores) o carezca de correspondencia unívoca MUST ser descartado de la publicación y registrado en la auditoría como no asociado, sin recurrir a aproximaciones difusas o probabilísticas.
- **FR-505**: El sistema MUST exigir que el porcentaje de jugadores asociados en la liga alcance un umbral mínimo configurable, establecido por defecto en al menos el **85%** de los jugadores extraídos para autorizar la publicación de la liga.

#### Fase 6: Publicación Segura e Idempotente
- **FR-601**: La publicación de estadísticas MUST gestionarse de forma aislada e independiente por cada liga. El éxito o rechazo de una liga no condicionará la publicación de las demás ligas válidas.
- **FR-602**: Ninguna estadística de una liga MUST ser publicada o actualizada en el almacén de datos si la liga no aprobó previamente sus validaciones de cobertura (según el umbral operativo inicial de >= 350 jugadores) y de asociación (>= 85%).
- **FR-603**: La publicación MUST ser idempotente: múltiples ejecuciones con idénticos datos de origen no deben generar registros duplicados ni alterar valores numéricos preexistentes.
- **FR-604**: Ante un rechazo o fallo durante la fase de publicación de una liga, el sistema MUST garantizar que los datos previamente publicados de esa liga y de las demás ligas permanezcan completamente inalterados.
- **FR-605**: Cada estadística publicada MUST registrar su fecha y hora precisa de actualización en el sistema.

#### Fase 7: Operación y Auditoría
- **FR-701**: Las solicitudes de extracción a nivel de equipo MUST incorporar una política de reintento automático ante fallas transitorias de comunicación (máximo 3 reintentos con intervalo progresivo).
- **FR-702**: Toda ejecución del pipeline de ingesta MUST documentar un registro de auditoría que consigne: identificador de corrida, modalidad de disparo (manual o automática periódica), fecha/hora de inicio y fin, estado por liga (aprobada, rechazada, fallida), jugadores extraídos, jugadores asociados, jugadores descartados y catálogo de errores o advertencias.
- **FR-703**: La solución MUST permitir su activación periódica automática y su ejecución manual bajo demanda por parte de operadores autorizados.
- **FR-704**: La implementación de las 7 fases MUST estar respaldada por pruebas automatizadas exhaustivas que verifiquen tanto la lógica de dominio en aislamiento como la persistencia e integración sobre un entorno de base de datos real, garantizando el umbral de cobertura mínimo del 80% estipulado en las directrices de calidad del proyecto.
- **FR-705**: La implementación MUST preservar estrictamente los contratos y la suite de pruebas preexistente, asegurando retrocompatibilidad total.

---

## 5. Key Entities *(Dominio Funcional)*

- **Jugador**: Entidad central del catálogo deportivo. Representa a la persona física que disputa competiciones, identificable mediante su ID de sistema y complementada por sus identificadores externos contextuales (`footballDataId`, `whoScoredPlayerId`), posición, dorsal, equipo y liga asignados.
- **Equipo**: Representa a los clubes pertenecientes a cada liga, con su nombre canónico, liga asignada y posible correlación con su identificador externo (`whoScoredTeamId`) y alias conocidos.
- **Liga / Competición**: Representa los torneos supervisados por el sistema (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) con sus parámetros de cobertura y temporadas activas.
- **Estadística de jugador**: Representa el conjunto de métricas deportivas de un jugador para una competencia, etapa, temporada y fuente dadas, acompañada de sus metadatos de procedencia y fecha de actualización.
- **RegistroAuditoriaIngesta**: Entidad de trazabilidad que documenta la ejecución del proceso de ingesta, sus métricas de cobertura y asociación por liga, y los incidentes o advertencias detectados durante la corrida.

---

## 6. Success Criteria *(mandatory)*

### 6.1. Measurable Outcomes

- **SC-001**: **Volumen total de ingesta masiva**: El sistema ingesta y publica exitosamente las estadísticas de al menos **2.000 jugadores activos únicos** en el conjunto de las 5 grandes ligas europeas en una corrida completa (en contraste con la muestra histórica de ~50 jugadores truncada por la vista visible).
- **SC-002**: **Cobertura mínima por liga**: Cada una de las 5 ligas alcanza y valida el umbral operativo inicial de cobertura (establecido por defecto en al menos **350 jugadores** con participación en la temporada) antes de habilitar su publicación.
- **SC-003**: **Tasa de asociación mínima**: Cada liga publicada alcanza al menos un **85%** de asociación exitosa y unívoca entre los jugadores extraídos y el catálogo local de jugadores.
- **SC-004**: **Idempotencia estricta comprobada**: Dos ejecuciones consecutivas con la misma información de origen producen exactamente la misma cantidad de registros de estadísticas en la base de datos, con 0 inserciones duplicadas y 0 variaciones injustificadas en los valores.
- **SC-005**: **Aislamiento y no contaminación por fallos**: Si 1 de las 5 ligas no supera los umbrales de validación o sufre una interrupción, el 100% de los datos vigentes de esa liga permanecen intactos, mientras que las 4 ligas aprobadas se publican normalmente sin afectación.
- **SC-006**: **Trazabilidad y auditoría completa**: El 100% de las corridas ejecutadas (manuales o automáticas) quedan asentadas en el registro de auditoría con desglose pormenorizado de cobertura, asociación y advertencias por liga.
- **SC-007**: **Calidad de software y no regresión**: Todo el desarrollo de las 7 fases alcanza como mínimo un 80% de cobertura en líneas y ramas con pruebas automatizadas, manteniendo la totalidad de los tests previos en verde sin modificaciones destructivas.

---

## 7. Assumptions

1. **Catálogo Maestro Preexistente**: El catálogo base de jugadores, equipos y ligas del sistema fue provisto inicialmente mediante la integración con football-data.org y sirve como referencia para la asociación inicial de identidades.
2. **Disponibilidad de Información por Equipo**: WhoScored expone la información detallada de los jugadores que componen cada plantilla con sus estadísticas acumuladas en la temporada activa, permitiendo la extracción a nivel de equipo.
3. **Temporada Deportiva Vigente**: La temporada de referencia corresponde al ciclo deportivo europeo activo configurado en el sistema (por ejemplo, 2025/2026).
4. **Capacidad de Normalización Textual**: La normalización determinística (conversión a minúsculas y eliminación de tildes/caracteres diacríticos combinada con el club) es suficiente para asociar unívocamente a más del 85% de los jugadores en la primera corrida, antes de que adquieran su `whoScoredPlayerId` permanente.
5. **Autonomía Operativa de Ligas**: Las ligas se pueden evaluar y publicar como unidades independientes de procesamiento, permitiendo una degradación elegante y granular ante bloqueos o contingencias puntuales en una competición específica.
