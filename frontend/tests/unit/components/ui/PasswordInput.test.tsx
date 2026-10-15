import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '../../../../src/components/ui/PasswordInput';

describe('PasswordInput Component', () => {
  it('debe iniciar con tipo password y permitir alternar visibilidad a texto', async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pass" label="Contraseña" />);

    const input = screen.getByLabelText('Contraseña', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(input.type).toBe('password');

    const toggleButton = screen.getByRole('button', { name: /ver contraseña/i });
    expect(toggleButton).toHaveTextContent('Mostrar');

    await user.click(toggleButton);

    expect(input.type).toBe('text');
    expect(toggleButton).toHaveAttribute('aria-label', 'Ocultar contraseña');
    expect(toggleButton).toHaveTextContent('Ocultar');

    await user.click(toggleButton);
    expect(input.type).toBe('password');
  });

  it('no debe renderizar el botón de alternar visibilidad si showToggle es false', () => {
    render(<PasswordInput id="pass" label="Contraseña" showToggle={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
