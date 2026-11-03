import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WeekSelector } from '../../../src/components/team-of-the-week/WeekSelector';
import type { SemanaDisponibleUI } from '../../../src/types/team-of-the-week.types';

describe('WeekSelector Component', () => {
  const mockSemanas: SemanaDisponibleUI[] = [
    { ano: 2026, semanaIso: 45, fechaGeneracion: '2026-11-09T01:00:00Z' },
    { ano: 2026, semanaIso: 44, fechaGeneracion: '2026-11-02T01:00:00Z' },
  ];

  it('Renderiza las opciones de semana con formato "Semana N, YYYY - generado el D/M"', () => {
    const onSelect = vi.fn();
    render(
      <WeekSelector
        semanas={mockSemanas}
        semanaActual={{ ano: 2026, semanaIso: 45 }}
        onSeleccionar={onSelect}
      />,
    );

    expect(screen.getByText('Semana 45, 2026 - generado el 9/11')).toBeInTheDocument();
    expect(screen.getByText('Semana 44, 2026 - generado el 2/11')).toBeInTheDocument();
  });

  it('Al cambiar de opción invoca onSeleccionar con el año y semana seleccionados', () => {
    const onSelect = vi.fn();
    render(
      <WeekSelector
        semanas={mockSemanas}
        semanaActual={{ ano: 2026, semanaIso: 45 }}
        onSeleccionar={onSelect}
      />,
    );

    const select = screen.getByTestId('week-select');
    fireEvent.change(select, { target: { value: '2026-44' } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2026, 44);
  });

  it('Si semanas está vacía no renderiza nada', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <WeekSelector
        semanas={[]}
        semanaActual={null}
        onSeleccionar={onSelect}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});

