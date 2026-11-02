import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceRanking } from '../hooks/useMarketplaceRanking';
import { construirItemsNavegacion } from '../utils/navegacion';
import { AppLayout } from '../components/layout/AppLayout';
import { StrategyBanner } from '../components/marketplace/StrategyBanner';
import { RankingFiltersBar } from '../components/marketplace/RankingFiltersBar';
import { RankingTable } from '../components/marketplace/RankingTable';
import { PlayerDetailModal } from '../components/player-detail/PlayerDetailModal';
import '../styles/components.css';
import '../styles/marketplace.css';

export const MarketplaceView: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [jugadorSeleccionadoId, setJugadorSeleccionadoId] = useState<string | null>(
    null,
  );

  const {
    ranking,
    estrategia,
    posicionFiltro,
    cambiarPosicion,
    cargando,
    error,
    recargar,
  } = useMarketplaceRanking('Todas');

  const navbarProps = {
    titulo: 'Football Token Marketplace',
    items: construirItemsNavegacion(usuario?.rol),
    onLogout: logout,
    brandLink: '/',
  };

  return (
    <AppLayout navbarProps={navbarProps} className="marketplace-page">
      <main className="marketplace-container">
        <header className="marketplace-header">
          <div className="marketplace-header-titles">
            <h1 className="marketplace-title">
              Cartelera y Ranking del Marketplace
            </h1>
            <p className="marketplace-subtitle">
              Clasificación oficial ordenada por cotización vigente sobre un
              suministro fijo de 100 tokens indivisibles por futbolista.
            </p>
          </div>
        </header>

        <StrategyBanner estrategia={estrategia} />

        <RankingFiltersBar
          posicionActiva={posicionFiltro}
          onCambiarPosicion={cambiarPosicion}
          onActualizar={() => {
            void recargar();
          }}
          cargando={cargando}
        />

        <RankingTable
          ranking={ranking}
          cargando={cargando}
          error={error}
          onReintentar={() => {
            void recargar();
          }}
          onSeleccionarJugador={(id) => setJugadorSeleccionadoId(id)}
        />
      </main>

      <PlayerDetailModal
        playerId={jugadorSeleccionadoId}
        onClose={() => setJugadorSeleccionadoId(null)}
        onMarketMutation={() => {
          void recargar();
        }}
      />
    </AppLayout>
  );
};

