# Feature Specification: Registro de Usuario en Frontend

**Feature Branch**: `feature/signup`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Como usuario quiero poder registrarme en la plataforma usando mi mail y un password. Criterios de aceptación: Se debe llamar al endpoint de registro YA creado en el backend (POST auth/register), Deben respetarse el diseño visual previamente aplicado al frontend, Una vez registrado el usuario, redirigir al login, Los errores de la API presentarlos de manera amigable al usuario."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro Exitoso de Nuevo Usuario y Redirección al Login (Priority: P1)

Como visitante o nuevo inversor interesado en el mercado de tokens de fútbol,
quiero completar un formulario con mi nombre, correo electrónico y contraseña,
para crear mi cuenta en la plataforma y ser redirigido a la pantalla de inicio de sesión para ingresar al sistema.

**Why this priority**: Es la funcionalidad principal del flujo de incorporación (onboarding). Permite a nuevos usuarios darse de alta y comenzar a utilizar la plataforma.

**Independent Test**: Puede probarse de manera independiente completando el formulario de registro con datos válidos no existentes previamente, enviando la solicitud y comprobando que el usuario es redirigido automáticamente a la pantalla de login con un mensaje indicando que el registro fue exitoso.

**Acceptance Scenarios**:

1. **Given** un visitante no autenticado en la pantalla de registro, **When** ingresa un nombre válido, un correo electrónico no registrado y una contraseña que cumple con los criterios de seguridad, y presiona el botón de registro, **Then** el sistema procesa la solicitud mostrando un indicador de carga, consume el servicio de registro existente, y al confirmarse la creación de la cuenta redirige al usuario a la pantalla de login.
2. **Given** un usuario que acaba de registrarse exitosamente y es redirigido a la pantalla de login, **When** aterriza en el login, **Then** el sistema presenta una notificación amigable confirmando que la cuenta ha sido creada y que ya puede iniciar sesión con sus credenciales.

---

### User Story 2 - Presentación Clara y Amigable de Errores del Servicio (Priority: P2)

Como usuario que intenta registrarse con datos conflictivos (como un correo ya existente) o cuando el servicio experimenta inconvenientes,
quiero recibir mensajes de error claros, en español y comprensibles,
para entender exactamente qué ocurrió sin ver tecnicismos o códigos de error crudos y saber cómo solucionarlo.

**Why this priority**: Es un criterio de aceptación crítico explícito. Una comunicación deficiente ante errores genera abandono y desconfianza en la plataforma.

**Independent Test**: Puede probarse intentando registrar una cuenta con un correo ya registrado previamente en la base de datos o simulando un fallo de red/servicio, verificando que la interfaz resalte el problema mediante un mensaje comprensible en pantalla sin recargar de forma abrupta ni perder los datos ya ingresados en los otros campos.

**Acceptance Scenarios**:

1. **Given** un usuario completando el formulario de registro, **When** envía un correo electrónico que ya se encuentra registrado por otra cuenta, **Then** el sistema muestra un mensaje claro en español indicando que dicho correo ya está en uso y sugiere iniciar sesión o utilizar otra dirección.
2. **Given** un usuario que envía el formulario de registro, **When** el servicio responde con un error de validación o indisponibilidad temporal, **Then** el sistema captura la respuesta y presenta un aviso amigable y contextual en pantalla, manteniendo habilitado el formulario para un nuevo intento sin congelar la interfaz.

---

### User Story 3 - Validación Local y Experiencia Visual Coherente (Priority: P3)

Como usuario que interactúa con la interfaz de registro,
quiero que el diseño visual respete la identidad estética deportiva/financiera del login y que valide mis datos en tiempo real antes de enviar la solicitud,
para tener una experiencia visual atractiva, consistente e intuitiva que prevenga envíos con datos incompletos o contraseñas débiles.

**Why this priority**: Respeta el criterio de coherencia visual previamente establecido en el frontend (mismo diseño, tipografía, paleta de colores y componentes) y minimiza llamadas innecesarias al backend.

**Independent Test**: Puede probarse accediendo a la vista de registro, validando la coherencia visual con la pantalla de login (tema oscuro/financiero deportivo), e intentando enviar campos vacíos o contraseñas que no cumplan el formato mínimo exigido, verificando los mensajes de ayuda locales.

**Acceptance Scenarios**:

1. **Given** un usuario en la pantalla de registro, **When** deja campos vacíos o ingresa un correo con formato inválido, **Then** el sistema previene el envío y resalta los campos correspondientes indicando qué dato es obligatorio o erróneo.
2. **Given** un usuario ingresando su contraseña, **When** escribe una clave menor a 8 caracteres o sin la combinación requerida (mayúscula, minúscula y número), **Then** el sistema le indica de forma comprensible los requisitos que debe satisfacer su contraseña antes de habilitar el envío.
3. **Given** un usuario en la pantalla de login, **When** hace clic en el enlace para registrarse, **Then** navega a la pantalla de registro cuya estética, controles y estilo visual son completamente consistentes con la pantalla de acceso.
4. **Given** un usuario en la pantalla de registro, **When** hace clic en el enlace para volver a iniciar sesión, **Then** es dirigido a la pantalla de login.

---

### Edge Cases

