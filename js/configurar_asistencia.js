import { requireAuth, getUsuarioActivo, actualizarUsuario } from "./servicio.js";

function normalizarDia(nombreDia) {
  return nombreDia
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Front -> enum string del back
function aEnumDia(diaNormalizado) {
  const map = {
    lunes: "LUNES",
    martes: "MARTES",
    miercoles: "MIERCOLES",
    jueves: "JUEVES",
    viernes: "VIERNES",
  };
  return map[diaNormalizado];
}

// UsuarioAsistencia (DB) -> enum strings
function extraerDiasAsistenciaEnum(user) {
  // back: diasAsistencia: [{ id, dia: "MARTES" }, ...]
  if (Array.isArray(user.diasAsistencia)) {
    return user.diasAsistencia.map((d) => d.dia);
  }
  // fallback viejo: dias_asistencia: ["martes",...]
  if (Array.isArray(user.dias_asistencia)) {
    return user.dias_asistencia.map((d) => aEnumDia(normalizarDia(d))).filter(Boolean);
  }
  return [];
}

function obtenerParesDiaCheckbox() {
  const contenedores = document.querySelectorAll(".configurar_asistencia_dia");
  const pares = [];
  contenedores.forEach((contenedor) => {
    const etiquetaDia = contenedor.querySelector(".configurar_asistencia_dia_span");
    const checkbox = contenedor.querySelector(".configurar_asistencia_checkbox");
    if (!etiquetaDia || !checkbox) return;

    const textoDia = etiquetaDia.textContent.trim();
    const diaNormalizado = normalizarDia(textoDia);
    pares.push({ diaNormalizado, checkbox });
  });
  return pares;
}

function guardarUsuarioActivoActualizado(usuarioActualizado) {
  const clave = "usuarioActivo";
  const existeEnLocal = !!localStorage.getItem(clave);
  const destino = existeEnLocal ? localStorage : sessionStorage;
  destino.setItem(clave, JSON.stringify(usuarioActualizado));
}

async function init() {
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;

  const user = getUsuarioActivo() || usuarioActivo;

  // marcar checks segun lo que venga del back
  const diasEnumActuales = extraerDiasAsistenciaEnum(user);
  const diasNormalizados = diasEnumActuales.map((d) => normalizarDia(d));

  const pares = obtenerParesDiaCheckbox();
  pares.forEach(({ diaNormalizado, checkbox }) => {
    checkbox.checked = diasNormalizados.includes(diaNormalizado);
  });

  // Obtener referencias del modal
  const modal = document.getElementById("asistencia_modal");
  const modalTitulo = document.getElementById("asistencia_modal_titulo");
  const modalMensaje = document.getElementById("asistencia_modal_mensaje");
  const modalBtn = document.getElementById("asistencia_modal_btn");
  const modalBackdrop = document.querySelector(".asistencia_modal_backdrop");

  // Funciones del modal usando clases CSS
  function cerrarModal() {
    if (modal) {
      modal.classList.remove("show");
    }
  }

  function mostrarModal(titulo, mensaje, esExito) {
    if (!modal || !modalTitulo || !modalMensaje || !modalBtn) {
      console.error("Elementos del modal no encontrados");
      return;
    }

    // Actualizar contenido
    modalTitulo.textContent = titulo;
    modalMensaje.textContent = mensaje;

    // Aplicar estilos segun tipo
    if (esExito) {
      modalTitulo.className = "asistencia_modal_titulo asistencia_modal_titulo--exito";
      modalBtn.className = "asistencia_modal_btn asistencia_modal_btn--exito";
    } else {
      modalTitulo.className = "asistencia_modal_titulo asistencia_modal_titulo--error";
      modalBtn.className = "asistencia_modal_btn asistencia_modal_btn--error";
    }

    // Mostrar modal agregando clase show
    modal.classList.add("show");
  }

  function mostrarModalExito(mensaje) {
    mostrarModal("Exito", mensaje, true);
  }

  function mostrarModalError(mensaje) {
    mostrarModal("Error", mensaje, false);
  }

  // Configurar eventos del modal
  if (modalBtn) {
    modalBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cerrarModal();
    };
  }

  if (modalBackdrop) {
    modalBackdrop.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cerrarModal();
    };
  }

  // Boton guardar
  const botonGuardar = document.querySelector(".configurar_asistencia_boton");
  if (!botonGuardar) return;

  botonGuardar.addEventListener("click", async () => {
    botonGuardar.disabled = true;

    // recolectar dias seleccionados -> enum del back
    const diasAsistencia = obtenerParesDiaCheckbox()
      .filter(({ checkbox }) => checkbox.checked)
      .map(({ diaNormalizado }) => aEnumDia(diaNormalizado))
      .filter(Boolean);

    // armar DTO obligatorio para el endpoint
    const payload = {
      id: user.idUsuario,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      direccion: user.direccion,
      diasAsistencia
    };

    try {
      await actualizarUsuario(payload);

      // Como el back devuelve string, actualizamos localmente:
      const usuarioActualizado = {
        ...user,
        diasAsistencia: diasAsistencia.map((dia) => ({ id: null, dia }))
      };

      guardarUsuarioActivoActualizado(usuarioActualizado);
      
      // Mostrar modal de exito
      mostrarModalExito("Dias de asistencia guardados correctamente.");
      
    } catch (err) {
      console.error(err);
      
      // Mostrar modal de error
      mostrarModalError(err.message || "No se pudo guardar la asistencia.");
      
    } finally {
      botonGuardar.disabled = false;
    }
  });
}

init();