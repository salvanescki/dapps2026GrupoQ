# Research: Catálogo y Filtros de Jugadores de las 5 Grandes Ligas

**Feature Branch**: `003-player-catalog`  
**Date**: 2026-09-21  

---

## 1. Integración con la API Externa de football-data.org y Estrategia de Persistencia Local

### Decisión
Utilizar los endpoints de competición de la API v4 de football-data.org:
`GET https://api.football-data.org/v4/competitions/{code}/teams` para los 5 códigos oficiales:
- `PL` (Premier League - Inglaterra)
- `PD` (Primera División / La Liga - España)
- `SA` (Serie A - Italia)
- `BL1` (Bundesliga - Alemania)
- `FL1` (Ligue 1 - Francia)

Almacenar todas las ligas, equipos y miembros de plantel (`squad`) en la base de datos local de PostgreSQL en el primer arranque o consulta al catálogo (si la base de datos se encuentra vacía), logrando persistencia permanente e idempotente. Las consultas posteriores de los usuarios se resuelven 100% contra PostgreSQL.

### Racionalidad
1. **Consumo eficiente de cuota de API**: La API de football-data.org en su plan gratuito impone una restricción de 10 peticiones por minuto. Al utilizar `GET /competitions/{code}/teams`, cada llamada retorna tanto la información de la competición, como la lista completa de equipos y sus respectivos planteles (`squad` con lista de jugadores, posición, fecha de nacimiento y nacionalidad). Con exactamente **5 peticiones HTTP** se obtiene el catálogo íntegro de las 5 grandes ligas (~96-100 clubes y ~2.500 jugadores), sin exceder el rate limit ni requerir cientos de llamadas individuales por equipo.
2. **Desacoplamiento y Disponibilidad (A.C.I.D.)**: Según el requerimiento y la especificación, los usuarios de la plataforma no deben depender de la disponibilidad ni latencia de football-data.org. Guardar la estructura en PostgreSQL local garantiza tiempos de respuesta < 200 ms y disponibilidad continua.
3. **Idempotencia de sincronización**: El guardado implementa lógica de inserción/actualización basada en los identificadores externos (`externalId`) provistos por la API, garantizando que ejecuciones repetidas no dupliquen ligas, equipos o futbolistas.

### Alternativas Consideradas
- **Llamadas en tiempo real por cada búsqueda en el frontend**: Descartada rotundamente. Violaría los límites de tasa de la API (10 req/min), degradaría el tiempo de respuesta e incumpliría el requerimiento explícito: *"no es necesario cada vez que se traen los jugadores llamar a la API"*.
- **Consultar equipo por equipo (`/v4/teams/{id}`)**: Descartada porque requeriría casi 100 peticiones secuenciales con demoras obligadas de 6 segundos entre cada una para no bloquear la API Key (tomaría más de 10 minutos la carga inicial). El endpoint `/competitions/{code}/teams` resuelve todo en 5 peticiones.

---

## 2. Paginación y Carga Perezosa (Lazy Loading / Infinite Scroll) en el Frontend

### Decisión
Implementar paginación basada en desplazamiento (`limit` y `offset` / `page`) en el backend NestJS y carga perezosa infinita (*infinite scroll*) en el frontend React mediante la API nativa de `IntersectionObserver`.

### Racionalidad
1. **Rendimiento y consumo de memoria**: Cargar 2.500 jugadores simultáneamente en el DOM provocaría congelamiento del navegador y consumo excesivo de memoria. Paginando lotes de 20 o 24 jugadores por página (múltiplo ideal para grids responsivos de 1, 2, 3 o 4 columnas) se asegura un tiempo de renderizado < 50 ms.
2. **Experiencia de usuario fluida**: El usuario percibe una navegación ininterrumpida. Un elemento centinela invisible al final de la lista dispara la carga de la página siguiente cuando el usuario se acerca al pie, mostrando un micro-indicador de carga sin bloquear la vista.
3. **Reinicio determinista al filtrar**: Cuando el usuario altera cualquier criterio de búsqueda o filtro (liga, equipo, posición o texto), la paginación se reinicia inmediatamente a `page: 1` y se reemplaza el contenido.

### Alternativas Consideradas
- **Paginación tradicional con botones numéricos (1, 2, 3...)**: Descartada porque el usuario solicitó explícitamente: *"carga lazy al scrollear el usuario"*.
- **Carga de los 2.500 jugadores en memoria del navegador y filtrado en frontend**: Descartada por mala práctica de escalabilidad y sobrecarga de red en dispositivos móviles o conexiones con datos limitados.

---

## 3. Menú de Filtros Desplegable y Dependencia Relacional (Liga → Equipo)

