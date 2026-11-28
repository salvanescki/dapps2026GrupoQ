import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SystemIntegrationCard } from '../../../src/components/admin/observability/SystemIntegrationCard';
import { MetricaDeIntegracionYCache } from '../../../src/types/observability.types';

describe('SystemIntegrationCard (US5 Integration)', () => {
  const mockIntegracionNominal: MetricaDeIntegracionYCache = {
    footballDataRequests: 80,
    footballDataRateLimitRemaining: 8,
    cacheHits: 450,
    cacheMisses: 50,
    cacheHitRatio: 90.0,
    cacheFallbacks: 0,
    totwGeneraciones: 5,
    totwDuracionSegundos: 2.3,
    authIntentosExitosos: 120,
    authIntentosFallidos: 4,
    authLatenciaHashingPromedio: 0.085,
  };

  it('renderiza cuota de Football-Data, métricas de caché L1, TOTW y auth en estado nominal', () => {
    render(<SystemIntegrationCard integracion={mockIntegracionNominal} />);

    expect(screen.getByText('Integraciones, Caché L1 y Seguridad')).toBeInTheDocument();
    expect(screen.getByText('8 restantes')).toBeInTheDocument();
    expect(screen.getByText('80 peticiones ejecutadas')).toBeInTheDocument();
    expect(screen.getByText('90.00%')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText(/0\.0850 s/)).toBeInTheDocument();
  });

  it('muestra advertencia cuando el rate limit de FootballData es <= 2', () => {
    const mockIntegracionLimiteBajo: MetricaDeIntegracionYCache = {
      ...mockIntegracionNominal,
      footballDataRateLimitRemaining: 2,
    };

    render(<SystemIntegrationCard integracion={mockIntegracionLimiteBajo} />);
    const badge = screen.getByText('2 restantes');
    expect(badge).toHaveClass('warning');
  });

  it('muestra advertencia de degradación cuando los fallbacks de caché son > 0', () => {
    const mockIntegracionFallback: MetricaDeIntegracionYCache = {
      ...mockIntegracionNominal,
      cacheFallbacks: 3,
    };

    render(<SystemIntegrationCard integracion={mockIntegracionFallback} />);
    expect(screen.getByText(/3 fallbacks a DB/i)).toBeInTheDocument();
  });
});
