import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OmsService } from '../services/oms.service';
import {
  FiltroTransaccionesAdminDto,
  TransaccionAuditoriaDto,
} from './dto/transaccion-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Auditoría')
@Controller('admin')
export class AdminTransactionsController {
  constructor(private readonly omsService: OmsService) {}

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Auditoría global consolidada de transacciones (Solo ADMIN)',
    description:
      'Retorna todas las transacciones históricas registradas en el marketplace para supervisión y auditoría, con filtros avanzados por jugador, usuario, tipo de mercado y rangos de fechas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte global de transacciones obtenido exitosamente.',
    type: [TransaccionAuditoriaDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. Requiere rol ADMIN.',
  })
  public async obtenerAuditoriaGlobal(
    @Query() filtros: FiltroTransaccionesAdminDto,
  ): Promise<TransaccionAuditoriaDto[]> {
    return this.omsService.obtenerAuditoriaGlobalTransacciones(filtros);
  }
}
