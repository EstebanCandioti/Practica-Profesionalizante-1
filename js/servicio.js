// service.js
// Servicio para comunicar el front con el back Spring Boot

console.log("service.js cargado");

const API_BASE_URL = "http://localhost:8080";

// ------------------------
// Helper generico de fetch
// ------------------------
async function apiFetch(
  path,
  { method = "GET", headers = {}, body = null } = {},
) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // Agregar token JWT si existe
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body !== null && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(API_BASE_URL + path, options);

  const responseText = await response.text().catch(() => "");

  // Manejar 401 (token expirado)
  if (response.status === 401) {
    console.warn("Token expirado o invalido. Redirigiendo a login...");
    localStorage.removeItem("authToken");
    localStorage.removeItem("usuarioActivo");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("usuarioActivo");
    window.location.href = "/login.html";
    return;
  }

  if (!response.ok) {
    console.error("Error en apiFetch", {
      url: API_BASE_URL + path,
      status: response.status,
      body: responseText,
    });
    throw new Error(
      responseText || `Error ${response.status} al llamar a ${path}`,
    );
  }

  if (!responseText) return null;

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(responseText);
  }
  return responseText;
}

// ------------------------
// Helper para endpoints que pueden devolver 404
// ------------------------
async function apiFetchOptional(path, options = {}) {
  const opts = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  // Agregar token JWT si existe
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (token) {
    opts.headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body !== null && options.body !== undefined) {
    opts.body = JSON.stringify(options.body);
  }

  const response = await fetch(API_BASE_URL + path, opts);

  // Si es 404, devolver array vacío (sin datos, no es error)
  if (response.status === 404) {
    console.log(`Info: ${path} devolvió 404 (sin datos para este usuario)`);
    return [];
  }

  // Manejar 401 (token expirado)
  if (response.status === 401) {
    console.warn("Token expirado o invalido. Redirigiendo a login...");
    localStorage.removeItem("authToken");
    localStorage.removeItem("usuarioActivo");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("usuarioActivo");
    window.location.href = "/login.html";
    return;
  }

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    console.error("Error en apiFetchOptional", {
      url: API_BASE_URL + path,
      status: response.status,
      body: responseText,
    });
    throw new Error(
      responseText || `Error ${response.status} al llamar a ${path}`,
    );
  }

  if (!responseText) return null;

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(responseText);
  }
  return responseText;
}

// =======================
//        USUARIOS
// =======================

// Obtiene todos los usuarios desde el back
export async function getUsuarios() {
  return await apiFetch("/usuarios");
}

export async function loginUsuario({ email, password, recordarSesion }) {
  // El backend ahora devuelve: { token, usuario }
  const response = await apiFetch("/usuarios/login", {
    method: "POST",
    body: { email, password },
  });

  // Extraer token y usuario de la respuesta
  const { token, usuario } = response;

  // Guardar token y usuario en el storage correspondiente
  const storage = recordarSesion ? localStorage : sessionStorage;
  storage.setItem("authToken", token);
  storage.setItem("usuarioActivo", JSON.stringify(usuario));

  return usuario;
}

export async function actualizarUsuario(payload) {
  return await apiFetch(`/usuarios`, {
    method: "POST",
    body: payload,
  });
}

export async function cambiarEstadoUsuario(idUsuario) {
  return await apiFetch(`/usuarios/estado/${idUsuario}`, {
    method: "PUT",
  });
}

export async function registrarUsuario(datosRegistro) {
  // datosRegistro debe respetar el DTO del back (RegistrarUsuarioDTO)
  // { nombre, apellido, email, telefono, direccion, usuarioRestaurante, password, diasAsistencia, activo }
  return await apiFetch("/usuarios/registrar", {
    method: "POST",
    body: datosRegistro,
  });
}

// =======================
//         PLATOS
// =======================

// Listar
export async function getPlatos() {
  return await apiFetch("/plato"); // o "/platos" segun controller
}

// Crear
export async function crearPlato({ nombre, descripcion, imagen, categoria }) {
  return await apiFetch("/plato/crear", {
    method: "POST",
    body: { nombre, descripcion, imagen, categoria },
  });
}

export async function modificarPlato(idPlato, payload) {
  if (idPlato === undefined || idPlato === null) {
    throw new Error("modificarPlato: idPlato es undefined/null");
  }

  const idNumero = Number(idPlato);
  if (!Number.isInteger(idNumero)) {
    throw new Error(`modificarPlato: idPlato invalido (${idPlato})`);
  }

  return await apiFetch(`/plato/modificar/${idNumero}`, {
    method: "PUT",
    body: payload,
  });
}

// Eliminar
export async function cambiarEstadoPlato(idPlato) {
  return await apiFetch(`/plato/estado/${idPlato}`, {
    method: "DELETE",
  });
}

// =======================
//        MENU-DIA
// =======================

