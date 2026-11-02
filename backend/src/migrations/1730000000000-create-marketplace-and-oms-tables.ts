import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketplaceAndOmsTables1730000000000
  implements MigrationInterface
{
  name = 'CreateMarketplaceAndOmsTables1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Columnas rol y saldo en usuarios
    await queryRunner.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'USUARIO',
        ADD COLUMN IF NOT EXISTS saldo NUMERIC(12,2) NOT NULL DEFAULT 1000.00;
    `);

    // Asegurar restricciones check en usuarios
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_rol'
        ) THEN
          ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_rol CHECK (rol IN ('ADMIN', 'USUARIO'));
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_saldo'
        ) THEN
          ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_saldo CHECK (saldo >= 0);
        END IF;
      END $$;
    `);

    // 2. Tabla configuraciones_mercado (singleton id = 1)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS configuraciones_mercado (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        estrategia_activa_id VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
        estrategia_activa_version VARCHAR(50) NOT NULL DEFAULT 'GLOBAL_v1',
        actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Semilla inicial singleton
    await queryRunner.query(`
      INSERT INTO configuraciones_mercado (id, estrategia_activa_id, estrategia_activa_version, actualizado_en)
      VALUES (1, 'GLOBAL', 'GLOBAL_v1', now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Tabla balances_tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS balances_tokens (
        id UUID PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
        cantidad_bloqueada INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_bloqueada >= 0),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_balance_usuario_jugador UNIQUE (usuario_id, jugador_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_balances_usuario_id ON balances_tokens (usuario_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_balances_jugador_id ON balances_tokens (jugador_id);
    `);

    // 4. Tabla cotizaciones
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id UUID PRIMARY KEY,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        score NUMERIC(6,4) NOT NULL CHECK (score >= 0.0000 AND score <= 1.0000),
        valor NUMERIC(12,2) NOT NULL CHECK (valor >= 1.00),
        estrategia_id VARCHAR(50) NOT NULL,
        estrategia_version VARCHAR(50) NOT NULL,
        sin_estadisticas BOOLEAN NOT NULL DEFAULT false,
        metricas JSONB NULL,
        fecha_cotizacion TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cotizaciones_jugador_id ON cotizaciones (jugador_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones (fecha_cotizacion DESC);
    `);

    // 5. Tabla ordenes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ordenes (
        id UUID PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('COMPRA', 'VENTA')),
        tipo_mercado VARCHAR(20) NOT NULL CHECK (tipo_mercado IN ('PRIMARIO', 'SECUNDARIO')),
        cantidad INTEGER NOT NULL CHECK (cantidad >= 1),
        cantidad_restante INTEGER NOT NULL CHECK (cantidad_restante >= 0 AND cantidad_restante <= cantidad),
        precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0),
        estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'COMPLETADA', 'CANCELADA')),
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_usuario_id ON ordenes (usuario_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_jugador_id ON ordenes (jugador_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_estado_tipo ON ordenes (estado, tipo);
    `);

    // 6. Tabla transacciones
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transacciones (
        id UUID PRIMARY KEY,
        orden_id UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        comprador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        cantidad INTEGER NOT NULL CHECK (cantidad >= 1),
        precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0),
        monto_total NUMERIC(12,2) NOT NULL CHECK (monto_total > 0),
        tipo_mercado VARCHAR(20) NOT NULL CHECK (tipo_mercado IN ('PRIMARIO', 'SECUNDARIO')),
        estrategia_cotizacion VARCHAR(50) NOT NULL,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_transacciones_comprador_vendedor CHECK (comprador_id <> vendedor_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_orden_id ON transacciones (orden_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_jugador_id ON transacciones (jugador_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_comprador_id ON transacciones (comprador_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_vendedor_id ON transacciones (vendedor_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_creado_en ON transacciones (creado_en DESC);
    `);

    // 7. Función y triggers de inmutabilidad sobre cotizaciones y transacciones
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_modificacion_o_eliminacion()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Operación no permitida: este registro es inmutable.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_inmutabilidad_cotizaciones ON cotizaciones;
      CREATE TRIGGER trg_inmutabilidad_cotizaciones
      BEFORE UPDATE OR DELETE ON cotizaciones
      FOR EACH ROW
      EXECUTE FUNCTION impedir_modificacion_o_eliminacion();
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_inmutabilidad_transacciones ON transacciones;
      CREATE TRIGGER trg_inmutabilidad_transacciones
      BEFORE UPDATE OR DELETE ON transacciones
      FOR EACH ROW
      EXECUTE FUNCTION impedir_modificacion_o_eliminacion();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_inmutabilidad_transacciones ON transacciones;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_inmutabilidad_cotizaciones ON cotizaciones;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS impedir_modificacion_o_eliminacion();`);

    await queryRunner.query(`DROP TABLE IF EXISTS transacciones;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ordenes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cotizaciones;`);
    await queryRunner.query(`DROP TABLE IF EXISTS balances_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS configuraciones_mercado;`);

    await queryRunner.query(`
      ALTER TABLE usuarios
        DROP CONSTRAINT IF EXISTS chk_usuarios_saldo,
        DROP CONSTRAINT IF EXISTS chk_usuarios_rol,
        DROP COLUMN IF EXISTS saldo,
        DROP COLUMN IF EXISTS rol;
    `);
  }
}
