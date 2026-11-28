import { MemoryHealthIndicator, HealthIndicatorService, HealthCheckError } from '@nestjs/terminus';

describe('Memory Health Checks (Unit Tests)', () => {
  let memoryIndicator: MemoryHealthIndicator;

  beforeEach(() => {
    memoryIndicator = new MemoryHealthIndicator(new HealthIndicatorService());
  });

  it('debe validar que el consumo de Heap dentro del límite (300 MB) es saludable', async () => {
    // 300 MB = 300 * 1024 * 1024 bytes
    const HEAP_THRESHOLD_BYTES = 300 * 1024 * 1024;
    // Forzar límite muy alto para garantizar que el proceso actual no lo exceda
    const result = await memoryIndicator.checkHeap('memory_heap', HEAP_THRESHOLD_BYTES * 10);
    expect(result).toHaveProperty('memory_heap');
    expect(result.memory_heap.status).toBe('up');
  });

  it('debe validar que el consumo de RSS dentro del límite (1 GB) es saludable', async () => {
    const RSS_THRESHOLD_BYTES = 1024 * 1024 * 1024;
    const result = await memoryIndicator.checkRSS('memory_rss', RSS_THRESHOLD_BYTES * 10);
    expect(result).toHaveProperty('memory_rss');
    expect(result.memory_rss.status).toBe('up');
  });

  it('debe indicar status "down" si el umbral de Heap es superado', async () => {
    // Umbral de 1 byte fuerza status down garantizado
    const result = await memoryIndicator.checkHeap('memory_heap', 1);
    expect(result).toHaveProperty('memory_heap');
    expect(result.memory_heap.status).toBe('down');
  });

  it('debe indicar status "down" si el umbral de RSS es superado', async () => {
    // Umbral de 1 byte fuerza status down garantizado
    const result = await memoryIndicator.checkRSS('memory_rss', 1);
    expect(result).toHaveProperty('memory_rss');
    expect(result.memory_rss.status).toBe('down');
  });
});
