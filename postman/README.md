# Guía de Pruebas con Postman (Grupo Q)

Esta carpeta contiene la colección completa de endpoints y el entorno de variables para probar manualmente todos los módulos de la plataforma:
- **Autenticación (JWT y Roles)**
- **Catálogo y Ranking de Jugadores**
- **Gobernanza y Estrategias de Cotización (Marketplace)**
- **Order Management System (OMS) Primario y Secundario**
- **Portfolio Valorizado y Transacciones de Usuario**
- **Auditoría Global con Trazabilidad de Estrategia**
- **Scraping de Estadísticas WhoScored**

---

## Archivos disponibles

1. `collection.json`: Colección completa v2.1 con scripts de pruebas (`pm.test`), extracción automática de tokens JWT y UUIDs, y propagación de variables.
2. `football_tokens.postman_environment.json`: Entorno local preconfigurado (`base_url: http://localhost:3000`).
3. `football_tokens_auth.postman_collection.json`: Colección histórica de autenticación inicial (conservada para referencia).

---

## Preparación antes de ejecutar

1. **Asegurar que la base de datos PostgreSQL local esté corriendo:**
   ```bash
   docker compose up -d postgres
   ```
2. **Asegurar que el backend esté iniciado con variables de superusuario ADMIN en `backend/.env`:**
   ```bash
   # En backend/.env:
   ADMIN_CORREO=admin@marketplace.com
   ADMIN_CONTRASENA=Admin1234!
   ADMIN_NOMBRE="Administrador Marketplace"
   ```
3. **Iniciar el backend:**
   ```bash
   cd backend && npm run start:dev
   ```

---

## Importación en Postman

1. Abrir Postman.
2. Hacer clic en **Import** (esquina superior izquierda).
3. Seleccionar los archivos:
   - `postman/collection.json`
   - `postman/football_tokens.postman_environment.json`
4. Seleccionar el entorno **"Football Player Tokens - Local"** en el selector de entornos (arriba a la derecha).

---

## Flujo de Prueba Recomendado (Paso a Paso o Collection Runner)

La colección está diseñada para ejecutarse secuencialmente mediante el **Runner** de Postman o de forma individual paso a paso:

```text
1. Auth
   ├── POST Register (trader1)                  -> Registra trader1 (o 409 si existe), valida rol USUARIO y saldo, setea trader1_token / trader1_id
   ├── POST Register (trader2)                  -> Registra trader2 (o 409 si existe), valida rol USUARIO y saldo, setea trader2_token / trader2_id
   ├── POST Register inválido (-> 400)          -> Valida rechazo 400 y formato estándar de error
   ├── POST Register correo duplicado (-> 409)  -> Valida rechazo 409 ante correo duplicado
   ├── POST Login ADMIN                         -> Obtiene JWT del superusuario ADMIN, valida rol ADMIN y saldo, setea admin_token
   ├── POST Login trader1                       -> Obtiene JWT de trader1, valida rol USUARIO y saldo, setea trader1_id
   ├── POST Login trader2                       -> Obtiene JWT de trader2, valida rol USUARIO y saldo, setea trader2_id
   ├── POST Login credenciales inválidas (-> 401)-> Valida rechazo 401 ante credenciales incorrectas
   ├── GET Perfil Autenticado (trader1)         -> Consulta GET /auth/me con Bearer trader1 (rol USUARIO, saldo >= 0)
   ├── GET Perfil Autenticado (ADMIN)           -> Consulta GET /auth/me con Bearer ADMIN (rol ADMIN, saldo >= 0)
   ├── GET Perfil sin token (-> 401)            -> Valida rechazo 401 ante consulta sin token
   ├── POST Logout (trader1)                    -> Cierre de sesión 200 OK con mensaje de confirmación
   └── POST Logout sin token (-> 401)           -> Valida rechazo 401 ante logout sin token

2. Catálogo de Jugadores
   ├── GET Catálogo Paginado                    -> Extrae y guarda el primer jugador_id
   ├── GET Filtros Disponibles                  -> Retorna ligas, equipos y posiciones
   ├── GET Ranking Jugadores                    -> Ranking por cotización vigente
   ├── GET Ficha Jugador por ID                 -> Detalle completo del jugador
   └── GET Historial Cotizaciones Jugador       -> Cotizaciones históricas inmutables del jugador

3. Cotización (Gobernanza ADMIN)
   ├── GET Estrategia Activa                    -> Consulta estrategia activa (GLOBAL o POSICIONAL)
   ├── PUT Cambiar Estrategia (ADMIN)           -> Conmuta a POSICIONAL (200 OK)
   ├── PUT Cambiar Estrategia (ADMIN)           -> Restaura a GLOBAL (200 OK)
   ├── PUT Cambiar Estrategia (USUARIO -> 403)  -> Valida rechazo 403 y envoltorio de error para USUARIO
   └── POST Recalcular Cotizaciones Manual      -> Emite cotizaciones oficiales para todos los jugadores

4. OMS - Mercado Primario
   └── POST Comprar Tokens (Primario)           -> trader1 compra 5 tokens al precio oficial del ADMIN

5. OMS - Mercado Secundario
   ├── POST Publicar Orden de Venta             -> trader1 publica 2 tokens a $2.50 (bloqueo en custodia)
   ├── GET Libro de Órdenes de Venta            -> Lista ofertas activas para el jugador
   ├── POST Comprar Oferta Puntual (Secundario) -> trader2 compra 1 token de la oferta de trader1
   ├── POST Autocompra propia oferta (-> 400)   -> trader1 intenta comprar su propia oferta (rechazo 400 y envoltorio de error)
   └── DELETE Cancelar Orden de Venta           -> trader1 cancela el token restante (libera custodia)

6. Portfolio y Auditoría
   ├── GET Portfolio Propio (trader1)           -> Saldo, tenencias, valuación actual y PnL
   ├── GET Portfolio Ajeno sin ADMIN (-> 403)   -> trader1 intenta ver portfolio de trader2 (403 y envoltorio de error)
   ├── GET Historial Transacciones usuario      -> Transacciones de trader1 con snapshot de estrategia
   ├── GET Auditoría Global Transacciones (ADMIN) -> Trazabilidad global completa para ADMIN
   └── GET Auditoría Global (USUARIO -> 403)    -> Rechazo 403 y envoltorio de error si un trader consulta auditoría admin

7. Scraping WhoScored
   ├── GET Estadísticas Jugador                 -> Estadísticas del jugador para la temporada activa (200 OK / 404 controlado)
   ├── POST Ejecutar Scraping Manual (ADMIN)    -> Dispara pipeline de recolección de estadísticas (200/201/202)
   └── GET Historial Ejecuciones (ADMIN)        -> Histórico de ejecuciones y estado del scraping (200 OK)
```

