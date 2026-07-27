import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-raiz",
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "<router-outlet />",
})
export class App {}
