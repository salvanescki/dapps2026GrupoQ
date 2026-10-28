import {
  EstadisticaJugador,
  EstadisticaJugadorProps,
} from '../../../src/scraping/domain/estadistica-jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EstadisticaJugador Domain Entity', () => {
  const baseProps: EstadisticaJugadorProps = {
    jugadorId: '11111111-1111-4111-8111-111111111111',
    temporada: '2025/2026',
    liga: 'PL',
    fuente: 'whoscored',
    fechaActualizacion: new Date(),
    partidosJugados: 10,
    minutosJugados: 900,
    goles: 5,
    asistencias: 3,
    tirosPorPartido: 2.5,
    precisionPase: 85.5,
    duelosAereosGanadosPorPartido: 1.2,
    rating: 7.45,
    tarjetasAmarillas: 1,
    tarjetasRojas: 0,
    regatesCompletadosPorPartido: 1.8,
    pasesClavePorPartido: 2.1,
    xgPorPartido: 0.45,
    xaPorPartido: 0.35,
    grandesOcasionesPorPartido: 0.8,
    entradasPorPartido: 1.1,
    intercepccionesPorPartido: 0.7,
    despejesPorPartido: 0.3,
    pasesPorPartido: 35.4,
    centrosPorPartido: 1.5,
    atajadas: null,
    golesRecibidos: null,
    porcentajeAtajadas: null,
    erroresQueGeneraronGol: 0,
    autogoles: 0,
  };

  it('debe instanciar correctamente con props válidos para jugador de campo', () => {
    const stats = EstadisticaJugador.crear(baseProps);

    expect(stats.id).toBeDefined();
    expect(stats.jugadorId).toBe(baseProps.jugadorId);
    expect(stats.temporada).toBe('2025/2026');
    expect(stats.liga).toBe('PL');
    expect(stats.fuente).toBe('whoscored');
    expect(stats.partidosJugados).toBe(10);
    expect(stats.minutosJugados).toBe(900);
    expect(stats.goles).toBe(5);
    expect(stats.asistencias).toBe(3);
    expect(stats.rating).toBe(7.45);
    expect(stats.precisionPase).toBe(85.5);
    expect(stats.atajadas).toBeNull();
  });

  it('debe instanciar correctamente para portero con métricas de arquero', () => {
    const arqueroProps: EstadisticaJugadorProps = {
      ...baseProps,
      goles: 0,
      asistencias: 0,
      atajadas: 3.8,
      golesRecibidos: 12,
      porcentajeAtajadas: 78.5,
      tirosPorPartido: null,
      xgPorPartido: null,
      xaPorPartido: null,
    };

    const stats = EstadisticaJugador.crear(arqueroProps);
    expect(stats.atajadas).toBe(3.8);
    expect(stats.golesRecibidos).toBe(12);
    expect(stats.porcentajeAtajadas).toBe(78.5);
  });

  it('debe utilizar valores por defecto (0) cuando los contadores numéricos son omitidos', () => {
    const stats = EstadisticaJugador.crear({
      jugadorId: baseProps.jugadorId,
      temporada: baseProps.temporada,
      liga: baseProps.liga,
    } as any);

    expect(stats.partidosJugados).toBe(0);
    expect(stats.minutosJugados).toBe(0);
    expect(stats.goles).toBe(0);
    expect(stats.asistencias).toBe(0);
    expect(stats.tarjetasAmarillas).toBe(0);
    expect(stats.tarjetasRojas).toBe(0);
    expect(stats.fuente).toBe('whoscored');
  });

  describe('Invariantes y validaciones', () => {
    it('debe fallar si jugadorId está vacío', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, jugadorId: '' }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si temporada está vacía', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, temporada: '  ' }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si liga está vacía', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, liga: '' }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si goles es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, goles: -1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si asistencias es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, asistencias: -1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si partidosJugados es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, partidosJugados: -1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si minutosJugados es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, minutosJugados: -5 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si rating está fuera de [0, 10]', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, rating: -0.1 }),
      ).toThrow(ReglaDeNegocioException);
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, rating: 10.01 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe aceptar rating en límites exactos 0 y 10 o null', () => {
      expect(EstadisticaJugador.crear({ ...baseProps, rating: 0 }).rating).toBe(0);
      expect(EstadisticaJugador.crear({ ...baseProps, rating: 10 }).rating).toBe(10);
      expect(EstadisticaJugador.crear({ ...baseProps, rating: null }).rating).toBeNull();
    });

    it('debe fallar si tarjetasAmarillas es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, tarjetasAmarillas: -1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si tarjetasRojas es negativo', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, tarjetasRojas: -1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si precisionPase está fuera de [0, 100]', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, precisionPase: -1 }),
      ).toThrow(ReglaDeNegocioException);
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, precisionPase: 100.1 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe aceptar precisionPase en límites exactos 0 y 100 o null', () => {
      expect(EstadisticaJugador.crear({ ...baseProps, precisionPase: 0 }).precisionPase).toBe(0);
      expect(EstadisticaJugador.crear({ ...baseProps, precisionPase: 100 }).precisionPase).toBe(100);
      expect(EstadisticaJugador.crear({ ...baseProps, precisionPase: null }).precisionPase).toBeNull();
    });

    it('debe fallar si porcentajeAtajadas está fuera de [0, 100]', () => {
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, porcentajeAtajadas: -0.5 }),
      ).toThrow(ReglaDeNegocioException);
      expect(() =>
        EstadisticaJugador.crear({ ...baseProps, porcentajeAtajadas: 101 }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe aceptar porcentajeAtajadas en límites exactos 0 y 100 o null', () => {
      expect(EstadisticaJugador.crear({ ...baseProps, porcentajeAtajadas: 0 }).porcentajeAtajadas).toBe(0);
      expect(EstadisticaJugador.crear({ ...baseProps, porcentajeAtajadas: 100 }).porcentajeAtajadas).toBe(100);
      expect(EstadisticaJugador.crear({ ...baseProps, porcentajeAtajadas: null }).porcentajeAtajadas).toBeNull();
    });
  });

  describe('Métodos de actualización y dominio', () => {
    it('debe permitir actualizar estadísticas manteniendo el id', () => {
      const stats = EstadisticaJugador.crear(baseProps);
      const nuevaFecha = new Date();
      stats.actualizarEstadisticas({
        ...baseProps,
        goles: 8,
        minutosJugados: 1200,
        fechaActualizacion: nuevaFecha,
        atajadas: 3.5,
        golesRecibidos: 10,
        porcentajeAtajadas: 75.0,
        erroresQueGeneraronGol: 1,
        autogoles: 2,
        regatesCompletadosPorPartido: 3.1,
        pasesClavePorPartido: 2.5,
        xgPorPartido: 0.8,
        xaPorPartido: 0.4,
        grandesOcasionesPorPartido: 1.2,
        entradasPorPartido: 2.0,
        intercepccionesPorPartido: 1.5,
        despejesPorPartido: 1.0,
        pasesPorPartido: 45.0,
        centrosPorPartido: 3.0,
        duelosAereosGanadosPorPartido: 2.1,
        precisionPase: 88.0,
        rating: 8.0,
        tarjetasAmarillas: 2,
        tarjetasRojas: 1,
        tirosPorPartido: 4.0,
        asistencias: 5,
        partidosJugados: 15,
      });

      expect(stats.goles).toBe(8);
      expect(stats.minutosJugados).toBe(1200);
      expect(stats.fechaActualizacion).toBe(nuevaFecha);
      expect(stats.atajadas).toBe(3.5);
      expect(stats.golesRecibidos).toBe(10);
      expect(stats.porcentajeAtajadas).toBe(75.0);
      expect(stats.erroresQueGeneraronGol).toBe(1);
      expect(stats.autogoles).toBe(2);
      expect(stats.regatesCompletadosPorPartido).toBe(3.1);
      expect(stats.pasesClavePorPartido).toBe(2.5);
      expect(stats.xgPorPartido).toBe(0.8);
      expect(stats.xaPorPartido).toBe(0.4);
      expect(stats.grandesOcasionesPorPartido).toBe(1.2);
      expect(stats.entradasPorPartido).toBe(2.0);
      expect(stats.intercepccionesPorPartido).toBe(1.5);
      expect(stats.despejesPorPartido).toBe(1.0);
      expect(stats.pasesPorPartido).toBe(45.0);
      expect(stats.centrosPorPartido).toBe(3.0);
      expect(stats.duelosAereosGanadosPorPartido).toBe(2.1);
      expect(stats.precisionPase).toBe(88.0);
      expect(stats.rating).toBe(8.0);
      expect(stats.tarjetasAmarillas).toBe(2);
      expect(stats.tarjetasRojas).toBe(1);
      expect(stats.tirosPorPartido).toBe(4.0);
      expect(stats.asistencias).toBe(5);
      expect(stats.partidosJugados).toBe(15);
    });
  });
});
