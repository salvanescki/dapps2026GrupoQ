import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PlayersCatalogView } from '../../src/views/PlayersCatalogView';
import { AuthContext } from '../../src/context/AuthContext';
import * as playersApi from '../../src/api/playersApi';
import { createMockPlayer, createMockUser } from '../helpers/test-mock-factories';
import type { ContextoAutenticacion } from '../../src/types/auth.types';

vi.mock('../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
  getPlayerFilterOptions: vi.fn(),
  getPlayerById: vi.fn(),
}));

describe('Catalog to Modal Flow Integration Tests', () => {
  const mockUser = createMockUser();
  const authContextValue: ContextoAutenticacion = {
    usuario: mockUser,
    estaAutenticado: true,
    cargando: false,
    tokenDeAcceso: 'fake-jwt-token',
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    limpiarError: vi.fn(),
  };

  const p1 = createMockPlayer({
    id: 'player-101',
    nombre: 'Bukayo Saka',
    posicion: 'Delantero',
    dorsal: 7,
    equipo: { id: 'team-1', nombre: 'Arsenal FC' },
    liga: { id: 'liga-1', codigo: 'PL', nombre: 'Premier League' },
  });

  const p2 = createMockPlayer({
    id: 'player-102',
    nombre: 'Martin Odegaard',
    posicion: 'Mediocampista',
    dorsal: 8,
    equipo: { id: 'team-1', nombre: 'Arsenal FC' },
    liga: { id: 'liga-1', codigo: 'PL', nombre: 'Premier League' },
  });

  const p1Detalle = {
    ...p1,
    estadisticas: {
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
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(playersApi.getPlayerFilterOptions).mockResolvedValue({
      ligas: [],
      equipos: [],
      posiciones: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
    });

    vi.mocked(playersApi.getPlayers).mockResolvedValue({
      items: [p1, p2],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasMore: false,
    });
  });

  it('debe completar el flujo: click en PlayerCard abre modal con datos del jugador y cerrar modal restaura catálogo', async () => {
    const user = userEvent.setup();

    vi.mocked(playersApi.getPlayerById).mockResolvedValue(p1Detalle);

    render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter>
          <PlayersCatalogView />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Esperar a que el catálogo cargue los jugadores
    await waitFor(() => {
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
      expect(screen.getByText('Martin Odegaard')).toBeInTheDocument();
    });

    // El modal no debe existir inicialmente
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click en la card de Bukayo Saka
    const cardSaka = screen.getByTestId('player-card-player-101');
    await user.click(cardSaka);

    // getPlayerById debe haber sido llamado con el ID correcto
    expect(playersApi.getPlayerById).toHaveBeenCalledWith(
      'player-101',
      expect.any(AbortSignal),
    );

    // Modal abierto con los datos y estadísticas
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Bukayo Saka' })).toBeInTheDocument();
      expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('Goles')).toBeInTheDocument();
    });

    // Cerrar el modal mediante el botón X
    const closeBtn = screen.getByRole('button', { name: /cerrar detalle del jugador/i });
    await user.click(closeBtn);

    // El modal debe desaparecer
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // El catálogo permanece visible y en el mismo estado
    expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    expect(screen.getByText('Martin Odegaard')).toBeInTheDocument();
  });
});
