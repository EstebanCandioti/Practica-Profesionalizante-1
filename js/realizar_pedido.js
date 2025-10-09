import {
  requireAuth,
  getUsuarios,
  getPlatos,
  getConfig,
  getPedidos,
  getUsuarioActivo,
} from "./servicio.js";

function normalizarDia(nombreDia) {
  return nombreDia
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}
function obtenerFechaActualISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function esFeriado(configuracion, fechaISO) {
  const añoMes = fechaISO.slice(0, 7); // "YYYY-MM"
  const feriadosDelMes = configuracion?.feriados?.[añoMes] || [];
  return feriadosDelMes.includes(fechaISO);
}

function antesDeHorarioLimite(horaLimitePedidos) {
  const [h, m] = horaLimitePedidos.split(":").map(Number);
  const ahora = new Date();
  const limiteHoy = new Date();
  limiteHoy.setHours(h, m, 0, 0);
  return ahora.getTime() < limiteHoy.getTime();
}
function leerPedidosLocales() {
  try {
    return JSON.parse(localStorage.getItem("pedidos_local")) || [];
  } catch {
    return [];
  }
}

function guardarPedidosLocales(arr) {
  localStorage.setItem("pedidos_local", JSON.stringify(arr));
}

function fusionarPedidos(pedidosJSON, pedidosLocal) {
  return [...(pedidosJSON || []), ...(pedidosLocal || [])];
}

function existePedidoHoy(pedidosFusionados, usuarioId, fechaISO) {
  return pedidosFusionados.some(
    (p) => p.usuario_id === usuarioId && p.fecha === fechaISO
  );
}
function crearIdPedido() {
  // simple autoincremental basado en localStorage
  const key = "pedido_seq";
  const n = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, String(n));
  return n;
}

function renderPlatos(platosDelDia, contenedorCartas) {
  contenedorCartas.innerHTML = "";
  if (!platosDelDia.length) {
    contenedorCartas.innerHTML = `<p style="padding:12px">No hay platos disponibles para este día.</p>`;
    return;
  }

  // Bootstrap grid: cada carta tiene col-3 como tu HTML
  const frag = document.createDocumentFragment();

  platosDelDia.forEach((plato, idx) => {
    const carta = document.createElement("div");
    carta.className = "realizar_pedido_container_cartas_carta col-3";
    carta.innerHTML = `
      <img src="${plato.imagen || "/resources/platos/default.jpg"}"
           alt="${plato.name}"
           class="realizar_pedido_container_cartas_carta_foto" />
      <p class="realizar_pedido_container_cartas_carta_texto">${plato.name}</p>
      <input type="radio" name="menu" class="realizar_pedido_container_cartas_carta_input" value="${
        plato.name
      }" ${idx === 0 ? "checked" : ""}/>
    `;
    frag.appendChild(carta);
  });

  contenedorCartas.appendChild(frag);
}

