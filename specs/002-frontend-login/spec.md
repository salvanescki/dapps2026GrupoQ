# Feature Specification: Frontend Login & Sesión Inicial

**Feature Branch**: `002-frontend-login`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Quiero implementar la primera versión del login del frontend de la aplicación. El frontend todavía no existe. Necesito una pantalla de login simple, clara y visualmente atractiva, acorde al dominio de un mercado de jugadores de fútbol y a la idea de portfolio/inversión, evitando una interfaz excesivamente compleja. Objetivo: Permitir que un usuario existente se autentique desde el frontend utilizando el login ya implementado en el backend. Alcance inicial: Crear la pantalla de login, permitir ingresar las credenciales requeridas por el backend, consumir el endpoint de login existente, gestionar correctamente una autenticación exitosa utilizando el JWT devuelto por el backend, mantener la sesión de forma que el usuario pueda acceder posteriormente a funcionalidades autenticadas, mostrar mensajes claros ante credenciales inválidas u otros errores de autenticación, incluir estados básicos de carga y validación del formulario, tras un login exitoso, llevar al usuario a una pantalla inicial del sistema, aunque sea provisoria. Experiencia visual: La interfaz debe ser simple pero bonita, moderna y coherente con el dominio de fútbol, cotizaciones, mercado y portfolio. La prioridad es que resulte clara y agradable, no construir todavía un diseño completo de toda la aplicación. No es necesario resolver en esta iteración registro de usuarios, recuperación de contraseña, gestión avanzada de sesión ni otras funcionalidades de autenticación. La implementación debe respetar el contrato de autenticación existente en el backend y las reglas definidas en la constitución del proyecto."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticación Exitosa y Acceso al Espacio Inicial (Priority: P1)

Como usuario registrado del mercado de tokens de jugadores de fútbol,
quiero ingresar mi correo electrónico y contraseña en la pantalla de acceso,
para iniciar sesión y ser dirigido al espacio inicial donde visualizo mi entorno y bienvenida.

**Why this priority**: Es el camino crítico de acceso al sistema. Sin la capacidad de autenticarse y acceder al entorno principal, ninguna otra función autenticada del frontend puede ser consumida por el usuario.

**Independent Test**: Puede probarse de forma independiente ingresando credenciales válidas conocidas y verificando que el usuario abandona la pantalla de acceso y es recibido en una pantalla inicial que confirma su identidad activa.

**Acceptance Scenarios**:

1. **Given** un usuario no autenticado en la pantalla de login, **When** ingresa su correo y contraseña válidos y presiona el botón de acceso, **Then** el sistema procesa la solicitud mostrando un indicador de carga, valida las credenciales contra el servicio de autenticación, almacena el token de sesión y redirige al usuario a la pantalla inicial del marketplace.
2. **Given** un usuario que acaba de autenticarse exitosamente, **When** arriba a la pantalla inicial, **Then** la pantalla muestra un mensaje de bienvenida personalizado con el nombre del usuario y la indicación de que su sesión de inversor/usuario se encuentra activa.

---

### User Story 2 - Notificación Clara ante Credenciales Inválidas o Fallo de Acceso (Priority: P2)

Como usuario registrado que comete una equivocación o tiene problemas de acceso,
quiero recibir un mensaje de error claro y comprensible si mis credenciales son incorrectas o si el servicio no está disponible,
para entender de inmediato la causa del problema y poder corregir mis datos sin perder el contexto.

**Why this priority**: Evita la frustración e incertidumbre del usuario ante fallos de credenciales o problemas de comunicación con el servicio de autenticación, preservando la confianza en la plataforma.

**Independent Test**: Puede probarse ingresando una contraseña incorrecta o un correo no registrado, confirmando que la pantalla no se congela, no recarga de forma abrupta y muestra un mensaje contextual explicativo en español.

**Acceptance Scenarios**:

1. **Given** un usuario en la pantalla de login, **When** ingresa un correo o contraseña incorrectos y solicita el acceso, **Then** el sistema notifica claramente "Credenciales inválidas" o un mensaje equivalente comprensible, manteniendo el correo ingresado en el formulario y permitiendo un nuevo intento inmediato.
2. **Given** un usuario intentando iniciar sesión, **When** ocurre un problema de comunicación de red o el servicio de autenticación no responde, **Then** el sistema presenta un aviso indicando la imposibilidad temporal de conectar con el servicio, sin colapsar la interfaz ni dejar el botón bloqueado permanentemente.

