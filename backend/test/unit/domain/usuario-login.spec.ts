import { Usuario } from '../../../src/domain/usuario.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Usuario Login & Credenciales (Domain Unit Tests)', () => {
  it('debe denegar verificación si el usuario fue desactivado', async () => {
    const usuario = Usuario.crear({
      nombre: 'Angel Di Maria',
      correo: 'fideo@seleccion.com',
      contrasenaHash: 'hashSeguro123',
      activo: false,
    });

    const mockComparador = jest.fn().mockResolvedValue(true);

    await expect(
      usuario.verificarContrasena('Cualquiera123', mockComparador),
    ).rejects.toThrow(ReglaDeNegocioException);

    expect(mockComparador).not.toHaveBeenCalled();
  });

  it('debe reactivar un usuario y permitir verificación posterior', async () => {
    const usuario = Usuario.crear({
      nombre: 'Angel Di Maria',
      correo: 'fideo@seleccion.com',
      contrasenaHash: 'hashSeguro123',
      activo: false,
    });

    usuario.activar();
    expect(usuario.activo).toBe(true);

    const mockComparador = jest.fn().mockResolvedValue(true);
    const valido = await usuario.verificarContrasena('Cualquiera123', mockComparador);
    expect(valido).toBe(true);
  });
});
