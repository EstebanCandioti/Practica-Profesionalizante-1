import { requireAdmin, getUsuarios } from "./servicio.js";

function crearItemUsuario(u) {
  const li = document.createElement("li");
  li.className = "gestion_empleados_main_menu_lista_item";
  li.dataset.id = u.id;

  li.innerHTML = `
    <span class="ge_nombre">${u.nombre || u.username || "Sin nombre"}</span>
    <span class="ge_rol">(${u.rol})</span>
    <button type="button" class="ge_toggle">${u.rol === "administrador" ? "Quitar admin" : "Hacer admin"}</button>
    <button type="button" class="ge_borrar">Eliminar</button>
  `;
  return li;
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Solo admin
  const admin = requireAdmin("./index.html");
  if (!admin) return;

  // 2) Referencias
  const ul = document.querySelector(".gestion_empleados_main_menu_lista");
  const btnAplicar = document.querySelector(".gestion_empleados_main_boton");
  if (!ul || !btnAplicar) return;

  // 3) Cargar usuarios y render
  const usuarios = await getUsuarios();
  ul.innerHTML = "";
  usuarios.forEach(u => ul.appendChild(crearItemUsuario(u)));

  // Estructuras para recolectar cambios (solo UI)
  const cambiosRol = new Map();   // id -> "usuario" | "administrador"
  const eliminados = new Set();   // ids eliminados

  // 4) Delegación de acciones
  ul.addEventListener("click", (e) => {
    const li = e.target.closest(".gestion_empleados_main_menu_lista_item");
    if (!li) return;
    const id = Number(li.dataset.id);
    const spanRol = li.querySelector(".ge_rol");
    const btnToggle = li.querySelector(".ge_toggle");

    // Toggle rol
    if (e.target.classList.contains("ge_toggle")) {
      const rolActual = spanRol.textContent.replace(/[()]/g, "").trim(); // "(usuario)" -> "usuario"
      const nuevoRol = rolActual === "administrador" ? "usuario" : "administrador";

      spanRol.textContent = `(${nuevoRol})`;
      btnToggle.textContent = nuevoRol === "administrador" ? "Quitar admin" : "Hacer admin";
      cambiosRol.set(id, nuevoRol);
    }

    // Eliminar
    if (e.target.classList.contains("ge_borrar")) {
      if (id === admin.id) {
        alert("No podés eliminar tu propio usuario.");
        return;
      }
      li.remove();
      eliminados.add(id);
      cambiosRol.delete(id); // si tenía cambio de rol, ya no aplica
    }
  });

  // 5) Aplicar cambios (consola)
  btnAplicar.addEventListener("click", () => {
    const payloadCambios = Array.from(cambiosRol.entries()).map(([usuario_id, nuevo_rol]) => ({ usuario_id, nuevo_rol }));
    const payloadBajas = Array.from(eliminados.values()).map(usuario_id => ({ usuario_id }));

    console.log("Cambios de rol:", payloadCambios);
    console.log("Eliminados:", payloadBajas);
    alert("Cambios listos (ver consola).");
  });
});
