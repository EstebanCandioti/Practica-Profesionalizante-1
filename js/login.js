import { getUsuarios } from './servicio.js';
console.log("login cargo")

const form     = document.getElementById('login-form');
const emailEl  = document.getElementById('email');
const passEl   = document.getElementById('password');
const remember = document.getElementById('remember');
const btn      = document.getElementById('btn-login');
const msg      = document.getElementById('login-msg');

// Si ya hay sesión activa, redirige
(function autoRedirect(){
  const raw = localStorage.getItem('usuarioActivo') || sessionStorage.getItem('usuarioActivo');
  if (!raw) return;
  const user = JSON.parse(raw);
  window.location.href = './index.html';
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  btn.disabled = true;

  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;

  try {
    const usuarios = await getUsuarios();
    const user = usuarios.find(u => u.email.toLowerCase() === email && u.password === pass);

    if (!user) {
      msg.textContent = 'Usuario o contraseña incorrectos.';
      btn.disabled = false;
      return;
    }

    // Guardar sesión (sin contraseña)
    const { password, ...safeUser } = user;
    const storage = remember.checked ? localStorage : sessionStorage;
    storage.setItem('usuarioActivo', JSON.stringify(safeUser));

    // Redirigir 
    window.location.href = './index.html';
  } catch (err) {
    console.error(err);
    msg.textContent = 'No se pudo iniciar sesión. Intenta nuevamente.';
    btn.disabled = false;
  }
});
