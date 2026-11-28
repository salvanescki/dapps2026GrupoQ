export const SERVICIO_AUDITORIA = 'football-tokens-backend' as const;

export const TIPO_EVENTO_AUDITORIA = {
  HTTP: 'HTTP_AUDIT',
  NEGOCIO: 'BUSINESS_AUDIT',
} as const;

export const EVENTOS_AUDITORIA_NEGOCIO = {
  TRANSACCION_TOKENS: 'TRANSACCION_TOKENS',
  ORDEN_MERCADO_SECUNDARIO: 'ORDEN_MERCADO_SECUNDARIO',
  CALCULO_COTIZACIONES: 'CALCULO_COTIZACIONES',
  CAMBIO_ESTRATEGIA_COTIZACION: 'CAMBIO_ESTRATEGIA_COTIZACION',
  CALCULO_TEAM_OF_THE_WEEK: 'CALCULO_TEAM_OF_THE_WEEK',
  SCRAPING_ESTADISTICAS: 'SCRAPING_ESTADISTICAS',
  SCRAPING_LIGA: 'SCRAPING_LIGA',
} as const;

export const RUTAS_TECNICAS_EXCLUIDAS = [
  '/health',
  '/health/*',
  '/metrics',
  '/api/docs',
  '/api/docs/*',
  '/api/docs-json',
  '/api/docs-yaml',
] as const;

export const CLAVES_SENSIBLES_AUDITORIA = [
  'password',
  'contrasena',
  'contraseña',
  'passwordhash',
  'contrasenahash',
  'passwd',
  'pwd',
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'tokendeacceso',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'jwt',
  'bearer',
  'secret',
  'apikey',
  'x-api-key',
  'x-auth-token',
  'clientsecret',
  'proxy',
  'proxyurl',
  'proxyusername',
  'proxypassword',
  'scraping_proxy_url',
  'scraping_proxy_server',
  'scraping_proxy_username',
  'scraping_proxy_password',
  'http_proxy',
  'https_proxy',
] as const;

export const VALOR_REDACTADO = '[REDACTED]';
export const MARCADOR_CIRCULAR = '[CIRCULAR]';
export const MARCADOR_PROFUNDIDAD_MAXIMA = '[MAX_DEPTH]';
export const SUFIJO_TRUNCADO = '...[TRUNCATED]';

export const MAX_PROFUNDIDAD_SANITIZACION = 5;
export const MAX_LONGITUD_STRING = 512;
export const MAX_ITEMS_ARRAY = 25;
export const MAX_CLAVES_OBJETO = 30;
export const MAX_BYTES_PARAMETROS = 4096;

export const REGEX_CREDENCIALES_URL =
  /\b([a-zA-Z][a-zA-Z0-9+.-]{0,31}:\/\/)([^:@\s/]+):([^@\s/]+)@/g;

export const REGEX_TOKEN_BEARER = /\bBearer\s+[\w.~+/-]+=*/gi;

export const REGEX_REQUEST_ID_VALIDO = /^[a-zA-Z0-9._:-]{1,128}$/;

export function esRutaTecnicaExcluida(ruta?: string | null): boolean {
  if (!ruta) {
    return false;
  }

  const pathname = ruta.split('?')[0].trim();

  return (
    pathname === '/health' ||
    pathname.startsWith('/health/') ||
    pathname === '/metrics' ||
    pathname === '/api/docs' ||
    pathname.startsWith('/api/docs/') ||
    pathname === '/api/docs-json' ||
    pathname === '/api/docs-yaml'
  );
}
