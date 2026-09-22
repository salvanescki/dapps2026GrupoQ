# Implementation Plan: Registro de Usuario en Frontend (004-frontend-signup)

**Branch**: `004-frontend-signup` | **Date**: 2026-09-22 | **Spec**: [spec.md](file:///c:/Users/giord/OneDrive/Escritorio/dapps2026GrupoQ/specs/004-frontend-signup/spec.md)

**Input**: Feature specification from `/specs/004-frontend-signup/spec.md`

## Summary

Implementar la pantalla de registro de nuevos usuarios en el frontend (`RegisterView`) respetando la identidad visual estética deportiva/financiera de la pantalla de login (glassmorphism, tema oscuro, paleta esmeralda y dorada). La funcionalidad validará en tiempo real y previo al envío todos los campos en el cliente (nombre de 2 a 100 caracteres, correo con sintaxis válida, contraseña segura con al menos 8 caracteres, mayúscula, minúscula y número, y confirmación coincidente). Consumirá el endpoint REST existente en el backend (`POST /api/auth/register`), gestionará estados de carga y prevención de envíos duplicados, presentará los errores del servidor (como HTTP 409 por correo duplicado o fallos de conexión) de manera comprensible en español, y ante un registro exitoso redirigirá automáticamente al usuario a `/login` mostrando una notificación amigable de bienvenida para iniciar sesión.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, HTML5 / CSS3

**Primary Dependencies**: React Router DOM v7 (`^7.18.4`), Vite (`^6.0.0`)

**Storage**: N/A para la vista de registro (el token recibido puede ignorarse o no almacenarse de inmediato porque el flujo de negocio redirige a `/login` para autenticación explícita y coherente).

**Testing**: Vitest (`^4.1.11`), `@testing-library/react` (`^16.1.0`), `@testing-library/user-event` (`^14.5.2`), `jsdom` (`^25.0.1`)

**Target Platform**: Web Browsers modernos (Chrome, Firefox, Safari, Edge, Mobile Web)

**Project Type**: Web application (Frontend SPA desacoplada)

**Performance Goals**:
- Tiempo de carga y renderizado de la vista de registro < 1s
- Validación local y feedback visual instantáneo (< 50ms)
- Procesamiento y redirección post-registro < 3s en condiciones normales de red local (SC-001)
- Notificación de error en pantalla < 1s tras respuesta de la API (SC-003)

**Constraints**:
- Coherencia visual estricta del 100% con la estética existente en `LoginView` y los tokens de diseño de `login.css` (SC-004)
- Contención local del 100% de envíos con datos inválidos sin disparar peticiones HTTP al servidor (SC-002)
- Adaptabilidad total a pantallas de escritorio y dispositivos móviles (SC-005)
- Accesibilidad WCAG (atributos `aria-invalid`, `aria-describedby`, roles `alert`, labels asociados)
- Textos de interfaz y mensajes de error redactados en español

**Scale/Scope**:
- 1 nueva vista principal (`RegisterView.tsx`)
- Extensión del cliente HTTP de autenticación (`auth-api.client.ts` con `registrarUsuario`)
- Actualización de tipos e interfaces (`auth.types.ts`)
- Utilidades de validación y sanitización en cliente (`validaciones.ts`)
- Enrutamiento público protegido con guard (`PublicRoute` en `AppRoutes.tsx`)
- Enlace de navegación bidireccional entre `/login` y `/register`, y notificación flash en `LoginView.tsx`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación / Cumplimiento |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas & Backend Stateless** | **PASS** | El frontend opera como capa de Interfaz de Usuario desacoplada (React). Consume la API REST del backend mediante llamadas HTTP stateless a `POST /api/auth/register`. No altera controladores, servicios ni repositorios del backend. |
| **II. Rich Domain Model y DDD** | **PASS** | Las reglas de negocio primarias residen en la entidad de dominio `Usuario` del backend (`validarFormatoContrasena`, invariantes de correo y nombre). El cliente replica estas reglas únicamente como validaciones sintácticas y sanitización de entrada para brindar feedback inmediato al usuario sin duplicar lógica de negocio de backend. |
| **III. Estrategia de Testing Rigurosa** | **PASS** | Se definen tests unitarios exhaustivos para todas las funciones de validación en cliente y tests de integración con React Testing Library que prueban renderizado, accesibilidad, estados de carga, llamadas a la API mockeadas, manejo de respuestas exitosas y errores 409/red. |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASS** | Ningún test preexistente en la suite de backend (`backend/test/`) ni en la de frontend (`frontend/tests/`) es eliminado o modificado. Se agregan tests complementarios para la nueva vista y funciones de registro. |
| **V. Convenciones de Idioma y Terminología** | **PASS** | Todos los textos visibles, placeholders y mensajes de error se formulan en español. Los identificadores de dominio (`nombre`, `correo`, `contrasena`, `confirmarContrasena`, `datosRegistro`) están en español sin acentos ni ñ. Los términos técnicos y arquitectónicos (`RegisterView`, `PublicRoute`, `ApiClient`) se mantienen en inglés. |

**Evaluación de Gates**: Todos los principios son satisfechos cabalmente sin excepciones ni violaciones arquitectónicas.

## Project Structure

### Documentation (this feature)

```text
specs/004-frontend-signup/
├── spec.md              # Especificación funcional de la feature
├── plan.md              # Este documento de arquitectura y planificación
├── research.md          # Investigación técnica y decisiones resueltas (Fase 0)
├── data-model.md        # Modelos TypeScript, contratos de datos y máquina de estados (Fase 1)
├── quickstart.md        # Guía de inicio rápido y validación E2E (Fase 1)
├── contracts/           # Contratos OpenAPI de integración
│   └── auth-register-contract.yaml
└── checklists/
    └── requirements.md  # Lista de verificación de requerimientos
```

### Source Code (repository layout)

```text
frontend/
├── src/
│   ├── api/
│   │   └── auth-api.client.ts            # [MODIFY] Agregar función registrarUsuario()
│   ├── routes/
│   │   └── AppRoutes.tsx                 # [MODIFY] Incorporar ruta /register envuelta en PublicRoute
│   ├── styles/
│   │   └── login.css                     # [MODIFY] Estilos compartidos de auth (tarjeta, alertas de éxito y inputs)
│   ├── types/
│   │   └── auth.types.ts                 # [MODIFY] Interfaces SolicitudRegistroApi, ErroresValidacionRegistro, etc.
│   ├── utils/
│   │   └── validaciones.ts               # [MODIFY] Funciones validarNombre, validarFormatoContrasena, etc.
│   └── views/
│       ├── LoginView.tsx                 # [MODIFY] Enlace hacia /register y banner de mensajeExito
│       └── RegisterView.tsx              # [NEW] Pantalla de registro de nuevo usuario
└── tests/
    ├── integration/
    │   ├── LoginView.test.tsx            # [MODIFY] Test de enlace a registro y mensaje de bienvenida
    │   └── RegisterView.test.tsx         # [NEW] Tests de integración completos de la pantalla de registro
    └── unit/
        └── validaciones.test.ts          # [MODIFY] Tests unitarios de validación de registro
```

**Structure Decision**: Se mantiene la estructura establecida en la aplicación cliente `frontend/` sin introducir nuevas capas o librerías foráneas. La vista `RegisterView` se modela análogamente a `LoginView`, reutilizando el diseño y componentes existentes.

## Complexity Tracking

> No se detectaron violaciones a los principios constitucionales. La implementación respeta al 100% las restricciones arquitectónicas y tecnológicas del repositorio.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *Ninguna* | N/A | N/A |
