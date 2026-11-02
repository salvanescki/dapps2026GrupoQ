import {
  Controller,
  Get,
  Put,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { QuotesService } from '../services/quotes.service';
import {
  CambiarEstrategiaDto,
  ConfiguracionEstrategiaRespuestaDto,
} from './dto/configuracion-estrategia.dto';
import { ResumenRecalculoDto } from './dto/recalculo-cotizaciones.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Cotización')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('strategy')
  @ApiOperation({
    summary: 'Consultar estrategia de cotización activa y versiones aprobadas',
    description:
      'Retorna la estrategia actualmente configurada en el marketplace junto con el catálogo de estrategias y versiones vigentes aprobadas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de estrategia obtenida exitosamente.',
    type: ConfiguracionEstrategiaRespuestaDto,
  })
  public async obtenerConfiguracionEstrategia(): Promise<ConfiguracionEstrategiaRespuestaDto> {
    return this.quotesService.obtenerConfiguracionEstrategia();
  }

  @Put('strategy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Conmutar la estrategia activa del marketplace (Solo ADMIN)',
    description:
      'Actualiza en ConfiguracionMercado la estrategia activa que regirá las siguientes cotizaciones. Exclusivo para usuarios autenticados con rol ADMIN.',
  })
  @ApiBody({ type: CambiarEstrategiaDto })
  @ApiResponse({
    status: 200,
    description: 'Estrategia activa actualizada exitosamente.',
    type: ConfiguracionEstrategiaRespuestaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador de estrategia no válido o no aprobado.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. Requiere rol ADMIN.',
  })
  public async cambiarEstrategia(
    @Body() dto: CambiarEstrategiaDto,
    @Req() req: any,
  ): Promise<ConfiguracionEstrategiaRespuestaDto> {
    const adminId = req.user?.id || req.user?.sub;
    return this.quotesService.cambiarEstrategiaActiva(dto.estrategiaId, adminId);
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Recalcular cotizaciones manualmente bajo demanda (Solo ADMIN)',
    description:
      'Dispara de forma inmediata el recálculo masivo de cotizaciones de todos los jugadores activos aplicando la estrategia activa vigente en ConfiguracionMercado. Requiere rol ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recálculo finalizado exitosamente.',
    type: ResumenRecalculoDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. Requiere rol ADMIN.',
  })
  public async recalcularManualmente(): Promise<ResumenRecalculoDto> {
    return this.quotesService.recalcularCotizacionesManual();
  }
}
