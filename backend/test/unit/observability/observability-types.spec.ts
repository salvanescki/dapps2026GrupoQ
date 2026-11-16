import {
  validarNombreMetrica,
  TipoMetrica,
  PROMETHEUS_METRIC_NAME_REGEX,
} from '../../../src/observability/types/observability.types';

describe('Observability Types & Validators (Unit Tests)', () => {
  it('debe validar nombres canónicos de métricas', () => {
    expect(validarNombreMetrica('marketplace_orders_total', TipoMetrica.COUNTER)).toBe(true);
    expect(validarNombreMetrica('order_duration_seconds', TipoMetrica.HISTOGRAM)).toBe(true);
    expect(validarNombreMetrica('active_orders', TipoMetrica.GAUGE)).toBe(true);

    // Inválidos
    expect(validarNombreMetrica('marketplace-orders', TipoMetrica.COUNTER)).toBe(false);
    expect(validarNombreMetrica('marketplace_orders', TipoMetrica.COUNTER)).toBe(false);
    expect(validarNombreMetrica('order_duration', TipoMetrica.HISTOGRAM)).toBe(false);
    expect(validarNombreMetrica('123_invalid')).toBe(false);
  });

  it('debe verificar regex estándar de nombres', () => {
    expect(PROMETHEUS_METRIC_NAME_REGEX.test('metric_name')).toBe(true);
    expect(PROMETHEUS_METRIC_NAME_REGEX.test('metric:name:colon')).toBe(true);
    expect(PROMETHEUS_METRIC_NAME_REGEX.test('invalid-hyphen')).toBe(false);
  });
});
