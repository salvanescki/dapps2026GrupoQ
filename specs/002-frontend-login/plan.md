# Implementation Plan: Frontend Login & Sesión Inicial

**Branch**: `002-frontend-login` | **Date**: 2026-09-18 | **Spec**: [specs/002-frontend-login/spec.md](spec.md)

**Input**: Feature specification from `/specs/002-frontend-login/spec.md`

## Summary

Implementar la primera versión de la aplicación Frontend en React con TypeScript (utilizando Vite), creando la pantalla de inicio de sesión (`LoginView`) adaptada a la temática de un mercado de inversión en tokens de jugadores de fútbol. La solución integra el consumo del endpoint existente `POST /api/auth/login` de NestJS, gestiona de forma segura el JWT recibido en el almacenamiento local del cliente (`localStorage`), expone el estado reactivo mediante un `AuthContext`, protege rutas con guards de acceso (`ProtectedRoute` y `PublicRoute`), maneja estados de validación local y errores del servidor en español, y redirige al usuario autenticado hacia una pantalla inicial/provisoria de bienvenida (`HomeView`).

## Technical Context

**Language/Version**: TypeScript 5.x / ECMAScript 2022+ / React 18+ (SPA)

**Primary Dependencies**: React 18+, React DOM 18+, Vite 5+, `react-router-dom` 6+

**Storage**: `localStorage` del navegador para persistencia del token de acceso (`tokenDeAcceso`) y datos mínimos del usuario autenticado.

