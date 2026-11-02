import { Orden, TipoOrden, TipoMercadoOrden, EstadoOrden } from '../../../src/domain/orden.entity';
import { Dinero } from '../../../src/domain/dinero.value-object';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Orden (Domain Entity)', () => {
  const usuarioId = '11111111-1111-1111-1111-111111111111';
  const jugadorId = '22222222-2222-2222-2222-222222222222';

  describe('Creación de órdenes de COMPRA (Mercado Primario o Secundario)', () => {
    it('debe crear una orden de COMPRA inmediatamente en estado COMPLETADA y con cantidadRestante 0', () => {
      const orden = Orden.crearCompra({
        usuarioId,
        jugadorId,
        tipoMercado: 'PRIMARIO',
        cantidad: 5,
        precioUnitario: 1.5,
      });

      expect(orden.id).toBeDefined();
      expect(orden.tipo).toBe('COMPRA');
      expect(orden.tipoMercado).toBe('PRIMARIO');
      expect(orden.cantidad).toBe(5);
      expect(orden.cantidadRestante).toBe(0);
      expect(orden.precioUnitario.aNumero()).toBe(1.5);
      expect(orden.estado).toBe('COMPLETADA');
      expect(orden.esActiva()).toBe(false);
    });

    it('debe rechazar orden de compra con cantidad menor a 1 o no entera', () => {
      expect(() =>
        Orden.crearCompra({
          usuarioId,
          jugadorId,
          tipoMercado: 'PRIMARIO',
          cantidad: 0,
          precioUnitario: 1.0,
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Orden.crearCompra({
          usuarioId,
          jugadorId,
          tipoMercado: 'PRIMARIO',
          cantidad: 2.5,
          precioUnitario: 1.0,
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe rechazar orden de compra con precio menor o igual a cero', () => {
      expect(() =>
        Orden.crearCompra({
          usuarioId,
          jugadorId,
          tipoMercado: 'PRIMARIO',
          cantidad: 1,
          precioUnitario: 0,
        }),
      ).toThrow(ReglaDeNegocioException);
    });
  });

  describe('Máquina de estados de órdenes de VENTA (Mercado Secundario)', () => {
    it('debe crear una orden de VENTA en estado PENDIENTE con cantidadRestante igual a cantidad', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 10,
        precioUnitario: 2.0,
      });

      expect(orden.tipo).toBe('VENTA');
      expect(orden.tipoMercado).toBe('SECUNDARIO');
      expect(orden.cantidad).toBe(10);
      expect(orden.cantidadRestante).toBe(10);
      expect(orden.estado).toBe('PENDIENTE');
      expect(orden.esActiva()).toBe(true);
    });

    it('debe transicionar PENDIENTE -> PARCIAL ante una ejecución parcial', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 10,
        precioUnitario: 2.0,
      });

      orden.ejecutarParcial(4);
      expect(orden.cantidadRestante).toBe(6);
      expect(orden.estado).toBe('PARCIAL');
      expect(orden.esActiva()).toBe(true);

      orden.ejecutarParcial(3);
      expect(orden.cantidadRestante).toBe(3);
      expect(orden.estado).toBe('PARCIAL');
      expect(orden.esActiva()).toBe(true);
    });

    it('debe transicionar PENDIENTE -> COMPLETADA ante ejecución total directa', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 10,
        precioUnitario: 2.0,
      });

      orden.ejecutarParcial(10);
      expect(orden.cantidadRestante).toBe(0);
      expect(orden.estado).toBe('COMPLETADA');
      expect(orden.esActiva()).toBe(false);
    });

    it('debe transicionar PARCIAL -> COMPLETADA al agotar la cantidadRestante', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 10,
        precioUnitario: 2.0,
      });

      orden.ejecutarParcial(6);
      expect(orden.estado).toBe('PARCIAL');

      orden.ejecutarParcial(4);
      expect(orden.cantidadRestante).toBe(0);
      expect(orden.estado).toBe('COMPLETADA');
      expect(orden.esActiva()).toBe(false);
    });

    it('debe permitir cancelar una orden en estado PENDIENTE o PARCIAL', () => {
      const orden1 = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 5,
        precioUnitario: 2.0,
      });
      orden1.cancelar();
      expect(orden1.estado).toBe('CANCELADA');
      expect(orden1.esActiva()).toBe(false);

      const orden2 = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 10,
        precioUnitario: 2.0,
      });
      orden2.ejecutarParcial(4);
      expect(orden2.estado).toBe('PARCIAL');
      orden2.cancelar();
      expect(orden2.estado).toBe('CANCELADA');
      expect(orden2.cantidadRestante).toBe(6);
      expect(orden2.esActiva()).toBe(false);
    });

    it('debe rechazar cancelar una orden que ya está COMPLETADA o CANCELADA', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 2,
        precioUnitario: 1.0,
      });
      orden.ejecutarParcial(2);
      expect(orden.estado).toBe('COMPLETADA');

      expect(() => orden.cancelar()).toThrow(ReglaDeNegocioException);

      const orden2 = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 2,
        precioUnitario: 1.0,
      });
      orden2.cancelar();
      expect(() => orden2.cancelar()).toThrow(ReglaDeNegocioException);
    });

    it('debe rechazar ejecutar cantidad mayor a cantidadRestante o negativa', () => {
      const orden = Orden.crearVenta({
        usuarioId,
        jugadorId,
        cantidad: 5,
        precioUnitario: 2.0,
      });

      expect(() => orden.ejecutarParcial(0)).toThrow(ReglaDeNegocioException);
      expect(() => orden.ejecutarParcial(-1)).toThrow(ReglaDeNegocioException);
      expect(() => orden.ejecutarParcial(6)).toThrow(ReglaDeNegocioException);
    });

    it('debe rechazar ejecutar o cancelar órdenes de tipo COMPRA', () => {
      const ordenCompra = Orden.crearCompra({
        usuarioId,
        jugadorId,
        tipoMercado: 'PRIMARIO',
        cantidad: 1,
        precioUnitario: 1.0,
      });

      expect(() => ordenCompra.ejecutarParcial(1)).toThrow(ReglaDeNegocioException);
      expect(() => ordenCompra.cancelar()).toThrow(ReglaDeNegocioException);
    });

    it('debe validar invariantes al recrear una orden', () => {
      expect(() =>
        Orden.recrear({
          id: '1',
          usuarioId: '',
          jugadorId,
          tipo: 'VENTA',
          tipoMercado: 'SECUNDARIO',
          cantidad: 10,
          cantidadRestante: 10,
          precioUnitario: Dinero.desdeMonto(1),
          estado: 'PENDIENTE',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Orden.recrear({
          id: '1',
          usuarioId,
          jugadorId: '  ',
          tipo: 'VENTA',
          tipoMercado: 'SECUNDARIO',
          cantidad: 10,
          cantidadRestante: 10,
          precioUnitario: Dinero.desdeMonto(1),
          estado: 'PENDIENTE',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Orden.recrear({
          id: '1',
          usuarioId,
          jugadorId,
          tipo: 'VENTA',
          tipoMercado: 'SECUNDARIO',
          cantidad: 10,
          cantidadRestante: 15,
          precioUnitario: Dinero.desdeMonto(1),
          estado: 'PENDIENTE',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Orden.recrear({
          id: '1',
          usuarioId,
          jugadorId,
          tipo: 'COMPRA',
          tipoMercado: 'PRIMARIO',
          cantidad: 10,
          cantidadRestante: 5,
          precioUnitario: Dinero.desdeMonto(1),
          estado: 'PENDIENTE',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }),
      ).toThrow(ReglaDeNegocioException);
    });
  });
});
