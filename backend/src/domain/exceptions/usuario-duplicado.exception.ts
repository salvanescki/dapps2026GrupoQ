import { ReglaDeNegocioException } from './regla-de-negocio.exception';

export class UsuarioDuplicadoException extends ReglaDeNegocioException {
  constructor(correo: string) {
    super(`El correo electrónico ${correo} ya se encuentra registrado.`);
    this.name = 'UsuarioDuplicadoException';
  }
}
