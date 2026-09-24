# Guía de Inicio Rápido y Validación: Registro de Usuario (004-frontend-signup)

Esta guía describe los pasos necesarios para levantar el entorno de desarrollo y validar de forma manual y automatizada el flujo completo de Registro de Usuario en el Frontend.

---

## 1. Prerrequisitos

- **Node.js**: v18 o superior
- **Docker & Docker Compose**: Opcional para backend/PostgreSQL local, o backend ejecutándose en `http://localhost:3000`
- **Navegador Web Moderno**: Chrome, Firefox, Safari o Edge

---

## 2. Puesta en Marcha

### 2.1 Backend (Opcional para pruebas manuales E2E)

Si deseas probar contra el backend real:

```bash
# Desde la raíz del repositorio
cd backend
npm install
npm run start:dev
```

El servidor backend quedará disponible en `http://localhost:3000` con Swagger en `http://localhost:3000/api/docs`.

### 2.2 Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación quedará disponible en `http://localhost:5173`.

---

## 3. Escenarios de Validación Manual

### Escenario 1: Registro Exitoso y Redirección al Login (US1 / FR-001, FR-007, FR-009, FR-010)

1. Abrir el navegador en `http://localhost:5173/login`.
2. Hacer clic en el enlace `"¿No tienes cuenta? Regístrate aquí"`.
3. Verificar que la URL cambie a `http://localhost:5173/register` y que la estética visual sea 100% consistente con la tarjeta de login (fondo oscuro de estadio, bordes con glassmorphism, logotipo futbolístico).
4. Completar los campos con datos válidos:
   - **Nombre**: `Inversor Prueba`
   - **Correo electrónico**: `nuevo.inversor@ejemplo.com` (o cualquier correo no registrado)
   - **Contraseña**: `ClaveSegura2026`
   - **Confirmar contraseña**: `ClaveSegura2026`
5. Hacer clic en `"Crear Cuenta"`.
6. **Resultado Esperado**:
   - El botón muestra un spinner de carga y el texto cambia temporalmente (indicando envío en curso).
   - Los campos y el botón quedan deshabilitados evitando doble clic.
   - En menos de 3 segundos, el usuario es redirigido automáticamente a `http://localhost:5173/login`.
   - La pantalla de login muestra un banner verde de éxito en la parte superior:
     `"¡Cuenta creada exitosamente! Ya puedes iniciar sesión."`

---

### Escenario 2: Validación Local de Campos en Cliente (US3 / FR-003 a FR-006, SC-002)

1. Navegar a `http://localhost:5173/register`.
2. Presionar `"Crear Cuenta"` con el formulario vacío.
   - **Resultado Esperado**: El formulario no se envía al backend (cero llamadas de red). Aparecen mensajes de advertencia en color rojo indicando que cada campo es obligatorio.
3. Ingresar un nombre de 1 carácter (`"A"`) y presionar enviar.
   - **Resultado Esperado**: Mensaje: `"El nombre es obligatorio y debe tener entre 2 y 100 caracteres."`
4. Ingresar un correo inválido (`"correo_invalido"`) y presionar enviar.
   - **Resultado Esperado**: Mensaje: `"El formato del correo electrónico es inválido."`
5. Ingresar una contraseña débil (`"abc"` o `"sololetras"` o `"12345678"`).
   - **Resultado Esperado**: Mensaje: `"La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número."`
6. Ingresar en contraseña `"Clave1234"` y en confirmar contraseña `"ClaveDiferente"`.
   - **Resultado Esperado**: Mensaje: `"Las contraseñas no coinciden."`

---

### Escenario 3: Manejo de Error Amigable por Correo Duplicado (US2 / FR-011, SC-003)

1. Navegar a `http://localhost:5173/register`.
2. Completar el formulario utilizando un correo que ya exista en el backend (por ejemplo, el usuario creado en el Escenario 1 o precargado en seed).
3. Presionar `"Crear Cuenta"`.
4. **Resultado Esperado**:
   - El backend responde HTTP 409 Conflict.
   - La interfaz captura el error y despliega una alerta amigable en la parte superior de la tarjeta:
     `"El correo electrónico ya se encuentra registrado. Intenta iniciar sesión o utiliza otra dirección."`
   - Los datos de nombre y correo no se borran, permitiendo al usuario corregir el correo sin reiniciar todo el formulario.

---

### Escenario 4: Navegación Bidireccional (FR-012)

1. Desde `/login`, hacer clic en `"¿No tienes cuenta? Regístrate aquí"`. Verifica la llegada a `/register`.
2. Desde `/register`, hacer clic en `"¿Ya tienes cuenta? Inicia sesión aquí"`. Verifica el retorno inmediato a `/login`.

---

### Escenario 5: Protección de Ruta Pública para Usuarios Autenticados (FR-013)

1. Iniciar sesión exitosamente en `/login` con un usuario existente.
2. Una vez autenticado (en `/` o `/players`), intentar escribir manualmente en la barra de direcciones del navegador: `http://localhost:5173/register`.
3. **Resultado Esperado**: El guard `PublicRoute` intercepta la navegación y redirige automáticamente al usuario a `/`, impidiendo que un usuario con sesión abierta acceda al formulario de registro.

---

## 4. Validación Automatizada

Ejecutar la suite de tests en el frontend:

```bash
cd frontend

# Ejecutar todos los tests del frontend
npm test

# Ejecutar específicamente los tests unitarios de validaciones de registro
npx vitest run tests/unit/validaciones-registro.test.ts

# Ejecutar específicamente los tests de integración de la vista de registro
npx vitest run tests/integration/RegisterView.test.tsx
```

### Resultados Esperados en Tests Automatizados
- Todas las aserciones de validación local (campos requeridos, formato de correo, fortaleza de contraseña y confirmación) pasan al 100%.
- Todos los escenarios de integración (renderizado, llamadas API mockeadas, redirección con estado y errores 409/red) pasan sin fallas.
- Ningún test preexistente en `frontend/tests/` o `backend/test/` resulta afectado (Principio IV de la Constitución).
