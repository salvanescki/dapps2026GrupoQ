import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PitchPlayerCard } from '../../../src/components/team-of-the-week/PitchPlayerCard';
import type { MiembroEquipoSemanalUI } from '../../../src/types/team-of-the-week.types';

describe('PitchPlayerCard Component', () => {
  const mockMiembro: MiembroEquipoSemanalUI = {
    jugadorId: 'j-10',
    nombre: 'Lionel Messi',
    equipoNombre: 'Inter Miami',
    posicion: 'Delantero',
    cotizacion: 45.5,
    score: 0.98,
    orden: 10,
  };

  it('Renderiza nombre, equipo y cotización con formato correcto', () => {
    const onClick = vi.fn();
    render(<PitchPlayerCard miembro={mockMiembro} onClick={onClick} />);

    expect(screen.getByText('L. Messi')).toBeInTheDocument();
    expect(screen.getByText('Inter Miami')).toBeInTheDocument();
    expect(screen.getByText(/45,50/)).toBeInTheDocument();
  });

  it('Muestra el nombre abreviado y conserva el nombre completo en el título', () => {
    render(
      <PitchPlayerCard
        miembro={{ ...mockMiembro, nombre: 'Kylian Mbappé' }}
        onClick={vi.fn()}
      />,
    );

    const nombre = screen.getByText('K. Mbappé');
    expect(nombre).toHaveAttribute('title', 'Kylian Mbappé');
  });

  it('Al hacer clic invoca onClick con el jugadorId', () => {
    const onClick = vi.fn();
    render(<PitchPlayerCard miembro={mockMiembro} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith('j-10');
  });

  it('Responde a teclado (Enter y Espacio)', () => {
    const onClick = vi.fn();
    render(<PitchPlayerCard miembro={mockMiembro} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith('j-10');

    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

