import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OmsService } from '../services/oms.service';
import { PortfolioUsuarioDto } from './dto/portfolio-usuario.dto';
import {
  FiltroTransaccionesUsuarioDto,
  TransaccionUsuarioDto,
} from './dto/transaccion-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Mercado')
@Controller('users')
export class UsersController {
  constructor(private readonly omsService: OmsService) {}

  @Get(':id/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Portfolio valorizado del usuario',
    description:
      'Retorna el estado consolidado del portafolio del usuario (accesible por el propio titular o por un ADMIN), incluyendo saldo en billetera, tenencias disponibles y en custodia, precio promedio de adquisición, cotización vigente y patrimonio neto total.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del usuario titular del portafolio',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Portafolio obtenido exitosamente.',
    type: PortfolioUsuarioDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. No eres el titular ni posees rol ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  public async obtenerPortfolio(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<PortfolioUsuarioDto> {
    const solicitanteId = req.user?.id || req.user?.sub;
    return this.omsService.obtenerPortfolioUsuario(solicitanteId, id);
  }

  @Get(':id/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de transacciones de un usuario',
    description:
      'Retorna la lista cronológica de transacciones de compra o venta en las que participó el usuario (accesible por el propio titular o por un ADMIN), indicando contraparte y la estrategiaCotizacion vigente.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del usuario cuyo historial se consulta',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de transacciones obtenido exitosamente.',
    type: [TransaccionUsuarioDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. No eres el titular ni posees rol ADMIN.',
  })
  public async obtenerHistorialTransacciones(
    @Param('id') id: string,
    @Query() filtros: FiltroTransaccionesUsuarioDto,
    @Req() req: any,
  ): Promise<TransaccionUsuarioDto[]> {
    const solicitanteId = req.user?.id || req.user?.sub;
    return this.omsService.obtenerHistorialTransaccionesUsuario(solicitanteId, id, filtros);
  }
}
