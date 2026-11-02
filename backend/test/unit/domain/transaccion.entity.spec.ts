import { Transaccion, TipoMercadoTransaccion } from '../../../src/domain/transaccion.entity';
import { Dinero } from '../../../src/domain/dinero.value-object';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Transaccion (Domain Entity - Inmutable)', () => {
  const ordenId = '11111111-1111-1111-1111-111111111111';
  const jugadorId = '22222222-2222-2222-2222-222222222222';
  const compradorId = '33333333-3333-3333-3333-333333333333';
  const vendedorId = '44444444-4444-4444-4444-444444444444';

  it('debe crear una transacción inmutable válida calculando el montoTotal exacto en Dinero', () => {
    const tx = Transaccion.crear({
      ordenId,
      jugadorId,
      compradorId,
      vendedorId,
      cantidad: 3,
      precioUnitario: 1.5,
      tipoMercado: 'PRIMARIO',
      estrategiaCotizacion: 'GLOBAL_v1',
    });

    expect(tx.id).toBeDefined();
    expect(tx.ordenId).toBe(ordenId);
    expect(tx.jugadorId).toBe(jugadorId);
    expect(tx.compradorId).toBe(compradorId);
    expect(tx.vendedorId).toBe(vendedorId);
    expect(tx.cantidad).toBe(3);
    expect(tx.precioUnitario.aNumero()).toBe(1.5);
    expect(tx.montoTotal.aNumero()).toBe(4.5);
    expect(tx.montoTotal.centavos).toBe(450);
    expect(tx.tipoMercado).toBe('PRIMARIO');
    expect(tx.estrategiaCotizacion).toBe('GLOBAL_v1');
    expect(tx.creadoEn).toBeInstanceOf(Date);
  });

  it('debe rechazar la transacción si compradorId es igual a vendedorId (prohibición de wash trading)', () => {
    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId: vendedorId,
        vendedorId: vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'SECUNDARIO',
        estrategiaCotizacion: 'POSICIONAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe exigir obligatoriamente el campo estrategiaCotizacion no vacío', () => {
    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: '',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: '   ',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar cantidad menor a 1 o no entera', () => {
    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 0,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 1.5,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar precioUnitario menor o igual a cero', () => {
    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 1,
        precioUnitario: 0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe validar montoTotal explícito y campos de identidad no vacíos', () => {
    const tx = Transaccion.crear({
      ordenId,
      jugadorId,
      compradorId,
      vendedorId,
      cantidad: 2,
      precioUnitario: 1.5,
      montoTotal: 3.0,
      tipoMercado: 'PRIMARIO',
      estrategiaCotizacion: 'GLOBAL_v1',
    });
    expect(tx.montoTotal.aNumero()).toBe(3.0);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 2,
        precioUnitario: 1.5,
        montoTotal: 5.0, // Incoherente con 2 * 1.5 = 3.0
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId: '',
        jugadorId,
        compradorId,
        vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId: '',
        compradorId,
        vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId: '',
        vendedorId,
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Transaccion.crear({
        ordenId,
        jugadorId,
        compradorId,
        vendedorId: '',
        cantidad: 1,
        precioUnitario: 1.0,
        tipoMercado: 'PRIMARIO',
        estrategiaCotizacion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });
});
