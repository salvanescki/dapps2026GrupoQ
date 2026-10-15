import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  it('deberia procesar HttpException con respuesta de tipo string (404)', () => {
    const exception = new HttpException('Recurso no encontrado', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.NOT_FOUND,
        mensaje: 'Recurso no encontrado',
      })
    );
  });

  it('deberia procesar HttpException con respuesta de tipo objeto (400)', () => {
    const exception = new HttpException(
      { message: ['El campo nombre es obligatorio', 'Correo invalido'] },
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.BAD_REQUEST,
        mensaje: ['El campo nombre es obligatorio', 'Correo invalido'],
      })
    );
  });

  it('deberia procesar HttpException con respuesta de tipo objeto sin message explicito (409)', () => {
    const exception = new HttpException(
      { error: 'Conflict' },
      HttpStatus.CONFLICT
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.CONFLICT,
      })
    );
  });

  it('deberia mapear ReglaDeNegocioException a status 400 Bad Request', () => {
    const exception = new ReglaDeNegocioException('Violacion de invariante');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.BAD_REQUEST,
        mensaje: 'Violacion de invariante',
      })
    );
  });

  it('deberia procesar instancias de Error estandar retornando status 500', () => {
    const exception = new Error('Error de conexion con base de datos');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.INTERNAL_SERVER_ERROR,
        mensaje: 'Error de conexion con base de datos',
      })
    );
  });

  it('deberia manejar excepciones desconocidas no instancias de Error con mensaje generico 500', () => {
    const exception = 'Error de cadena inesperado';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoEstado: HttpStatus.INTERNAL_SERVER_ERROR,
        mensaje: 'Error interno del servidor',
      })
    );
  });
});
