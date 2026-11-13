import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  UsuarioRepository,
  USUARIO_REPOSITORY,
} from '../domain/usuario.repository.interface';
import {
  IJugadorRepository,
  I_JUGADOR_REPOSITORY,
} from '../domain/jugador.repository.interface';
import {
  IConfiguracionMercadoRepository,
  CONFIGURACION_MERCADO_REPOSITORY,
} from '../domain/configuracion-mercado.repository.interface';
import { generarId } from '../common/utils/generar-id';
import { Jugador } from '../domain/jugador.entity';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepository: IJugadorRepository,
    @Inject(CONFIGURACION_MERCADO_REPOSITORY)
    private readonly configuracionMercadoRepo: IConfiguracionMercadoRepository,
  ) {}

  public async emitirFaltantes(): Promise<{ emitidos: number; omitidos: number }> {
    const admin = await this.usuarioRepository.buscarAdmin();
    if (!admin) {
      this.logger.warn(
        'No existe un usuario con rol ADMIN registrado. Omitiendo emisión inicial de tokens.',
      );
      return { emitidos: 0, omitidos: 0 };
    }

    const jugadoresActivos = await this.jugadorRepository.listarActivos();
    if (!jugadoresActivos || jugadoresActivos.length === 0) {
      return { emitidos: 0, omitidos: 0 };
    }

    const configuracion =
      await this.configuracionMercadoRepo.obtenerConfiguracion();

    let emitidos = 0;
    let omitidos = 0;

    await jugadoresActivos.reduce<Promise<void>>(async (prev, jugador) => {
      await prev;
      const emitido = await this.ejecutarEmisionIdempotente(
        admin.id,
        jugador,
        configuracion.estrategiaActivaId,
        configuracion.estrategiaActivaVersion,
      );
      if (emitido) {
        emitidos++;
      } else {
        omitidos++;
      }
    }, Promise.resolve());

    this.logger.log(
      `Emisión de tokens completada. Emitidos: ${emitidos}, Ya existentes/omitidos: ${omitidos}`,
    );

    return { emitidos, omitidos };
  }

  public async asegurarEmisionJugador(jugadorId: string): Promise<boolean> {
    const admin = await this.usuarioRepository.buscarAdmin();
    if (!admin) {
      this.logger.warn(
        'No existe un usuario con rol ADMIN para la emisión del jugador.',
      );
      return false;
    }

    const jugador = await this.jugadorRepository.buscarPorId(jugadorId);
    if (!jugador?.activo) {
      this.logger.warn(
        `El jugador ${jugadorId} no existe o no se encuentra activo. No se emitirán tokens.`,
      );
      return false;
    }

    const configuracion =
      await this.configuracionMercadoRepo.obtenerConfiguracion();

    return this.ejecutarEmisionIdempotente(
      admin.id,
      jugador,
      configuracion.estrategiaActivaId,
      configuracion.estrategiaActivaVersion,
    );
  }

  private ejecutarEmisionIdempotente(
    adminId: string,
    jugador: Jugador,
    estrategiaId: string,
    estrategiaVersion: string,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Insertar balance_token de 100 tokens iniciales asignados al ADMIN si no existe
      const balanceId = generarId();
      const insertResult = await manager.query(
        `
        INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada, actualizado_en)
        VALUES ($1, $2, $3, 100, 0, now())
        ON CONFLICT (usuario_id, jugador_id) DO NOTHING
        RETURNING id;
        `,
        [balanceId, adminId, jugador.id],
      );

      const seInsertoBalance =
        Array.isArray(insertResult) && insertResult.length > 0;

      // 2. Verificar si el jugador ya cuenta con alguna cotización
      const cotizacionesExistentes = await manager.query(
        `SELECT id FROM cotizaciones WHERE jugador_id = $1 LIMIT 1`,
        [jugador.id],
      );

      if (cotizacionesExistentes.length === 0) {
        const cotizacionId = generarId();
        await manager.query(
          `
          INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
          VALUES ($1, $2, 0.0000, 1.00, $3, $4, true, null, now());
          `,
          [cotizacionId, jugador.id, estrategiaId, estrategiaVersion],
        );
      }

      return seInsertoBalance;
    });
  }
}
