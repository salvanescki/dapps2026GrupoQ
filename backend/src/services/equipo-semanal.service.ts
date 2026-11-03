import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IJugadorRepository,
  I_JUGADOR_REPOSITORY,
} from '../domain/jugador.repository.interface';
import {
  ICotizacionRepository,
  COTIZACION_REPOSITORY,
} from '../domain/cotizacion.repository.interface';
import {
  IConfiguracionMercadoRepository,
  CONFIGURACION_MERCADO_REPOSITORY,
} from '../domain/configuracion-mercado.repository.interface';
import {
  IEquipoSemanalRepository,
  EQUIPO_SEMANAL_REPOSITORY,
  SemanaDisponibleResumen,
} from '../domain/equipo-semanal.repository.interface';
import {
  IEstadisticaJugadorRepository,
  I_ESTADISTICA_JUGADOR_REPOSITORY,
} from '../scraping/domain/estadistica-jugador.repository.interface';
import { MarketplaceCacheService } from './marketplace-cache.service';
import {
  EquipoSemanal,
  obtenerAnoYSemanaIso,
} from '../domain/equipo-semanal.entity';
import { ReglaDeNegocioException } from '../domain/exceptions/regla-de-negocio.exception';
import { MiembroEquipoSemanal } from '../domain/miembro-equipo-semanal.entity';

export { obtenerAnoYSemanaIso as calcularAnoYSemanaIso } from '../domain/equipo-semanal.entity';

export interface ResultadoGeneracionAutomatica {
  generado: boolean;
  equipo?: EquipoSemanal;
  motivo?: string;
}

@Injectable()
export class EquipoSemanalService {
  private readonly logger = new Logger(EquipoSemanalService.name);

  constructor(
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepo: IJugadorRepository,
    @Inject(COTIZACION_REPOSITORY)
    private readonly cotizacionRepo: ICotizacionRepository,
    @Inject(CONFIGURACION_MERCADO_REPOSITORY)
    private readonly configRepo: IConfiguracionMercadoRepository,
    @Inject(EQUIPO_SEMANAL_REPOSITORY)
    private readonly equipoSemanalRepo: IEquipoSemanalRepository,
    @Inject(I_ESTADISTICA_JUGADOR_REPOSITORY)
    private readonly estadisticaRepo: IEstadisticaJugadorRepository,
    private readonly cacheService: MarketplaceCacheService,
  ) {}

  public async generarEquipoSemanaActual(
    ahora: Date = new Date(),
  ): Promise<EquipoSemanal> {
    const { ano, semanaIso } = obtenerAnoYSemanaIso(ahora);
    const existente = await this.equipoSemanalRepo.obtenerPorSemana(
      ano,
      semanaIso,
    );
    existente?.validarRegenerable(ahora);
    return this.calcularYPersistir(ahora, ano, semanaIso);
  }

  public async existeEquipoSemanaActual(
    ahora: Date = new Date(),
  ): Promise<boolean> {
    const { ano, semanaIso } = obtenerAnoYSemanaIso(ahora);
    const existente = await this.equipoSemanalRepo.obtenerPorSemana(
      ano,
      semanaIso,
    );
    return existente !== null && existente !== undefined;
  }

  public async generarAutomatico(
    ahora: Date = new Date(),
  ): Promise<ResultadoGeneracionAutomatica> {
    const { ano, semanaIso } = obtenerAnoYSemanaIso(ahora);

    if (await this.existeEquipoSemanaActual(ahora)) {
      const motivo = `Ya existe un Equipo de la Semana para ${ano}-W${semanaIso}. Se omite la generación automática.`;
      this.logger.log(motivo);
      return { generado: false, motivo };
    }

    try {
      const equipo = await this.calcularYPersistir(ahora, ano, semanaIso);
      return { generado: true, equipo };
    } catch (error) {
      if (error instanceof ReglaDeNegocioException) {
        this.logger.warn(
          `No se generó el Equipo de la Semana ${ano}-W${semanaIso}: ${error.message}`,
        );
        return { generado: false, motivo: error.message };
      }
      throw error;
    }
  }

