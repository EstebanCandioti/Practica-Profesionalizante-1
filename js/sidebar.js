// sidebar.js - Genera el sidebar dinámicamente según el rol del usuario

import { getUsuarioActivo } from "./servicio.js";

// Definición de items del sidebar según rol
const ITEMS_EMPLEADO = [
  {
    icono: "/resources/casa.png",
    texto: "Home",
    href: "/index.html",
    alt: "Home"
  },
  {
    icono: "/resources/pedido.png",
    texto: "Realizar pedido",
    href: "/realizar_pedido.html",
    alt: "Realizar pedido"
  },
  {
    icono: "/resources/campanilla.png",
    texto: "Mi pedido",
    href: "/mi_pedido.html",
    alt: "Mi pedido"
  },
  {
    icono: "/resources/asistencia.png",
    texto: "Configurar asistencia",
    href: "/configurar_asistencia.html",
    alt: "Configurar asistencia"
  },
  {
    icono: "/resources/notificacion.png",
    texto: "Notificaciones",
    href: "/notificaciones.html",
    alt: "Notificaciones"
  },
  {
    icono: "/resources/historial.png",
    texto: "Historial de pedidos",
    href: "/historial-pedidos.html",
    alt: "Historial"
  }
];

const ITEMS_ADMIN = [
  {
    icono: "/resources/casa.png",
    texto: "Home",
    href: "/index.html",
    alt: "Home"
  },
  {
    icono: "/resources/notificacion.png",
    texto: "Notificaciones",
    href: "/notificaciones.html",
    alt: "Notificaciones"
  },
  {
    icono: "/resources/configuracion.png",
    texto: "Configuracion",
    href: "/adm-configuracion.html",
    alt: "Configuracion"
  }
];

// Items del menú de configuración (submenú)
const SUBITEMS_CONFIGURACION = [
  {
    texto: "Horario límite",
    href: "/adm-configuracion.html"
  },
  {
    texto: "Administrar feriados",
    href: "/administrar_feriados.html"
  },
  {
    texto: "Administrar platos",
    href: "/administrar_platos.html"
  },
  {
    texto: "Configurar menús del día",
    href: "/adm-menu-dia.html"
  },
  {
    texto: "Gestionar empleados",
    href: "/gestion-empleados.html"
  },
  {
    texto: "Ver pedidos semanales",
    href: "/adm-pedido-semanal.html"
  }
];

function crearItemSidebar(item) {
  const li = document.createElement("li");
  li.className = "sidebar_lista_item";

  li.innerHTML = `
    <img src="${item.icono}" alt="${item.alt}" class="sidebar_lista_item_icono" />
    <div class="sidebar_esconder">
      <button class="sidebar_esconder_boton">
        <a href="${item.href}" class="sidebar_esconder_boton_link">${item.texto}</a>
      </button>
    </div>
  `;

  return li;
}

export function renderSidebar() {
  const usuario = getUsuarioActivo();
  
  // Si no hay usuario, no renderizar nada (la página debería redirigir a login)
  if (!usuario) return;

  const ul = document.querySelector(".sidebar_lista");
  if (!ul) {
    console.warn("No se encontró .sidebar_lista en el DOM");
    return;
  }

  // Limpiar sidebar
  ul.innerHTML = "";

  // Determinar qué items mostrar según el rol
  const esAdmin = usuario.es_usuario_restaurante === true;
  const items = esAdmin ? ITEMS_ADMIN : ITEMS_EMPLEADO;

  // Renderizar items
  items.forEach(item => {
    ul.appendChild(crearItemSidebar(item));
  });
}

// Auto-ejecutar al cargar el módulo
document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
});