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
  {
    path: "canciones/nueva",
    title: "Nueva canción · Cancionero",
    loadComponent: () =>
      import("./pages/editor-cancion/editor-cancion.page").then(
        (modulo) => modulo.EditorCancionPage,
      ),
  },
  {
    path: "canciones/:id/editar",
    title: "Editar canción · Cancionero",
    loadComponent: () =>
      import("./pages/editor-cancion/editor-cancion.page").then(
        (modulo) => modulo.EditorCancionPage,
      ),
  },
  { path: "**", redirectTo: "biblioteca" },
];
