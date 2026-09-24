# Research: Registro de Usuario en Frontend (004-frontend-signup)

## 1. Integración con el Frontend Existente y Toolchain

- **Decisión**: Integrar la nueva vista `RegisterView` dentro de la arquitectura SPA de React existente en `frontend/src/`, utilizando el mismo ecosistema de Vite 6, TypeScript 5.6 y React Router DOM 7.
- **Rationale**:
  - Cumple estrictamente con el Principio I de la Constitución ("Interfaz de Usuario implementada en React").
  - Mantiene la consistencia modular establecida en la feature `002-frontend-login`.
  - Reutiliza las utilidades existentes de rutas (`PublicRoute`), el cliente HTTP base (`httpRequest` y `HttpError` en `auth-api.client.ts`), y el sistema de estilos de variables CSS.
- **Alternativas consideradas**:
  - *Crear un modal sobre el login*: Descartado. La navegación mediante rutas dedicadas (`/login` y `/register`) es más accesible, indexable, bookmarkeable y soporta navegación nativa del historial del navegador (botón atrás/adelante).

## 2. Consistencia Visual, Tokens de Diseño y Experiencia de Usuario (UX)

- **Decisión**: Extender los estilos de `frontend/src/styles/login.css` (o unificar en un módulo de estilos compartidos de autenticación `auth.css` / `register.css`) reutilizando el diseño visual tipo glassmorphism y la paleta de colores deportiva/financiera del login.
- **Tokens y Componentes Clave**:
  - **Fondo y Tarjeta**: Mismo fondo oscuro con gradientes radiales (`--bg-primary: #0a0d14`, `--bg-card: rgba(18, 24, 38, 0.85)`), borde sutil (`--glass-border`) y desenfoque de cristal (`--glass-blur`).
  - **Acento y Marca**: Logotipo futbolístico (`⚽`), título de plataforma y línea de brillo superior esmeralda/dorada (`--color-emerald-500`, `--color-amber-500`).
  - **Campos del Formulario**:
    - Nombre completo (`nombre`): icono identificatorio (`👤`).
    - Correo electrónico (`correo`): icono identificatorio (`📧`).
    - Contraseña (`contrasena`): icono identificatorio (`🔒`).
    - Confirmar contraseña (`confirmarContrasena`): icono identificatorio (`🔐`).
  - **Estados Interactivos**:
    - Indicador de carga animado (*spinner* CSS) y deshabilitación de campos y botón principal durante el envío para evitar dobles solicitudes.
    - Mensajes de validación en tiempo real / *on-submit* con ícono y texto en rojo suave (`--color-red-400`).
    - Alerta de error del servidor amigable con ícono de advertencia (`⚠️`) y estilo idéntico al login.
  - **Enlaces de Navegación**:
    - En `LoginView`: enlace `"¿No tienes cuenta? Regístrate aquí"` hacia `/register`.
    - En `RegisterView`: enlace `"¿Ya tienes cuenta? Inicia sesión aquí"` hacia `/login`.
- **Rationale**:
  - Satisface directamente el criterio de aceptación y los requisitos FR-001 y FR-012, asegurando que la estética sea 100% homogénea con la pantalla de acceso ya aprobada.
- **Alternativas consideradas**:
  - *Rediseñar desde cero con otra paleta*: Descartado rotundamente por violar el criterio de coherencia visual exigido por el usuario.

## 3. Validación de Formulario en Cliente y Criterios de Seguridad

- **Decisión**: Implementar funciones de validación pura en `frontend/src/utils/validaciones.ts` (`validarNombre`, `validarFormatoContrasena`, `validarConfirmacionContrasena`, `validarFormularioRegistro`), alineadas con las reglas de dominio del backend (`Usuario.validarFormatoContrasena` e invariantes de `Usuario`).
- **Reglas Validadas en Cliente**:
  - **Nombre**: No vacío, entre 2 y 100 caracteres tras aplicar `trim()`.
  - **Correo**: No vacío, formato válido de email según regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Se sanitiza eliminando espacios periféricos y convirtiendo a minúsculas.
  - **Contraseña**: No vacía, longitud mínima de 8 caracteres, conteniendo al menos 1 letra mayúscula, 1 letra minúscula y 1 número (regexes: `/[A-Z]/`, `/[a-z]/`, `/[0-9]/`).
  - **Confirmación de Contraseña**: Debe coincidir exactamente con la contraseña provista.
- **Rationale**:
  - Resuelve el requisito FR-002 a FR-006 y el criterio SC-002: el 100% de los datos inválidos se detienen en el cliente sin realizar peticiones de red redundantes.
  - Al replicar las validaciones exactas del dominio backend (`Usuario.validarFormatoContrasena`), se asegura que ningún envío válido en cliente sea rechazado por reglas sintácticas del servidor.
- **Alternativas consideradas**:
  - *Librerías externas de validación (Zod / Yup / React Hook Form)*: Descartadas para mantener coherencia con el diseño liviano y las utilidades puras de TypeScript ya implementadas en `validaciones.ts` sin inflar dependencias innecesarias.

## 4. Consumo de API del Backend y Gestión de Errores Amigables

