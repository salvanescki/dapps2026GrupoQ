# Data Model: Equipo de la Semana (Team of the Week)

**Feature**: `014-team-of-the-week`  
**Date**: 2026-11-02  
**Status**: Completed  

Este documento define la estructura de datos del dominio, entidades ricas, objetos de valor, invariantes de negocio, esquema físico en PostgreSQL y entidades TypeORM para la funcionalidad de **Equipo de la Semana**.

---

## 1. Entidades del Dominio (Rich Domain Model)

### 1.1. `EquipoSemanal` (Agregado Raíz)

Representa el once ideal oficial de la plataforma correspondiente a una semana calendario y año determinados. Encapsula todas las invariantes estructurales de la alineación táctica y las reglas de selección.

#### Propiedades e Identificadores:
- `id`: `string` (UUID v4 determinista o autogenerado).
- `ano`: `number` (Entero positivo; año ISO de la semana, ej. 2026).
- `semanaIso`: `number` (Entero entre 1 y 53, correspondiente a la semana ISO-8601).
- `formacion`: `'4-3-3'` (Formación táctica fija soportada en esta versión).
- `estrategiaId`: `EstrategiaId` (`'GLOBAL'` o `'POSICIONAL'`).
- `estrategiaVersion`: `EstrategiaVersion` (`'GLOBAL_v1'` o `'POSICIONAL_v1'`).
- `fechaGeneracion`: `Date` (Marca de tiempo inmutable de cuándo se calculó y publicó).
- `miembros`: `MiembroEquipoSemanal[]` (Lista inmutable de exactamente 11 jugadores titulares).

#### Invariantes de Negocio:
1. **Invariante de Formación 4-3-3**: El equipo debe contener obligatoriamente y sin excepción:
   - Exactamente 1 miembro con `posicion === 'Portero'`.
   - Exactamente 4 miembros con `posicion === 'Defensa'`.
   - Exactamente 3 miembros con `posicion === 'Mediocampista'`.
   - Exactamente 3 miembros con `posicion === 'Delantero'`.
   Total inalterable: 11 miembros titulares.
2. **Invariante de Identidad Única**: No pueden existir dos miembros con el mismo `jugadorId` dentro del mismo `EquipoSemanal`.
3. **Invariante Temporal**: `ano` debe ser $\ge 2024$ y `semanaIso` debe pertenecer al intervalo cerrado $[1, 53]$.
4. **Invariante de Snapshot Inmutable**: Una vez cerrada la semana, ningún dato de cotización o jugador puede modificarse retrospectivamente. Mientras la semana está abierta, solo un administrador puede regenerarla.

#### Métodos de Dominio:
- `public static seleccionarOnceIdeal(params: ParametrosSeleccionEquipo): EquipoSemanal`:
  Método de fábrica que implementa la regla de selección táctica:
  - Filtra jugadores elegibles (`activo === true`, `cotizacion.sinEstadisticas === false` y al menos 270 minutos jugados acumulados).
  - Agrupa por posición.
  - Verifica cupos mínimos requeridos (1 POR, 4 DEF, 3 MED, 3 DEL); si falta alguno, arroja `ReglaDeNegocioException`.
  - Ordena cada grupo por `cotizacion.valor DESC`, `cotizacion.score DESC`, `jugador.nombre ASC`.
  - Toma los mejores de cada grupo y construye la instancia de `EquipoSemanal` con sus 11 miembros.
- `public estaCerrada(ahora: Date): boolean`:
  Una semana está cerrada cuando `ahora` es igual o posterior al lunes 00:00 UTC de la semana ISO siguiente.
- `public validarRegenerable(ahora: Date): void`:
  Arroja `ReglaDeNegocioException` en español si la semana está cerrada.
- `public validarInvariantes(): void`:
  Verifica exhaustivamente que se cumplan las cantidades por posición, no duplicidad y tipos válidos.

---

### 1.2. `MiembroEquipoSemanal` (Entidad Hija / Snapshot Táctico)

Representa a cada uno de los 11 futbolistas seleccionados en el once ideal, preservando un snapshot inmutable de sus atributos al momento del cálculo.

#### Propiedades:
- `id`: `string` (UUID v4).
- `equipoSemanalId`: `string` (UUID del agregado raíz padre).
- `jugadorId`: `string` (UUID del jugador federado en el catálogo).
- `nombre`: `string` (Nombre completo del futbolista congelado, ej. "Kylian Mbappé").
- `equipoNombre`: `string` (Club de pertenencia congelado, ej. "Real Madrid").
- `posicion`: `PosicionJugador` (`'Portero'`, `'Defensa'`, `'Mediocampista'`, `'Delantero'`).
- `cotizacion`: `number` (Valor oficial en créditos congelado, $\ge 1.00$).
- `score`: `number` (Puntaje de rendimiento normalizado congelado en $[0.0000, 1.0000]$).
- `orden`: `number` (Índice posicional de ordenamiento en la cancha, de 1 a 11).

