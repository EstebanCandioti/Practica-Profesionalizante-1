// Servicio simple para leer la data simulando llamadas a una API

const BASE_URL = '/data/';

// --- Carga general ---
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

// --- Ejemplo de función combinada ---
// Devuelve toda la información “del sistema” de una sola vez
export async function getSistemaCompleto() {
  const [usuarios, platos, config] = await Promise.all([
    getUsuarios(),
    getPlatos(),
    getConfig()
  ]);

  return { usuarios, platos, config };
}
