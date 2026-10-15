import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../../../../src/components/ui/Spinner';

describe('Spinner Component', () => {
  it('debe renderizar el spinner con tamaño md y aria-label por defecto', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('output');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('spinner', 'spinner-md');
    expect(spinner).toHaveAttribute('aria-label', 'Cargando...');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('debe admitir tamaños sm, lg y aria-label personalizado', () => {
    const { container, rerender } = render(
      <Spinner size="sm" ariaLabel="Procesando datos" className="custom-spinner" />
    );
    let spinner = container.querySelector('output');
    expect(spinner).toHaveClass('spinner-sm', 'custom-spinner');
    expect(spinner).toHaveAttribute('aria-label', 'Procesando datos');

    rerender(<Spinner size="lg" />);
    spinner = container.querySelector('output');
    expect(spinner).toHaveClass('spinner-lg');
  });
});
