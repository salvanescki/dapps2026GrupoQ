import {
  Jugador,
  CriterioFiltroJugador,
  POSICIONES_VALIDAS,
  PosicionJugador,
} from '../../../src/domain/jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';
import { Equipo } from '../../../src/domain/equipo.entity';
import { Liga } from '../../../src/domain/liga.entity';

describe('Jugador Entity - Edge Cases and Complete Branches', () => {
  const baseProps = {
    externalId: 9999,
    nombre: 'Lionel Messi',
    equipoId: '11111111-1111-4111-8111-111111111111',
    ligaId: '22222222-2222-4222-8222-222222222222',
  };

  it('debe lanzar excepcion si el nombre excede 150 caracteres', () => {
    expect(() =>
      Jugador.crear({
        ...baseProps,
        nombre: 'A'.repeat(151),
      })
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe lanzar excepcion si la posicion explicita no es valida', () => {
    expect(() =>
      Jugador.crear({
        ...baseProps,
        posicion: 'PosicionInvalida' as PosicionJugador,
      })
    ).toThrow(/no es válida/);
  });

  it('debe lanzar excepcion si el externalId es flotante o menor o igual a cero', () => {
    expect(() =>
      Jugador.crear({
        ...baseProps,
        externalId: 10.5,
      })
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe lanzar excepcion al actualizar equipo si nuevoEquipoId o nuevaLigaId son vacios', () => {
    const jugador = Jugador.crear(baseProps);

    expect(() => jugador.actualizarEquipo('', 'valid-liga')).toThrow(
      'El nuevo equipoId es requerido.'
    );
    expect(() => jugador.actualizarEquipo('   ', 'valid-liga')).toThrow(
      'El nuevo equipoId es requerido.'
    );
    expect(() => jugador.actualizarEquipo('valid-team', '')).toThrow(
      'La nueva ligaId es requerida.'
    );
    expect(() => jugador.actualizarEquipo('valid-team', '   ')).toThrow(
      'La nueva ligaId es requerida.'
    );
  });

  it('debe retornar todos los getters correctamente incluyendo equipo, liga, fechaNacimiento y actualizadoEn', () => {
    const equipo = Equipo.crear({
      externalId: 50,
      nombre: 'Inter Miami',
      ligaId: baseProps.ligaId,
    });
    const liga = Liga.crear({
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
    });

    const jugador = Jugador.crear({
      ...baseProps,
      fechaNacimiento: '1987-06-24',
      nacionalidad: 'Argentina',
      dorsal: 10,
      equipo,
      liga,
    });

    expect(jugador.fechaNacimiento).toBe('1987-06-24');
    expect(jugador.nacionalidad).toBe('Argentina');
    expect(jugador.dorsal).toBe(10);
    expect(jugador.equipo).toBe(equipo);
    expect(jugador.liga).toBe(liga);
    expect(jugador.actualizadoEn).toBeInstanceOf(Date);
  });

  it('debe cubrir ramas de normalizarPosicion para todas las variantes', () => {
    expect(Jugador.normalizarPosicion('portero')).toBe('Portero');
    expect(Jugador.normalizarPosicion('defender')).toBe('Defensa');
    expect(Jugador.normalizarPosicion('defensa central')).toBe('Defensa');
    expect(Jugador.normalizarPosicion('back')).toBe('Defensa');
    expect(Jugador.normalizarPosicion('volante')).toBe('Mediocampista');
    expect(Jugador.normalizarPosicion('defensive midfield')).toBe('Mediocampista');
    expect(Jugador.normalizarPosicion('mediocampista ofensivo')).toBe('Mediocampista');
    expect(Jugador.normalizarPosicion('winger')).toBe('Delantero');
    expect(Jugador.normalizarPosicion('striker')).toBe('Delantero');
    expect(Jugador.normalizarPosicion('delantero')).toBe('Delantero');
    expect(Jugador.normalizarPosicion('extremo izquierdo')).toBe('Delantero');
    expect(Jugador.normalizarPosicion('punta')).toBe('Delantero');
    expect(Jugador.normalizarPosicion('Desconocida total')).toBe('No Clasificado');
  });

  it('debe cubrir ramas de coincideConFiltros para equipoId y busqueda con y sin coincidencia', () => {
    const jugador = Jugador.crear({
      ...baseProps,
      nombre: 'Ángel Di María',
    });

    // Filtro con equipo coincidente
    const filtroEquipoCoincide = new CriterioFiltroJugador({
      equipoId: baseProps.equipoId,
    });
    expect(jugador.coincideConFiltros(filtroEquipoCoincide)).toBe(true);

    // Filtro con equipo no coincidente
    const filtroEquipoDiferente = new CriterioFiltroJugador({
      equipoId: '99999999-9999-4999-8999-999999999999',
    });
    expect(jugador.coincideConFiltros(filtroEquipoDiferente)).toBe(false);

    // Filtro con búsqueda normalizada con diacríticos
    const filtroDiacriticos = new CriterioFiltroJugador({
      busqueda: 'angel di maria',
    });
    expect(jugador.coincideConFiltros(filtroDiacriticos)).toBe(true);

    // Filtro sin criterios
    const filtroVacio = new CriterioFiltroJugador({});
    expect(jugador.coincideConFiltros(filtroVacio)).toBe(true);
    expect(filtroVacio.offset).toBe(0);
  });
});
