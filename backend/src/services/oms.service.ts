import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Orden } from '../domain/orden.entity';
import { IOrdenRepository, ORDEN_REPOSITORY } from '../domain/orden.repository.interface';
import { Transaccion } from '../domain/transaccion.entity';
import { ITransaccionRepository, TRANSACCION_REPOSITORY } from '../domain/transaccion.repository.interface';
import { BalanceToken } from '../domain/balance-token.entity';
import { IBalanceTokenRepository, BALANCE_TOKEN_REPOSITORY } from '../domain/balance-token.repository.interface';
import { ICotizacionRepository, COTIZACION_REPOSITORY } from '../domain/cotizacion.repository.interface';
import { IJugadorRepository, I_JUGADOR_REPOSITORY } from '../domain/jugador.repository.interface';
import { UsuarioRepository, USUARIO_REPOSITORY } from '../domain/usuario.repository.interface';
import { Dinero } from '../domain/dinero.value-object';
import { MarketplaceCacheService } from './marketplace-cache.service';
import { CrearOrdenCompraDto, ResultadoCompraDto } from '../controllers/dto/orden-compra.dto';
import { UsuarioOrmEntity } from '../data-access/usuario.orm-entity';
import { BalanceTokenOrmEntity } from '../data-access/balance-token.orm-entity';
import { OrdenOrmEntity } from '../data-access/orden.orm-entity';
import { TransaccionOrmEntity } from '../data-access/transaccion.orm-entity';
import { CotizacionOrmEntity } from '../data-access/cotizacion.orm-entity';
import { JugadorOrmEntity } from '../data-access/jugador.orm-entity';
import { BalanceTokenMapper } from '../data-access/balance-token.mapper';
import { UsuarioMapper } from '../data-access/usuario.mapper';
import { OrdenMapper } from '../data-access/orden.mapper';
import {
  CrearOrdenVentaDto,
  FiltroOrdenesVentaDto,
  OrdenVentaRespuestaDto,
} from '../controllers/dto/orden-venta.dto';
import {
  PortfolioUsuarioDto,
  PosicionPortafolioDto,
} from '../controllers/dto/portfolio-usuario.dto';
import {
  TransaccionUsuarioDto,
  TransaccionAuditoriaDto,
  FiltroTransaccionesUsuarioDto,
  FiltroTransaccionesAdminDto,
} from '../controllers/dto/transaccion-usuario.dto';

@Injectable()
export class OmsService {
  private readonly logger = new Logger(OmsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(ORDEN_REPOSITORY)
    private readonly ordenRepo: IOrdenRepository,
    @Inject(TRANSACCION_REPOSITORY)
    private readonly transaccionRepo: ITransaccionRepository,
    @Inject(BALANCE_TOKEN_REPOSITORY)
    private readonly balanceTokenRepo: IBalanceTokenRepository,
    @Inject(COTIZACION_REPOSITORY)
    private readonly cotizacionRepo: ICotizacionRepository,
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepo: IJugadorRepository,
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepo: UsuarioRepository,
    private readonly cacheService: MarketplaceCacheService,
  ) {}

  public async comprarTokens(
    compradorId: string,
    dto: CrearOrdenCompraDto,
  ): Promise<ResultadoCompraDto> {
    if (!dto.ordenVentaId) {
      return this.ejecutarCompraPrimaria(compradorId, dto);
    } else {
      return this.ejecutarCompraSecundaria(compradorId, dto);
    }
  }

  private ejecutarCompraPrimaria(
    compradorId: string,
    dto: CrearOrdenCompraDto,
  ): Promise<ResultadoCompraDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const { jugadorId, cantidad, precioMaximoUnitario } = dto;
      // 1. Validar que el jugador existe y está activo
      const jugadorOrm = await manager.findOne(JugadorOrmEntity, {
        where: { id: jugadorId },
      });
      if (!jugadorOrm) {
        throw new NotFoundException(`Jugador con id ${jugadorId} no encontrado.`);
      }
      if (!jugadorOrm.activo) {
        throw new BadRequestException('El futbolista no se encuentra activo para transacciones.');
      }