#### Invariantes:
- `cotizacion >= 1.00`.
- `score >= 0.0000 && score <= 1.0000`.
- `nombre` y `equipoNombre` no pueden ser cadenas vacías.

---

## 2. Esquema Relacional de Base de Datos (PostgreSQL)

```sql
-- Tabla Principal: equipos_semanales
CREATE TABLE IF NOT EXISTS equipos_semanales (
    id UUID PRIMARY KEY,
    ano INTEGER NOT NULL CHECK (ano >= 2024),
    semana_iso INTEGER NOT NULL CHECK (semana_iso >= 1 AND semana_iso <= 53),
    formacion VARCHAR(20) NOT NULL DEFAULT '4-3-3',
    estrategia_id VARCHAR(50) NOT NULL,
    estrategia_version VARCHAR(50) NOT NULL,
    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_equipos_semanales_ano_semana UNIQUE (ano, semana_iso)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_equipos_semanales_fecha 
    ON equipos_semanales(fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_equipos_semanales_ano_semana 
    ON equipos_semanales(ano DESC, semana_iso DESC);

-- Tabla Detalle: miembros_equipos_semanales
CREATE TABLE IF NOT EXISTS miembros_equipos_semanales (
    id UUID PRIMARY KEY,
    equipo_semanal_id UUID NOT NULL REFERENCES equipos_semanales(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    equipo_nombre VARCHAR(150) NOT NULL,
    posicion VARCHAR(30) NOT NULL CHECK (posicion IN ('Portero', 'Defensa', 'Mediocampista', 'Delantero')),
    cotizacion NUMERIC(12,2) NOT NULL CHECK (cotizacion >= 1.0),
    score NUMERIC(6,4) NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
    orden INTEGER NOT NULL CHECK (orden >= 1 AND orden <= 11),
    CONSTRAINT uq_miembro_equipo_jugador UNIQUE (equipo_semanal_id, jugador_id)
);

-- Índices de relación
CREATE INDEX IF NOT EXISTS idx_miembros_equipo_id 
    ON miembros_equipos_semanales(equipo_semanal_id);
CREATE INDEX IF NOT EXISTS idx_miembros_jugador_id 
    ON miembros_equipos_semanales(jugador_id);
```

---

## 3. Mapeo Objeto-Relacional (TypeORM ORM Entities)

### 3.1. `EquipoSemanalOrmEntity`
Ruta: `backend/src/data-access/equipo-semanal.orm-entity.ts`
- Tabla: `equipos_semanales`
- Columnas: `id`, `ano`, `semana_iso`, `formacion`, `estrategia_id`, `estrategia_version`, `fecha_generacion`
- Relaciones: `@OneToMany(() => MiembroEquipoSemanalOrmEntity, m => m.equipoSemanal, { cascade: true, eager: true })`

### 3.2. `MiembroEquipoSemanalOrmEntity`
Ruta: `backend/src/data-access/miembro-equipo-semanal.orm-entity.ts`
- Tabla: `miembros_equipos_semanales`
- Columnas: `id`, `equipo_semanal_id`, `jugador_id`, `nombre`, `equipo_nombre`, `posicion`, `cotizacion`, `score`, `orden`
- Relaciones: `@ManyToOne(() => EquipoSemanalOrmEntity, e => e.miembros, { onDelete: 'CASCADE' })` y `@ManyToOne(() => JugadorOrmEntity)`

### 3.3. Mapper y repositorio
- `backend/src/data-access/equipo-semanal.mapper.ts`: conversión ORM <-> dominio, siguiendo el patrón de los demás mappers.
- `backend/src/data-access/equipo-semanal.typeorm-repository.ts`: implementa `IEquipoSemanalRepository` (token `EQUIPO_SEMANAL_REPOSITORY`) con `guardar` (transaccional: reemplaza miembros de la semana abierta), `buscarPorSemana(ano, semanaIso)`, `buscarMasReciente()` y `listarSemanas()`.

---

## 4. Contratos de Transferencia de Datos (DTOs)

### 4.1. `EquipoSemanalRespuestaDto`
```typescript
export class MiembroEquipoSemanalDto {
  jugadorId: string;
  nombre: string;
  equipoNombre: string;
  posicion: 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero';
  cotizacion: number;
  score: number;
  orden: number;
}

export class EquipoSemanalRespuestaDto {
  id: string;
  ano: number;
  semanaIso: number;
  formacion: string;
  estrategiaId: string;
  estrategiaVersion: string;
  fechaGeneracion: string; // ISO-8601
  miembros: MiembroEquipoSemanalDto[];
}
```

### 4.2. `SemanaDisponibleDto`
```typescript
export class SemanaDisponibleDto {
  ano: number;
  semanaIso: number;
  fechaGeneracion: string; // ISO-8601
}
```

### 4.3. `ResumenGeneracionEquipoDto`
```typescript
export class ResumenGeneracionEquipoDto {
  mensaje: string;
  equipo: EquipoSemanalRespuestaDto;
}
```

