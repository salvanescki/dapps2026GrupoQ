import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

export class CrearOrdenCompraDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del futbolista cuyos tokens se compran',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'jugadorId debe ser un UUID válido versión 4' })
  @IsNotEmpty({ message: 'jugadorId es obligatorio' })
  jugadorId: string;

  @ApiProperty({
    description: 'Cantidad de tokens indivisibles a comprar',
    minimum: 1,
    example: 5,
  })
  @IsInt({ message: 'cantidad debe ser un número entero' })
  @Min(1, { message: 'cantidad debe ser al menos 1' })
  cantidad: number;

  @ApiPropertyOptional({
    description:
      'UUID opcional de una oferta activa del mercado secundario. Si se omite, la compra se ejecuta en el mercado primario al precio oficial vigente.',
    example: 'e3000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ordenVentaId debe ser un UUID válido versión 4' })
  ordenVentaId?: string;

  @ApiPropertyOptional({
    description:
      'Límite máximo opcional a pagar por token (protección contra cambios de cotización)',
    minimum: 0.01,
    example: 2.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'precioMaximoUnitario debe ser numérico' })
  @IsPositive({ message: 'precioMaximoUnitario debe ser mayor a 0' })
  precioMaximoUnitario?: number;
}

export class ResultadoCompraDto {
  @ApiProperty({
    description: 'Identificador único de la transacción registrada',
    example: 'f1000000-0000-0000-0000-000000000001',
  })
  transaccionId: string;

  @ApiProperty({
    description: 'Identificador único de la orden de compra ejecutada',
    example: 'f2000000-0000-0000-0000-000000000001',
  })
  ordenId: string;

  @ApiProperty({
    description: 'Identificador único del jugador adquirido',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Cantidad de tokens comprados',
    example: 5,
  })
  cantidadTokensComprados: number;

  @ApiProperty({
    description: 'Precio unitario final por token pagado',
    example: 1.25,
  })
  precioUnitarioPagado: number;

  @ApiProperty({
    description: 'Monto total debitado de la billetera del comprador',
    example: 6.25,
  })
  montoTotalDebitado: number;

  @ApiProperty({
    description: 'Saldo monetario restante en la billetera del comprador tras la operación',
    example: 993.75,
  })
  saldoRestanteUsuario: number;

  @ApiProperty({
    description: 'Tipo de mercado en el que se liquidó la compra',
    enum: ['PRIMARIO', 'SECUNDARIO'],
    example: 'PRIMARIO',
  })
  tipoMercado: 'PRIMARIO' | 'SECUNDARIO';

  @ApiProperty({
    description:
      'Estrategia y versión utilizada en la cotización vigente del token al momento de dicha compra',
    example: 'GLOBAL_v1',
  })
  estrategiaCotizacion: string;

  @ApiProperty({
    description: 'Fecha y hora de la transacción',
    example: '2026-11-01T20:30:00.000Z',
  })
  fecha: string;
}
