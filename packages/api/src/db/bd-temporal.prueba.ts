import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface BaseDeDatosTemporal {
  ruta: string;
  limpiar: () => void;
}

export function crearBaseDeDatosTemporal(): BaseDeDatosTemporal {
  const carpeta = mkdtempSync(join(tmpdir(), "cancionero-"));

  return {
    ruta: join(carpeta, "prueba.db"),
    limpiar: () => rmSync(carpeta, { recursive: true, force: true }),
  };
}
