export function sanearConsultaFts(texto: string): string | null {
  const terminos = texto
    .split(/\s+/)
    .filter((termino) => termino !== "")
    .map((termino) => `"${termino.replaceAll('"', '""')}"*`);

  if (terminos.length === 0) return null;

  return terminos.join(" ");
}
