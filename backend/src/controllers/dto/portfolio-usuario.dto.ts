import { ApiProperty } from '@nestjs/swagger';

export class PosicionPortafolioDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del futbolista',
    example: 'd3000000-0000-0000-0000-000000000001',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Nombre completo del futbolista',
    example: 'Erling Haaland',
  })
  nombreJugador: string;

  @ApiProperty({
    description: 'Posición táctica del futbolista',
    example: 'Delantero',
  })
  posicion: string;

  @ApiProperty({
    description: 'Nombre del club o equipo al que pertenece',
    example: 'Manchester City',
  })
  equipoNombre: string;

  @ApiProperty({
    description: 'Cantidad de tokens disponibles en posesión',
    example: 10,
  })
  cantidadTokensDisponibles: number;

  @ApiProperty({
    description: 'Cantidad de tokens retenidos en custodia por órdenes de venta activas',
    example: 2,
  })
  cantidadTokensEnVenta: number;

  @ApiProperty({
    description: 'Precio unitario promedio ponderado de compra del activo',
    example: 1.4,
  })
  precioPromedioAdquisicion: number;

  @ApiProperty({
    description: 'Cotización oficial vigente del futbolista',
    example: 1.95,
  })
  cotizacionActual: number;

  @ApiProperty({
    description:
      'Valorización monetaria de la posición total (disponibles + en venta) a cotización actual',
    example: 23.4,
  })
  valoracionTotalPosicion: number;
}

export class PortfolioUsuarioDto {
  @ApiProperty({
    description: 'Identificador único (UUID) del usuario',
    example: 'u1000000-0000-0000-0000-000000000001',
  })
  usuarioId: string;

  @ApiProperty({
    description: 'Saldo monetario disponible en la billetera virtual',
    example: 850.5,
  })
  saldoBilletera: number;

  @ApiProperty({
    description:
      'Valorización monetaria consolidada de todos los tokens en posesión a cotización actual',
    example: 245.8,
  })
  valoracionTotalTokens: number;

  @ApiProperty({
    description: 'Patrimonio neto total (saldoBilletera + valoracionTotalTokens)',
    example: 1096.3,
  })
  patrimonioNetoTotal: number;

  @ApiProperty({
    description: 'Desglose detallado de tenencias por cada futbolista',
    type: [PosicionPortafolioDto],
  })
  posiciones: PosicionPortafolioDto[];
}
