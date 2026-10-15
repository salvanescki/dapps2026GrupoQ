import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../../src/context/AuthProvider';
import { useAuth } from '../../../src/hooks/useAuth';
import { StorageService } from '../../../src/services/storage.service';
import * as authApi from '../../../src/api/auth-api.client';
import { HttpError } from '../../../src/api/http-client';
import { createMockUser, createMockAuthResponse } from '../../helpers/test-mock-factories';

vi.mock('../../../src/api/auth-api.client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/auth-api.client')>(
    '../../../src/api/auth-api.client'
  );
  return {
    ...actual,
    loginUsuario: vi.fn(),
    obtenerPerfilAutenticado: vi.fn(),
  };
});

const VALID_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3OCJ9.signature';

function ConsumerComponent() {
  const {
    estaAutenticado,
    cargando,
    usuario,
    tokenDeAcceso,
    error,
    login,
    logout,
    limpiarError,
  } = useAuth();

  return (
    <div>
      <div data-testid="cargando">{cargando ? 'Cargando' : 'Listo'}</div>
      <div data-testid="autenticado">{estaAutenticado ? 'Autenticado' : 'Invitado'}</div>
      <div data-testid="usuario">{usuario ? usuario.nombre : 'Sin usuario'}</div>
      <div data-testid="token">{tokenDeAcceso || 'Sin token'}</div>
      <div data-testid="error">{error || 'Sin error'}</div>
      <button
        onClick={() => login({ correo: 'test@ejemplo.com', contrasena: 'Pass123' })}
      >
        Iniciar Sesion
      </button>
      <button onClick={logout}>Cerrar Sesion</button>
      <button onClick={limpiarError}>Limpiar Error</button>
    </div>
  );
}

describe('AuthProvider Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    StorageService.eliminarSesion();
  });

  it('debe iniciar como invitado cuando no hay sesión previa almacenada', async () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cargando')).toHaveTextContent('Listo');
    });

    expect(screen.getByTestId('autenticado')).toHaveTextContent('Invitado');
    expect(screen.getByTestId('usuario')).toHaveTextContent('Sin usuario');
  });

  it('debe hidratar sesión existente desde StorageService con éxito', async () => {
    const mockUser = createMockUser({ nombre: 'Usuario Hidratado' });
    StorageService.guardarSesion(VALID_JWT, mockUser);
    vi.mocked(authApi.obtenerPerfilAutenticado).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cargando')).toHaveTextContent('Listo');
    });

    expect(screen.getByTestId('autenticado')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('usuario')).toHaveTextContent('Usuario Hidratado');
  });

  it('debe eliminar sesión e indicar expiración si falla obtenerPerfilAutenticado', async () => {
    const mockUser = createMockUser();
    StorageService.guardarSesion(VALID_JWT, mockUser);
    vi.mocked(authApi.obtenerPerfilAutenticado).mockRejectedValueOnce(
      new HttpError(401, 'Token expirado')
    );

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cargando')).toHaveTextContent('Listo');
    });

    expect(screen.getByTestId('autenticado')).toHaveTextContent('Invitado');
    expect(screen.getByTestId('error')).toHaveTextContent(
      'La sesión expiró. Inicie sesión nuevamente.'
    );
    expect(StorageService.obtenerSesion()).toBeNull();
  });

  it('debe ejecutar login exitoso y actualizar estado', async () => {
    const user = userEvent.setup();
    const mockAuth = createMockAuthResponse({
      tokenDeAcceso: VALID_JWT,
      usuario: createMockUser({ nombre: 'Login Exitoso' }),
    });
    vi.mocked(authApi.loginUsuario).mockResolvedValueOnce(mockAuth);

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cargando')).toHaveTextContent('Listo');
    });

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(screen.getByTestId('autenticado')).toHaveTextContent('Autenticado');
    });

    expect(screen.getByTestId('usuario')).toHaveTextContent('Login Exitoso');
    expect(screen.getByTestId('token')).toHaveTextContent(VALID_JWT);
  });

  it('debe manejar errores en login con 401 y con error de red (codigoEstado 0)', async () => {
    const user = userEvent.setup();

    // Caso 401 Credenciales invalidas
    vi.mocked(authApi.loginUsuario).mockRejectedValueOnce(
      new HttpError(401, 'Error 401')
    );

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cargando')).toHaveTextContent('Listo');
    });

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Credenciales inválidas.');
    });

    // Probar limpiar error
    await user.click(screen.getByRole('button', { name: /limpiar error/i }));
    expect(screen.getByTestId('error')).toHaveTextContent('Sin error');

    // Caso Error de red (código 0)
    vi.mocked(authApi.loginUsuario).mockRejectedValueOnce(
      new HttpError(0, 'Fallo total de conexion')
    );

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Fallo total de conexion');
    });
  });

  it('debe cerrar sesión con logout y limpiar almacenamiento', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();
    StorageService.guardarSesion(VALID_JWT, mockUser);
    vi.mocked(authApi.obtenerPerfilAutenticado).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('autenticado')).toHaveTextContent('Autenticado');
    });

    await user.click(screen.getByRole('button', { name: /cerrar sesion/i }));

    expect(screen.getByTestId('autenticado')).toHaveTextContent('Invitado');
    expect(screen.getByTestId('usuario')).toHaveTextContent('Sin usuario');
    expect(StorageService.obtenerSesion()).toBeNull();
  });
});
