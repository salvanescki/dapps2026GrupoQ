# Quickstart: Validación de Catálogo y Filtros de Jugadores

**Feature Branch**: `003-player-catalog`  
**Date**: 2026-09-21  

Esta guía contiene los escenarios de validación paso a paso para verificar el correcto funcionamiento del catálogo de jugadores, la persistencia local en PostgreSQL y la carga diferida con filtros relacionales en el frontend.

---

## 1. Requisitos Previos y Configuración de Entorno

1. **Servicio PostgreSQL y Backend en ejecución**:
   ```bash
   # Asegurar que la base de datos PostgreSQL local esté arriba
   docker compose up -d postgres
   ```
2. **Variables de entorno (`backend/.env`)**:
   Verificar que `FOOTBALL_DATA_API_KEY` y `FOOTBALL_DATA_HEADER=X-Auth-Token` se encuentren configuradas.
3. **Dependencias instaladas**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

---

## 2. Escenario 1: Sincronización Inicial y Consulta del Catálogo (`GET /players`)

**Objetivo**: Probar que al consultar por primera vez `/players`, el backend consulta a la API externa de football-data.org, persiste en PostgreSQL y retorna la lista paginada.

### Pasos:
1. Iniciar el backend en modo desarrollo:
   ```bash
   cd backend && npm run start:dev
   ```
2. Realizar una petición `GET` al catálogo:
   ```bash
   curl -s "http://localhost:3000/players?page=1&limit=5" | jq
   ```

### Resultado Esperado:
- Código HTTP `200 OK`.
- Respuesta JSON con estructura:
  ```json
  {
    "items": [
      {
        "id": "uuid...",
        "nombre": "Bukayo Saka",
        "posicion": "Delantero",
        "nacionalidad": "England",
        "equipo": { "nombre": "Arsenal FC", "escudoUrl": "..." },
        "liga": { "codigo": "PL", "nombre": "Premier League" }
      }
    ],
    "total": 2400,
    "page": 1,
    "limit": 5,
    "totalPages": 480,
    "hasMore": true
  }
  ```
3. Ejecutar una segunda petición inmediata:
   ```bash
   curl -s "http://localhost:3000/players?page=2&limit=5" | jq
   ```
   **Verificación**: El tiempo de respuesta es inferior a 100 ms porque se lee directamente de PostgreSQL local sin contactar la API externa.

---

## 3. Escenario 2: Filtrado por Liga, Equipo y Posición

**Objetivo**: Validar la aplicación de filtros combinados e independientes.

### Pasos:
1. Filtrar únicamente por La Liga (`PD`):
   ```bash
   curl -s "http://localhost:3000/players?league=PD&page=1&limit=5" | jq '.items[].liga.codigo'
   # Todos los items retornados deben tener liga.codigo == "PD"
   ```
2. Filtrar por posición táctica (`Delantero`):
   ```bash
   curl -s "http://localhost:3000/players?position=Delantero&page=1&limit=5" | jq '.items[].posicion'
   # Todos los items retornados deben tener posicion == "Delantero"
   ```
3. Filtrar por Liga (`PD`) y Posición (`Portero`):
   ```bash
   curl -s "http://localhost:3000/players?league=PD&position=Portero&limit=5" | jq '.items[] | {nombre: .nombre, liga: .liga.codigo, posicion: .posicion}'
   ```

---

## 4. Escenario 3: Detalle Individual de Jugador (`GET /players/:id`)

**Objetivo**: Validar la obtención de la ficha individual por ID y el manejo de 404 ante IDs inexistentes.

### Pasos:
1. Tomar un `id` retornado en la consulta general y solicitar su ficha:
   ```bash
   PLAYER_ID=$(curl -s "http://localhost:3000/players?limit=1" | jq -r '.items[0].id')
   curl -s "http://localhost:3000/players/$PLAYER_ID" | jq
   ```
   **Resultado Esperado**: Objeto JSON del jugador con `id`, `nombre`, `posicion`, `posicionOriginal`, `dorsal`, `fechaNacimiento`, `nacionalidad`, objeto completo de `equipo` y objeto de `liga`.

2. Solicitar un ID inexistente:
   ```bash
   curl -s -w "\nHTTP Status: %{http_code}\n" "http://localhost:3000/players/00000000-0000-0000-0000-000000000000"
   ```
   **Resultado Esperado**: Código HTTP `404 Not Found` con mensaje `"Jugador no encontrado."`.

---

## 5. Escenario 4: Interfaz Web y Carga Perezosa (*Infinite Scroll*)

**Objetivo**: Validar visualmente la experiencia de usuario y las reglas estéticas del frontend.

### Pasos:
1. Iniciar el servidor de desarrollo del frontend:
   ```bash
   cd frontend && npm run dev
   ```
2. Abrir el navegador en `http://localhost:5173/players`.
3. **Verificar listado inicial**:
   - Se despliegan tarjetas de jugadores con paleta oscura, bordes translúcidos y acentos verde esmeralda y ámbar según `tokens.css`.
   - Se muestra nombre, posición con badge distintivo, nombre y escudo del equipo, y bandera/país.
4. **Verificar carga perezosa (*lazy loading*)**:
   - Hacer scroll vertical hacia el final de la lista.
   - Al aproximarse al elemento centinela inferior, se activa un micro-spinner y se anexan automáticamente 20 jugadores adicionales a la lista sin saltos bruscos en el scroll.
5. **Verificar menú de filtros desplegable**:
   - Hacer clic en el botón `Filtros` en la parte superior.
   - Se despliega el panel de filtros.
   - Seleccionar `Premier League` en el filtro de liga. Observar que el selector de equipos restringe sus opciones únicamente a los clubes de la Premier League (ej. Arsenal, Manchester City, Liverpool).
   - Seleccionar un equipo inglés (ej. `Arsenal`).
   - Cambiar el filtro de liga a `La Liga`. Observar que el equipo seleccionado se limpia automáticamente para evitar combinaciones absurdas (Premier League + Barcelona o La Liga + Arsenal).
   - Seleccionar la posición `Delantero`.
   - Verificar que la lista se recarga con `page: 1` mostrando los delanteros correspondientes.
6. **Verificar acción de limpieza y estado vacío**:
   - Presionar el botón `Limpiar Filtros`: todos los selectores vuelven a "Todos" y el catálogo muestra nuevamente el universo completo de futbolistas.
   - Realizar una búsqueda textual sin coincidencias (ej. "XYZ9999"): la interfaz muestra el estado vacío amigable con el mensaje *"No se encontraron jugadores que coincidan con los filtros seleccionados"* y un botón directo para reiniciar la búsqueda.

---

## 5. Ejecución de Pruebas Automatizadas

```bash
# Tests unitarios del backend (Dominio y Rich Entity)
cd backend && npm run test:unit

# Tests de integración del backend (Testcontainers + PostgreSQL)
cd backend && npm run test:integration

# Tests del frontend (Vitest + Testing Library)
cd frontend && npm test
```
