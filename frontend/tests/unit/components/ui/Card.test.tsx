import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../../../src/components/ui/Card';

describe('Card Component', () => {
  it('debe renderizar hijos con variante glass y padding md por defecto', () => {
    render(
      <Card data-testid="card-test">
        <p>Contenido de tarjeta</p>
      </Card>
    );

    const card = screen.getByTestId('card-test');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('card', 'card-glass', 'card-padding-md');
    expect(screen.getByText('Contenido de tarjeta')).toBeInTheDocument();
  });

  it('debe aplicar variantes solid, outline y diferentes paddings correctamente', () => {
    const { rerender } = render(
      <Card variant="solid" padding="lg" data-testid="card-test">
        Test
      </Card>
    );
    let card = screen.getByTestId('card-test');
    expect(card).toHaveClass('card-solid', 'card-padding-lg');

    rerender(
      <Card variant="outline" padding="sm" className="custom-extra" data-testid="card-test">
        Test
      </Card>
    );
    card = screen.getByTestId('card-test');
    expect(card).toHaveClass('card-outline', 'card-padding-sm', 'custom-extra');
  });
});
