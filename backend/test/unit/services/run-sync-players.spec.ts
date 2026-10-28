import { NestFactory } from '@nestjs/core';
import { bootstrapSyncPlayers } from '../../../src/run-sync-players';
import { SincronizacionJugadoresService } from '../../../src/services/sincronizacion-jugadores.service';

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn(),
  },
}));

describe('RunSyncPlayers Standalone Script (Unit Tests)', () => {
  let mockAppContext: any;
  let mockSyncService: any;

  beforeEach(() => {
    mockSyncService = {
      sincronizarLigasYPlanteles: jest.fn().mockResolvedValue({
        mensaje: 'OK',
        totalLigas: 5,
        totalEquipos: 96,
        totalJugadores: 2400,
      }),
    };

    mockAppContext = {
      get: jest.fn().mockImplementation((token) => {
        if (token === SincronizacionJugadoresService) return mockSyncService;
        return null;
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
      mockAppContext,
    );
  });

  it('debe ejecutar la sincronización y retornar código 0 al finalizar exitosamente', async () => {
    const exitCode = await bootstrapSyncPlayers(false);

    expect(NestFactory.createApplicationContext).toHaveBeenCalled();
    expect(mockSyncService.sincronizarLigasYPlanteles).toHaveBeenCalled();
    expect(mockAppContext.close).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('debe capturar errores de sincronización y retornar código 1 ante excepciones', async () => {
    mockSyncService.sincronizarLigasYPlanteles.mockRejectedValueOnce(
      new Error('Fallo en API football-data'),
    );

    const exitCode = await bootstrapSyncPlayers(false);

    expect(exitCode).toBe(1);
  });
});
