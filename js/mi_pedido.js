import {
  requireAuth,
  getMenuPlatosPorFecha,
  getPedidosSemana,
  actualizarPedidoDia,
  eliminarPedidoDia,
} from "./servicio.js";

// Protección de ruta
const usuario = requireAuth("./login.html");
if (!usuario) {
  // El requireAuth ya redirige, pero por seguridad detenemos ejecución
  throw new Error("Acceso no autorizado");
}

let menuPlatosDia = [];
let pedidoDiaActual = null;
const inputCantidad = () => document.getElementById("input-cantidad");
const modalMsg = () => document.getElementById("modal-msg");
const modal = () => document.getElementById("modal-editar");
const selectPlato = () => document.getElementById("select-plato");
const stockInfo = () => document.getElementById("stock-info");

function obtenerFechaActualISO() {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`; // fecha local, sin conversión UTC
}

function setText(el, text) {
  if (el) el.textContent = text ?? "—";
}

function renderPedidos(lista) {
  const contenedor = document.getElementById("lista-pedidos");
  const tpl = document.getElementById("tpl-pedido");
  contenedor.innerHTML = "";

  for (const item of lista) {
    console.log(item);
    const nodo = tpl.content.firstElementChild.cloneNode(true);

    setText(
      nodo.querySelector('[data-field="fechaEntrega"]'),
      item.fechaEntrega,
    );
    setText(nodo.querySelector('[data-field="nombrePlato"]'), item.nombrePlato);
    setText(
      nodo.querySelector('[data-field="cantidadPersonas"]'),
      item.cantidadPersonas,
    );
    setText(nodo.querySelector('[data-field="estado"]'), item.estado);

    // Guardamos IDs como data-attributes (para que los botones sepan qué item son)
    nodo.dataset.idPedidoDia = item.idPedidoDia;
    nodo.dataset.idPedido = item.idPedido;
    nodo.dataset.fechaEntrega = item.fechaEntrega;
    nodo.dataset.idMenuDia = item.idMenuDia;
    nodo.dataset.idPlato = item.idPlato;

    // Botones: ya existen en HTML, acá solo se les asigna comportamiento
    const btnModificar = nodo.querySelector('[data-action="modificar"]');
    const btnCancelar = nodo.querySelector('[data-action="cancelar"]');

    btnModificar.addEventListener("click", () => {
      abrirEdicion(item);
    });

    btnCancelar.addEventListener("click", async () => {
      const ok = confirm(
        `¿Querés cancelar el pedido del ${item.fechaEntrega} (${item.nombrePlato})?`,
      );
      if (!ok) return;

      try {
        await eliminarPedidoDia(item.idPedidoDia);
        await cargarMisPendientes(); // refresca la lista
      } catch (err) {
        console.error(err);
        alert(err.message || "No se pudo cancelar el pedido.");
      }
    });

    contenedor.appendChild(nodo);
  }
}

async function cargarMisPendientes() {
  const usuario = requireAuth("./login.html");
  if (!usuario) return;

  const estado = document.getElementById("estado");
  estado.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando...</p>';

  let lista = [];
  try {
    const todos = await getPedidosSemana(obtenerFechaActualISO(), 1);
    lista = (todos || []).filter(
      (p) =>
        p.idUsuario === Number(usuario.idUsuario) && p.estado === "Pendiente",
    );
  } catch (err) {
    lista = [];
  }

  if (lista.length === 0) {
    estado.innerHTML = `
      <div class="mi-pedido-vacio">
        <h3>No tenes pedidos pendientes</h3>
        <p>para la semana entrante</p>
        <button onclick="window.location.href='/realizar_pedido.html'">Realizar pedido</button>
      </div>
    `;
    renderPedidos([]);
    return;
  }

  estado.innerHTML = "";
  renderPedidos(lista);
}

function abrirModal() {
  modalMsg().textContent = "";
  modal().style.display = "block";
}

function cerrarModal() {
  modal().style.display = "none";
}

function llenarSelectPlatos() {
  const select = selectPlato();
  select.innerHTML = "";

  if (!pedidoDiaActual) return;

  menuPlatosDia.forEach((mp) => {
    const opt = document.createElement("option");

    opt.value = String(mp.idMenuPlato);
    opt.textContent = `${mp.plato.nombre} (stock: ${mp.stockDisponible})`;

    // preseleccionar el plato actual del pedido
    if (mp.plato.id_plato === pedidoDiaActual.idPlato) {
      opt.selected = true;
    }

    select.appendChild(opt);
  });

  actualizarTextoStock();
}

async function abrirEdicion(item) {
  if (!item) return;

  // item viene de pedido-dia/semana (PedidoSemanaItemDTO)
  const fecha = item.fechaEntrega;

  try {
    menuPlatosDia = await getMenuPlatosPorFecha(fecha);
  } catch (err) {
    console.error("Error getMenuPlatosPorFecha:", err);
    alert(err.message); // <-- MOSTRAR EL MENSAJE REAL DEL BACK
    return;
  }

  // Guardamos el item que se está editando (si lo necesitás luego en guardarCambios)
  pedidoDiaActual = item;

  inputCantidad().value = String(item.cantidadPersonas ?? 1);

  llenarSelectPlatos(); // usa pedidoDiaActual para preseleccionar plato
  abrirModal();
}

function actualizarTextoStock() {
  const select = selectPlato();
  if (!select || !Array.isArray(menuPlatosDia)) return;

  const idMenuPlato = Number(select.value);
  const mp = menuPlatosDia.find((x) => Number(x.idMenuPlato) === idMenuPlato);

  if (!mp) {
    stockInfo().textContent = "";
    return;
  }

  stockInfo().textContent = `Stock disponible: ${mp.stockDisponible}`;
}

async function guardarCambios() {
  modalMsg().textContent = "";

  const cantidad = Number(inputCantidad().value);
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    modalMsg().textContent =
      "La cantidad debe ser un número mayor o igual a 1.";
    return;
  }

  const select = selectPlato();
  const idMenuPlato = Number(select?.value);

  const mp = (menuPlatosDia || []).find(
    (x) => Number(x.idMenuPlato) === idMenuPlato,
  );

  if (!mp) {
    modalMsg().textContent = "Plato seleccionado inválido.";
    return;
  }

  if (!pedidoDiaActual?.idPedidoDia) {
    modalMsg().textContent = "No se pudo identificar el pedido a modificar.";
    return;
  }

  const payload = {
    idPedidoDia: pedidoDiaActual.idPedidoDia,
    idPlatoNuevo: mp.plato.id_plato,
    idMenuDiaNuevo: mp.menuDia.idMenuDia,
    cantidadPersonas: cantidad,
  };

  const btnGuardar = document.getElementById("btn-guardar");
  btnGuardar.disabled = true;

  try {
    await actualizarPedidoDia(payload);

    // opcional: mantener estado local coherente
    pedidoDiaActual.idPlato = mp.plato.id_plato;
    pedidoDiaActual.idMenuDia = mp.menuDia.idMenuDia;
    pedidoDiaActual.cantidadPersonas = cantidad;
    pedidoDiaActual.nombrePlato = mp.plato.nombre;

    cerrarModal();

    // refrescar la pantalla correcta (pendientes / semana)
    await cargarMisPendientes();
  } catch (err) {
    console.error(err);
    modalMsg().textContent = err.message || "No se pudo actualizar el pedido.";
  } finally {
    btnGuardar.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // listeners del modal (estos sí son fijos)
  document
    .getElementById("btn-cancelar")
    ?.addEventListener("click", cerrarModal);
  document
    .getElementById("btn-guardar")
    ?.addEventListener("click", guardarCambios);
  document
    .getElementById("select-plato")
    ?.addEventListener("change", actualizarTextoStock);

  // click fuera del contenido cierra modal
  document.getElementById("modal-editar")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-editar") cerrarModal();
  });

  //cargar la lista nueva (pendientes/semana)
  cargarMisPendientes();
});