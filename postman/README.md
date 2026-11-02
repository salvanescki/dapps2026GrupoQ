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
   ├── POST Register (trader1)                  -> Registra trader1 (o 409 si existe), setea trader1_token / trader1_id
   ├── POST Register (trader2)                  -> Registra trader2 (o 409 si existe), setea trader2_token / trader2_id
   ├── POST Login ADMIN                         -> Obtiene JWT del superusuario ADMIN
   ├── POST Login trader1                       -> Obtiene JWT de trader1 y setea trader1_id
   └── POST Login trader2                       -> Obtiene JWT de trader2 y setea trader2_id

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
   ├── PUT Cambiar Estrategia (USUARIO -> 403)  -> Valida rechazo 403 para usuarios sin rol ADMIN
   └── POST Recalcular Cotizaciones Manual      -> Emite cotizaciones oficiales para todos los jugadores

4. OMS - Mercado Primario
   └── POST Comprar Tokens (Primario)           -> trader1 compra 5 tokens al precio oficial del ADMIN

5. OMS - Mercado Secundario
   ├── POST Publicar Orden de Venta             -> trader1 publica 2 tokens a $2.50 (bloqueo en custodia)
   ├── GET Libro de Órdenes de Venta            -> Lista ofertas activas para el jugador
   ├── POST Comprar Oferta Puntual (Secundario) -> trader2 compra 1 token de la oferta de trader1
   ├── POST Autocompra propia oferta (-> 400)   -> trader1 intenta comprar su propia oferta (rechazo 400)
   └── DELETE Cancelar Orden de Venta           -> trader1 cancela el token restante (libera custodia)

6. Portfolio y Auditoría
   ├── GET Portfolio Propio (trader1)           -> Saldo, tenencias, valuación actual y PnL
   ├── GET Portfolio Ajeno sin ADMIN (-> 403)   -> trader1 intenta ver portfolio de trader2 (403)
   ├── GET Historial Transacciones usuario      -> Transacciones de trader1 con snapshot de estrategia
   ├── GET Auditoría Global Transacciones (ADMIN) -> Trazabilidad global completa para ADMIN
   └── GET Auditoría Global (USUARIO -> 403)    -> Rechazo 403 si un trader consulta auditoría admin

7. Scraping WhoScored
   ├── GET Estadísticas Jugador                 -> Estadísticas del jugador para la temporada activa
   ├── POST Ejecutar Scraping Manual (ADMIN)    -> Dispara pipeline de recolección de estadísticas
   └── GET Historial Ejecuciones (ADMIN)        -> Histórico de ejecuciones y estado del scraping
```

---

## Cuentas de Prueba Preconfiguradas

| Rol | Correo | Contraseña | Saldo Inicial |
| --- | --- | --- | --- |
| **ADMIN** | `admin@marketplace.com` | `Admin1234!` | $100,000.00 (Tenedor inicial de tokens) |
| **Trader 1** | `trader1@marketplace.com` | `Trader1234!` | $1,000.00 |
| **Trader 2** | `trader2@marketplace.com` | `Trader1234!` | $1,000.00 |

