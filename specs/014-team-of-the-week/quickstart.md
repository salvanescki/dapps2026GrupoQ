# Quickstart & Validation Guide: Equipo de la Semana (Team of the Week)

**Feature**: `014-team-of-the-week`  
**Date**: 2026-11-02  
**Status**: Ready for Implementation  

Esta guía proporciona instrucciones paso a paso para desplegar, validar y ejecutar los escenarios de prueba punta a punta (E2E) de la funcionalidad **Equipo de la Semana** tanto en el backend como en el frontend.

---

## 1. Prerrequisitos y Entorno Local

1. **Node.js**: Versión 20+ instalada.
2. **Docker y Docker Compose**: Activos para ejecutar PostgreSQL y Redis.
3. **Instancias levantadas**:
   ```bash
   # En la raíz del repositorio
   docker compose up -d postgres redis
   ```
4. **Dependencias instaladas**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

---

## 2. Aplicación de Migraciones de Base de Datos

El backend corre las migraciones automáticamente en el arranque (`migrationsRun: true` en `database.config.ts`); la migración `1730500000000-create-team-of-the-week-tables.ts` debe estar registrada en la lista explícita `migrations` de ese archivo.

**Verificación esperada**:
La tabla `equipos_semanales` y `miembros_equipos_semanales` se crean con sus restricciones únicas y claves foráneas según lo especificado en [data-model.md](data-model.md).

---

## 3. Escenarios de Validación Funcional Punta a Punta

### Escenario 1: Estado Vacío Inicial (Instalación limpia)
1. Iniciar la aplicación backend y frontend (`npm run start:dev` en backend, `npm run dev` en frontend).
2. Autenticarse como usuario común (`trader1@marketplace.com` / `Trader1234!`).
3. Navegar a la sección **"Equipo de la Semana"** desde la barra de navegación superior.
4. **Resultado Esperado**:
   - Se muestra un estado vacío amigable con el mensaje: *"Aún no hay ningún Equipo de la Semana disponible"*.
   - El selector de semanas muestra que no hay registros previos.
   - No se presentan errores ni pantallas en blanco.

---

### Escenario 2: Generación Manual Administrativa (`ADMIN`)
1. Iniciar sesión como superusuario (`admin@marketplace.com` / contraseña configurada).
2. Navegar a `/team-of-the-week`. En la esquina superior derecha o panel de gobernanza se visualiza el botón de acción administrativa: **"Generar Equipo de la Semana Actual"**.
3. Presionar el botón para disparar la generación manual vía `POST /team-of-the-week/generate`.
4. **Resultado Esperado**:
   - La API selecciona al once ideal (1 POR, 4 DEF, 3 MED, 3 DEL) con las mayores cotizaciones vigentes entre los futbolistas activos de las 5 grandes ligas europeas con estadísticas válidas.
   - Se invalida la caché Redis y se refresca la vista inmediatamente.
   - La cancha vertical despliega los 11 jugadores en su esquema 4-3-3, con sus nombres, clubes y cotizaciones en créditos.
   - El selector temporal ahora incluye la semana recién calculada con su fecha de generación (ej. *"Semana 45, 2026 - generado el 2/11"*).
   - La URL pasa a `/team-of-the-week/2026/45`; recargar o compartir el enlace muestra la misma semana.

---

### Escenario 3: Interacción Táctica y Apertura de Ficha / Marketplace
1. En la vista de la cancha, hacer clic sobre cualquier jugador (ej. un Delantero).
2. **Resultado Esperado**:
   - Se abre el modal existente `PlayerDetailModal` mostrando su ficha técnica, historial estadístico de WhoScored y panel de compraventa de tokens.
   - Al cerrar el modal, la pantalla regresa a la cancha en el mismo estado de navegación sin recargas.

---

