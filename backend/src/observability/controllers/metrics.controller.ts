import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';

@ApiTags('Observabilidad')
@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  @ApiOperation({
    summary: 'Obtener métricas en formato estándar de Prometheus',
    description:
      'Expone todas las métricas estándar del runtime Node.js (CPU, memoria, event loop lag, descriptores de archivos) y las métricas de negocio personalizadas del marketplace, cotizaciones, scraping, integraciones externas, caché y autenticación.',
  })
  @ApiProduces('text/plain; version=0.0.4; charset=utf-8')
  @ApiResponse({
    status: 200,
    description: 'Métricas en formato texto plano de Prometheus.',
    schema: {
      type: 'string',
    },
  })
  async index(@Res({ passthrough: true }) response: Response): Promise<string> {
    return super.index(response);
  }
}
