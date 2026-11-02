import { ConfiguracionMercado } from '../../../src/domain/configuracion-mercado.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('ConfiguracionMercado Entity (Domain Unit Tests)', () => {
  it('debe instanciar con valores predeterminados (GLOBAL, GLOBAL_v1, id = 1)', () => {
    const config = ConfiguracionMercado.crear();
    expect(config.id).toBe(1);
    expect(config.estrategiaActivaId).toBe('GLOBAL');
    expect(config.estrategiaActivaVersion).toBe('GLOBAL_v1');
    expect(config.actualizadoPor).toBeNull();
    expect(config.actualizadoEn).toBeInstanceOf(Date);
  });

  it('debe rechazar configuración con id distinto de 1', () => {
    expect(() =>
      ConfiguracionMercado.crear({
        id: 2,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar estrategia no reconocida o versiones incompatibles', () => {
    expect(() =>
      ConfiguracionMercado.crear({
        estrategiaActivaId: 'OTRA' as any,
        estrategiaActivaVersion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      ConfiguracionMercado.crear({
        estrategiaActivaId: 'GLOBAL',
        estrategiaActivaVersion: 'POSICIONAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      ConfiguracionMercado.crear({
        estrategiaActivaId: 'POSICIONAL',
        estrategiaActivaVersion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe permitir cambiar estrategia a POSICIONAL_v1 y de vuelta a GLOBAL_v1', () => {
    const config = ConfiguracionMercado.crear();
    const adminId = 'a0000000-0000-0000-0000-000000000001';

    config.cambiarEstrategia('POSICIONAL', 'POSICIONAL_v1', adminId);
    expect(config.estrategiaActivaId).toBe('POSICIONAL');
    expect(config.estrategiaActivaVersion).toBe('POSICIONAL_v1');
    expect(config.actualizadoPor).toBe(adminId);

    config.cambiarEstrategia('GLOBAL', 'GLOBAL_v1', adminId);
    expect(config.estrategiaActivaId).toBe('GLOBAL');
    expect(config.estrategiaActivaVersion).toBe('GLOBAL_v1');
  });

  it('debe rechazar cambio de estrategia si adminId es vacío', () => {
    const config = ConfiguracionMercado.crear();
    expect(() =>
      config.cambiarEstrategia('POSICIONAL', 'POSICIONAL_v1', ''),
    ).toThrow(ReglaDeNegocioException);
    expect(() =>
      config.cambiarEstrategia('POSICIONAL', 'POSICIONAL_v1', '   '),
    ).toThrow(ReglaDeNegocioException);
  });
});
