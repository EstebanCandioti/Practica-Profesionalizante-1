import { requireAuth, getConfig } from "./servicio.js";

document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requireAuth("./login.html");
  if (!usuario) return;

  const config = await getConfig();
  const form = document.getElementById('horario_limite_form');
  const inputHora = form?.elements['cutoff'];

  if (inputHora && config?.horario_limite_pedidos) {
    inputHora.value = config.horario_limite_pedidos; // precarga desde config.json
  }
});


const modal = document.getElementById("horario_limite_modal");
const openBtn = document.querySelector("#horario-limite");
const form = document.getElementById("horario_limite_form");

function open() {
  modal.hidden = false;
  trapFocus();
}
function close() {
  modal.hidden = true;
  document.activeElement.blur();
}

// e indica el evento que se esta recibiendo al hacer click o tocar una tecla
document.addEventListener("click", (e) => {
  if (e.target === openBtn) open();
  if (e.target.hasAttribute("data-close")) close();
});
document.addEventListener("keydown", (e) => {
  if (!modal.hidden && e.key === "Escape") close();
});

// Validación: exigir HH:MM con rangos válidos (00–23 : 00–59)
form.addEventListener('submit', (e) => {
  const time = form.elements['cutoff'].value || '';
  const formatoValido = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (!formatoValido) {
    e.preventDefault();
    alert('Ingresá un horario válido (HH:MM, 00–23 : 00–59).');
    return;
  }

  // Sin persistencia (solo UI por ahora)
  e.preventDefault();
  alert(`Horario límite actualizado a ${time}.`);

  const modal = document.getElementById('horario_limite_modal');
  modal.hidden = true;
  document.activeElement?.blur();
});


// Accesibilidad básica: foco dentro del modal
function trapFocus() {
  const focusables = modal.querySelectorAll("button, [href], input, select");
  if (focusables.length) {
    focusables[0].focus();
  }
}

