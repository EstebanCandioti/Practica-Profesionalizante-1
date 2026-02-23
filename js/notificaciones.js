import { 
  requireAuth, 
  getUsuarioActivo, 
  getNotificacionesPorUsuario,
  marcarTodasNotificacionesLeidas 
} from "./servicio.js";

function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.textContent = txt ?? "";
}

function formatearFecha(fecha){
  // soporta Date string o ISO; si no se puede, devuelve tal cual
  try{
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    return d.toLocaleString("es-AR");
  }catch{
    return String(fecha);
  }
}

function renderNotificaciones(lista){
  const cont = document.getElementById("noti-list");
  cont.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0){
    cont.innerHTML = `<div class="noti_card"><p style="margin:0;">No tenes notificaciones.</p></div>`;
    return;
  }

  // Mas nuevas primero
  lista.sort((a,b) => {
    const fa = new Date(a.fechaEnvio ?? 0).getTime();
    const fb = new Date(b.fechaEnvio ?? 0).getTime();
    return fb - fa;
  });

  const frag = document.createDocumentFragment();

  lista.forEach(n => {
    const card = document.createElement("div");
    card.className = "noti_card";

    const asunto = n.asunto ?? "(Sin asunto)";
    const fecha = n.fechaEnvio ? formatearFecha(n.fechaEnvio) : "—";
    const mensaje = n.mensaje ?? "";

    card.innerHTML = `
      <div class="noti_head">
        <h3 class="noti_asunto" style="font-weight: 700;"">${asunto}</h3>
        <div class="noti_fecha">${fecha}</div>
      </div>
      <p class="noti_mensaje">${mensaje}</p>
    `;

    frag.appendChild(card);
  });

  cont.appendChild(frag);
}

async function init(){
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  const user = getUsuarioActivo() || usuarioActivo;

  setText("noti-msg", "Cargando...");

  try{
    const lista = await getNotificacionesPorUsuario(user.idUsuario);
    setText("noti-msg", "");
    renderNotificaciones(lista);

    // Marcar todas las notificaciones como leidas despues de mostrarlas
    if (lista && lista.length > 0) {
      try {
        await marcarTodasNotificacionesLeidas(user.idUsuario);
        console.log("Notificaciones marcadas como leidas");
      } catch (errMarca) {
        console.error("Error al marcar notificaciones como leidas:", errMarca);
        // No mostramos error al usuario, es una operacion secundaria
      }
    }

  } catch(err) {
    // Tratar 404 como lista vacia (usuario sin notificaciones)
    if (err.message.includes("404")) {
      setText("noti-msg", "");
      renderNotificaciones([]);
    } else {
      console.error(err);
      setText("noti-msg", err.message || "No se pudieron cargar las notificaciones.");
      renderNotificaciones([]);
    }
  }
}

init();