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

  const ul = document.querySelector(".administrar_platos_main_platos_lista");

  const modalAdd = document.getElementById("ap-modal-agregar");
  const modalDel = document.getElementById("ap-modal-borrar");
  const formAdd = document.getElementById("ap-form-agregar");
  const inputAddNombre = document.getElementById("ap-add-nombre");
  const inputAddDescripcion = document.getElementById("ap-add-descripcion");
  const inputAddCategoria = document.getElementById("ap-add-categoria");
  const inputAddImagen = document.getElementById("plato-imagen");

  if (!ul) return;

  // 1) Cargar y renderizar
  await recargarListaPlatos(ul);

  // 2) Activar/desactivar select según checkbox
  ul.addEventListener("change", (e) => {
    const li = e.target.closest(".administrar_platos_main_platos_lista_item");
    if (!li) return;
    if (
      e.target.classList.contains(
        "administrar_platos_main_platos_lista_item_checkbox"
      )
    ) {
      const selected = li.querySelector(
        ".administrar_platos_main_lista_item_dias"
      );
      const checked = e.target.checked;
      selected.disabled = !checked;
      if (!checked) selected.value = "";
      li.classList.toggle("ap-item-active", checked);
    }
  });


  // 4) Modales abrir/cerrar
  function openModal(m) {
    m.hidden = false;
    setTimeout(() => m.querySelector("input,button,select")?.focus(), 0);
  }
  function closeModal(m) {
    m.hidden = true;
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
      if (!modalAdd.hidden) closeModal(modalAdd);
      if (!modalDel.hidden) closeModal(modalDel);
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
    modalEditar.hidden = false;
    setTimeout(() => selectPlatoEditar?.focus(), 0);
  }

  function cerrarModalEditar() {
    modalEditar.hidden = true;
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
    inputEditarNombre.value = plato?.nombre ?? "";
    inputEditarDescripcion.value = plato?.descripcion ?? "";
    inputEditarCategoria.value = plato?.categoria ?? "";
    inputEditarImagen.value = plato?.imagen ?? "";
  }

  async function cargarSelectEditarPlatos() {
    setMensajeEditar("Cargando platos...");
    selectPlatoEditar.innerHTML = `<option value="">Cargando...</option>`;

    try {
      listaPlatosCache = await getPlatos();

      if (!Array.isArray(listaPlatosCache) || listaPlatosCache.length === 0) {
        selectPlatoEditar.innerHTML = `<option value="">No hay platos</option>`;
        setMensajeEditar("No hay platos para editar.");
        return;
      }

      selectPlatoEditar.innerHTML = `<option value="">Seleccione un plato...</option>`;

      listaPlatosCache.forEach((plato) => {
        const id = plato.id_plato ?? plato.idPlato ?? plato.id;
        const nombre = plato.nombre ?? "(sin nombre)";

        const option = document.createElement("option");

        // clave: el value SIEMPRE es el id
        option.value = String(id);
        option.textContent = `${nombre} (#${id})`;

        // opcional: datos extra para autocompletar inputs sin buscar
        option.dataset.descripcion = plato.descripcion ?? "";
        option.dataset.categoria = plato.categoria ?? "";
        option.dataset.imagen = plato.imagen ?? "";

        selectPlatoEditar.appendChild(option);
      });

      setMensajeEditar("");
    } catch (error) {
      console.error(error);
      selectPlatoEditar.innerHTML = `<option value="">Error cargando</option>`;
      setMensajeEditar("No se pudieron cargar los platos.");
    }
  }

  // Cuando cambia el select, precargar inputs
  selectPlatoEditar?.addEventListener("change", () => {
    const plato = obtenerPlatoSeleccionado();
    if (!plato) {
      cargarInputsDesdePlato(null);
      return;
    }
    cargarInputsDesdePlato(plato);
  });

  // Abrir modal al click
  botonAbrirEditar?.addEventListener("click", async () => {
    abrirModalEditar();
    await cargarSelectEditarPlatos();
    cargarInputsDesdePlato(null);
  });

  // Cerrar modal (click backdrop, x, cancelar)
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

  // Guardar cambios
  formEditar?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const platoSeleccionado = obtenerPlatoSeleccionado();
    if (!platoSeleccionado) {
      setMensajeEditar("Seleccione un plato.");
      selectPlatoEditar.focus();
      return;
    }

    const idPlato = Number(selectPlatoEditar.value);

    if (!Number.isInteger(idPlato)) {
      setMensajeEditar("ID de plato inválido.");
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
      setMensajeEditar("El nombre no puede estar vacío.");
      inputEditarNombre.focus();
      return;
    }

    try {
      setMensajeEditar("Guardando cambios...");
      await modificarPlato(idPlato, payload);

      setMensajeEditar("Plato actualizado.");
      cerrarModalEditar();
      await recargarListaPlatos(ul);

    } catch (error) {
      console.error(error);
      setMensajeEditar(error.message || "No se pudo modificar el plato.");
    }
  });

  // 5) Agregar nuevo plato
  formAdd?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = inputAddNombre.value.trim();
    const imagen = inputAddImagen.value.trim();
    const descripcion = inputAddDescripcion.value.trim();
    const categoria = inputAddCategoria.value.trim();

    if (!nombre) {
      inputAddNombre.focus();
      return;
    }
    if (!descripcion) {
      inputAddDescripcion.focus();
      return;
    }
    if (!categoria) {
      inputAddCategoria.focus();
      return;
    }

    try {
      await crearPlato({ nombre, descripcion, imagen, categoria });
      await recargarListaPlatos(ul);

      inputAddNombre.value = "";
      inputAddCategoria.value = "";
      inputAddDescripcion.value = "";
      inputAddImagen.value = "";
      closeModal(modalAdd);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo crear el plato.");
    }
  });

  // 6) Borrar los platos
  btnConfirmDel?.addEventListener("click", async () => {
    const checksMarcados = ul.querySelectorAll(
      ".administrar_platos_main_platos_lista_item_checkbox:checked"
    );

    if (!checksMarcados.length) {
      alert("No hay platos seleccionados para borrar.");
      return;
    }

    const itemsSeleccionados = Array.from(checksMarcados)
      .map((check) =>
        check.closest(".administrar_platos_main_platos_lista_item")
      )
      .filter(Boolean);

    const idsAEliminar = itemsSeleccionados
      .map((item) => Number(item.dataset.idPlato))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!idsAEliminar.length) {
      alert("Los platos seleccionados no tienen id válido.");
      return;
    }

    try {
      await Promise.all(idsAEliminar.map((id) => cambiarEstadoPlato(id)));

      await recargarListaPlatos(ul);
      closeModal(modalDel);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudieron borrar los platos.");
    }
  });

  // 7) Desmarcar todos los platos
  const btnDesmarcar = document.querySelector(
    ".administrar_platos_main_botones_boton:not([id])"
  );
  btnDesmarcar?.addEventListener("click", () => {
    const items = ul.querySelectorAll(
      ".administrar_platos_main_platos_lista_item"
    );
    items.forEach((li) => {
      const chk = li.querySelector(
        ".administrar_platos_main_platos_lista_item_checkbox"
      );
      const sel = li.querySelector(".administrar_platos_main_lista_item_dias");
      if (chk) chk.checked = false;
      if (sel) {
        sel.disabled = true;
        sel.value = "";
      }
      li.classList.remove("ap-item-active");
    });
  });
});
