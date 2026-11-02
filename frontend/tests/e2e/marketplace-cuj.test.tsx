import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthProvider';
import { AppRoutes } from '../../src/routes/AppRoutes';
import { StorageService } from '../../src/services/storage.service';
import type {
  ConfiguracionEstrategia,
  CotizacionJugador,
  JugadorRanking,
  OrdenVenta,
  PosicionPortafolio,
  TransaccionAuditoria,
  TransaccionUsuario,
} from '../../src/types/marketplace.types';
import type { JugadorDetalle } from '../../src/types/player.types';

const TRADER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const JUGADOR_SAKA_ID = '22222222-2222-4222-8222-222222222222';
const JUGADOR_PEDRI_ID = '33333333-3333-4333-8333-333333333333';

const TOKEN_TRADER = 'eyJhbGciOiJIUzI1NiJ9.traderPayload.traderSig';
const TOKEN_ADMIN = 'eyJhbGciOiJIUzI1NiJ9.adminPayload.adminSig';
const TOKEN_EXPIRADO = 'eyJhbGciOiJIUzI1NiJ9.expiredPayload.expiredSig';

const PATRON_SIN_TRAZAS_CRUDAS =
  /Error:|Exception|\bat\s+[A-Za-z0-9_$.]+\s*\(|TypeError|ReferenceError|HttpException|QueryFailedError/i;

class MockResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 640,
            height: 260,
            top: 0,
            left: 0,
            bottom: 260,
            right: 640,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        },
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

interface EstadoMercadoSimulado {
  saldoTrader: number;
  estrategia: ConfiguracionEstrategia;
  ranking: JugadorRanking[];
  cotizacionesSaka: CotizacionJugador[];
  posicionesTrader: PosicionPortafolio[];
  ordenesAbiertas: OrdenVenta[];
  transaccionesTrader: TransaccionUsuario[];
  transaccionesGlobales: TransaccionAuditoria[];
  rechazoCompraMensaje: string | null;
  rechazoRecalculo409: boolean;
  fallarRankingTemporal: boolean;
  fallarPortfolioTemporal: boolean;
  llamadasAdminTransactions: number;
}

function crearEstadoInicial(): EstadoMercadoSimulado {
  return {
    saldoTrader: 1000,
    estrategia: {
      estrategiaActivaId: 'GLOBAL',
      estrategiaActivaVersion: 'GLOBAL_v1',
      actualizadoEn: '2026-10-20T12:00:00.000Z',
      estrategiasDisponibles: [
        {
          id: 'GLOBAL',
          version: 'GLOBAL_v1',
          descripcion:
            'Valoración general ponderada de todas las métricas deportivas.',
        },
        {
          id: 'POSICIONAL',
          version: 'POSICIONAL_v1',
          descripcion:
            'Ponderación especializada según la demarcación táctica del futbolista.',
        },
      ],
    },
    ranking: [
      {
        posicionRanking: 1,
        jugadorId: JUGADOR_SAKA_ID,
        nombre: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal',
        cotizacionActual: 15.5,
        variacionPorcentual: 10.71,
        score: 0.8925,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        tokensDisponibles: 80,
      },
      {
        posicionRanking: 2,
        jugadorId: JUGADOR_PEDRI_ID,
        nombre: 'Pedri González',
        posicion: 'Mediocampista',
        equipoNombre: 'FC Barcelona',
        cotizacionActual: 13.25,
        variacionPorcentual: 1.92,
        score: 0.841,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        tokensDisponibles: 90,
      },
    ],
    cotizacionesSaka: [
      {
        id: 'cot-1',
        jugadorId: JUGADOR_SAKA_ID,
        valor: 12.5,
        score: 0.81,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: false,
        metricas: { goals: 10, assists: 8, rating: 7.5 },
        fechaCotizacion: '2026-10-18T10:00:00.000Z',
      },
      {
        id: 'cot-2',
        jugadorId: JUGADOR_SAKA_ID,
        valor: 14.0,
        score: 0.85,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: false,
        metricas: { goals: 12, assists: 9, rating: 7.7 },
        fechaCotizacion: '2026-10-19T10:00:00.000Z',
      },
      {
        id: 'cot-3',
        jugadorId: JUGADOR_SAKA_ID,
        valor: 15.5,
        score: 0.8925,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: false,
        metricas: { goals: 14, assists: 11, rating: 7.82 },
        fechaCotizacion: '2026-10-20T10:00:00.000Z',
      },
    ],
    posicionesTrader: [],
    ordenesAbiertas: [],
    transaccionesTrader: [],
    transaccionesGlobales: [
      {
        transaccionId: 'tx-seed-1',
        ordenId: 'ord-seed-1',
        tipoMercado: 'PRIMARIO',
        jugadorId: JUGADOR_PEDRI_ID,
        nombreJugador: 'Pedri González',
        compradorId: TRADER_ID,
        vendedorId: 'SISTEMA',
        cantidadTokens: 1,
        precioUnitario: 13.25,
        montoTotal: 13.25,
        estrategiaCotizacion: 'GLOBAL_v1',
        fecha: '2026-10-20T09:00:00.000Z',
      },
    ],
    rechazoCompraMensaje: null,
    rechazoRecalculo409: false,
    fallarRankingTemporal: false,
    fallarPortfolioTemporal: false,
    llamadasAdminTransactions: 0,
  };
}

