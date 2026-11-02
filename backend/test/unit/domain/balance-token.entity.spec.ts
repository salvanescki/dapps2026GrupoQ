import { BalanceToken } from '../../../src/domain/balance-token.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('BalanceToken Entity (Domain Unit Tests)', () => {
  const baseProps = {
    usuarioId: 'u1000000-0000-0000-0000-000000000001',
    jugadorId: 'j1000000-0000-0000-0000-000000000001',
  };

  it('debe instanciar con valores predeterminados (0 disponibles, 0 bloqueados)', () => {
    const balance = BalanceToken.crear(baseProps);
    expect(balance.id).toBeDefined();
    expect(balance.usuarioId).toBe(baseProps.usuarioId);
    expect(balance.jugadorId).toBe(baseProps.jugadorId);
    expect(balance.cantidadDisponible).toBe(0);
    expect(balance.cantidadBloqueada).toBe(0);
    expect(balance.cantidadTotal).toBe(0);
  });

  it('debe rechazar usuarioId o jugadorId vacíos', () => {
    expect(() =>
      BalanceToken.crear({ ...baseProps, usuarioId: '' }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      BalanceToken.crear({ ...baseProps, jugadorId: '   ' }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar cantidades negativas o no enteras en creación', () => {
    expect(() =>
      BalanceToken.crear({ ...baseProps, cantidadDisponible: -1 }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      BalanceToken.crear({ ...baseProps, cantidadDisponible: 5.5 }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      BalanceToken.crear({ ...baseProps, cantidadBloqueada: -5 }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe debitar disponibles si hay saldo suficiente y actualizar timestamp', () => {
    const balance = BalanceToken.crear({
      ...baseProps,
      cantidadDisponible: 100,
    });
    balance.debitarDisponibles(30);
    expect(balance.cantidadDisponible).toBe(70);
    expect(balance.cantidadTotal).toBe(70);

    expect(() => balance.debitarDisponibles(71)).toThrow(
      ReglaDeNegocioException,
    );
    expect(() => balance.debitarDisponibles(0)).toThrow(
      ReglaDeNegocioException,
    );
    expect(() => balance.debitarDisponibles(-5)).toThrow(
      ReglaDeNegocioException,
    );
    expect(() => balance.debitarDisponibles(2.5)).toThrow(
      ReglaDeNegocioException,
    );
  });

  it('debe bloquear tokens en custodia preventiva correctamente', () => {
    const balance = BalanceToken.crear({
      ...baseProps,
      cantidadDisponible: 50,
    });
    balance.bloquearTokens(20);
    expect(balance.cantidadDisponible).toBe(30);
    expect(balance.cantidadBloqueada).toBe(20);
    expect(balance.cantidadTotal).toBe(50);

    expect(() => balance.bloquearTokens(31)).toThrow(
      ReglaDeNegocioException,
    );
  });

  it('debe liberar tokens de custodia preventiva correctamente', () => {
    const balance = BalanceToken.crear({
      ...baseProps,
      cantidadDisponible: 30,
      cantidadBloqueada: 20,
    });
    balance.liberarTokens(15);
    expect(balance.cantidadDisponible).toBe(45);
    expect(balance.cantidadBloqueada).toBe(5);
    expect(balance.cantidadTotal).toBe(50);

    expect(() => balance.liberarTokens(6)).toThrow(
      ReglaDeNegocioException,
    );
  });

  it('debe debitar tokens bloqueados al liquidar orden', () => {
    const balance = BalanceToken.crear({
      ...baseProps,
      cantidadDisponible: 10,
      cantidadBloqueada: 40,
    });
    balance.debitarBloqueados(25);
    expect(balance.cantidadDisponible).toBe(10);
    expect(balance.cantidadBloqueada).toBe(15);
    expect(balance.cantidadTotal).toBe(25);

    expect(() => balance.debitarBloqueados(16)).toThrow(
      ReglaDeNegocioException,
    );
  });

  it('debe acreditar tokens al comprador correctamente', () => {
    const balance = BalanceToken.crear(baseProps);
    balance.acreditarTokens(15);
    expect(balance.cantidadDisponible).toBe(15);
    expect(balance.cantidadTotal).toBe(15);

    expect(() => balance.acreditarTokens(0)).toThrow(
      ReglaDeNegocioException,
    );
  });
});
