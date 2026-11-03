import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ICotizacionRepository,
  COTIZACION_REPOSITORY,
} from '../domain/cotizacion.repository.interface';
import {
  IJugadorRepository,
  I_JUGADOR_REPOSITORY,
} from '../domain/jugador.repository.interface';
import {
  IEstadisticaJugadorRepository,
  I_ESTADISTICA_JUGADOR_REPOSITORY,
} from '../scraping/domain/estadistica-jugador.repository.interface';
import {
  IConfiguracionMercadoRepository,
  CONFIGURACION_MERCADO_REPOSITORY,
} from '../domain/configuracion-mercado.repository.interface';
import {
  UsuarioRepository,
  USUARIO_REPOSITORY,
} from '../domain/usuario.repository.interface';
import { MarketplaceCacheService } from './marketplace-cache.service';
import { TokensService } from './tokens.service';
import { EstrategiaGlobal } from '../domain/strategies/estrategia-global.strategy';
import { EstrategiaPosicional } from '../domain/strategies/estrategia-posicional.strategy';
import { EstrategiaCotizacion } from '../domain/strategies/estrategia-cotizacion.interface';
import { MetricasJugadorParaCotizacion } from '../domain/strategies/metricas-jugador-cotizacion.value-object';
import { Cotizacion } from '../domain/cotizacion.entity';
import { PosicionJugador } from '../domain/jugador.entity';
import { JugadorRankingDto } from '../controllers/dto/ranking-jugadores.dto';
import { CotizacionRespuestaDto } from '../controllers/dto/cotizacion.dto';
import { ReglaDeNegocioException } from '../domain/exceptions/regla-de-negocio.exception';

