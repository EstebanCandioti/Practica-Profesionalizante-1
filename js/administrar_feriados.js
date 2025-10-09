import { getConfig, requireAdmin } from "./servicio.js";

document.addEventListener("DOMContentLoaded", async () => {
  const admin = requireAdmin("./index.html");
  if (!admin) return;

  const calendarioDiv = document.getElementById("calendar");
  const botonGuardar = document.getElementById("feriados-guardar");

  const configuracion = await getConfig();
  const feriadosJson = configuracion.feriados;

  const feriados = new Set();
  for (const mes in feriadosJson) {
    feriadosJson[mes].forEach((fecha) => feriados.add(fecha));
  }

  const feriadosActualizados = new Set(feriados);
  console.log(feriadosActualizados);

  const eventos = Array.from(feriadosActualizados).map((fecha) => ({
    title: "Feriado",
    start: fecha,
    color: "red",
  }));

  const calendar = new window.FullCalendar.Calendar(calendarioDiv, {
    initialView: "dayGridMonth",
    locale: "es",
    selectable: true,
    height: "auto",
    color:"white",
    events: eventos,
    //Cuando se hace click en una fecha
    dateClick: (info) => {
      const fecha = info.dateStr;

      //Si ya esta marcado como feriado lo borra
      if (feriadosActualizados.has(fecha)) {
        feriadosActualizados.delete(fecha);
        //Lo remueve visual
        calendar.getEvents().forEach((evento) => {
          if (evento.startStr === fecha) {
            evento.remove();
          }
        });
      } else {
        feriadosActualizados.add(fecha);
        calendar.addEvent({
          title: "Feriado",
          start: fecha,
          color: "red",
        });
      }
    },
  });

  calendar.render();

  botonGuardar.addEventListener("click", () => {
    const nuevos = Array.from(feriadosActualizados).filter(
      (f) => !feriados.has(f)
    );
    const eliminados = Array.from(feriados).filter(
      (f) => !feriadosActualizados.has(f)
    );

    // Reorganizar los feriados finales por mes (para mostrar como en config.json)
    const feriadosPorMes = {};
    for (const fecha of feriadosActualizados) {
      const mes = fecha.slice(0, 7); // ej. "2025-10"
      if (!feriadosPorMes[mes]) feriadosPorMes[mes] = [];
      feriadosPorMes[mes].push(fecha);
    }

    console.log("Nuevos feriados:", nuevos);
    console.log("Feriados eliminados:", eliminados);
    console.log("Estado final:", feriadosPorMes);
    alert("Cambios listos (ver consola).");
  });
});
