const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

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

  const { headers: extraHeaders, ...restOptions } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'AbortError'
    ) {
      throw error;
    }
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
