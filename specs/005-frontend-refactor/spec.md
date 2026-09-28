# Feature Specification: Frontend Refactor y Componentes Reutilizables

**Feature Branch**: `005-frontend-refactor`  
**Created**: 2026-09-28  
**Status**: Ready for Planning  

**Input**: 
> Realizar el plan de arquitectura e implementación técnica para el refactor integral del frontend en `frontend/`, enfocado en modularización, reutilización de componentes, eliminación de código duplicado, buenas prácticas y detección y corrección de posibles errores o mejoras/deuda técnica.
> 
> ### Objetivos y Alcance:
> 1. **Extracción y Estandarización de Componentes Reutilizables (Design System / UI Base):**
>    - Abstraer componentes atómicos comunes duplicados en las vistas (`LoginView`, `RegisterView`, `PlayersCatalogView`, `HomeView`):
>      - `Input` / `FormField` (con soporte para labels, estados de error, helper text, variantes de password con toggle).
>      - `Button` (variantes primary, secondary, danger, estados de `loading`/`disabled`).
>      - `Alert` / `ErrorBanner` / `FeedbackMessage` (mensajes amigables de error/éxito).
>      - `Card` / `Container` (estructuras base de formularios y catálogos).
>      - `Navbar` / `Layout` (para unificar la cabecera y pie de página de la aplicación).
>      - `Spinner` / `Loader` accesible.
> 2. **Reestructuración y Modularización de Vistas:**
>    - Descomponer vistas monolíticas extensas (`RegisterView.tsx` y `LoginView.tsx`) en componentes de dominio más pequeños y testeables dentro de `components/auth/`, `components/catalog/`, etc.
>    - Separar la lógica de estado/validación de la presentación visual.
> 3. **Separación de Lógica y Hooks Personalizados:**
>    - Evaluar o implementar custom hooks para el manejo de formularios, estados de carga y autenticación (`useAuth`, `useForm`).
>    - Centralizar y estandarizar el manejo de errores provenientes de los servicios/API en `services/` y `api/`.
> 4. **Auditoría de Errores, Rendimiento y Calidad de Código:**
>    - Detectar y corregir posibles bugs, anti-patrones de React (fugas de memoria en `useEffect`, re-renders innecesarios, closures desactualizados).
>    - Resolver problemas de TypeScript (evitar `any`, tipado estricto en props, DTOs y modelos).
>    - Mejorar accesibilidad (accesibilidad web básica, etiquetas `aria-*`, navegación por teclado y formularios semánticos).
>    - Garantizar consistencia en los estilos (CSS modular/tokens en lugar de estilos ad-hoc o inline dispersos).

## User Scenarios & Testing

### User Story 1 - Experiencia de Usuario Consistente e Inalterada (P1)
Como usuario de la aplicación,
quiero que todas las pantallas (Home, Login, Registro, Catálogo de Jugadores) mantengan exactamente su funcionalidad, estética visual y flujos interactivos,
para poder navegar, registrarme, iniciar sesión y ver el catálogo sin interrupciones ni regresiones visuales o de comportamiento tras el refactor.

### User Story 2 - Modularidad y Componentes Compartidos (P1)
Como desarrollador del proyecto,
quiero contar con un catálogo de componentes UI base (`Input`, `Button`, `Alert`, `Card`, `Navbar`, `Spinner`) y componentes específicos por dominio (`components/auth/`, `components/catalog/`, `layouts/`),
para que las vistas sean declarativas, concisas, mantenibles y fáciles de testear.

### User Story 3 - Manejo Robusto de Errores y Calidad de Código (P2)
Como desarrollador y usuario,
quiero que los errores de la API, estados de carga y validaciones se manejen de forma estandarizada y tipada,
para prevenir bugs en tiempo de ejecución y asegurar una experiencia accesible y resiliente.
