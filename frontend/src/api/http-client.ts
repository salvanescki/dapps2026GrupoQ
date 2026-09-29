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
    const errorData = await response.json().catch(() => null);
    const mensajeServidor = errorData?.mensaje;
    let mensaje = 'Error inesperado del servidor.';
    if (mensajeServidor) {
      mensaje = Array.isArray(mensajeServidor) ? mensajeServidor.join(' ') : mensajeServidor;
    }

    throw new HttpError(response.status, mensaje);
  }

  return response.json();
}
