import { 
  requireAuth, 
  getUsuarioActivo, 
  getPedidosPorUsuario,
  getPorPedidoHistorial,
  mostrarModalError,
  inicializarModalConfirmacion
} from "./servicio.js";

// Mapeo de dias de la semana en espanol
const DIAS_SEMANA = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado"
};

// Formatear fecha de YYYY-MM-DD a formato legible: "lunes 25/06/2025"
function formatearFecha(fechaISO) {
  if (!fechaISO) return "Sin fecha";
  
  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const diaSemana = DIAS_SEMANA[fecha.getDay()];
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    
    return `${diaSemana} ${dia}/${mes}/${anio}`;
  } catch (error) {
    console.error("Error formateando fecha:", error);
    return fechaISO;
  }
}

// Obtener clase CSS segun el estado del pedido
function getClaseEstado(estado) {
  if (!estado) return "";
  
  const estadoNormalizado = estado.toLowerCase();
  
  if (estadoNormalizado.includes("confirmado")) return "estado-confirmado";
  if (estadoNormalizado.includes("pendiente")) return "estado-pendiente";
  if (estadoNormalizado.includes("cancelado")) return "estado-cancelado";
  
  return "";
}

// Crear el HTML de una carta de pedido
function crearCartaPedido(pedido, pedidosDia) {
  const carta = document.createElement("div");
  carta.className = "historial-pedidos-container-cartas";
  
  // Obtener fecha del pedido
  const fecha = pedido.fechaPedido || pedido.fecha_pedido || "";
  const fechaFormateada = formatearFecha(fecha);
  
  // Obtener nombres de platos
  let nombresPlatos = "Sin platos";
  
  if (pedidosDia && Array.isArray(pedidosDia) && pedidosDia.length > 0) {
    // Filtrar solo los que tienen nombre
    const platosConNombre = pedidosDia.filter(pd => {
      const nombre = pd.nombrePlato || pd.nombre_plato || pd.plato?.nombre;
      return nombre && nombre.trim() !== "";
    });
    
    if (platosConNombre.length > 0) {
      nombresPlatos = platosConNombre
        .map(pd => {
          const nombre = pd.nombrePlato || pd.nombre_plato || pd.plato?.nombre || "Plato desconocido";
          // MEJORA FUTURA: Si el DTO incluye 'activo', podemos agregar (cancelado) o tachar
          // const activo = pd.activo !== undefined ? pd.activo : true;
          // return activo ? nombre : `${nombre} (cancelado)`;
          return nombre;
        })
        .join(", ");
    }
  }
  
  // Obtener estado
  const estado = pedido.estado || "Pendiente";
  const claseEstado = getClaseEstado(estado);
  
  carta.innerHTML = `
    <p class="historial-pedidos-container-cartas-letras">${fechaFormateada}</p>
    <p class="historial-pedidos-container-cartas-letras">${nombresPlatos}</p>
    <p class="historial-pedidos-container-cartas-estado ${claseEstado}">${estado}</p>
  `;
  
  return carta;
}

// Renderizar la lista de pedidos
function renderizarHistorial(pedidos, detallesPedidos) {
  const contenedor = document.getElementById("lista-historial");
  if (!contenedor) return;
  
  // Limpiar contenido
  contenedor.innerHTML = "";
  
  // Si no hay pedidos
  if (!pedidos || pedidos.length === 0) {
    contenedor.innerHTML = '<p class="mensaje-vacio">No tenes pedidos realizados aun</p>';
    return;
  }
  
  // Ordenar pedidos por fecha mas reciente primero
  const pedidosOrdenados = [...pedidos].sort((a, b) => {
    const fechaA = a.fechaPedido || a.fecha_pedido || "";
    const fechaB = b.fechaPedido || b.fecha_pedido || "";
    return fechaB.localeCompare(fechaA);
  });
  
  // Crear y agregar cada carta
  pedidosOrdenados.forEach(pedido => {
    const idPedido = pedido.idPedido || pedido.id_pedido || pedido.id;
    const pedidosDia = detallesPedidos[idPedido] || [];
    const carta = crearCartaPedido(pedido, pedidosDia);
    contenedor.appendChild(carta);
  });
}

// Cargar historial completo
async function cargarHistorial() {
  const usuarioActivo = requireAuth("./login.html");
  if (!usuarioActivo) return;
  
  const user = getUsuarioActivo() || usuarioActivo;
  const contenedor = document.getElementById("lista-historial");
  
  try {
    // 1) Obtener lista de pedidos del usuario
    let pedidos;
    try {
      pedidos = await getPedidosPorUsuario(user.idUsuario);
    } catch (error) {
      if (error.message && error.message.includes("404")) {
        pedidos = [];
      } else {
        throw error;
      }
    }
    
    // Si no hay pedidos, mostrar mensaje y salir
    if (!pedidos || pedidos.length === 0) {
      if (contenedor) {
        contenedor.innerHTML = '<p class="mensaje-vacio">No tenes pedidos realizados aun</p>';
      }
      return;
    }
    
    // 2) Para cada pedido, obtener sus PedidoDia (detalles de platos) - INCLUYE INACTIVOS
    const detallesPedidos = {};
    let pedidosSinPlatos = 0;
    let pedidosConPlatos = 0;
    
    await Promise.all(
      pedidos.map(async (pedido) => {
        const idPedido = pedido.idPedido || pedido.id_pedido || pedido.id;
        
        try {
          // CAMBIADO: usar getPorPedidoHistorial en vez de getPorPedido
          const pedidosDia = await getPorPedidoHistorial(idPedido);
          
          // Verificar que sea un array
          if (Array.isArray(pedidosDia)) {
            detallesPedidos[idPedido] = pedidosDia;
            if (pedidosDia.length > 0) {
              pedidosConPlatos++;
            } else {
              pedidosSinPlatos++;
            }
          } else if (pedidosDia && typeof pedidosDia === 'object') {
            // Si devuelve un objeto, intentar convertirlo a array
            detallesPedidos[idPedido] = [pedidosDia];
            pedidosConPlatos++;
          } else {
            detallesPedidos[idPedido] = [];
            pedidosSinPlatos++;
          }
        } catch (error) {
          // Si es 404, el pedido no tiene detalles
          if (error.message && (error.message.includes("404") || error.message.includes("No se encontraron"))) {
            detallesPedidos[idPedido] = [];
            pedidosSinPlatos++;
          } else {
            // Solo loguear errores que NO sean 404
            console.error(`Error inesperado cargando detalles del pedido ${idPedido}:`, error);
            detallesPedidos[idPedido] = [];
            pedidosSinPlatos++;
          }
        }
      })
    );
    
    // 3) Renderizar historial
    renderizarHistorial(pedidos, detallesPedidos);
    
  } catch (error) {
    console.log("Error cargando historial:", error)
    mostrarModalError("Error", "Error cargando historial:", error );
    if (contenedor) {
      contenedor.innerHTML = `<p class="mensaje-error">Error al cargar el historial: ${error.message || "Error desconocido"}</p>`;
    }
  }
}

// Inicializar al cargar la pagina
cargarHistorial();