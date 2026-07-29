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
    path: "canciones/:id",
    title: "Canción · Cancionero",
    loadComponent: () =>
      import("./pages/visor-cancion/visor-cancion.page").then(
        (modulo) => modulo.VisorCancionPage,
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
  {
    path: "cancioneros",
    title: "Nuevo cancionero · Cancionero",
    loadComponent: () =>
      import("./pages/cancionero/cancionero.page").then(
        (modulo) => modulo.CancioneroPage,
      ),
  },
  {
    path: "ajustes",
    title: "Ajustes · Cancionero",
    loadComponent: () =>
      import("./pages/ajustes/ajustes.page").then((modulo) => modulo.AjustesPage),
  },
  { path: "**", redirectTo: "biblioteca" },
];
