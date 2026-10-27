import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsUUID,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  CODIGOS_LIGA_VALIDOS,
  CodigoLigaValido,
} from '../../domain/liga.entity';

export const POSICIONES_FILTRO = [
  'Portero',
  'Defensa',
  'Mediocampista',
  'Delantero',
] as const;

export type PosicionFiltro = (typeof POSICIONES_FILTRO)[number];

export class FiltroJugadoresDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Código de liga',
    enum: CODIGOS_LIGA_VALIDOS,
  })
  @IsOptional()
  @IsIn(CODIGOS_LIGA_VALIDOS)
  league?: CodigoLigaValido;

  @ApiPropertyOptional({
    description: 'UUID del equipo',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El teamId debe ser un UUID válido.' })
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Posición táctica normalizada',
    enum: POSICIONES_FILTRO,
  })
  @IsOptional()
  @IsIn(POSICIONES_FILTRO)
  position?: PosicionFiltro;

  @ApiPropertyOptional({
    description: 'Término de búsqueda por nombre',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class EquipoResumenDto {
  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id: string;

  @ApiProperty({ example: 'Arsenal FC' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Arsenal' })
  nombreCorto?: string;

  @ApiPropertyOptional({ example: 'ARS' })
  tla?: string;

  @ApiPropertyOptional({ example: 'https://crests.football-data.org/57.png' })
  escudoUrl?: string;
}

export class LigaResumenDto {
  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id: string;

  @ApiProperty({ example: 'PL' })
  codigo: string;

  @ApiProperty({ example: 'Premier League' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Inglaterra' })
  pais?: string;

  @ApiPropertyOptional({ example: 'https://crests.football-data.org/PL.png' })
  emblemaUrl?: string;
}

export class EstadisticasJugadorDto {
  @ApiProperty({ example: '2024/2025', description: 'Temporada deportiva' })
  temporada: string;

  @ApiProperty({ example: 'Premier League', description: 'Nombre de la liga' })
  liga: string;

  @ApiProperty({ example: 35, description: 'Partidos disputados en la temporada' })
  partidosJugados: number;

  @ApiProperty({ example: 2980, description: 'Minutos jugados en la temporada' })
  minutosJugados: number;

  @ApiProperty({ example: 14, description: 'Goles anotados' })
  goles: number;

  @ApiProperty({ example: 10, description: 'Asistencias aportadas' })
  asistencias: number;

  @ApiProperty({ example: 3, description: 'Tarjetas amarillas recibidas' })
  tarjetasAmarillas: number;

  @ApiProperty({ example: 0, description: 'Tarjetas rojas recibidas' })
  tarjetasRojas: number;

  @ApiPropertyOptional({ example: 7.45, minimum: 0, maximum: 10, description: 'Rating promedio WhoScored' })
  rating?: number;

  @ApiPropertyOptional({ example: 2.3, description: 'Tiros promedio por partido' })
  tirosPorPartido?: number;

  @ApiPropertyOptional({ example: 82.1, minimum: 0, maximum: 100, description: 'Porcentaje de precisión de pase' })
  precisionPase?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Duelos aéreos ganados por partido' })
  duelosAereosGanadosPorPartido?: number;

  @ApiPropertyOptional({ example: 1.8, description: 'Regates completados por partido' })
  regatesCompletadosPorPartido?: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Pases clave por partido' })
  pasesClavePorPartido?: number;

  @ApiPropertyOptional({ example: 0.41, description: 'Expected Goals (xG) por partido' })
  xgPorPartido?: number;

  @ApiPropertyOptional({ example: 0.29, description: 'Expected Assists (xA) por partido' })
  xaPorPartido?: number;

  @ApiPropertyOptional({ example: 0.5, description: 'Grandes ocasiones generadas por partido' })
  grandesOcasionesPorPartido?: number;

  @ApiPropertyOptional({ example: 1.1, description: 'Entradas por partido' })
  entradasPorPartido?: number;

  @ApiPropertyOptional({ example: 0.8, description: 'Intercepciones por partido' })
  intercepccionesPorPartido?: number;

  @ApiPropertyOptional({ example: 0.6, description: 'Despejes por partido' })
  despejesPorPartido?: number;

  @ApiPropertyOptional({ example: 35.2, description: 'Pases promedio por partido' })
  pasesPorPartido?: number;

  @ApiPropertyOptional({ example: 1.4, description: 'Centros por partido' })
  centrosPorPartido?: number;

  @ApiPropertyOptional({ example: 45, description: 'Atajadas realizadas (portero)' })
  atajadas?: number;

  @ApiPropertyOptional({ example: 22, description: 'Goles recibidos (portero)' })
  golesRecibidos?: number;

  @ApiPropertyOptional({ example: 74.5, minimum: 0, maximum: 100, description: 'Porcentaje de atajadas (portero)' })
  porcentajeAtajadas?: number;

  @ApiPropertyOptional({ example: 1, description: 'Errores que generaron gol (portero)' })
  erroresQueGeneraronGol?: number;

  @ApiPropertyOptional({ example: 0, description: 'Autogoles cometidos' })
  autogoles?: number;
}

export class JugadorItemDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiPropertyOptional({ example: 3189 })
  externalId?: number;

  @ApiProperty({ example: 'Bukayo Saka' })
  nombre: string;

  @ApiProperty({ example: 'Delantero' })
  posicion: string;

  @ApiPropertyOptional({ example: 'Right Winger' })
  posicionOriginal?: string;

  @ApiPropertyOptional({ example: '2001-09-05' })
  fechaNacimiento?: string;

  @ApiProperty({ example: 'England' })
  nacionalidad: string;

  @ApiPropertyOptional({ example: 7 })
  dorsal?: number;

  @ApiProperty({ type: () => EquipoResumenDto })
  equipo: EquipoResumenDto;

  @ApiProperty({ type: () => LigaResumenDto })
  liga: LigaResumenDto;

  @ApiPropertyOptional({ type: () => EstadisticasJugadorDto, nullable: true })
  estadisticas?: EstadisticasJugadorDto | null;
}

export class RespuestaCatalogoJugadoresDto {
  @ApiProperty({ type: () => [JugadorItemDto] })
  items: JugadorItemDto[];

  @ApiProperty({ example: 2450 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 123 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasMore: boolean;
}

export class EquipoFiltroOpcionDto {
  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id: string;

  @ApiProperty({ example: 'Arsenal FC' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Arsenal' })
  nombreCorto?: string;

  @ApiPropertyOptional({ example: 'https://crests.football-data.org/57.png' })
  escudoUrl?: string;

  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  ligaId: string;

  @ApiPropertyOptional({ example: 'PL' })
  ligaCodigo?: string;
}

export class OpcionesFiltroRespuestaDto {
  @ApiProperty({ type: () => [LigaResumenDto] })
  ligas: LigaResumenDto[];

  @ApiProperty({ type: () => [EquipoFiltroOpcionDto] })
  equipos: EquipoFiltroOpcionDto[];

  @ApiProperty({ example: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'] })
  posiciones: string[];
}
