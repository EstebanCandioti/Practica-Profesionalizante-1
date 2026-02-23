import {
  requireAdmin,
  getPlatos,
  cambiarEstadoPlato,
  crearPlato,
  modificarPlato,
} from "./servicio.js";

function crearItemPlato(plato) {
  const itemPlato = document.createElement("li");
  itemPlato.className = "administrar_platos_main_platos_lista_item";

  const idPlato = plato.id_plato ?? plato.idPlato ?? plato.id;
  const nombrePlato = plato.nombre ?? plato.name ?? "";
  const imagenPlato = plato.imagen ?? "";

  itemPlato.dataset.idPlato = String(idPlato ?? "");
  itemPlato.dataset.imagen = imagenPlato;

  itemPlato.innerHTML = `
    <span>${nombrePlato}</span>
    <label>
      <input type="checkbox" class="administrar_platos_main_platos_lista_item_checkbox">
      <span>seleccionar</span>
    </label>
  `;

  return itemPlato;
}

async function recargarListaPlatos(contenedorLista) {
  const platos = await getPlatos();
  contenedorLista.innerHTML = "";
  platos.forEach((plato) => contenedorLista.appendChild(crearItemPlato(plato)));
}

document.addEventListener("DOMContentLoaded", async () => {
  const usuario = requireAdmin("./login.html");
  if (!usuario) return;

  // Referencias del DOM - TODAS AL INICIO
  const ul = document.querySelector(".administrar_platos_main_platos_lista");
  const modalAdd = document.getElementById("ap-modal-agregar");
  const modalDel = document.getElementById("ap-modal-borrar");
  const formAdd = document.getElementById("ap-form-agregar");
  const inputAddNombre = document.getElementById("ap-add-nombre");
  const inputAddDescripcion = document.getElementById("ap-add-descripcion");
  const inputAddCategoria = document.getElementById("ap-add-categoria");
  const inputAddImagen = document.getElementById("plato-imagen");
  
  // CORREGIDO: ID correcto del boton segun el HTML
  const btnConfirmDel = document.getElementById("ap-confirm-borrar");
  const btnDesmarcar = document.querySelector(".administrar_platos_main_botones_boton:not([id])");

  if (!ul) return;

  // 1) Cargar y renderizar
  await recargarListaPlatos(ul);

  // 4) Modales abrir/cerrar
  function openModal(m) {
    if (m) m.hidden = false;
    setTimeout(() => m?.querySelector("input,button,select")?.focus(), 0);
  }
  
  function closeModal(m) {
    if (m) m.hidden = true;
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#ap-btn-agregar")) openModal(modalAdd);
    if (e.target.closest("#ap-btn-borrar")) openModal(modalDel);
    if (e.target.closest("[data-ap-close]")) {
      const m = e.target.closest(".ap-modal");
      if (m) closeModal(m);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalAdd && !modalAdd.hidden) closeModal(modalAdd);
      if (modalDel && !modalDel.hidden) closeModal(modalDel);
    }
  });

  // =======================
  // Modal EDITAR
  // =======================

  const botonAbrirEditar = document.getElementById("ap-btn-editar");
  const modalEditar = document.getElementById("ap-modal-editar");
  const formEditar = document.getElementById("ap-form-editar");
  const selectPlatoEditar = document.getElementById("ap-edit-select");
  const inputEditarNombre = document.getElementById("ap-edit-nombre");
  const inputEditarDescripcion = document.getElementById("ap-edit-descripcion");
  const inputEditarCategoria = document.getElementById("ap-edit-categoria");
  const inputEditarImagen = document.getElementById("ap-edit-imagen");
  const mensajeEditar = document.getElementById("ap-edit-msg");

  let listaPlatosCache = [];

  function abrirModalEditar() {
    if (modalEditar) modalEditar.hidden = false;
    setTimeout(() => selectPlatoEditar?.focus(), 0);
  }

  function cerrarModalEditar() {
    if (modalEditar) modalEditar.hidden = true;
    if (mensajeEditar) mensajeEditar.textContent = "";
  }

  function setMensajeEditar(texto) {
    if (mensajeEditar) mensajeEditar.textContent = texto ?? "";
  }

  function obtenerPlatoSeleccionado() {
    const idSeleccionado = Number(selectPlatoEditar.value);
    return listaPlatosCache.find((plato) => {
      const id = plato.id_plato ?? plato.idPlato ?? plato.id;
      return Number(id) === idSeleccionado;
    });
  }

  function cargarInputsDesdePlato(plato) {
    if (inputEditarNombre) inputEditarNombre.value = plato?.nombre ?? "";
    if (inputEditarDescripcion) inputEditarDescripcion.value = plato?.descripcion ?? "";
    if (inputEditarCategoria) inputEditarCategoria.value = plato?.categoria ?? "";
    if (inputEditarImagen) inputEditarImagen.value = plato?.imagen ?? "";
  }

  async function cargarSelectEditarPlatos() {
    setMensajeEditar("Cargando platos...");
    if (selectPlatoEditar) selectPlatoEditar.innerHTML = `<option value="">Cargando...</option>`;

    try {
      listaPlatosCache = await getPlatos();

      if (!Array.isArray(listaPlatosCache) || listaPlatosCache.length === 0) {
        if (selectPlatoEditar) selectPlatoEditar.innerHTML = `<option value="">No hay platos</option>`;
        setMensajeEditar("No hay platos para editar.");
        return;
      }

      if (selectPlatoEditar) selectPlatoEditar.innerHTML = `<option value="">Seleccione un plato...</option>`;

      listaPlatosCache.forEach((plato) => {
        const id = plato.id_plato ?? plato.idPlato ?? plato.id;
        const nombre = plato.nombre ?? "(sin nombre)";
        const option = document.createElement("option");
        option.value = String(id);
        option.textContent = `${nombre} (#${id})`;
        option.dataset.descripcion = plato.descripcion ?? "";
        option.dataset.categoria = plato.categoria ?? "";
        option.dataset.imagen = plato.imagen ?? "";
        selectPlatoEditar.appendChild(option);
      });

      setMensajeEditar("");
    } catch (error) {
      console.error(error);
      if (selectPlatoEditar) selectPlatoEditar.innerHTML = `<option value="">Error cargando</option>`;
      setMensajeEditar("No se pudieron cargar los platos.");
    }
  }

  selectPlatoEditar?.addEventListener("change", () => {
    const plato = obtenerPlatoSeleccionado();
    cargarInputsDesdePlato(plato || null);
  });

  botonAbrirEditar?.addEventListener("click", async () => {
    abrirModalEditar();
    await cargarSelectEditarPlatos();
    cargarInputsDesdePlato(null);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-ap-close-editar]")) {
      cerrarModalEditar();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEditar && !modalEditar.hidden) {
      cerrarModalEditar();
    }
  });

  formEditar?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const platoSeleccionado = obtenerPlatoSeleccionado();
    if (!platoSeleccionado) {
      setMensajeEditar("Seleccione un plato.");
      selectPlatoEditar?.focus();
      return;
    }

    const idPlato = Number(selectPlatoEditar.value);

    if (!Number.isInteger(idPlato)) {
      setMensajeEditar("ID de plato invalido.");
      return;
    }

    const payload = {
      id_plato: idPlato,
      nombre: inputEditarNombre.value.trim(),
      descripcion: inputEditarDescripcion.value.trim(),
      categoria: inputEditarCategoria.value.trim(),
      imagen: inputEditarImagen.value.trim(),
    };

    if (!payload.nombre) {
      setMensajeEditar("El nombre no puede estar vacio.");
      inputEditarNombre?.focus();
      return;
    }

    try {
      setMensajeEditar("Guardando cambios...");
      await modificarPlato(idPlato, payload);
      setMensajeEditar("Plato actualizado.");
      cerrarModalEditar();
      await recargarListaPlatos(ul);
        mostrarModalExito("Plato actualizado", "Los cambios se guardaron correctamente");
    } catch (error) {
      console.error(error);
      cerrarModalEditar();
      mostrarModalError("Error al editar plato", error.message || "No se pudo modificar el plato. Intenta nuevamente");
    }
  });

  // 5) Agregar nuevo plato
  formAdd?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = inputAddNombre?.value.trim();
    const imagen = inputAddImagen?.value.trim();
    const descripcion = inputAddDescripcion?.value.trim();
    const categoria = inputAddCategoria?.value.trim();

    if (!nombre) {
      inputAddNombre?.focus();
      return;
    }
    if (!descripcion) {
      inputAddDescripcion?.focus();
      return;
    }
    if (!categoria) {
      inputAddCategoria?.focus();
      return;
    }

    try {
      await crearPlato({ nombre, descripcion, imagen, categoria });
      await recargarListaPlatos(ul);

      if (inputAddNombre) inputAddNombre.value = "";
      if (inputAddCategoria) inputAddCategoria.value = "";
      if (inputAddDescripcion) inputAddDescripcion.value = "";
      if (inputAddImagen) inputAddImagen.value = "";
      closeModal(modalAdd);
      mostrarModalExito("Plato creado", "El plato se creo correctamente");
    } catch (error) {
      console.error(error);
      mostrarModalError("Error al crear plato", error.message || "No se pudo crear el plato. Intenta nuevamente");
    }
  });

  // 6) Borrar los platos - CORREGIDO con ID correcto
  if (btnConfirmDel) {
    btnConfirmDel.addEventListener("click", async () => {
      const checksMarcados = ul.querySelectorAll(
        ".administrar_platos_main_platos_lista_item_checkbox:checked"
      );

      if (!checksMarcados.length) {
        mostrarModalError("Platos no seleccionados", "Debes seleccionar al menos un plato para eliminar");
        return;
      }

      const itemsSeleccionados = Array.from(checksMarcados)
        .map((check) => check.closest(".administrar_platos_main_platos_lista_item"))
        .filter(Boolean);

      const idsAEliminar = itemsSeleccionados
        .map((item) => Number(item.dataset.idPlato))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (!idsAEliminar.length) {
        mostrarModalError("Error de validacion", "Los platos seleccionados no tienen ID valido");
        return;
      }

      try {
        await Promise.all(idsAEliminar.map((id) => cambiarEstadoPlato(id)));
        await recargarListaPlatos(ul);
        closeModal(modalDel);
        const cantidad = idsAEliminar.length;
        const mensaje = cantidad === 1 
          ? "El plato se elimino correctamente" 
          : `Se eliminaron ${cantidad} platos correctamente`;
        mostrarModalExito("Platos eliminados", mensaje);
      } catch (error) {
        console.error(error);
        mostrarModalError("Error al eliminar", error.message || "No se pudieron eliminar los platos. Intenta nuevamente");
      }
    });
  } else {
    console.error("Boton confirmar borrar no encontrado (ID: ap-confirm-borrar)");
  }

  // 7) Desmarcar todos los platos - CORREGIDO
  btnDesmarcar?.addEventListener("click", () => {
    const checkboxes = ul.querySelectorAll(
      ".administrar_platos_main_platos_lista_item_checkbox"
    );
    
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    
    const items = ul.querySelectorAll(".administrar_platos_main_platos_lista_item");
    items.forEach((item) => {
      item.classList.remove("ap-item-active");
    });
  });
  // Event listeners para modal de confirmacion
  const btnModalConfirmacion = document.getElementById("modal-btn");
  const backdropModalConfirmacion = document.querySelector(".modal-confirmacion_backdrop");
  
  if (btnModalConfirmacion) {
    btnModalConfirmacion.addEventListener("click", cerrarModal);
  }
  
  if (backdropModalConfirmacion) {
    backdropModalConfirmacion.addEventListener("click", cerrarModal);
  }
});

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
  
  // Configurar contenido
  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;
  
  // Aplicar estilos de exito
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--exito";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--exito";
  
  // Mostrar modal
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
  
  // Configurar contenido
  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;
  
  // Aplicar estilos de error
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--error";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--error";
  
  // Mostrar modal
  modal.classList.add("show");
}

function cerrarModal() {
  const modal = document.getElementById("modal-confirmacion");
  if (modal) {
    modal.classList.remove("show");
  }
}

