import React, { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePortfolio } from '../hooks/usePortfolio';
import { AppLayout } from '../components/layout/AppLayout';
import { Navbar } from '../components/layout/Navbar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { PortfolioSummaryCards } from '../components/portfolio/PortfolioSummaryCards';
import { PortfolioBalanceLinearChart } from '../components/portfolio/PortfolioBalanceLinearChart';
import { PortfolioPositionsTable } from '../components/portfolio/PortfolioPositionsTable';
import { OpenSellOrdersSection } from '../components/portfolio/OpenSellOrdersSection';
import { UserTransactionsHistory } from '../components/portfolio/UserTransactionsHistory';
import { PublishSellOrderForm } from '../components/player-detail/PublishSellOrderForm';
import { PlayerDetailModal } from '../components/player-detail/PlayerDetailModal';
import { construirItemsNavegacion } from '../utils/navegacion';
import type { PosicionEnriquecida } from '../utils/portfolio-chart';
import '../styles/marketplace.css';
import '../styles/portfolio.css';

export const PortfolioView: React.FC = () => {
  const { usuario, logout } = useAuth();
  const {
    resumen,
    transaccionesFiltradas,
    ordenesAbiertas,
    filtrosHistorial,
    errorValidacionFiltros,
    cargando,
    operando,
    error,
    actualizarFiltroHistorial,
    limpiarFiltrosHistorial,
    publicarVenta,
    cancelarOrden,
    recargar,
  } = usePortfolio();

  const [jugadorDetalleId, setJugadorDetalleId] = useState<string | null>(null);
  const [jugadorParaVenderId, setJugadorParaVenderId] = useState<string | null>(
    null,
  );

  const navItems = useMemo(
    () => construirItemsNavegacion(usuario?.rol),
    [usuario?.rol],
  );

  const opcionesJugadores = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const pos of resumen?.posiciones ?? []) {
      mapa.set(pos.jugadorId, pos.nombreJugador);
    }
    for (const tx of transaccionesFiltradas) {
      if (!mapa.has(tx.jugadorId)) {
        mapa.set(tx.jugadorId, tx.nombreJugador);
      }
    }
    return Array.from(mapa.entries()).map(([jugadorId, nombreJugador]) => ({
      jugadorId,
      nombreJugador,
    }));
  }, [resumen?.posiciones, transaccionesFiltradas]);

  const nombresPorJugador = useMemo(() => {
    const record: Record<string, string> = {};
    for (const op of opcionesJugadores) {
      record[op.jugadorId] = op.nombreJugador;
    }
    return record;
  }, [opcionesJugadores]);

  const posicionEnVentaActiva: PosicionEnriquecida | null = useMemo(() => {
    if (!jugadorParaVenderId || !resumen) return null;
    return (
      resumen.posiciones.find((p) => p.jugadorId === jugadorParaVenderId) ?? null
    );
  }, [jugadorParaVenderId, resumen]);

  const navbarProps = useMemo(
    () => ({
      titulo: 'Football Token Marketplace',
      items: navItems,
      onLogout: logout,
      brandLink: '/',
    }),
    [navItems, logout],
  );

  return (
    <AppLayout
      className="portfolio-page"
      navbarProps={navbarProps}
    >
      <div className="portfolio-container">
        <header className="portfolio-header">
          <div>
            <h1 className="portfolio-title">Mi Portfolio Personal</h1>
            <p className="portfolio-subtitle">
              Patrimonio consolidado, evolución lineal de balance, posiciones en custodia e historial
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            cargando={cargando}
            onClick={() => void recargar()}
          >
            Actualizar
          </Button>
        </header>

        {cargando && !resumen && !error && (
          <div className="marketplace-empty-box" data-testid="portfolio-loading">
            <Spinner size="md" ariaLabel="Cargando portafolio personal" />
            <p style={{ marginTop: '0.75rem' }}>
              Sincronizando saldo, posiciones y serie patrimonial...
            </p>
          </div>
        )}

        {error && (
          <div className="marketplace-empty-box" data-testid="portfolio-error">
            <Alert tipo="error" mensaje={error} />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void recargar()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!error && resumen && (
          <>
            <PortfolioSummaryCards resumen={resumen} />

            <PortfolioBalanceLinearChart
              serieTemporal={resumen.serieTemporal}
              sinOperaciones={resumen.sinOperaciones}
            />

            <PortfolioPositionsTable
              posiciones={resumen.posiciones}
              onSeleccionarJugador={(id) => setJugadorDetalleId(id)}
              onSolicitarVenta={(pos) => setJugadorParaVenderId(pos.jugadorId)}
            />

            {posicionEnVentaActiva &&
              posicionEnVentaActiva.cantidadTokensDisponibles >= 1 && (
                <div className="portfolio-sell-drawer">
                  <PublishSellOrderForm
                    nombreJugador={posicionEnVentaActiva.nombreJugador}
                    cantidadTokensDisponibles={
                      posicionEnVentaActiva.cantidadTokensDisponibles
                    }
                    cotizacionActual={posicionEnVentaActiva.cotizacionActual}
                    operando={operando}
                    onPublicarVenta={(cantidad, precioUnitario) =>
                      publicarVenta(
                        posicionEnVentaActiva.jugadorId,
                        cantidad,
                        precioUnitario,
                      )
                    }
                    onCerrar={() => setJugadorParaVenderId(null)}
                  />
                </div>
              )}

            <OpenSellOrdersSection
              ordenes={ordenesAbiertas}
              nombresPorJugador={nombresPorJugador}
              operando={operando}
              onCancelarOrden={cancelarOrden}
            />

            <UserTransactionsHistory
              transacciones={transaccionesFiltradas}
              filtros={filtrosHistorial}
              errorValidacion={errorValidacionFiltros}
              opcionesJugadores={opcionesJugadores}
              onActualizarFiltro={actualizarFiltroHistorial}
              onLimpiarFiltros={limpiarFiltrosHistorial}
            />
          </>
        )}
      </div>

      <PlayerDetailModal
        playerId={jugadorDetalleId}
        onClose={() => setJugadorDetalleId(null)}
        onMarketMutation={() => void recargar()}
      />
    </AppLayout>
  );
};
