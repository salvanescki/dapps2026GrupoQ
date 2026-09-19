import { Usuario } from '../../../src/domain/usuario.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Usuario Entity (Domain Model Unit Tests)', () => {
  const validProps = {
    nombre: 'Lionel Messi',
    correo: 'messi@seleccion.com',
    contrasenaHash: '$2b$10$hashedpasswordexample1234567890',
  };

  it('debe instanciar correctamente un usuario con datos válidos', () => {
    const usuario = Usuario.crear(validProps);

    expect(usuario.id).toBeDefined();
    expect(usuario.nombre).toBe('Lionel Messi');
    expect(usuario.correo).toBe('messi@seleccion.com');
    expect(usuario.contrasenaHash).toBe(validProps.contrasenaHash);
    expect(usuario.activo).toBe(true);
    expect(usuario.creadoEn).toBeInstanceOf(Date);
  });

  it('debe normalizar el correo electrónico a minúsculas y sin espacios', () => {
    const usuario = Usuario.crear({
      ...validProps,
      correo: '  MESSI@SELECCION.COM  ',
    });

    expect(usuario.correo).toBe('messi@seleccion.com');
  });

  it('debe lanzar excepción si el nombre tiene menos de 2 caracteres', () => {
    expect(() =>
      Usuario.crear({
        ...validProps,
        nombre: 'L',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe lanzar excepción si el correo es inválido', () => {
    expect(() =>
      Usuario.crear({
        ...validProps,
        correo: 'correo-invalido',
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe validar que la contraseña plana cumpla requisitos de seguridad (mínimo 8 caracteres, mayúscula, minúscula, número)', () => {
    // Válida
    expect(() =>
      Usuario.validarFormatoContrasena('ClaveValida123'),
    ).not.toThrow();

    // Menos de 8 caracteres
    expect(() => Usuario.validarFormatoContrasena('Clav1')).toThrow(
      ReglaDeNegocioException,
    );

    // Sin número
    expect(() =>
      Usuario.validarFormatoContrasena('ClaveSinNumero'),
    ).toThrow(ReglaDeNegocioException);

    // Sin mayúscula
    expect(() =>
      Usuario.validarFormatoContrasena('clavesinmayuscula1'),
    ).toThrow(ReglaDeNegocioException);

    // Sin minúscula
    expect(() =>
      Usuario.validarFormatoContrasena('CLAVESINMINUSCULA1'),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe permitir verificar contraseña llamando al comparador criptográfico', async () => {
    const usuario = Usuario.crear(validProps);
    const mockComparador = jest
      .fn()
      .mockImplementation(async (plana: string, hash: string) => {
        return plana === 'PasswordCorrecta' && hash === validProps.contrasenaHash;
      });

    const resultadoCorrecto = await usuario.verificarContrasena(
      'PasswordCorrecta',
      mockComparador,
    );
    expect(resultadoCorrecto).toBe(true);

    const resultadoErroneo = await usuario.verificarContrasena(
      'PasswordErronea',
      mockComparador,
    );
    expect(resultadoErroneo).toBe(false);
  });

  it('debe lanzar excepción al verificar contraseña si la cuenta está inactiva', async () => {
    const usuario = Usuario.crear(validProps);
    usuario.desactivar();
    expect(usuario.activo).toBe(false);

    const mockComparador = jest.fn().mockResolvedValue(true);

    await expect(
      usuario.verificarContrasena('PasswordCorrecta', mockComparador),
    ).rejects.toThrow(ReglaDeNegocioException);
  });
});
