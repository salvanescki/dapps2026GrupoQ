import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/App';

describe('App Component', () => {
  it('debe montar la aplicación con router y auth provider', () => {
    render(<App />);
    expect(screen.getByText('Football Token Marketplace')).toBeInTheDocument();
  });
});
