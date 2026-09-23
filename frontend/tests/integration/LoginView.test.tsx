// ============================================================
// Tests de integración: LoginView
// Cubre US1 (login exitoso), US2 (errores), US3 (validación)
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthProvider';
import { LoginView } from '../../src/views/LoginView';
import type { RespuestaAutenticacion } from '../../src/types/auth.types';

// Mock del módulo de API
vi.mock('../../src/api/auth-api.client', () => ({
  loginUsuario: vi.fn(),
  HttpError: class HttpError extends Error {
    codigoEstado: number;
    constructor(codigoEstado: number, message: string) {
      super(message);
      this.name = 'HttpError';
      this.codigoEstado = codigoEstado;
    }
  },
}));

// Importar después del mock
import { loginUsuario } from '../../src/api/auth-api.client';
import { HttpError } from '../../src/api/auth-api.client';

const mockLoginUsuario = vi.mocked(loginUsuario);

const mockRespuestaExitosa: RespuestaAutenticacion = {
  tokenDeAcceso: 'eyJhbGciOiJIUzI1NiJ9.test',
  tipo: 'Bearer',
  usuario: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Inversor Demo',
    correo: 'inversor@tokens.com',
    activo: true,
    creadoEn: '2026-09-16T22:30:00.000Z',
  },
};

function renderLoginView() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Renderizado básico ───
  describe('Renderizado', () => {
    it('debería renderizar el formulario con campos de correo y contraseña', () => {
      renderLoginView();
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
    });

    it('debería renderizar el título de la plataforma', () => {
      renderLoginView();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Football Token Marketplace'
      );
    });
  });

  // ─── US3: Validación local ───
  describe('Validación local (US3)', () => {
    it('debería mostrar errores de validación con campos vacíos', async () => {
      const user = userEvent.setup();
      renderLoginView();

      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      expect(await screen.findByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
      expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument();
      expect(mockLoginUsuario).not.toHaveBeenCalled();
    });

    it('debería mostrar error de formato de correo inválido', async () => {
      const user = userEvent.setup();
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'usuario_sin_arroba');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave123');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      expect(
        await screen.findByText('El formato del correo electrónico es inválido.')
      ).toBeInTheDocument();
      expect(mockLoginUsuario).not.toHaveBeenCalled();
    });

    it('debería limpiar errores de validación al escribir en un campo', async () => {
      const user = userEvent.setup();
      renderLoginView();

      // Disparar errores
      await user.click(screen.getByRole('button', { name: /ingresar/i }));
      expect(await screen.findByText('El correo electrónico es obligatorio.')).toBeInTheDocument();

      // Escribir en el campo
      await user.type(screen.getByLabelText(/correo electrónico/i), 'a');
      expect(screen.queryByText('El correo electrónico es obligatorio.')).not.toBeInTheDocument();
    });
  });

  // ─── US1: Login exitoso ───
  describe('Login exitoso (US1)', () => {
    it('debería llamar a loginUsuario con credenciales sanitizadas', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockResolvedValueOnce(mockRespuestaExitosa);
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), '  Inversor@Tokens.COM  ');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave1234');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        expect(mockLoginUsuario).toHaveBeenCalledWith({
          correo: 'inversor@tokens.com',
          contrasena: 'Clave1234',
        });
      });
    });

    it('debería mostrar estado de carga durante el login', async () => {
      const user = userEvent.setup();
      let resolveLogin: (value: RespuestaAutenticacion) => void;
      mockLoginUsuario.mockImplementationOnce(
        () => new Promise((resolve) => { resolveLogin = resolve; })
      );

      renderLoginView();
      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave1234');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
      });

      // Resolver la promesa
      resolveLogin!(mockRespuestaExitosa);
    });

    it('debería almacenar la sesión en localStorage tras login exitoso', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockResolvedValueOnce(mockRespuestaExitosa);
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave1234');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        const stored = localStorage.getItem('football_marketplace_session');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed.tokenDeAcceso).toBe(mockRespuestaExitosa.tokenDeAcceso);
        expect(parsed.usuario.nombre).toBe('Inversor Demo');
      });
    });
  });

  // ─── US2: Errores del servidor ───
  describe('Errores de autenticación (US2)', () => {
    it('debería mostrar mensaje de credenciales inválidas ante HTTP 401', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockRejectedValueOnce(
        new HttpError(401, 'Credenciales inválidas.')
      );
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'ClaveIncorrecta');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      expect(await screen.findByText('Credenciales inválidas.')).toBeInTheDocument();
    });

    it('debería mantener el correo tras error de autenticación', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockRejectedValueOnce(
        new HttpError(401, 'Credenciales inválidas.')
      );
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'ClaveIncorrecta');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await screen.findByText('Credenciales inválidas.');
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('inversor@tokens.com');
    });

    it('debería mostrar error de conexión ante fallo de red', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockRejectedValueOnce(
        new HttpError(
          0,
          'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
        )
      );
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave1234');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      expect(
        await screen.findByText(/no fue posible conectar con el servidor/i)
      ).toBeInTheDocument();
    });

    it('debería limpiar el error al escribir en un campo', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockRejectedValueOnce(
        new HttpError(401, 'Credenciales inválidas.')
      );
      renderLoginView();

      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'ClaveIncorrecta');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await screen.findByText('Credenciales inválidas.');

      await user.type(screen.getByLabelText(/contraseña/i), 'N');
      expect(screen.queryByText('Credenciales inválidas.')).not.toBeInTheDocument();
    });
  });

  // ─── US3: Prevención de envíos duplicados ───
  describe('Prevención de envíos duplicados (US3)', () => {
    it('debería deshabilitar el botón durante el envío', async () => {
      const user = userEvent.setup();
      mockLoginUsuario.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      renderLoginView();
      await user.type(screen.getByLabelText(/correo electrónico/i), 'inversor@tokens.com');
      await user.type(screen.getByLabelText(/contraseña/i), 'Clave1234');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
      });
    });
  });

  // ─── US3: Enlace hacia registro ───
  describe('Navegación a registro (US3)', () => {
    it('debería renderizar el enlace hacia la pantalla de registro', () => {
      renderLoginView();
      const linkRegistro = screen.getByRole('link', { name: /regístrate aquí/i });
      expect(linkRegistro).toBeInTheDocument();
      expect(linkRegistro).toHaveAttribute('href', '/register');
    });
  });
});