export async function getMenuDiaPorFecha(fechaISO) {
  const query = new URLSearchParams({ fecha: fechaISO }).toString();
  return await apiFetch(`/menu-dia/fecha?${query}`);
}

export async function crearMenuDia({
  fecha,
  descripcion,
  publicado,
  id_usuario,
  stock_total,
}) {
  return await apiFetch(`/menu-dia/crear-menu`, {
    method: "POST",
    body: { fecha, descripcion, publicado, id_usuario, stock_total },
  });
}

export async function actualizarMenuDia({
  id,
  fecha,
  descripcion,
  stock_total,
}) {
  return await apiFetch(`/menu-dia/actualizar-menu`, {
    method: "PUT",
    body: { id, fecha, descripcion, stock_total },
  });
}

export async function cambiarEstadoMenuDia(idMenuDia) {
  return await apiFetch(`/menu-dia/cambiar-estado/${idMenuDia}`, {
    method: "PATCH",
  });
}

export async function getMenusDiaPorSemana(fechaReferenciaISO, offset = 1) {
  const query = new URLSearchParams({
    fechaReferencia: fechaReferenciaISO,
    offset: String(offset),
  }).toString();

  return await apiFetch(`/menu-dia/semana?${query}`);
}

// =======================
//       MENU-PLATO
// =======================

// Obtener menu-platos por fecha (MenuPlato)
export async function getMenuPlatosPorFecha(fechaISO) {
  return await apiFetch(
    `/menu-plato/fecha?fecha=${encodeURIComponent(fechaISO)}`,
  );
}

export async function agregarPlatoAlMenu({ idMenuDia, idPlato, stockInicial }) {
  return await apiFetch("/menu-plato/plato", {
    method: "POST",
    body: { idMenuDia, idPlato, stockInicial },
  });
}

export async function eliminarPlatoDelMenu(idMenuPlato) {
  return await apiFetch(`/menu-plato/plato/${idMenuPlato}`, {
    method: "DELETE",
  });
}

// =======================
//         PEDIDOS
// =======================

export async function getPedidosPorUsuario(idUsuario) {
  return await apiFetchOptional(`/pedidos/usuario/${idUsuario}`);
}

export async function crearPedido({
  idUsuario,
  fecha_pedido,
  cantidad_personas = 1,
  estado = "Pendiente",
}) {
  const dto = {
    // El DTO CrearPedidoDTO en el servicio usa getUsuario(),
    // asi­ que aca le mandamos un objeto Usuario mi­nimo con idUsuario
    usuario: { idUsuario },
    fecha_pedido, // LocalDate en el back "YYYY-MM-DD" en JSON
    cantidad_personas, // int
    estado, // "Pendiente" / "Confirmado" / "Cancelado"
  };

  return await apiFetch("/pedidos", {
    method: "POST",
    body: dto,
  });
}

export async function confirmarPedido({
  idUsuario,
  idMenuPlato,
  cantidadPersonas,
  fechaEntrega,
}) {
  return await apiFetch(`/pedidos/confirmar`, {
    method: "POST",
    body: { idUsuario, idMenuPlato, cantidadPersonas, fechaEntrega },
  });
}

// Confirmar toda la semana desde el restaurante
export async function confirmarSemanaPedidos(fechaReferencia, offset = 0) {
  const query = new URLSearchParams({
    fechaReferencia,
    offset: String(offset),
  }).toString();

  return await apiFetch(`/pedidos/confirmar-semana?${query}`, {
    method: "PATCH",
  });
}

// =======================
//        PEDIDO-DIA
// =======================

export async function crearPedidoDia(body) {
  return await apiFetch(`/pedido-dia`, {
    method: "POST",
    body,
  });
}

export async function getPorPedido(idPedido) {
  return await apiFetch(`/pedido-dia/pedido/${idPedido}`);
}

// Obtener historial completo de PedidoDia (incluye activos e inactivos)
export async function getPorPedidoHistorial(idPedido) {
  return await apiFetch(`/pedido-dia/pedido/${idPedido}/historial`);
}

export async function actualizarPedidoDia(body) {
  return await apiFetch(`/pedido-dia`, {
    method: "PUT",
    body,
  });
}

export async function eliminarPedidoDia(idPedidoDia) {
  if (idPedidoDia === undefined || idPedidoDia === null) {
    throw new Error("eliminarPedidoDia: idPedidoDia es undefined/null");
  }

  const idNumero = Number(idPedidoDia);
  if (!Number.isInteger(idNumero)) {
    throw new Error(
      `eliminarPedidoDia: idPedidoDia invalido (${idPedidoDia})`,
    );
  }

  return await apiFetch(`/pedido-dia/${idNumero}`, {
    method: "DELETE",
  });
}

