import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../../src/components/ui/Button';

describe('Button Component', () => {
  it('debe renderizar el botón con texto y estilos por defecto', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-md');
  });

  it('debe aplicar variantes y tamaños correctamente', () => {
    const { rerender } = render(
      <Button variant="secondary" size="lg">
        Accion
      </Button>
    );
    let button = screen.getByRole('button', { name: /accion/i });
    expect(button).toHaveClass('btn-secondary', 'btn-lg');

    rerender(
      <Button variant="ghost" size="sm">
        Accion
      </Button>
    );
    button = screen.getByRole('button', { name: /accion/i });
    expect(button).toHaveClass('btn-ghost', 'btn-sm');
  });

  it('debe mostrar estado de carga con spinner y texto alternativo', () => {
    render(
      <Button cargando textoCarga="Guardando...">
        Guardar
      </Button>
    );
    const button = screen.getByRole('button', { name: /guardando\.\.\./i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
  });

  it('debe renderizar icono cuando no está cargando', () => {
    render(
      <Button icono={<span data-testid="test-icon">★</span>}>
        Favorito
      </Button>
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('debe responder a eventos de click cuando está habilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Pulsar</Button>);
    await user.click(screen.getByRole('button', { name: /pulsar/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('no debe disparar click cuando está deshabilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Deshabilitado
      </Button>
    );
    const button = screen.getByRole('button', { name: /deshabilitado/i });
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
