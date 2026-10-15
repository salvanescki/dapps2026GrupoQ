import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from '../../../../src/components/ui/Alert';

describe('Alert Component', () => {
  it('debe renderizar alerta de error con rol alert y aria-live assertive', () => {
    render(<Alert tipo="error" mensaje="Credenciales inválidas" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert-error', 'error-alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('debe renderizar alerta de exito con rol status y aria-live polite', () => {
    render(<Alert tipo="success" mensaje="Registro completado" />);

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('alert-success', 'success-alert');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Registro completado')).toBeInTheDocument();
  });

  it('debe renderizar alerta de info y warning con rol region', () => {
    const { rerender } = render(<Alert tipo="info" mensaje="Información relevante" />);
    let alert = screen.getByRole('region');
    expect(alert).toHaveClass('alert-info');

    rerender(<Alert tipo="warning" mensaje="Advertencia de sesión" />);
    alert = screen.getByRole('region');
    expect(alert).toHaveClass('alert-warning');
  });

  it('debe ejecutar callback onCerrar cuando se hace click en el botón de cerrar', async () => {
    const user = userEvent.setup();
    const handleCerrar = vi.fn();

    render(
      <Alert
        tipo="error"
        mensaje="Error transitorio"
        onCerrar={handleCerrar}
      />
    );

    const closeButton = screen.getByRole('button', { name: /cerrar notificación/i });
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton);
    expect(handleCerrar).toHaveBeenCalledTimes(1);
  });
});
