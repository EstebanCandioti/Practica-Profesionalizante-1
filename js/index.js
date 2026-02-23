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

// Crear tarjetas de accesos rapidos para admin
function crearCartasAdmin() {
  const container = document.getElementById("home_cartas_container");
  if (!container) return;

  const accesos = [
    {
      icono: "/resources/platos.png",
      titulo: "Administrar platos",
      href: "/administrar_platos.html"
    },
    {
      icono: "/resources/menu.png",
      titulo: "Configurar menu del dia",
      href: "/adm-menu-dia.html"
    },
    {
      icono: "/resources/pedido.png",
      titulo: "Ver pedidos semanales",
      href: "/adm-pedido-semanal.html"
    }
  ];

  accesos.forEach(acceso => {
    const carta = document.createElement("div");
    carta.className = "home_cartas_carta home_cartas_carta--admin";
    carta.style.cursor = "pointer";
    carta.style.border= "3px solid #8a8989"

    carta.innerHTML = `
      <img src="${acceso.icono}" alt="${acceso.titulo}" class="home_cartas_carta_icono" />
      <h5 class="home_cartas_carta_titulo">${acceso.titulo}</h5>
    `;
    
    carta.addEventListener("click", () => {
      window.location.href = acceso.href;
    });
    
    container.appendChild(carta);
  });
}

async function init() {
  // 1) Requiere sesion (redirige a login si no hay)
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  // Detectar si es admin
  const esAdmin = usuarioActivo.es_usuario_restaurante === true;

  // 2) Carga usuarios, pedidos, notificaciones y configuracion desde el back en paralelo
  const [usuariosRegistrados, pedidosRegistrados, notificaciones, config] = await Promise.all([
    getUsuarios(),
    esAdmin ? Promise.resolve([]) : cargarPedidosUsuarioSeguros(usuarioActivo.idUsuario), // Admin no necesita pedidos
    getNotificacionesPorUsuario(usuarioActivo.idUsuario).catch(() => []),
    getConfiguracion().catch((err) => {
      console.error("No se pudo cargar la configuracion:", err);
      return { horarioLimite: "10:30" };
    }),
  ]);

  const HORA_LIMITE_PEDIDOS = config?.horarioLimite || "10:30";

  console.log("Usuarios:", usuariosRegistrados);
  console.log("Pedidos:", pedidosRegistrados);
  console.log("Notificaciones:", notificaciones);
  console.log("Horario limite:", HORA_LIMITE_PEDIDOS);
  console.log("Es admin:", esAdmin);

  // 3) Usuario actual segun la DB
  const datosUsuario =
    usuariosRegistrados.find(
      (u) => u.idUsuario === usuarioActivo.idUsuario
    ) || usuarioActivo;

  // 4) OCULTAR CARTAS PARA ADMIN
  if (esAdmin) {
    const cartaAsistencia = document.getElementById("carta-asistencia");
    const cartaUltimoPedido = document.getElementById("carta-ultimo-pedido");
    
    if (cartaAsistencia) cartaAsistencia.style.display = "none";
    if (cartaUltimoPedido) cartaUltimoPedido.style.display = "none";
  } else {
    const cartaAsistencia = document.getElementById("carta-asistencia");
    cartaAsistencia.style.border="solid 3px #8a8989"
    const cartaUltimoPedido = document.getElementById("carta-ultimo-pedido");
    cartaUltimoPedido.style.border= "solid 3px #8a8989"
    // 4) Carta: Dias de asistencia (SOLO EMPLEADOS)
    const diasAsistencia = (datosUsuario.diasAsistencia || []).map((item) =>
      normalizarDia(item.dia)
    );
    const diasAsistenciaTexto = diasAsistencia.join(", ");
    setTexto(
      "home_asistencia",
      diasAsistenciaTexto || "Sin dias de asistencia configurados"
    );

    // 5) Carta: Ultimo pedido (SOLO EMPLEADOS)
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

    // HACER TARJETAS CLICKEABLES SOLO PARA EMPLEADOS
    
    // Tarjeta "Dias de asistencia" -> Configurar asistencia
    document.getElementById("carta-asistencia")?.addEventListener("click", () => {
      window.location.href = "/configurar_asistencia.html";
    });
    
    // Tarjeta "Ultimo pedido" -> Historial de pedidos
    document.getElementById("carta-ultimo-pedido")?.addEventListener("click", () => {
      window.location.href = "/historial-pedidos.html";
    });
  }

  // 6) Carta: Horario limite (TODOS)
  setTexto(
    "home_horario_limite",
    `El horario limite para pedir es ${HORA_LIMITE_PEDIDOS}`
  );

  // 7) Carta: Aviso - MOSTRAR RECORDATORIOS (TODOS)
  const recordatorios = (notificaciones || [])
    .filter(n => n.asunto && n.asunto.toLowerCase().includes("recordatorio"))
    .sort((a, b) => {
      const fechaA = new Date(a.fechaEnvio || 0);
      const fechaB = new Date(b.fechaEnvio || 0);
      return fechaB - fechaA; // Mas reciente primero
    });

  if (recordatorios.length > 0) {
    const ultimoRecordatorio = recordatorios[0];
    setTexto("home_aviso", ultimoRecordatorio.mensaje || "Tienes recordatorios pendientes");
  } else {
    setTexto("home_aviso", "No tienes recordatorios pendientes");
  }

  // 8) Carta: Notificaciones - Mostrar solo las NO LEIDAS (TODOS)
  const noLeidas = (notificaciones || []).filter(n => n.leida === false);
  
  if (noLeidas.length === 0) {
    setTexto("home_notificacion", "No tienes notificaciones nuevas");
  } else {
    const cantidad = noLeidas.length;
    const textoNotif = cantidad === 1 
      ? "Tienes 1 notificacion nueva" 
      : `Tienes ${cantidad} notificaciones nuevas`;
    setTexto("home_notificacion", textoNotif);
  }

  // 9) HACER TARJETA DE NOTIFICACIONES CLICKEABLE (TODOS)
  const cartaNotificaciones = document.getElementById("carta-notificaciones");
  if (cartaNotificaciones) {
    cartaNotificaciones.addEventListener("click", () => {
      window.location.href = "/notificaciones.html";
    });

    // 10) AGREGAR BADGE SI HAY NOTIFICACIONES NO LEIDAS
    if (noLeidas.length > 0) {
      const badge = document.createElement("span");
      badge.className = "notificacion-badge";
      cartaNotificaciones.appendChild(badge);
    }
  }

  // 11) AGREGAR ACCESOS RAPIDOS PARA ADMIN
  if (esAdmin) {
    crearCartasAdmin();
  }
}

init();