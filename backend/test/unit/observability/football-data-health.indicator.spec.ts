import { FootballDataHealthIndicator } from '../../../src/health/indicators/football-data-health.indicator';
import { HealthCheckError } from '@nestjs/terminus';

describe('FootballDataHealthIndicator (Unit Tests)', () => {
  let indicator: FootballDataHealthIndicator;
  const originalFetch = global.fetch;

  beforeEach(() => {
    indicator = new FootballDataHealthIndicator('https://mock-api.football-data.org/v4');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('debe retornar status "up" si la API responde con código HTTP < 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
    } as any);

    const result = await indicator.isHealthy('footballData');
    expect(result).toEqual({
      footballData: {
        status: 'up',
        httpStatus: 200,
      },
    });
  });

  it('debe lanzar HealthCheckError si la API responde con error de servidor HTTP 503', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 503,
    } as any);

    await expect(indicator.isHealthy('footballData')).rejects.toThrow(HealthCheckError);
  });

  it('debe lanzar HealthCheckError si ocurre un error de red o timeout', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error or DNS failure'));

    await expect(indicator.isHealthy('footballData')).rejects.toThrow(HealthCheckError);

    try {
      await indicator.isHealthy('footballData');
    } catch (err: any) {
      expect(err.causes).toEqual({
        footballData: {
          status: 'down',
          message: 'Network error or DNS failure',
        },
      });
    }
  });
});
