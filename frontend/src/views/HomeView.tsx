import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { construirItemsNavegacion } from '../utils/navegacion';
import {
  formatearCreditos,
  formatearNombreEstrategia,
  formatearPorcentajeVariacion,
} from '../utils/formato-mercado';
import { AppLayout } from '../components/layout/AppLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PlayerDetailModal } from '../components/player-detail/PlayerDetailModal';
import '../styles/home.css';
import '../styles/components.css';
import '../styles/marketplace.css';

interface EstadoRutaDashboard {
  avisoSeguridad?: string;
}

export function HomeView() {
  const { usuario, tokenDeAcceso, logout } = useAuth();
  const location = useLocation();
  const [jugadorDetalleId, setJugadorDetalleId] = useState<string | null>(null);

  const resumen = useDashboardSummary(usuario?.id, tokenDeAcceso);

  if (!usuario) return null;

  const estadoNavegacion = (location.state ?? null) as EstadoRutaDashboard | null;
  const avisoSeguridad = estadoNavegacion?.avisoSeguridad;

  const navbarProps = {
    titulo: 'Football Token Marketplace',
    items: construirItemsNavegacion(usuario.rol),
    onLogout: logout,
    brandLink: '/',
  };

  const saldoMostrado =
    resumen.portfolio?.saldoBilletera ?? usuario.saldo ?? 0;
  const patrimonioMostrado =
    resumen.portfolio?.patrimonioNetoTotal ?? saldoMostrado;
  const signoCredito = resumen.gananciaLatenteCreditos > 0 ? '+' : '';

  return (
    <AppLayout navbarProps={navbarProps} className="home-page">
      <main className="home-content home-content-expanded">
        {avisoSeguridad && (
          <div style={{ width: '100%', maxWidth: '1180px', marginBottom: '1rem' }}>
            <Alert tipo="warning" mensaje={avisoSeguridad} />
          </div>
        )}

        <div className="home-welcome-card card card-glass">
          <div className="home-avatar" aria-hidden="true">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>

          <h1 className="home-welcome-title">
            ¡Bienvenido de vuelta, <span className="user-name">{usuario.nombre}</span>!
          </h1>
          <p className="home-welcome-subtitle">
            Tu espacio de inversión deportiva está listo
          </p>

          <div className="home-status-grid">
            <div className="status-card">
              <div className="status-card-icon">🟢</div>
              <div className="status-card-label">Estado</div>
              <div className="status-card-value status-active">
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-card-icon">⭐</div>
              <div className="status-card-label">Nivel</div>
              <div className="status-card-value status-tier">
                {usuario.rol === 'ADMIN' ? 'Administrador' : 'Inversor'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-card-icon">📊</div>
              <div className="status-card-label">Portfolio</div>
              <div className="status-card-value">Activo</div>
            </div>
          </div>

          <div className="home-user-info">
            <span className="home-user-info-dot" />
            <span>Sesión activa — {usuario.correo}</span>
          </div>
        </div>

        <section
          className="dashboard-executive-wrapper"
          aria-label="Resumen ejecutivo de cuenta y mercado"
        >
          <div className="marketplace-header">
            <div className="marketplace-header-titles">
              <h2 className="portfolio-section-title" style={{ fontSize: '1.35rem' }}>
                Resumen Ejecutivo en Tiempo Real
              </h2>
              <p className="marketplace-subtitle">
                Indicadores consolidados de liquidez, patrimonio y líderes de
                cotización.
              </p>
            </div>
            <div className="dashboard-quick-links">
              <Link to="/marketplace" className="btn btn-primary btn-sm">
                Explorar Marketplace
              </Link>
              <Link to="/players" className="btn btn-secondary btn-sm">
                Ver Catálogo
              </Link>
              <Link to="/portfolio" className="btn btn-secondary btn-sm">
                Mi Portfolio
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                cargando={resumen.cargando}
                onClick={() => {
                  void resumen.recargar();
                }}
              >
                Actualizar
              </Button>
            </div>
          </div>

          <div className="dashboard-kpi-grid" data-testid="dashboard-kpi-grid">
            <div className="dashboard-kpi-card">
              <span className="dashboard-kpi-label">Saldo Líquido Disponible</span>
              <span className="dashboard-kpi-value">
                {formatearCreditos(saldoMostrado)} cr.
              </span>
            </div>

            <div className="dashboard-kpi-card">
              <span className="dashboard-kpi-label">Patrimonio Neto Total</span>
              <span className="dashboard-kpi-value">
                {formatearCreditos(patrimonioMostrado)} cr.
              </span>
            </div>

            <div className="dashboard-kpi-card">
              <span className="dashboard-kpi-label">
                Rendimiento Latente Consolidado
              </span>
              <span className="dashboard-kpi-value">
                {signoCredito}
                {formatearCreditos(resumen.gananciaLatenteCreditos)} cr.
              </span>
              <span
                className={`trend-badge trend-${resumen.tendenciaLatente}`}
                style={{ alignSelf: 'flex-start' }}
              >
                {formatearPorcentajeVariacion(resumen.gananciaLatentePorcentaje)}
              </span>
            </div>

            <div className="dashboard-kpi-card">
              <span className="dashboard-kpi-label">Estrategia Vigente</span>
              <span className="dashboard-kpi-value" style={{ fontSize: '1.15rem' }}>
                {resumen.estrategia
                  ? formatearNombreEstrategia(resumen.estrategia.estrategiaActivaId)
                  : 'Cargando estrategia...'}
              </span>
              {resumen.estrategia && (
                <span className="strategy-version-pill" style={{ alignSelf: 'flex-start' }}>
                  {resumen.estrategia.estrategiaActivaVersion}
                </span>
              )}
            </div>
          </div>

          {resumen.topRanking.length > 0 && (
            <div className="ranking-table-card" data-testid="dashboard-top-ranking">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <strong>Destacados del Tope del Ranking</strong>
              </div>
              <div className="marketplace-table-scroll">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Demarcación</th>
                      <th>Cotización</th>
                      <th>Variación</th>
                      <th>Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topRanking.map((jug) => (
                      <tr
                        key={jug.jugadorId}
                        className="ranking-row-clickable"
                        onClick={() => setJugadorDetalleId(jug.jugadorId)}
                      >
                        <td>{jug.posicionRanking}</td>
                        <td>
                          <button
                            type="button"
                            className="ranking-player-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJugadorDetalleId(jug.jugadorId);
                            }}
                          >
                            {jug.nombre}
                          </button>
                          <span className="ranking-club-sub" style={{ display: 'block' }}>
                            {jug.equipoNombre}
                          </span>
                        </td>
                        <td>{jug.posicion}</td>
                        <td>{formatearCreditos(jug.cotizacionActual)} cr.</td>
                        <td>{formatearPorcentajeVariacion(jug.variacionPorcentual)}</td>
                        <td>{jug.tokensDisponibles} / 100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      <PlayerDetailModal
        playerId={jugadorDetalleId}
        onClose={() => setJugadorDetalleId(null)}
        onMarketMutation={() => {
          void resumen.recargar();
        }}
      />
    </AppLayout>
  );
}
