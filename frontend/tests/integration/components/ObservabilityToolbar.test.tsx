import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ObservabilityToolbar } from '../../../src/components/admin/observability/ObservabilityToolbar';

describe('ObservabilityToolbar Component', () => {
  it('formatea la hora de última sincronización en formato de 24 horas', () => {
    // 24 de noviembre de 2026, 15:45:30 (tarde)
    const fechaTarde = new Date(2026, 10, 24, 15, 45, 30);

    render(
      <ObservabilityToolbar
        intervaloRefresco={10000}
        onChangeIntervalo={vi.fn()}
        onRefrescarManual={vi.fn()}
        actualizando={false}
        ultimaSincronizacion={fechaTarde}
        estadoConexion="online"
      />
    );

    expect(screen.getByText('15:45:30')).toBeInTheDocument();
  });

  it('muestra "Nunca" cuando no hay última sincronización', () => {
    render(
      <ObservabilityToolbar
        intervaloRefresco={10000}
        onChangeIntervalo={vi.fn()}
        onRefrescarManual={vi.fn()}
        actualizando={false}
        ultimaSincronizacion={null}
        estadoConexion="online"
      />
    );

    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('permite cambiar el intervalo de refresco y ejecutar refresco manual', () => {
    const onChangeIntervalo = vi.fn();
    const onRefrescarManual = vi.fn();

    render(
      <ObservabilityToolbar
        intervaloRefresco={10000}
        onChangeIntervalo={onChangeIntervalo}
        onRefrescarManual={onRefrescarManual}
        actualizando={false}
        ultimaSincronizacion={new Date(2026, 10, 24, 8, 5, 9)}
        estadoConexion="online"
      />
    );

    // Formato con 2 dígitos en hora 24h: 08:05:09
    expect(screen.getByText('08:05:09')).toBeInTheDocument();

    const select = screen.getByLabelText('Refresco:');
    fireEvent.change(select, { target: { value: '5000' } });
    expect(onChangeIntervalo).toHaveBeenCalledWith(5000);

    const btnRefrescar = screen.getByRole('button', { name: 'Refrescar' });
    fireEvent.click(btnRefrescar);
    expect(onRefrescarManual).toHaveBeenCalledTimes(1);
  });
});
