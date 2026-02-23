import { requireAdmin, getUsuarios, cambiarEstadoUsuario } from "./servicio.js";

// ============================================
// FUNCIONES HELPER PARA MODAL DE CONFIRMACION
// ============================================

function mostrarModalExito(titulo, mensaje) {
  const modal = document.getElementById("modal-confirmacion");
  const tituloEl = document.getElementById("modal-titulo");
  const mensajeEl = document.getElementById("modal-mensaje");
  const btnEl = document.getElementById("modal-btn");
  
  if (!modal || !tituloEl || !mensajeEl || !btnEl) {
    console.error("Elementos del modal no encontrados");
    return;
  }
  
  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;
  
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--exito";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--exito";
  
  modal.classList.add("show");
}

function mostrarModalError(titulo, mensaje) {
  const modal = document.getElementById("modal-confirmacion");
  const tituloEl = document.getElementById("modal-titulo");
  const mensajeEl = document.getElementById("modal-mensaje");
  const btnEl = document.getElementById("modal-btn");
  
  if (!modal || !tituloEl || !mensajeEl || !btnEl) {
    console.error("Elementos del modal no encontrados");
    return;
  }
  
  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;
  
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--error";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--error";
  
  modal.classList.add("show");
}

function cerrarModal() {
  const modal = document.getElementById("modal-confirmacion");
  if (modal) {
    modal.classList.remove("show");
  }
}

function inicializarModalConfirmacion() {
  const btnModal = document.getElementById("modal-btn");
  const backdropModal = document.querySelector(".modal-confirmacion_backdrop");
  
  if (btnModal) {
    btnModal.addEventListener("click", cerrarModal);
  }
  
  if (backdropModal) {
    backdropModal.addEventListener("click", cerrarModal);
  }
  
  // Cerrar con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modal-confirmacion");
      if (modal && modal.classList.contains("show")) {
        cerrarModal();
      }
    }
  });
}

// Agrega de aquí hacia arriba (antes de etiquetaRol)

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
    ul.innerHTML = `<li style="padding:1rem;color:#555;">No se pudieron cargar los empleados.</li>`;
    mostrarModalError("Error al cargar", `No se pudieron cargar los empleados: ${err.message}`);
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
      
      // MODAL DE EXITO
      const accionPasado = nuevoActivo ? "activado" : "desactivado";
      mostrarModalExito("Cambios guardados", `El empleado fue ${accionPasado} correctamente`);
    } catch (err) {
       mostrarModalError("Error al cambiar estado", `No se pudo ${accion} el empleado: ${err.message || "Intenta nuevamente"}`);
      e.target.textContent = estaActivo ? "Desactivar" : "Activar";
    } finally {
      e.target.disabled = false;
    }
  });
  inicializarModalConfirmacion();
});

