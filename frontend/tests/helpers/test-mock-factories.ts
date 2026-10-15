import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthProvider';
import type { PerfilUsuario, RespuestaAutenticacion } from '../../src/types/auth.types';
import type { Jugador, RespuestaCatalogoJugadores } from '../../src/types/player.types';

export function createMockUser(overrides?: Partial<PerfilUsuario>): PerfilUsuario {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Inversor Demo',
    correo: 'inversor@tokens.com',
    activo: true,
    creadoEn: '2026-09-16T22:30:00.000Z',
    ...overrides,
  };
}

export function createMockAuthResponse(
  overrides?: Partial<RespuestaAutenticacion>
): RespuestaAutenticacion {
  return {
    tokenDeAcceso: 'mock-jwt-token-xyz',
    tipo: 'Bearer',
    usuario: createMockUser(overrides?.usuario),
    ...overrides,
  };
}

export function createMockPlayer(overrides?: Partial<Jugador>): Jugador {
  return {
    id: 'player-uuid-1',
    externalId: 101,
    nombre: 'Lionel Messi',
    posicion: 'Delantero',
    posicionOriginal: 'Right Winger',
    fechaNacimiento: '1987-06-24',
    nacionalidad: 'Argentina',
    dorsal: 10,
    equipo: {
      id: 'team-uuid-1',
      nombre: 'Inter Miami',
      nombreCorto: 'Inter',
      tla: 'MIA',
      escudoUrl: 'https://example.com/crest.png',
    },
    liga: {
      id: 'league-uuid-1',
      codigo: 'MLS',
      nombre: 'Major League Soccer',
      pais: 'USA',
      emblemaUrl: null,
    },
    ...overrides,
  };
}

export function createMockCatalogResponse(
  overrides?: Partial<RespuestaCatalogoJugadores>
): RespuestaCatalogoJugadores {
  return {
    items: [createMockPlayer()],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasMore: false,
    ...overrides,
  };
}

export interface RenderWithProvidersOptions {
  route?: string;
  withAuth?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult {
  const { withAuth = true } = options;

  let content = ui;
  if (withAuth) {
    content = React.createElement(AuthProvider, null, content);
  }

  return render(React.createElement(BrowserRouter, null, content));
}
