import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JugadorService } from '../services/jugador.service';
import {
  FiltroJugadoresDto,
  RespuestaCatalogoJugadoresDto,
  JugadorItemDto,
  OpcionesFiltroRespuestaDto,
} from './dto/filtro-jugadores.dto';

@ApiTags('Jugadores')
@Controller('players')
export class PlayersController {
  constructor(private readonly jugadorService: JugadorService) {}

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
