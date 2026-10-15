import { PlayersController } from '../../../src/controllers/players.controller';
import { JugadorService } from '../../../src/services/jugador.service';

describe('PlayersController Unit Tests', () => {
  let controller: PlayersController;
  let mockJugadorService: Partial<JugadorService>;

  beforeEach(() => {
    mockJugadorService = {
      obtenerCatalogo: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
      }),
      obtenerOpcionesFiltro: jest.fn().mockResolvedValue({
        ligas: [],
        equipos: [],
        posiciones: [],
      }),
      buscarPorId: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        nombre: 'Lionel Messi',
      }),
      sincronizarManual: jest.fn().mockResolvedValue({
        mensaje: 'Sincronizado',
        totalLigas: 5,
        totalEquipos: 96,
        totalJugadores: 2500,
      }),
    };

    controller = new PlayersController(mockJugadorService as JugadorService);
  });

  it('debe llamar a obtenerCatalogo con los filtros proporcionados', async () => {
    const filtro = { league: 'PL' as const, page: 1, limit: 10 };
    await controller.obtenerCatalogo(filtro);
    expect(mockJugadorService.obtenerCatalogo).toHaveBeenCalledWith(filtro);
  });

  it('debe llamar a obtenerOpcionesFiltro', async () => {
    await controller.obtenerOpcionesFiltro();
    expect(mockJugadorService.obtenerOpcionesFiltro).toHaveBeenCalled();
  });

  it('debe llamar a buscarPorId con el ID solicitado', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    await controller.buscarPorId(id);
    expect(mockJugadorService.buscarPorId).toHaveBeenCalledWith(id);
  });

  it('debe llamar a sincronizarManual cuando se invoca sincronizar()', async () => {
    await controller.sincronizar();
    expect(mockJugadorService.sincronizarManual).toHaveBeenCalled();
  });
});
