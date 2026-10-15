import { Equipo } from '../../../src/domain/equipo.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Equipo Domain Entity', () => {
  const validProps = {
    externalId: 65,
    nombre: 'Manchester City FC',
    nombreCorto: 'Man City',
    tla: 'MCI',
    escudoUrl: 'https://example.com/crest.png',
    ligaId: '11111111-1111-4111-8111-111111111111',
  };

  it('deberia instanciar un equipo valido con todas sus propiedades', () => {
    const equipo = Equipo.crear(validProps);

    expect(equipo.id).toBeDefined();
    expect(equipo.externalId).toBe(65);
    expect(equipo.nombre).toBe('Manchester City FC');
    expect(equipo.nombreCorto).toBe('Man City');
    expect(equipo.tla).toBe('MCI');
    expect(equipo.escudoUrl).toBe('https://example.com/crest.png');
    expect(equipo.ligaId).toBe(validProps.ligaId);
    expect(equipo.creadoEn).toBeInstanceOf(Date);
    expect(equipo.actualizadoEn).toBeInstanceOf(Date);
  });

  it('deberia lanzar excepcion si el nombre tiene menos de 2 caracteres o esta vacio', () => {
    expect(() =>
      Equipo.crear({
        ...validProps,
        nombre: 'M',
      })
    ).toThrow('El nombre del equipo es obligatorio y debe tener al menos 2 caracteres.');

    expect(() =>
      Equipo.crear({
        ...validProps,
        nombre: '',
      })
    ).toThrow(ReglaDeNegocioException);
  });

  it('deberia lanzar excepcion si el externalId es menor o igual a cero o decimal', () => {
    expect(() =>
      Equipo.crear({
        ...validProps,
        externalId: 0,
      })
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Equipo.crear({
        ...validProps,
        externalId: 10.4,
      })
    ).toThrow(ReglaDeNegocioException);
  });

  it('deberia lanzar excepcion si ligaId esta vacio', () => {
    expect(() =>
      Equipo.crear({
        ...validProps,
        ligaId: '',
      })
    ).toThrow('El equipo debe pertenecer a una liga (ligaId es obligatorio).');

    expect(() =>
      Equipo.crear({
        ...validProps,
        ligaId: '   ',
      })
    ).toThrow(ReglaDeNegocioException);
  });

  it('deberia verificar si pertenece a una liga correctamente', () => {
    const equipo = Equipo.crear(validProps);

    expect(equipo.perteneceALiga(validProps.ligaId)).toBe(true);
    expect(equipo.perteneceALiga(validProps.ligaId.toUpperCase())).toBe(true);
    expect(equipo.perteneceALiga('otra-liga-id')).toBe(false);
    expect(equipo.perteneceALiga('')).toBe(false);
  });
});
