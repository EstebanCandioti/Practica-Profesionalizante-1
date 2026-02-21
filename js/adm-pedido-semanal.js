import {
  requireAdmin,
  getUsuarioActivo,
  getPedidosSemana,          // <-- tu funciÃ³n actual que lista pedidos semanales
  confirmarSemanaPedidos,    // <-- la nueva
} from "./servicio.js";

let pedidosSemanaActual = [];

function obtenerValorInput(idInput) {
  const input = document.getElementById(idInput);
  return input ? input.value : "";
}

function setTexto(idElemento, texto) {
  const el = document.getElementById(idElemento);
  if (el) el.textContent = texto ?? "";
}

function hayPendientes(pedidos) {
  return (pedidos || []).some(p => String(p.estado).toLowerCase() === "pendiente");
}

function renderPedidosSemana(pedidos) {
  const contenedor = document.getElementById("contenedor");
  if (!contenedor) return;

  if (!pedidos || pedidos.length === 0) {
    contenedor.innerHTML = `<p style="padding:12px;color:#666;">No hay pedidos para mostrar.</p>`;
    return;
  }

  // Agrupar por día
  const porDia = {};
  pedidos.forEach(p => {
    const fecha = p.fechaEntrega || p.fecha_entrega || "Sin fecha";
    if (!porDia[fecha]) porDia[fecha] = [];
    porDia[fecha].push(p);
  });

  let html = "";
  for (const [fecha, lista] of Object.entries(porDia)) {
    html += `<div style="margin-bottom:20px; padding:12px; background:#f8f8f8; border-radius:8px;">`;
    html += `<h3 style="margin:0 0 8px 0;">${fecha}</h3>`;
    
    lista.forEach(p => {
      const usuario = p.nombreUsuario || p.nombre_usuario || "Usuario desconocido";
      const plato = p.nombrePlato || p.nombre_plato || "Plato desconocido";
      const estado = (p.estado || "").toLowerCase();
      const colorEstado = estado === "confirmado" ? "#28a745" : "#ffc107";
      
      html += `
        <div style="padding:8px; margin:4px 0; background:white; border-left:3px solid ${colorEstado}; border-radius:4px;">
          <strong>${usuario}</strong> — ${plato} 
          <span style="color:${colorEstado}; font-weight:600; margin-left:10px;">[${estado}]</span>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  contenedor.innerHTML = html;
}

async function cargarPedidosSemana() {
  const fechaReferencia = obtenerValorInput("fechaReferencia");
  const offset = Number(obtenerValorInput("selectorSemana") || 0);

  setTexto("msg", "Cargando pedidos...");
  pedidosSemanaActual = [];

  try {
    pedidosSemanaActual = await getPedidosSemana(fechaReferencia, offset);

    renderPedidosSemana(pedidosSemanaActual);

    setTexto("cantidadPedidos", `Pedidos cargados: ${pedidosSemanaActual.length}`);

    const botonConfirmar = document.getElementById("btn-confirmar-semana");
    if (botonConfirmar) botonConfirmar.disabled = !hayPendientes(pedidosSemanaActual);

    setTexto("msg", hayPendientes(pedidosSemanaActual)
      ? "Hay pedidos pendientes."
      : "No hay pedidos pendientes para confirmar."
    );

  } catch (error) {
    console.error(error);
    setTexto("cantidadPedidos", "Pedidos cargados: 0");
    setTexto("msg", error?.message || "No se pudieron cargar los pedidos.");
    renderPedidosSemana([]); // limpiar UI si querÃ©s
  }
}

async function confirmarSemana() {
  const usuarioActivo = getUsuarioActivo();
  const fechaReferencia = obtenerValorInput("fechaReferencia");

  if (!usuarioActivo?.idUsuario) {
    alert("No se encontrÃ³ el usuario activo.");
    return;
  }
  if (!fechaReferencia) {
    alert("Seleccione una fecha de referencia.");
    return;
  }
  if (!hayPendientes(pedidosSemanaActual)) {
    alert("No hay pedidos pendientes para confirmar.");
    return;
  }

  const confirmar = confirm("Esto confirmarÃ¡ TODOS los pedidos de la semana seleccionada. Â¿Continuar?");
  if (!confirmar) return;

  const botonConfirmar = document.getElementById("btn-confirmar-semana");
  if (botonConfirmar) botonConfirmar.disabled = true;

  setTexto("msg", "Confirmando semana...");

try {
  const offset = Number(obtenerValorInput("selectorSemana") || 0);

  await confirmarSemanaPedidos(fechaReferencia, offset);

  setTexto("msg", "Semana confirmada correctamente.");
  await cargarPedidosSemana(); // refresca estados en pantalla
} catch (error) {
  console.error(error);
  alert(error?.message || "No se pudo confirmar la semana.");
  setTexto("msg", "No se pudo confirmar la semana.");
} finally {
  if (botonConfirmar) botonConfirmar.disabled = !hayPendientes(pedidosSemanaActual);
}
}

document.addEventListener("DOMContentLoaded", () => {
  const usuarioAdmin = requireAdmin("./index.html");
  if (!usuarioAdmin) return;

  document.getElementById("btn-cargar")?.addEventListener("click", cargarPedidosSemana);
  // Inicializar fecha de referencia con hoy
  const inputFecha = document.getElementById("fechaReferencia");
  if (inputFecha && !inputFecha.value) {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    inputFecha.value = `${año}-${mes}-${dia}`;
  }
  document.getElementById("btn-confirmar-semana")?.addEventListener("click", confirmarSemana);

  cargarPedidosSemana(); // auto-load
});