# Guía de Inicio Rápido y Validación: Frontend Login & Sesión Inicial

Esta guía detalla los pasos para levantar el entorno de desarrollo, ejecutar las suites de pruebas automatizadas y validar de extremo a extremo los escenarios de autenticación del frontend.

---

## Prerrequisitos

1. **Node.js**: Versión 18.x o superior instalada.
2. **PostgreSQL**: Instancia en ejecución (ejecutada mediante Docker Compose en la raíz: `docker compose up -d postgres`).
3. **Backend NestJS**: Servidor de API ejecutándose en el puerto 3000 (`http://localhost:3000`).

---

## 1. Puesta en Marcha

### 1.1 Iniciar Persistencia y Backend

En una terminal en la raíz del repositorio:
```bash
# 1. Levantar contenedor de base de datos
docker compose up -d postgres

# 2. Iniciar el backend en modo desarrollo
cd backend
npm install
npm run start:dev
```
Verificar que la consola confirme:
`Backend de Tokens de Fútbol ejecutándose en: http://localhost:3000`

*(Opcional: Si la base de datos está vacía, registrar un usuario de prueba vía POST a `http://localhost:3000/api/auth/register` con `{ "nombre": "Inversor Demo", "correo": "inversor@tokens.com", "contrasena": "Clave1234" }`)*.

### 1.2 Iniciar el Frontend (React + Vite)

En una segunda terminal:
```bash
# 1. Acceder al directorio del frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor local de desarrollo
npm run dev
```
Abrir en el navegador: `http://localhost:5173` (o la URL indicada por Vite).

---

## 2. Ejecución de Pruebas Automatizadas

El proyecto cuenta con suites de pruebas unitarias y de integración de componentes usando Vitest y React Testing Library.

```bash
cd frontend

# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage
```

### Escenarios cubiertos por los tests automatizados:
1. **Renderizado de Login**: Verificación de campos de entrada (`correo`, `contrasena`), títulos y botón de acción.
2. **Validaciones en Cliente**: Bloqueo de envíos vacíos o correos con sintaxis inválida sin disparar llamadas HTTP.
3. **Flujo Feliz de Autenticación**: Mock de respuesta exitosa (200), almacenamiento en `localStorage` y redirección a la pantalla de bienvenida.
4. **Flujo de Credenciales Inválidas**: Mock de respuesta 401 con mensaje `"Credenciales inválidas."` renderizado contextualmente.
5. **Manejo de Errores de Conexión**: Verificación de feedback visual si la llamada a la API falla por timeout o desconexión.
6. **Protección de Rutas**: Verificación de que `RutaProtegida` redirige a visitantes anónimos a `/login` y `RutaPublica` redirige a usuarios ya autenticados a `/`.

---

## 3. Escenarios de Validación Manual Paso a Paso

### Escenario 1: Validación local del formulario
1. Abrir `http://localhost:5173/login`.
2. Hacer clic directamente en el botón **"Ingresar a la Plataforma"** con ambos campos vacíos.
3. **Resultado esperado**: La pantalla muestra mensajes de advertencia indicando que el correo y la contraseña son obligatorios; la consola del navegador muestra cero peticiones de red hacia `/api/auth/login`.
4. Escribir `correo_invalido` en el campo de correo y hacer clic fuera del campo o presionar ingresar.
5. **Resultado esperado**: Se muestra el mensaje `"El formato del correo electrónico es inválido."`.

### Escenario 2: Intento con credenciales erróneas
1. En la pantalla de login, ingresar:
   - Correo: `inversor@tokens.com`
   - Contraseña: `ClaveIncorrecta999`
2. Presionar **"Ingresar a la Plataforma"**.
3. **Resultado esperado**:
   - El botón muestra un spinner o estado de carga y se deshabilita temporalmente.
   - Tras responder el backend, se muestra una alerta con fondo rojizo/ámbar que indica: `"Credenciales inválidas."`.
   - El campo de correo permanece lleno para no obligar al usuario a reescribirlo.

### Escenario 3: Inicio de sesión exitoso y acceso a pantalla inicial
1. Ingresar credenciales válidas:
   - Correo: `inversor@tokens.com`
   - Contraseña: `Clave1234`
2. Presionar **"Ingresar a la Plataforma"**.
3. **Resultado esperado**:
   - Se muestra el indicador de carga momentáneo.
   - El usuario es redirigido a `/`.
   - La pantalla muestra el espacio inicial del inversor con el mensaje de bienvenida: `"¡Bienvenido de vuelta, Inversor Demo!"`, indicando su correo, un resumen visual preliminar de su estado y el botón **"Cerrar Sesión"**.

### Escenario 4: Persistencia y protección de rutas
1. Estando autenticado en `/`, presionar `F5` o refrescar el navegador.
2. **Resultado esperado**: La página recarga y permanece en `/` con la sesión activa sin solicitar credenciales nuevamente.
3. Cambiar manualmente la URL en la barra del navegador a `http://localhost:5173/login`.
4. **Resultado esperado**: El guard `RutaPublica` detecta la sesión activa y redirige automáticamente al usuario a `/`.
5. Presionar el botón **"Cerrar Sesión"**.
6. **Resultado esperado**: Se borran los datos del almacenamiento local y se redirige de inmediato a `/login`.
7. Intentar acceder nuevamente a `http://localhost:5173/`.
8. **Resultado esperado**: El guard `RutaProtegida` impide el acceso y redirige a `/login`.
