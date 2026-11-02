import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JugadorService } from '../services/jugador.service';
import {
  FiltroJugadoresDto,
  RespuestaCatalogoJugadoresDto,
  JugadorItemDto,
  OpcionesFiltroRespuestaDto,
} from './dto/filtro-jugadores.dto';
import { QuotesService } from '../services/quotes.service';
import {
  RankingQueryDto,
  JugadorRankingDto,
} from './dto/ranking-jugadores.dto';
import { CotizacionRespuestaDto } from './dto/cotizacion.dto';

@ApiTags('Jugadores')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly jugadorService: JugadorService,
    @Optional() private readonly quotesService?: QuotesService,
  ) {}

  @Get('ranking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ranking y cartelera de cotizaciones del marketplace',
    description:
      'Retorna la clasificación de futbolistas activos ordenados descendentemente por su cotización oficial actual y score, incluyendo variación frente a la cotización previa y suministro disponible para compra.',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    type: Number,
    description: 'Cantidad de jugadores a incluir en el ranking (top N)',
    example: 20,
  })
  @ApiQuery({
    name: 'posicion',
    required: false,
    enum: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
    description: 'Filtro opcional por posición táctica',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranking obtenido exitosamente.',
    type: [JugadorRankingDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos.',
  })
  async obtenerRanking(
    @Query() query: RankingQueryDto,
  ): Promise<JugadorRankingDto[]> {
    if (!this.quotesService) return [];
    return this.quotesService.obtenerRanking(query.limite, query.posicion);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener catálogo paginado de jugadores con filtros',
    description:
      'Retorna una lista paginada de jugadores filtrada opcionalmente por liga, equipo, posición táctica y término de búsqueda textual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Catálogo de jugadores obtenido exitosamente.',
    type: RespuestaCatalogoJugadoresDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta no válidos.',
  })
  async obtenerCatalogo(
    @Query() filtro: FiltroJugadoresDto,
  ): Promise<RespuestaCatalogoJugadoresDto> {
    return this.jugadorService.obtenerCatalogo(filtro);
  }

  @Get('filters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener opciones disponibles para los filtros del catálogo',
    description:
      'Retorna las listas de ligas registradas, equipos asociados con su liga correspondiente, y posiciones tácticas para poblar dinámicamente el menú de filtros en el frontend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Opciones de filtros obtenidas exitosamente.',
    type: OpcionesFiltroRespuestaDto,
  })
  async obtenerOpcionesFiltro(): Promise<OpcionesFiltroRespuestaDto> {
    return this.jugadorService.obtenerOpcionesFiltro();
  }

  @Get(':id/quotes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Historial de cotizaciones de un jugador',
    description:
      'Retorna la lista cronológica descendente de cotizaciones inmutables calculadas para un jugador, incluyendo la versión de estrategia y el snapshot de métricas normalizadas.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Identificador único (UUID) del futbolista',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    type: Number,
    description: 'Cantidad máxima de cotizaciones a retornar',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de cotizaciones obtenido exitosamente.',
    type: [CotizacionRespuestaDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Formato de identificador UUID o parámetro inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Jugador no encontrado.',
  })
  async obtenerHistorialCotizaciones(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
    @Query('limite') limite?: number,
  ): Promise<CotizacionRespuestaDto[]> {
    if (!this.quotesService) return [];
    const limiteNum = limite ? Number(limite) : 50;
    return this.quotesService.obtenerHistorialCotizaciones(id, limiteNum);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalle individual de un jugador por ID',
    description:
      'Retorna la ficha completa de un jugador de fútbol por su identificador único (UUID).',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Identificador único (UUID) del futbolista',
  })
  @ApiResponse({
    status: 200,
    description: 'Ficha del jugador obtenida exitosamente.',
    type: JugadorItemDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador UUID con formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Jugador no encontrado.',
  })
  async buscarPorId(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<JugadorItemDto> {
    return this.jugadorService.buscarPorId(id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Disparar sincronización manual de jugadores desde football-data.org',
    description:
      'Descarga y persiste de forma idempotente las 5 grandes ligas europeas, sus equipos y jugadores en PostgreSQL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sincronización finalizada exitosamente.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error al comunicarse con el proveedor externo o al persistir en base de datos.',
  })
  async sincronizar(): Promise<{
    mensaje: string;
    totalLigas: number;
    totalEquipos: number;
    totalJugadores: number;
  }> {
    return this.jugadorService.sincronizarManual();
  }
}
