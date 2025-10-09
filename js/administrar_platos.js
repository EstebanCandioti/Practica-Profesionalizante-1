import { requireAuth, getPlatos } from "./servicio.js";

function normalizarDia(txt){
  return (txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,''); // quita tildes
}

function crearItemPlato(plato){
  const li = document.createElement('li');
  li.className = 'administrar_platos_main_platos_lista_item';

  li.innerHTML = `
    <span>${plato.name}</span>
    <label>
      <input type="checkbox" class="administrar_platos_main_platos_lista_item_checkbox">
      <span>habilitar</span>
    </label>
    <select class="administrar_platos_main_lista_item_dias" disabled>
      <option value="">Día…</option>
      <option value="lunes">Lunes</option>
      <option value="martes">Martes</option>
      <option value="miercoles">Miercoles</option>
      <option value="jueves">Jueves</option>
      <option value="viernes">Viernes</option>
    </select>
  `;

  if (plato.imagen) li.dataset.imagen = plato.imagen;

  // activar si el plato tiene día asignado
  const chk = li.querySelector('.administrar_platos_main_platos_lista_item_checkbox');
  const sel = li.querySelector('.administrar_platos_main_lista_item_dias');
  const diaNorm = normalizarDia(plato.day);

  if (diaNorm && ['lunes','martes','miercoles','jueves','viernes'].includes(diaNorm)) {
    chk.checked = true;
    sel.disabled = false;
    sel.value = plato.day; // usa el mismo texto (con tilde si corresponde)
    li.classList.add('ap-item-active');
  }

  return li;
}


document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requireAuth('./login.html');
  if (!usuario) return;

  const ul = document.querySelector('.administrar_platos_main_platos_lista');
  const btnConfirm = document.getElementById('confirmar_modificacion_platos');

  const modalAdd = document.getElementById('ap-modal-agregar');
  const modalDel = document.getElementById('ap-modal-borrar');
  const formAdd = document.getElementById('ap-form-agregar');
  const inputAddNombre = document.getElementById('ap-add-nombre');
  const inputAddImagen = document.getElementById('plato-imagen');
  const btnConfirmDel = document.getElementById('ap-confirm-borrar');

  if (!ul) return;

  // 1) Cargar y renderizar
  const platos = await getPlatos();
  ul.innerHTML = '';
  platos.forEach(p => ul.appendChild(crearItemPlato(p)));

  // 2) Activar/desactivar select según checkbox
  ul.addEventListener('change', (e) => {
    const li = e.target.closest('.administrar_platos_main_platos_lista_item');
    if (!li) return;
    if (e.target.classList.contains('administrar_platos_main_platos_lista_item_checkbox')) {
      const sel = li.querySelector('.administrar_platos_main_lista_item_dias');
      const checked = e.target.checked;
      sel.disabled = !checked;
      if (!checked) sel.value = '';
      li.classList.toggle('ap-item-active', checked);
    }
  });

  // 3) Confirmar cambios
  btnConfirm?.addEventListener('click', () => {
    const payload = [];
    let ok = true;

    ul.querySelectorAll('.administrar_platos_main_platos_lista_item').forEach(li => {
      const name = li.querySelector('span')?.textContent.trim() || '';
      const chk = li.querySelector('.administrar_platos_main_platos_lista_item_checkbox');
      const sel = li.querySelector('.administrar_platos_main_lista_item_dias');
      const imagen = li.dataset.imagen || '';

      if (chk?.checked) {
        if (!sel?.value) {
          ok = false;
          sel?.focus();
        } else {
          payload.push({ name, day: sel.value, imagen });
        }
      }
    });

    if (!ok) {
      alert('Elegí un día para cada plato habilitado.');
      return;
    }

    console.log('Payload listo:', payload);
    alert('Guardado.');
  });

  // 4) Modales abrir/cerrar
  function openModal(m){ m.hidden = false; setTimeout(()=> m.querySelector('input,button,select')?.focus(), 0); }
  function closeModal(m){ m.hidden = true; }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#ap-btn-agregar')) openModal(modalAdd);
    if (e.target.closest('#ap-btn-borrar')) openModal(modalDel);
    if (e.target.closest('[data-ap-close]')) {
      const m = e.target.closest('.ap-modal');
      if (m) closeModal(m);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalAdd.hidden) closeModal(modalAdd);
      if (!modalDel.hidden) closeModal(modalDel);
    }
  });

  // 5) Agregar nuevo plato
  formAdd?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = inputAddNombre.value.trim();
    const imagen = inputAddImagen.value.trim();
    if (!nombre) { inputAddNombre.focus(); return; }

    const nuevo = { name: nombre, day: '', imagen };
    ul.appendChild(crearItemPlato(nuevo));
    inputAddNombre.value = '';
    if (inputAddImagen) inputAddImagen.value = '';
    closeModal(modalAdd);
  });

  // 6) Borrar los marcados
  btnConfirmDel?.addEventListener('click', () => {
    const marcados = ul.querySelectorAll('.administrar_platos_main_platos_lista_item_checkbox:checked');
    if (!marcados.length) { alert('No hay platos marcados para borrar.'); return; }
    marcados.forEach(chk => chk.closest('.administrar_platos_main_platos_lista_item')?.remove());
    closeModal(modalDel);
  });

  // 7) Desmarcar todos los platos
const btnDesmarcar = document.querySelector('.administrar_platos_main_botones_boton:not([id])');
btnDesmarcar?.addEventListener('click', () => {
  const items = ul.querySelectorAll('.administrar_platos_main_platos_lista_item');
  items.forEach(li => {
    const chk = li.querySelector('.administrar_platos_main_platos_lista_item_checkbox');
    const sel = li.querySelector('.administrar_platos_main_lista_item_dias');
    if (chk) chk.checked = false;
    if (sel) {
      sel.disabled = true;
      sel.value = '';
    }
    li.classList.remove('ap-item-active');
  });
});



});
