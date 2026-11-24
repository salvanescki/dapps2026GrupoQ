import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HealthStatusCard } from '../../../src/components/admin/observability/HealthStatusCard';
import { SondaReadinessData, SondaLivenessData } from '../../../src/types/observability.types';

describe('HealthStatusCard (US2 Integration)', () => {
  const readinessNominal: SondaReadinessData = {
    estadoGlobal: 'ok',
    baseDatos: { estado: 'up' },
    redis: { estado: 'up' },
    footballData: { estado: 'up' },
  };

  const livenessNominal: SondaLivenessData = {
    estadoGlobal: 'ok',
    memoriaHeapBytes: 157286400, // 150 MB (50%)
    umbralHeapBytes: 314572800,
    porcentajeHeap: 50,
    memoriaRssBytes: 536870912, // 512 MB (50%)
    umbralRssBytes: 1073741824,
    porcentajeRss: 50,
  };

  it('renderiza dependencias en estado nominal con badges UP y barras en estilo nominal', () => {
    render(<HealthStatusCard readiness={readinessNominal} liveness={livenessNominal} />);

    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('Redis L1')).toBeInTheDocument();
    expect(screen.getByText('Football-Data')).toBeInTheDocument();

    const upBadges = screen.getAllByText('UP');
    expect(upBadges.length).toBeGreaterThanOrEqual(3);

    const percentages = screen.getAllByText(/50\.00%/i);
    expect(percentages.length).toBe(2);
  });

  it('maneja estado nulo o sin datos para readiness y liveness con defaults seguros', () => {
    render(<HealthStatusCard readiness={null} liveness={null} error="Error de red" />);
    expect(screen.getByText('Error de red')).toBeInTheDocument();
    const downBadges = screen.getAllByText('DOWN');
    expect(downBadges.length).toBe(3);
  });

  it('renderiza servicios degradados con badge DOWN y mensaje de error cuando falla una dependencia', () => {
    const readinessDegradado: SondaReadinessData = {
      estadoGlobal: 'degradado',
      baseDatos: { estado: 'up' },
      redis: { estado: 'down', mensaje: 'Connection refused' },
      footballData: { estado: 'up' },
    };

    render(<HealthStatusCard readiness={readinessDegradado} liveness={livenessNominal} />);

    expect(screen.getByText('DOWN')).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('aplica clase de advertencia warning cuando memoria supera 80% y critical si supera 95%', () => {
    const livenessAlerta: SondaLivenessData = {
      estadoGlobal: 'ok',
      memoriaHeapBytes: 260000000,
      umbralHeapBytes: 314572800,
      porcentajeHeap: 82.65, // >80% warning
      memoriaRssBytes: 1050000000,
      umbralRssBytes: 1073741824,
      porcentajeRss: 97.78, // >95% critical
    };

    render(<HealthStatusCard readiness={readinessNominal} liveness={livenessAlerta} />);

    const heapBar = screen.getByTestId('heap-progress-bar');
    expect(heapBar).toHaveClass('warning');

    const rssBar = screen.getByTestId('rss-progress-bar');
    expect(rssBar).toHaveClass('critical');
  });

  it('renderiza bloque de Runtime y Recursos de Node.js cuando se suministra prop runtime', () => {
    const mockRuntime = {
      cpuSegundosTotal: 120.5,
      uptimeSegundos: 3600,
      eventLoopLagMs: 4.25,
      activeHandles: 8,
      activeResources: 14,
      versionNode: 'v24.21.0',
    };

    render(
      <HealthStatusCard
        readiness={readinessNominal}
        liveness={livenessNominal}
        runtime={mockRuntime}
      />
    );

    expect(screen.getByText('Runtime y Recursos de Node.js')).toBeInTheDocument();
    expect(screen.getByText('4.25 ms')).toBeInTheDocument();
    expect(screen.getByText('120.5 s')).toBeInTheDocument();
    expect(screen.getByText('v24.21.0')).toBeInTheDocument();
    expect(screen.getByText(/14 rec\./i)).toBeInTheDocument();
  });
});