import {
  ConfiguracionEstrategiaRespuestaDto,
  EstrategiaDisponibleDto,
} from '../controllers/dto/configuracion-estrategia.dto';
import { ResumenRecalculoDto } from '../controllers/dto/recalculo-cotizaciones.dto';
import { EstrategiaId } from '../domain/configuracion-mercado.entity';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly estrategiasMap: Map<string, EstrategiaCotizacion> = new Map();

  private static readonly DESCRIPCIONES_ESTRATEGIAS: Record<EstrategiaId, string> = {
    GLOBAL: 'Ponderación global estándar uniforme para todas las posiciones.',
    POSICIONAL:
      'Ponderaciones específicas por demarcación táctica (Portero, Defensa, Mediocampista, Delantero).',
  };

  constructor(
    private readonly dataSource: DataSource,
    @Inject(COTIZACION_REPOSITORY)
    private readonly cotizacionRepo: ICotizacionRepository,
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepo: IJugadorRepository,
    @Inject(I_ESTADISTICA_JUGADOR_REPOSITORY)
    private readonly estadisticaRepo: IEstadisticaJugadorRepository,
    @Inject(CONFIGURACION_MERCADO_REPOSITORY)
    private readonly configRepo: IConfiguracionMercadoRepository,
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepo: UsuarioRepository,
    private readonly cacheService: MarketplaceCacheService,
    private readonly tokensService: TokensService,
  ) {
    const global = new EstrategiaGlobal();
    const posicional = new EstrategiaPosicional();
    this.estrategiasMap.set(global.id, global);
    this.estrategiasMap.set(posicional.id, posicional);
  }

  public async obtenerConfiguracionEstrategia(): Promise<ConfiguracionEstrategiaRespuestaDto> {
    const config = await this.configRepo.obtenerConfiguracion();

    const estrategiasDisponibles: EstrategiaDisponibleDto[] = [
      {
        id: 'GLOBAL',
        version: 'GLOBAL_v1',
        descripcion: QuotesService.DESCRIPCIONES_ESTRATEGIAS['GLOBAL'],
      },
      {
        id: 'POSICIONAL',
        version: 'POSICIONAL_v1',
        descripcion: QuotesService.DESCRIPCIONES_ESTRATEGIAS['POSICIONAL'],
      },
    ];

    return {
      estrategiaActivaId: config.estrategiaActivaId,
      estrategiaActivaVersion: config.estrategiaActivaVersion,
      actualizadoEn: config.actualizadoEn.toISOString(),
      estrategiasDisponibles,
    };
  }

  public async cambiarEstrategiaActiva(
    estrategiaId: EstrategiaId,
    adminId: string,
  ): Promise<ConfiguracionEstrategiaRespuestaDto> {
    const estrategia = this.estrategiasMap.get(estrategiaId);
    if (!estrategia) {
      throw new ReglaDeNegocioException(
        `Estrategia no válida o no aprobada: ${estrategiaId}. Debe ser GLOBAL o POSICIONAL.`,
      );
    }

    const config = await this.configRepo.obtenerConfiguracion();
    config.cambiarEstrategia(estrategiaId, estrategia.version, adminId);
    await this.configRepo.guardar(config);

    // Al cambiar la estrategia, se invalida el ranking cacheado
    await this.cacheService.invalidarRanking();

    return this.obtenerConfiguracionEstrategia();
  }

  public async recalcularCotizacionesManual(): Promise<ResumenRecalculoDto> {
    const config = await this.configRepo.obtenerConfiguracion();
    const estrategia = this.estrategiasMap.get(config.estrategiaActivaId);
    const versionEstrategia = estrategia ? estrategia.version : `${config.estrategiaActivaId}_v1`;

    const resultado = await this.recalcularCotizacionesActivas();

    return {
      mensaje: 'Recálculo de cotizaciones finalizado exitosamente.',
      totalJugadoresProcesados: resultado.procesados + resultado.fallidos,
      exitosos: resultado.procesados,
      fallidos: resultado.fallidos,
      sinEstadisticas: resultado.sinEstadisticas ?? 0,
      estrategiaAplicada: config.estrategiaActivaId,
      versionEstrategia,
      duracionMs: resultado.duracionMs,
    };
  }

  public async obtenerHistorialCotizaciones(
    jugadorId: string,
    limite: number = 50,
  ): Promise<CotizacionRespuestaDto[]> {
    const jugador = await this.jugadorRepo.buscarPorId(jugadorId);
    if (!jugador) {
      throw new NotFoundException(`Jugador con id ${jugadorId} no encontrado.`);
    }

    const historial = await this.cotizacionRepo.obtenerHistorial(
      jugadorId,
      limite,
    );

    return historial.map((c) => ({
      id: c.id,
      jugadorId: c.jugadorId,
      score: c.score,
      valor: c.valor,
      estrategiaId: c.estrategiaId,
      estrategiaVersion: c.estrategiaVersion,
      sinEstadisticas: c.sinEstadisticas,
      metricas: (c.metricas as any) ?? null,
      fechaCotizacion: c.fechaCotizacion,
    }));
  }

  public async obtenerRanking(
    limite: number = 20,
    posicion?: PosicionJugador,
  ): Promise<JugadorRankingDto[]> {
    const cacheKey = `${limite}:${posicion || 'TODOS'}`;
    const enCache = await this.cacheService.obtenerRanking<JugadorRankingDto[]>(
      cacheKey,
    );
    if (enCache) {
      return enCache;
    }

    const jugadoresActivos = await this.jugadorRepo.listarActivos();
    if (!jugadoresActivos || jugadoresActivos.length === 0) {
      return [];
    }

    let filtrados = jugadoresActivos;
    if (posicion) {
      filtrados = jugadoresActivos.filter((j) => j.posicion === posicion);
    }

    const jugadorIds = filtrados.map((j) => j.id);
    const ultimasCotizaciones =
      await this.cotizacionRepo.obtenerUltimasPorJugadores(jugadorIds);

    // Obtener tenencias del ADMIN y órdenes de venta secundarias para calcular tokensDisponibles
    const admin = await this.usuarioRepo.buscarAdmin();
    const adminBalancesMap = new Map<string, number>();

    if (admin) {
      const adminBalancesRaw = await this.dataSource.query(
        `SELECT jugador_id, cantidad_disponible FROM balances_tokens WHERE usuario_id = $1`,
        [admin.id],
      );
      for (const row of adminBalancesRaw) {
        adminBalancesMap.set(row.jugador_id, Number(row.cantidad_disponible));
      }
    }

    // Órdenes de venta activas en mercado secundario
    const ordenesSecundariasRaw = await this.dataSource.query(
      `SELECT jugador_id, COALESCE(SUM(cantidad_restante), 0) AS total_secundario
       FROM ordenes
       WHERE tipo = 'VENTA' AND estado IN ('PENDIENTE', 'PARCIAL')
       GROUP BY jugador_id`,
    );
    const secundariasMap = new Map<string, number>();
    for (const row of ordenesSecundariasRaw) {
      secundariasMap.set(row.jugador_id, Number(row.total_secundario));
    }

    // Mapear jugadores con sus cotizaciones
    const rankingItems: {
      jugador: (typeof filtrados)[0];
      cotizacion: Cotizacion;
      variacionPorcentual: number;
      tokensDisponibles: number;
    }[] = [];

    for (const jugador of filtrados) {
      const cotizacion = ultimasCotizaciones.get(jugador.id);
      if (!cotizacion) continue;

      const variacionInfo = await this.cotizacionRepo.obtenerVariacion(
        jugador.id,
      );
      const variacionPorcentual = variacionInfo?.variacionPorcentual ?? 0.0;

      const disponiblePrimario = adminBalancesMap.get(jugador.id) ?? 0;
      const disponibleSecundario = secundariasMap.get(jugador.id) ?? 0;
      const tokensDisponibles = disponiblePrimario + disponibleSecundario;

      rankingItems.push({
        jugador,
        cotizacion,
        variacionPorcentual,
        tokensDisponibles,
      });
    }

    // Ordenar descendentemente por cotizacion.valor DESC, luego cotizacion.score DESC, luego nombre ASC
    rankingItems.sort((a, b) => {
      if (b.cotizacion.valor !== a.cotizacion.valor) {
        return b.cotizacion.valor - a.cotizacion.valor;
      }
      if (b.cotizacion.score !== a.cotizacion.score) {
        return b.cotizacion.score - a.cotizacion.score;
      }
      return a.jugador.nombre.localeCompare(b.jugador.nombre);
    });

    const itemsTop = rankingItems.slice(0, Math.min(Math.max(limite, 1), 100));

    const resultado: JugadorRankingDto[] = itemsTop.map((item, index) => ({
      posicionRanking: index + 1,
      jugadorId: item.jugador.id,
      nombre: item.jugador.nombre,
      posicion: item.jugador.posicion,
      equipoNombre: item.jugador.equipo?.nombre || 'Equipo Desconocido',
      score: item.cotizacion.score,
      cotizacionActual: item.cotizacion.valor,
      variacionPorcentual: item.variacionPorcentual,
      estrategiaId: item.cotizacion.estrategiaId,
      estrategiaVersion: item.cotizacion.estrategiaVersion,
      tokensDisponibles: item.tokensDisponibles,
    }));

    await this.cacheService.guardarRanking(cacheKey, resultado);
    return resultado;
  }

  public async recalcularCotizacionesActivas(): Promise<{
    procesados: number;
    fallidos: number;
    sinEstadisticas: number;
    duracionMs: number;
  }> {
    const inicio = Date.now();

    // 1. Emitir faltantes si hay ADMIN
    try {
      await this.tokensService.emitirFaltantes();
    } catch (err) {
      this.logger.warn(`Aviso al emitir faltantes previo a recálculo: ${(err as Error).message}`);
    }

    // 2. Obtener estrategia activa
    const configuracion = await this.configRepo.obtenerConfiguracion();
    const estrategia = this.estrategiasMap.get(configuracion.estrategiaActivaId);
    if (!estrategia) {
      throw new ReglaDeNegocioException(
        `Estrategia activa no soportada: ${configuracion.estrategiaActivaId}`,
      );
    }

    // 3. Listar jugadores activos
    const jugadoresActivos = await this.jugadorRepo.listarActivos();
    if (!jugadoresActivos || jugadoresActivos.length === 0) {
      return { procesados: 0, fallidos: 0, sinEstadisticas: 0, duracionMs: Date.now() - inicio };
    }

    // 4. Precargar estadísticas en lote para evitar consultas N+1
    const jugadorIds = jugadoresActivos.map((j) => j.id);
    let todasEstadisticas: any[] = [];
    if (this.estadisticaRepo.buscarPorJugadores) {
      todasEstadisticas = await this.estadisticaRepo.buscarPorJugadores(jugadorIds);
    }

    const estadisticasPorJugador = new Map<string, any[]>();
    for (const est of todasEstadisticas) {
      const list = estadisticasPorJugador.get(est.jugadorId) || [];
      list.push(est);
      estadisticasPorJugador.set(est.jugadorId, list);
    }

    // 5. Calcular nuevas cotizaciones
    const nuevasCotizaciones: Cotizacion[] = [];
    let fallidos = 0;

    for (const jugador of jugadoresActivos) {
      try {
        const ests = estadisticasPorJugador.get(jugador.id) || [];
        const metricasObj = MetricasJugadorParaCotizacion.desdeEstadisticas(ests);
        const resultadoCalculo = estrategia.calcular(
          metricasObj,
          jugador.posicion,
        );

        const nuevaCotizacion = Cotizacion.crearDesdeCalculo({
          jugadorId: jugador.id,
          score: resultadoCalculo.score,
          valor: resultadoCalculo.valor,
          estrategiaId: estrategia.id,
          estrategiaVersion: estrategia.version,
          sinEstadisticas: resultadoCalculo.sinEstadisticas,
          metricas: resultadoCalculo.metricasNormalizadas,
        });

        nuevasCotizaciones.push(nuevaCotizacion);
      } catch (err) {
        this.logger.error(
          `Error al calcular cotización para jugador ${jugador.id}: ${(err as Error).message}`,
        );
        fallidos++;
      }
    }

    // 6. Persistir en bloques con fallback individual ante fallo parcial
    try {
      await this.cotizacionRepo.guardarMuchos(nuevasCotizaciones);
    } catch (batchErr) {
      this.logger.warn(
        `Fallo al guardar lote de cotizaciones masivo; recurriendo a guardado individual resiliente: ${(batchErr as Error).message}`,
      );
      for (const cot of nuevasCotizaciones) {
        try {
          await this.cotizacionRepo.guardar(cot);
        } catch (individualErr) {
          this.logger.error(
            `Error al persistir cotización individual para ${cot.jugadorId}: ${(individualErr as Error).message}`,
          );
          fallidos++;
        }
      }
    }

    // 7. Invalidar la caché de ranking
    await this.cacheService.invalidarRanking();

    const duracionMs = Date.now() - inicio;
    const procesados = nuevasCotizaciones.length;
    const sinEstadisticas = nuevasCotizaciones.filter((c) => c.sinEstadisticas).length;

    this.logger.log(
      `Recálculo masivo completado en ${duracionMs} ms. Procesados: ${procesados}, Fallidos: ${fallidos}, SinEstadisticas: ${sinEstadisticas}`,
    );

    return { procesados, fallidos, sinEstadisticas, duracionMs };
  }
}