---

## Cuentas de Prueba Preconfiguradas

| Rol | Correo | Contraseña | Saldo Inicial |
| --- | --- | --- | --- |
| **ADMIN** | `admin@marketplace.com` | `Admin1234!` | $100,000.00 (Tenedor inicial de tokens) |
| **Trader 1** | `trader1@marketplace.com` | `Trader1234!` | $1,000.00 |
| **Trader 2** | `trader2@marketplace.com` | `Trader1234!` | $1,000.00 |

---

## Verificación Tripartita Automatizada: Postman ↔ Swagger ↔ Contratos REST (DoD #3)

En cumplimiento de **DoD #3**, `FR-033`, `FR-034`, `FR-035` y `SC-008`, la colección `postman/collection.json` se encuentra sincronizada y formalmente verificada contra el Swagger OpenAPI generado en tiempo real (`SwaggerModule.createDocument`) y los contratos REST versionados del proyecto mediante la suite de integración contractual:

```bash
npm run test:integration -- test/integration/marketplace/postman-swagger-parity.spec.ts test/integration/marketplace/auth-perfil-rol.spec.ts
```

### Resultados de la Verificación Automatizada (29/29 Tests Aprobados)

- **`postman-swagger-parity.spec.ts`**: **24 tests pasados** verificando:
  1. **Paridad Swagger vs. OpenAPI Contract (`openapi-auth-perfil-v1.1.yaml`)**:
     - Las rutas `/auth/register`, `/auth/login`, `/auth/me` y `/auth/logout` coinciden exactamente en verbos, códigos de estado y esquemas.
     - `PerfilUsuarioDto` en Swagger expone `id`, `nombre`, `correo`, `activo`, `creadoEn`, `rol` (`enum: ['USUARIO', 'ADMIN']`) y `saldo` (`number >= 0`).
  2. **Vigencia Inmutable de los 17 Endpoints del Grupo B**:
     - Los 17 endpoints preexistentes de Marketplace, OMS, Portfolio, Auditoría, Catálogo y Scraping se verificaron en `swaggerDoc.paths` con resultado **"Conforme — Vigente sin cambios de API"** (0 modificaciones de controladores o rutas en backend).
  3. **Paridad Postman `collection.json` vs. Swagger Vivo**:
     - **100% de cobertura**: los 20 endpoints auditados (3 Grupo A + 17 Grupo B) están presentes en la colección.
     - Toda URL y método de Postman mapea a una operación existente en Swagger.
     - Todos los requests cuentan con bloques de aserción `pm.test(...)`.
     - La carpeta `1. Auth` valida explícitamente `rol`, `saldo`, `tokenDeAcceso`, `tipo === 'Bearer'` y el envoltorio estándar `{ codigoEstado, mensaje, marcaDeTiempo }` en casos 400, 401 y 409.
     - Todos los payloads de requests exitosos respetan las propiedades declaradas en los esquemas Swagger.
- **`auth-perfil-rol.spec.ts`**: **5 tests pasados** ejecutando llamadas HTTP reales con Supertest contra PostgreSQL 16 Testcontainers (`201`, `200` ADMIN, `200` USUARIO, `401` sin token y `GET /auth/me`), confirmando que las respuestas emitidas satisfacen idénticas invariantes a las validadas en Postman.

### Clasificación Contractual de Endpoints

| Categoría | Endpoints | Estado y Resultado Contractual |
| --- | --- | --- |
| **Grupo A (Modificados)** | `POST /auth/register`<br>`POST /auth/login`<br>`GET /auth/me` | **Sincronizado**: Extensión aditiva exclusiva de DTO (`PerfilUsuarioDto.{rol, saldo}`). Cero cambios en `AuthController`, guards o rutas. |
| **Grupo B (Consumidos inmutables)** | `GET /players/ranking`<br>`GET /players/:id/quotes`<br>`GET /quotes/strategy`<br>`PUT /quotes/strategy`<br>`POST /quotes/recalculate`<br>`GET /orders`<br>`POST /orders/buy`<br>`POST /orders/sell`<br>`DELETE /orders/:id`<br>`GET /users/:id/portfolio`<br>`GET /users/:id/transactions`<br>`GET /admin/transactions`<br>`POST /auth/logout`<br>`GET /players`<br>`GET /players/filters`<br>`GET /players/:id`<br>`GET /scraping/jugadores/:id/estadisticas` | **Conforme — Vigente sin cambios de API**: Verificados 100% contra Swagger vivo y cubiertos con assertions `pm.test` en Postman. |
| **Fuera de alcance frontend** | `POST /scraping/ejecutar`<br>`GET /scraping/ejecuciones` | **Vigentes**: Endpoints administrativos de backend cubiertos con pruebas funcionales de estado en Postman. |

