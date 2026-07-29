import { inject, Injectable } from "@angular/core";
import {
  construirDocumento,
  nombreDelFichero,
  type OpcionesDelCancionero,
} from "../pdf/documento-cancionero";
import {
  cargarFuentes,
  esperarFuentesDePantalla,
  FAMILIAS,
  type SistemaDeFicheros,
} from "../pdf/fuentes-pdf";
import { ErrorDeExportacion } from "../pdf/error-exportacion";
import { MEDIDOR } from "../pdf/medidor";

/**
 * Lo poco que usamos de pdfmake. Se declara aquí porque el paquete se carga
 * de forma perezosa y llega sin tipos propios.
 */
interface PdfMake {
  addVirtualFileSystem(vfs: SistemaDeFicheros): void;
  setFonts(familias: typeof FAMILIAS): void;
  createPdf(definicion: ReturnType<typeof construirDocumento>): {
    download(nombre: string): void;
    open(): void;
  };
}

@Injectable({ providedIn: "root" })
export class CancioneroPdfService {
  private readonly medidor = inject(MEDIDOR);

  private motor: PdfMake | null = null;

  /**
   * Genera el cancionero y lo descarga. Todo ocurre en el navegador: la
   * Raspberry no interviene, que es la razón de haber elegido pdfmake.
   */
  async descargar(opciones: OpcionesDelCancionero): Promise<void> {
    const documento = await this.componer(opciones);

    documento.download(nombreDelFichero(opciones.titulo));
  }

  /** Lo mismo, pero abierto en otra pestaña: sirve de vista previa. */
  async abrir(opciones: OpcionesDelCancionero): Promise<void> {
    const documento = await this.componer(opciones);

    documento.open();
  }

  private async componer(opciones: OpcionesDelCancionero) {
    const medidor = this.medidor;

    if (medidor === null) {
      throw new ErrorDeExportacion(
        "Este navegador no permite medir el texto del PDF.",
      );
    }

    await esperarFuentesDePantalla();

    const motor = await this.motorListo();

    return motor.createPdf(construirDocumento(opciones, medidor));
  }

  /** Carga pdfmake y le enchufa las fuentes. Solo la primera vez. */
  private async motorListo(): Promise<PdfMake> {
    if (this.motor !== null) return this.motor;

    const [modulo, fuentes] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      cargarFuentes(),
    ]);

    const motor = (modulo.default ?? modulo) as PdfMake;

    motor.addVirtualFileSystem(fuentes);
    // `setFonts` en vez de `addFonts`: así se descarta la Roboto que pdfmake
    // trae de serie y nadie puede caer en ella por descuido.
    motor.setFonts(FAMILIAS);

    this.motor = motor;

    return motor;
  }
}
