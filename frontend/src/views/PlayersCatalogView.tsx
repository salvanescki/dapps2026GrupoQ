import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePlayerFilters } from '../hooks/usePlayerFilters';
import { useInfinitePlayers } from '../hooks/useInfinitePlayers';
import { SearchBar } from '../components/catalog/SearchBar';
import { FilterModal } from '../components/catalog/FilterModal';
import { ActiveFiltersBar } from '../components/catalog/ActiveFiltersBar';
import { PlayerGrid } from '../components/catalog/PlayerGrid';
import { EmptyState } from '../components/catalog/EmptyState';
import { Navbar } from '../components/layout/Navbar';
import { Alert } from '../components/ui/Alert';
import '../styles/catalog.css';
import '../styles/components.css';

export const PlayersCatalogView: React.FC = () => {
  const { logout } = useAuth();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const {
    filters,
    filterOptions,
    activeFiltersCount,
    setSearch,
    removeFilter,
    clearFilters,
    applyFilters,
  } = usePlayerFilters();

  const {
    players,
    loading,
    loadingMore,
    hasMore,
    error,
    total,
    sentinelRef,
    reload,
  } = useInfinitePlayers({
    league: filters.league,
    teamId: filters.teamId,
    position: filters.position,
    search: filters.search,
    limit: 20,
  });

  const handleResetFilters = () => {
    clearFilters();
    reload();
  };

  const navItems = [
    {
      label: 'Dashboard',
      to: '/',
      id: 'nav-dashboard',
    },
  ];

  return (
    <div className="catalog-page">
      {/* Navbar Superior Unificado */}
      <Navbar
        titulo="Football Token Marketplace"
        logoIcono="⚽"
        items={navItems}
        onLogout={logout}
        brandLink="/"
      />

      {/* Contenedor Principal */}
      <main className="catalog-container">
        {/* Encabezado */}
        <header className="catalog-header">
          <div className="catalog-title-wrapper">
            <h1 className="catalog-title">
              Catálogo de Jugadores de las{' '}
              <span className="highlight">5 Grandes Ligas</span>
            </h1>
            {!loading && (
              <span
                className="catalog-count-badge"
                data-testid="catalog-count-badge"
              >
                {total} futbolistas disponibles
              </span>
            )}
          </div>
          <p className="catalog-subtitle">
            Explora futbolistas de la Premier League, La Liga, Serie A,
            Bundesliga y Ligue 1 en tiempo real.
          </p>
        </header>

        {/* Barra de Herramientas: Búsqueda y Filtros */}
        <section className="catalog-toolbar" aria-label="Controles del catálogo">
          <SearchBar
            value={filters.search}
            onChange={setSearch}
            placeholder="Buscar futbolista por nombre (ej. Saka, Modrić)..."
          />

          <button
            type="button"
            className={`btn-filter-trigger ${activeFiltersCount > 0 ? 'active' : ''}`}
            onClick={() => setIsFilterModalOpen(true)}
            data-testid="btn-open-filters"
            aria-label="Abrir panel de filtros"
          >
            <span aria-hidden="true">⚙️</span>
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span
                className="filter-badge-counter"
                data-testid="filter-badge-counter"
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </section>

        {/* Chips de Filtros Activos */}
        <ActiveFiltersBar
          filters={filters}
          filterOptions={filterOptions}
          onRemoveFilter={removeFilter}
          onClearAll={handleResetFilters}
        />

        {/* Mensaje de Error */}
        {error && (
          <div data-testid="catalog-error">
            <Alert tipo="error" mensaje={error} />
          </div>
        )}

        {/* Estado de Carga Inicial */}
        {loading && (
          <div
            className="catalog-loading-footer"
            data-testid="catalog-initial-loading"
          >
            <span>Cargando catálogo de futbolistas...</span>
          </div>
        )}

        {/* Estado Vacío (Sin Resultados) */}
        {!loading && !error && players.length === 0 && (
          <EmptyState
            onReset={handleResetFilters}
            title="Sin coincidencias en el catálogo"
            message="No se encontraron jugadores que coincidan con los filtros seleccionados. Intenta restablecer los filtros para ver la nómina completa."
          />
        )}

        {/* Cuadrícula de Futbolistas */}
        {!loading && players.length > 0 && (
          <>
            <PlayerGrid players={players} />

            {/* Elemento Centinela para Scroll Infinito */}
            <div
              ref={sentinelRef}
              className="infinite-scroll-sentinel"
              data-testid="infinite-scroll-sentinel"
            />

            {/* Indicador de carga de más elementos */}
            {loadingMore && (
              <div
                className="catalog-loading-footer"
                data-testid="loading-more-spinner"
              >
                <span>Cargando más futbolistas...</span>
              </div>
            )}

            {/* Mensaje de Fin de Catálogo */}
            {!hasMore && (
              <div className="catalog-end-message">
                Has llegado al final del catálogo de jugadores.
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Desplegable de Filtros */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        filterOptions={filterOptions}
        onApply={applyFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
};
