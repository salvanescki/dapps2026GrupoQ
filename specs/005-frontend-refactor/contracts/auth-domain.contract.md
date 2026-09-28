# Contract: Auth Domain & Flow Refactor (`components/auth`, `hooks/useForm`)

**Feature**: `005-frontend-refactor`  
**Date**: 2026-09-28  

## Contrato de Dominio de Autenticación y Formularios

### 1. `LoginForm`
- **Propósito**: Formulario modular de inicio de sesión desvinculado de la maquetación de la página general.
- **Entradas**:
  - `onSubmit(credenciales)`: Callback asíncrono que recibe `{ correo, contrasena }`.
  - `cargando`: Booleano que indica si el proceso está en curso.
  - `errorServidor`: Mensaje de error a desplegar en el banner.
- **Salidas/Eventos**:
  - Ejecuta validaciones locales (`validarFormularioLogin`) y despliega mensajes de error accesibles por campo.
  - Al completar la validación exitosa, invoca `onSubmit`.

### 2. `RegisterForm`
- **Propósito**: Formulario modular de registro con validaciones en tiempo real y sanitización de entradas.
- **Entradas**:
  - `onSubmit(datos)`: Callback asíncrono que recibe `{ nombre, correo, contrasena, confirmarContrasena }`.
  - `cargando`: Booleano de estado de carga.
  - `errorServidor`: Mensaje de error retornado por la API.
- **Salidas/Eventos**:
  - Ejecuta validación en `onBlur` y en `onSubmit` (`validarFormularioRegistro`).
  - Sanitiza los datos (`sanitizarDatosRegistro`) antes de emitirlos en `onSubmit`.

### 3. `useAuth` Hook Extension (Unificación)
- **Propósito**: Proveer acceso centralizado a operaciones de autenticación.
- **Métodos**:
  - `login({ correo, contrasena })`: Inicia sesión, almacena el token/sesión y actualiza el estado.
  - `register(datos)`: Invoca el endpoint de registro a través de `auth.service.ts` y gestiona errores unificados.
  - `logout()`: Cierra sesión y limpia el almacenamiento.
  - `usuario`: Estado del usuario actual (`UsuarioLogueado | null`).
  - `cargando`: Booleano global de operación en progreso.
  - `error`: Mensaje de error activo.