      // 2. Obtener cotización vigente del jugador (inmutable)
      const cotizacionOrm = await manager.findOne(CotizacionOrmEntity, {
        where: { jugadorId },
        order: { fechaCotizacion: 'DESC' },
      });
      if (!cotizacionOrm) {
        throw new BadRequestException('El jugador aún no posee una cotización oficial emitida.');
      }

      const precioUnitario = Dinero.desdeMonto(Number(cotizacionOrm.valor));

      // 3. Validar precioMaximoUnitario si fue especificado
      if (precioMaximoUnitario !== undefined) {
        const limiteMax = Dinero.desdeMonto(precioMaximoUnitario);
        if (precioUnitario.centavos > limiteMax.centavos) {
          throw new BadRequestException(
            `El precio oficial vigente (${precioUnitario.aNumero()}) supera el precio máximo especificado (${limiteMax.aNumero()}).`,
          );
        }
      }

      // 4. Buscar superusuario ADMIN
      const adminOrmRaw = await manager.findOne(UsuarioOrmEntity, {
        where: { rol: 'ADMIN' },
      });
      if (!adminOrmRaw) {
        throw new BadRequestException('No existe una cuenta de superusuario ADMIN emisora configurada.');
      }
      const adminId = adminOrmRaw.id;

      // Prohibir que el ADMIN se compre a sí mismo
      if (compradorId === adminId) {
        throw new BadRequestException('El superusuario ADMIN no puede comprar tokens de su propio inventario primario.');
      }

      // 5. Adquirir locks pesimistas FOR UPDATE en orden determinista de UUID para usuarios
      const userIds = [compradorId, adminId].sort((a, b) => a.localeCompare(b));
      const lockedUsers = await manager
        .createQueryBuilder(UsuarioOrmEntity, 'u')
        .setLock('pessimistic_write')
        .where('u.id IN (:...ids)', { ids: userIds })
        .orderBy('u.id', 'ASC')
        .getMany();

      const compradorOrm = lockedUsers.find((u) => u.id === compradorId);
      const adminOrm = lockedUsers.find((u) => u.id === adminId);

      if (!compradorOrm) {
        throw new NotFoundException(`Usuario comprador no encontrado: ${compradorId}`);
      }
      if (!adminOrm) {
        throw new NotFoundException(`Usuario ADMIN no encontrado: ${adminId}`);
      }

      const comprador = UsuarioMapper.toDomain(compradorOrm);
      const admin = UsuarioMapper.toDomain(adminOrm);

