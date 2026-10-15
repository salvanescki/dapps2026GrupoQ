import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';
import { UsuarioDuplicadoException } from '../../../src/domain/exceptions/usuario-duplicado.exception';

describe('Domain Exceptions', () => {
  describe('ReglaDeNegocioException', () => {
    it('deberia instanciar correctamente con el mensaje especificado', () => {
      const mensaje = 'Violacion de regla de negocio';
      const excepcion = new ReglaDeNegocioException(mensaje);

      expect(excepcion).toBeInstanceOf(Error);
      expect(excepcion).toBeInstanceOf(ReglaDeNegocioException);
      expect(excepcion.name).toBe('ReglaDeNegocioException');
      expect(excepcion.message).toBe(mensaje);
    });
  });

  describe('UsuarioDuplicadoException', () => {
    it('deberia heredar de ReglaDeNegocioException y formatear mensaje con el correo', () => {
      const correo = 'test@usuario.com';
      const excepcion = new UsuarioDuplicadoException(correo);

      expect(excepcion).toBeInstanceOf(Error);
      expect(excepcion).toBeInstanceOf(ReglaDeNegocioException);
      expect(excepcion).toBeInstanceOf(UsuarioDuplicadoException);
      expect(excepcion.name).toBe('UsuarioDuplicadoException');
      expect(excepcion.message).toContain(correo);
      expect(excepcion.message).toBe(
        `El correo electrónico ${correo} ya se encuentra registrado.`
      );
    });
  });
});
