import {
  requireAdmin,
  getUsuarioActivo,
  getMenuDiaPorFecha,
  crearMenuDia,
  actualizarMenuDia,
  cambiarEstadoMenuDia,
  getPlatos,
  agregarPlatoAlMenu,
  getMenuPlatosPorFecha,
  eliminarPlatoDelMenu,
  getConfiguracion,
} from "./servicio.js";

console.log("adm-menu-dia cargo");
let menuDiaActual = null;
let configSistema = null;
// ============================================
// FUNCIONES HELPER PARA ALERT BANNER
// ============================================

function mostrarAlertBanner(mensaje, tipo) {
  const banner = document.getElementById("alert-banner");
  const mensajeEl = document.getElementById("alert-mensaje");

  if (!banner || !mensajeEl) {
    console.error("Elementos del alert banner no encontrados");
    return;
  }

  mensajeEl.textContent = mensaje;
  banner.className = `alert-banner alert-banner--${tipo}`;
  banner.style.display = "block";

  // Auto-ocultar despues de 5 segundos (opcional)
  setTimeout(() => {
    ocultarAlertBanner();
  }, 5000);
}

function ocultarAlertBanner() {
  const banner = document.getElementById("alert-banner");
  if (banner) {
    banner.style.display = "none";
  }
}

/* =======================
   Utilidades generales
   ======================= */

function mostrarMensaje(texto) {
  const elementoMensaje = document.getElementById("msg");
  if (elementoMensaje) elementoMensaje.textContent = texto ?? "";
}

