import {
  requireAuth,
  getUsuarioActivo,
  getPedidosSemana,
  crearPedido,
  crearPedidoDia,
  getMenusDiaPorSemana,
  getMenuPlatosPorFecha,
  getPedidosPorUsuario,
  mostrarModalError,
  mostrarModalExito,
  inicializarModalConfirmacion,
} from "./servicio.js";

let fechaSeleccionadaISO = null;
let menuDiaActual = null; // el MenuDia encontrado para esa fecha
let pedidoSemanaCache = null; // para saber si ya hay pedido ese día

document.getElementById("btn-cant-mas")?.addEventListener("click", () => {
  const input = document.getElementById("cantidad_personas");
  input.value = String(Math.max(1, Number(input.value || 1) + 1));
});

document.getElementById("btn-cant-menos")?.addEventListener("click", () => {
  const input = document.getElementById("cantidad_personas");
  input.value = String(Math.max(1, Number(input.value || 1) - 1));
});

function setMensaje(texto, ok = true) {
  const modal = document.getElementById("modal-mensaje");
  const textoEl = document.getElementById("modal-mensaje-texto");
  const btnCerrar = document.getElementById("modal-mensaje-cerrar");

  if (!modal || !textoEl) return;

  textoEl.textContent = texto;
  textoEl.style.color = ok ? "#1a7a3c" : "#b00020";
  modal.style.display = "flex";

  btnCerrar.onclick = () => {
    modal.style.display = "none";
    if (ok) location.reload();
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      if (ok) location.reload();
    }
  };
}

function obtenerIdPlatoSeleccionado() {
  const seleccionado = document.querySelector('input[name="menu"]:checked');
  if (!seleccionado) return null;
  return Number(seleccionado.dataset.idPlato);
}

