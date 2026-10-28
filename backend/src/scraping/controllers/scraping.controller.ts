import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScrapingService, EstadisticasJugadorResponse } from '../services/scraping.service';
import { IEjecucionScrapingRepository, I_EJECUCION_SCRAPING_REPOSITORY } from '../domain/ejecucion-scraping.repository.interface';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(I_EJECUCION_SCRAPING_REPOSITORY)
    private readonly ejecucionRepo: IEjecucionScrapingRepository,
  ) {}

  @Get('jugadores/:id/estadisticas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar estadísticas actualizadas de un jugador',
    description:
      'Retorna las estadísticas del jugador para la temporada activa diferenciando por rol (jugador de campo vs portero).',
  })
  @ApiParam({ name: 'id', description: 'ID del jugador (UUID)' })
  @ApiQuery({
    name: 'temporada',
    required: false,
    description: 'Temporada (ej: 2025/2026)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del jugador obtenidas correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Jugador o estadísticas no encontradas.',
  })
  async obtenerEstadisticasJugador(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('temporada') temporada?: string,
  ): Promise<EstadisticasJugadorResponse> {
    return this.scrapingService.obtenerEstadisticasJugador(id, temporada);
  }

  @Post('ejecutar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ejecutar scraping manualmente',
    description:
      'Dispara el pipeline de scraping de WhoScored para las 5 grandes ligas de manera asíncrona.',
  })
  @ApiResponse({
    status: 202,
    description: 'Ejecución iniciada correctamente.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una ejecución en progreso.',
  })
  async ejecutarScraping(): Promise<{
    ejecucionId: string;
    mensaje: string;
    inicio: Date;
  }> {
    // Iniciar ejecución en segundo plano y responder inmediatamente con 202
    const inicio = new Date();
    // Lanzamos la promesa de fondo sin bloquear el retorno HTTP
    const ejecucionPromise = this.scrapingService.ejecutarPipeline('manual');

    // Para obtener el ejecucionId inmediato, comprobamos si ya se creó en la primera llamada de ejecucionRepo
    const enProgreso = await this.ejecucionRepo.buscarEnProgreso();
    const ejecucionId = enProgreso ? enProgreso.id : (await ejecucionPromise).id;

    return {
      ejecucionId,
      mensaje: 'Proceso de scraping iniciado correctamente.',
      inicio,
    };
  }

  @Get('ejecuciones')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar historial de ejecuciones de scraping',
    description:
      'Retorna el historial paginado de ejecuciones ordenadas cronológicamente en orden descendente.',
  })
  @ApiQuery({ name: 'limite', required: false, example: 10 })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Historial de ejecuciones obtenido correctamente.',
  })
  async listarEjecuciones(
    @Query('limite') limite?: number,
    @Query('pagina') pagina?: number,
  ) {
    const lim = Number(limite) || 10;
    const pag = Number(pagina) || 1;
    const resultado = await this.ejecucionRepo.listarPaginado(pag, lim);
    return {
      datos: resultado.datos.map((e) => ({
        id: e.id,
        inicio: e.inicio,
        fin: e.fin,
        estado: e.estado,
        jugadoresProcesados: e.jugadoresProcesados,
        errores: e.errores,
      })),
      total: resultado.total,
      pagina: pag,
      limite: lim,
    };
  }

  @Get('ejecuciones/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalle de una ejecución de scraping',
    description:
      'Retorna el detalle completo de una corrida incluyendo lista de errores individuales.',
  })
  @ApiParam({ name: 'id', description: 'ID de la ejecución (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Detalle de ejecución obtenido correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Ejecución no encontrada.',
  })
  async obtenerEjecucion(@Param('id', ParseUUIDPipe) id: string) {
    const ejecucion = await this.ejecucionRepo.buscarPorId(id);
    if (!ejecucion) {
      throw new NotFoundException('Ejecución no encontrada.');
    }
    return {
      id: ejecucion.id,
      inicio: ejecucion.inicio,
      fin: ejecucion.fin,
      estado: ejecucion.estado,
      jugadoresProcesados: ejecucion.jugadoresProcesados,
      errores: ejecucion.errores,
      detalle: ejecucion.detalle,
    };
  }
}
