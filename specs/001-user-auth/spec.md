# Feature Specification: Registro e Inicio de Sesión de Usuarios

**Feature Branch**: `001-user-auth`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "Vamos a estar desarrollando una aplicacion para administrar compra-venta de acciones de jugadores de futbol de las 5 grandes ligas de Europa. La cotizacion de los tokens depende del desempeño que tengan los jugadores partido a partido. Por ahora, la primer funcionalidad que vamos a implementar en la aplicacion, es el registro e inicio de sesion (Login) para los usuarios en nuestra plataforma. El usuario debe tener la opcion de iniciar sesion desde la pagina web, lo que le daria acceso a la aplicación. En caso de que el usuario no tenga cuenta, este debe tener la opcion de registrarse para hacerse una."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de Nueva Cuenta (Priority: P1)

Como visitante no registrado de la plataforma, quiero poder registrarme proporcionando mis datos básicos (nombre, correo electrónico y una contraseña segura), para obtener una cuenta propia que me permita acceder a las funcionalidades de la aplicación de tokens de fútbol.

**Why this priority**: Es el punto de partida indispensable; sin una cuenta registrada, los usuarios no pueden tener identidad en el sistema ni operar con tokens.

**Independent Test**: Puede probarse de manera independiente completando el formulario de registro con datos válidos y verificando que la cuenta queda creada y el usuario queda habilitado para iniciar sesión o ingresar a la plataforma.

**Acceptance Scenarios**:

1. **Given** un visitante en la página de registro, **When** ingresa un nombre, un correo electrónico válido no registrado previamente y una contraseña que cumple los criterios de seguridad, y confirma el registro, **Then** el sistema crea la cuenta exitosamente, muestra un mensaje de confirmación y permite al usuario acceder a la aplicación.
2. **Given** un visitante en la página de registro, **When** intenta registrarse con un correo electrónico que ya pertenece a una cuenta existente, **Then** el sistema rechaza el registro e informa de manera clara que dicho correo ya se encuentra en uso.
3. **Given** un visitante en la página de registro, **When** ingresa datos incompletos, un formato de correo inválido o una contraseña que no cumple los requisitos de longitud y complejidad, **Then** el sistema impide el envío y señala los campos con errores específicos para su corrección.

---

### User Story 2 - Inicio de Sesión de Usuario (Priority: P1)

Como usuario con una cuenta registrada, quiero ingresar mis credenciales (correo electrónico y contraseña) en la página web, para acceder de forma segura a mi sesión y a la plataforma de compra-venta de tokens.

**Why this priority**: Es el mecanismo primordial de acceso cotidiano y autenticación para que un usuario acceda a su información y opere en el sistema.

**Independent Test**: Puede probarse de manera independiente ingresando credenciales válidas en la pantalla de inicio de sesión y comprobando que el usuario obtiene acceso a la vista principal autenticada de la aplicación.

**Acceptance Scenarios**:

1. **Given** un usuario registrado en la página de inicio de sesión, **When** ingresa su correo electrónico y su contraseña correcta, **Then** el sistema valida las credenciales, inicia la sesión del usuario y le redirige a la vista principal de la plataforma.
2. **Given** un usuario en la página de inicio de sesión, **When** ingresa un correo no registrado o una contraseña incorrecta, **Then** el sistema deniega el acceso y muestra un mensaje genérico de error indicando credenciales inválidas, sin revelar cuál de los dos datos fue el erróneo.
3. **Given** un usuario no autenticado, **When** intenta acceder directamente a una dirección o recurso privado dentro de la aplicación, **Then** el sistema bloquea el acceso y lo redirige a la pantalla de inicio de sesión.

---

### User Story 3 - Cierre de Sesión (Priority: P2)

Como usuario con una sesión activa en la aplicación, quiero poder cerrar mi sesión en cualquier momento, para asegurar que nadie más que use el mismo dispositivo pueda acceder a mi cuenta.

**Why this priority**: Garantiza la seguridad y privacidad del usuario al finalizar sus operaciones en la plataforma.

**Independent Test**: Puede probarse de manera independiente haciendo clic en la opción de cierre de sesión desde cualquier pantalla interna y comprobando que el acceso autenticado se revoca inmediatamente.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada en la aplicación, **When** selecciona la opción de cerrar sesión, **Then** el sistema finaliza la sesión activa y lo redirige a la pantalla pública o de bienvenida.
2. **Given** un usuario que acaba de cerrar sesión, **When** intenta navegar hacia atrás o acceder a una sección privada de la plataforma, **Then** el sistema comprueba que ya no hay sesión activa y le solicita iniciar sesión nuevamente.

