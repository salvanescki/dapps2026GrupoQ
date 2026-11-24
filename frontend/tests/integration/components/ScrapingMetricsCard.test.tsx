import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ScrapingMetricsCard } from '../../../src/components/admin/observability/ScrapingMetricsCard';
import { MetricaDeIngestion } from '../../../src/types/observability.types';

describe('ScrapingMetricsCard (US5 Integration)', () => {
  const mockIngestion: MetricaDeIngestion = {
    ejecucionesExitosas: 30,
    ejecucionesFallidas: 2,
    ejecucionesRecuperadas: 4,
    duracionPorLiga: {
      PL: 45.2,
      PD: 38.5,
      SA: 42.0,
    },
    tasaAsociacionPorLiga: {
      PL: 97.5,
      PD: 95.0,
      SA: 98.2,
    },
    incidentesTotales: 3,
  };

  it('renderiza desglose de ejecuciones, duraciones por liga, tasa de asociación e incidentes', () => {
    render(<ScrapingMetricsCard ingestion={mockIngestion} />);

    expect(screen.getByText('Pipeline de Ingestión y Scraping')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Liga PL')).toBeInTheDocument();
    expect(screen.getByText('45.20 s')).toBeInTheDocument();
    expect(screen.getByText('97.50%')).toBeInTheDocument();
  });

  it('muestra banner de error aislado si se pasa prop error', () => {
    render(<ScrapingMetricsCard ingestion={mockIngestion} error="Error al consultar scraping" />);
    expect(screen.getByText('Error al consultar scraping')).toBeInTheDocument();
  });

  it('renderiza ligas aunque solo existan tasas de asociación y filtra GLOBAL inactivo', () => {
    const mockIngestionParcial: MetricaDeIngestion = {
      ejecucionesExitosas: 1,
      ejecucionesFallidas: 0,
      ejecucionesRecuperadas: 0,
      duracionPorLiga: {},
      tasaAsociacionPorLiga: {
        PL: 96.5,
        GLOBAL: 0,
      },
      incidentesTotales: 0,
    };
    render(<ScrapingMetricsCard ingestion={mockIngestionParcial} />);

    expect(screen.getByText('Liga PL')).toBeInTheDocument();
    expect(screen.getByText('96.50%')).toBeInTheDocument();
    expect(screen.queryByText('Liga GLOBAL')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin telemetría de ligas en el período')).not.toBeInTheDocument();
  });

  it('muestra mensaje de sin telemetría cuando no hay ligas registradas', () => {
    const mockVacio: MetricaDeIngestion = {
      ejecucionesExitosas: 0,
      ejecucionesFallidas: 0,
      ejecucionesRecuperadas: 0,
      duracionPorLiga: {},
      tasaAsociacionPorLiga: {},
      incidentesTotales: 0,
    };
    render(<ScrapingMetricsCard ingestion={mockVacio} />);
    expect(screen.getByText('Sin telemetría de ligas en el período')).toBeInTheDocument();
  });
});
