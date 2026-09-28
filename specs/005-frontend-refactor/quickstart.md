# Quickstart & Validation Guide: Frontend Refactor

**Feature**: `005-frontend-refactor`  
**Date**: 2026-09-28  

## Guía de Verificación y Validación Rápida

Este documento detalla los pasos para validar que el refactor del frontend no introduzca regresiones y cumpla con todos los criterios de calidad y usabilidad.

### 1. Prerrequisitos
- Node.js >= 18
- Repositorio clonado y dependencias instaladas en `frontend/` (`npm install`).

### 2. Ejecución de Tests Automatizados
Ejecutar la suite completa de pruebas unitarias y de integración de frontend:
```bash
npm --prefix frontend test
```
**Resultado esperado:**
- Todos los archivos de test en `frontend/tests/` deben pasar exitosamente (106+ tests).
- Ningún test debe emitir warnings de `act(...)` no manejados.

### 3. Verificación de Compilación y Tipado TypeScript
Verificar que el empaquetado de producción y el análisis de tipos pasen sin errores:
```bash
npm --prefix frontend run build
```
**Resultado esperado:**
- `tsc -b` finaliza con código de salida 0.
- `vite build` genera el bundle en `frontend/dist/` sin errores de importación o estilos.

### 4. Escenarios de Validación Manual en Navegador

#### Escenario A: Flujo de Registro (`/register`)
1. Iniciar el servidor local: `npm --prefix frontend run dev`.
2. Navegar a `http://localhost:5173/register`.
3. Intentar enviar campos vacíos: deben aparecer mensajes de error individuales con estilos consistentes.
4. Ingresar contraseña no coincidente: debe mostrarse el error de coincidencia.
5. Completar datos válidos y enviar:
   - El botón debe mostrar el estado de carga (`Spinner`).
   - Tras respuesta exitosa, redirigir a `/login` mostrando el banner verde de bienvenida.

#### Escenario B: Flujo de Login (`/login`)
1. Desde `/login`, ingresar credenciales válidas.
2. Comprobar que el banner de éxito previo desaparece y se muestra el estado de carga.
3. El usuario es redirigido a `/` (HomeView).

#### Escenario C: Dashboard y Navegación (`/` y `/players`)
1. En `/`, verificar que el `Navbar` muestra la información de sesión, el enlace al catálogo y el botón de logout.
2. Hacer click en "Ver Catálogo de Jugadores": navegar a `/players`.
3. En `/players`, comprobar que el `Navbar` superior mantiene el diseño unificado.
4. Interactuar con los filtros y la barra de búsqueda del catálogo para verificar que el comportamiento interactivo se mantiene intacto.
5. Hacer click en "Cerrar Sesión": el usuario es desconectado y devuelto a `/login`.