- **Decisión**: Agregar la función `registrarUsuario` en `frontend/src/api/auth-api.client.ts` que realiza una petición `POST /auth/register` (vía prefijo `/api` del cliente Vite) enviando `{ nombre, correo, contrasena }`.
- **Mapeo de Respuestas**:
  - **HTTP 201 Created**: La cuenta se creó exitosamente. Retorna `{ tokenDeAcceso, tipo: 'Bearer', usuario: { id, nombre, correo, activo, creadoEn } }`.
  - **HTTP 409 Conflict**: Correo electrónico duplicado. El backend responde con `{ codigoEstado: 409, mensaje: "El correo electrónico ... ya se encuentra registrado." }`. En el frontend se presenta de manera amigable: *"El correo electrónico ya se encuentra registrado. Intenta iniciar sesión o utiliza otra dirección."*
  - **HTTP 400 Bad Request**: Validación fallida en backend. Se extraen y formatean los mensajes amigablemente.
  - **Fallo de Red / Desconexión (status 0)**: *"No fue posible conectar con el servidor. Verifique su conexión o intente más tarde."*
  - **Errores inesperados (500)**: *"Ocurrió un error inesperado en el servidor. Por favor intenta nuevamente más tarde."*
- **Rationale**:
  - Cumple los requisitos FR-007, FR-011 y SC-003, proporcionando feedback claro, en español y sin tecnicismos.
- **Alternativas consideradas**:
  - *Auto-login inmediato tras registro*: Aunque la API devuelve el JWT en el registro, el requerimiento funcional explícito (FR-009 y User Story 1) establece: *"Una vez registrado el usuario, redirigir al login"*. Se respeta la directriz de negocio explícita.

## 5. Redirección y Notificación Amigable en Login

- **Decisión**: Al completarse exitosamente el registro, invocar `navigate('/login', { state: { mensajeExito: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.' } })`.
- **Modificación en `LoginView`**:
  - Detectar la presencia de `location.state?.mensajeExito` al montar la vista.
  - Renderizar un banner/alerta de éxito amigable en color verde esmeralda (`--bg-success`, `--border-success`, `--color-emerald-400`) con un ícono de confirmación (`✓`).
  - Limpiar el estado de notificación si el usuario interactúa con el formulario para no confundir con futuros intentos.
- **Rationale**:
  - Satisface FR-009, FR-010 y User Story 1, cerrando el ciclo de onboarding con una confirmación visual inequívoca.
- **Alternativas consideradas**:
  - *Toast / snackbar global flotante*: Descartado por simplicidad y congruencia con las alertas existentes dentro de la tarjeta de autenticación.
  - *Query parameters (`/login?registered=true`)*: Descartado en favor de `location.state` de React Router, ya que previene que la alerta permanezca si el usuario comparte o recarga la URL posteriormente.

## 6. Enrutamiento y Protección de Rutas

- **Decisión**: Registrar la ruta `/register` en `frontend/src/routes/AppRoutes.tsx` envuelta con el guard preexistente `PublicRoute`:
  ```tsx
  <Route
    path="/register"
    element={
      <PublicRoute>
        <RegisterView />
      </PublicRoute>
    }
  />
  ```
- **Rationale**:
  - Resuelve directamente el requisito FR-013: si un usuario autenticado intenta navegar manualmente a `/register`, `PublicRoute` lo redirige de inmediato a `/` (dashboard/portfolio).

## 7. Estrategia de Testing

- **Decisión**: Crear una suite de pruebas completa en `frontend/tests/`:
  - **Unitarias (`frontend/tests/unit/validaciones-registro.test.ts`)**:
    - Validación de nombres (vacío, < 2 caracteres, > 100 caracteres, válidos).
    - Validación de correos (vacíos, formatos inválidos, válidos).
    - Validación de contraseñas de dominio (longitud < 8, sin mayúscula, sin minúscula, sin número, válidas).
    - Validación de coincidencia de contraseñas (coincidentes vs distintas).
  - **Integración (`frontend/tests/integration/RegisterView.test.tsx`)**:
    - Renderizado inicial del formulario con todos sus campos, botón de acción y enlaces a login.
    - Prevención de envío y visualización de errores locales con campos vacíos o inválidos.
    - Bloqueo de contraseñas débiles o confirmación no coincidente.
    - Manejo de llamada a API con datos sanitizados, estado de carga deshabilitando controles.
    - Redirección exitosa a `/login` pasando el mensaje de bienvenida en el estado de navegación.
    - Visualización amigable de error HTTP 409 (correo duplicado) sin borrar los demás campos.
    - Visualización amigable ante fallos de conexión a la red.
  - **Integración (`frontend/tests/integration/LoginView.test.tsx`)**:
    - Extender para verificar la presencia del enlace a registro (`/register`) y la visualización de la alerta de bienvenida ante `location.state.mensajeExito`.
- **Rationale**:
  - Respeta los principios III ("Estrategia de Testing Rigurosa") y IV ("Inmutabilidad de Tests") de la Constitución: no se alteran negativamente los tests preexistentes y se garantiza cobertura total de happy paths y edge cases.
