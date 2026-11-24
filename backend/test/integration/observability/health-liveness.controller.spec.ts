import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../../../src/health/health.module';
import { MemoryHealthIndicator } from '@nestjs/terminus';

describe('HealthController GET /health/live (Integration)', () => {
  let app: INestApplication;
  let mockMemoryIndicator: { checkHeap: jest.Mock; checkRSS: jest.Mock };

  beforeEach(async () => {
    mockMemoryIndicator = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(MemoryHealthIndicator)
      .useValue(mockMemoryIndicator)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('debe responder HTTP 200 con status "ok" cuando el proceso se encuentra dentro de los umbrales de memoria', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info).toHaveProperty('memory_heap');
    expect(response.body.info).toHaveProperty('memory_rss');
    expect(response.body.details.memory_heap.status).toBe('up');
    expect(response.body.details.memory_heap.bytes).toBeGreaterThan(0);
    expect(response.body.details.memory_rss.status).toBe('up');
    expect(response.body.details.memory_rss.bytes).toBeGreaterThan(0);
  });

  it('debe responder HTTP 503 con status "error" si el Heap de memoria excede el umbral de 300 MB', async () => {
    mockMemoryIndicator.checkHeap.mockResolvedValue({
      memory_heap: {
        status: 'down',
        message: 'Used heap memory of 320MB exceeds threshold of 300MB',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(503);

    expect(response.body.status).toBe('error');
    expect(response.body.error).toHaveProperty('memory_heap');
    expect(response.body.details.memory_heap.status).toBe('down');
  });
});
