import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdminGovernance } from '../hooks/useAdminGovernance';
import { AppLayout } from '../components/layout/AppLayout';
import { Navbar } from '../components/layout/Navbar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { StrategyGovernanceCard } from '../components/admin/StrategyGovernanceCard';
import { ManualRecalculateCard } from '../components/admin/ManualRecalculateCard';
import { AdminAuditTable } from '../components/admin/AdminAuditTable';
import { construirItemsNavegacion } from '../utils/navegacion';
import '../styles/marketplace.css';
import '../styles/portfolio.css';
import '../styles/admin.css';

export const AdminGovernanceView: React.FC = () => {
  const { usuario, logout } = useAuth();
  const {
    estrategia,
    transacciones,
    ultimoRecalculo,
    filtrosAuditoria,
    errorValidacionFiltros,
    cargando,
    cambiandoEstrategia,
    recalculando,
    error,
    cambiarEstrategia,
    dispararRecalculo,
    actualizarBorradorFiltro,
    aplicarFiltrosAuditoria,
    limpiarFiltrosAuditoria,
    recargar,
  } = useAdminGovernance();

  const navItems = useMemo(
    () => construirItemsNavegacion(usuario?.rol),
    [usuario?.rol],
  );

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
      className="admin-page"
      navbarProps={navbarProps}
    >
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <span className="admin-role-badge">Rol ADMIN • Control Económico</span>
            <h1 className="admin-title">Panel de Gobernanza y Auditoría</h1>
            <p className="admin-subtitle">
              Administración de estrategias de valuación oficial, recálculo masivo y auditoría global
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

        {error && <Alert tipo="error" mensaje={error} />}

        <div className="admin-governance-grid">
          <StrategyGovernanceCard
            estrategia={estrategia}
            cambiando={cambiandoEstrategia}
            onCambiarEstrategia={cambiarEstrategia}
          />

          <ManualRecalculateCard
            recalculando={recalculando}
            ultimoRecalculo={ultimoRecalculo}
            onDispararRecalculo={dispararRecalculo}
          />
        </div>

        <AdminAuditTable
          transacciones={transacciones}
          filtros={filtrosAuditoria}
          errorValidacion={errorValidacionFiltros}
          cargando={cargando}
          onActualizarBorrador={actualizarBorradorFiltro}
          onAplicarFiltros={aplicarFiltrosAuditoria}
          onLimpiarFiltros={limpiarFiltrosAuditoria}
        />
      </div>
    </AppLayout>
  );
};

