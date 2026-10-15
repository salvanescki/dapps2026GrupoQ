import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerCard } from '../../../../src/components/catalog/PlayerCard';
import { createMockPlayer } from '../../../helpers/test-mock-factories';

describe('PlayerCard Component', () => {
  it('debe renderizar todas las posiciones y badges correspondientes', () => {
    const posiciones = [
      'Portero',
      'Defensa',
      'Mediocampista',
      'Delantero',
      'No Clasificado',
    ] as const;

    for (const pos of posiciones) {
      const p = createMockPlayer({
        id: `card-${pos}`,
        nombre: `Jugador ${pos}`,
        posicion: pos,
        posicionOriginal: 'Attacking Midfield',
        dorsal: 10,
      });

      const { unmount } = render(<PlayerCard player={p} />);
      expect(screen.getByText(`Jugador ${pos}`)).toBeInTheDocument();
      expect(screen.getByText(pos)).toBeInTheDocument();
      unmount();
    }
  });

  it('debe mostrar placeholder cuando el escudo falla o no existe', () => {
    const p = createMockPlayer({
      equipo: {
        id: 'team-no-crest',
        nombre: 'Sin Escudo',
        escudoUrl: 'https://invalid-url.com/crest.png',
        tla: 'SIN',
      },
    });

    render(<PlayerCard player={p} />);

    const img = screen.getByRole('img', { name: /escudo de sin escudo/i });
    expect(img).toBeInTheDocument();

    // Disparar error de imagen
    fireEvent.error(img);

    expect(screen.getByText('SIN')).toBeInTheDocument();
  });

  it('debe renderizar sin dorsal y sin posicionOriginal sin fallar', () => {
    const p = createMockPlayer({
      dorsal: null,
      posicionOriginal: undefined,
      equipo: {
        id: 't-1',
        nombre: 'Arsenal',
        escudoUrl: null,
        tla: undefined,
      },
    });

    render(<PlayerCard player={p} />);
    expect(screen.queryByTitle(/dorsal/i)).not.toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
  });
});
