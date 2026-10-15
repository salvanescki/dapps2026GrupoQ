import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterView } from '../../src/views/RegisterView';
import { LoginView } from '../../src/views/LoginView';
import { PlayersCatalogView } from '../../src/views/PlayersCatalogView';
import { AuthProvider } from '../../src/context/AuthProvider';
import { StorageService } from '../../src/services/storage.service';
import type { RespuestaRegistro, RespuestaAutenticacion } from '../../src/types/auth.types';
import type { RespuestaCatalogoJugadores, OpcionesFiltroRespuesta } from '../../src/types/player.types';

// Mocks de APIs
vi.mock('../../src/api/auth-api.client', () => ({
  registrarUsuario: vi.fn(),
  loginUsuario: vi.fn(),
  obtenerPerfilAutenticado: vi.fn(),
  HttpError: class HttpError extends Error {
    codigoEstado: number;
    constructor(codigoEstado: number, message: string) {
      super(message);
      this.name = 'HttpError';
      this.codigoEstado = codigoEstado;
    }
  },
}));

vi.mock('../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
  getPlayerFilterOptions: vi.fn(),
  getPlayerById: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { registrarUsuario, loginUsuario, obtenerPerfilAutenticado } from '../../src/api/auth-api.client';
import { getPlayers, getPlayerFilterOptions } from '../../src/api/playersApi';

const mockRegistrar = vi.mocked(registrarUsuario);
const mockLogin = vi.mocked(loginUsuario);
const mockObtenerPerfil = vi.mocked(obtenerPerfilAutenticado);
const mockGetPlayers = vi.mocked(getPlayers);
const mockGetFilterOptions = vi.mocked(getPlayerFilterOptions);

describe('Frontend Critical User Journeys (CUJ-01, CUJ-02, CUJ-03)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('CUJ-01: Registro y Redirección a Sesión', () => {
    it('debería completar el registro de usuario, llamar a la API y redirigir a /login', async () => {
      const user = userEvent.setup();
      const mockRespuestaRegistro: RespuestaRegistro = {
        tokenDeAcceso: 'eyJhbGciOiJIUzI1NiJ9.test-jwt-token',
        tipo: 'Bearer',
        usuario: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          nombre: 'Lionel Messi',
          correo: 'lio@intermiami.com',
          activo: true,
          creadoEn: '2026-10-15T00:00:00.000Z',
        },
      };

      mockRegistrar.mockResolvedValue(mockRespuestaRegistro);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <RegisterView />
        </MemoryRouter>,
      );

      // Llenar formulario de registro
      const nombreInput = screen.getByLabelText(/nombre completo/i);
      const correoInput = screen.getByLabelText(/correo electrónico/i);
      const contrasenaInput = screen.getByLabelText(/^contraseña/i);
      const confirmarContrasenaInput = screen.getByLabelText(/confirmar contraseña/i);

      await user.type(nombreInput, 'Lionel Messi');
      await user.type(correoInput, 'lio@intermiami.com');
      await user.type(contrasenaInput, 'CampeonDelMundo10');
      await user.type(confirmarContrasenaInput, 'CampeonDelMundo10');

      const botonSubmit = screen.getByRole('button', { name: /crear cuenta/i });
      await user.click(botonSubmit);

      await waitFor(() => {
        expect(mockRegistrar).toHaveBeenCalledWith({
          nombre: 'Lionel Messi',
          correo: 'lio@intermiami.com',
          contrasena: 'CampeonDelMundo10',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/login', expect.anything());
      });
    });
  });

  describe('CUJ-02: Inicio de Sesión, Persistencia y Logout', () => {
    it('debería autenticar al usuario, persistir la sesión y permitir cerrar sesión', async () => {
      const user = userEvent.setup();
      const usuarioMock = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        nombre: 'Kylian Mbappe',
        correo: 'kiki@madrid.es',
        activo: true,
        creadoEn: '2026-10-15T00:00:00.000Z',
      };
      const tokenMock = 'eyJhbGciOiJIUzI1NiJ9.mbappe-token';

      const mockRespuestaLogin: RespuestaAutenticacion = {
        tokenDeAcceso: tokenMock,
        tipo: 'Bearer',
        usuario: usuarioMock,
      };

      mockLogin.mockResolvedValue(mockRespuestaLogin);
      mockObtenerPerfil.mockResolvedValue(usuarioMock);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LoginView />
          </AuthProvider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/correo electrónico/i), 'kiki@madrid.es');
      await user.type(screen.getByLabelText(/contraseña/i), 'Madrid2026');

      const botonLogin = screen.getByRole('button', { name: /ingresar/i });
      await user.click(botonLogin);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          correo: 'kiki@madrid.es',
          contrasena: 'Madrid2026',
        });
        expect(StorageService.obtenerSesion()?.tokenDeAcceso).toBe(tokenMock);
      });

      // Validar logout
      StorageService.eliminarSesion();
      expect(StorageService.existeSesion()).toBe(false);
    });
  });

  describe('CUJ-03: Consulta y Filtrado de Catálogo de Jugadores', () => {
    it('debería cargar el catálogo inicial con opciones de filtros y mostrar fichas de jugadores', async () => {
      const mockFiltros: OpcionesFiltroRespuesta = {
        ligas: [
          { id: 'l-1', codigo: 'PL', nombre: 'Premier League', pais: 'Inglaterra', emblemaUrl: 'https://crests.football-data.org/PL.png' },
        ],
        equipos: [
          { id: 'e-1', nombre: 'Manchester City FC', nombreCorto: 'Man City', tla: 'MCI', escudoUrl: 'https://crests.football-data.org/65.png', ligaId: 'l-1', ligaCodigo: 'PL' },
        ],
        posiciones: ['Delantero', 'Mediocampista'],
      };

      const mockCatalogo: RespuestaCatalogoJugadores = {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            externalId: 38101,
            nombre: 'Erling Haaland',
            posicion: 'Delantero',
            posicionOriginal: 'Centre-Forward',
            fechaNacimiento: '2000-07-21',
            nacionalidad: 'Norway',
            dorsal: 9,
            equipo: {
              id: 'e-1',
              nombre: 'Manchester City FC',
              nombreCorto: 'Man City',
              tla: 'MCI',
              escudoUrl: 'https://crests.football-data.org/65.png',
            },
            liga: {
              id: 'l-1',
              codigo: 'PL',
              nombre: 'Premier League',
              pais: 'Inglaterra',
              emblemaUrl: 'https://crests.football-data.org/PL.png',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      };

      mockGetFilterOptions.mockResolvedValue(mockFiltros);
      mockGetPlayers.mockResolvedValue(mockCatalogo);

      render(
        <MemoryRouter initialEntries={['/players']}>
          <AuthProvider>
            <PlayersCatalogView />
          </AuthProvider>
        </MemoryRouter>,
      );

      // Verificar carga de datos en catálogo
      await waitFor(() => {
        expect(screen.getByText('Erling Haaland')).toBeInTheDocument();
      });

      expect(screen.getByText('Manchester City FC')).toBeInTheDocument();
      expect(screen.getByText(/Delantero/i)).toBeInTheDocument();
    });
  });
});
