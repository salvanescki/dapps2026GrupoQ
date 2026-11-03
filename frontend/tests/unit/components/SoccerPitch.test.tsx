import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { SoccerPitch } from '../../../src/components/team-of-the-week/SoccerPitch';
import type { EquipoSemanalUI, MiembroEquipoSemanalUI } from '../../../src/types/team-of-the-week.types';

describe('SoccerPitch Component', () => {
  const generar11Miembros = (): MiembroEquipoSemanalUI[] => {
    const posiciones: ('Portero' | 'Defensa' | 'Mediocampista' | 'Delantero')[] = [
      'Portero',
      'Defensa',
      'Defensa',
      'Defensa',
      'Defensa',
      'Mediocampista',
      'Mediocampista',
      'Mediocampista',
      'Delantero',
      'Delantero',
      'Delantero',
    ];

    return posiciones.map((pos, idx) => ({
      jugadorId: `j-${idx + 1}`,
      nombre: `Jugador ${idx + 1}`,
      equipoNombre: `Club ${idx + 1}`,
      posicion: pos,
      cotizacion: 10 + idx,
      score: 0.8,
      orden: idx + 1,
    }));
  };

  const mockEquipo: EquipoSemanalUI = {
    id: 'eq-1',
    ano: 2026,
    semanaIso: 44,
    formacion: '4-3-3',
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    fechaGeneracion: '2026-11-02T01:00:00Z',
    miembros: generar11Miembros(),
  };

  it('Renderiza exactamente 1 Portero, 4 Defensas, 3 Mediocampistas y 3 Delanteros en sus filas', () => {
    const onSelect = vi.fn();
    render(<SoccerPitch equipo={mockEquipo} onSeleccionarJugador={onSelect} />);

    const rowForwards = screen.getByTestId('pitch-row-forwards');
    const rowMidfielders = screen.getByTestId('pitch-row-midfielders');
    const rowDefenders = screen.getByTestId('pitch-row-defenders');
    const rowGoalkeeper = screen.getByTestId('pitch-row-goalkeeper');

    expect(within(rowForwards).getAllByRole('button')).toHaveLength(3);
    expect(within(rowMidfielders).getAllByRole('button')).toHaveLength(3);
    expect(within(rowDefenders).getAllByRole('button')).toHaveLength(4);
    expect(within(rowGoalkeeper).getAllByRole('button')).toHaveLength(1);
  });

  it('Al hacer clic en una tarjeta de jugador invoca onSeleccionarJugador con el ID correspondiente', () => {
    const onSelect = vi.fn();
    render(<SoccerPitch equipo={mockEquipo} onSeleccionarJugador={onSelect} />);

    const tarjetaPortero = screen.getByTestId('pitch-player-j-1');
    fireEvent.click(tarjetaPortero);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('j-1');
  });
});

