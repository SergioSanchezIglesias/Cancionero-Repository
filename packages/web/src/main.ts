import { bootstrapApplication } from "@angular/platform-browser";
import { App } from "./app/app";
import { configuracionApp } from "./app/app.config";

bootstrapApplication(App, configuracionApp).catch((fallo: unknown) => {
  console.error(fallo);
});
