import { describe, it, expect } from 'vitest';
import { parsePrometheusText, extractSingleMetricValue } from '../../../src/utils/prometheus-parser';

describe('prometheus-parser', () => {
  const samplePrometheusText = `
# HELP marketplace_orders_total Conteo total de ordenes registradas
# TYPE marketplace_orders_total counter
marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 42
marketplace_orders_total{tipo="venta",mercado="secundario",estado="creada"} 18
# HELP node_memory_rss_bytes Consumo RSS en bytes
# TYPE node_memory_rss_bytes gauge
node_memory_rss_bytes 268435456
# HELP quotes_active_strategy Estrategia activa
quotes_active_strategy{estrategia="GLOBAL_v1"} 1
quotes_active_strategy{estrategia="POSICIONAL_v1"} 0
# HELP marketplace_settlement_duration_seconds Latencia de liquidacion
marketplace_settlement_duration_seconds_bucket{le="0.1"} 10
marketplace_settlement_duration_seconds_sum 2.5
marketplace_settlement_duration_seconds_count 10
node_cpu_seconds{cpu="0"} 1.25e+02
`;

  it('debe parsear texto de prometheus extrayendo muestras y comentarios correctamente', () => {
    const parsed = parsePrometheusText(samplePrometheusText);
    expect(parsed.length).toBeGreaterThan(0);

    const ordersTotal = parsed.filter((m) => m.name === 'marketplace_orders_total');
    expect(ordersTotal).toHaveLength(2);
    expect(ordersTotal[0].labels).toEqual({
      tipo: 'compra',
      mercado: 'primario',
      estado: 'completada',
    });
    expect(ordersTotal[0].value).toBe(42);
    expect(ordersTotal[0].help).toBe('Conteo total de ordenes registradas');
    expect(ordersTotal[0].type).toBe('counter');

    expect(ordersTotal[1].value).toBe(18);
  });

  it('debe parsear valores simples sin labels y con notacion cientifica', () => {
    const parsed = parsePrometheusText(samplePrometheusText);
    const rss = parsed.find((m) => m.name === 'node_memory_rss_bytes');
    expect(rss).toBeDefined();
    expect(rss?.value).toBe(268435456);

    const cpu = parsed.find((m) => m.name === 'node_cpu_seconds');
    expect(cpu).toBeDefined();
    expect(cpu?.value).toBe(125);
  });

  it('debe manejar histogramas con sum, count y buckets', () => {
    const parsed = parsePrometheusText(samplePrometheusText);
    const sum = parsed.find((m) => m.name === 'marketplace_settlement_duration_seconds_sum');
    const count = parsed.find((m) => m.name === 'marketplace_settlement_duration_seconds_count');
    expect(sum?.value).toBe(2.5);
    expect(count?.value).toBe(10);
  });

  it('debe manejar casos borde: texto vacio o solo comentarios', () => {
    expect(parsePrometheusText('')).toEqual([]);
    expect(parsePrometheusText('# HELP solo un comentario\n# TYPE algo gauge\n')).toEqual([]);
  });

  it('debe extraer metricas individuales usando extractSingleMetricValue', () => {
    const parsed = parsePrometheusText(samplePrometheusText);
    const rss = extractSingleMetricValue(parsed, 'node_memory_rss_bytes');
    expect(rss).toBe(268435456);

    const nonExistent = extractSingleMetricValue(parsed, 'metrica_inexistente', {}, 99);
    expect(nonExistent).toBe(99);

    const compOrder = extractSingleMetricValue(parsed, 'marketplace_orders_total', { tipo: 'compra' });
    expect(compOrder).toBe(42);
  });
});
