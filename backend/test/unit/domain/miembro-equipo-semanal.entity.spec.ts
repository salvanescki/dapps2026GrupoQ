import { MiembroEquipoSemanal } from '../../../src/domain/miembro-equipo-semanal.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('MiembroEquipoSemanal Entity (Domain Unit Tests)', () => {
  const propsValidas = {
    equipoSemanalId: 'eq-10000000-0000-0000-0000-000000000001',
    jugadorId: 'j-10000000-0000-0000-0000-000000000001',
    nombre: 'Lionel Messi',
    equipoNombre: 'Inter Miami',
    posicion: 'Delantero' as const,
    cotizacion: 25.5,
    score: 0.95,
    orden: 10,
  };

  it('Happy path: debe crear un miembro con valores válidos y exponer sus getters', () => {
    const miembro = MiembroEquipoSemanal.crear(propsValidas);

    expect(miembro.id).toBeDefined();
    expect(miembro.equipoSemanalId).toBe(propsValidas.equipoSemanalId);
    expect(miembro.jugadorId).toBe(propsValidas.jugadorId);
    expect(miembro.nombre).toBe('Lionel Messi');
    expect(miembro.equipoNombre).toBe('Inter Miami');
    expect(miembro.posicion).toBe('Delantero');
    expect(miembro.cotizacion).toBe(25.5);
    expect(miembro.score).toBe(0.95);
    expect(miembro.orden).toBe(10);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si la cotización es menor a 1.00', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        cotizacion: 0.99,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si el score es mayor a 1.0 o menor a 0.0', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        score: 1.0001,
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        score: -0.01,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si el nombre está vacío', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        nombre: '   ',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si el equipoNombre está vacío', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        equipoNombre: '',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si la posición táctica no es válida', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        posicion: 'No Clasificado' as any,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si el orden táctico está fuera de 1..11', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        orden: 0,
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        orden: 12,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('Invariante: debe arrojar ReglaDeNegocioException si falta equipoSemanalId o jugadorId', () => {
    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        equipoSemanalId: '',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      MiembroEquipoSemanal.crear({
        ...propsValidas,
        jugadorId: '  ',
      }),
    ).toThrow(ReglaDeNegocioException);
  });
});

