import { requireAdmin, getConfiguracion, actualizarHorarioLimite } from "./servicio.js";

const modal = document.getElementById("horario_limite_modal");
const openBtn = document.querySelector("#horario-limite");
const form = document.getElementById("horario_limite_form");
const inputHora = form?.elements["cutoff"];


// ── Abrir / cerrar modal ──────────────────────────────────────────────────────

function abrirModal() {
  modal.hidden = false;
  trapFocus();
}

function cerrarModal() {
  modal.hidden = true;
  document.activeElement?.blur();
}

document.addEventListener("click", (e) => {
  if (e.target === openBtn) abrirModal();
  if (e.target.hasAttribute("data-close")) cerrarModal();
});

document.addEventListener("keydown", (e) => {
  if (!modal.hidden && e.key === "Escape") cerrarModal();
});

// Accesibilidad: foco dentro del modal
function trapFocus() {
  const focusables = modal.querySelectorAll("button, [href], input, select");
  if (focusables.length) focusables[0].focus();
}

// ── Inicialización ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const admin = requireAdmin("./index.html");
  if (!admin) return;

  // Precargar el horario actual desde el backend
  try {
    const config = await getConfiguracion();
    if (inputHora && config?.horarioLimite) {
      inputHora.value = config.horarioLimite;
    }
  } catch (err) {
    console.error("No se pudo cargar la configuración:", err);
  }
});

// ── Guardar horario ───────────────────────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const time = inputHora?.value || "";
  const formatoValido = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (!formatoValido) {
    alert("Ingresá un horario válido (HH:MM, 00–23 : 00–59).");
    return;
  }

  try {
    await actualizarHorarioLimite(time);
    alert(`Horario límite actualizado a ${time}.`);
    cerrarModal();
  } catch (err) {
    alert("Error al guardar el horario: " + err.message);
  }
});