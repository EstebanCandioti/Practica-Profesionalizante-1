const $cal = document.getElementById("fer_cal");
const $mes = document.getElementById("fer_mes");
const $prev = document.getElementById("fer_prev");
const $next = document.getElementById("fer_next");
const $save = document.getElementById("fer_guardar");

// Estructura en memoria: { "2025-03": [ "2025-03-09", "2025-03-25" ], ... }
let feriados = JSON.parse(localStorage.getItem("feriados_cfg") || "{}");

// Arrancamos en hoy
let current = new Date();
current.setDate(1); // siempre al día 1 del mes

const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function yyyymm(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function yyyymmdd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function render() {
  // Título
  $mes.textContent = `${
    monthNames[current.getMonth()]
  } ${current.getFullYear()}`;

  // Borro días anteriores (dejo la fila de cabeceras)
  [...$cal.querySelectorAll(".feriados_dia")].forEach((n) => n.remove());

  // Cálculos de calendario (semana empieza Lunes)
  const year = current.getFullYear();
  const month = current.getMonth(); // 0..11

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0); // último día del mes

  // índice de columna lunes=0..domingo=6
  const colOf = (date) => (date.getDay() + 6) % 7;

  // días “vacíos” al inicio (del mes anterior)
  const leading = colOf(first);

  // número de celdas: 42 (6 filas x 7 cols) para estabilidad de layout
  const totalCells = 42;
  const startDate = new Date(first);
  startDate.setDate(first.getDate() - leading);

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const div = document.createElement("div");
    div.className = "feriados_dia";
    div.textContent = d.getDate();

    const inCurrentMonth = d.getMonth() === month;
    if (!inCurrentMonth) div.classList.add("feriados_dia--muted");

    // estado feriado
    const keyMonth = yyyymm(current);
    const keyDay = yyyymmdd(d);
    const isHoliday = (feriados[keyMonth] || []).includes(keyDay);
    if (isHoliday && inCurrentMonth) div.classList.add("feriados_dia--feriado");

    if (inCurrentMonth) {
      div.addEventListener("click", () => toggleHoliday(d));
    }

    $cal.appendChild(div);
  }
}

function toggleHoliday(date) {
  const keyMonth = yyyymm(current);
  const keyDay = yyyymmdd(date);
  feriados[keyMonth] = feriados[keyMonth] || [];
  const arr = feriados[keyMonth];
  const idx = arr.indexOf(keyDay);
  if (idx === -1) arr.push(keyDay);
  else arr.splice(idx, 1);
  render();
}

$prev.addEventListener("click", () => {
  current.setMonth(current.getMonth() - 1);
  render();
});
$next.addEventListener("click", () => {
  current.setMonth(current.getMonth() + 1);
  render();
});

$save.addEventListener("click", () => {
  localStorage.setItem("feriados_cfg", JSON.stringify(feriados));
  // opción: descarga del JSON
  const blob = new Blob([JSON.stringify(feriados, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "feriados.json";
  a.click();
  URL.revokeObjectURL(a.href);
  alert("Feriados guardados (y descargados como feriados.json).");
});



render();
