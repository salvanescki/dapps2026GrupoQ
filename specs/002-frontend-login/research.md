# Research: Frontend Login & Sesión Inicial

## 1. Toolchain de Frontend y Framework Base

- **Decisión**: Inicializar la aplicación cliente en el directorio `frontend/` utilizando **React 18+**, **TypeScript** y **Vite**.
- **Rationale**:
  - Cumple estrictamente con el Principio I de la Constitución ("Interfaz de Usuario implementada en React") y la sección de Stack Tecnológico.
  - TypeScript provee tipado estricto alineado con los DTOs de autenticación ya expuestos por NestJS en el backend.
  - Vite ofrece arranque instantáneo en desarrollo, Hot Module Replacement (HMR) ultrarrápido y empaquetado optimizado sin sobrecarga de configuración.
  - Es una Single Page Application (SPA) desacoplada que consume la API REST existente de forma pura y stateless.
- **Alternativas consideradas**:
  - *Next.js*: Descartado porque la renderización del lado del servidor (SSR/BFF) añade complejidad innecesaria para una SPA de gestión de portfolio de tokens de jugadores conectada directamente a un backend NestJS ya consolidado.
  - *Create React App*: Descartado por ser una herramienta obsoleta, sin soporte activo y lenta en comparación con Vite.

## 2. Sistema de Diseño, Estética Visual y Temática de Dominio

- **Decisión**: Implementar un sistema de diseño propio con **Vanilla CSS moderno y Variables CSS (Tokens de Diseño)**, centrado en una estética oscura deportiva y financiera (*Dark Mode Marketplace*).
- **Tokens de Diseño**:
  - **Fondos**: `bg-primary: #0a0d14`, `bg-card: rgba(18, 24, 38, 0.85)` con efecto de desenfoque (*glassmorphism*) y bordes sutiles `border: 1px solid rgba(255, 255, 255, 0.08)`.
  - **Acentos de Mercado**: Verde esmeralda (`#10b981`, `#059669`) que evoca el césped de un estadio de fútbol y el rendimiento positivo de cotizaciones financieras.
  - **Acentos de Jugadores/Tier**: Tonos dorados y ámbar (`#f59e0b`) para jerarquía de tokens y trofeos.
  - **Tipografía**: Fuentes modernas y legibles (`Inter`, `system-ui`) con fuerte jerarquía de encabezados, pesos diferenciados y micro-interacciones en focos y botones interactivos.
  - **Feedback Interactivo**: Animaciones fluidas en hover, transiciones en estados de carga (*spinner* SVG integrado y deshabilitación de inputs) y alertas contextuales con bordes y fondos diferenciados para error o éxito.
- **Rationale**:
  - Satisface el pedido del usuario: una interfaz bonita, moderna, simple y coherente con el fútbol y las inversiones, sin sobrecargar la pantalla con elementos distractores.
  - Respeta las directrices de diseño web (evita Tailwind salvo pedido explícito, evita paletas genéricas y colores planos).
- **Alternativas consideradas**:
  - *TailwindCSS*: Evitado conforme a la guía de desarrollo que prioriza Vanilla CSS puro y estructurado para máximo control de estilos salvo solicitud explícita del usuario.
  - *Librerías genéricas (Material UI / Ant Design)*: Descartadas porque su estética prefabricada desentona con el dominio temático deportivo/financiero y satura el bundle.

## 3. Manejo de Sesión, Persistencia del JWT y Ciclo de Autenticación

- **Decisión**: Implementar un **`AuthContext`** con su correspondiente **`AuthProvider`** respaldado por un servicio desacoplado de almacenamiento (`StorageService`) sobre `localStorage`.
- **Flujo de Sesión**:
  1. Al iniciar la aplicación, `AuthProvider` lee el token y perfil almacenados en `localStorage`.
  2. Si existen credenciales guardadas, inicializa el estado con el usuario autenticado.
  3. Al invocar `login(correo, contrasena)`, el servicio consume `/api/auth/login`. Ante una respuesta exitosa (`HTTP 200`), persiste el token JWT y el perfil en `localStorage`, y actualiza el estado global de React.
  4. Al invocar `logout()`, limpia el almacenamiento y reinicia el estado a no autenticado.
- **Rationale**:
  - El backend de NestJS es completamente Stateless; no guarda estado en memoria y devuelve `{ tokenDeAcceso, tipo: "Bearer", usuario: {...} }`.
  - El token debe persistir para sobrevivir a recargas de pantalla (`F5`), garantizando el escenario del requerimiento `FR-008` y criterio `SC-004`.
  - Desacoplar la persistencia en una capa de servicio facilita tests con mocks de almacenamiento sin acoplarse directamente a las APIs del navegador.
- **Alternativas consideradas**:
  - *Redux Toolkit / Zustand*: Descartados por sobreingeniería; para la autenticación y la pantalla inicial provisoria en v1, `Context` nativo de React es suficiente, transparente y rápido.
  - *Almacenar solo en memoria de React*: Descartado porque cualquier recarga de página provocaría la pérdida de sesión del usuario, violando el criterio de aceptación.

