import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PricingMetricsCard } from '../../../src/components/admin/observability/PricingMetricsCard';
import { MetricaDeCotizaciones } from '../../../src/types/observability.types';

describe('PricingMetricsCard (US4 Integration)', () => {
  const mockCotizaciones: MetricaDeCotizaciones = {
    recalculosExitosos: 48,
    recalculosFallidos: 2,
    tasaExitoRecalculos: 96,
    duracionPromedioSegundos: 3.45,
    jugadoresProcesados: 520,
    jugadoresSinEstadisticas: 45,
    jugadoresFallidos: 3,
    estrategiaActiva: 'GLOBAL_v1',
  };

  it('renderiza la estrategia activa, tasa de éxito, duración y desglose de jugadores', () => {
    render(<PricingMetricsCard cotizaciones={mockCotizaciones} />);

    expect(screen.getByText('Supervisión de Valuación y Cotizaciones')).toBeInTheDocument();
    expect(screen.getByText('GLOBAL_v1')).toBeInTheDocument();
    expect(screen.getByText('96.00%')).toBeInTheDocument();
    expect(screen.getByText('3.4500 s')).toBeInTheDocument();
    expect(screen.getByText('520')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renderiza banner de error aislado si se recibe error', () => {
    render(<PricingMetricsCard cotizaciones={mockCotizaciones} error="Error al obtener valuaciones" />);
    expect(screen.getByText('Error al obtener valuaciones')).toBeInTheDocument();
  });
});