async function init() {
  // 1) Sesión
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  // 2) Datos
  const [usuarios, platos, config, pedidosJSON] = await Promise.all([
    getUsuarios(),
    getPlatos(),
    getConfig(),
    getPedidos(),
  ]);
  const datosUsuario =
    usuarios.find((u) => u.id === usuarioActivo.id) || usuarioActivo;

  // 3) Contexto de hoy
  const fechaHoyISO = obtenerFechaActualISO();
  const nombreDiaHoy = normalizarDia(
    new Date().toLocaleDateString("es-AR", { weekday: "long" })
  ); // ej. "miercoles"
  const esFeriadoHoy = esFeriado(config, fechaHoyISO);
  const dentroDeHorario = antesDeHorarioLimite(config.horario_limite_pedidos);
  const diasAsistencia = (datosUsuario.dias_asistencia || []).map(
    normalizarDia
  );
  const asisteHoy = diasAsistencia.includes(nombreDiaHoy);

  // 4) Habilitar botones de días según asistencia
  const botonesDias = Array.from(
    document.querySelectorAll(".realizar_pedido_container_dias_dia")
  );
  // Agregamos data-dia normalizado a cada botón leyendo su texto (Lunes, Martes, etc.)
  botonesDias.forEach((btn) => {
    btn.dataset.dia = normalizarDia(btn.textContent.trim());
    // deshabilita si no está en días de asistencia
    btn.disabled = !diasAsistencia.includes(btn.dataset.dia);
  });

  // 5) Contenedor de cartas
  const contenedorCartas = document.querySelector(
    ".realizar_pedido_container_cartas"
  );

  // 6) Función para mostrar platos de un día
  function mostrarDia(diaNormalizado) {
    const platosDelDia = platos.filter(
      (p) => normalizarDia(p.day) === diaNormalizado
    );
    renderPlatos(platosDelDia, contenedorCartas);
  }

  // 7) Click en botones de día → render
  botonesDias.forEach((btn) => {
    btn.addEventListener("click", () => {
      mostrarDia(btn.dataset.dia);
    });
  });

  // 8) Carga inicial: si hoy es un día de asistencia, mostrar ese
  if (diasAsistencia.includes(nombreDiaHoy)) {
    const btnHoy = botonesDias.find((b) => b.dataset.dia === nombreDiaHoy);
    if (btnHoy) btnHoy.click();
  } else {
    // si no asiste hoy, mostrar el primer día habilitado (si existe)
    const primero = botonesDias.find((b) => !b.disabled);
    if (primero) primero.click();
  }

  // 9) “Realizar pedido”
  const botonConfirmar = document.querySelector(
    ".realizar_pedido_container_boton"
  );
  botonConfirmar.addEventListener("click", () => {
    // El día actualmente mostrado es el último botón presionado; lo inferimos por el radio renderizado
    const radios = document.querySelectorAll(
      ".realizar_pedido_container_cartas_carta_input"
    );
    if (!radios.length) {
      alert("No hay platos para el día seleccionado.");
      return;
    }
    const radioSeleccionado = Array.from(radios).find((r) => r.checked);
    if (!radioSeleccionado) {
      alert("Seleccioná un plato para continuar.");
      return;
    }

    // Validaciones: solo permitir pedido para “hoy”
    const diaMostrado =
      document.querySelector(".realizar_pedido_container_dias_dia:focus")
        ?.dataset.dia || nombreDiaHoy; // fallback: si no quedó focus, tomamos hoy

    if (diaMostrado !== nombreDiaHoy) {
      alert("Solo se pueden realizar pedidos para el día de hoy.");
      return;
    }
    if (esFeriadoHoy) {
      alert("Hoy es feriado. No se toman pedidos.");
      return;
    }
    if (!asisteHoy) {
      alert("Hoy no es uno de tus días de asistencia.");
      return;
    }
    if (!dentroDeHorario) {
      alert(
        `Cerrado. El horario límite (${config.horario_limite_pedidos}) ya pasó.`
      );
      return;
    }

    // Duplicado de pedido
    const pedidosLocales = leerPedidosLocales();
    const pedidosFusionados = fusionarPedidos(pedidosJSON, pedidosLocales);
    if (existePedidoHoy(pedidosFusionados, datosUsuario.id, fechaHoyISO)) {
      alert("Ya realizaste tu pedido hoy.");
      return;
    }

    // Crear y guardar pedido local
    const nuevoPedido = {
      id: crearIdPedido(),
      usuario_id: datosUsuario.id,
      fecha: fechaHoyISO,
      platos: radioSeleccionado.value,
    };
    pedidosLocales.push(nuevoPedido);
    guardarPedidosLocales(pedidosLocales);

    alert(`Pedido confirmado: ${nuevoPedido.platos} para ${fechaHoyISO}`);
  });
}

//Busca el href configuracion y lo oculta si no se es admin
document.addEventListener("DOMContentLoaded", () => {
  const user = getUsuarioActivo();
  const configLink = document.querySelector(
    '.sidebar a[href="adm-configuracion.html"]'
  );
  if (configLink && (!user || user.rol !== "administrador")) {
    const item = configLink.closest(".sidebar_lista_item");
    if (item) item.style.display = "none";
  }
});

init();