const DETALLE_SAKA: JugadorDetalle = {
  id: JUGADOR_SAKA_ID,
  nombre: 'Bukayo Saka',
  posicion: 'Delantero',
  nacionalidad: 'Inglaterra',
  dorsal: 7,
  fechaNacimiento: '2001-09-05',
  equipo: {
    id: 'eq-arsenal',
    nombre: 'Arsenal',
    tla: 'ARS',
  },
  liga: {
    id: 'liga-pl',
    codigo: 'PL',
    nombre: 'Premier League',
    pais: 'Inglaterra',
  },
  estadisticas: {
    temporada: '2025/2026',
    liga: 'Premier League',
    partidosJugados: 28,
    minutosJugados: 2410,
    goles: 14,
    asistencias: 11,
    tarjetasAmarillas: 3,
    tarjetasRojas: 0,
    rating: 7.82,
    tirosPorPartido: 3.1,
    precisionPase: 84.5,
  },
};

function respuestaJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function instalarFetchSimulado(estado: EstadoMercadoSimulado) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === 'string' ? input : input.toString();
      const parsed = new URL(rawUrl, 'http://localhost');
      const path = parsed.pathname.replace(/^\/api/, '');
      const method = (init?.method ?? 'GET').toUpperCase();
      const headers = new Headers(init?.headers);
      const authHeader = headers.get('Authorization') ?? '';
      const rawBody =
        typeof init?.body === 'string' && init.body.length > 0
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};

      // 1. Auth (/auth/login, /auth/me)
      if (path === '/auth/login' && method === 'POST') {
        const correo = String(rawBody.correo ?? '');
        const contrasena = String(rawBody.contrasena ?? '');
        if (correo === 'trader@futbol.com' && contrasena === 'TraderPass123') {
          return respuestaJson(200, {
            tokenDeAcceso: TOKEN_TRADER,
            tipo: 'Bearer',
            usuario: {
              id: TRADER_ID,
              nombre: 'Martín Trader',
              correo: 'trader@futbol.com',
              activo: true,
              creadoEn: '2026-10-01T10:00:00.000Z',
              rol: 'USUARIO',
              saldo: estado.saldoTrader,
            },
          });
        }
        if (correo === 'admin@futbol.com' && contrasena === 'AdminPass123') {
          return respuestaJson(200, {
            tokenDeAcceso: TOKEN_ADMIN,
            tipo: 'Bearer',
            usuario: {
              id: ADMIN_ID,
              nombre: 'Sofía Admin',
              correo: 'admin@futbol.com',
              activo: true,
              creadoEn: '2026-10-01T08:00:00.000Z',
              rol: 'ADMIN',
              saldo: 0,
            },
          });
        }
        return respuestaJson(401, {
          codigoEstado: 401,
          mensaje: 'Credenciales inválidas.',
          marcaDeTiempo: '2026-10-20T12:00:00.000Z',
        });
      }

      if (path === '/auth/me' && method === 'GET') {
        if (authHeader === `Bearer ${TOKEN_TRADER}`) {
          return respuestaJson(200, {
            id: TRADER_ID,
            nombre: 'Martín Trader',
            correo: 'trader@futbol.com',
            activo: true,
            creadoEn: '2026-10-01T10:00:00.000Z',
            rol: 'USUARIO',
            saldo: estado.saldoTrader,
          });
        }
        if (authHeader === `Bearer ${TOKEN_ADMIN}`) {
          return respuestaJson(200, {
            id: ADMIN_ID,
            nombre: 'Sofía Admin',
            correo: 'admin@futbol.com',
            activo: true,
            creadoEn: '2026-10-01T08:00:00.000Z',
            rol: 'ADMIN',
            saldo: 0,
          });
        }
        return respuestaJson(401, {
          codigoEstado: 401,
          mensaje: 'Token inválido o expirado.',
          marcaDeTiempo: '2026-10-20T12:00:00.000Z',
        });
      }

      // 2. Estrategia y Recálculo (/quotes/strategy, /quotes/recalculate)
      if (path === '/quotes/strategy' && method === 'GET') {
        return respuestaJson(200, estado.estrategia);
      }

      if (path === '/quotes/strategy' && method === 'PUT') {
        const nuevaId = String(rawBody.estrategiaId ?? 'POSICIONAL') as
          | 'GLOBAL'
          | 'POSICIONAL';
        estado.estrategia = {
          ...estado.estrategia,
          estrategiaActivaId: nuevaId,
          estrategiaActivaVersion: `${nuevaId}_v1`,
          actualizadoEn: '2026-10-20T14:30:00.000Z',
        };
        return respuestaJson(200, estado.estrategia);
      }

      if (path === '/quotes/recalculate' && method === 'POST') {
        if (estado.rechazoRecalculo409) {
          return respuestaJson(409, {
            codigoEstado: 409,
            mensaje: 'Ya existe un proceso de recálculo masivo en ejecución.',
            marcaDeTiempo: '2026-10-20T14:31:00.000Z',
          });
        }
        return respuestaJson(200, {
          totalJugadoresProcesados: 50,
          exitosos: 48,
          fallidos: 0,
          sinEstadisticas: 2,
          estrategiaAplicada: estado.estrategia.estrategiaActivaId,
          versionEstrategia: estado.estrategia.estrategiaActivaVersion,
          duracionMs: 145,
          mensaje: 'Recálculo masivo finalizado exitosamente.',
        });
      }

      // 3. Ranking, cotizaciones y catálogo (/players/*)
      if (path === '/players/ranking' && method === 'GET') {
        if (estado.fallarRankingTemporal) {
          return respuestaJson(500, {
            codigoEstado: 500,
            mensaje: 'Servicio de cotizaciones temporalmente no disponible.',
            marcaDeTiempo: '2026-10-20T12:00:00.000Z',
          });
        }
        const posicion = parsed.searchParams.get('posicion');
        const limite = Number(parsed.searchParams.get('limite') ?? '20');
        const filtrado = posicion
          ? estado.ranking.filter((j) => j.posicion === posicion)
          : estado.ranking;
        return respuestaJson(200, filtrado.slice(0, limite));
      }

      if (path.startsWith('/players/') && path.endsWith('/quotes') && method === 'GET') {
        return respuestaJson(200, estado.cotizacionesSaka);
      }

      if (path === '/players/filters' && method === 'GET') {
        return respuestaJson(200, {
          ligas: [{ id: 'liga-pl', codigo: 'PL', nombre: 'Premier League' }],
          equipos: [{ id: 'eq-arsenal', nombre: 'Arsenal', ligaCodigo: 'PL' }],
          posiciones: ['Delantero', 'Mediocampista'],
        });
      }

      if (path === '/players' && method === 'GET') {
        return respuestaJson(200, {
          items: [DETALLE_SAKA],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasMore: false,
        });
      }

      if (path.startsWith('/players/') && method === 'GET') {
        return respuestaJson(200, DETALLE_SAKA);
      }

      // 4. Órdenes (/orders, /orders/buy, /orders/sell, DELETE /orders/:id)
      if (path === '/orders' && method === 'GET') {
        const jugadorId = parsed.searchParams.get('jugadorId');
        const vendedorId = parsed.searchParams.get('vendedorId');
        let ordenes = [...estado.ordenesAbiertas];
        if (jugadorId) {
          ordenes = ordenes.filter((o) => o.jugadorId === jugadorId);
        }
        if (vendedorId) {
          ordenes = ordenes.filter((o) => o.vendedorId === vendedorId);
        }
        return respuestaJson(200, ordenes);
      }

      if (path === '/orders/buy' && method === 'POST') {
        if (estado.rechazoCompraMensaje) {
          return respuestaJson(409, {
            codigoEstado: 409,
            mensaje: estado.rechazoCompraMensaje,
            marcaDeTiempo: '2026-10-20T12:10:00.000Z',
          });
        }

        const cantidad = Number(rawBody.cantidad ?? 1);
        const jugadorId = String(rawBody.jugadorId ?? JUGADOR_SAKA_ID);
        const precioUnitario = 15.5;
        const montoTotal = Number((cantidad * precioUnitario).toFixed(2));
        estado.saldoTrader = Number((estado.saldoTrader - montoTotal).toFixed(2));

        const itemRanking = estado.ranking.find((j) => j.jugadorId === jugadorId);
        if (itemRanking) {
          itemRanking.tokensDisponibles -= cantidad;
        }

        const existente = estado.posicionesTrader.find(
          (p) => p.jugadorId === jugadorId,
        );
        if (existente) {
          existente.cantidadTokensDisponibles += cantidad;
          const totalTokens =
            existente.cantidadTokensDisponibles + existente.cantidadTokensEnVenta;
          existente.valoracionTotalPosicion = Number(
            (totalTokens * precioUnitario).toFixed(2),
          );
        } else {
          estado.posicionesTrader.push({
            jugadorId,
            nombreJugador: 'Bukayo Saka',
            posicion: 'Delantero',
            equipoNombre: 'Arsenal',
            cantidadTokensDisponibles: cantidad,
            cantidadTokensEnVenta: 0,
            precioPromedioAdquisicion: precioUnitario,
            cotizacionActual: precioUnitario,
            valoracionTotalPosicion: montoTotal,
          });
        }

        const nuevaTxId = `tx-buy-${estado.transaccionesTrader.length + 1}`;
        const nuevaOrdenId = `ord-buy-${estado.transaccionesTrader.length + 1}`;
        const fechaTx = '2026-10-20T12:15:00.000Z';

        const nuevaTx: TransaccionUsuario = {
          transaccionId: nuevaTxId,
          ordenId: nuevaOrdenId,
          tipoOperacion: 'COMPRA',
          tipoMercado: 'PRIMARIO',
          jugadorId,
          nombreJugador: 'Bukayo Saka',
          cantidadTokens: cantidad,
          precioUnitario,
          montoTotal,
          estrategiaCotizacion: estado.estrategia.estrategiaActivaVersion,
          contraparte: 'SISTEMA',
          fecha: fechaTx,
        };
        estado.transaccionesTrader.unshift(nuevaTx);
        estado.transaccionesGlobales.unshift({
          transaccionId: nuevaTxId,
          ordenId: nuevaOrdenId,
          tipoMercado: 'PRIMARIO',
          jugadorId,
          nombreJugador: 'Bukayo Saka',
          compradorId: TRADER_ID,
          vendedorId: 'SISTEMA',
          cantidadTokens: cantidad,
          precioUnitario,
          montoTotal,
          estrategiaCotizacion: estado.estrategia.estrategiaActivaVersion,
          fecha: fechaTx,
        });

        return respuestaJson(201, {
          transaccionId: nuevaTxId,
          ordenId: nuevaOrdenId,
          jugadorId,
          cantidadTokensComprados: cantidad,
          precioUnitarioPagado: precioUnitario,
          montoTotalDebitado: montoTotal,
          saldoRestanteUsuario: estado.saldoTrader,
          tipoMercado: 'PRIMARIO',
          estrategiaCotizacion: estado.estrategia.estrategiaActivaVersion,
          fecha: fechaTx,
        });
      }

      if (path === '/orders/sell' && method === 'POST') {
        const jugadorId = String(rawBody.jugadorId ?? JUGADOR_SAKA_ID);
        const cantidad = Number(rawBody.cantidad ?? 1);
        const precioUnitario = Number(rawBody.precioUnitario ?? 18);

        const pos = estado.posicionesTrader.find((p) => p.jugadorId === jugadorId);
        if (pos) {
          pos.cantidadTokensDisponibles -= cantidad;
          pos.cantidadTokensEnVenta += cantidad;
        }

        const nuevaOrden: OrdenVenta = {
          ordenId: '44444444-4444-4444-8444-444444444444',
          vendedorId: TRADER_ID,
          jugadorId,
          cantidad,
          cantidadRestante: cantidad,
          precioUnitario,
          estado: 'PENDIENTE',
          creadoEn: '2026-10-20T12:20:00.000Z',
          actualizadoEn: '2026-10-20T12:20:00.000Z',
        };
        estado.ordenesAbiertas.push(nuevaOrden);
        return respuestaJson(201, nuevaOrden);
      }

      if (path.startsWith('/orders/') && method === 'DELETE') {
        const ordenId = path.replace('/orders/', '');
        const idx = estado.ordenesAbiertas.findIndex((o) => o.ordenId === ordenId);
        const orden =
          idx >= 0
            ? estado.ordenesAbiertas.splice(idx, 1)[0]
            : {
                ordenId,
                vendedorId: TRADER_ID,
                jugadorId: JUGADOR_SAKA_ID,
                cantidad: 1,
                cantidadRestante: 1,
                precioUnitario: 18,
                estado: 'PENDIENTE' as const,
                creadoEn: '2026-10-20T12:20:00.000Z',
                actualizadoEn: '2026-10-20T12:20:00.000Z',
              };

        const pos = estado.posicionesTrader.find(
          (p) => p.jugadorId === orden.jugadorId,
        );
        if (pos) {
          pos.cantidadTokensEnVenta -= orden.cantidadRestante;
          pos.cantidadTokensDisponibles += orden.cantidadRestante;
        }

        return respuestaJson(200, {
          ...orden,
          estado: 'CANCELADA',
          actualizadoEn: '2026-10-20T12:25:00.000Z',
        });
      }

      // 5. Portfolio e historial (/users/:id/portfolio, /users/:id/transactions)
      if (
        path.startsWith('/users/') &&
        path.endsWith('/transactions') &&
        method === 'GET'
      ) {
        return respuestaJson(200, estado.transaccionesTrader);
      }

      if (
        path.startsWith('/users/') &&
        path.endsWith('/portfolio') &&
        method === 'GET'
      ) {
        if (estado.fallarPortfolioTemporal) {
          return respuestaJson(500, {
            codigoEstado: 500,
            mensaje: 'No fue posible consultar el portafolio en este momento.',
            marcaDeTiempo: '2026-10-20T12:00:00.000Z',
          });
        }
        const valoracionTotalTokens = Number(
          estado.posicionesTrader
            .reduce((acc, p) => acc + p.valoracionTotalPosicion, 0)
            .toFixed(2),
        );
        return respuestaJson(200, {
          usuarioId: TRADER_ID,
          saldoBilletera: estado.saldoTrader,
          valoracionTotalTokens,
          patrimonioNetoTotal: Number(
            (estado.saldoTrader + valoracionTotalTokens).toFixed(2),
          ),
          posiciones: estado.posicionesTrader,
        });
      }

      // 6. Auditoría ADMIN (/admin/transactions)
      if (path === '/admin/transactions' && method === 'GET') {
        estado.llamadasAdminTransactions += 1;
        if (authHeader !== `Bearer ${TOKEN_ADMIN}`) {
          return respuestaJson(403, {
            codigoEstado: 403,
            mensaje: 'Acceso exclusivo para cuentas con rol ADMIN.',
            marcaDeTiempo: '2026-10-20T14:00:00.000Z',
          });
        }
        const tipoMercado = parsed.searchParams.get('tipoMercado');
        const jugadorId = parsed.searchParams.get('jugadorId');
        let filtradas = [...estado.transaccionesGlobales];
        if (tipoMercado) {
          filtradas = filtradas.filter((t) => t.tipoMercado === tipoMercado);
        }
        if (jugadorId) {
          filtradas = filtradas.filter((t) => t.jugadorId === jugadorId);
        }
        return respuestaJson(200, filtradas);
      }

      return respuestaJson(404, {
        codigoEstado: 404,
        mensaje: `Ruta no simulada: ${method} ${path}`,
        marcaDeTiempo: '2026-10-20T12:00:00.000Z',
      });
    });
}