### Escenario 4: Consulta de Histórico de Semanas Anteriores
1. Disparar o simular la generación de una semana histórica adicional.
2. Desplegar el selector de semanas y elegir la semana anterior.
3. **Resultado Esperado**:
   - La cancha se actualiza con la alineación congelada de esa semana.
   - Los precios y scores reflejan el snapshot inmutable registrado en esa fecha, sin verse modificados por cotizaciones posteriores de mercado.

---

### Escenario 5: Rechazo de Generación ante Cupo Incompleto (FR-006)
1. En un entorno de prueba donde una posición táctica (ej. Porteros) no tenga jugadores elegibles.
2. Disparar la generación manual como `ADMIN`.
3. **Resultado Esperado**:
   - La API responde `400` con `{ codigoEstado, mensaje, marcaDeTiempo }` y un mensaje en español que indica qué posición no alcanza el cupo.
   - No se publica ninguna alineación parcial. La pantalla sigue mostrando la última semana completa.

### Escenario 6: Mínimo de 270 minutos
1. Con un jugador de cotización muy alta pero menos de 270 minutos acumulados, generar el equipo.
2. **Resultado Esperado**: ese jugador no integra el once; entra el siguiente elegible de su posición.

### Escenario 7: Semana cerrada e idempotencia
1. Con un equipo ya generado para la semana en curso, se dispara el job automático: no crea un segundo registro ni modifica el existente.
2. Intentar regenerar manualmente una semana anterior a la actual: `400` en español indicando que la semana está cerrada.

### Escenario 8: Semana inexistente en la URL
1. Abrir `/team-of-the-week/2026/1` sin equipo para esa semana.
2. **Resultado Esperado**: mensaje claro en español y botón para volver a la semana más reciente.

---

## 4. Ejecución de Suites de Pruebas Automatizadas

### Backend:
```bash
cd backend

# Tests Unitarios de Dominio (Sin base de datos, aislamiento puro)
npm run test:unit -- test/unit/domain/equipo-semanal.entity.spec.ts

# Tests de Integración (PostgreSQL real con Testcontainers)
npm run test:integration -- test/integration/marketplace/equipo-semanal.service.spec.ts test/integration/marketplace/team-of-the-week.controller.spec.ts

# Verificación de Cobertura Global (mínimo 80% líneas y branches)
npm run test:cov
```

### Frontend:
```bash
cd frontend

# Tests Unitarios y de Integración con Vitest
npm run test:unit
npm run test:integration

# Verificación de Cobertura Frontend
npm run test:coverage
```

---

## 5. Colección de Postman

<!-- Verificación Swagger OK — contratos sincronizados: 2026-11-02 -->

Importar `postman/collection.json` en Postman o ejecutar mediante Newman:
```bash
npx newman run postman/collection.json --folder "7. Equipo de la Semana" -e postman/football_tokens.postman_environment.json
```
Verifica las aserciones de estado para los códigos `200`, `400`, `401`, `403` y `404` descritos en [openapi-team-of-the-week.yaml](contracts/openapi-team-of-the-week.yaml).

---

## Evidencia de Validación

Fecha de validación: 2026-11-02

| Escenario | Descripción | Resultado |
|:---|:---|:---:|
| Escenario 1 | Estado Vacío Inicial (Instalación limpia, sin registros previos) | OK |
| Escenario 2 | Generación Manual Administrativa (`ADMIN`) con selección 4-3-3 e invalidación de caché | OK |
| Escenario 3 | Interacción Táctica y Apertura de Ficha / Marketplace con `PlayerDetailModal` | OK |
| Escenario 4 | Consulta de Histórico de Semanas Anteriores e inmutabilidad de snapshots | OK |
| Escenario 5 | Rechazo de Generación ante Cupo Incompleto (`ReglaDeNegocioException` / 400) | OK |
| Escenario 6 | Exclusión de futbolistas inactivos o con `sinEstadisticas = true` | OK |
| Escenario 7 | Idempotencia en la misma semana y protección de semanas cerradas | OK |
| Escenario 8 | Consulta de semana inexistente con respuesta 404 controlada | OK |


