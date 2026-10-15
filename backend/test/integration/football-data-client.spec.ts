import { FootballDataClient } from '../../src/services/clients/football-data.client';

describe('FootballDataClient', () => {
  let client: FootballDataClient;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new FootballDataClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('debe retornar datos de competicion y equipos cuando la llamada HTTP es exitosa (200)', async () => {
    const mockData = {
      competition: { id: 2021, name: 'Premier League', code: 'PL' },
      teams: [
        {
          id: 57,
          name: 'Arsenal FC',
          squad: [{ id: 1, name: 'Bukayo Saka', position: 'Offence' }],
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    });

    const resultado = await client.obtenerEquiposYJugadoresPorLiga('PL');

    expect(resultado).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/PL/teams',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('debe lanzar Error descriptivo cuando la API externa responde con HTTP 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue('Resource not found'),
    });

    await expect(client.obtenerEquiposYJugadoresPorLiga('INVALID_LEAGUE')).rejects.toThrow(
      'Error en football-data.org: HTTP 404 al consultar liga INVALID_LEAGUE'
    );
  });

  it('debe lanzar Error descriptivo cuando la API externa responde con HTTP 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal server error'),
    });

    await expect(client.obtenerEquiposYJugadoresPorLiga('PL')).rejects.toThrow(
      'Error en football-data.org: HTTP 500 al consultar liga PL'
    );
  });

  it('debe propagar error de red si fetch falla a nivel de conexion', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

    await expect(client.obtenerEquiposYJugadoresPorLiga('PL')).rejects.toThrow(
      'Network connection timeout'
    );
  });
});
