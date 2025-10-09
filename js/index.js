console.log("index.js cargó");

import { getUsuarios, getConfig, requireAuth, getPedidos, getUsuarioActivo } from "./servicio.js";

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

// Cambia el texto del elemento con el id indicado
function setTexto(idElemento, nuevoTexto) {
  const elemento = document.getElementById(idElemento);
  if (elemento) elemento.textContent = nuevoTexto;
}

// Devuelve la fecha actual en formato "YYYY-MM-DD"
function obtenerFechaActualISO() {
  const fechaActual = new Date();
  const año = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaActual.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

// True si la fechaISO está listada como feriado en config.json
function esFeriado(configuracion, fechaISO) {
  const añoYMes = fechaISO.slice(0, 7); // "2025-10"
  const feriadosDelMes = configuracion?.feriados?.[añoYMes] || [];
  return feriadosDelMes.includes(fechaISO);
}

// True si la hora actual es anterior al horario límite de pedidos ("HH:MM")
function antesDeHorarioLimite(horaLimitePedidos) {
  const [horaLimite, minutoLimite] = horaLimitePedidos.split(":").map(Number);
  const ahora = new Date();
  const limiteHoy = new Date();
  limiteHoy.setHours(horaLimite, minutoLimite, 0, 0);
  return ahora.getTime() < limiteHoy.getTime();
}

// Normaliza nombres de día para comparar (“miércoles” vs “miercoles”)
function normalizarDia(nombreDia) {
  return nombreDia
    .toLowerCase()
    .replace("á", "a")
    .replace("é", "e")
    .replace("í", "i")
    .replace("ó", "o")
    .replace("ú", "u");
}

async function init() {
  // 1) Requiere sesión (redirige a login si no hay)
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  // 2) Carga datos en paralelo
  const [usuariosRegistrados, configuracion, pedidosRegistrados] =
    await Promise.all([getUsuarios(), getConfig(), getPedidos()]);
  console.log(usuariosRegistrados, configuracion, pedidosRegistrados);

  // 3) Usuario actual (por si cambió algo en usuarios.json)
  const datosUsuario =
    usuariosRegistrados.find((u) => u.id === usuarioActivo.id) || usuarioActivo;

  // 4) Carta: Días de asistencia (tu JSON ahora trae ["lunes","miercoles","viernes"])
  const diasAsistencia = (datosUsuario.dias_asistencia || []).map(
    normalizarDia
  );
  const diasAsistenciaTexto = diasAsistencia.join(", ");
  setTexto("home_asistencia", diasAsistenciaTexto || "Sin días configurados");

  // 5) Carta: Último pedido
  const pedidosDelUsuario = pedidosRegistrados
    .filter((pedido) => pedido.usuario_id === datosUsuario.id)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  if (pedidosDelUsuario.length > 0) {
    const ultimoPedido = pedidosDelUsuario[0];
    setTexto("home_ultima_fecha", ultimoPedido.fecha);
    setTexto("home_ultimo_plato", String(ultimoPedido.platos || ""));
  } else {
    setTexto("home_ultima_fecha", "—");
    setTexto("home_ultimo_plato", "Aún no realizaste pedidos");
  }

  // 6) Carta: Aviso y horario límite
  const horaLimitePedidos = configuracion.horario_limite_pedidos;
  setTexto(
    "home_horario_limite",
    `El horario limite para pedir es ${horaLimitePedidos} `
  );

  const fechaActualISO = obtenerFechaActualISO();
  const hoyEsFeriado = esFeriado(configuracion, fechaActualISO);

  // nombre de día actual en español (p.ej. "miércoles"), normalizado para comparar
  const nombreDiaHoy = normalizarDia(
    new Date().toLocaleDateString("es-AR", { weekday: "long" })
  );

  let mensajeAviso = "";

  if (hoyEsFeriado) {
    mensajeAviso = "Hoy es feriado. No se toman pedidos.";
  } else if (
    !["lunes", "martes", "miercoles", "jueves", "viernes"].includes(
      nombreDiaHoy
    )
  ) {
    mensajeAviso = "Hoy no hay pedidos (fin de semana).";
  } else if (!diasAsistencia.includes(nombreDiaHoy)) {
    mensajeAviso = "Hoy no es uno de tus días de asistencia.";
  } else if (antesDeHorarioLimite(horaLimitePedidos)) {
    mensajeAviso = `Estás a tiempo. Tenés hasta las ${horaLimitePedidos} para pedir.`;
  } else {
    mensajeAviso = `Cerrado. El horario límite de hoy (${horaLimitePedidos}) ya pasó.`;
  }

  setTexto("home_aviso", mensajeAviso);

  // 7) Carta: Notificaciones (placeholder)
  setTexto("home_notif", "No tienes notificaciones nuevas");
}


init();
