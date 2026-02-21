console.log("index.js cargo");

import { 
  getUsuarios, 
  requireAuth, 
  getUsuarioActivo,
  getPedidosPorUsuario,
  getNotificacionesPorUsuario,
  getConfiguracion,
  logout
} from "./servicio.js";

async function cargarPedidosUsuarioSeguros(idUsuario) {
  try {
    return await getPedidosPorUsuario(idUsuario);
  } catch (err) {
    if (err.message.includes("404")) {
      return [];
    }
    throw err;
  }
}

// Cambia el texto del elemento con el id indicado
function setTexto(idElemento, nuevoTexto) {
  const elemento = document.getElementById(idElemento);
  if (elemento) elemento.textContent = nuevoTexto;
}

// Devuelve la fecha actual en formato "YYYY-MM-DD"
function obtenerFechaActualISO() {
  const fechaActual = new Date();
  const anio = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaActual.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

// True si la hora actual es anterior al horario limite de pedidos ("HH:MM")
function antesDeHorarioLimite(horaLimitePedidos) {
  const [horaLimite, minutoLimite] = horaLimitePedidos.split(":").map(Number);
  const ahora = new Date();
  const limiteHoy = new Date();
  limiteHoy.setHours(horaLimite, minutoLimite, 0, 0);
  return ahora.getTime() < limiteHoy.getTime();
}

// Normaliza nombres de dia para comparar ("miercoles" vs "miercoles", "MARTES" → "martes")
function normalizarDia(nombreDia) {
  if (!nombreDia) return "";
  return nombreDia
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Oculta el link de configuracion si el usuario NO es admin del restaurante
document.addEventListener("DOMContentLoaded", () => {
  const user = getUsuarioActivo();
  const configLink = document.querySelector(
    '.sidebar a[href="adm-configuracion.html"]'
  );

  const esUsuarioRestaurante = user && user.es_usuario_restaurante === true;

  if (configLink && !esUsuarioRestaurante) {
    const item = configLink.closest(".sidebar_lista_item");
    if (item) item.style.display = "none";
  }
});

async function init() {
  // 1) Requiere sesion (redirige a login si no hay)
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  // 2) Carga usuarios, pedidos y configuracion desde el back en paralelo
  const [usuariosRegistrados, pedidosRegistrados, config] = await Promise.all([
    getUsuarios(),
    cargarPedidosUsuarioSeguros(usuarioActivo.idUsuario),
    getConfiguracion().catch((err) => {
      console.error("No se pudo cargar la configuracion:", err);
      return { horarioLimite: "10:30" }; // fallback por si el back no responde
    }),
  ]);

  const HORA_LIMITE_PEDIDOS = config?.horarioLimite || "10:30";

  console.log("Usuarios:", usuariosRegistrados);
  console.log("Pedidos:", pedidosRegistrados);
  console.log("Horario limite:", HORA_LIMITE_PEDIDOS);

  // 3) Usuario actual segun la DB
  const datosUsuario =
    usuariosRegistrados.find(
      (u) => u.idUsuario === usuarioActivo.idUsuario
    ) || usuarioActivo;

  // 4) Carta: Dias de asistencia
  const diasAsistencia = (datosUsuario.diasAsistencia || []).map((item) =>
    normalizarDia(item.dia)
  );
  const diasAsistenciaTexto = diasAsistencia.join(", ");
  setTexto(
    "home_asistencia",
    diasAsistenciaTexto || "Sin dias de asistencia configurados"
  );

  // 5) Carta: Ultimo pedido
  const pedidosDelUsuario = (pedidosRegistrados || []).sort((a, b) => {
    const fechaA = a.fechaPedido || a.fecha_pedido || "";
    const fechaB = b.fechaPedido || b.fecha_pedido || "";
    return fechaA < fechaB ? 1 : -1;
  });

  if (pedidosDelUsuario.length > 0) {
    const ultimoPedido = pedidosDelUsuario[0];
    const fechaUltimoPedido =
      ultimoPedido.fechaPedido ||
      ultimoPedido.fecha_pedido ||
      ultimoPedido.fechaEntrega ||
      ultimoPedido.fecha_entrega ||
      "—";
    const estadoUltimoPedido =
      ultimoPedido.estado || ultimoPedido.estadoPedido || "";

    setTexto("home_ultima_fecha", fechaUltimoPedido);
    setTexto(
      "home_ultimo_plato",
      estadoUltimoPedido ? `Estado: ${estadoUltimoPedido}` : "Pedido realizado"
    );
  } else {
    setTexto("home_ultima_fecha", "—");
    setTexto("home_ultimo_plato", "Aun no realizaste pedidos");
  }

  // 6) Carta: Horario limite y aviso
  setTexto(
    "home_horario_limite",
    `El horario limite para pedir es ${HORA_LIMITE_PEDIDOS}`
  );

  const nombreDiaHoy = normalizarDia(
    new Date().toLocaleDateString("es-AR", { weekday: "long" })
  );

  let mensajeAviso = "";

  if (
    !["lunes", "martes", "miercoles", "jueves", "viernes"].includes(nombreDiaHoy)
  ) {
    mensajeAviso = "Hoy no hay pedidos (fin de semana).";
  } else if (!diasAsistencia.includes(nombreDiaHoy)) {
    mensajeAviso = "Hoy no es uno de tus dias de asistencia.";
  } else if (antesDeHorarioLimite(HORA_LIMITE_PEDIDOS)) {
    mensajeAviso = `Estas a tiempo. Tenes hasta las ${HORA_LIMITE_PEDIDOS} para pedir.`;
  } else {
    mensajeAviso = `Cerrado. El horario limite de hoy (${HORA_LIMITE_PEDIDOS}) ya paso.`;
  }

  setTexto("home_aviso", mensajeAviso);

  // 7) Carta: Notificaciones - Mostrar solo las NO LEIDAS
  try {
    const notificaciones = await getNotificacionesPorUsuario(usuarioActivo.idUsuario);
    
    // Filtrar solo las notificaciones no leidas
    const noLeidas = (notificaciones || []).filter(n => n.leida === false);
    
    if (noLeidas.length === 0) {
      setTexto("home_notificacion", "No tienes notificaciones nuevas");
    } else {
      // Mostrar la cantidad de notificaciones no leidas
      const cantidad = noLeidas.length;
      const textoNotif = cantidad === 1 
        ? "Tienes 1 notificacion nueva" 
        : `Tienes ${cantidad} notificaciones nuevas`;
      setTexto("home_notificacion", textoNotif);
    }
  } catch (err) {
    // Si es 404, no hay notificaciones (no es error)
    if (err.message.includes("404")) {
      setTexto("home_notificacion", "No tienes notificaciones nuevas");
    } else {
      console.error("Error al cargar notificaciones:", err);
      setTexto("home_notificacion", "No tienes notificaciones nuevas");
    }
  }
}

init();