import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerDetailModal } from '../../../src/components/player-detail/PlayerDetailModal';
import * as usePlayerDetailModule from '../../../src/hooks/usePlayerDetail';
import type { JugadorDetalle } from '../../../src/types/player.types';
import { createMockPlayer } from '../../helpers/test-mock-factories';

vi.mock('../../../src/hooks/usePlayerDetail', () => ({
  usePlayerDetail: vi.fn(),
}));

describe('PlayerDetailModal Component', () => {
  const onCloseMock = vi.fn();

  const mockJugadorConStats: JugadorDetalle = {
    ...createMockPlayer({
      id: 'player-modal-1',
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      posicionOriginal: 'Right Winger',
      fechaNacimiento: '2001-09-05',
      nacionalidad: 'England',
      dorsal: 7,
      equipo: {
        id: 'team-1',
        nombre: 'Arsenal FC',
        escudoUrl: 'https://crests.football-data.org/57.png',
      },
      liga: {
        id: 'league-1',
        codigo: 'PL',
        nombre: 'Premier League',
        emblemaUrl: 'https://crests.football-data.org/PL.png',
      },
    }),
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
    },
  };

  const mockJugadorSinStats: JugadorDetalle = {
    ...createMockPlayer({
      id: 'player-modal-2',
      nombre: 'Declan Rice',
      posicion: 'Mediocampista',
      dorsal: 41,
    }),
    estadisticas: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe renderizar nada cuando playerId es null', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: null,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    const { container } = render(
      <PlayerDetailModal playerId={null} onClose={onCloseMock} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('debe mostrar indicador de carga durante loading: true', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: null,
      loading: true,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('modal-loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Cargando jugador...')).toBeInTheDocument();
  });

  it('debe mostrar la ficha completa y StatsGrid cuando jugador tiene estadísticas', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugadorConStats,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    // Encabezado
    expect(screen.getByRole('heading', { level: 2, name: 'Bukayo Saka' })).toBeInTheDocument();
    expect(screen.getAllByText('Arsenal FC').length).toBeGreaterThanOrEqual(1);

    // Ficha básica
    expect(screen.getByText('Right Winger')).toBeInTheDocument();
    expect(screen.getByText('England')).toBeInTheDocument();
    expect(screen.getByText('2001-09-05')).toBeInTheDocument();
    expect(screen.getAllByText('#7').length).toBeGreaterThanOrEqual(1);

    // StatsGrid
    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
    expect(screen.getByText('Temporada 2024/2025 • Premier League')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('Goles')).toBeInTheDocument();
  });

  it('debe mostrar mensaje informativo cuando el jugador no tiene estadísticas', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugadorSinStats,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-2" onClose={onCloseMock} />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Declan Rice' })).toBeInTheDocument();
    expect(screen.getByTestId('stats-empty-notice')).toHaveTextContent(
      'Las estadísticas de WhoScored no están disponibles aún para este jugador.',
    );
    expect(screen.queryByTestId('stats-grid')).not.toBeInTheDocument();
  });

  it('debe mostrar alerta de error y botón Reintentar que invoca retry()', () => {
    const mockRetry = vi.fn();

    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: null,
      loading: false,
      error: 'Error al conectar con la API',
      retry: mockRetry,
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Error al conectar con la API');

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar el modal al hacer click en el botón de cierre X', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugadorConStats,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    const closeBtn = screen.getByRole('button', { name: /cerrar detalle del jugador/i });
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar el modal al hacer click en el overlay fuera del panel', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugadorConStats,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    const overlay = screen.getByTestId('player-detail-overlay');
    fireEvent.click(overlay);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar el modal al presionar la tecla Escape', () => {
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugadorConStats,
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <PlayerDetailModal playerId="player-modal-1" onClose={onCloseMock} />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
