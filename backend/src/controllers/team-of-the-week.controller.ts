import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EquipoSemanalService } from '../services/equipo-semanal.service';
import {
  EquipoSemanalRespuestaDto,
  MiembroEquipoSemanalDto,
} from './dto/equipo-semanal-respuesta.dto';
import { SemanaDisponibleDto } from './dto/semana-disponible.dto';
import { ResumenGeneracionEquipoDto } from './dto/resumen-generacion-equipo.dto';
import { EquipoSemanal } from '../domain/equipo-semanal.entity';

@ApiTags('Equipo de la Semana')
@Controller('team-of-the-week')
export class TeamOfTheWeekController {
  constructor(private readonly equipoSemanalService: EquipoSemanalService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar el Equipo de la Semana vigente',
    description:
      'Retorna la alineación ideal de la semana actual más recientemente generada sobre la formación 4-3-3.',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipo de la semana vigente obtenido exitosamente.',
    type: EquipoSemanalRespuestaDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token JWT expirado/inválido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Aún no existe ningún equipo de la semana generado en la plataforma.',
  })
  public async obtenerEquipoVigente(): Promise<EquipoSemanalRespuestaDto> {
    const equipo = await this.equipoSemanalService.obtenerVigente();
    if (!equipo) {
      throw new NotFoundException(
        'No se ha generado ningún Equipo de la Semana todavía.',
      );
    }
    return this.mapearADto(equipo);
  }

  @Get('weeks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar semanas históricas disponibles',
    description:
      'Retorna el catálogo ordenado descendentemente de todas las semanas que cuentan con un Equipo de la Semana generado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de semanas obtenido exitosamente.',
    type: [SemanaDisponibleDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token JWT expirado/inválido.',
  })
  public async listarSemanasDisponibles(): Promise<SemanaDisponibleDto[]> {
    const semanas = await this.equipoSemanalService.listarSemanasDisponibles();
    return semanas.map((s) => ({
      ano: s.ano,
      semanaIso: s.semanaIso,
      fechaGeneracion: s.fechaGeneracion.toISOString(),
    }));
  }

  @Get('weeks/:year/:week')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar Equipo de la Semana histórico específico',
    description:
      'Retorna el snapshot inmutable del equipo ideal generado para el año y semana ISO especificados.',
  })
  @ApiParam({
    name: 'year',
    type: Number,
    description: 'Año ISO de la semana (ej. 2026)',
    example: 2026,
  })
  @ApiParam({
    name: 'week',
    type: Number,
    description: 'Número de semana ISO-8601 (1 a 53)',
    example: 44,
  })
  @ApiResponse({
    status: 200,
    description: 'Equipo de la semana histórico obtenido exitosamente.',
    type: EquipoSemanalRespuestaDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de año o semana inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token JWT expirado/inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe registro para el año y semana solicitados.',
  })
  public async obtenerEquipoPorSemana(
    @Param('year', ParseIntPipe) ano: number,
    @Param('week', ParseIntPipe) semanaIso: number,
  ): Promise<EquipoSemanalRespuestaDto> {
    const equipo = await this.equipoSemanalService.obtenerPorSemana(
      ano,
      semanaIso,
    );
    if (!equipo) {
      throw new NotFoundException(
        `No existe registro para el año ${ano} y semana ${semanaIso}.`,
      );
    }
    return this.mapearADto(equipo);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Disparar manualmente la generación del Equipo de la Semana (Solo ADMIN)',
    description:
      'Fuerza el recálculo y publicación inmediata del once ideal para la semana en curso. Si ya existía un equipo para dicha semana, lo recalcula y sobrescribe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipo de la semana generado/sobrescrito exitosamente.',
    type: ResumenGeneracionEquipoDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Regla de negocio incumplida (cupo insuficiente en alguna posición del 4-3-3).',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token JWT expirado/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: se requiere rol de administrador.',
  })
  public async generarManualmente(): Promise<ResumenGeneracionEquipoDto> {
    const resultado =
      await this.equipoSemanalService.generarEquipoSemanaActual();
    return {
      mensaje: 'Equipo de la Semana generado exitosamente.',
      equipo: this.mapearADto(resultado),
    };
  }

  private mapearADto(equipo: EquipoSemanal): EquipoSemanalRespuestaDto {
    const miembrosDto: MiembroEquipoSemanalDto[] = equipo.miembros.map((m) => ({
      jugadorId: m.jugadorId,
      nombre: m.nombre,
      equipoNombre: m.equipoNombre,
      posicion: m.posicion as
        | 'Portero'
        | 'Defensa'
        | 'Mediocampista'
        | 'Delantero',
      cotizacion: m.cotizacion,
      score: m.score,
      orden: m.orden,
    }));

    return {
      id: equipo.id,
      ano: equipo.ano,
      semanaIso: equipo.semanaIso,
      formacion: equipo.formacion,
      estrategiaId: equipo.estrategiaId,
      estrategiaVersion: equipo.estrategiaVersion,
      fechaGeneracion: equipo.fechaGeneracion.toISOString(),
      miembros: miembrosDto,
    };
  }
}

