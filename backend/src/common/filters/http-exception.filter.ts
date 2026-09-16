import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensaje: string | string[] = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        mensaje = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, any>;
        mensaje = resObj.message || exception.message;
      }
    } else if (exception instanceof ReglaDeNegocioException) {
      status = HttpStatus.BAD_REQUEST;
      mensaje = exception.message;
    } else if (exception instanceof Error) {
      mensaje = exception.message;
    }

    response.status(status).json({
      codigoEstado: status,
      mensaje: mensaje,
      marcaDeTiempo: new Date().toISOString(),
    });
  }
}