export async function getPedidosSemana(fechaReferenciaISO, offset = 0) {
  const query = new URLSearchParams({
    fechaReferencia: fechaReferenciaISO,
    offset: String(offset),
  }).toString();

  try {
    return await apiFetchOptional(`/pedido-dia/semana?${query}`);
  } catch (err) {
    const mensaje = String(err?.message || "");
    if (
      mensaje.includes("No hay pedidos para esa semana") ||
      mensaje.includes("No hay pedidos para esa semana") ||
      mensaje.includes("Error 404")
    ) {
      return []; // semana sin pedidos = lista vaci­a
    }
    throw err;
  }
}

// =======================
//      NOTIFICACIONES
// =======================

export async function getNotificacionesPorUsuario(idUsuario) {
  return await apiFetchOptional(`/notificaciones/usuario/${idUsuario}`);
}

// Marcar una notificacion como leida
export async function marcarNotificacionLeida(idNotificacion) {
  return await apiFetch(`/notificaciones/${idNotificacion}/marcar-leida`, {
    method: "PATCH",
  });
}

// Marcar todas las notificaciones de un usuario como leidas
export async function marcarTodasNotificacionesLeidas(idUsuario) {
  return await apiFetch(
    `/notificaciones/usuario/${idUsuario}/marcar-todas-leidas`,
    {
      method: "PATCH",
    },
  );
}
// =======================
//      AUTENTICACION
// =======================

export function getUsuarioActivo() {
  const raw =
    localStorage.getItem("usuarioActivo") ||
    sessionStorage.getItem("usuarioActivo");
  return raw ? JSON.parse(raw) : null;
}

export function requireAuth(loginUrl = "./login.html") {
  const user = getUsuarioActivo();
  if (!user) {
    window.location.replace(loginUrl);
    return null;
  }
  return user;
}

export function logout(loginUrl = "./login.html") {
  // Limpiar usuario Y token
  localStorage.removeItem("usuarioActivo");
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("usuarioActivo");
  sessionStorage.removeItem("authToken");
  window.location.replace(loginUrl);
}

export function requireAdmin(redirectUrl = "./index.html") {
  const user = requireAuth("./login.html"); // asegura que esta logueado
  if (!user) return null;

  // Ajustar segun lo que devuelva tu API: 'es_usuario_restaurante' o similar.
  const esAdminRestaurante = user.es_usuario_restaurante === true;

  if (!esAdminRestaurante) {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}

// =======================
//      CONFIGURACION
// =======================

export async function getConfiguracion() {
  return await apiFetch("/configuracion");
}

export async function actualizarHorarioLimite(horarioLimite) {
  const query = new URLSearchParams({ horarioLimite }).toString();
  return await apiFetch(`/configuracion/horario-limite?${query}`, {
    method: "PATCH",
  });
}

export async function actualizarFeriados(feriados) {
  return await apiFetch("/configuracion/feriados", {
    method: "PUT",
    body: feriados,
  });
}

// ============================================
// FUNCIONES HELPER PARA MODAL DE CONFIRMACION
// ============================================

export function mostrarModalExito(titulo, mensaje) {
  const modal = document.getElementById("modal-confirmacion");
  const tituloEl = document.getElementById("modal-titulo");
  const mensajeEl = document.getElementById("modal-mensaje");
  const btnEl = document.getElementById("modal-btn");

  if (!modal || !tituloEl || !mensajeEl || !btnEl) {
    console.error("Elementos del modal no encontrados");
    return;
  }

  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;

  tituloEl.className =
    "modal-confirmacion_titulo modal-confirmacion_titulo--exito";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--exito";

  modal.classList.add("show");
}

export function mostrarModalError(titulo, mensaje) {
  const modal = document.getElementById("modal-confirmacion");
  const tituloEl = document.getElementById("modal-titulo");
  const mensajeEl = document.getElementById("modal-mensaje");
  const btnEl = document.getElementById("modal-btn");

  if (!modal || !tituloEl || !mensajeEl || !btnEl) {
    console.error("Elementos del modal no encontrados");
    return;
  }

  tituloEl.textContent = titulo;
  mensajeEl.textContent = mensaje;

  tituloEl.className =
    "modal-confirmacion_titulo modal-confirmacion_titulo--error";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--error";

  modal.classList.add("show");
}

export function cerrarModal() {
  const modal = document.getElementById("modal-confirmacion");
  if (modal) {
    modal.classList.remove("show");
  }
}

export function inicializarModalConfirmacion() {
  const btnModal = document.getElementById("modal-btn");
  const backdropModal = document.querySelector(".modal-confirmacion_backdrop");

  if (btnModal) {
    btnModal.addEventListener("click", cerrarModal);
  }

  if (backdropModal) {
    backdropModal.addEventListener("click", cerrarModal);
  }

  // Cerrar con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modal-confirmacion");
      if (modal && modal.classList.contains("show")) {
        cerrarModal();
      }
    }
  });
}