---

### User Story 3 - Validación Local y Prevención de Envíos Prematuros (Priority: P3)

Como usuario que interactúa con el formulario de acceso,
quiero que el sistema me advierta de inmediato si omito campos obligatorios o coloco un correo con formato inválido,
para no esperar una respuesta del servidor cuando los datos introducidos son evidentemente erróneos.

**Why this priority**: Mejora la experiencia y velocidad de interacción (feedback instantáneo) y reduce peticiones innecesarias hacia los servicios de backend.

**Independent Test**: Puede probarse enviando el formulario vacío o introduciendo un texto sin estructura de correo, comprobando que se destacan los campos correspondientes con mensajes de advertencia previos a la llamada de red.

**Acceptance Scenarios**:

1. **Given** un usuario en la pantalla de login con los campos vacíos, **When** hace clic en el botón de acceso, **Then** el sistema no envía la solicitud al servicio y muestra mensajes indicando que el correo electrónico y la contraseña son obligatorios.
2. **Given** un usuario que ingresa un texto no correspondiente a una dirección de correo (ejemplo: "usuario_sin_arroba"), **When** intenta avanzar o sale del campo de texto, **Then** el sistema presenta una advertencia sobre el formato requerido de correo electrónico.
3. **Given** un formulario con una petición de autenticación en curso, **When** el usuario hace clic nuevamente en el botón de acceso, **Then** la acción repetida es ignorada y el botón permanece deshabilitado hasta que finalice la solicitud.

---

### User Story 4 - Persistencia Básica de Sesión y Protección de Rutas (Priority: P4)

Como usuario autenticado que navega o actualiza la aplicación,
quiero que mi sesión se conserve activa en mi navegador,
para no tener que reingresar mis credenciales tras una recarga de página o al navegar dentro del espacio autenticado.

**Why this priority**: Garantiza la usabilidad continua y evita que el usuario deba volver a autenticarse en cada interacción o refresco de pantalla.

**Independent Test**: Puede probarse iniciando sesión exitosamente, refrescando la página inicial provisoria y verificando que el usuario permanece autenticado sin ser devuelto al formulario de acceso.

**Acceptance Scenarios**:

1. **Given** un usuario con una sesión válida activa, **When** recarga la pantalla inicial del sistema, **Then** el sistema conserva la identidad del usuario y permanece en la pantalla inicial sin solicitar nuevamente credenciales.
2. **Given** un usuario con una sesión válida activa, **When** intenta ingresar a la ruta de la pantalla de login, **Then** el sistema lo redirige de forma automática al espacio inicial autenticado.
3. **Given** un visitante anónimo sin sesión activa, **When** intenta acceder de forma directa a la pantalla inicial del sistema, **Then** es redirigido a la pantalla de login.

---

### Edge Cases

