import { NotFoundException } from '@nestjs/common';
import { JugadorService } from '../../src/services/jugador.service';
import { Jugador } from '../../src/domain/jugador.entity';
import { EstadisticaJugador } from '../../src/scraping/domain/estadistica-jugador.entity';
import {
  IJugadorRepository,
  IEquipoRepository,
  ILigaRepository,
} from '../../src/domain/jugador.repository.interface';
import { IEstadisticaJugadorRepository } from '../../src/scraping/domain/estadistica-jugador.repository.interface';
import { SincronizacionJugadoresService } from '../../src/services/sincronizacion-jugadores.service';

describe('JugadorService.buscarPorId Unit Tests', () => {
  let service: JugadorService;
  let mockJugadorRepo: jest.Mocked<IJugadorRepository>;
  let mockEquipoRepo: jest.Mocked<IEquipoRepository>;
  let mockLigaRepo: jest.Mocked<ILigaRepository>;
  let mockEstadisticaRepo: jest.Mocked<IEstadisticaJugadorRepository>;
  let mockSincronizacionService: jest.Mocked<SincronizacionJugadoresService>;

  const jugadorMock = Jugador.crear({
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    externalId: 3189,
    nombre: 'Bukayo Saka',
    posicionOriginal: 'Right Winger',
    fechaNacimiento: '2001-09-05',
    nacionalidad: 'England',
    dorsal: 7,
    equipoId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    ligaId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  });

  beforeEach(() => {
    mockJugadorRepo = {
      buscarPorId: jest.fn(),
      buscarConFiltros: jest.fn(),
      guardar: jest.fn(),
      guardarMuchos: jest.fn(),
      buscarPorExternalId: jest.fn(),
      contar: jest.fn(),
    } as unknown as jest.Mocked<IJugadorRepository>;

    mockEquipoRepo = {
      buscarPorId: jest.fn(),
      listarTodos: jest.fn(),
      guardar: jest.fn(),
      guardarMuchos: jest.fn(),
      buscarPorExternalId: jest.fn(),
    } as unknown as jest.Mocked<IEquipoRepository>;

    mockLigaRepo = {
      buscarPorCodigo: jest.fn(),
      listarTodas: jest.fn(),
      guardar: jest.fn(),
      guardarMuchos: jest.fn(),
    } as unknown as jest.Mocked<ILigaRepository>;

    mockEstadisticaRepo = {
      guardar: jest.fn(),
      guardarMuchos: jest.fn(),
      buscarPorJugadorYTemporada: jest.fn(),
      buscarPorJugador: jest.fn(),
    };

    mockSincronizacionService = {
      sincronizarSiEsNecesario: jest.fn(),
      sincronizarLigasYPlanteles: jest.fn(),
    } as unknown as jest.Mocked<SincronizacionJugadoresService>;

    service = new JugadorService(
      mockJugadorRepo,
      mockEquipoRepo,
      mockLigaRepo,
      mockEstadisticaRepo,
      mockSincronizacionService,
    );
  });

  it('debe lanzar NotFoundException si el jugador no existe', async () => {
    mockJugadorRepo.buscarPorId.mockResolvedValue(null);

    await expect(service.buscarPorId('inexistente-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockJugadorRepo.buscarPorId).toHaveBeenCalledWith('inexistente-id');
    expect(mockEstadisticaRepo.buscarPorJugador).not.toHaveBeenCalled();
  });

  it('debe retornar jugador con estadisticas: null si no tiene registros de WhoScored', async () => {
    mockJugadorRepo.buscarPorId.mockResolvedValue(jugadorMock);
    mockEstadisticaRepo.buscarPorJugador.mockResolvedValue([]);

    const resultado = await service.buscarPorId(jugadorMock.id);

    expect(resultado.id).toBe(jugadorMock.id);
    expect(resultado.nombre).toBe('Bukayo Saka');
    expect(resultado.estadisticas).toBeNull();
    expect(mockEstadisticaRepo.buscarPorJugador).toHaveBeenCalledWith(
      jugadorMock.id,
    );
  });

  it('debe retornar jugador con estadisticas pobladas cuando existen métricas completas', async () => {
    const estadisticaMock = EstadisticaJugador.crear({
      jugadorId: jugadorMock.id,
      temporada: '2024/2025',
      liga: 'Premier League',
      partidosJugados: 35,
      minutosJugados: 2980,
      goles: 14,
      asistencias: 10,
      tarjetasAmarillas: 3,
      tarjetasRojas: 0,
      rating: 7.45,
      tirosPorPartido: 2.3,
      precisionPase: 82.1,
      duelosAereosGanadosPorPartido: 1.5,
      regatesCompletadosPorPartido: 1.8,
      pasesClavePorPartido: 1.2,
      xgPorPartido: 0.41,
      xaPorPartido: 0.29,
      grandesOcasionesPorPartido: 0.5,
      entradasPorPartido: 1.1,
      intercepccionesPorPartido: 0.8,
      despejesPorPartido: 0.6,
      pasesPorPartido: 35.2,
      centrosPorPartido: 1.4,
      atajadas: 45,
      golesRecibidos: 22,
      porcentajeAtajadas: 74.5,
      erroresQueGeneraronGol: 1,
      autogoles: 0,
    });

    mockJugadorRepo.buscarPorId.mockResolvedValue(jugadorMock);
    mockEstadisticaRepo.buscarPorJugador.mockResolvedValue([estadisticaMock]);

    const resultado = await service.buscarPorId(jugadorMock.id);

    expect(resultado.id).toBe(jugadorMock.id);
    expect(resultado.estadisticas).toBeDefined();
    expect(resultado.estadisticas?.temporada).toBe('2024/2025');
    expect(resultado.estadisticas?.liga).toBe('Premier League');
    expect(resultado.estadisticas?.partidosJugados).toBe(35);
    expect(resultado.estadisticas?.minutosJugados).toBe(2980);
    expect(resultado.estadisticas?.goles).toBe(14);
    expect(resultado.estadisticas?.asistencias).toBe(10);
    expect(resultado.estadisticas?.tarjetasAmarillas).toBe(3);
    expect(resultado.estadisticas?.tarjetasRojas).toBe(0);
    expect(resultado.estadisticas?.rating).toBe(7.45);
    expect(resultado.estadisticas?.tirosPorPartido).toBe(2.3);
    expect(resultado.estadisticas?.precisionPase).toBe(82.1);
    expect(resultado.estadisticas?.duelosAereosGanadosPorPartido).toBe(1.5);
    expect(resultado.estadisticas?.regatesCompletadosPorPartido).toBe(1.8);
    expect(resultado.estadisticas?.pasesClavePorPartido).toBe(1.2);
    expect(resultado.estadisticas?.xgPorPartido).toBe(0.41);
    expect(resultado.estadisticas?.xaPorPartido).toBe(0.29);
    expect(resultado.estadisticas?.grandesOcasionesPorPartido).toBe(0.5);
    expect(resultado.estadisticas?.entradasPorPartido).toBe(1.1);
    expect(resultado.estadisticas?.intercepccionesPorPartido).toBe(0.8);
    expect(resultado.estadisticas?.despejesPorPartido).toBe(0.6);
    expect(resultado.estadisticas?.pasesPorPartido).toBe(35.2);
    expect(resultado.estadisticas?.centrosPorPartido).toBe(1.4);
    expect(resultado.estadisticas?.atajadas).toBe(45);
    expect(resultado.estadisticas?.golesRecibidos).toBe(22);
    expect(resultado.estadisticas?.porcentajeAtajadas).toBe(74.5);
    expect(resultado.estadisticas?.erroresQueGeneraronGol).toBe(1);
    expect(resultado.estadisticas?.autogoles).toBe(0);
  });

  it('debe omitir del DTO los campos opcionales que tengan valor null', async () => {
    const estadisticaConNulos = EstadisticaJugador.crear({
      jugadorId: jugadorMock.id,
      temporada: '2024/2025',
      liga: 'Premier League',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 2,
      asistencias: 1,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      // Todos los campos opcionales quedan en null por omisión o explícitos
      rating: null,
      tirosPorPartido: null,
      precisionPase: null,
      duelosAereosGanadosPorPartido: null,
      regatesCompletadosPorPartido: null,
      pasesClavePorPartido: null,
      xgPorPartido: null,
      xaPorPartido: null,
      grandesOcasionesPorPartido: null,
      entradasPorPartido: null,
      intercepccionesPorPartido: null,
      despejesPorPartido: null,
      pasesPorPartido: null,
      centrosPorPartido: null,
      atajadas: null,
      golesRecibidos: null,
      porcentajeAtajadas: null,
      erroresQueGeneraronGol: null,
      autogoles: null,
    });

    mockJugadorRepo.buscarPorId.mockResolvedValue(jugadorMock);
    mockEstadisticaRepo.buscarPorJugador.mockResolvedValue([estadisticaConNulos]);

    const resultado = await service.buscarPorId(jugadorMock.id);

    expect(resultado.estadisticas).toBeDefined();
    expect(resultado.estadisticas?.partidosJugados).toBe(10);
    // Verificamos que las propiedades opcionales no estén definidas (omitidas)
    expect(resultado.estadisticas?.rating).toBeUndefined();
    expect(resultado.estadisticas?.tirosPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.precisionPase).toBeUndefined();
    expect(resultado.estadisticas?.duelosAereosGanadosPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.regatesCompletadosPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.pasesClavePorPartido).toBeUndefined();
    expect(resultado.estadisticas?.xgPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.xaPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.grandesOcasionesPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.entradasPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.intercepccionesPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.despejesPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.pasesPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.centrosPorPartido).toBeUndefined();
    expect(resultado.estadisticas?.atajadas).toBeUndefined();
    expect(resultado.estadisticas?.golesRecibidos).toBeUndefined();
    expect(resultado.estadisticas?.porcentajeAtajadas).toBeUndefined();
    expect(resultado.estadisticas?.erroresQueGeneraronGol).toBeUndefined();
    expect(resultado.estadisticas?.autogoles).toBeUndefined();
  });

  it('debe manejar cuando estadisticaRepository no está inyectado (fallback seguro)', async () => {
    const serviceSinRepo = new JugadorService(
      mockJugadorRepo,
      mockEquipoRepo,
      mockLigaRepo,
      undefined as any,
      mockSincronizacionService,
    );

    mockJugadorRepo.buscarPorId.mockResolvedValue(jugadorMock);

    const resultado = await serviceSinRepo.buscarPorId(jugadorMock.id);
    expect(resultado.id).toBe(jugadorMock.id);
    expect(resultado.estadisticas).toBeNull();
  });
});