      // 6. Adquirir locks pesimistas FOR UPDATE en orden determinista para balances_tokens
      const lockedBalances = await manager
        .createQueryBuilder(BalanceTokenOrmEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.jugador_id = :jugadorId AND b.usuario_id IN (:...ids)', {
          jugadorId,
          ids: userIds,
        })
        .orderBy('b.usuario_id', 'ASC')
        .getMany();

      let adminBalanceOrm = lockedBalances.find((b) => b.usuarioId === adminId);
      let compradorBalanceOrm = lockedBalances.find((b) => b.usuarioId === compradorId);

      if (!adminBalanceOrm) {
        throw new BadRequestException('No existe inventario de tokens asignado al ADMIN para este futbolista.');
      }

      const adminBalance = BalanceTokenMapper.toDomain(adminBalanceOrm);
      let compradorBalance: BalanceToken;

      if (!compradorBalanceOrm) {
        compradorBalance = BalanceToken.crear({
          usuarioId: compradorId,
          jugadorId,
          cantidadDisponible: 0,
          cantidadBloqueada: 0,
        });
      } else {
        compradorBalance = BalanceTokenMapper.toDomain(compradorBalanceOrm);
      }

      // 7. Validaciones de stock y saldo
      if (adminBalance.cantidadDisponible < cantidad) {
        throw new BadRequestException(
          `Suministro primario insuficiente. Disponibles: ${adminBalance.cantidadDisponible}, Solicitados: ${cantidad}.`,
        );
      }

      const montoTotal = precioUnitario.multiplicarPorEntero(cantidad);
      if (comprador.saldo.centavos < montoTotal.centavos) {
        throw new BadRequestException(
          `Saldo monetario insuficiente. Requerido: ${montoTotal.aNumero()}, Disponible: ${comprador.saldo.aNumero()}.`,
        );
      }

      // 8. Aplicar operaciones de dominio
      comprador.debitarSaldo(montoTotal);
      admin.acreditarSaldo(montoTotal);

      adminBalance.debitarDisponibles(cantidad);
      compradorBalance.acreditarTokens(cantidad);

      // 9. Persistir usuarios y balances actualizados
      await manager.save(UsuarioOrmEntity, UsuarioMapper.toOrm(comprador));
      await manager.save(UsuarioOrmEntity, UsuarioMapper.toOrm(admin));

      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(adminBalance));
      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(compradorBalance));

      // 10. Crear Orden de COMPRA inmediata (COMPLETADA)
      const ordenCompra = Orden.crearCompra({
        usuarioId: compradorId,
        jugadorId,
        tipoMercado: 'PRIMARIO',
        cantidad,
        precioUnitario,
      });
      await this.ordenRepo.guardar(ordenCompra, manager);

      // 11. Crear Transacción inmutable con estrategiaCotizacion
      const transaccion = Transaccion.crear({
        ordenId: ordenCompra.id,
        jugadorId,
        compradorId,
        vendedorId: adminId,
        cantidad,
        precioUnitario,
        montoTotal,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: cotizacionOrm.estrategiaVersion || `${cotizacionOrm.estrategiaId}_v1`,
      });
      await this.transaccionRepo.guardar(transaccion, manager);

      // 12. Invalidar ranking en caché L1
      await this.cacheService.invalidarRanking();

      return {
        transaccionId: transaccion.id,
        ordenId: ordenCompra.id,
        jugadorId,
        cantidadTokensComprados: cantidad,
        precioUnitarioPagado: precioUnitario.aNumero(),
        montoTotalDebitado: montoTotal.aNumero(),
        saldoRestanteUsuario: comprador.saldo.aNumero(),
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: transaccion.estrategiaCotizacion,
        fecha: transaccion.creadoEn.toISOString(),
      };
    });
  }

  // Placeholder para la rama secundaria (se completará exhaustivamente en Phase 7 / US5)
  private ejecutarCompraSecundaria(
    compradorId: string,
    dto: CrearOrdenCompraDto,
  ): Promise<ResultadoCompraDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const { ordenVentaId, cantidad, precioMaximoUnitario } = dto;
      // 1. Bloquear orden de venta FOR UPDATE
      const ordenOrm = await manager
        .createQueryBuilder(OrdenOrmEntity, 'o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: ordenVentaId })
        .getOne();

      if (!ordenOrm) {
        throw new NotFoundException(`Oferta de venta ${ordenVentaId} no encontrada.`);
      }

      if (ordenOrm.tipo !== 'VENTA' || (ordenOrm.estado !== 'PENDIENTE' && ordenOrm.estado !== 'PARCIAL')) {
        throw new ConflictException('La oferta de venta seleccionada ya no se encuentra activa.');
      }

      const ordenVenta = OrdenMapper.toDomain(ordenOrm);
      const vendedorId = ordenVenta.usuarioId;
      const jugadorId = ordenVenta.jugadorId;

      if (compradorId === vendedorId) {
        throw new BadRequestException('No puedes comprar tu propia orden de venta (autocontratación prohibida).');
      }

      // Validar jugador activo
      const jugadorOrm = await manager.findOne(JugadorOrmEntity, { where: { id: jugadorId } });
      if (!jugadorOrm?.activo) {
        throw new BadRequestException('El futbolista no se encuentra activo para transacciones.');
      }

      if (cantidad > ordenVenta.cantidadRestante) {
        throw new BadRequestException(
          `Cantidad solicitada (${cantidad}) supera la cantidad remanente de la oferta (${ordenVenta.cantidadRestante}).`,
        );
      }

      const precioUnitario = ordenVenta.precioUnitario;
      if (precioMaximoUnitario !== undefined) {
        const limiteMax = Dinero.desdeMonto(precioMaximoUnitario);
        if (precioUnitario.centavos > limiteMax.centavos) {
          throw new BadRequestException(
            `El precio de la oferta (${precioUnitario.aNumero()}) supera el precio máximo especificado (${limiteMax.aNumero()}).`,
          );
        }
      }

      // Obtener cotización vigente para registrar su versión de estrategia oficial
      const cotizacionOrm = await manager.findOne(CotizacionOrmEntity, {
        where: { jugadorId },
        order: { fechaCotizacion: 'DESC' },
      });
      const estrategiaCotizacion = cotizacionOrm
        ? cotizacionOrm.estrategiaVersion || `${cotizacionOrm.estrategiaId}_v1`
        : 'GLOBAL_v1';

      // Bloqueo pesimista en orden determinista de usuarios
      const userIds = [compradorId, vendedorId].sort((a, b) => a.localeCompare(b));
      const lockedUsers = await manager
        .createQueryBuilder(UsuarioOrmEntity, 'u')
        .setLock('pessimistic_write')
        .where('u.id IN (:...ids)', { ids: userIds })
        .orderBy('u.id', 'ASC')
        .getMany();

      const comprador = UsuarioMapper.toDomain(lockedUsers.find((u) => u.id === compradorId)!);
      const vendedor = UsuarioMapper.toDomain(lockedUsers.find((u) => u.id === vendedorId)!);

      const montoTotal = precioUnitario.multiplicarPorEntero(cantidad);
      if (comprador.saldo.centavos < montoTotal.centavos) {
        throw new BadRequestException(
          `Saldo monetario insuficiente. Requerido: ${montoTotal.aNumero()}, Disponible: ${comprador.saldo.aNumero()}.`,
        );
      }

      // Bloqueo pesimista en orden determinista de balances
      const lockedBalances = await manager
        .createQueryBuilder(BalanceTokenOrmEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.jugador_id = :jugadorId AND b.usuario_id IN (:...ids)', {
          jugadorId,
          ids: userIds,
        })
        .orderBy('b.usuario_id', 'ASC')
        .getMany();

      const vendedorBalanceOrm = lockedBalances.find((b) => b.usuarioId === vendedorId);
      if (!vendedorBalanceOrm) {
        throw new ConflictException('Balance del vendedor no encontrado.');
      }
      const vendedorBalance = BalanceTokenMapper.toDomain(vendedorBalanceOrm);

      let compradorBalanceOrm = lockedBalances.find((b) => b.usuarioId === compradorId);
      let compradorBalance = compradorBalanceOrm
        ? BalanceTokenMapper.toDomain(compradorBalanceOrm)
        : BalanceToken.crear({
            usuarioId: compradorId,
            jugadorId,
            cantidadDisponible: 0,
            cantidadBloqueada: 0,
          });

      // Liquidación
      comprador.debitarSaldo(montoTotal);
      vendedor.acreditarSaldo(montoTotal);

      vendedorBalance.debitarBloqueados(cantidad);
      compradorBalance.acreditarTokens(cantidad);

      ordenVenta.ejecutarParcial(cantidad);

      await manager.save(UsuarioOrmEntity, UsuarioMapper.toOrm(comprador));
      await manager.save(UsuarioOrmEntity, UsuarioMapper.toOrm(vendedor));
      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(vendedorBalance));
      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(compradorBalance));
      await manager.save(OrdenOrmEntity, OrdenMapper.toOrm(ordenVenta));

      // Orden COMPRA inmediata
      const ordenCompra = Orden.crearCompra({
        usuarioId: compradorId,
        jugadorId,
        tipoMercado: 'SECUNDARIO',
        cantidad,
        precioUnitario,
      });
      await this.ordenRepo.guardar(ordenCompra, manager);

      const transaccion = Transaccion.crear({
        ordenId: ordenVenta.id,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad,
        precioUnitario,
        montoTotal,
        tipoMercado: 'SECUNDARIO',
        estrategiaCotizacion,
      });
      await this.transaccionRepo.guardar(transaccion, manager);

      await this.cacheService.invalidarRanking();

      return {
        transaccionId: transaccion.id,
        ordenId: ordenCompra.id,
        jugadorId,
        cantidadTokensComprados: cantidad,
        precioUnitarioPagado: precioUnitario.aNumero(),
        montoTotalDebitado: montoTotal.aNumero(),
        saldoRestanteUsuario: comprador.saldo.aNumero(),
        tipoMercado: 'SECUNDARIO',
        estrategiaCotizacion,
        fecha: transaccion.creadoEn.toISOString(),
      };
    });
  }

  public crearOrdenVenta(
    vendedorId: string,
    dto: CrearOrdenVentaDto,
  ): Promise<OrdenVentaRespuestaDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const { jugadorId, cantidad, precioUnitario } = dto;
      // 1. Validar que el jugador existe y está activo
      const jugadorOrm = await manager.findOne(JugadorOrmEntity, { where: { id: jugadorId } });
      if (!jugadorOrm) {
        throw new NotFoundException(`Jugador con id ${jugadorId} no encontrado.`);
      }
      if (!jugadorOrm.activo) {
        throw new BadRequestException('El futbolista no se encuentra activo para transacciones.');
      }

      // 2. Lock pesimista sobre el balance del vendedor
      const balanceOrm = await manager
        .createQueryBuilder(BalanceTokenOrmEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.usuario_id = :vendedorId AND b.jugador_id = :jugadorId', {
          vendedorId,
          jugadorId,
        })
        .getOne();

      if (!balanceOrm) {
        throw new BadRequestException('No posees balance de tokens de este futbolista.');
      }

      const balance = BalanceTokenMapper.toDomain(balanceOrm);

      if (balance.cantidadDisponible < cantidad) {
        throw new BadRequestException(
          `Cantidad de tokens disponible insuficiente para vender. Disponibles: ${balance.cantidadDisponible}, Solicitados: ${cantidad}.`,
        );
      }

      // 3. Custodia preventiva: pasar cantidad de disponible a bloqueada
      balance.bloquearTokens(cantidad);
      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(balance));

      // 4. Crear Orden de VENTA (estado PENDIENTE, cantidadRestante = cantidad)
      const ordenVenta = Orden.crearVenta({
        usuarioId: vendedorId,
        jugadorId,
        cantidad,
        precioUnitario,
      });
      await this.ordenRepo.guardar(ordenVenta, manager);

      return {
        ordenId: ordenVenta.id,
        jugadorId: ordenVenta.jugadorId,
        vendedorId: ordenVenta.usuarioId,
        cantidad: ordenVenta.cantidad,
        cantidadRestante: ordenVenta.cantidadRestante,
        precioUnitario: ordenVenta.precioUnitario.aNumero(),
        estado: ordenVenta.estado,
        creadoEn: ordenVenta.creadoEn.toISOString(),
        actualizadoEn: ordenVenta.actualizadoEn.toISOString(),
      };
    });
  }

  public async listarOrdenesVenta(
    filtros: FiltroOrdenesVentaDto,
  ): Promise<OrdenVentaRespuestaDto[]> {
    const ordenes = await this.ordenRepo.listarOfertasSecundarias(filtros);
    return ordenes.map((o) => ({
      ordenId: o.id,
      jugadorId: o.jugadorId,
      vendedorId: o.usuarioId,
      cantidad: o.cantidad,
      cantidadRestante: o.cantidadRestante,
      precioUnitario: o.precioUnitario.aNumero(),
      estado: o.estado,
      creadoEn: o.creadoEn.toISOString(),
      actualizadoEn: o.actualizadoEn.toISOString(),
    }));
  }

  public cancelarOrdenVenta(
    usuarioId: string,
    ordenId: string,
  ): Promise<OrdenVentaRespuestaDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Lock pesimista sobre la orden
      const ordenOrm = await manager
        .createQueryBuilder(OrdenOrmEntity, 'o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: ordenId })
        .getOne();

      if (!ordenOrm) {
        throw new NotFoundException(`Orden de venta ${ordenId} no encontrada.`);
      }

      if (ordenOrm.tipo !== 'VENTA') {
        throw new BadRequestException('Solo las órdenes de venta pueden cancelarse.');
      }

      if (ordenOrm.usuarioId !== usuarioId) {
        throw new ForbiddenException('No tienes autorización para cancelar una orden que pertenece a otro usuario.');
      }

      if (ordenOrm.estado === 'COMPLETADA' || ordenOrm.estado === 'CANCELADA') {
        throw new ConflictException(
          `La orden ya no se puede cancelar porque se encuentra en estado ${ordenOrm.estado}.`,
        );
      }

      const orden = OrdenMapper.toDomain(ordenOrm);
      const remanente = orden.cantidadRestante;

      // 2. Lock pesimista sobre el balance del usuario vendedor
      const balanceOrm = await manager
        .createQueryBuilder(BalanceTokenOrmEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.usuario_id = :usuarioId AND b.jugador_id = :jugadorId', {
          usuarioId,
          jugadorId: orden.jugadorId,
        })
        .getOne();

      if (!balanceOrm) {
        throw new ConflictException('Balance de tokens no encontrado para liberar custodia.');
      }

      const balance = BalanceTokenMapper.toDomain(balanceOrm);

      // 3. Liberar custodia: devolver remanente de bloqueado a disponible
      balance.liberarTokens(remanente);
      await manager.save(BalanceTokenOrmEntity, BalanceTokenMapper.toOrm(balance));

      // 4. Cancelar la orden
      orden.cancelar();
      await manager.save(OrdenOrmEntity, OrdenMapper.toOrm(orden));

      return {
        ordenId: orden.id,
        jugadorId: orden.jugadorId,
        vendedorId: orden.usuarioId,
        cantidad: orden.cantidad,
        cantidadRestante: orden.cantidadRestante,
        precioUnitario: orden.precioUnitario.aNumero(),
        estado: orden.estado,
        creadoEn: orden.creadoEn.toISOString(),
        actualizadoEn: orden.actualizadoEn.toISOString(),
      };
    });
  }

  public async obtenerPortfolioUsuario(
    solicitanteId: string,
    usuarioId: string,
  ): Promise<PortfolioUsuarioDto> {
    // 1. Validar autorización: solicitante debe ser el titular o un ADMIN
    const solicitante = await this.usuarioRepo.buscarPorId(solicitanteId);
    if (!solicitante) {
      throw new NotFoundException(`Usuario solicitante ${solicitanteId} no encontrado.`);
    }

    if (solicitanteId !== usuarioId && !solicitante.esAdmin()) {
      throw new ForbiddenException('No tienes permiso para consultar el portfolio de otro usuario.');
    }

    // 2. Obtener usuario titular
    const usuario = await this.usuarioRepo.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NotFoundException(`Usuario ${usuarioId} no encontrado.`);
    }

    // 3. Obtener balances de tokens con tenencia > 0 (disponible > 0 OR bloqueada > 0)
    const balances = await this.dataSource.query(
      `SELECT b.jugador_id, b.cantidad_disponible, b.cantidad_bloqueada,
              j.nombre AS jugador_nombre, j.posicion AS jugador_posicion,
              e.nombre AS equipo_nombre
       FROM balances_tokens b
       INNER JOIN jugadores j ON j.id = b.jugador_id
       LEFT JOIN equipos e ON e.id = j.equipo_id
       WHERE b.usuario_id = $1 AND (b.cantidad_disponible > 0 OR b.cantidad_bloqueada > 0)`,
      [usuarioId],
    );

    if (balances.length === 0) {
      return {
        usuarioId,
        saldoBilletera: usuario.saldo.aNumero(),
        valoracionTotalTokens: 0.0,
        patrimonioNetoTotal: usuario.saldo.aNumero(),
        posiciones: [],
      };
    }

    const jugadorIds = balances.map((b: any) => b.jugador_id);

    // 4. Obtener cotizaciones vigentes para estos jugadores
    const cotizacionesRaw = await this.dataSource.query(
      `SELECT DISTINCT ON (jugador_id) jugador_id, valor
       FROM cotizaciones
       WHERE jugador_id = ANY($1)
       ORDER BY jugador_id, fecha_cotizacion DESC`,
      [jugadorIds],
    );
    const cotizacionesMap = new Map<string, number>();
    for (const row of cotizacionesRaw) {
      cotizacionesMap.set(row.jugador_id, Number(row.valor));
    }

    // 5. Calcular precio promedio ponderado de adquisición histórico para el usuario
    const comprasRaw = await this.dataSource.query(
      `SELECT jugador_id, SUM(cantidad) AS total_comprado, SUM(monto_total) AS total_invertido
       FROM transacciones
       WHERE comprador_id = $1 AND jugador_id = ANY($2)
       GROUP BY jugador_id`,
      [usuarioId, jugadorIds],
    );
    const comprasMap = new Map<string, { totalComprado: number; totalInvertido: number }>();
    for (const c of comprasRaw) {
      comprasMap.set(c.jugador_id, {
        totalComprado: Number(c.total_comprado),
        totalInvertido: Number(c.total_invertido),
      });
    }

    // 6. Construir posiciones
    let valoracionTotalTokensCentavos = 0;
    const posiciones: PosicionPortafolioDto[] = [];

    for (const b of balances) {
      const cantDisp = Number(b.cantidad_disponible);
      const cantBloq = Number(b.cantidad_bloqueada);
      const cantTotal = cantDisp + cantBloq;
      const cotActual = cotizacionesMap.get(b.jugador_id) ?? 1.0;

      const compraInfo = comprasMap.get(b.jugador_id);
      let precioPromedioAdquisicion = cotActual;
      if (compraInfo && compraInfo.totalComprado > 0) {
        precioPromedioAdquisicion =
          Math.round((compraInfo.totalInvertido / compraInfo.totalComprado + Number.EPSILON) * 100) / 100;
      }

      const valoracionPosicionDinero = Dinero.desdeMonto(cotActual).multiplicarPorEntero(cantTotal);
      valoracionTotalTokensCentavos += valoracionPosicionDinero.centavos;

      posiciones.push({
        jugadorId: b.jugador_id,
        nombreJugador: b.jugador_nombre,
        posicion: b.jugador_posicion,
        equipoNombre: b.equipo_nombre || 'Sin Equipo',
        cantidadTokensDisponibles: cantDisp,
        cantidadTokensEnVenta: cantBloq,
        precioPromedioAdquisicion,
        cotizacionActual: cotActual,
        valoracionTotalPosicion: valoracionPosicionDinero.aNumero(),
      });
    }

    const valoracionTotalTokens = Dinero.desdeCentavos(valoracionTotalTokensCentavos);
    const patrimonioNetoTotal = usuario.saldo.sumar(valoracionTotalTokens);

    return {
      usuarioId,
      saldoBilletera: usuario.saldo.aNumero(),
      valoracionTotalTokens: valoracionTotalTokens.aNumero(),
      patrimonioNetoTotal: patrimonioNetoTotal.aNumero(),
      posiciones,
    };
  }

  public async obtenerHistorialTransaccionesUsuario(
    solicitanteId: string,
    usuarioId: string,
    filtros: FiltroTransaccionesUsuarioDto,
  ): Promise<TransaccionUsuarioDto[]> {
    // 1. Validar autorización
    const solicitante = await this.usuarioRepo.buscarPorId(solicitanteId);
    if (!solicitante) {
      throw new NotFoundException(`Usuario solicitante ${solicitanteId} no encontrado.`);
    }

    if (solicitanteId !== usuarioId && !solicitante.esAdmin()) {
      throw new ForbiddenException('No tienes permiso para consultar las transacciones de otro usuario.');
    }

    // 2. Consultar transacciones con jugador y datos de contraparte
    const qb = this.dataSource
      .getRepository(TransaccionOrmEntity)
      .createQueryBuilder('tx')
      .innerJoin(JugadorOrmEntity, 'j', 'j.id = tx.jugadorId')
      .select([
        'tx.id AS id',
        'tx.ordenId AS orden_id',
        'tx.tipoMercado AS tipo_mercado',
        'tx.jugadorId AS jugador_id',
        'j.nombre AS jugador_nombre',
        'tx.compradorId AS comprador_id',
        'tx.vendedorId AS vendedor_id',
        'tx.cantidad AS cantidad',
        'tx.precioUnitario AS precio_unitario',
        'tx.montoTotal AS monto_total',
        'tx.estrategiaCotizacion AS estrategia_cotizacion',
        'tx.creadoEn AS creado_en',
      ]);

    if (filtros.tipo === 'COMPRA') {
      qb.where('tx.compradorId = :usuarioId', { usuarioId });
    } else if (filtros.tipo === 'VENTA') {
      qb.where('tx.vendedorId = :usuarioId', { usuarioId });
    } else {
      qb.where('(tx.compradorId = :usuarioId OR tx.vendedorId = :usuarioId)', { usuarioId });
    }

    if (filtros.jugadorId) {
      qb.andWhere('tx.jugadorId = :jugadorId', { jugadorId: filtros.jugadorId });
    }
    if (filtros.desde) {
      qb.andWhere('tx.creadoEn >= :desde', { desde: new Date(filtros.desde) });
    }
    if (filtros.hasta) {
      qb.andWhere('tx.creadoEn <= :hasta', { hasta: new Date(filtros.hasta) });
    }

    qb.orderBy('tx.creadoEn', 'DESC');
    qb.take(filtros.limite ?? 50);

    const rows = await qb.getRawMany();

    // Identificar ID del ADMIN para etiquetar MERCADO_PRIMARIO
    const admin = await this.usuarioRepo.buscarAdmin();
    const adminId = admin ? admin.id : null;

    return rows.map((r: any) => {
      const esCompra = r.comprador_id === usuarioId;
      const tipoOperacion: 'COMPRA' | 'VENTA' = esCompra ? 'COMPRA' : 'VENTA';

      let contraparte = esCompra ? r.vendedor_id : r.comprador_id;
      if (esCompra && r.tipo_mercado === 'PRIMARIO' && r.vendedor_id === adminId) {
        contraparte = 'MERCADO_PRIMARIO';
      }

      return {
        transaccionId: r.id,
        ordenId: r.orden_id,
        tipoOperacion,
        tipoMercado: r.tipo_mercado as any,
        jugadorId: r.jugador_id,
        nombreJugador: r.jugador_nombre || 'Jugador',
        cantidadTokens: Number(r.cantidad),
        precioUnitario: Number(r.precio_unitario),
        montoTotal: Number(r.monto_total),
        estrategiaCotizacion: r.estrategia_cotizacion,
        contraparte,
        fecha: new Date(r.creado_en).toISOString(),
      };
    });
  }

  public async obtenerAuditoriaGlobalTransacciones(
    filtros: FiltroTransaccionesAdminDto,
  ): Promise<TransaccionAuditoriaDto[]> {
    const qb = this.dataSource
      .getRepository(TransaccionOrmEntity)
      .createQueryBuilder('tx')
      .innerJoin(JugadorOrmEntity, 'j', 'j.id = tx.jugadorId')
      .select([
        'tx.id AS id',
        'tx.ordenId AS orden_id',
        'tx.tipoMercado AS tipo_mercado',
        'tx.jugadorId AS jugador_id',
        'j.nombre AS jugador_nombre',
        'tx.compradorId AS comprador_id',
        'tx.vendedorId AS vendedor_id',
        'tx.cantidad AS cantidad',
        'tx.precioUnitario AS precio_unitario',
        'tx.montoTotal AS monto_total',
        'tx.estrategiaCotizacion AS estrategia_cotizacion',
        'tx.creadoEn AS creado_en',
      ]);

    if (filtros.usuarioId) {
      qb.andWhere('(tx.compradorId = :usuarioId OR tx.vendedorId = :usuarioId)', {
        usuarioId: filtros.usuarioId,
      });
    }
    if (filtros.jugadorId) {
      qb.andWhere('tx.jugadorId = :jugadorId', { jugadorId: filtros.jugadorId });
    }
    if (filtros.tipoMercado) {
      qb.andWhere('tx.tipoMercado = :tipoMercado', { tipoMercado: filtros.tipoMercado });
    }
    if (filtros.desde) {
      qb.andWhere('tx.creadoEn >= :desde', { desde: new Date(filtros.desde) });
    }
    if (filtros.hasta) {
      qb.andWhere('tx.creadoEn <= :hasta', { hasta: new Date(filtros.hasta) });
    }

    qb.orderBy('tx.creadoEn', 'DESC');
    qb.take(filtros.limite ?? 100);

    const rows = await qb.getRawMany();

    return rows.map((r: any) => ({
      transaccionId: r.id,
      ordenId: r.orden_id,
      tipoMercado: r.tipo_mercado as any,
      jugadorId: r.jugador_id,
      nombreJugador: r.jugador_nombre || 'Jugador',
      compradorId: r.comprador_id,
      vendedorId: r.vendedor_id,
      cantidadTokens: Number(r.cantidad),
      precioUnitario: Number(r.precio_unitario),
      montoTotal: Number(r.monto_total),
      estrategiaCotizacion: r.estrategia_cotizacion,
      fecha: new Date(r.creado_en).toISOString(),
    }));
  }
}



