// ============================================================
// Tests de integración: ProtectedRoute y PublicRoute
// Cubre US4 (persistencia de sesión y guards de ruta)
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { AuthContext } from '../../src/context/AuthContext';
import { ProtectedRoute } from '../../src/routes/ProtectedRoute';
import { PublicRoute } from '../../src/routes/PublicRoute';
import type { ContextoAutenticacion, PerfilUsuario } from '../../src/types/auth.types';

const mockUsuario: PerfilUsuario = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nombre: 'Inversor Demo',
  correo: 'inversor@tokens.com',
  activo: true,
  creadoEn: '2026-09-16T22:30:00.000Z',
};

function createMockContext(overrides: Partial<ContextoAutenticacion> = {}): ContextoAutenticacion {
  return {
    estaAutenticado: false,
    cargando: false,
    usuario: null,
    tokenDeAcceso: null,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    limpiarError: vi.fn(),
    ...overrides,
  };
}

function renderRouteWithAuth(
  ctx: ContextoAutenticacion,
  initialEntry: string,
  routes: Array<{ path: string; element: React.ReactNode }>
) {
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería redirigir a /login si el usuario no está autenticado', () => {
    const ctx = createMockContext({ estaAutenticado: false });

    renderRouteWithAuth(ctx, '/', [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <div>Contenido protegido</div>
          </ProtectedRoute>
        ),
      },
      { path: '/login', element: <div>Pantalla de Login</div> },
    ]);

    expect(screen.getByText('Pantalla de Login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('debería renderizar el contenido si el usuario está autenticado', () => {
    const ctx = createMockContext({
      estaAutenticado: true,
      usuario: mockUsuario,
      tokenDeAcceso: 'test-token',
    });

    renderRouteWithAuth(ctx, '/', [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <div>Contenido protegido</div>
          </ProtectedRoute>
        ),
      },
      { path: '/login', element: <div>Pantalla de Login</div> },
    ]);

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de Login')).not.toBeInTheDocument();
  });

  it('debería mostrar loading mientras está cargando la sesión', () => {
    const ctx = createMockContext({ cargando: true });

    renderRouteWithAuth(ctx, '/', [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <div>Contenido protegido</div>
          </ProtectedRoute>
        ),
      },
    ]);

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cargando sesión')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería redirigir a / si el usuario ya está autenticado', () => {
    const ctx = createMockContext({
      estaAutenticado: true,
      usuario: mockUsuario,
      tokenDeAcceso: 'test-token',
    });

    renderRouteWithAuth(ctx, '/login', [
      {
        path: '/login',
        element: (
          <PublicRoute>
            <div>Pantalla de Login</div>
          </PublicRoute>
        ),
      },
      { path: '/', element: <div>Pantalla principal</div> },
    ]);

    expect(screen.getByText('Pantalla principal')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de Login')).not.toBeInTheDocument();
  });

  it('debería renderizar el contenido si el usuario no está autenticado', () => {
    const ctx = createMockContext({ estaAutenticado: false });

    renderRouteWithAuth(ctx, '/login', [
      {
        path: '/login',
        element: (
          <PublicRoute>
            <div>Pantalla de Login</div>
          </PublicRoute>
        ),
      },
      { path: '/', element: <div>Pantalla principal</div> },
    ]);

    expect(screen.getByText('Pantalla de Login')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla principal')).not.toBeInTheDocument();
  });

  it('debería mostrar loading mientras está cargando la sesión', () => {
    const ctx = createMockContext({ cargando: true });

    renderRouteWithAuth(ctx, '/login', [
      {
        path: '/login',
        element: (
          <PublicRoute>
            <div>Pantalla de Login</div>
          </PublicRoute>
        ),
      },
    ]);

    expect(screen.queryByText('Pantalla de Login')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cargando sesión')).toBeInTheDocument();
  });
});