function obtenerFechaHoyISO() {
  const fechaActual = new Date();
  const anio = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaActual.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function mostrarBloque(idBloque, mostrar) {
  const bloque = document.getElementById(idBloque);
  if (bloque) bloque.style.display = mostrar ? "block" : "none";
}

function setearValorInput(idInput, valor) {
  const input = document.getElementById(idInput);
  if (input) input.value = valor ?? "";
}

function obtenerValorInput(idInput) {
  const input = document.getElementById(idInput);
  return input ? input.value : "";
}

function deshabilitarElemento(idElemento, deshabilitar) {
  const elemento = document.getElementById(idElemento);
  if (elemento) elemento.disabled = !!deshabilitar;
}
async function refrescarListaPlatosDelMenu() {
  const contenedorLista = document.getElementById("lista-platos");
  if (!contenedorLista) return;

  const fechaSeleccionada = obtenerValorInput("fecha");
  console.log("refrescando platos para fecha:", fechaSeleccionada);

  contenedorLista.innerHTML = "Cargando platos del menu...";

  try {
    const menuPlatos = await getMenuPlatosPorFecha(fechaSeleccionada);

    if (!Array.isArray(menuPlatos) || menuPlatos.length === 0) {
      contenedorLista.innerHTML = "<p>No hay platos cargados en este menu.</p>";
      return;
    }

    contenedorLista.innerHTML = "";

    menuPlatos.forEach((menuPlato) => {
      const nombrePlato = menuPlato?.plato?.nombre ?? "(sin nombre)";
      const stockDisponible = menuPlato?.stockDisponible ?? 0;
      const idMenuPlato = menuPlato.idMenuPlato;

      const fila = document.createElement("div");
      fila.style.display = "flex";
      fila.style.justifyContent = "space-between";
      fila.style.alignItems = "center";
      fila.style.padding = "8px 0";
      fila.style.borderBottom = "1px solid rgba(0,0,0,.08)";

      const info = document.createElement("div");
      info.innerHTML = `<b>${nombrePlato}</b> — Stock: ${stockDisponible}`;

      const botonEliminar = document.createElement("button");
      botonEliminar.textContent = "✕";
      botonEliminar.title = "Eliminar plato del menu";
      botonEliminar.style.border = "none";
      botonEliminar.style.background = "transparent";
      botonEliminar.style.color = "red";
      botonEliminar.style.fontSize = "16px";
      botonEliminar.style.cursor = "pointer";

      botonEliminar.addEventListener("click", async () => {
        const confirmar = confirm(`¿Eliminar "${nombrePlato}" del menu?`);
        if (!confirmar) return;

        try {
          await eliminarPlatoDelMenu(idMenuPlato);
          mostrarAlertBanner("Plato eliminado correctamente.");
          await refrescarListaPlatosDelMenu();
        } catch (error) {
          console.error(error);
          mostrarAlertBanner("No se pudo eliminar el plato del menu.");
        }
      });

      fila.appendChild(info);
      fila.appendChild(botonEliminar);
      contenedorLista.appendChild(fila);
    });
  } catch (error) {
    console.error(error);
    contenedorLista.innerHTML =
      "<p>No se pudieron cargar los platos del menu.</p>";
  }
}

/* =======================
   Lógica principal
   ======================= */

async function buscarMenuPorFecha() {
  const fechaSeleccionada = obtenerValorInput("fecha");

  if (!fechaSeleccionada) {
    mostrarAlertBanner("Debe seleccionar una fecha.");
    return;
  }

  // Validar si es feriado
  if (
    configSistema &&
    configSistema.feriados &&
    configSistema.feriados.includes(fechaSeleccionada)
  ) {
    mostrarMensaje(
      `⚠️ La fecha ${fechaSeleccionada} es feriado. No se puede crear menú para días feriados.`,
    );
    mostrarBloque("bloque-menu", false);
    mostrarBloque("bloque-platos", false);
    return;
  }

  mostrarAlertBanner("Buscando menu...");
  mostrarBloque("bloque-menu", false);
  mostrarBloque("bloque-platos", false);
  menuDiaActual = null;

  try {
    const menusEncontrados = await getMenuDiaPorFecha(fechaSeleccionada);

    // El backend devuelve lista
    menuDiaActual = Array.isArray(menusEncontrados)
      ? menusEncontrados[0]
      : menusEncontrados;

    setearValorInput("descripcion", menuDiaActual.descripcion);
    setearValorInput("stockTotal", menuDiaActual.stock_total);
    setearValorInput("publicado", String(!!menuDiaActual.publicado));

    mostrarAlertBanner("Menu encontrado.");
    mostrarBloque("bloque-menu", true);
    mostrarBloque("bloque-platos", true);
    await refrescarListaPlatosDelMenu();
  } catch (error) {
    // 404: no existe menú
    menuDiaActual = null;

    mostrarAlertBanner(
      "No existe un menu para esta fecha. Complete los datos y guarde para crearlo.",
    );
    mostrarBloque("bloque-menu", true);
    mostrarBloque("bloque-platos", false);

    // Defaults
    setearValorInput("descripcion", `Menu ${fechaSeleccionada}`);
    setearValorInput("stockTotal", 0);
    setearValorInput("publicado", "false");
    await refrescarListaPlatosDelMenu();
  }
}

async function guardarMenu() {
  const usuarioActivo = getUsuarioActivo();

  const fecha = obtenerValorInput("fecha");
  const descripcion = obtenerValorInput("descripcion").trim();
  const stockTotal = Number(obtenerValorInput("stockTotal") || 0);
  const publicadoSeleccionado = obtenerValorInput("publicado") === "true";

  if (!fecha) {
    mostrarAlertBanner("Debe seleccionar una fecha.");
    return;
  }

  // Validar si es feriado antes de guardar
  if (
    configSistema &&
    configSistema.feriados &&
    configSistema.feriados.includes(fecha)
  ) {
    mostrarAlertBanner("⚠️ No se pueden crear menús para días feriados.");
    return;
  }

  if (!descripcion) {
    mostrarAlertBanner("La descripción no puede estar vacía.");
    return;
  }

  deshabilitarElemento("btn-guardar-menu", true);
  mostrarAlertBanner(
    menuDiaActual ? "Actualizando menú..." : "Creando menú...",
  );

  try {
    if (!menuDiaActual) {
      // Crear
      await crearMenuDia({
        fecha,
        descripcion,
        publicado: publicadoSeleccionado,
        id_usuario: usuarioActivo.idUsuario,
        stock_total: stockTotal,
      });
    } else {
      // Actualizar (tu DTO no incluye publicado)
      await actualizarMenuDia({
        id: menuDiaActual.idMenuDia,
        fecha,
        descripcion,
        stock_total: stockTotal,
      });

      // Si el usuario cambió el select de publicado, ese cambio NO se guarda con PUT.
      // Debe hacerse con PATCH (toggle). Lo manejamos en el evento change del select.
    }

    mostrarAlertBanner("Guardado correctamente.");
    await buscarMenuPorFecha();
  } catch (error) {
    console.error(error);
    mostrarAlertBanner(error.message || "No se pudo guardar el menú.");
  } finally {
    deshabilitarElemento("btn-guardar-menu", false);
  }
}

async function cambiarEstadoPublicado() {
  if (!menuDiaActual) {
    // no se puede publicar algo que no existe
    mostrarAlertBanner("Primero debe crear el menú.");
    setearValorInput("publicado", "false");
    return;
  }

  deshabilitarElemento("publicado", true);
  mostrarAlertBanner("Cambiando estado de publicación...");

  try {
    await cambiarEstadoMenuDia(menuDiaActual.idMenuDia);
    await buscarMenuPorFecha();
    mostrarAlertBanner("Estado actualizado.");
  } catch (error) {
    console.error(error);
    mostrarAlertBanner("No se pudo cambiar el estado del menú.");
    // refrescar para volver al valor real
    await buscarMenuPorFecha();
  } finally {
    deshabilitarElemento("publicado", false);
  }
}

let platosDisponibles = [];

async function cargarSelectPlatos() {
  const selectPlato = document.getElementById("select-plato");
  if (!selectPlato) return;

  selectPlato.innerHTML = `<option value="">Cargando platos...</option>`;

  try {
    platosDisponibles = await getPlatos();

    if (!Array.isArray(platosDisponibles) || platosDisponibles.length === 0) {
      selectPlato.innerHTML = `<option value="">No hay platos cargados</option>`;
      return;
    }

    selectPlato.innerHTML = `<option value="">Seleccione un plato...</option>`;

    platosDisponibles.forEach((plato) => {
      const option = document.createElement("option");
      option.value = plato.id_plato; // ajusta si tu backend usa otro nombre
      option.textContent = plato.nombre; // ajusta si tu backend usa otro nombre
      selectPlato.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    selectPlato.innerHTML = `<option value="">Error cargando platos</option>`;
  }
}

/* =======================
   Inicialización
   ======================= */

function inicializarEventos() {
  const inputFecha = document.getElementById("fecha");
  const botonBuscar = document.getElementById("btn-buscar");
  const botonGuardarMenu = document.getElementById("btn-guardar-menu");
  const selectorPublicado = document.getElementById("publicado");

  if (inputFecha && !inputFecha.value) {
    inputFecha.value = obtenerFechaHoyISO();
  }

  // Validar feriados cuando cambia la fecha
  inputFecha?.addEventListener("change", () => {
    const fechaSeleccionada = inputFecha.value;

    if (
      configSistema &&
      configSistema.feriados &&
      configSistema.feriados.includes(fechaSeleccionada)
    ) {
      mostrarMensaje(
        `⚠️ La fecha ${fechaSeleccionada} es feriado. No se puede crear menú para días feriados.`,
      );

      // Deshabilitar botón de guardar
      const btnGuardar = document.getElementById("btn-guardar-menu");
      if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = "0.5";
        btnGuardar.title = "No se pueden crear menús en días feriados";
      }
    } else {
      // Re-habilitar botón si no es feriado
      const btnGuardar = document.getElementById("btn-guardar-menu");
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = "1";
        btnGuardar.title = "";
      }
      mostrarMensaje(""); // Limpiar mensaje
    }
  });

  botonBuscar?.addEventListener("click", buscarMenuPorFecha);
  botonGuardarMenu?.addEventListener("click", guardarMenu);
  selectorPublicado?.addEventListener("change", cambiarEstadoPublicado);

  const botonAgregarPlato = document.getElementById("btn-agregar-plato");

  botonAgregarPlato?.addEventListener("click", async () => {
    if (!menuDiaActual) {
      mostrarAlertBanner("Primero debe crear/seleccionar un menu.");
      return;
    }

    const idPlatoSeleccionado = Number(obtenerValorInput("select-plato"));
    const stockIngresado = Number(obtenerValorInput("stockPlato"));

    if (!idPlatoSeleccionado) {
      mostrarAlertBanner("Debe seleccionar un plato.");
      return;
    }

    if (!Number.isFinite(stockIngresado) || stockIngresado < 0) {
      mostrarAlertBanner("El stock debe ser un número válido (0 o mayor).");
      return;
    }

    deshabilitarElemento("btn-agregar-plato", true);
    mostrarAlertBanner("Agregando plato al menu...");

    try {
      await agregarPlatoAlMenu({
        idMenuDia: menuDiaActual.idMenuDia,
        idPlato: idPlatoSeleccionado,
        stockInicial: stockIngresado,
      });

      setearValorInput("stockPlato", "");
      mostrarAlertBanner("Plato agregado correctamente.");
      await refrescarListaPlatosDelMenu();
    } catch (error) {
      console.error(error);
      mostrarAlertBanner(
        error.message || "No se pudo agregar el plato al menu.",
      );
    } finally {
      deshabilitarElemento("btn-agregar-plato", false);
    }
  });
}

async function init() {
  const usuarioAdmin = requireAdmin("./index.html");
  if (!usuarioAdmin) return;

  // Cargar configuración del sistema
  try {
    configSistema = await getConfiguracion();
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    mostrarMensaje(
      "Advertencia: No se pudo cargar la configuración de feriados.",
    );
  }

  inicializarEventos();
  await cargarSelectPlatos();
  await buscarMenuPorFecha();
  console.log(document.getElementById("fecha").value);
}

init();
