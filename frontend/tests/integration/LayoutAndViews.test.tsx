import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { Navbar } from '../../src/components/layout/Navbar';
import { HomeView } from '../../src/views/HomeView';
import { AppRoutes } from '../../src/routes/AppRoutes';
import { AuthContext } from '../../src/context/AuthContext';
import { createMockUser } from '../helpers/test-mock-factories';
import type { ContextoAutenticacion } from '../../src/types/auth.types';

describe('Layout and Views Integration', () => {
  describe('Navbar Component', () => {
    it('debe renderizar título, enlaces de navegación y botón de cerrar sesión', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();

      render(
        <MemoryRouter>
          <Navbar
            titulo="Tokens App"
            items={[{ label: 'Catálogo', to: '/players', id: 'nav-players' }]}
            onLogout={onLogout}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Tokens App')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /catálogo/i })).toHaveAttribute(
        'href',
        '/players'
      );

      const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
      await user.click(logoutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppLayout Component', () => {
    it('debe renderizar navbar y contenido hijo', () => {
      render(
        <MemoryRouter>
          <AppLayout
            navbarProps={{ titulo: 'Test Navbar' }}
            className="custom-layout"
          >
            <main data-testid="main-content">Contenido</main>
          </AppLayout>
        </MemoryRouter>
      );

      expect(screen.getByText('Test Navbar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('no debe renderizar navbar si hideNavbar es true', () => {
      render(
        <MemoryRouter>
          <AppLayout navbarProps={{ titulo: 'Oculto' }} hideNavbar={true}>
            <div>Sin barra</div>
          </AppLayout>
        </MemoryRouter>
      );

      expect(screen.queryByText('Oculto')).not.toBeInTheDocument();
      expect(screen.getByText('Sin barra')).toBeInTheDocument();
    });
  });

  describe('HomeView', () => {
    it('debe renderizar dashboard con saludo personalizado y tarjetas de estado cuando el usuario está autenticado', async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn();
      const mockAuthValue: ContextoAutenticacion = {
        estaAutenticado: true,
        cargando: false,
        usuario: createMockUser({ nombre: 'Lionel Messi', correo: 'leo@intermiami.com' }),
        tokenDeAcceso: 'token',
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        limpiarError: vi.fn(),
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthValue}>
            <HomeView />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText(/¡bienvenido de vuelta,/i)).toBeInTheDocument();
      expect(screen.getByText('Lionel Messi')).toBeInTheDocument();
      expect(screen.getByText(/leo@intermiami.com/i)).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument(); // Avatar primera letra
      expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(1);

      const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
      await user.click(logoutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('debe retornar null si no hay usuario autenticado', () => {
      const mockAuthValue: ContextoAutenticacion = {
        estaAutenticado: false,
        cargando: false,
        usuario: null,
        tokenDeAcceso: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        limpiarError: vi.fn(),
      };

      const { container } = render(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthValue}>
            <HomeView />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('AppRoutes', () => {
    it('debe redirigir a /login cuando usuario no autenticado intenta acceder a ruta protegida', () => {
      const mockAuthValue: ContextoAutenticacion = {
        estaAutenticado: false,
        cargando: false,
        usuario: null,
        tokenDeAcceso: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        limpiarError: vi.fn(),
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider value={mockAuthValue}>
            <AppRoutes />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      // Redirige a /login donde se renderiza el formulario de inicio
      expect(screen.getByText('Football Token Marketplace')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /ingresar a la plataforma/i })
      ).toBeInTheDocument();
    });

    it('debe permitir ver HomeView cuando el usuario está autenticado', () => {
      const mockAuthValue: ContextoAutenticacion = {
        estaAutenticado: true,
        cargando: false,
        usuario: createMockUser({ nombre: 'Inversor Autenticado' }),
        tokenDeAcceso: 'valid-jwt',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        limpiarError: vi.fn(),
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider value={mockAuthValue}>
            <AppRoutes />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText(/¡bienvenido de vuelta,/i)).toBeInTheDocument();
      expect(screen.getByText('Inversor Autenticado')).toBeInTheDocument();
    });
  });
});
