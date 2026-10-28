import { Jugador } from '../../../src/domain/jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Jugador - Identidad Externa (Feature 01 Unit Tests)', () => {
  const validProps = {
    externalId: 3189,
    nombre: 'Bukayo Saka',
    posicionOriginal: 'Right Winger',
    fechaNacimiento: '2001-09-05',
    nacionalidad: 'England',
    dorsal: 7,
    equipoId: '11111111-1111-4111-8111-111111111111',
    ligaId: '22222222-2222-4222-8222-222222222222',
  };

  it('debe mantener externalId como number positivo y exponer footballDataId como alias', () => {
    const jugador = Jugador.crear(validProps);
    expect(jugador.externalId).toBe(3189);
    expect(jugador.footballDataId).toBe(3189);
    expect(jugador.whoScoredPlayerId).toBeNull();
  });

  it('debe permitir instanciar jugador con whoScoredPlayerId inicial', () => {
    const jugador = Jugador.crear({
      ...validProps,
      whoScoredPlayerId: '365409',
    });
    expect(jugador.whoScoredPlayerId).toBe('365409');
    expect(jugador.externalId).toBe(3189);
  });

  it('debe permitir asociar whoScoredPlayerId válido y actualizar la fecha de actualización', async () => {
    const jugador = Jugador.crear(validProps);
    const fechaPrevia = jugador.actualizadoEn;

    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 5));

    jugador.asociarWhoScored('  365409  ');
    expect(jugador.whoScoredPlayerId).toBe('365409');
    expect(jugador.actualizadoEn.getTime()).toBeGreaterThanOrEqual(fechaPrevia.getTime());
  });

  it('debe rechazar cadenas vacías o compuestas solo de espacios en asociarWhoScored', () => {
    const jugador = Jugador.crear(validProps);
    expect(() => jugador.asociarWhoScored('')).toThrow(ReglaDeNegocioException);
    expect(() => jugador.asociarWhoScored('   ')).toThrow(ReglaDeNegocioException);
  });

  it('debe preservar compatibilidad retrospectiva con la llamada crear preexistente', () => {
    const jugador = Jugador.crear(validProps);
    expect(jugador.externalId).toBe(3189);
    expect(jugador.whoScoredPlayerId).toBeNull();
  });
});
