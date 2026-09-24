// ============================================================
// Tests de integración: RegisterView
// Cubre US1 (registro exitoso), US2 (errores), US3 (validación)
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterView } from '../../src/views/RegisterView';
import type { RespuestaRegistro } from '../../src/types/auth.types';

// Mock del módulo de API
vi.mock('../../src/api/auth-api.client', () => ({
  registrarUsuario: vi.fn(),
  HttpError: class HttpError extends Error {
    codigoEstado: number;
    constructor(codigoEstado: number, message: string) {
      super(message);
      this.name = 'HttpError';
      this.codigoEstado = codigoEstado;
    }
  },
}));

// Mock de react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { registrarUsuario } from '../../src/api/auth-api.client';
import { HttpError } from '../../src/api/auth-api.client';

const mockRegistrarUsuario = vi.mocked(registrarUsuario);

const mockRespuestaExitosa: RespuestaRegistro = {
  tokenDeAcceso: 'eyJhbGciOiJIUzI1NiJ9.test-register',
  tipo: 'Bearer',
  usuario: {
    id: '123e4567-e89b-12d3-a456-426614174111',
    nombre: 'Inversor Prueba',
    correo: 'nuevo.inversor@ejemplo.com',
    activo: true,
    creadoEn: '2026-09-22T23:00:00.000Z',
  },
};

function renderRegisterView() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterView />
    </MemoryRouter>
  );
}

