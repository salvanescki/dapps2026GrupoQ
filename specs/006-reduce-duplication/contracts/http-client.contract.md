# Contract: Shared HTTP Client (`frontend/src/api/http-client.ts`)

**Feature**: `006-reduce-duplication`  
**Date**: 2026-09-28  

## Contrato de Cliente HTTP Compartido

### Entradas
- `endpoint`: string (ruta relativa a `/api`, por ejemplo `'/auth/login'`, `'/players'`).
- `options`: `RequestInit` estándar (método, body JSON, headers).

### Salidas
- Retorna `Promise<T>` con el cuerpo JSON deserializado si la respuesta está en rango `200-299`.

### Manejo de Errores
- Respuesta no exitosa (`!response.ok`): se deserializa el error del backend (un array de mensajes se normaliza a un string) y se lanza `HttpError(codigoEstado, mensaje)`. Si el cuerpo no es JSON, el mensaje por defecto es `'Error inesperado del servidor.'`.
- Fallo de red (`fetch` rechaza): se lanza `HttpError(0, 'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.')`.

### Cambios de comportamiento asumidos (menores y deliberados)
- Los errores de red del catálogo dejan de mostrar el mensaje técnico del navegador ("Failed to fetch") y muestran el mensaje en español de arriba.
- `PlayersApiError` desaparece a favor de `HttpError` (sin consumidores externos).

### Restricciones de compatibilidad
- `HttpError` debe seguir siendo importable desde `frontend/src/api/auth-api.client.ts`; los consumidores no deben importarla desde `http-client.ts`, porque los tests de Login y Register mockean `auth-api.client` con su propia clase y `instanceof` dejaría de funcionar.
- `playersApi.ts` mantiene los nombres de sus exports (los tests de vistas mockean ese módulo).

### Consumidores
- `frontend/src/api/auth-api.client.ts`
- `frontend/src/api/playersApi.ts`
