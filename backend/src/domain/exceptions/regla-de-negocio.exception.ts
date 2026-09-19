export class ReglaDeNegocioException extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ReglaDeNegocioException';
  }
}

export class UsuarioDuplicadoException extends ReglaDeNegocioException {
  constructor(correo: string) {
    super(`El correo electrónico ${correo} ya se encuentra registrado.`);
    this.name = 'UsuarioDuplicadoException';
  }
}
