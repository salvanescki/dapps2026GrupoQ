# Quickstart: Validación del Panel de Observabilidad y Monitoreo en Tiempo Real

**Feature**: `018-frontend-observability-dashboard`  
**Date**: 2026-11-23  
**Status**: Ready for Implementation

---

## 1. Prerrequisitos

- Node.js versión `>= 20.x`
- Dependencias de frontend instaladas (`npm --prefix frontend install`)
- Repositorio en la rama `feat/observability` o rama de trabajo correspondiente

---

## 2. Comandos de Verificación y Testing

### Ejecución de Pruebas Unitarias de Frontend
Valida el parser de Prometheus (`prometheus-parser.ts`), formateadores y utilidades de navegación:
```bash
npm --prefix frontend run test:unit
```

### Ejecución de Pruebas de Integración de Frontend
Valida la protección de rutas (`AdminRoute`, `AppRoutes`), el hook `useObservability`, y el renderizado completo de la vista `ObservabilityView` con dobles de red controlados:
```bash
npm --prefix frontend run test:integration
```

### Verificación de Cobertura (Coverage >= 80%)
Verifica que las líneas y branches alcancen el umbral constitucional exigido:
```bash
npm --prefix frontend run test:coverage
```

### Verificación de Tipado y Compilación
Verifica que TypeScript compile sin errores:
```bash
npm --prefix frontend run build
```

---

## 3. Escenarios de Validación End-to-End

### Escenario 1: Control de Acceso y Redirección de Seguridad (US1)
1. **Acceso Anónimo**:
   - Abrir un navegador o simular sesión en blanco.
   - Navegar a `http://localhost:5173/admin/observability`.
   - **Resultado esperado**: Redirección inmediata a `/login`. La telemetría no se solicita.
2. **Acceso con Rol USUARIO**:
   - Iniciar sesión con un usuario estándar (`rol: 'USUARIO'`).
   - Comprobar la barra de navegación: el enlace `Observabilidad` **no** aparece.
   - Intentar ingresar por URL directa a `/admin/observability`.
   - **Resultado esperado**: Redirección inmediata a `/` y despliegue del banner de seguridad con el mensaje de advertencia en español.
3. **Acceso con Rol ADMIN**:
   - Iniciar sesión con un usuario con `rol: 'ADMIN'`.
   - Comprobar la barra de navegación: el enlace `Observabilidad` aparece junto a Gobernanza.
   - Pulsar sobre el enlace o ingresar a `/admin/observability`.
   - **Resultado esperado**: Acceso exitoso y carga del panel interactivo de observabilidad.

---

### Escenario 2: Monitoreo de Sondas de Salud e Infraestructura (US2)
1. **Sonda de Preparación (Readiness)**:
   - Verificar tarjetas de dependencias para:
     - PostgreSQL (`database`): badge verde "Saludable".
     - Redis (`redis`): badge verde "Saludable".
     - Football-Data (`footballData`): badge verde "Saludable".
   - Si se simula caída de Redis (retorno HTTP 503 con estado `down`): la tarjeta de Redis cambia a rojo indicando la causa, mientras PostgreSQL y Football-Data permanecen en verde.
2. **Sonda de Vivacidad (Liveness) y Memoria**:
   - Visualizar barra de consumo de memoria Heap (frente al umbral de 300 MB).
   - Visualizar barra de consumo de memoria RSS (frente al umbral de 1 GB).
   - Validar que los porcentajes y valores en MB se muestran correctamente con estilos de advertencia si superan el 80%.

---

### Escenario 3: Dashboards de Negocio y Gráficos Interactivos (US3, US4, US5)
1. **Trading & OMS**:
   - Tarjetas métricas: Volumen monetario transaccionado formateado en moneda, Transacciones liquidadas, Órdenes de venta activas, Latencia promedio de settlement.
   - Gráfico de barras (Recharts): Distribución de órdenes por tipo (compra/venta) y mercado (primario/secundario).
2. **Pricing & Cotizaciones**:
   - Badge destacado con la estrategia activa (`GLOBAL_v1` o `POSICIONAL_v1`).
   - Gráfico comparativo de recálculos exitosos vs fallidos y tiempos de cómputo.
   - Desglose de jugadores procesados con estadísticas, sin estadísticas y fallidos.
3. **Scraping, Integraciones y Caché**:
   - Gráfica/indicadores de duración de scraping por liga y tasa de concordancia.
   - Medidor de cuota de Football-Data.org y advertencia si restan 2 o menos llamadas.
   - Indicador de ratio de aciertos (hit/miss) de la memoria caché Redis L1 y contador de fallbacks.

---

### Escenario 4: Controles de Operabilidad y Resiliencia (US6)
1. **Refresco Manual**:
   - Pulsar el botón "Actualizar ahora".
   - Las tarjetas muestran estado de refresco momentáneo y la marca de "Última sincronización" se actualiza a la hora actual.
2. **Selector de Intervalo**:
   - Cambiar entre Pausado, 5s, 10s y 30s.
   - Comprobar que en Pausado no se realizan llamadas en segundo plano; en 5s las peticiones se disparan cada 5 segundos sin recargar la página.
3. **Aislamiento de Fallos y Desconexión**:
   - Simular desconexión de red (`offline`): el panel muestra un aviso no intrusivo y detiene los reintentos agresivos. Al reconectar (`online`), reanuda las consultas.
   - Si `/metrics` falla pero `/health/ready` responde, el bloque de salud se renderiza normalmente y solo el bloque de métricas muestra advertencia con opción de reintentar.

---

## 4. Referencias y Documentación Relacionada
- [spec.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/spec.md)
- [research.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/research.md)
- [data-model.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/data-model.md)
- [contracts/observability-api.contract.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/contracts/observability-api.contract.md)
- [contracts/observability-client.contract.md](file:///home/ale/Escritorio/Repositorios/dapps2026GrupoQ/specs/018-frontend-observability-dashboard/contracts/observability-client.contract.md)