- ¿Qué sucede si el usuario ingresa su correo electrónico con mayúsculas o espacios accidentales al inicio/final? El sistema debe sanitizar y normalizar los espacios en blanco antes de validar y enviar la solicitud.
- ¿Qué ocurre si la respuesta del servicio tarda más de lo habitual debido a alta latencia de red? La interfaz debe mantener el estado visual de carga y un tiempo límite razonable de espera antes de notificar un mensaje de tiempo de espera agotado.
- ¿Qué sucede si el token de autenticación almacenado localmente es inválido o ha expirado al recargar la aplicación? El sistema debe limpiar de forma transparente la sesión guardada y presentar la pantalla de acceso con un mensaje indicativo.
- ¿Qué ocurre si el usuario abre la aplicación en una pantalla con dimensiones reducidas (móvil o tablet)? La pantalla de login debe adaptarse fluidamente manteniendo la legibilidad, estética deportiva/financiera y accesibilidad de los controles de entrada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer una pantalla de inicio de sesión visualmente orientada al dominio de mercado de tokens de jugadores de fútbol, cotizaciones y portfolios de inversión.
- **FR-002**: El formulario de acceso DEBE solicitar exclusivamente las credenciales reconocidas por el servicio de autenticación: correo electrónico y contraseña.
- **FR-003**: El sistema DEBE validar de forma local en el cliente que el correo electrónico no esté vacío y cumpla con la estructura de una dirección de correo válida antes de despachar la solicitud de acceso.
- **FR-004**: El sistema DEBE validar de forma local en el cliente que el campo de contraseña no esté vacío antes de despachar la solicitud de acceso.
- **FR-005**: El sistema DEBE presentar un indicador visual de carga durante el proceso de autenticación y bloquear envíos duplicados mientras exista una solicitud en curso.
- **FR-006**: El sistema DEBE autenticar al usuario contra el servicio backend utilizando el contrato existente (`/api/auth/login`) enviando los identificadores requeridos (`correo`, `contrasena`).
- **FR-007**: El sistema DEBE procesar la respuesta exitosa del backend (código HTTP 200), extrayendo el token de acceso JWT y la información básica del usuario (`id`, `nombre`, `correo`).
- **FR-008**: El sistema DEBE almacenar el token de acceso y la información del usuario en el almacenamiento local del cliente para mantener la sesión activa a través de recargas.
- **FR-009**: El sistema DEBE redirigir de forma automática al usuario a una pantalla inicial (dashboard / portfolio provisorio) tras una autenticación exitosa.
- **FR-010**: La pantalla inicial DEBE mostrar un saludo con el nombre del usuario autenticado, su correo, un resumen visual preliminar de su estado y una acción explícita para cerrar sesión.
- **FR-011**: Al accionar el cierre de sesión, el sistema DEBE eliminar el token y los datos de sesión almacenados en el cliente y redirigir inmediatamente a la pantalla de login.
- **FR-012**: El sistema DEBE mostrar mensajes de error claros y en español ante fallos de autenticación (ej: credenciales inválidas ante HTTP 401) o problemas de conectividad con el servidor.
- **FR-013**: Si un usuario con sesión activa ingresa a la pantalla de login, el sistema DEBE redirigirlo de inmediato a la pantalla inicial.
- **FR-014**: Si un usuario sin sesión activa intenta acceder a la pantalla inicial, el sistema DEBE redirigirlo a la pantalla de login.

### Key Entities *(include if feature involves data)*

- **CredencialesDeAcceso**: Datos provistos por el usuario en el formulario para identificarse; comprende el correo electrónico (`correo`) y la clave secreta (`contrasena`).
- **SesionDeUsuario**: Estado de autenticación activo en el cliente web; comprende el token de acceso recibido (`tokenDeAcceso`), el tipo de autorización (`Bearer`), la marca de tiempo de inicio de sesión y la referencia al perfil activo.
- **PerfilResumidoUsuario**: Datos mínimos de identidad desplegados en la interfaz tras la autenticación; incluye identificador único (`id`), nombre completo (`nombre`), dirección de correo (`correo`) y estado de actividad (`activo`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con credenciales correctas completa el inicio de sesión y visualiza la pantalla inicial en menos de 3 segundos bajo condiciones normales de red local.
- **SC-002**: El 100% de los intentos de inicio de sesión con campos vacíos o correos con sintaxis inválida son detenidos por la validación local sin disparar llamadas de red al servidor.
- **SC-003**: Ante el ingreso de credenciales incorrectas, el sistema informa el error al usuario en menos de 1 segundo tras la recepción de la respuesta del servicio, sin recargar la página ni perder el correo escrito.
- **SC-004**: Al recargar la página (`F5`), el 100% de las sesiones activas válidas se preservan y mantienen al usuario en la pantalla inicial sin requerir un nuevo login.
- **SC-005**: La interfaz se adapta correctamente a dispositivos de escritorio y móviles sin desbordes horizontales ni solapamientos de elementos visuales.

## Assumptions

- Se asume que el backend se encuentra en ejecución en el entorno local y accesible a través de la URL base del servicio (`http://localhost:3000` o la definida por variables de entorno).
- Se asume que existen usuarios registrados en el sistema (creados previamente o a través del endpoint de registro del backend) para efectuar las pruebas de autenticación.
- El alcance no incluye en esta versión funcionalidades complementarias tales como: formulario de registro de nuevos usuarios, pantalla de olvido o recuperación de contraseña, autenticación multifactor (MFA), ni refresco automático avanzado de tokens expirados (refresh tokens).
- La pantalla inicial requerida funciona como receptor y prueba de concepto de sesión activa (dashboard provisional del inversor de jugadores) y será expandida en iteraciones posteriores con las métricas completas de mercado, compra/venta de tokens y cotizaciones en tiempo real.
