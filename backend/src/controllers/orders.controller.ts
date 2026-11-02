import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { OmsService } from '../services/oms.service';
import {
  CrearOrdenCompraDto,
  ResultadoCompraDto,
} from './dto/orden-compra.dto';
import {
  CrearOrdenVentaDto,
  FiltroOrdenesVentaDto,
  OrdenVentaRespuestaDto,
} from './dto/orden-venta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Mercado')
@Controller('orders')
export class OrdersController {
  constructor(private readonly omsService: OmsService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar libro de órdenes de venta en mercado secundario',
    description:
      'Lista las ofertas de venta del mercado secundario (por defecto las activas en estado PENDIENTE o PARCIAL) ordenadas por mejor precio unitario ascendente y antigüedad, permitiendo al comprador elegir una oferta puntual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Libro de órdenes obtenido exitosamente.',
    type: [OrdenVentaRespuestaDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de filtro inválidos.',
  })
  public async listarOrdenesVenta(
    @Query() filtros: FiltroOrdenesVentaDto,
  ): Promise<OrdenVentaRespuestaDto[]> {
    return this.omsService.listarOrdenesVenta(filtros);
  }

  @Post('sell')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publicar orden de venta en mercado secundario',
    description:
      'Crea una oferta de venta en el mercado secundario reteniendo preventivamente los tokens ofertados en custodia (cantidadBloqueada). La orden se crea en estado PENDIENTE.',
  })
  @ApiBody({ type: CrearOrdenVentaDto })
  @ApiResponse({
    status: 201,
    description: 'Orden de venta creada y tokens retenidos en custodia.',
    type: OrdenVentaRespuestaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cantidad o precio inválido, balance insuficiente o jugador inactivo.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Jugador no encontrado.',
  })
  public async crearOrdenVenta(
    @Body() dto: CrearOrdenVentaDto,
    @Req() req: any,
  ): Promise<OrdenVentaRespuestaDto> {
    const vendedorId = req.user?.id || req.user?.sub;
    return this.omsService.crearOrdenVenta(vendedorId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancelar orden de venta y liberar tokens en custodia',
    description:
      'Permite al vendedor cancelar una orden de venta activa (PENDIENTE o PARCIAL), liberando inmediatamente los tokens retenidos en custodia hacia su saldo disponible. Requiere ser el propietario de la orden.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la orden de venta a cancelar',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden cancelada y tokens liberados de custodia.',
    type: OrdenVentaRespuestaDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. La orden pertenece a otro usuario.',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden de venta no encontrada.',
  })
  @ApiResponse({
    status: 409,
    description: 'La orden ya está completamente ejecutada o cancelada.',
  })
  public async cancelarOrdenVenta(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<OrdenVentaRespuestaDto> {
    const usuarioId = req.user?.id || req.user?.sub;
    return this.omsService.cancelarOrdenVenta(usuarioId, id);
  }

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Comprar tokens (Mercado primario o secundario por oferta puntual)',
    description:
      'Ejecuta de forma inmediata y atómica la compra de tokens de un futbolista. Si no se envía ordenVentaId, se adquieren del inventario primario del ADMIN al precio oficial vigente. Si se envía ordenVentaId, se adquieren de una oferta secundaria activa puntual. Registra de forma inmutable la estrategiaCotizacion vigente.',
  })
  @ApiBody({ type: CrearOrdenCompraDto })
  @ApiResponse({
    status: 200,
    description: 'Compra ejecutada y liquidada exitosamente.',
    type: ResultadoCompraDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Parámetros inválidos, saldo insuficiente, suministro agotado, precio excede límite o jugador inactivo.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Futbolista u oferta de venta no encontrada.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto de concurrencia o la oferta seleccionada ya no está disponible.',
  })
  public async comprarTokens(
    @Body() dto: CrearOrdenCompraDto,
    @Req() req: any,
  ): Promise<ResultadoCompraDto> {
    const compradorId = req.user?.id || req.user?.sub;
    return this.omsService.comprarTokens(compradorId, dto);
  }
}

