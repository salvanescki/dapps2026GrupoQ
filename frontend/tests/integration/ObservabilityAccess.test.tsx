import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AdminRoute } from '../../src/routes/AdminRoute';
import { ProtectedRoute } from '../../src/routes/ProtectedRoute';
import { ObservabilityView } from '../../src/views/ObservabilityView';
import * as authHook from '../../src/hooks/useAuth';

function LocationDisplay() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-display">{location.pathname}</span>
      <span data-testid="location-state">{JSON.stringify(location.state)}</span>
    </div>
  );
}

describe('ObservabilityAccess (US1 Integration Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redirige a /login si el usuario es anonimo / no autenticado', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      estaAutenticado: false,
      cargando: false,
      usuario: null,
      tokenDeAcceso: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/observability']}>
        <Routes>
          <Route path="/login" element={<LocationDisplay />} />
          <Route
            path="/admin/observability"
            element={
              <ProtectedRoute>
                <AdminRoute
                  mensajeSeguridad="Acceso restringido: el Panel de Observabilidad es exclusivo para cuentas Administradoras."
                >
                  <ObservabilityView />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location-display').textContent).toBe('/login');
  });

  it('bloquea a rol USUARIO y redirige a / con advertencia de seguridad en el estado', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      estaAutenticado: true,
      cargando: false,
      usuario: { id: '2', email: 'user@example.com', nombre: 'Usuario', rol: 'USUARIO', activo: true, creadoEn: '2026-01-01' } as any,
      tokenDeAcceso: 'jwt',
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/observability']}>
        <Routes>
          <Route path="/" element={<LocationDisplay />} />
          <Route
            path="/admin/observability"
            element={
              <ProtectedRoute>
                <AdminRoute
                  mensajeSeguridad="Acceso restringido: el Panel de Observabilidad es exclusivo para cuentas Administradoras."
                >
                  <ObservabilityView />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location-display').textContent).toBe('/');
    expect(screen.getByTestId('location-state').textContent).toContain('Acceso restringido: el Panel de Observabilidad');
  });

  it('permite el acceso a /admin/observability cuando el rol es ADMIN', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      estaAutenticado: true,
      cargando: false,
      usuario: { id: '1', email: 'admin@example.com', nombre: 'Admin', rol: 'ADMIN', activo: true, creadoEn: '2026-01-01' } as any,
      tokenDeAcceso: 'jwt',
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/observability']}>
        <Routes>
          <Route
            path="/admin/observability"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <ObservabilityView />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Observabilidad y Métricas del Sistema/i })).toBeInTheDocument();
  });
});