---

### Edge Cases

- ¿Qué sucede si el usuario intenta enviar formularios de registro o inicio de sesión con espacios en blanco al inicio o final del correo? El sistema debe recortar y normalizar los espacios en blanco del correo electrónico antes de procesarlo.
- ¿Qué sucede si el usuario introduce la contraseña respetando o no mayúsculas/minúsculas? La contraseña debe ser tratada de forma estricta respetando mayúsculas, minúsculas, números y caracteres especiales.
- ¿Qué sucede ante múltiples intentos fallidos continuos de inicio de sesión? El sistema debe mitigar ataques de fuerza bruta informando al usuario y aplicando demoras o bloqueos temporales razonables tras reiterados intentos fallidos.
- ¿Qué sucede si la conexión se interrumpe durante el proceso de registro o login? El sistema debe mostrar un mensaje amigable indicando la imposibilidad momentánea de contactar con el servicio y permitir reintentar sin perder los datos previamente completados (excepto la contraseña por motivos de seguridad).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los visitantes registrar una nueva cuenta proporcionando nombre completo o de usuario, correo electrónico y contraseña.
- **FR-002**: El sistema DEBE validar que el correo electrónico ingresado en el registro posea un formato válido estándar y sea único en la plataforma.
- **FR-003**: El sistema DEBE validar que la contraseña cumpla con criterios mínimos de seguridad (al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números).
- **FR-004**: El sistema DEBE almacenar y proteger las credenciales de los usuarios impidiendo que las contraseñas sean legibles en texto plano.
- **FR-005**: El sistema DEBE permitir a los usuarios registrados iniciar sesión mediante su correo electrónico y su contraseña.
- **FR-006**: El sistema DEBE rechazar intentos de autenticación con credenciales incorrectas mediante mensajes claros que no expongan información sobre la existencia o no del correo electrónico ingresado.
- **FR-007**: El sistema DEBE mantener el estado de autenticación del usuario mientras su sesión permanezca activa.
- **FR-008**: El sistema DEBE proveer un mecanismo explícito para que el usuario pueda cerrar su sesión en cualquier momento.
- **FR-009**: El sistema DEBE restringir el acceso a las vistas y operaciones privadas de la aplicación, requiriendo autenticación previa obligatoria.
- **FR-010**: La interfaz web DEBE ofrecer navegación clara y visible entre las opciones de "Iniciar Sesión" y "Registrarse" para usuarios no autenticados.

### Key Entities *(include if feature involves data)*

- **Usuario**: Representa la cuenta y perfil de una persona registrada en la plataforma. Atributos clave: identificador único, nombre, correo electrónico, credencial de acceso protegida, estado de la cuenta (activo/inactivo) y fecha de creación.
- **Sesion**: Representa el período de interacción autenticada y autorizada de un usuario con la aplicación. Atributos clave: identificador de sesión, usuario asociado, fecha de emisión y fecha de expiración.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede completar el proceso de registro exitoso en menos de 60 segundos desde la pantalla de bienvenida.
- **SC-002**: Un usuario registrado puede iniciar sesión de forma exitosa en menos de 10 segundos tras ingresar sus credenciales correctas.
- **SC-003**: El 100% de los accesos no autorizados a páginas o recursos protegidos son bloqueados y redirigidos a la pantalla de inicio de sesión.
- **SC-004**: El 95% de los usuarios primerizos logran completar el registro y login sin requerir asistencia externa o reintentar por errores de usabilidad.
- **SC-005**: Las contraseñas y credenciales sensibles nunca son expuestas en texto plano en ninguna capa visible para el cliente.

## Assumptions

- En esta primera versión (v1), el registro activa la cuenta de manera inmediata sin requerir verificación por correo electrónico (doble opt-in), permitiendo al usuario ingresar y comenzar a utilizar la plataforma al instante.
- Cada cuenta de usuario se vincula a una única dirección de correo electrónico institucional o personal.
- La gestión de perfiles de roles diferenciados (por ejemplo, administradores de cotizaciones vs. usuarios inversores) se manejará en base al rol por defecto de usuario inversor para los registros públicos.
- La creación de la billetera virtual y acreditación de saldo inicial o vinculación para la compra y venta de tokens de jugadores de fútbol se inicializará automáticamente al crear el usuario o en la siguiente fase de portfolio/billetera.
