# Contract: Base UI Components (`components/ui`)

**Feature**: `005-frontend-refactor`  
**Date**: 2026-09-28  

## Contrato de Componentes de Interfaz Base

### 1. `Input` (`FormField`)
- **Propósito**: Campo de entrada accesible, controlado o no controlado, con soporte para etiquetas, íconos y mensajes de error.
- **Entradas**:
  - `id`: string (obligatorio para accesibilidad `htmlFor` y `aria-describedby`).
  - `label`: string opcional.
  - `icon`: string opcional (emoji o nodo).
  - `error`: string opcional (cuando está presente, asigna `aria-invalid="true"` y renderiza `<span role="alert">`).
  - `helperText`: string opcional.
- **Comportamiento**:
  - Aplica clase `input-error` automáticamente cuando `error` no es vacío.
  - Conecta el mensaje de error con `aria-describedby="{id}-error"`.

### 2. `Button`
- **Propósito**: Botón de acción con soporte para variantes estilísticas y estado de carga (`spinner`).
- **Entradas**:
  - `variant`: `'primary'` | `'secondary'` | `'danger'` | `'ghost'` (default: `'primary'`).
  - `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`).
  - `cargando`: boolean (cuando es `true`, deshabilita el botón y muestra el spinner accesible).
  - `textoCarga`: string opcional (texto alternativo al estar cargando).
- **Comportamiento**:
  - Deshabilita el evento `onClick` mientras `cargando` o `disabled` sea `true`.

### 3. `Alert`
- **Propósito**: Notificación y banner de feedback para errores o éxitos de operaciones.
- **Entradas**:
  - `tipo`: `'error'` | `'success'` | `'warning'` | `'info'`.
  - `mensaje`: string.
  - `onCerrar`: callback opcional para descartar la alerta.
- **Comportamiento**:
  - Si `tipo === 'error'`, asigna `role="alert"` y `aria-live="assertive"`.
  - Si `tipo === 'success'`, asigna `role="status"` y `aria-live="polite"`.

### 4. `Navbar`
- **Propósito**: Barra de navegación superior unificada para vistas autenticadas y no autenticadas.
- **Entradas**:
  - `titulo`: string (default: `'Football Token Marketplace'`).
  - `items`: array de links de navegación con `label`, `to`, `icon` e `id`.
  - `usuario`: datos del usuario en sesión o `null`.
  - `onLogout`: callback de cierre de sesión.
- **Comportamiento**:
  - Renderiza enlaces limpios utilizando React Router (`<Link>`).
  - Elimina estilos inline repetitivos.
