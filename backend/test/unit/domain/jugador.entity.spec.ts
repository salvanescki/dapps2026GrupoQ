import {
  Jugador,
  CriterioFiltroJugador,
} from '../../../src/domain/jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Jugador Entity (Domain Model Unit Tests)', () => {
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

  it('debe instanciar correctamente un jugador con datos válidos y normalizar la posición a Delantero', () => {
    const jugador = Jugador.crear(validProps);

    expect(jugador.id).toBeDefined();
    expect(jugador.externalId).toBe(3189);
    expect(jugador.nombre).toBe('Bukayo Saka');
    expect(jugador.posicion).toBe('Delantero');
    expect(jugador.posicionOriginal).toBe('Right Winger');
    expect(jugador.nacionalidad).toBe('England');
    expect(jugador.dorsal).toBe(7);
    expect(jugador.equipoId).toBe(validProps.equipoId);
    expect(jugador.ligaId).toBe(validProps.ligaId);
    expect(jugador.activo).toBe(true);
    expect(jugador.creadoEn).toBeInstanceOf(Date);
  });

  describe('Normalización de Posición', () => {
    it('debe normalizar Goalkeeper y Arquero como Portero', () => {
      expect(Jugador.normalizarPosicion('Goalkeeper')).toBe('Portero');
      expect(Jugador.normalizarPosicion('Arquero')).toBe('Portero');
    });

    it('debe normalizar Defence, Centre-Back, Left-Back como Defensa', () => {
      expect(Jugador.normalizarPosicion('Defence')).toBe('Defensa');
      expect(Jugador.normalizarPosicion('Centre-Back')).toBe('Defensa');
      expect(Jugador.normalizarPosicion('Right-Back')).toBe('Defensa');
    });

    it('debe normalizar Midfield, Defensive Midfield, Central Midfield como Mediocampista', () => {
      expect(Jugador.normalizarPosicion('Midfield')).toBe('Mediocampista');
      expect(Jugador.normalizarPosicion('Central Midfield')).toBe('Mediocampista');
      expect(Jugador.normalizarPosicion('Attacking Midfield')).toBe('Mediocampista');
    });

    it('debe normalizar Offence, Forward, Winger, Striker como Delantero', () => {
      expect(Jugador.normalizarPosicion('Offence')).toBe('Delantero');
      expect(Jugador.normalizarPosicion('Forward')).toBe('Delantero');
      expect(Jugador.normalizarPosicion('Striker')).toBe('Delantero');
      expect(Jugador.normalizarPosicion('Left Winger')).toBe('Delantero');
    });

    it('debe retornar No Clasificado para posiciones desconocidas o nulas', () => {
      expect(Jugador.normalizarPosicion(null)).toBe('No Clasificado');
      expect(Jugador.normalizarPosicion(undefined)).toBe('No Clasificado');
      expect(Jugador.normalizarPosicion('Coach')).toBe('No Clasificado');
    });
  });

  describe('Invariantes y Reglas de Validación', () => {
    it('debe lanzar excepción si el nombre tiene menos de 2 caracteres', () => {
      expect(() =>
        Jugador.crear({
          ...validProps,
          nombre: 'A',
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe lanzar excepción si el nombre está vacío', () => {
      expect(() =>
        Jugador.crear({
          ...validProps,
          nombre: '',
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe lanzar excepción si el externalId no es un entero positivo', () => {
      expect(() =>
        Jugador.crear({
          ...validProps,
          externalId: 0,
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Jugador.crear({
          ...validProps,
          externalId: -5,
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe lanzar excepción si falta equipoId o ligaId', () => {
      expect(() =>
        Jugador.crear({
          ...validProps,
          equipoId: '',
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Jugador.crear({
          ...validProps,
          ligaId: '',
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe validar que el dorsal esté entre 1 y 99 si está presente', () => {
      expect(() =>
        Jugador.crear({
          ...validProps,
          dorsal: 0,
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Jugador.crear({
          ...validProps,
          dorsal: 100,
        }),
      ).toThrow(ReglaDeNegocioException);

      expect(() =>
        Jugador.crear({
          ...validProps,
          dorsal: null,
        }),
      ).not.toThrow();
    });
  });

  describe('Comportamiento de Dominio', () => {
    it('debe actualizar el equipo y liga correctamente', () => {
      const jugador = Jugador.crear(validProps);
      const nuevoEquipoId = '33333333-3333-4333-8333-333333333333';
      const nuevaLigaId = '44444444-4444-4444-8444-444444444444';

      jugador.actualizarEquipo(nuevoEquipoId, nuevaLigaId);

      expect(jugador.equipoId).toBe(nuevoEquipoId);
      expect(jugador.ligaId).toBe(nuevaLigaId);
    });

    it('debe desactivar y reactivar el jugador', () => {
      const jugador = Jugador.crear(validProps);
      expect(jugador.activo).toBe(true);

      jugador.desactivar();
      expect(jugador.activo).toBe(false);

      jugador.activar();
      expect(jugador.activo).toBe(true);
    });

    it('debe verificar si coincide con filtros y búsquedas textuales insensibles a mayúsculas y acentos', () => {
      const jugador = Jugador.crear({
        ...validProps,
        nombre: 'Luka Modrić',
        posicionOriginal: 'Central Midfield',
      });

      // Búsqueda coincidente con acentos/mayúsculas
      const criterioMatch = new CriterioFiltroJugador({
        busqueda: 'modric',
        posicion: 'Mediocampista',
      });
      expect(jugador.coincideConFiltros(criterioMatch)).toBe(true);

      // Búsqueda no coincidente
      const criterioMismatch = new CriterioFiltroJugador({
        busqueda: 'messi',
      });
      expect(jugador.coincideConFiltros(criterioMismatch)).toBe(false);

      // Posición no coincidente
      const criterioPosMismatch = new CriterioFiltroJugador({
        posicion: 'Delantero',
      });
      expect(jugador.coincideConFiltros(criterioPosMismatch)).toBe(false);
    });
  });
});
