import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearOrdenVentaDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del futbolista cuyos tokens se ponen a la venta',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'jugadorId debe ser un UUID válido versión 4' })
  @IsNotEmpty({ message: 'jugadorId es obligatorio' })
  jugadorId: string;

  @ApiProperty({
    description: 'Cantidad de tokens indivisibles a ofertar',
    minimum: 1,
    example: 3,
  })
  @IsInt({ message: 'cantidad debe ser un número entero' })
  @Min(1, { message: 'cantidad debe ser al menos 1' })
  cantidad: number;

  @ApiProperty({
    description: 'Precio unitario fijado por el vendedor en Dinero',
    minimum: 0.01,
    example: 1.75,
  })
  @IsNumber({}, { message: 'precioUnitario debe ser numérico' })
  @IsPositive({ message: 'precioUnitario debe ser mayor a 0' })
  precioUnitario: number;
}

export class FiltroOrdenesVentaDto {
  @ApiPropertyOptional({
    description: 'Filtrar ofertas por UUID del jugador',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'jugadorId debe ser un UUID válido versión 4' })
  jugadorId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar ofertas por UUID del usuario vendedor',
    example: 'u1000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'vendedorId debe ser un UUID válido versión 4' })
  vendedorId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de orden (por defecto retorna las activas PENDIENTE y PARCIAL)',
    enum: ['ACTIVA', 'PENDIENTE', 'PARCIAL', 'COMPLETADA', 'CANCELADA'],
    default: 'ACTIVA',
  })
  @IsOptional()
  @IsEnum(['ACTIVA', 'PENDIENTE', 'PARCIAL', 'COMPLETADA', 'CANCELADA'], {
    message: 'estado debe ser ACTIVA, PENDIENTE, PARCIAL, COMPLETADA o CANCELADA',
  })
  estado?: 'ACTIVA' | 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA' = 'ACTIVA';

  @ApiPropertyOptional({
    description: 'Cantidad máxima de ofertas a retornar',
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

export class OrdenVentaRespuestaDto {
  @ApiProperty({
    description: 'Identificador único (UUID) de la orden de venta',
    example: 'o1000000-0000-0000-0000-000000000001',
  })
  ordenId: string;

  @ApiProperty({
    description: 'Identificador único (UUID) del futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Identificador único (UUID) del usuario vendedor',
    example: 'u1000000-0000-0000-0000-000000000001',
  })
  vendedorId: string;

  @ApiProperty({
    description: 'Cantidad original de tokens puestos a la venta',
    example: 3,
  })
  cantidad: number;

  @ApiProperty({
    description: 'Cantidad remanente de tokens disponibles para comprar en esta oferta',
    example: 3,
  })
  cantidadRestante: number;

  @ApiProperty({
    description: 'Precio unitario demandado por token',
    example: 1.75,
  })
  precioUnitario: number;

  @ApiProperty({
    description: 'Estado de la orden',
    enum: ['PENDIENTE', 'PARCIAL', 'COMPLETADA', 'CANCELADA'],
    example: 'PENDIENTE',
  })
  estado: string;

  @ApiProperty({
    description: 'Fecha y hora de creación de la oferta',
    example: '2026-11-01T20:45:00.000Z',
  })
  creadoEn: string;

  @ApiProperty({
    description: 'Fecha y hora de la última actualización',
    example: '2026-11-01T20:45:00.000Z',
  })
  actualizadoEn: string;
}