- ¿Qué sucede si el usuario escribe el correo con espacios adicionales al principio o final o en mayúsculas? El cliente debe sanitizar y normalizar el correo (eliminar espacios y convertir a minúsculas) antes de validar y enviar.
- ¿Qué sucede si el usuario hace clic múltiples veces consecutivas en el botón de registro mientras la petición está en curso? El sistema debe deshabilitar el botón y mostrar un indicador visual de carga para evitar solicitudes duplicadas concurrentes.
- ¿Qué ocurre si la contraseña no coincide con una confirmación de contraseña (si se incluye campo de confirmación)? La validación local debe impedir el envío informando que las contraseñas ingresadas no coinciden.
- ¿Qué sucede si el usuario ya tiene una sesión iniciada e intenta ingresar a la ruta de registro? El sistema debe redirigirlo a la pantalla principal/portfolio tal como ocurre con la pantalla de login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer una pantalla de registro de usuario con la misma identidad visual, estilo y diseño previamente aplicado a la pantalla de login del frontend.
- **FR-002**: El formulario de registro DEBE solicitar el nombre de usuario/completo, correo electrónico y contraseña (y confirmación de contraseña para evitar errores tipográficos).
- **FR-003**: El sistema DEBE validar de forma local en el cliente que el nombre tenga entre 2 y 100 caracteres antes del envío.
- **FR-004**: El sistema DEBE validar de forma local que el correo electrónico no esté vacío y posea un formato sintáctico válido antes del envío.
- **FR-005**: El sistema DEBE validar de forma local que la contraseña cumpla los requisitos de seguridad establecidos (mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número).
- **FR-006**: El sistema DEBE validar localmente que la contraseña y su confirmación coincidan exactamente antes de permitir el envío.
- **FR-007**: El sistema DEBE consumir el endpoint de registro existente en el backend (`POST /auth/register`) enviando los datos requeridos (`nombre`, `correo`, `contrasena`).
- **FR-008**: El sistema DEBE presentar un indicador visual de procesamiento (loading) y deshabilitar los botones de acción durante la petición para evitar envíos múltiples concurrentes.
- **FR-009**: Al recibir una respuesta exitosa de creación de cuenta (código HTTP 201), el sistema DEBE redirigir al usuario automáticamente a la pantalla de login.
- **FR-010**: Tras la redirección exitosa al login, el sistema DEBE mostrar un mensaje amigable confirmando la creación de la cuenta para que el usuario proceda a iniciar sesión.
- **FR-011**: El sistema DEBE capturar los errores emitidos por la API (incluyendo conflicto de correo duplicado HTTP 409 o errores de validación HTTP 400) y traducirlos en mensajes amigables y comprensibles en español en la interfaz.
- **FR-012**: El sistema DEBE proveer enlaces de navegación bidireccionales claros: acceso a la pantalla de registro desde la pantalla de login, y retorno a la pantalla de login desde la pantalla de registro.
- **FR-013**: Si un usuario con sesión activa intenta acceder a la ruta de registro, el sistema DEBE redirigirlo de inmediato al espacio autenticado principal.

### Key Entities *(include if feature involves data)*

- **DatosDeRegistro**: Conjunto de datos provisto por el usuario para su alta; comprende el nombre (`nombre`), correo electrónico (`correo`), contraseña (`contrasena`) y verificación de clave.
- **RespuestaDeRegistro**: Datos devueltos por el backend al registrar un usuario; incluye el token de sesión o confirmación del usuario registrado (`id`, `nombre`, `correo`).
- **MensajeDeNotificacion**: Mensaje contextual amigable mostrado al usuario en la interfaz ante éxito o fallo en el flujo de registro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede completar el proceso de registro y ser redirigido a la pantalla de login en menos de 3 segundos bajo condiciones normales de red local.
- **SC-002**: El 100% de los intentos de registro con campos inválidos o contraseñas no conformes son contenidos por la validación del cliente sin realizar peticiones HTTP innecesarias al backend.
- **SC-003**: En caso de conflicto de correo duplicado u otro error de la API, el sistema muestra el mensaje descriptivo amigable al usuario en menos de 1 segundo tras la respuesta sin recargar la página.
- **SC-004**: La pantalla de registro mantiene el 100% de consistencia con la guía de diseño visual, componentes y paleta de colores de la pantalla de login.
- **SC-005**: La interfaz de registro se adapta fluidamente a pantallas de escritorio y dispositivos móviles sin desbordes horizontales ni fallas de legibilidad.

## Assumptions

- Se asume que el backend cuenta con el endpoint `POST /auth/register` operativo y accesible bajo el prefijo configurado en el frontend (ej. `http://localhost:3000/api` o `/auth/register`).
- El backend maneja el código de estado HTTP 409 para correos duplicados y 400 para fallas de validación de campos.
- El alcance de esta funcionalidad se centra exclusivamente en el registro vía correo y contraseña, y posterior redirección al login. No incluye en esta iteración verificación por email/enlace de confirmación, autenticación social (Google/Apple) ni recuperación de contraseña.
- Se asume que la pantalla de login existente recibirá un parámetro de estado o mensaje flash para notificar al usuario sobre el registro exitoso al ser redirigido.
