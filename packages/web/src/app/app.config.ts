import { provideHttpClient, withFetch } from "@angular/common/http";
import {
  provideBrowserGlobalErrorListeners,
  type ApplicationConfig,
} from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { routes } from "./app.routes";

export const configuracionApp: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
