import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../src/context/AuthContext';
import { AppRoutes } from '../../../src/routes/AppRoutes';
import { AdminRoute } from '../../../src/routes/AdminRoute';
import * as marketplaceApi from '../../../src/api/marketplaceApi';
import * as adminApi from '../../../src/api/adminApi';
import * as portfolioApi from '../../../src/api/portfolioApi';
import { HttpError } from '../../../src/api/http-client';
import type { ContextoAutenticacion, RolUsuario } from '../../../src/types/auth.types';
import type {
  ConfiguracionEstrategia,
  ResumenRecalculo,
  TransaccionAuditoria,
} from '../../../src/types/marketplace.types';

vi.mock('../../../src/api/marketplaceApi');
vi.mock('../../../src/api/adminApi');
vi.mock('../../../src/api/portfolioApi');

describe('US5 — AdminRoute RBAC Guard y Panel de Gobernanza Económica / Auditoría Global', () => {
  const estrategiaGlobalMock: ConfiguracionEstrategia = {
    estrategiaActivaId: 'GLOBAL',
    estrategiaActivaVersion: 'GLOBAL_v1',
    actualizadoEn: '2026-10-20T10:00:00.000Z',
    estrategiasDisponibles: [
      {
        id: 'GLOBAL',
        version: 'GLOBAL_v1',
        descripcion: 'Valoración general ponderada de todas las métricas deportivas.',
      },
      {
        id: 'POSICIONAL',
        version: 'POSICIONAL_v1',
        descripcion: 'Ponderación especializada según la demarcación táctica del futbolista.',
      },
    ],
  };

  const mockAuditoria: TransaccionAuditoria[] = [
    {
      transaccionId: 'tx-aud-1',
      ordenId: 'ord-aud-1',
      tipoMercado: 'PRIMARIO',
      jugadorId: '123e4567-e89b-42d3-a456-426614174000',
      nombreJugador: 'Bukayo Saka',
      compradorId: '987e6543-e21b-43d3-b654-426614174999',
      vendedorId: 'MERCADO_PRIMARIO',
      cantidadTokens: 5,
      precioUnitario: 1.85,
      montoTotal: 9.25,
      estrategiaCotizacion: 'GLOBAL_v1',
      fecha: '2026-10-20T12:30:00.000Z',
    },
  ];

  function buildAuth(
    opts: {
      rol?: RolUsuario;
      estaAutenticado?: boolean;
      cargando?: boolean;
    } = {},
  ): ContextoAutenticacion {
    const estaAutenticado = opts.estaAutenticado ?? true;
    return {
      usuario: estaAutenticado
        ? {
            id: opts.rol === 'ADMIN' ? 'admin-uuid-1' : 'user-uuid-1',
            nombre: opts.rol === 'ADMIN' ? 'Super Admin' : 'Trader Común',
            correo:
              opts.rol === 'ADMIN'
                ? 'admin@futbolmarket.ar'
                : 'trader@futbolmarket.ar',
            activo: true,
            creadoEn: '2026-10-01T10:00:00.000Z',
            rol: opts.rol,
            saldo: 1000,
          }
        : null,
      tokenDeAcceso: estaAutenticado ? 'jwt-test-token' : null,
      estaAutenticado,
      cargando: opts.cargando ?? false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
      refrescarPerfil: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(marketplaceApi.obtenerEstrategiaActiva).mockResolvedValue(
      estrategiaGlobalMock,
    );
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValue([]);
    vi.mocked(adminApi.obtenerTransaccionesAuditoria).mockResolvedValue(
      mockAuditoria,
    );
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValue({
      usuarioId: 'user-uuid-1',
      saldoBilletera: 1000,
      valoracionTotalTokens: 0,
      patrimonioNetoTotal: 1000,
      posiciones: [],
    });
    vi.mocked(portfolioApi.obtenerTransaccionesUsuario).mockResolvedValue([]);
  });

  it('AdminRoute: muestra RouteLoading en cargando, redirige no autenticados a /login y bloquea USUARIO o sin rol hacia / con avisoSeguridad y 0 llamadas a /admin/transactions', async () => {
    // 1. cargando: true -> RouteLoading
    const { unmount: uLoad } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ cargando: true })}>
          <AdminRoute>
            <div data-testid="secret-admin-node">Secreto</div>
          </AdminRoute>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('secret-admin-node')).not.toBeInTheDocument();
    uLoad();

    // 2. No autenticado -> /login
    const { unmount: uUnauth } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ estaAutenticado: false })}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /Ingresar a la Plataforma/i }),
    ).toBeInTheDocument();
    expect(adminApi.obtenerTransaccionesAuditoria).not.toHaveBeenCalled();
    uUnauth();

    // 3. Autenticado con rol === 'USUARIO' -> redirige a / con state.avisoSeguridad sin montar AdminGovernanceView
    const { unmount: uUser } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ rol: 'USUARIO' })}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Acceso restringido: el Panel de Gobernanza es exclusivo para cuentas Administradoras/i,
        ),
      ).toBeInTheDocument();
    });
    expect(adminApi.obtenerTransaccionesAuditoria).not.toHaveBeenCalled();
    uUser();

    // 4. Autenticado con rol undefined -> también bloqueado
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ rol: undefined })}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Acceso restringido: el Panel de Gobernanza/i),
      ).toBeInTheDocument();
    });
    expect(adminApi.obtenerTransaccionesAuditoria).not.toHaveBeenCalled();
  });

  it('ADMIN: conmuta estrategia PUT /quotes/strategy, ejecuta recálculo manual POST /quotes/recalculate con bloqueo de doble clic y filtra auditoría global', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ rol: 'ADMIN' })}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Panel de Gobernanza/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    });

    // 1. Conmutar estrategia a POSICIONAL
    vi.mocked(adminApi.cambiarEstrategiaMercado).mockResolvedValueOnce({
      ...estrategiaGlobalMock,
      estrategiaActivaId: 'POSICIONAL',
      estrategiaActivaVersion: 'POSICIONAL_v1',
    });

    await user.click(
      screen.getByRole('button', { name: /activar Ponderación Posicional/i }),
    );

    await waitFor(() => {
      expect(adminApi.cambiarEstrategiaMercado).toHaveBeenCalledWith(
        'jwt-test-token',
        'POSICIONAL',
      );
      expect(screen.getAllByText(/POSICIONAL_v1/).length).toBeGreaterThanOrEqual(1);
    });

    // 2. Recálculo manual con prevención de doble clic mientras recalculando === true
    let resolverRecalculo!: (val: ResumenRecalculo) => void;
    vi.mocked(adminApi.ejecutarRecalculoManual).mockImplementationOnce(
      () =>
        new Promise<ResumenRecalculo>((resolve) => {
          resolverRecalculo = resolve;
        }),
    );

    const btnRecalcular = screen.getByRole('button', {
      name: /Recalcular cotizaciones ahora/i,
    });
    await user.click(btnRecalcular);

    // Mientras está en curso, el botón está deshabilitado contra envíos duplicados
    expect(btnRecalcular).toBeDisabled();
    fireEvent.click(btnRecalcular);
    expect(adminApi.ejecutarRecalculoManual).toHaveBeenCalledTimes(1);

    resolverRecalculo({
      mensaje: 'Recálculo masivo finalizado exitosamente.',
      totalJugadoresProcesados: 240,
      exitosos: 235,
      fallidos: 0,
      sinEstadisticas: 5,
      estrategiaAplicada: 'POSICIONAL',
      versionEstrategia: 'POSICIONAL_v1',
      duracionMs: 1480,
    });

    await waitFor(() => {
      expect(screen.getByText('240')).toBeInTheDocument();
      expect(screen.getByText('235')).toBeInTheDocument();
      expect(screen.getByText(/1480\s*ms/i)).toBeInTheDocument();
    });

    // 3. Filtrar auditoría global con validación UUID v4 y tipoMercado
    const inputJugadorUuid = screen.getByLabelText(/ID de Jugador/i);
    await user.clear(inputJugadorUuid);
    await user.type(inputJugadorUuid, 'uuid-invalido');
    await user.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    expect(
      screen.getByText(/El ID de Jugador debe tener formato UUID v4 válido/i),
    ).toBeInTheDocument();

    // Limpiar y filtrar con UUID v4 válido + SECUNDARIO
    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    const uuidValido = '123e4567-e89b-42d3-a456-426614174000';
    await user.type(screen.getByLabelText(/ID de Jugador/i), uuidValido);
    await user.selectOptions(
      screen.getByLabelText(/tipo de mercado/i),
      'SECUNDARIO',
    );
    await user.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    await waitFor(() => {
      expect(adminApi.obtenerTransaccionesAuditoria).toHaveBeenCalledWith(
        'jwt-test-token',
        expect.objectContaining({
          jugadorId: uuidValido,
          tipoMercado: 'SECUNDARIO',
        }),
      );
    });
  });

  it('ADMIN: maneja errores HTTP 400, 401, 403 y 409 (recálculo concurrente en progreso) con mensajes en español', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={buildAuth({ rol: 'ADMIN' })}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Recalcular cotizaciones ahora/i }),
      ).toBeInTheDocument();
    });

    for (const [status, msg] of [
      [400, 'Solicitud de gobernanza inválida.'],
      [401, 'Credenciales de administrador expiradas.'],
      [403, 'Operación reservada exclusivamente al rol ADMIN.'],
      [409, 'Ya existe un recálculo masivo de cotizaciones en ejecución.'],
    ] as const) {
      vi.mocked(adminApi.ejecutarRecalculoManual).mockRejectedValueOnce(
        new HttpError(status, msg),
      );
      await user.click(
        screen.getByRole('button', { name: /Recalcular cotizaciones ahora/i }),
      );
      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });
    }
  });
});
