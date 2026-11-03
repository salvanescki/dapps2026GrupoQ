export function abreviarNombreJugador(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) {
    return partes[0] ?? '';
  }

  const [nombre, ...apellido] = partes;
  const inicial = nombre.endsWith('.')
    ? nombre
    : `${nombre.charAt(0).toLocaleUpperCase('es')}.`;

  return `${inicial} ${apellido.join(' ')}`;
}
