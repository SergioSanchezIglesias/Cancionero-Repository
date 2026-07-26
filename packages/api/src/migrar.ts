import {
  abrirBaseDeDatos,
  rutaBaseDeDatosDesdeEntorno,
} from "./db/conexion.js";
import { aplicarMigraciones } from "./db/migraciones.js";

const ruta = rutaBaseDeDatosDesdeEntorno();
const bd = abrirBaseDeDatos(ruta);

try {
  const aplicadas = aplicarMigraciones(bd);

  if (aplicadas.length === 0) {
    console.log(`Sin migraciones pendientes: ${ruta}`);
  } else {
    console.log(`Migraciones aplicadas en ${ruta}:`);
    for (const nombre of aplicadas) {
      console.log(`  · ${nombre}`);
    }
  }
} finally {
  bd.close();
}