describe('Marketplace Frontend — Critical User Journeys E2E (T078 & T082)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  const originalInnerWidth = window.innerWidth;

  beforeAll(() => {
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.IntersectionObserver = originalIntersectionObserver;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    'CUJ-04 (USUARIO): descubrimiento <= 3 clics, compra primaria < 2000 ms, custodia P2P, cancelación y rechazos limpios en español',
    async () => {
    const estado = crearEstadoInicial();
    instalarFetchSimulado(estado);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    // 1. Login como inversor USUARIO
    await user.type(
      await screen.findByLabelText(/correo electrónico/i),
      'trader@futbol.com',
    );
    await user.type(screen.getByLabelText(/contraseña/i), 'TraderPass123');
    await user.click(
      screen.getByRole('button', { name: /ingresar a la plataforma/i }),
    );

    // 2. Verifica Dashboard ejecutivo en / y ausencia de enlace ADMIN
    expect(
      await screen.findByText(/resumen ejecutivo en tiempo real/i),
    ).toBeInTheDocument();
    expect(document.getElementById('nav-admin')).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-kpi-grid')).toHaveTextContent(
        '1.000,00 cr.',
      );
      expect(screen.getByTestId('dashboard-kpi-grid')).toHaveTextContent(
        'Ponderación Global',
      );
    });

    // 3. Descubrimiento en un máximo de 3 clics desde Dashboard -> Marketplace -> Filtro -> Modal con gráfica lineal
    let clicsDescubrimiento = 0;

    const navMarketplace = document.getElementById('nav-marketplace');
    expect(navMarketplace).not.toBeNull();
    await user.click(navMarketplace!);
    clicsDescubrimiento += 1;

    const tabDelantero = await screen.findByRole('button', {
      name: 'Delantero',
    });
    await user.click(tabDelantero);
    clicsDescubrimiento += 1;

    await waitFor(() => {
      expect(screen.queryByText('Pedri González')).not.toBeInTheDocument();
    });

    const btnJugador = await screen.findByRole('button', {
      name: 'Bukayo Saka',
    });
    await user.click(btnJugador);
    clicsDescubrimiento += 1;

    expect(clicsDescubrimiento).toBeLessThanOrEqual(3);
    expect(
      await screen.findByTestId('player-quote-linear-chart'),
    ).toBeInTheDocument();

    // 4. Verifica rechazo limpio en español sin trazas ni nombres de excepciones
    estado.rechazoCompraMensaje =
      'La cotización vigente superó el precio máximo unitario configurado.';
    const inputCantidad = screen.getByLabelText(/cantidad de tokens/i);
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '2');

    await user.click(
      screen.getByRole('button', { name: /confirmar compra primaria/i }),
    );

    const alertaRechazo = await screen.findByRole('alert');
    expect(alertaRechazo).toHaveTextContent(
      'La cotización vigente superó el precio máximo unitario configurado.',
    );
    expect(alertaRechazo.textContent ?? '').not.toMatch(
      PATRON_SIN_TRAZAS_CRUDAS,
    );

    // 5. Ejecuta compra primaria real y mide tiempo de revalidación de saldo y disponibilidad (< 2000 ms)
    estado.rechazoCompraMensaje = null;
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '2');

    const inicioCompraMs = performance.now();
    await user.click(
      screen.getByRole('button', { name: /confirmar compra primaria/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/¡compra confirmada! adquiriste 2 token\(s\)/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId('primary-buy-summary')).toHaveTextContent(
        '969,00 cr.',
      );
      expect(screen.getByTestId('ranking-table-card')).toHaveTextContent(
        '78 / 100',
      );
    });
    const duracionRevalidacionMs = performance.now() - inicioCompraMs;
    expect(duracionRevalidacionMs).toBeLessThan(2000);

    // Cierra el modal de detalle
    await user.click(
      screen.getByRole('button', { name: /cerrar detalle del jugador/i }),
    );

    // 6. Navega a /portfolio y revisa KPIs, PnL, gráfica lineal e historial
    const navPortfolio = document.getElementById('nav-portfolio');
    expect(navPortfolio).not.toBeNull();
    await user.click(navPortfolio!);

    const summaryCards = await screen.findByTestId('portfolio-summary-cards');
    expect(summaryCards).toHaveTextContent('969,00 cr.');
    expect(summaryCards).toHaveTextContent('31,00 cr.');
    expect(summaryCards).toHaveTextContent('1.000,00 cr.');
    expect(
      screen.getByTestId('portfolio-balance-linear-chart'),
    ).toBeInTheDocument();

    // 7. Publica orden de venta secundaria P2P verificando reserva en custodia
    const btnVender = await screen.findByRole('button', { name: 'Vender' });
    await user.click(btnVender);

    const formVenta = await screen.findByTestId('publish-sell-order-form');
    const inputPrecioVenta = within(formVenta).getByLabelText(
      /precio unitario \(cr\.\)/i,
    );
    await user.clear(inputPrecioVenta);
    await user.type(inputPrecioVenta, '18.00');
    await user.click(
      within(formVenta).getByRole('button', {
        name: /publicar orden de venta/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('1 en venta')).toBeInTheDocument();
    });
    const seccionCustodia = screen.getByTestId('open-sell-orders-section');
    expect(seccionCustodia).toHaveTextContent('Bukayo Saka');
    expect(seccionCustodia).toHaveTextContent('18,00 cr.');

    // 8. Cancela orden abierta verificando restitución de tokens disponibles
    await user.click(
      within(seccionCustodia).getByRole('button', { name: /cancelar orden/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/orden cancelada exitosamente/i),
      ).toBeInTheDocument();
      expect(screen.queryByText('1 en venta')).not.toBeInTheDocument();
      expect(screen.getByTestId('open-sell-orders-empty')).toBeInTheDocument();
    });
  }, 20000);

  it(
    'CUJ-05 (RBAC + ADMIN): bloquea /admin para USUARIO sin filtrar datos y ejecuta gobernanza completa para ADMIN',
    async () => {
    const estado = crearEstadoInicial();
    instalarFetchSimulado(estado);
    const user = userEvent.setup();

    // 1. Hidrata sesión USUARIO e intenta acceder directamente a /admin
    StorageService.guardarSesion(TOKEN_TRADER, {
      id: TRADER_ID,
      nombre: 'Martín Trader',
      correo: 'trader@futbol.com',
      activo: true,
      creadoEn: '2026-10-01T10:00:00.000Z',
      rol: 'USUARIO',
      saldo: 1000,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const avisoRestringido = await screen.findByText(
      /acceso restringido: el panel de gobernanza es exclusivo para cuentas administradoras/i,
    );
    expect(avisoRestringido).toBeInTheDocument();
    expect(estado.llamadasAdminTransactions).toBe(0);
    expect(
      screen.queryByText(/panel de gobernanza y auditoría/i),
    ).not.toBeInTheDocument();

    // Cierra sesión del trader y desmonta para iniciar flujo ADMIN desde /login
    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(
      await screen.findByRole('button', { name: /ingresar a la plataforma/i }),
    ).toBeInTheDocument();
    unmount();

    // 2. Inicia sesión como ADMIN y opera /admin de punta a punta
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(
      await screen.findByLabelText(/correo electrónico/i),
      'admin@futbol.com',
    );
    await user.type(screen.getByLabelText(/contraseña/i), 'AdminPass123');
    await user.click(
      screen.getByRole('button', { name: /ingresar a la plataforma/i }),
    );

    const navAdmin = await waitFor(() => {
      const el = document.getElementById('nav-admin');
      expect(el).not.toBeNull();
      return el!;
    });
    await user.click(navAdmin);

    expect(
      await screen.findByText(/panel de gobernanza y auditoría/i),
    ).toBeInTheDocument();

    // 3. Cambio de estrategia activa a POSICIONAL
    await user.click(
      await screen.findByRole('button', {
        name: /activar ponderación posicional/i,
      }),
    );
    expect(
      await screen.findByText(
        /estrategia activa actualizada a ponderación posicional \(posicional_v1\)/i,
      ),
    ).toBeInTheDocument();

    // 4. Conflicto 409 limpio sin trazas y posterior recálculo manual exitoso
    estado.rechazoRecalculo409 = true;
    await user.click(
      screen.getByRole('button', { name: /recalcular cotizaciones ahora/i }),
    );
    const alertaConflicto = await within(
      screen.getByTestId('manual-recalculate-card'),
    ).findByRole('alert');
    expect(alertaConflicto).toHaveTextContent(
      /ya existe un proceso de recálculo masivo en ejecución/i,
    );
    expect(alertaConflicto.textContent ?? '').not.toMatch(
      PATRON_SIN_TRAZAS_CRUDAS,
    );

    estado.rechazoRecalculo409 = false;
    await user.click(
      screen.getByRole('button', { name: /recalcular cotizaciones ahora/i }),
    );
    const resumenRecalculo = await screen.findByTestId(
      'recalculate-summary-box',
    );
    expect(resumenRecalculo).toHaveTextContent('50');
    expect(resumenRecalculo).toHaveTextContent('48');
    expect(resumenRecalculo).toHaveTextContent('145 ms');

    // 5. Validación preventiva y filtrado en tabla global de auditoría
    const seccionAuditoria = screen.getByTestId('admin-audit-section');
    const inputJugadorUuid = within(seccionAuditoria).getByLabelText(
      /id de jugador \(uuid v4\)/i,
    );
    await user.type(inputJugadorUuid, 'uuid-invalido');
    await user.click(
      within(seccionAuditoria).getByRole('button', {
        name: /aplicar filtros/i,
      }),
    );

    const alertaFiltro = await within(seccionAuditoria).findByRole('alert');
    expect(alertaFiltro.textContent ?? '').not.toMatch(
      PATRON_SIN_TRAZAS_CRUDAS,
    );

    await user.clear(inputJugadorUuid);
    await user.type(inputJugadorUuid, JUGADOR_PEDRI_ID);
    await user.selectOptions(
      within(seccionAuditoria).getByLabelText(/tipo de mercado/i),
      'PRIMARIO',
    );
    await user.click(
      within(seccionAuditoria).getByRole('button', {
        name: /aplicar filtros/i,
      }),
    );

    await waitFor(() => {
      expect(seccionAuditoria).toHaveTextContent('Pedri González');
    });

    await user.click(
      within(seccionAuditoria).getByRole('button', {
        name: /limpiar filtros/i,
      }),
    );
    expect(inputJugadorUuid).toHaveValue('');
  }, 20000);

  it(
    'CUJ-06 (Responsividad SC-007 + Resiliencia): matriz de viewports escritorio/móvil en las 5 vistas y recuperación ante errores',
    async () => {
    const estado = crearEstadoInicial();
    estado.posicionesTrader = [
      {
        jugadorId: JUGADOR_SAKA_ID,
        nombreJugador: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal',
        cantidadTokensDisponibles: 2,
        cantidadTokensEnVenta: 0,
        precioPromedioAdquisicion: 14.0,
        cotizacionActual: 15.5,
        valoracionTotalPosicion: 31.0,
      },
    ];
    instalarFetchSimulado(estado);
    const user = userEvent.setup();

    // Verifica primero limpieza ante token expirado (hidratación 401)
    StorageService.guardarSesion(TOKEN_EXPIRADO, {
      id: TRADER_ID,
      nombre: 'Martín Trader',
      correo: 'trader@futbol.com',
      activo: true,
      creadoEn: '2026-10-01T10:00:00.000Z',
      rol: 'USUARIO',
      saldo: 1000,
    });

    const vistaExpirada = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/la sesión expiró\. inicie sesión nuevamente\./i),
    ).toBeInTheDocument();
    vistaExpirada.unmount();

    // Verifica recuperación ante errores temporales en Marketplace y Portfolio
    StorageService.guardarSesion(TOKEN_TRADER, {
      id: TRADER_ID,
      nombre: 'Martín Trader',
      correo: 'trader@futbol.com',
      activo: true,
      creadoEn: '2026-10-01T10:00:00.000Z',
      rol: 'USUARIO',
      saldo: 1000,
    });
    estado.fallarRankingTemporal = true;
    estado.fallarPortfolioTemporal = true;

    const vistaRecuperacion = render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const cajaErrorRanking = await screen.findByTestId('ranking-error');
    estado.fallarRankingTemporal = false;
    await user.click(
      within(cajaErrorRanking).getByRole('button', { name: /reintentar/i }),
    );
    expect(
      await screen.findByTestId('ranking-table-card'),
    ).toBeInTheDocument();

    await user.click(document.getElementById('nav-portfolio')!);
    const cajaErrorPortfolio = await screen.findByTestId('portfolio-error');
    estado.fallarPortfolioTemporal = false;
    await user.click(
      within(cajaErrorPortfolio).getByRole('button', { name: /reintentar/i }),
    );
    expect(
      await screen.findByTestId('portfolio-summary-cards'),
    ).toBeInTheDocument();
    vistaRecuperacion.unmount();

    // Matriz automatizada de viewports (escritorio >= 1024px y móvil 360px-768px) sobre las 5 vistas principales
    const viewports = [1280, 1024, 768, 390, 360];
    StorageService.guardarSesion(TOKEN_ADMIN, {
      id: ADMIN_ID,
      nombre: 'Sofía Admin',
      correo: 'admin@futbol.com',
      activo: true,
      creadoEn: '2026-10-01T08:00:00.000Z',
      rol: 'ADMIN',
      saldo: 0,
    });

    for (const ancho of viewports) {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: ancho,
      });
      window.dispatchEvent(new Event('resize'));

      const { container, unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      );

      // Vista 1: / (Dashboard)
      expect(
        await screen.findByTestId('dashboard-kpi-grid'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Actualizar' }),
      ).toBeEnabled();

      // Vista 2: /marketplace
      await user.click(document.getElementById('nav-marketplace')!);
      expect(
        await screen.findByTestId('ranking-table-card'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('.marketplace-table-scroll'),
      ).not.toBeNull();

      // Vista 3: /players (Catálogo)
      await user.click(document.getElementById('nav-players-catalog')!);
      expect(await screen.findByTestId('btn-open-filters')).toBeEnabled();

      // Vista 4: /portfolio
      await user.click(document.getElementById('nav-portfolio')!);
      expect(
        await screen.findByTestId('portfolio-summary-cards'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('.portfolio-table-scroll'),
      ).not.toBeNull();

      // Vista 5: /admin (Gobernanza)
      await user.click(document.getElementById('nav-admin')!);
      expect(
        await screen.findByTestId('admin-audit-section'),
      ).toBeInTheDocument();
      expect(container.querySelector('.admin-table-scroll')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: /recalcular cotizaciones ahora/i }),
      ).toBeEnabled();

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        Math.max(document.documentElement.clientWidth, ancho),
      );

      unmount();
    }
  }, 30000);
});