**Testing**: Vitest, React Testing Library (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`), `jsdom`.

**Target Platform**: Navegadores web modernos de escritorio y dispositivos móviles (diseño responsivo).

**Project Type**: Web application (Frontend SPA desacoplado en la carpeta `frontend/`).

**Performance Goals**:
- Tiempo de carga inicial del frontend < 1 segundo en entorno local.
- Tiempo de validación local de formulario < 50 milisegundos (feedback instantáneo al usuario).
- Visualización de mensajes de respuesta o error < 100 milisegundos tras la llegada del paquete HTTP del backend.

**Constraints**:
- Adherencia estricta a la Constitución del proyecto (Principio I: Frontend en React; Principio IV: Inmutabilidad de tests existentes del backend; Principio V: Textos de usuario y dominio en español sin acentos, términos técnicos en inglés).
- Estética visual atractiva inspirada en un mercado financiero y deportivo (*Dark Mode* con verde esmeralda y acentos dorados).
- Uso de Vanilla CSS con variables de diseño (tokens), sin añadir frameworks invasivos como Tailwind ni librerías de componentes prediseñados no autorizadas.
- Alcance estrictamente acotado al login y sesión inicial: registro, recuperación de clave, MFA y refresh tokens quedan fuera de esta iteración.

**Scale/Scope**:
- 2 vistas principales: `LoginView` (acceso) y `HomeView` (dashboard provisorio de inversor con bienvenida y logout).
- 1 contexto global de autenticación (`AuthContext` + `AuthProvider`).
- 2 guards de enrutamiento (`ProtectedRoute`, `PublicRoute`).
- 1 cliente API desacoplado para autenticación y 1 servicio de persistencia local.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Evaluación y Justificación Técnica |
| :--- | :---: | :--- |
| **I. Arquitectura en 5 Capas y Backend Stateless** | **PASSED** | El frontend se implementa en React en su propio directorio `frontend/`. El backend permanece 100% Stateless; el frontend envía el JWT vía cabecera `Authorization: Bearer <token>` sin exigir estado de sesión en memoria en el servidor. No se tocan ni violan las capas de Controller, Service, Model ni Data Access del backend. |
| **II. Rich Domain Model y DDD** | **PASSED** | La lógica de negocio del backend permanece intacta en sus entidades de dominio (`Usuario`). El frontend define sus propios contratos de validación local (`CredencialesLogin`) sin crear modelos anémicos ni interferir con las reglas del servidor. |
| **III. Estrategia de Testing Rigurosa y Testcontainers** | **PASSED** | El backend mantiene sus pruebas con Testcontainers. El frontend incorpora su propia suite con Vitest y React Testing Library cubriendo tanto caminos felices como casos de borde (validaciones locales, errores 401, fallo de red, protección de rutas). |
| **IV. Inmutabilidad de Tests (NON-NEGOTIABLE)** | **PASSED** | No se modifica, altera ni elimina ningún test preexistente en el backend (`test/unit/*`, `test/integration/*`). Todos los tests de la suite backend continuarán ejecutándose y pasando al 100%. |
| **V. Convenciones de Idioma y Terminología Técnica** | **PASSED** | Toda la interfaz de usuario, etiquetas, placeholders, alertas y mensajes de error están en español. Los identificadores de dominio (`usuario`, `correo`, `contrasena`, `tokenDeAcceso`) se mantienen en español sin acentos ni ñ. Los términos técnicos y arquitectónicos (`AuthContext`, `ProtectedRoute`, `StorageService`, `ApiClient`) se expresan en inglés. |
| **DoD (Definition of Done)** | **PASSED** | Incluye tests automatizados, compila y levanta limpiamente con `npm run dev`, y preserva la sincronización con la colección Postman existente. |

## Project Structure

### Documentation (this feature)

```text
specs/002-frontend-login/
├── plan.md              # Este archivo (plan de implementación técnica)
├── research.md          # Fase 0: Decisiones tecnológicas, diseño y justificaciones
├── data-model.md        # Fase 1: Modelos de datos, tipos y máquina de estados
├── quickstart.md        # Fase 1: Guía de arranque y escenarios de validación manual/automática
├── contracts/           # Fase 1: Contrato OpenAPI de consumo de endpoints de auth
│   └── auth-api-contract.yaml
├── checklists/
│   └── requirements.md  # Checklist de calidad de requerimientos
└── tasks.md             # Fase 2: Tareas de implementación desglosadas (siguiente paso)
```

### Source Code (repository root)

```text
backend/                 # Backend existente NestJS (Stateless, 5 capas)
├── src/
│   ├── auth/
│   ├── common/
│   ├── controllers/
│   ├── domain/
│   ├── infrastructure/
│   └── services/
└── test/

frontend/                # Nueva aplicación cliente React (Single Page Application)
├── index.html           # Punto de entrada HTML con viewport y fuentes
├── package.json         # Dependencias (React, Vite, react-router-dom, Vitest, RTL)
├── tsconfig.json        # Configuración de compilador TypeScript
├── vite.config.ts       # Configuración de empaquetador Vite y proxy de API
├── src/
│   ├── api/             # Capa de comunicación HTTP con el backend
│   │   ├── auth-api.client.ts
│   │   └── http-client.ts
│   ├── context/         # Estado global de autenticación
│   │   ├── AuthContext.tsx
│   │   └── AuthProvider.tsx
│   ├── hooks/           # Custom hooks de React
│   │   └── useAuth.ts
│   ├── routes/          # Configuración de rutas y guards de acceso
│   │   ├── AppRoutes.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── PublicRoute.tsx
│   ├── services/        # Servicios auxiliares de cliente
│   │   └── storage.service.ts
│   ├── styles/          # Sistema de diseño con Vanilla CSS
│   │   ├── index.css
│   │   ├── tokens.css   # Variables CSS (paleta estadio oscuro, acento esmeralda/oro)
│   │   └── login.css    # Estilos de la tarjeta de login, inputs y estados
│   ├── types/           # Tipos e interfaces TypeScript alineados con el backend
│   │   └── auth.types.ts
│   ├── utils/           # Validaciones locales y formateadores
│   │   └── validaciones.ts
│   ├── views/           # Vistas y páginas de la aplicación
│   │   ├── HomeView.tsx # Pantalla inicial provisoria (bienvenida y logout)
│   │   └── LoginView.tsx# Pantalla de inicio de sesión
│   ├── App.tsx          # Componente raíz con AuthProvider y AppRoutes
│   └── main.tsx         # Punto de montaje de React en el DOM
└── tests/               # Pruebas automatizadas de frontend
    ├── setup.ts         # Configuración global de entorno jsdom y matchers
    ├── unit/            # Pruebas unitarias
    │   ├── validaciones.test.ts
    │   └── storage.service.test.ts
    └── integration/     # Pruebas de integración de componentes y flujos
        ├── LoginView.test.tsx
        └── ProtectedRoute.test.tsx
```

**Structure Decision**: Se adopta la estructura de Web Application estándar (`backend/` preexistente y `frontend/` nuevo en la raíz). Esta separación mantiene el desacoplamiento total exigido por la arquitectura en 5 capas, permitiendo compilar, probar y ejecutar cada subsistema de manera independiente.

## Complexity Tracking

> **No se detectaron violaciones a los principios de la Constitución.** Todas las decisiones técnicas se encuentran estrictamente alineadas con los mandatos de arquitectura, pruebas, idioma y stack tecnológico aprobados.

| Componente / Decisión | Razón de la Elección | Alternativa Rechazada y Motivo |
| :--- | :--- | :--- |
| **React Context para Sesión** | Solución nativa sin boilerplate para el alcance v1 de login/sesión. | Redux Toolkit: Sobrecarga innecesaria de librerías para una sola feature. |
| **Vanilla CSS + Tokens CSS** | Máximo control visual, ligereza de carga y respeto a las directrices de diseño. | TailwindCSS / UI Kits: Podrían desentonar con el diseño premium de marketplace deportivo o requerir configuración invasiva. |
| **Vitest + RTL** | Integración nativa y ultrarrápida con Vite y soporte para JSX/TSX en memoria. | Jest: Dificultades de configuración con módulos ESM nativos en Vite. |
| **Cliente nativo `fetch`** | Cero dependencias añadidas, soporte nativo en el navegador y tipado seguro. | Axios: Dependencia externa que no aporta valor diferencial para 2 endpoints simples. |
