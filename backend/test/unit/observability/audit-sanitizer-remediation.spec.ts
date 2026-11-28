import {
  MARCADOR_CIRCULAR,
  MARCADOR_PROFUNDIDAD_MAXIMA,
  MAX_CLAVES_OBJETO,
  MAX_ITEMS_ARRAY,
  REGEX_CREDENCIALES_URL,
  REGEX_TOKEN_BEARER,
  VALOR_REDACTADO,
} from '../../../src/observability/constants/audit-events.constant';
import {
  convertirCampoEscalarATexto,
  convertirValorATextoSeguro,
  redactarCredencialUrlSinParser,
  sanitizarTexto,
  sanitizarUrlProxy,
  sanitizarValor,
} from '../../../src/observability/utils/audit-sanitizer.util';

describe('audit-sanitizer.util — remediación de complejidad y casos borde', () => {
  describe('sanitizarValor y helpers internos de tipos especiales y estructuras', () => {
    it('sanitiza tipos especiales (Date válida/inválida, Buffer, RegExp, Error con secretos y funciones)', () => {
      const fechaValida = new Date('2026-11-28T10:00:00.000Z');
      const fechaInvalida = new Date('fecha-no-valida');
      const buffer = Buffer.from('token-buffer');
      const expresion = /abc\d+/gi;
      const errorConCredenciales = new Error(
        'Fallo contra http://user:pass@proxy.local:8080 con Bearer abc.def.ghi',
      );
      const funcionPrueba = function ejemploAuditoria() {
        return 1;
      };

      const resultado = sanitizarValor({
        fechaValida,
        fechaInvalida,
        buffer,
        expresion,
        errorConCredenciales,
        funcionPrueba,
        simbolo: Symbol('clave'),
        grande: BigInt(999),
      }) as Record<string, unknown>;

      expect(resultado.fechaValida).toBe('2026-11-28T10:00:00.000Z');
      expect(resultado.fechaInvalida).toBe('Invalid Date');
      expect(resultado.buffer).toBe(`[Buffer ${buffer.length} bytes]`);
      expect(resultado.expresion).toBe('/abc\\d+/gi');
      expect(resultado.errorConCredenciales).toEqual({
        name: 'Error',
        message: `Fallo contra http://${VALOR_REDACTADO}@proxy.local:8080 con Bearer ${VALOR_REDACTADO}`,
      });
      expect(typeof resultado.funcionPrueba).toBe('string');
      expect(resultado.simbolo).toBe('Symbol(clave)');
      expect(resultado.grande).toBe('999');
    });

    it('trunca arrays que exceden MAX_ITEMS_ARRAY y preserva arrays dentro del límite', () => {
      const corto = [1, 'ok', true];
      expect(sanitizarValor(corto)).toEqual([1, 'ok', true]);

      const largo = Array.from({ length: MAX_ITEMS_ARRAY + 4 }, (_, idx) => idx);
      const sanitizado = sanitizarValor(largo) as unknown[];

      expect(sanitizado).toHaveLength(MAX_ITEMS_ARRAY + 1);
      expect(sanitizado[MAX_ITEMS_ARRAY]).toBe('[+4 items]');
    });

    it('redacta claves sensibles y trunca objetos con más de MAX_CLAVES_OBJETO propiedades', () => {
      const objeto: Record<string, unknown> = {
        password: 'secreto',
        accessToken: 'jwt-token',
      };
      for (let i = 0; i < MAX_CLAVES_OBJETO + 3; i++) {
        objeto[`campo_${i}`] = i;
      }

      const sanitizado = sanitizarValor(objeto) as Record<string, unknown>;

      expect(sanitizado.password).toBe(VALOR_REDACTADO);
      expect(sanitizado.accessToken).toBe(VALOR_REDACTADO);
      expect(sanitizado._truncatedKeys).toBe(5);
      expect(Object.keys(sanitizado)).toHaveLength(MAX_CLAVES_OBJETO + 1);
    });

    it('controla referencias circulares, reutilización del mismo objeto sin falso positivo y profundidad máxima', () => {
      const compartido = { codigo: 'COMP-1' };
      const conCompartido = { primero: compartido, segundo: compartido };
      expect(sanitizarValor(conCompartido)).toEqual({
        primero: { codigo: 'COMP-1' },
        segundo: { codigo: 'COMP-1' },
      });

      const ciclico: Record<string, unknown> = { id: 'root' };
      ciclico.padre = ciclico;
      const resultadoCiclico = sanitizarValor(ciclico) as Record<string, unknown>;
      expect(resultadoCiclico.padre).toBe(MARCADOR_CIRCULAR);

      const profundo = { a: { b: { c: { d: { e: { f: 'valor' } } } } } };
      const resultadoProfundo = sanitizarValor(profundo) as any;
      expect(resultadoProfundo.a.b.c.d.e).toBe(MARCADOR_PROFUNDIDAD_MAXIMA);
    });
  });

  describe('anti-ReDoS O(n) y casos de borde en redactarCredencialUrlSinParser y regex de auditoría', () => {
    it('redacta credenciales en URLs malformadas y conserva entradas inválidas sin alterarlas', () => {
      expect(
        redactarCredencialUrlSinParser('socks5://soloUser@host invalido'),
      ).toBe(`socks5://${VALOR_REDACTADO}@host invalido`);
      expect(redactarCredencialUrlSinParser('sin-protocolo@host')).toBe(
        'sin-protocolo@host',
      );
      expect(redactarCredencialUrlSinParser('://usuario@host')).toBe(
        '://usuario@host',
      );
      expect(redactarCredencialUrlSinParser('123invalid://usuario@host')).toBe(
        '123invalid://usuario@host',
      );
      expect(redactarCredencialUrlSinParser('http://@host invalido')).toBe(
        'http://@host invalido',
      );
      expect(redactarCredencialUrlSinParser('http://sin-arroba')).toBe(
        'http://sin-arroba',
      );
      expect(
        redactarCredencialUrlSinParser('http://user con espacio@host'),
      ).toBe('http://user con espacio@host');
      expect(redactarCredencialUrlSinParser('http://host/ruta@algo')).toBe(
        'http://host/ruta@algo',
      );
      expect(sanitizarUrlProxy('socks5://usuario@host invalido')).toBe(
        `socks5://${VALOR_REDACTADO}@host invalido`,
      );
    });

    it('evalúa entradas extensas repetitivas en tiempo lineal sin degradación (anti-ReDoS)', () => {
      const esquemaLargoSinSeparador = `${'a'.repeat(50_000)}@host`;
      const esquemaExcesivo = `${'a'.repeat(50_000)}://user:pass@host`;
      const bearerLargo = `Bearer ${'A'.repeat(20_000)}_${'z'.repeat(20_000)}==`;

      const inicio = Date.now();
      expect(redactarCredencialUrlSinParser(esquemaLargoSinSeparador)).toBe(
        esquemaLargoSinSeparador,
      );
      expect(redactarCredencialUrlSinParser(esquemaExcesivo)).toBe(
        esquemaExcesivo,
      );
      expect(
        esquemaLargoSinSeparador.replace(
          REGEX_CREDENCIALES_URL,
          `$1${VALOR_REDACTADO}@`,
        ),
      ).toBe(esquemaLargoSinSeparador);
      expect(sanitizarTexto(bearerLargo, false)).toBe(
        `Bearer ${VALOR_REDACTADO}`,
      );
      expect(
        'bearer AbC_09.~+/-=='.replace(
          REGEX_TOKEN_BEARER,
          `Bearer ${VALOR_REDACTADO}`,
        ),
      ).toBe(`Bearer ${VALOR_REDACTADO}`);
      expect(Date.now() - inicio).toBeLessThan(1000);
    });
  });

  describe('convertirValorATextoSeguro y convertirCampoEscalarATexto (US3 — S6551)', () => {
    it('convierte primitivos, símbolos, funciones, objetos anidados, circulares y secretos sin producir [object Object]', () => {
      expect(convertirValorATextoSeguro('texto plano')).toBe('texto plano');
      expect(convertirValorATextoSeguro(42)).toBe('42');
      expect(convertirValorATextoSeguro(false)).toBe('false');
      expect(convertirValorATextoSeguro(BigInt(12345))).toBe('12345');
      expect(convertirValorATextoSeguro(null)).toBe('null');
      expect(convertirValorATextoSeguro(undefined)).toBe('undefined');
      expect(convertirValorATextoSeguro(Symbol('audit'))).toBe('Symbol(audit)');
      expect(convertirValorATextoSeguro(function prueba() {})).toContain(
        'function prueba',
      );

      const anidadoConSecreto = {
        detalle: { codigo: 'E01' },
        password: 'mi-clave-secreta',
      };
      const textoObjeto = convertirValorATextoSeguro(anidadoConSecreto);
      expect(textoObjeto).not.toBe('[object Object]');
      expect(textoObjeto).toContain('"codigo":"E01"');
      expect(textoObjeto).toContain(`"password":"${VALOR_REDACTADO}"`);
      expect(textoObjeto).not.toContain('mi-clave-secreta');

      const circular: Record<string, unknown> = { nombre: 'ciclo' };
      circular.self = circular;
      const textoCircular = convertirValorATextoSeguro(circular);
      expect(textoCircular).toContain(MARCADOR_CIRCULAR);

      const objetoExplosivo: Record<string, unknown> = {};
      Object.defineProperty(objetoExplosivo, 'fallo', {
        enumerable: true,
        get() {
          throw new Error('Error al leer propiedad');
        },
      });
      expect(convertirValorATextoSeguro(objetoExplosivo)).toBe(
        '[Objeto no serializable]',
      );
    });

    it('normaliza escalares de actor HTTP y rechaza nulos, indefinidos u objetos no escalares', () => {
      expect(convertirCampoEscalarATexto('usr-123')).toBe('usr-123');
      expect(convertirCampoEscalarATexto(987)).toBe('987');
      expect(convertirCampoEscalarATexto(true)).toBe('true');
      expect(convertirCampoEscalarATexto(BigInt(77))).toBe('77');
      expect(convertirCampoEscalarATexto(null)).toBeNull();
      expect(convertirCampoEscalarATexto(undefined)).toBeNull();
      expect(convertirCampoEscalarATexto({ id: 'obj' })).toBeNull();
      expect(convertirCampoEscalarATexto(['a'])).toBeNull();
      expect(convertirCampoEscalarATexto(Symbol('s'))).toBeNull();
    });
  });
});
