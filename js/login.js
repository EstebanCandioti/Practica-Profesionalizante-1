// js/login.js
import { loginUsuario } from './servicio.js';
console.log("login cargó");

const form     = document.getElementById('login-form');
const emailEl  = document.getElementById('email');
const passEl   = document.getElementById('password');
const remember = document.getElementById('remember');
const btn      = document.getElementById('btn-login');
const msg      = document.getElementById('login-msg');

// Si ya hay sesión activa, redirige
(function autoRedirect() {
  const raw = localStorage.getItem('usuarioActivo') || sessionStorage.getItem('usuarioActivo');
  if (!raw) return;
  window.location.href = './index.html';
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  btn.disabled = true;

  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;

  try {
    await loginUsuario({
      email,
      password: pass,
      recordarSesion: remember.checked
    });

    // Si el login fue OK, el usuario ya está guardado en storage
    window.location.href = './index.html';
  } catch (err) {
    console.error(err);
    // El mensaje viene del back: "Contrasenia incorrecta", "El usuario se encuentra inactivo", etc.
    msg.textContent = err.message || 'No se pudo iniciar sesión. Intenta nuevamente.';
    btn.disabled = false;
  }
});
