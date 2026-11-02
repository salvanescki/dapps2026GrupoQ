import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransaccionUsuarioDto {
  @ApiProperty({
    description: 'Identificador único de la transacción',
    example: 't1000000-0000-0000-0000-000000000001',
  })
  transaccionId: string;

  @ApiProperty({
    description: 'Identificador único de la orden asociada',
    example: 'o1000000-0000-0000-0000-000000000001',
  })
  ordenId: string;

  @ApiProperty({
    description: 'Tipo de operación desde la perspectiva del usuario consultado',
    enum: ['COMPRA', 'VENTA'],
    example: 'COMPRA',
  })
  tipoOperacion: 'COMPRA' | 'VENTA';

  @ApiProperty({
    description: 'Tipo de mercado donde se liquidó la operación',
    enum: ['PRIMARIO', 'SECUNDARIO'],
    example: 'PRIMARIO',
  })
  tipoMercado: 'PRIMARIO' | 'SECUNDARIO';

  @ApiProperty({
    description: 'Identificador único del futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Nombre completo del futbolista',
    example: 'Jude Bellingham',
  })
  nombreJugador: string;

  @ApiProperty({
    description: 'Cantidad de tokens transferidos en la transacción',
    example: 4,
  })
  cantidadTokens: number;

  @ApiProperty({
    description: 'Precio unitario pagado o cobrado por token',
    example: 1.5,
  })
  precioUnitario: number;

  @ApiProperty({
    description: 'Monto total liquidado',
    example: 6.0,
  })
  montoTotal: number;

  @ApiProperty({
    description:
      'Estrategia y versión utilizada en la cotización vigente del token al momento de dicha compra',
    example: 'POSICIONAL_v1',
  })
  estrategiaCotizacion: string;

  @ApiProperty({
    description: 'Contraparte de la operación o MERCADO_PRIMARIO si se adquirió del ADMIN',
    example: 'MERCADO_PRIMARIO',
  })
  contraparte: string;

  @ApiProperty({
    description: 'Fecha y hora de liquidación',
    example: '2026-11-01T20:30:00.000Z',
  })
  fecha: string;
}

export class TransaccionAuditoriaDto {
  @ApiProperty({
    description: 'Identificador único de la transacción',
    example: 't1000000-0000-0000-0000-000000000001',
  })
  transaccionId: string;

  @ApiProperty({
    description: 'Identificador único de la orden asociada',
    example: 'o1000000-0000-0000-0000-000000000001',
  })
  ordenId: string;

  @ApiProperty({
    description: 'Mercado de liquidación',
    enum: ['PRIMARIO', 'SECUNDARIO'],
    example: 'SECUNDARIO',
  })
  tipoMercado: 'PRIMARIO' | 'SECUNDARIO';

  @ApiProperty({
    description: 'Identificador único del futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Nombre completo del futbolista',
    example: 'Jude Bellingham',
  })
  nombreJugador: string;

  @ApiProperty({
    description: 'Identificador único del usuario comprador',
    example: 'u1000000-0000-0000-0000-000000000001',
  })
  compradorId: string;

  @ApiProperty({
    description: 'Identificador único del usuario vendedor',
    example: 'u2000000-0000-0000-0000-000000000002',
  })
  vendedorId: string;

  @ApiProperty({
    description: 'Cantidad de tokens transferidos',
    example: 2,
  })
  cantidadTokens: number;

  @ApiProperty({
    description: 'Precio unitario pagado',
    example: 2.5,
  })
  precioUnitario: number;

  @ApiProperty({
    description: 'Monto total transaccionado',
    example: 5.0,
  })
  montoTotal: number;

  @ApiProperty({
    description: 'Estrategia y versión de cotización vigente en el momento de la transacción',
    example: 'POSICIONAL_v1',
  })
  estrategiaCotizacion: string;

  @ApiProperty({
    description: 'Fecha y hora de creación de la transacción',
    example: '2026-11-01T20:30:00.000Z',
  })
  fecha: string;
}

export class FiltroTransaccionesUsuarioDto {
  @ApiPropertyOptional({
    description: 'Filtrar transacciones por UUID del futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'jugadorId debe ser un UUID válido versión 4' })
  jugadorId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por rol u operación en la transacción',
    enum: ['COMPRA', 'VENTA'],
    example: 'COMPRA',
  })
  @IsOptional()
  @IsEnum(['COMPRA', 'VENTA'], { message: 'tipo debe ser COMPRA o VENTA' })
  tipo?: 'COMPRA' | 'VENTA';

  @ApiPropertyOptional({
    description: 'Fecha límite inferior (inclusive) en formato ISO-8601',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha ISO-8601 válida' })
  desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha límite superior (inclusive) en formato ISO-8601',
    example: '2026-11-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha ISO-8601 válida' })
  hasta?: string;

  @ApiPropertyOptional({
    description: 'Límite máximo de registros a retornar',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entero' })
  @Min(1, { message: 'limite mínimo es 1' })
  @Max(100, { message: 'limite máximo es 100' })
  limite?: number = 50;
}

export class FiltroTransaccionesAdminDto {
  @ApiPropertyOptional({
    description: 'Filtrar por UUID de futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'jugadorId debe ser un UUID válido versión 4' })
  jugadorId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por UUID de usuario (comprador o vendedor)',
    example: 'u1000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'usuarioId debe ser un UUID válido versión 4' })
  usuarioId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de mercado',
    enum: ['PRIMARIO', 'SECUNDARIO'],
    example: 'PRIMARIO',
  })
  @IsOptional()
  @IsEnum(['PRIMARIO', 'SECUNDARIO'], { message: 'tipoMercado debe ser PRIMARIO o SECUNDARIO' })
  tipoMercado?: 'PRIMARIO' | 'SECUNDARIO';

  @ApiPropertyOptional({
    description: 'Fecha límite inferior (inclusive) en formato ISO-8601',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha ISO-8601 válida' })
  desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha límite superior (inclusive) en formato ISO-8601',
    example: '2026-11-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha ISO-8601 válida' })
  hasta?: string;

  @ApiPropertyOptional({
    description: 'Límite máximo de registros a retornar',
    minimum: 1,
    maximum: 200,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entero' })
  @Min(1, { message: 'limite mínimo es 1' })
  @Max(200, { message: 'limite máximo es 200' })
  limite?: number = 100;
}
