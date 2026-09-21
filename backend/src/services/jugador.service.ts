import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  IJugadorRepository,
  IEquipoRepository,
  ILigaRepository,
  I_JUGADOR_REPOSITORY,
  I_EQUIPO_REPOSITORY,
  I_LIGA_REPOSITORY,
} from '../domain/jugador.repository.interface';
import { SincronizacionJugadoresService } from './sincronizacion-jugadores.service';
import {
  CriterioFiltroJugador,
  Jugador,
} from '../domain/jugador.entity';
import {
  FiltroJugadoresDto,
  RespuestaCatalogoJugadoresDto,
  JugadorItemDto,
  OpcionesFiltroRespuestaDto,
  POSICIONES_FILTRO,
} from '../controllers/dto/filtro-jugadores.dto';

@Injectable()
export class JugadorService {
  constructor(
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepository: IJugadorRepository,
    @Inject(I_EQUIPO_REPOSITORY)
    private readonly equipoRepository: IEquipoRepository,
    @Inject(I_LIGA_REPOSITORY)
    private readonly ligaRepository: ILigaRepository,
    private readonly sincronizacionService: SincronizacionJugadoresService,
  ) {}

  async obtenerCatalogo(
    filtro: FiltroJugadoresDto,
  ): Promise<RespuestaCatalogoJugadoresDto> {
    // Sincronización diferida idempotente si la BD está vacía
    await this.sincronizacionService.sincronizarSiEsNecesario();

    // Si se especifica liga y equipo, verificar consistencia relacional
    if (filtro.league && filtro.teamId) {
      const equipo = await this.equipoRepository.buscarPorId(filtro.teamId);
      if (equipo) {
        const liga = await this.ligaRepository.buscarPorCodigo(filtro.league);
        if (liga && !equipo.perteneceALiga(liga.id)) {
          throw new BadRequestException(
            'El equipo seleccionado no pertenece a la liga especificada.',
          );
        }
      }
    }

    const criterio = new CriterioFiltroJugador({
      ligaCodigo: filtro.league,
      equipoId: filtro.teamId,
      posicion: filtro.position,
      busqueda: filtro.search,
      pagina: filtro.page,
      limite: filtro.limit,
    });

    const { items, total } = await this.jugadorRepository.buscarConFiltros(
      criterio,
    );

    const mappedItems: JugadorItemDto[] = items.map((j) => this.mapearAJugadorItemDto(j));

    const totalPages = Math.ceil(total / criterio.limite);
    const hasMore = criterio.pagina * criterio.limite < total;

    return {
      items: mappedItems,
      total,
      page: criterio.pagina,
      limit: criterio.limite,
      totalPages,
      hasMore,
    };
  }

  async buscarPorId(id: string): Promise<JugadorItemDto> {
    const jugador = await this.jugadorRepository.buscarPorId(id);
    if (!jugador) {
      throw new NotFoundException('Jugador no encontrado.');
    }
    return this.mapearAJugadorItemDto(jugador);
  }

  async obtenerOpcionesFiltro(): Promise<OpcionesFiltroRespuestaDto> {
    await this.sincronizacionService.sincronizarSiEsNecesario();

    const ligas = await this.ligaRepository.listarTodas();
    const equipos = await this.equipoRepository.listarTodos();

    // Crear mapa ligaId -> codigoLiga
    const ligaMapa = new Map<string, string>();
    ligas.forEach((l) => ligaMapa.set(l.id, l.codigo));

    return {
      ligas: ligas.map((l) => ({
        id: l.id,
        codigo: l.codigo,
        nombre: l.nombre,
        pais: l.pais,
        emblemaUrl: l.emblemaUrl,
      })),
      equipos: equipos.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        nombreCorto: e.nombreCorto || undefined,
        escudoUrl: e.escudoUrl,
        ligaId: e.ligaId,
        ligaCodigo: ligaMapa.get(e.ligaId),
      })),
      posiciones: [...POSICIONES_FILTRO],
    };
  }

  async sincronizarManual(): Promise<{
    mensaje: string;
    totalLigas: number;
    totalEquipos: number;
    totalJugadores: number;
  }> {
    return this.sincronizacionService.sincronizarLigasYPlanteles();
  }

  private mapearAJugadorItemDto(j: Jugador): JugadorItemDto {
    return {
      id: j.id,
      externalId: j.externalId,
      nombre: j.nombre,
      posicion: j.posicion,
      posicionOriginal: j.posicionOriginal || undefined,
      fechaNacimiento: j.fechaNacimiento || undefined,
      nacionalidad: j.nacionalidad,
      dorsal: j.dorsal !== null ? j.dorsal : undefined,
      equipo: {
        id: j.equipo?.id || j.equipoId,
        nombre: j.equipo?.nombre || 'Equipo no disponible',
        nombreCorto: j.equipo?.nombreCorto || undefined,
        tla: j.equipo?.tla || undefined,
        escudoUrl: j.equipo?.escudoUrl || undefined,
      },
      liga: {
        id: j.liga?.id || j.ligaId,
        codigo: j.liga?.codigo || '',
        nombre: j.liga?.nombre || 'Liga no disponible',
        pais: j.liga?.pais || undefined,
        emblemaUrl: j.liga?.emblemaUrl || undefined,
      },
    };
  }
}
