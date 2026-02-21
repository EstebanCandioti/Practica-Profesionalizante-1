import { requireAdmin, getUsuarios, cambiarEstadoUsuario } from "./servicio.js";

// Agrega la función al servicio si aún no existe — ver nota al final del archivo
// Endpoint real: PUT /usuarios/estado/{id}

function etiquetaRol(esRestaurante) {
  return esRestaurante ? "Restaurante" : "Empleado";
}

function crearItemUsuario(u) {
  const li = document.createElement("li");
  li.className = "gestion_empleados_main_menu_lista_item";
  li.dataset.id = u.idUsuario;
  li.dataset.activo = u.activo ? "true" : "false";

  const nombreCompleto = [u.nombre, u.apellido].filter(Boolean).join(" ") || "Sin nombre";
  const rol = etiquetaRol(u.es_usuario_restaurante);
  const estadoTexto = u.activo ? "Activo" : "Inactivo";
  const btnTexto = u.activo ? "Desactivar" : "Activar";
  const btnClase = u.activo ? "ge_toggle ge_toggle--desactivar" : "ge_toggle ge_toggle--activar";

  li.innerHTML = `
    <span class="ge_nombre">${nombreCompleto}</span>
    <span class="ge_rol">(${rol})</span>
    <span class="ge_estado ${u.activo ? "ge_estado--activo" : "ge_estado--inactivo"}">${estadoTexto}</span>
    <button type="button" class="${btnClase}">${btnTexto}</button>
  `;
  return li;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Solo el usuario restaurante puede acceder a esta pantalla
  const adminActivo = requireAdmin("./index.html");
  if (!adminActivo) return;

  const ul = document.querySelector(".gestion_empleados_main_menu_lista");
  if (!ul) return;

  // Cargar y renderizar empleados (excluye al usuario restaurante logueado)
  let usuarios = [];
  try {
    const todos = await getUsuarios();
    // Mostrar solo empleados (no restaurante), excluyendo al admin actual
    usuarios = todos.filter(
      (u) => !u.es_usuario_restaurante && u.idUsuario !== adminActivo.idUsuario
    );
  } catch (err) {
    ul.innerHTML = `<li style="padding:1rem;color:red;">Error al cargar empleados: ${err.message}</li>`;
    return;
  }

  if (usuarios.length === 0) {
    ul.innerHTML = `<li style="padding:1rem;color:#555;">No hay empleados registrados.</li>`;
    return;
  }

  ul.innerHTML = "";
  usuarios.forEach((u) => ul.appendChild(crearItemUsuario(u)));

  // Delegación de eventos: toggle activo/inactivo por empleado
  ul.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("ge_toggle")) return;

    const li = e.target.closest(".gestion_empleados_main_menu_lista_item");
    if (!li) return;

    const id = Number(li.dataset.id);
    const estaActivo = li.dataset.activo === "true";
    const accion = estaActivo ? "desactivar" : "activar";

    const confirmar = confirm(
      `¿Querés ${accion} este empleado?`
    );
    if (!confirmar) return;

    e.target.disabled = true;
    e.target.textContent = "Guardando...";

    try {
      await cambiarEstadoUsuario(id);

      // Actualizar UI sin recargar la página
      const nuevoActivo = !estaActivo;
      li.dataset.activo = nuevoActivo ? "true" : "false";

      const spanEstado = li.querySelector(".ge_estado");
      spanEstado.textContent = nuevoActivo ? "Activo" : "Inactivo";
      spanEstado.className = `ge_estado ${nuevoActivo ? "ge_estado--activo" : "ge_estado--inactivo"}`;

      e.target.textContent = nuevoActivo ? "Desactivar" : "Activar";
      e.target.className = `ge_toggle ${nuevoActivo ? "ge_toggle--desactivar" : "ge_toggle--activar"}`;
    } catch (err) {
      alert(`No se pudo ${accion} el empleado: ${err.message}`);
      e.target.textContent = estaActivo ? "Desactivar" : "Activar";
    } finally {
      e.target.disabled = false;
    }
  });
});

/*
  NOTA — Agregar en servicio.js si no existe:

  export async function cambiarEstadoUsuario(idUsuario) {
    return await apiFetch(`/usuarios/estado/${idUsuario}`, {
      method: "PUT",
    });
  }
*/