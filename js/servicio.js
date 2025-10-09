// Servicio simple para leer la data simulando llamadas a una API

const BASE_URL = '/data/';

console.log("service.js cargo")
async function getJSON(filename) {
  const response = await fetch(BASE_URL + filename);
  if (!response.ok) throw new Error(`Error al cargar ${filename}`);
  return await response.json();
}

// --- USUARIOS ---
export async function getUsuarios() {
  return await getJSON('usuarios.json');
}

// --- PLATOS ---
export async function getPlatos() {
  return await getJSON('platos.json');
}

// --- CONFIGURACIÓN GENERAL ---
export async function getConfig() {
  return await getJSON('configuracion.json');
}

export async function getPedidos() {
  return await getJSON('pedidos.json')
}


// --- Ejemplo de función combinada ---
// Devuelve toda la información “del sistema” de una sola vez
export async function getSistemaCompleto() {
  const [usuarios, platos, config] = await Promise.all([
    getUsuarios(),
    getPlatos(),
    getConfig(),
    getPedidos()
  ]);

  return { usuarios, platos, config };
}

export function getUsuarioActivo() {
  const raw = localStorage.getItem('usuarioActivo') || sessionStorage.getItem('usuarioActivo');
  return raw ? JSON.parse(raw) : null;
}

export function requireAuth(loginUrl = './login.html') {
  const user = getUsuarioActivo();
  if (!user) { window.location.replace(loginUrl); return null; }
  return user;
}

export function logout(loginUrl = './login.html') {
  localStorage.removeItem('usuarioActivo');
  sessionStorage.removeItem('usuarioActivo');
  window.location.replace(loginUrl);
}

export function requireAdmin(redirectUrl = './index.html') {
  const user = requireAuth('./login.html'); // asegura que esté logueado
  if (!user) return null;
  if (user.rol !== 'administrador') {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}