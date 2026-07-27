import type { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "biblioteca" },
  {
    path: "biblioteca",
    title: "Biblioteca · Cancionero",
    loadComponent: () =>
      import("./pages/biblioteca/biblioteca.page").then(
        (modulo) => modulo.BibliotecaPage,
      ),
  },
  { path: "**", redirectTo: "biblioteca" },
];
