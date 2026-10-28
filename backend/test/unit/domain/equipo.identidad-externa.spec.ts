import { Equipo } from '../../../src/domain/equipo.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Equipo - Identidad Externa (Feature 01 Unit Tests)', () => {
  const validProps = {
    externalId: 57,
    nombre: 'Arsenal FC',
    nombreCorto: 'Arsenal',
    tla: 'ARS',
    escudoUrl: 'https://crests.football-data.org/57.png',
    ligaId: '22222222-2222-4222-8222-222222222222',
  };

  it('debe mantener externalId como number positivo y exponer footballDataId como alias', () => {
    const equipo = Equipo.crear(validProps);
    expect(equipo.externalId).toBe(57);
    expect(equipo.footballDataId).toBe(57);
    expect(equipo.whoScoredTeamId).toBeNull();
  });

  it('debe permitir instanciar equipo con whoScoredTeamId inicial', () => {
    const equipo = Equipo.crear({
      ...validProps,
      whoScoredTeamId: '13',
    });
    expect(equipo.whoScoredTeamId).toBe('13');
    expect(equipo.externalId).toBe(57);
  });

  it('debe permitir asociar whoScoredTeamId válido y actualizar la fecha de actualización', async () => {
    const equipo = Equipo.crear(validProps);
    const fechaPrevia = equipo.actualizadoEn;

    await new Promise((resolve) => setTimeout(resolve, 5));

    equipo.asociarWhoScored('  13  ');
    expect(equipo.whoScoredTeamId).toBe('13');
    expect(equipo.actualizadoEn.getTime()).toBeGreaterThanOrEqual(fechaPrevia.getTime());
  });

  it('debe rechazar cadenas vacías o compuestas solo de espacios en asociarWhoScored', () => {
    const equipo = Equipo.crear(validProps);
    expect(() => equipo.asociarWhoScored('')).toThrow(ReglaDeNegocioException);
    expect(() => equipo.asociarWhoScored('   ')).toThrow(ReglaDeNegocioException);
  });
});
