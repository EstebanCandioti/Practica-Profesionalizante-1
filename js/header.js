import { getUsuarioActivo } from "./servicio.js";

document.addEventListener("DOMContentLoaded", () => {
  const user = getUsuarioActivo();
  const headerUser = document.getElementById("nombre-usuario-header");

  if (headerUser) {
    if (user && (user.nombre || user.username)) {
      headerUser.textContent = user.nombre || user.username;
    } else {
      headerUser.textContent = "Invitado";
    }
  }
});
