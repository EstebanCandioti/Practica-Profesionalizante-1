import { requireAuth, getUsuarios, getUsuarioActivo } from "./servicio.js";

function normalizarDia(nombreDia) {
  return nombreDia
    .toLowerCase()
    .normalize("NFD") // separa tildes
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes (miércoles -> miercoles)
}

function obtenerParesDiaCheckbox() {
  const contenedores = document.querySelectorAll(".configurar_asistencia_dia");
  const pares = [];
  contenedores.forEach((contenedor) => {
    const etiquetaDia = contenedor.querySelector(
      ".configurar_asistencia_dia_span"
    );
    const checkbox = contenedor.querySelector(
      ".configurar_asistencia_checkbox"
    );
    if (!etiquetaDia || !checkbox) return;

    // El texto visible del día (por ej. "Miércoles"), normalizado
    const textoDia = etiquetaDia.textContent.trim();
    const diaNormalizado = normalizarDia(textoDia);
    pares.push({ dia: diaNormalizado, checkbox });
  });
  return pares;
}

/** Guarda el usuario en el mismo storage donde estaba (local o session) */
function guardarUsuarioActivoActualizado(usuarioActualizado) {
  const clave = "usuarioActivo";
  const existeEnLocal = !!localStorage.getItem(clave);
  const destino = existeEnLocal ? localStorage : sessionStorage;
  destino.setItem(clave, JSON.stringify(usuarioActualizado));
}

async function init() {
  // Proteger la página
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  const usuariosRegistrados = await getUsuarios();
  const datosUsuario =
    usuariosRegistrados.find((u) => u.id === usuarioActivo.id) || usuarioActivo;

  // Marcar checkboxes según los días que ya tiene el usuario
  const diasUsuario = (datosUsuario.dias_asistencia || []).map(normalizarDia);
  const pares = obtenerParesDiaCheckbox();
  pares.forEach(({ dia, checkbox }) => {
    checkbox.checked = diasUsuario.includes(dia);
  });

  // Guardar cambios al presionar el botón
  const botonGuardar = document.querySelector(".configurar_asistencia_boton");
  const mensajeContenedor = document.createElement("p"); // mensaje simple de confirmación
  mensajeContenedor.style.marginTop = "8px";
  botonGuardar.insertAdjacentElement("afterend", mensajeContenedor);

  botonGuardar.addEventListener("click", () => {
    // Recolectar los días actualmente marcados
    const diasSeleccionados = obtenerParesDiaCheckbox()
      .filter(({ checkbox }) => checkbox.checked)
      .map(({ dia }) => dia); // ya normalizados: "lunes", "martes", ...

    // Actualizar el objeto del usuario y persistir en la sesión
    const usuarioActualizado = {
      ...datosUsuario,
      dias_asistencia: diasSeleccionados,
    };
    guardarUsuarioActivoActualizado(usuarioActualizado);

    // Feedback visual
    mensajeContenedor.textContent =
      "Días de asistencia guardados correctamente.";
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