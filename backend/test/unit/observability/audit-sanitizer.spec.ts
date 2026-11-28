import {
  esRutaTecnicaExcluida,
  MARCADOR_CIRCULAR,
  MARCADOR_PROFUNDIDAD_MAXIMA,
  MAX_BYTES_PARAMETROS,
  MAX_CLAVES_OBJETO,
  MAX_ITEMS_ARRAY,
  MAX_LONGITUD_STRING,
  SUFIJO_TRUNCADO,
  VALOR_REDACTADO,
} from '../../../src/observability/constants/audit-events.constant';
import {
  esClaveSensible,
  sanitizarParametrosHttp,
  sanitizarTexto,
  sanitizarUrlProxy,
  sanitizarValor,
} from '../../../src/observability/utils/audit-sanitizer.util';

describe('audit-sanitizer.util', () => {
  describe('esClaveSensible', () => {
    it('detecta claves sensibles sin distinguir mayusculas, guiones ni guiones bajos', () => {
      expect(esClaveSensible('password')).toBe(true);
      expect(esClaveSensible('Contrasena')).toBe(true);
      expect(esClaveSensible('contraseña')).toBe(true);
      expect(esClaveSensible('PASSWORD_HASH')).toBe(true);
      expect(esClaveSensible('Authorization')).toBe(true);
      expect(esClaveSensible('Set-Cookie')).toBe(true);
      expect(esClaveSensible('x-api-key')).toBe(true);
      expect(esClaveSensible('X_AUTH_TOKEN')).toBe(true);
      expect(esClaveSensible('SCRAPING_PROXY_PASSWORD')).toBe(true);
      expect(esClaveSensible('http_proxy')).toBe(true);
      expect(esClaveSensible('correo')).toBe(false);
      expect(esClaveSensible('jugadorId')).toBe(false);
    });
  });

  describe('esRutaTecnicaExcluida', () => {
    it('identifica rutas de salud, metricas y documentacion', () => {
      expect(esRutaTecnicaExcluida('/health')).toBe(true);
      expect(esRutaTecnicaExcluida('/health/live')).toBe(true);
      expect(esRutaTecnicaExcluida('/health/ready?foo=1')).toBe(true);
      expect(esRutaTecnicaExcluida('/metrics')).toBe(true);
      expect(esRutaTecnicaExcluida('/api/docs')).toBe(true);
      expect(esRutaTecnicaExcluida('/api/docs/swagger-ui.css')).toBe(true);
      expect(esRutaTecnicaExcluida('/api/docs-json')).toBe(true);
      expect(esRutaTecnicaExcluida('/api/docs-yaml')).toBe(true);
      expect(esRutaTecnicaExcluida('/players')).toBe(false);
      expect(esRutaTecnicaExcluida('/orders/buy')).toBe(false);
      expect(esRutaTecnicaExcluida(undefined)).toBe(false);
      expect(esRutaTecnicaExcluida('')).toBe(false);
    });
  });

  describe('sanitizarTexto y sanitizarUrlProxy', () => {
    it('redacta credenciales embebidas en URLs y tokens Bearer', () => {
      const texto =
        'Fallo conectando a http://demoUser:demoPass@proxy.webshare.io:8080 con Bearer eyJhbGciOiJIUzI1NiJ9.abc.def';
      const sanitizado = sanitizarTexto(texto);

      expect(sanitizado).toContain('http://[REDACTED]@proxy.webshare.io:8080');
      expect(sanitizado).toContain('Bearer [REDACTED]');
      expect(sanitizado).not.toContain('demoUser');
      expect(sanitizado).not.toContain('demoPass');
      expect(sanitizado).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    });

    it('trunca cadenas superiores a 512 caracteres agregando sufijo ...[TRUNCATED]', () => {
      const largo = 'a'.repeat(700);
      const sanitizado = sanitizarTexto(largo);

      expect(sanitizado.length).toBeLessThanOrEqual(MAX_LONGITUD_STRING);
      expect(sanitizado.endsWith(SUFIJO_TRUNCADO)).toBe(true);
      expect(sanitizarTexto(largo, false)).toHaveLength(700);
    });

    it('sanitiza URLs de proxy con usuario/contrasena, solo usuario, invalidas o nulas', () => {
      expect(sanitizarUrlProxy(null)).toBeNull();
      expect(sanitizarUrlProxy(undefined)).toBeNull();
      expect(sanitizarUrlProxy('')).toBeNull();
      expect(
        sanitizarUrlProxy('http://demoUser:demoPass@proxy.example.com:8080'),
      ).toBe('http://[REDACTED]@proxy.example.com:8080');
      expect(sanitizarUrlProxy('http://onlyUser@proxy.example.com:8080')).toBe(
        'http://[REDACTED]@proxy.example.com:8080/',
      );
      expect(sanitizarUrlProxy('http://proxy.example.com:8080')).toBe(
        'http://proxy.example.com:8080',
      );
      expect(sanitizarUrlProxy('socks5://soloUser@host invalido')).toBe(
        'socks5://[REDACTED]@host invalido',
      );
    });
  });

  describe('sanitizarValor', () => {
    it('redacta recursivamente claves sensibles y mantiene campos seguros', () => {
      const entrada = {
        correo: 'admin@marketplace.com',
        contrasena: 'MiPassword123',
        anidado: {
          password: 'secret',
          accessToken: 'jwt-123',
          proxyUrl: 'http://u:p@host:80',
          cantidad: 5,
        },
      };

      expect(sanitizarValor(entrada)).toEqual({
        correo: 'admin@marketplace.com',
        contrasena: VALOR_REDACTADO,
        anidado: {
          password: VALOR_REDACTADO,
          accessToken: VALOR_REDACTADO,
          proxyUrl: VALOR_REDACTADO,
          cantidad: 5,
        },
      });
    });

    it('maneja referencias circulares, Buffer, Date, Error, BigInt, RegExp, Symbol y primitivos', () => {
      const circular: Record<string, unknown> = { nombre: 'root' };
      circular.self = circular;

      const fecha = new Date('2026-11-28T00:00:00.000Z');
      const fechaInvalida = new Date('invalid');
      const err = new Error('Falló con Bearer secrettoken123');
      const buf = Buffer.from('hola mundo');

      const res = sanitizarValor({
        circular,
        fecha,
        fechaInvalida,
        err,
        buf,
        grande: BigInt(42),
        patron: /abc/i,
        simbolo: Symbol('s'),
        nulo: null,
        indefinido: undefined,
        booleano: true,
      }) as Record<string, unknown>;

      expect((res.circular as Record<string, unknown>).self).toBe(
        MARCADOR_CIRCULAR,
      );
      expect(res.fecha).toBe('2026-11-28T00:00:00.000Z');
      expect(res.fechaInvalida).toBe('Invalid Date');
      expect(res.err).toEqual({
        name: 'Error',
        message: 'Falló con Bearer [REDACTED]',
      });
      expect(res.buf).toBe('[Buffer 10 bytes]');
      expect(res.grande).toBe('42');
      expect(res.patron).toBe('/abc/i');
      expect(res.simbolo).toBe('Symbol(s)');
      expect(res.nulo).toBeNull();
      expect(res.indefinido).toBeUndefined();
      expect(res.booleano).toBe(true);
    });

    it('aplica profundidad maxima de 5 niveles', () => {
      const profundo = { n1: { n2: { n3: { n4: { n5: { n6: 'oculto' } } } } } };
      const resultado = sanitizarValor(profundo) as any;

      expect(resultado.n1.n2.n3.n4.n5).toBe(MARCADOR_PROFUNDIDAD_MAXIMA);
    });

    it('trunca arrays mayores a 25 elementos y objetos con mas de 30 claves', () => {
      const lista = Array.from({ length: 30 }, (_, i) => i);
      const listaSanitizada = sanitizarValor(lista) as unknown[];

      expect(listaSanitizada).toHaveLength(MAX_ITEMS_ARRAY + 1);
      expect(listaSanitizada[MAX_ITEMS_ARRAY]).toBe('[+5 items]');

      const grande: Record<string, number> = {};
      for (let i = 0; i < 35; i++) {
        grande[`k${i}`] = i;
      }
      const objetoSanitizado = sanitizarValor(grande) as Record<string, unknown>;
      expect(Object.keys(objetoSanitizado)).toHaveLength(MAX_CLAVES_OBJETO + 1);
      expect(objetoSanitizado._truncatedKeys).toBe(5);
    });
  });

  describe('sanitizarParametrosHttp', () => {
    it('preserva las 3 claves obligatorias ruta, consulta y cuerpo sanitizadas', () => {
      const res = sanitizarParametrosHttp(
        { id: '123' },
        { pagina: '1', token: 'secreto' },
        { correo: 'a@b.com', contrasena: '123' },
      );

      expect(res).toEqual({
        ruta: { id: '123' },
        consulta: { pagina: '1', token: VALOR_REDACTADO },
        cuerpo: { correo: 'a@b.com', contrasena: VALOR_REDACTADO },
      });
    });

    it('normaliza cuerpo nulo, indefinido o primitivo/array cumpliendo el esquema JSON', () => {
      expect(sanitizarParametrosHttp(undefined, null, undefined)).toEqual({
        ruta: {},
        consulta: {},
        cuerpo: null,
      });

      expect(sanitizarParametrosHttp({}, {}, ['a', 'b'])).toEqual({
        ruta: {},
        consulta: {},
        cuerpo: { valor: ['a', 'b'] },
      });
    });

    it('respeta el presupuesto maximo de 4096 bytes manteniendo ruta, consulta y cuerpo truncado', () => {
      const cuerpoGigante: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        cuerpoGigante[`campo${i}`] = 'x'.repeat(300);
      }

      const res = sanitizarParametrosHttp({ id: '1' }, {}, cuerpoGigante);

      expect(res.ruta).toEqual({});
      expect(res.consulta).toEqual({});
      expect(res.cuerpo).toMatchObject({
        _truncated: true,
      });
      expect((res.cuerpo as { bytesOriginales: number }).bytesOriginales).toBeGreaterThan(
        MAX_BYTES_PARAMETROS,
      );
    });
  });
});
