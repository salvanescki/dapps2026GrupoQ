const BASE_URL = '/api';

export class HttpError extends Error {
  constructor(
    public readonly codigoEstado: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new HttpError(
      0,
      'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
    );
  }

  if (!response.ok) {
    let mensaje = 'Error inesperado del servidor.';
    try {
      const errorData = await response.json();
      if (errorData?.mensaje) {
        mensaje = Array.isArray(errorData.mensaje)
          ? errorData.mensaje.join(' ')
          : errorData.mensaje;
      }
    } catch {
      // Conservar mensaje por defecto si la respuesta no es JSON
    }

    throw new HttpError(response.status, mensaje);
  }

  return response.json();
}
