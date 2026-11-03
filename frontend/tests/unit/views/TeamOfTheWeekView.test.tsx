import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TeamOfTheWeekView } from '../../../src/views/TeamOfTheWeekView';
import * as hookModule from '../../../src/hooks/useTeamOfTheWeek';

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    usuario: { id: 'u-1', rol: 'USUARIO', nombre: 'Test User' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../../src/hooks/useTeamOfTheWeek');
vi.mock('../../../src/components/player-detail/PlayerDetailModal', () => ({
  PlayerDetailModal: ({
    playerId,
    onClose,
  }: {
    playerId: string | null;
    onClose: () => void;
  }) => {
    if (!playerId) return null;
    return (
      <div data-testid="player-detail-modal">
        <span>Modal Jugador: {playerId}</span>
        <button type="button" onClick={onClose}>
          Cerrar Modal
        </button>
      </div>
    );
  },
}));

describe('TeamOfTheWeekView Component', () => {
  const mockRecargar = vi.fn();
  const mockSeleccionarSemana = vi.fn();
  const mockVolver = vi.fn();
  const mockDispararGeneracion = vi.fn();
  const mockAbrirModal = vi.fn();
  const mockCerrarModal = vi.fn();

  const mockEquipo = {
    id: 'eq-1',
    ano: 2026,
    semanaIso: 44,
    formacion: '4-3-3',
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    fechaGeneracion: '2026-11-02T01:00:00Z',
    miembros: [
      {
        jugadorId: 'j-1',
        nombre: 'Dibu Martinez',
        equipoNombre: 'Aston Villa',
        posicion: 'Portero' as const,
        cotizacion: 15.0,
        score: 0.85,
        orden: 1,
      },
      ...Array.from({ length: 4 }).map((_, i) => ({
        jugadorId: `d-${i + 1}`,
        nombre: `Defensa ${i + 1}`,
        equipoNombre: 'Club',
        posicion: 'Defensa' as const,
        cotizacion: 12.0,
        score: 0.8,
        orden: i + 2,
      })),
      ...Array.from({ length: 3 }).map((_, i) => ({
        jugadorId: `m-${i + 1}`,
        nombre: `Medio ${i + 1}`,
        equipoNombre: 'Club',
        posicion: 'Mediocampista' as const,
        cotizacion: 14.0,
        score: 0.8,
        orden: i + 6,
      })),
      ...Array.from({ length: 3 }).map((_, i) => ({
        jugadorId: `f-${i + 1}`,
        nombre: `Delantero ${i + 1}`,
        equipoNombre: 'Club',
        posicion: 'Delantero' as const,
        cotizacion: 20.0,
        score: 0.9,
        orden: i + 9,
      })),
    ],
  };

  const baseHookState = {
    equipo: null,
    semanasDisponibles: [],
    semanaSeleccionada: null,
    cargando: false,
    error: null,
    semanaNoEncontrada: false,
    esAdmin: false,
    generandoManual: false,
    mensajeAdmin: null,
    seleccionarSemana: mockSeleccionarSemana,
    volverALaMasReciente: mockVolver,
    recargar: mockRecargar,
    dispararGeneracionManual: mockDispararGeneracion,
    jugadorModalId: null,
    abrirModalJugador: mockAbrirModal,
    cerrarModalJugador: mockCerrarModal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Estado cargando: muestra indicador de carga en español', () => {
    vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
      ...baseHookState,
      cargando: true,
    });

    render(
      <MemoryRouter>
        <TeamOfTheWeekView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Cargando Equipo de la Semana...')).toBeInTheDocument();
  });

  it('Estado error: muestra mensaje de error y botón Reintentar', () => {
    vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
      ...baseHookState,
      error: 'Error de red en el servidor',
    });

    render(
      <MemoryRouter>
        <TeamOfTheWeekView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Error de red en el servidor')).toBeInTheDocument();

    const btnReintentar = screen.getByTestId('retry-btn');
    fireEvent.click(btnReintentar);
    expect(mockRecargar).toHaveBeenCalledTimes(1);
  });

  it('Estado vacío: muestra mensaje claro en español cuando no hay equipo disponible', () => {
    vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
      ...baseHookState,
      equipo: null,
      cargando: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <TeamOfTheWeekView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('Aún no hay ningún Equipo de la Semana disponible'),
    ).toBeInTheDocument();
  });

  it('Semana inexistente: muestra mensaje en español y permite volver a la más reciente', () => {
    vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
      ...baseHookState,
      semanaNoEncontrada: true,
    });

    render(
      <MemoryRouter>
        <TeamOfTheWeekView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('week-not-found-state')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('back-to-latest-btn'));
    expect(mockVolver).toHaveBeenCalledTimes(1);
  });

  it('Estado con datos: renderiza cancha táctica y selector de semana', () => {
    vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
      ...baseHookState,
      equipo: mockEquipo,
      semanasDisponibles: [
        { ano: 2026, semanaIso: 44, fechaGeneracion: '2026-11-02T01:00:00Z' },
      ],
      semanaSeleccionada: { ano: 2026, semanaIso: 44 },
    });

    render(
      <MemoryRouter>
        <TeamOfTheWeekView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('soccer-pitch')).toBeInTheDocument();
    expect(screen.getByTestId('week-select')).toBeInTheDocument();
    expect(screen.getByText('D. Martinez')).toBeInTheDocument();
  });

  describe('US3: Interacción con Jugador y Detalle / Marketplace', () => {
    it('al seleccionar un jugador se pasa su ID al PlayerDetailModal', () => {
      vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
        ...baseHookState,
        equipo: mockEquipo,
        jugadorModalId: 'j-1',
      });

      render(
        <MemoryRouter>
          <TeamOfTheWeekView />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('player-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Jugador: j-1')).toBeInTheDocument();
    });

    it('al cerrar el modal se invoca cerrarModalJugador', () => {
      vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
        ...baseHookState,
        equipo: mockEquipo,
        jugadorModalId: 'j-1',
      });

      render(
        <MemoryRouter>
          <TeamOfTheWeekView />
        </MemoryRouter>,
      );

      const btnCerrar = screen.getByText('Cerrar Modal');
      fireEvent.click(btnCerrar);
      expect(mockCerrarModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('US5: Disparo Manual Administrativo', () => {
    it('muestra botón de generación manual únicamente si esAdmin es true', () => {
      vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
        ...baseHookState,
        esAdmin: true,
      });

      render(
        <MemoryRouter>
          <TeamOfTheWeekView />
        </MemoryRouter>,
      );

      const btnGenerar = screen.getByTestId('btn-generate-team');
      expect(btnGenerar).toBeInTheDocument();
      fireEvent.click(btnGenerar);
      expect(mockDispararGeneracion).toHaveBeenCalledTimes(1);
    });

    it('no muestra botón si esAdmin es false', () => {
      vi.mocked(hookModule.useTeamOfTheWeek).mockReturnValue({
        ...baseHookState,
        esAdmin: false,
      });

      render(
        <MemoryRouter>
          <TeamOfTheWeekView />
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('btn-generate-team')).not.toBeInTheDocument();
    });
  });
});
