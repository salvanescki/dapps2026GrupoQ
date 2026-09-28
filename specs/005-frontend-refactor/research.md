# Research & Architecture Decisions: Frontend Refactor & Reusability

**Feature**: `005-frontend-refactor`  
**Date**: 2026-09-28  

## Decisiones Técnicas y Arquitectónicas

### 1. Jerarquía y Taxonomía de Componentes

- **Decisión**: Organizar los componentes del frontend en 3 niveles bien diferenciados:
  1. `components/ui/` (o componentes base/atómicos): Componentes agnósticos de dominio y puramente presentacionales (`Input`, `Button`, `Alert`, `Card`, `Spinner`, `Modal`).
  2. `components/layout/` (o layout estructural): `Navbar`, `AppLayout`, `AuthLayout` para envolver vistas y eliminar duplicación de cabeceras, fondos y footers.
  3. `components/auth/` y `components/catalog/`: Componentes de dominio específicos vinculados a casos de uso (`LoginForm`, `RegisterForm`, `PlayerCard`, `FilterModal`, etc.).
- **Razón**: Actualmente, vistas como `RegisterView` (294 líneas) y `LoginView` (186 líneas) mezclan maquetación HTML, estilos en línea, gestión de estado de formulario, sanitización, llamadas a API y manejo de errores. La separación en componentes base y componentes de dominio mejora la testeabilidad y la cohesión.
- **Alternativas consideradas**:
  - *Mantener componentes en las vistas*: Provoca duplicación de inputs, botones, banners de error y navegación. Descartado.
  - *Adoptar una librería de componentes externa (e.g. MUI, Chakra, Tailwind)*: Viola las pautas del proyecto de utilizar Vanilla CSS estructurado y rompe la consistencia del tema Glassmorphism ya desarrollado. Descartado.

---

### 2. Gestión de Formularios y Validación

- **Decisión**: Implementar un custom hook reusable `useForm` (o `useFormValidation`) para controlar valores de campos, validaciones en tiempo real (`onBlur`/`onChange`), estados de error (`errors`), sanitización y callback de `onSubmit`.
- **Razón**: Tanto `LoginView` como `RegisterView` replican idéntica lógica manual de:
  - `handleFieldChange` que actualiza el estado y limpia errores locales y de servidor.
  - `handleFieldBlur` para validar campos individuales.
  - Estado `erroresValidacion` y control de carga.
  Centralizar esto en un hook genérico reduce más del 50% del boilerplate de las vistas de autenticación.
- **Alternativas consideradas**:
  - *React Hook Form / Formik*: Añade dependencias externas innecesarias para un conjunto acotado de formularios. La solución nativa con custom hook mantiene el bundle ligero y el control total sobre los esquemas de validación existentes en `utils/validaciones.ts`.

---

### 3. Estandarización de Consumo de Servicios y Manejo de Errores

- **Decisión**: 
  - Centralizar el flujo de registro a través del servicio de autenticación (`auth.service.ts` / `useAuth`), unificando cómo `LoginView` y `RegisterView` interactúan con la capa de API.
  - Unificar la presentación de alertas y errores en un componente reusable `<Alert type="error" | "success" | "info" />` con roles de accesibilidad `role="alert"` y `role="status"` configurados según el tipo.
- **Razón**: `RegisterView` importaba directamente `registrarUsuario` y `HttpError` de `api/auth-api.client.ts`, mientras `LoginView` usaba `useAuth()`. Esta asimetría generaba inconsistencia en el manejo de estado de carga y errores de servidor.

---

### 4. Estilos y Sistema de Tokens CSS

- **Decisión**:
  - Consolidar variables de color, tipografía, espaciado y efectos de glassmorphism en `src/styles/theme.css` / `src/styles/variables.css`.
  - Crear archivos CSS por componente (`input.css`, `button.css`, `alert.css`, `navbar.css`, `card.css`) o agruparlos en `src/styles/components.css`.
  - Eliminar estilos inline dispersos (`style={{ display: 'flex', ... }}`) en `HomeView.tsx` y `PlayersCatalogView.tsx` migrándolos a clases CSS consistentes.
- **Razón**: Eliminar la dispersión de estilos inline facilita el mantenimiento, el rediseño y la consistencia visual en modo oscuro/glassmorphism.

---

### 5. Auditoría de Bugs, Anti-Patrones y Calidad

- **Hallazgo 1 (Warnings de `act(...)` en tests)**: En los tests de integración de `RegisterView`, `LoginView` y `PlayersCatalogView`, los updates de estado asíncronos generaban advertencias en consola. La modularización de subcomponentes y hooks desacoplados permite testear hooks con `renderHook` y componentes con `@testing-library/react` de forma limpia y sin advertencias.
- **Hallazgo 2 (Tipado estricto sin `any`)**: Asegurar que todas las props de componentes e interfaces de estado utilicen tipos explícitos de TypeScript (ej. `React.InputHTMLAttributes<HTMLInputElement>`, eventos tipados).
- **Hallazgo 3 (Accesibilidad y Semántica)**: Garantizar que todos los campos compartidos posean `id`, `htmlFor`, `aria-invalid`, `aria-describedby` y elementos accesibles para lectores de pantalla.
