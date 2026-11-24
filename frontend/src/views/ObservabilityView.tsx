import React from 'react';
import { useObservability } from '../hooks/useObservability';
import { ObservabilityToolbar } from '../components/admin/observability/ObservabilityToolbar';
import { HealthStatusCard } from '../components/admin/observability/HealthStatusCard';
import { MarketplaceMetricsCard } from '../components/admin/observability/MarketplaceMetricsCard';
import { PricingMetricsCard } from '../components/admin/observability/PricingMetricsCard';
import { ScrapingMetricsCard } from '../components/admin/observability/ScrapingMetricsCard';
import { SystemIntegrationCard } from '../components/admin/observability/SystemIntegrationCard';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import '../styles/observability.css';

export function ObservabilityView() {
  const {
    cargando,
    actualizando,
    error,
    errorReadiness,
    errorLiveness,
    errorMetrics,
    readiness,
    liveness,
    metricas,
    intervaloRefresco,
    setIntervaloRefresco,
    ultimaSincronizacion,
    estadoConexion,
    refrescar,
  } = useObservability();

  return (
    <div className="observability-page">
      <div className="observability-container">
        <header className="observability-header">
          <div>
            <h1 className="observability-title">Observabilidad y Métricas del Sistema</h1>
            <p className="observability-subtitle">
              Monitoreo en tiempo real de infraestructura, servicios críticos, cotizaciones y trading
            </p>
          </div>
        </header>

        <ObservabilityToolbar
          intervaloRefresco={intervaloRefresco}
          onChangeIntervalo={setIntervaloRefresco}
          onRefrescarManual={refrescar}
          actualizando={actualizando}
          ultimaSincronizacion={ultimaSincronizacion}
          estadoConexion={estadoConexion}
        />

        {error && <Alert tipo="error" mensaje={error} />}

        {cargando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner />
          </div>
        ) : (
          <main className="observability-grid">
            {/* US2: Sondas de Salud e Infraestructura */}
            <HealthStatusCard
              readiness={readiness}
              liveness={liveness}
              runtime={metricas?.runtime || null}
              error={errorReadiness || errorLiveness}
            />

            {/* US3: Métricas de Trading y Marketplace */}
            <MarketplaceMetricsCard
              marketplace={metricas?.marketplace || null}
              error={errorMetrics}
            />

            {/* US4: Supervisión de Cotizaciones */}
            <PricingMetricsCard
              cotizaciones={metricas?.cotizaciones || null}
              error={errorMetrics}
            />

            {/* US5: Ingestión / Scraping */}
            <ScrapingMetricsCard
              ingestion={metricas?.ingestion || null}
              error={errorMetrics}
            />

            {/* US5: Integración externa, Caché y Auth */}
            <div className="observability-grid-full">
              <SystemIntegrationCard
                integracion={metricas?.integracionYCache || null}
                error={errorMetrics}
              />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