  private async calcularYPersistir(
    ahora: Date,
    ano: number,
    semanaIso: number,
  ): Promise<EquipoSemanal> {
    this.logger.log(
      `Iniciando cálculo del Equipo de la Semana ${ano}-W${semanaIso}...`,
    );

    const config = await this.configRepo.obtenerConfiguracion();
    const jugadoresActivos = await this.jugadorRepo.listarActivos();
    const jugadorIds = jugadoresActivos.map((j) => j.id);
    const cotizacionesPorJugador =
      await this.cotizacionRepo.obtenerUltimasPorJugadores(jugadorIds);
    const minutosPorJugador = await this.obtenerMinutosPorJugador(jugadorIds);

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano,
      semanaIso,
      estrategiaId: config.estrategiaActivaId,
      estrategiaVersion: config.estrategiaActivaVersion,
      jugadoresActivos,
      cotizacionesPorJugador,
      minutosPorJugador,
      fechaGeneracion: ahora,
    });

    await this.equipoSemanalRepo.guardarOSobrescribir(equipo);
    await this.cacheService.invalidarEquipoSemanal();

    this.logger.log(
      `Equipo de la Semana (${ano}-W${semanaIso}) generado y persistido con 11 miembros.`,
    );

    return equipo;
  }

  private async obtenerMinutosPorJugador(
    jugadorIds: string[],
  ): Promise<Map<string, number>> {
    const minutos = new Map<string, number>();
    if (!this.estadisticaRepo.buscarPorJugadores) return minutos;

    const estadisticas =
      await this.estadisticaRepo.buscarPorJugadores(jugadorIds);

    const porJugador = new Map<string, typeof estadisticas>();
    for (const est of estadisticas) {
      const lista = porJugador.get(est.jugadorId) ?? [];
      lista.push(est);
      porJugador.set(est.jugadorId, lista);
    }

    for (const [jugadorId, lista] of porJugador) {
      const temporadaReciente = lista
        .map((e) => e.temporada ?? '')
        .reduce((a, b) => (b > a ? b : a), '');
      const total = lista
        .filter((e) => (e.temporada ?? '') === temporadaReciente)
        .reduce((acc, e) => acc + (e.minutosJugados ?? 0), 0);
      minutos.set(jugadorId, total);
    }

    return minutos;
  }

  public async obtenerVigente(): Promise<EquipoSemanal | null> {
    const cacheKey = 'vigente';
    const cached =
      await this.cacheService.obtenerEquipoSemanal<any>(cacheKey);
    if (cached) {
      return this.reconstruirDesdeCache(cached);
    }

    const equipo = await this.equipoSemanalRepo.obtenerVigente();
    if (equipo) {
      await this.cacheService.guardarEquipoSemanal(
        cacheKey,
        this.serializarParaCache(equipo),
        1800,
      );
    }
    return equipo;
  }

  public async obtenerPorSemana(
    ano: number,
    semanaIso: number,
  ): Promise<EquipoSemanal | null> {
    const cacheKey = `${ano}:${semanaIso}`;
    const cached =
      await this.cacheService.obtenerEquipoSemanal<any>(cacheKey);
    if (cached) {
      return this.reconstruirDesdeCache(cached);
    }

    const equipo = await this.equipoSemanalRepo.obtenerPorSemana(ano, semanaIso);
    if (equipo) {
      await this.cacheService.guardarEquipoSemanal(
        cacheKey,
        this.serializarParaCache(equipo),
        86400,
      );
    }
    return equipo;
  }

  public async listarSemanasDisponibles(): Promise<SemanaDisponibleResumen[]> {
    const cacheKey = 'semanas';
    const cached =
      await this.cacheService.obtenerEquipoSemanal<any[]>(cacheKey);
    if (cached) {
      return cached.map((s) => ({
        ano: s.ano,
        semanaIso: s.semanaIso,
        fechaGeneracion: new Date(s.fechaGeneracion),
      }));
    }

    const semanas = await this.equipoSemanalRepo.listarSemanasDisponibles();
    if (semanas) {
      await this.cacheService.guardarEquipoSemanal(cacheKey, semanas, 1800);
    }
    return semanas;
  }

  private serializarParaCache(equipo: EquipoSemanal): any {
    return {
      id: equipo.id,
      ano: equipo.ano,
      semanaIso: equipo.semanaIso,
      formacion: equipo.formacion,
      estrategiaId: equipo.estrategiaId,
      estrategiaVersion: equipo.estrategiaVersion,
      fechaGeneracion: equipo.fechaGeneracion.toISOString(),
      miembros: equipo.miembros.map((m) => ({
        id: m.id,
        equipoSemanalId: m.equipoSemanalId,
        jugadorId: m.jugadorId,
        nombre: m.nombre,
        equipoNombre: m.equipoNombre,
        posicion: m.posicion,
        cotizacion: m.cotizacion,
        score: m.score,
        orden: m.orden,
      })),
    };
  }

  private reconstruirDesdeCache(data: any): EquipoSemanal {
    const miembros = (data.miembros || []).map((m: any) =>
      MiembroEquipoSemanal.crear({
        id: m.id,
        equipoSemanalId: m.equipoSemanalId,
        jugadorId: m.jugadorId,
        nombre: m.nombre,
        equipoNombre: m.equipoNombre,
        posicion: m.posicion,
        cotizacion: Number(m.cotizacion),
        score: Number(m.score),
        orden: Number(m.orden),
      }),
    );

    return EquipoSemanal.recrear({
      id: data.id,
      ano: Number(data.ano),
      semanaIso: Number(data.semanaIso),
      formacion: data.formacion,
      estrategiaId: data.estrategiaId,
      estrategiaVersion: data.estrategiaVersion,
      fechaGeneracion: new Date(data.fechaGeneracion),
      miembros,
    });
  }
}