describe('RegisterView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Renderizado básico ───
  describe('Renderizado', () => {
    it('debería renderizar el formulario con los 4 campos de registro', () => {
      renderRegisterView();
      expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    });

    it('debería renderizar el botón de crear cuenta', () => {
      renderRegisterView();
      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
    });

    it('debería renderizar el título de la plataforma', () => {
      renderRegisterView();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Football Token Marketplace'
      );
    });

    it('debería renderizar el enlace a login', () => {
      renderRegisterView();
      expect(screen.getByText(/inicia sesión aquí/i)).toBeInTheDocument();
    });
  });

  // ─── US1: Registro exitoso y redirección ───
  describe('Registro exitoso (US1)', () => {
    it('debería llamar a registrarUsuario con datos sanitizados y redirigir a /login', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockResolvedValueOnce(mockRespuestaExitosa);
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), '  Nuevo.Inversor@Ejemplo.COM  ');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(mockRegistrarUsuario).toHaveBeenCalledWith({
          nombre: 'Inversor Prueba',
          correo: 'nuevo.inversor@ejemplo.com',
          contrasena: 'ClaveSegura2026',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { mensajeExito: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.' },
        });
      });
    });

    it('debería mostrar estado de carga durante el registro', async () => {
      const user = userEvent.setup();
      let resolveRegister: (value: RespuestaRegistro) => void;
      mockRegistrarUsuario.mockImplementationOnce(
        () => new Promise((resolve) => { resolveRegister = resolve; })
      );

      renderRegisterView();
      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creando cuenta/i })).toBeDisabled();
      });

      // Los campos deben estar deshabilitados
      expect(screen.getByLabelText(/nombre completo/i)).toBeDisabled();
      expect(screen.getByLabelText(/correo electrónico/i)).toBeDisabled();

      // Resolver la promesa
      resolveRegister!(mockRespuestaExitosa);
    });
  });

  // ─── US2: Errores del servidor ───
  describe('Errores del servidor (US2)', () => {
    it('debería mostrar error amigable ante HTTP 409 (correo duplicado)', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockRejectedValueOnce(
        new HttpError(
          409,
          'El correo electrónico ya se encuentra registrado. Intenta iniciar sesión o utiliza otra dirección.'
        )
      );
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'existente@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(
        await screen.findByText(/el correo electrónico ya se encuentra registrado/i)
      ).toBeInTheDocument();
    });

    it('debería mantener los datos del formulario tras error del servidor', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockRejectedValueOnce(
        new HttpError(409, 'Correo duplicado')
      );
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'existente@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await screen.findByText('Correo duplicado');

      // Los datos no se borran
      expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Inversor Prueba');
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('existente@ejemplo.com');
    });

    it('debería mostrar error amigable ante error de red', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockRejectedValueOnce(
        new HttpError(
          0,
          'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
        )
      );
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(
        await screen.findByText(/no fue posible conectar con el servidor/i)
      ).toBeInTheDocument();
    });

    it('debería mostrar error amigable ante HTTP 400', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockRejectedValueOnce(
        new HttpError(400, 'El nombre debe tener entre 2 y 100 caracteres.')
      );
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(
        await screen.findByText(/el nombre debe tener entre 2 y 100 caracteres/i)
      ).toBeInTheDocument();
    });
  });

  // ─── US3: Validación local ───
  describe('Validación local (US3)', () => {
    it('debería mostrar errores de validación con campos vacíos sin llamar al backend', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(await screen.findByText(/el nombre es obligatorio/i)).toBeInTheDocument();
      expect(await screen.findByText(/el correo electrónico es obligatorio/i)).toBeInTheDocument();
      expect(await screen.findByText(/(?<!confirmación de )la contraseña es obligatoria/i)).toBeInTheDocument();
      expect(await screen.findByText(/la confirmación de la contraseña es obligatoria/i)).toBeInTheDocument();
      expect(mockRegistrarUsuario).not.toHaveBeenCalled();
    });

    it('debería bloquear envío con contraseña débil', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'abc');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'abc');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(
        await screen.findByText(/la contraseña debe tener al menos 8 caracteres/i)
      ).toBeInTheDocument();
      expect(mockRegistrarUsuario).not.toHaveBeenCalled();
    });

    it('debería bloquear envío con contraseñas que no coinciden', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveDiferente');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(await screen.findByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
      expect(mockRegistrarUsuario).not.toHaveBeenCalled();
    });

    it('debería limpiar errores de validación al escribir en un campo', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      // Disparar errores
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
      expect(await screen.findByText(/el nombre es obligatorio/i)).toBeInTheDocument();

      // Escribir en el campo
      await user.type(screen.getByLabelText(/nombre completo/i), 'a');
      expect(screen.queryByText(/el nombre es obligatorio/i)).not.toBeInTheDocument();
    });

    it('debería validar en tiempo real al perder foco (onBlur)', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      // Escribir nombre inválido y mover foco
      await user.type(screen.getByLabelText(/nombre completo/i), 'A');
      await user.tab();

      expect(
        await screen.findByText(/el nombre es obligatorio y debe tener entre 2 y 100 caracteres/i)
      ).toBeInTheDocument();
    });

    it('debería mostrar error de formato de correo inválido', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'correo_invalido');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(
        await screen.findByText(/el formato del correo electrónico es inválido/i)
      ).toBeInTheDocument();
      expect(mockRegistrarUsuario).not.toHaveBeenCalled();
    });
  });

  // ─── Navegación ───
  describe('Navegación', () => {
    it('debería navegar a /login al hacer clic en el enlace de inicio de sesión', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.click(screen.getByText(/inicia sesión aquí/i));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // ─── Accesibilidad ───
  describe('Accesibilidad', () => {
    it('debería tener atributos aria-invalid y aria-describedby en campos con error', async () => {
      const user = userEvent.setup();
      renderRegisterView();

      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute('aria-describedby', 'nombre-error');
      });
    });

    it('debería tener role="alert" en el error del servidor', async () => {
      const user = userEvent.setup();
      mockRegistrarUsuario.mockRejectedValueOnce(
        new HttpError(409, 'Correo duplicado')
      );
      renderRegisterView();

      await user.type(screen.getByLabelText(/nombre completo/i), 'Inversor Prueba');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'existente@ejemplo.com');
      await user.type(screen.getByLabelText(/^(?!.*confirmar).*contraseña/i), 'ClaveSegura2026');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'ClaveSegura2026');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});
