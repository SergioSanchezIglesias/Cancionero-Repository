import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import {
  BookOpen,
  Library,
  LucideAngularModule,
  Music,
  Settings,
  ShieldCheck,
} from "lucide-angular";
import { filter } from "rxjs";
import { RespaldoService } from "../../../core/services/respaldo.service";
import { resumirAntiguedad } from "../../../core/utils/antiguedad";

@Component({
  selector: "app-sidebar",
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.css",
})
export class SidebarComponent {
  private readonly respaldo = inject(RespaldoService);
  private readonly router = inject(Router);

  protected readonly iconoMarca = Music;
  protected readonly iconoBiblioteca = Library;
  protected readonly iconoCancioneros = BookOpen;
  protected readonly iconoAjustes = Settings;
  protected readonly iconoRespaldo = ShieldCheck;

  private readonly estado = this.respaldo.estado;

  protected readonly hayCambiosSinRespaldar = computed(
    () => this.estado()?.hayCambiosSinRespaldar ?? false,
  );

  protected readonly detalle = computed(() => {
    const estado = this.estado();

    if (estado === null) return "Consultando…";
    if (estado.hayCambiosSinRespaldar) return "Tienes cambios sin respaldar";

    return `Última copia: ${resumirAntiguedad(estado.ultimaCopia)}`;
  });

  constructor() {
    this.respaldo.refrescarEstado();

    // Al terminar cualquier navegación se vuelve a mirar: así el aviso aparece
    // en cuanto se guarda una canción y se vuelve a la biblioteca.
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.respaldo.refrescarEstado());
  }
}
