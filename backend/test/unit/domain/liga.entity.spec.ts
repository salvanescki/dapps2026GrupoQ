import { Liga, CODIGOS_LIGA_VALIDOS } from '../../../src/domain/liga.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Liga Domain Entity', () => {
  const validProps = {
    codigo: 'PL',
    nombre: 'Premier League',
    pais: 'Inglaterra',
    emblemaUrl: 'https://example.com/pl.png',
  };

  it('deberia crear una liga con propiedades validas', () => {
    const liga = Liga.crear(validProps);

    expect(liga).toBeDefined();
    expect(liga.id).toBeDefined();
    expect(liga.codigo).toBe('PL');
    expect(liga.nombre).toBe('Premier League');
    expect(liga.pais).toBe('Inglaterra');
    expect(liga.emblemaUrl).toBe('https://example.com/pl.png');
    expect(liga.activo).toBe(true);
    expect(liga.creadoEn).toBeInstanceOf(Date);
    expect(liga.actualizadoEn).toBeInstanceOf(Date);
  });

  it('deberia permitir crear una liga sin emblemaUrl', () => {
    const liga = Liga.crear({
      codigo: 'PD',
      nombre: 'Primera Division',
      pais: 'Espana',
    });

    expect(liga.emblemaUrl).toBeNull();
  });

  it('deberia crear ligas con todos los codigos validos soportados', () => {
    for (const code of CODIGOS_LIGA_VALIDOS) {
      const liga = Liga.crear({
        codigo: code.toLowerCase(),
        nombre: `Liga ${code}`,
        pais: 'Pais Test',
      });
      expect(liga.codigo).toBe(code);
    }
  });

  it('deberia lanzar excepcion si el codigo es vacio o inexistente', () => {
    expect(() =>
      Liga.crear({
        ...validProps,
        codigo: '',
      })
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Liga.crear({
        ...validProps,
        codigo: '   ',
      })
    ).toThrow('El código de la liga es obligatorio.');
  });

  it('deberia lanzar excepcion si el codigo no es uno de los permitidos', () => {
    expect(() =>
      Liga.crear({
        ...validProps,
        codigo: 'INVALID_CODE',
      })
    ).toThrow(/no es válido/);
  });

  it('deberia lanzar excepcion si el nombre es demasiado corto o largo', () => {
    expect(() =>
      Liga.crear({
        ...validProps,
        nombre: 'ab',
      })
    ).toThrow('El nombre de la liga es obligatorio y debe tener entre 3 y 100 caracteres.');

    expect(() =>
      Liga.crear({
        ...validProps,
        nombre: 'a'.repeat(101),
      })
    ).toThrow('El nombre de la liga es obligatorio y debe tener entre 3 y 100 caracteres.');
  });

  it('deberia lanzar excepcion si el pais es vacio', () => {
    expect(() =>
      Liga.crear({
        ...validProps,
        pais: '',
      })
    ).toThrow('El país de la liga es obligatorio.');

    expect(() =>
      Liga.crear({
        ...validProps,
        pais: '   ',
      })
    ).toThrow('El país de la liga es obligatorio.');
  });

  it('deberia permitir desactivar y reactivar la liga', () => {
    const liga = Liga.crear(validProps);
    expect(liga.activo).toBe(true);

    liga.desactivar();
    expect(liga.activo).toBe(false);

    liga.activar();
    expect(liga.activo).toBe(true);
  });
});
