import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import {
  BookOpen,
  Library,
  LucideAngularModule,
  Music,
  Settings,
  ShieldCheck,
} from "lucide-angular";

@Component({
  selector: "app-sidebar",
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.css",
})
export class SidebarComponent {
  protected readonly iconoMarca = Music;
  protected readonly iconoBiblioteca = Library;
  protected readonly iconoCancioneros = BookOpen;
  protected readonly iconoAjustes = Settings;
  protected readonly iconoRespaldo = ShieldCheck;
}