## 4. Integración con el Backend y Manejo de Errores

- **Decisión**: Diseñar un cliente HTTP desacoplado (`AuthApiClient`) usando la API nativa `fetch`, tipado con las estructuras del backend (`LoginUsuarioDto`, `RespuestaAutenticacionDto`, `PerfilUsuarioDto`, `ErrorHttpRespuesta`).
- **Contrato Real del Backend Detectado**:
  - **Endpoint**: `POST /api/auth/login`
  - **Payload**: `{ correo: string, contrasena: string }`
  - **Respuesta 200**: `{ tokenDeAcceso: string, tipo: "Bearer", usuario: { id, nombre, correo, activo, creadoEn } }`
  - **Respuesta 401**: `{ codigoEstado: 401, mensaje: "Credenciales inválidas.", marcaDeTiempo: string }`
  - **Respuesta 400**: `{ codigoEstado: 400, mensaje: string[], marcaDeTiempo: string }`
- **Mapeo de Errores en Frontend**:
  - HTTP 401: Mapear directamente el mensaje ("Credenciales inválidas.") o presentarlo claramente en el formulario.
  - HTTP 400: Extraer y unificar los mensajes de validación devueltos por el backend.
  - Excepción de Red (ej. backend no iniciado o sin conexión): Capturar `TypeError: Failed to fetch` y mostrar "No fue posible conectar con el servidor. Verifique su conexión o intente más tarde."
- **Rationale**:
  - Evita inventar contratos; se apoya estrictamente en la implementación ya existente en `backend/src/controllers/auth.controller.ts` y `backend/src/common/filters/http-exception.filter.ts`.
- **Alternativas consideradas**:
  - *Axios*: Descartado en favor de `fetch` nativo para evitar dependencias innecesarias de terceros en esta fase.

## 5. Enrutamiento y Protección de Pantallas

- **Decisión**: Utilizar **`react-router-dom`** (v6) para definir las rutas y componentes de protección:
  - `/login`: Pantalla de inicio de sesión envuelta en un guard `RutaPublica` (si ya está autenticado, redirige automáticamente a `/`).
  - `/`: Pantalla inicial provisoria (resumen del inversor / bienvenida) envuelta en un guard `RutaProtegida` (si no está autenticado, redirige a `/login`).
  - `*`: Redirección por defecto a `/` (o `/login` según corresponda).
- **Rationale**:
  - Cumple de manera limpia y declarativa con los requerimientos `FR-009`, `FR-010`, `FR-013` y `FR-014`.
- **Alternativas consideradas**:
  - *Navegación por estado condicional en `App.tsx`*: Descartada porque impide URLs directas, navegación por historial del navegador y no escala a futuras pantallas de mercado y portfolio.

## 6. Estrategia de Testing en Frontend

- **Decisión**: Utilizar **Vitest** + **React Testing Library** (RTL) + **jsdom**.
  - **Tests Unitarios**: Validaciones locales (`validaciones.test.ts`), servicio de autenticación y manejo de almacenamiento (`auth-api.service.test.ts`, `storage.service.test.ts`).
  - **Tests de Integración de Componentes**:
    - `LoginView.test.tsx`:
      - Comprobar que los campos de correo y contraseña se renderizan con accesibilidad adecuada.
      - Comprobar que inputs vacíos o correo con formato incorrecto muestran mensajes de error y bloquean el envío.
      - Comprobar el estado de carga (botón deshabilitado, indicador visual).
      - Comprobar el manejo exitoso con redirección mockeada y almacenamiento del token.
      - Comprobar la visualización del error ante respuesta 401 del backend.
      - Comprobar el error de conexión cuando la red falla.
    - `RutaProtegida.test.tsx`: Verificar bloqueo a usuarios anónimos y paso a usuarios autenticados.
- **Rationale**:
  - Respeta el Principio III de la Constitución ("Estrategia de Testing Rigurosa").
  - Vitest comparte la misma configuración de Vite, siendo rápido y compatible con la sintaxis de Jest/Testing Library.
  - Respeta el Principio IV ("Inmutabilidad de Tests"): no altera ni afecta ninguno de los tests preexistentes del backend.
- **Alternativas consideradas**:
  - *Jest para el frontend*: Requiere configuración adicional de Babel/ts-jest para soportar módulos ESM y Vite; Vitest es la solución estándar e integrada para proyectos Vite.

## 7. Estándar Lingüístico y Constitución

- **Decisión**:
  - Todos los textos de la interfaz de usuario, mensajes de validación y de error se redactan en **español**.
  - Los nombres de conceptos de dominio en identificadores se redactan en **español sin acentos ni ñ** (`usuario`, `correo`, `contrasena`, `tokenDeAcceso`, `sesion`).
  - Los nombres arquitectónicos y términos técnicos se mantienen en **inglés** (`LoginView`, `AuthContext`, `AuthProvider`, `ProtectedRoute`, `StorageService`, `ApiClient`).
- **Rationale**: Cumplimiento del Principio V de la Constitución.