function normalizarDia(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerFechaActualISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`; // YYYY-MM-DD
}

function obtenerLunesDeSemana(date) {
  const fecha = new Date(date);
  fecha.setHours(0, 0, 0, 0);
  const diaSemana = fecha.getDay(); // 0 dom ... 6 sab
  const diferenciaALunes = (diaSemana + 6) % 7;
  fecha.setDate(fecha.getDate() - diferenciaALunes);
  return fecha;
}

function aISOFechaLocal(date) {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

// lunes→viernes semana entrante
function obtenerSemanaEntranteISO() {
  const lunesEstaSemana = obtenerLunesDeSemana(new Date());
  lunesEstaSemana.setDate(lunesEstaSemana.getDate() + 7);

  const nombres = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  const mapa = {};

  for (let indice = 0; indice < 5; indice++) {
    const fecha = new Date(lunesEstaSemana);
    fecha.setDate(lunesEstaSemana.getDate() + indice);
    mapa[nombres[indice]] = aISOFechaLocal(fecha);
  }

  return mapa; // { lunes: "YYYY-MM-DD", ... }
}

function renderMenuPlatos(menuPlatos, contenedorCartas) {
  if (!menuPlatos || menuPlatos.length === 0) {
    contenedorCartas.innerHTML = `<p style="padding:12px">No hay platos disponibles para este día.</p>`;
    return;
  }

  contenedorCartas.innerHTML = "";
  const fragmento = document.createDocumentFragment();

  menuPlatos.forEach((menuPlato, indice) => {
    const plato = menuPlato.plato;
    console.log("menuPlato completo:", menuPlato);
    console.log("menuPlato.plato:", menuPlato.plato);
    const idPlato = plato.id_plato;
    const nombre = plato?.nombre ?? "(sin nombre)";
    const stock = menuPlato.stockDisponible ?? 0;
    const idMenuDia = menuPlato.menuDia.idMenuDia;

    // MEJORA 1: Solo usar imagen si existe y no esta vacia
    const tieneImagen = plato?.imagen && plato.imagen.trim() !== "";
    const imagen = tieneImagen ? plato.imagen : null;

    const carta = document.createElement("div");
    carta.className = "realizar_pedido_container_cartas_carta col-3";

    // MEJORA 1: Solo incluir <img> si hay imagen
    carta.innerHTML = `
      ${imagen ? `<img src="${imagen}" alt="${nombre}" class="realizar_pedido_container_cartas_carta_foto" />` : ""}
      <p class="realizar_pedido_container_cartas_carta_texto">${nombre}</p>
      <p style="margin:0; opacity:.8;">Stock: ${stock}</p>
      <input
        type="radio"
        name="menu"
        class="realizar_pedido_container_cartas_carta_input"
        data-id-plato="${idPlato}"
        data-id-menu-dia="${idMenuDia}"
        ${indice === 0 ? "checked" : ""}
      />
    `;

    fragmento.appendChild(carta);
  });

  contenedorCartas.appendChild(fragmento);
}

let cacheMenusSemana = null; // Array<MenuDia>
const cachePlatosPorFecha = {}; // { "YYYY-MM-DD": Array<MenuPlato> }

async function cargarSemanaEntrante() {
  const hoyISO = obtenerFechaActualISO();
  cacheMenusSemana = await getMenusDiaPorSemana(hoyISO, 1); // offset=1 => semana entrante
}

async function cargarYMostrarDia(
  diaNormalizado,
  fechasSemanaEntrante,
  contenedorCartas,
) {
  const fechaISO = fechasSemanaEntrante[diaNormalizado];
  fechaSeleccionadaISO = fechaISO;
  menuDiaActual = null;
  if (!fechaISO) {
    contenedorCartas.innerHTML = `<p style="padding:12px">Día inválido.</p>`;
    return;
  }

  contenedorCartas.innerHTML = `<p style="padding:12px">Cargando...</p>`;

  try {
    if (!cacheMenusSemana) {
      await cargarSemanaEntrante();
    }

    // Busco el MenuDia por fecha exacta (sin problemas de weekday/timezone)
    const menuDia = (cacheMenusSemana || []).find((m) => m.fecha === fechaISO);

    if (!menuDia) {
      contenedorCartas.innerHTML = `<p style="padding:12px">No hay menú cargado para ${fechaISO}.</p>`;
      return;
    }

    if (!cachePlatosPorFecha[fechaISO]) {
      cachePlatosPorFecha[fechaISO] = await getMenuPlatosPorFecha(fechaISO);
    }

    renderMenuPlatos(cachePlatosPorFecha[fechaISO], contenedorCartas);
  } catch (error) {
    console.error(error);
    contenedorCartas.innerHTML = `<p style="padding:12px">No hay menú cargado para ${fechaISO}.</p>`;
  }
}

// Variable para guardar el id de Pedido (si ya existe)
let idPedido = null;

// Llamar cuando el usuario haga click en "Realizar pedido"
async function onRealizarPedidoClick() {
  try {
    const diaSeleccionado = fechaSeleccionadaISO;

    const seleccionado = document.querySelector('input[name="menu"]:checked');
    if (!seleccionado) {
      mostrarModalError("Error", "Seleccione un plato para el dia");
      return;
    }

    const idPlatoSeleccionado = Number(seleccionado.dataset.idPlato);
    const idMenuDia = Number(seleccionado.dataset.idMenuDia);
    const cantidadPersonas = Number(
      document.getElementById("cantidad_personas")?.value || 1,
    );

    if (!Number.isFinite(idPlatoSeleccionado) || !Number.isFinite(idMenuDia)) {
      mostrarModalError(
        "Error",
        "No se pudo determinar el plato o menu que quiere seleccionar"
      );
      return;
    }

    if (!diaSeleccionado) {
      mostrarModalError("Error", "Seleccione un dia para realizar el pedido");
      return;
    }

    // si no hay pedidos, esto devuelve []
    const pedidosSemana = await getPedidosSemana(obtenerFechaActualISO(), 1);
    const pedidoExistente = (pedidosSemana || []).find(
      (p) =>
        p.fechaEntrega === diaSeleccionado &&
        Number(p.idUsuario) === Number(getUsuarioActivo().idUsuario),
    );
    // Si no existe pedido para ese día, lo creamos
    if (!pedidoExistente) {
      await crearPedido({
        idUsuario: getUsuarioActivo().idUsuario,
        fecha_pedido: diaSeleccionado,
        cantidad_personas: cantidadPersonas,
        estado: "Pendiente",
      });

      // recuperar el idPedido creado
      const pedidosUsuario = await getPedidosPorUsuario(
        getUsuarioActivo().idUsuario,
      );

      const pedidosDelDia = (pedidosUsuario || []).filter(
        (p) => p.fechaPedido === diaSeleccionado,
      );

      if (pedidosDelDia.length === 0) {
        console.error("Pedidos usuario:", pedidosUsuario);
        mostrarModalError(
          "Error",
          "Se creó el pedido pero no se pudo recuperar su ID.",
        );
        return;
      }

      // Tomamos el último creado (mayor idPedido)
      pedidosDelDia.sort((a, b) => a.idPedido - b.idPedido);
      const pedidoDelDia = pedidosDelDia[pedidosDelDia.length - 1];

      const idPedidoCreado = pedidoDelDia.idPedido;

      await crearPedidoDia({
        idPedido: idPedidoCreado,
        idMenuDia: idMenuDia, // viene del radio
        idPlato: idPlatoSeleccionado,
        fechaEntrega: diaSeleccionado,
      });

      mostrarModalExito("Exito", "Pedido creado correctamente");
      return;
    }
    mostrarModalError("Error", "Ya existe un pedido para ese dia");
  } catch (error) {
    console.error("Error al realizar el pedido", error);
    mostrarModalError(
      "Error",
      "Hubo un error al realizar el pedido, intentelo nuevamente"
    );
  }
}

// Llamamos a este evento cuando se haga click en "Realizar pedido"
document
  .getElementById("realizar_pedido")
  .addEventListener("click", onRealizarPedidoClick);

async function init() {
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  const usuario = getUsuarioActivo() || usuarioActivo;

  // asistencia: [{dia:"MARTES"}, ...]
  const diasAsistenciaNormalizados = (usuario.diasAsistencia || []).map(
    (item) => normalizarDia(item.dia),
  );

  const fechasSemanaEntrante = obtenerSemanaEntranteISO();

  const botonesDias = Array.from(
    document.querySelectorAll(".realizar_pedido_container_dias_dia"),
  );

  const contenedorCartas = document.querySelector(
    ".realizar_pedido_container_cartas",
  );
  if (!contenedorCartas) return;

  // seteo dataset + disabled según asistencia
  botonesDias.forEach((boton) => {
    const diaNormalizado = normalizarDia(boton.textContent.trim());
    boton.dataset.dia = diaNormalizado;
    boton.disabled = !diasAsistenciaNormalizados.includes(diaNormalizado);

    boton.addEventListener("click", () => {
      // MEJORA 2: Remover clase de todos los botones
      botonesDias.forEach((b) => b.classList.remove("dia-seleccionado"));

      // MEJORA 2: Agregar clase solo al boton clickeado
      boton.classList.add("dia-seleccionado");

      cargarYMostrarDia(diaNormalizado, fechasSemanaEntrante, contenedorCartas);
    });
  });

  // pre-cargo semana entrante (una sola vez)
  await cargarSemanaEntrante();

  // primer día habilitado
  const primerHabilitado = botonesDias.find((b) => !b.disabled);
  if (primerHabilitado) {
    primerHabilitado.click();
  } else {
    contenedorCartas.innerHTML = `<p style="padding:12px">No tenés días de asistencia configurados.</p>`;
  }
  inicializarModalConfirmacion();
}

init();