### Decisión
Diseñar un panel desplegable de filtros interactivo (modal/drawer) accionado por un botón "Filtros" con indicador de filtros activos.
La selección de filtros maneja una dependencia relacional estricta:
1. **Filtro de Liga**: Permite elegir entre "Todas las ligas" o una de las 5 ligas (Premier League, La Liga, Serie A, Bundesliga, Ligue 1).
2. **Filtro de Equipo**: La lista de equipos disponibles en el selector se filtra dinámicamente según la liga elegida. Si se selecciona una liga (ej. "Premier League"), solo se muestran los equipos que compiten en ella (ej. Arsenal, Chelsea, etc.). Si el usuario cambia de liga, cualquier equipo previamente seleccionado que no pertenezca a la nueva liga se deselecciona automáticamente.
3. **Filtro de Posición**: Opciones estandarizadas: "Todas", "Portero", "Defensa", "Mediocampista", "Delantero".
4. **Filtros Combinados**: Se aplican en intersección lógica estricta (`Liga AND Equipo AND Posición AND Búsqueda`).
5. **Acción de Limpieza**: Botón accesible para restablecer todos los filtros a su estado inicial en una sola acción.

### Racionalidad
- Cumple directamente la premisa del usuario: *"no tendría sentido elegir un equipo de una liga por la cual no estás filtrando. Ej, barcelona y tenés elegido la Premier League (el barcelona es parte de La Liga)"*.
- Mantiene la coherencia visual con el sistema de diseño (`tokens.css`): paleta oscura, bordes sutiles, micro-animaciones en apertura, etiquetas de filtros activos (*chips*) con botón de remoción rápida individual.

### Alternativas Consideradas
- **Selectores planos independientes sin validación**: Permitiría estados absurdos (ej. seleccionar Premier League y Barcelona y recibir siempre 0 resultados sin explicación clara). Descartada.

---

## 4. Arquitectura Backend en 5 Capas, DDD y Nombres de Dominio

### Decisión
Cumplir estrictamente la Constitución del proyecto:
1. **Controller (`players.controller.ts`)**:
   - Expone `GET /players` y `GET /players/filters`.
   - Valida query parameters mediante DTOs (`FiltroJugadoresDto`) con `class-validator` y `class-transformer`.
   - Prohibida toda regla de negocio en el Controller; delega a `JugadorService`.
2. **Service (`jugador.service.ts`, `sincronizacion-jugadores.service.ts`)**:
   - Orquesta la obtención del catálogo, verifica si se requiere sincronización inicial, y coordina la persistencia con el repositorio.
3. **Model / Dominio (`jugador.entity.ts`, `equipo.entity.ts`, `liga.entity.ts`)**:
   - Rich Domain Entities. Validaciones de invariantes en constructores / métodos de fábrica `crear()`.
   - Métodos de negocio para normalización y categorización de posiciones (mapeo de términos ingleses de la API externa a las categorías oficiales en español).
   - Interfaces de repositorio (`IJugadorRepository`, `IEquipoRepository`, `ILigaRepository`).
4. **Data Access (`jugador.orm-entity.ts`, `jugador.typeorm-repository.ts`, mappers)**:
   - TypeORM entities desacopladas de las entidades de dominio.
   - Mappers bidireccionales (`JugadorMapper`) que transforman entre ORM y dominio.
   - Consultas optimizadas con índices sobre `ligaId`, `equipoId`, `posicion` y búsqueda insensible a mayúsculas y acentos (`ILIKE` o `unaccent`).
5. **Convención lingüística**: Identificadores y conceptos de dominio en español sin tildes ni 'ñ' (`jugador`, `equipo`, `liga`, `posicion`, `pais`, `activo`), términos técnicos en inglés (`Controller`, `Service`, `Repository`, `Dto`).

### Alternativas Consideradas
- **Entidades anémicas con TypeORM directamente en el dominio**: Estrictamente prohibido por la Constitución (Principio II: Rich Domain Model y DDD).

---

## 5. Estrategia de Testing Riguroso (Constitución Principios III y IV)

### Decisión
- **Tests Unitarios (`test/unit/domain/jugador.entity.spec.ts`)**:
  - Pruebas aisladas sobre la entidad `Jugador`: creación válida, validación de nombre, clasificación de posiciones tácticas, invariantes de equipo y liga.
- **Tests de Integración (`test/integration/jugador.service.spec.ts`, `players.controller.spec.ts`)**:
  - Pruebas de integración sobre `JugadorService` y `JugadorTypeOrmRepository` validando la obtención del catálogo, filtros individuales, filtros combinados y paginación con base de datos real (Testcontainers).
  - Mock del cliente HTTP de la API externa en tests de integración para garantizar pruebas reproducibles, rápidas e independientes de conexión a internet o cuotas de terceros.
- **Preservación estricta de tests existentes**: Ningún archivo en `backend/test/` o `frontend/tests/` será alterado o suprimido.
