import { getUsuarioActivo, logout } from "./servicio.js";

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

    document.getElementById("btn-logout")?.addEventListener("click", ()=>{
    const ok= confirm("¿Queres cerrar sesion?")
    if(ok) logout("./login.html")
  })
});