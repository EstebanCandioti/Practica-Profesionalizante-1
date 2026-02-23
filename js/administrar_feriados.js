import { requireAdmin, getConfiguracion, actualizarFeriados, mostrarModalError, mostrarModalExito, inicializarModalConfirmacion } from "./servicio.js";

document.addEventListener("DOMContentLoaded", async () => {
  const admin = requireAdmin("./login.html");
  if (!admin) return;

  const calendarioDiv = document.getElementById("calendar");
  const botonGuardar = document.getElementById("feriados-guardar");

  // ── Cargar feriados actuales desde el backend ─────────────────────────────

  let feriadosOriginales = new Set();

  try {
    const config = await getConfiguracion();
    // El backend devuelve feriados como array de strings "YYYY-MM-DD"
    if (Array.isArray(config?.feriados)) {
      config.feriados.forEach((f) => feriadosOriginales.add(f));
    }
  } catch (err) {
    console.error("No se pudieron cargar los feriados:", err);
    alert("Error al cargar la configuración. Intentá recargar la página.");
    return;
  }

  // Copia mutable que refleja el estado actual del calendario
  const feriadosActuales = new Set(feriadosOriginales);

  // ── Inicializar FullCalendar ──────────────────────────────────────────────

  const eventos = Array.from(feriadosActuales).map((fecha) => ({
    title: "Feriado",
    start: fecha,
    color: "red",
  }));

  const calendar = new window.FullCalendar.Calendar(calendarioDiv, {
    initialView: "dayGridMonth",
    locale: "es",
    selectable: true,
    height: "auto",
    events: eventos,

    // Click en una fecha: toggle feriado
    dateClick: (info) => {
      const fecha = info.dateStr;

      if (feriadosActuales.has(fecha)) {
        // Quitar feriado visualmente
        feriadosActuales.delete(fecha);
        calendar.getEvents().forEach((evento) => {
          if (evento.startStr === fecha) evento.remove();
        });
      } else {
        // Agregar feriado visualmente
        feriadosActuales.add(fecha);
        calendar.addEvent({ title: "Feriado", start: fecha, color: "red" });
      }
    },
  });

  calendar.render();

  // ── Guardar cambios ───────────────────────────────────────────────────────

  botonGuardar.addEventListener("click", async () => {
    const listaFinal = Array.from(feriadosActuales).sort();

    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando...";

    try {
      await actualizarFeriados(listaFinal);

      // Actualizar la referencia original con el estado guardado
      feriadosOriginales = new Set(feriadosActuales);

      mostrarModalExito("Exito","Feriados guardados correctamente.");
    } catch (err) {
      mostrarModalError("Error","Error al guardar los feriados: " + err.message);
    } finally {
      botonGuardar.disabled = false;
      botonGuardar.textContent = "Guardar cambios";
    }
  });

  inicializarModalConfirmacion();
});