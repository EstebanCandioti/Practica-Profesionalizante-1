
  // listas y botones
  const ul = document.querySelector('.administrar_platos_main_platos_lista');
  const btnConfirm = document.getElementById('confirmar_modificacion_platos');
  const btnOpenAdd = document.getElementById('ap-btn-agregar');
  const btnOpenDel = document.getElementById('ap-btn-borrar');

  // MODALES
  const modalAdd = document.getElementById('ap-modal-agregar');
  const modalDel = document.getElementById('ap-modal-borrar');
  const formAdd = document.getElementById('ap-form-agregar');
  const inputAddNombre = document.getElementById('ap-add-nombre');
  const btnConfirmDel = document.getElementById('ap-confirm-borrar');

  // --- Delegación de eventos en la lista:
  // 1) Al tildar "habilitar" -> habilita el <select>, destilda -> lo deshabilita y limpia
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

  // --- Confirmar: arma payload y valida
  btnConfirm.addEventListener('click', () => {
    const payload = [];
    let ok = true;

    ul.querySelectorAll('.administrar_platos_main_platos_lista_item').forEach(li => {
      const name = li.querySelector('span').textContent.trim();
      const chk = li.querySelector('.administrar_platos_main_platos_lista_item_checkbox');
      const sel = li.querySelector('.administrar_platos_main_lista_item_dias');
      if (chk.checked) {
        if (!sel.value) {
          ok = false;
          sel.focus();
        } else {
          payload.push({ name, day: sel.value });
        }
      }
    });

    if (!ok) {
      alert('Elegí un día para cada plato habilitado.');
      return;
    }

    console.log('Payload listo:', payload);
    alert('Guardado (ver consola).');
    // TODO: fetch('/api/platos/guardar', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
  });

  // --- Abrir/Cerrar modales (agregar / borrar)
  function openModal(m) { m.hidden = false; setTimeout(() => m.querySelector('input,button,select')?.focus(), 0); }
  function closeModal(m) { m.hidden = true; }

  document.addEventListener('click', (e) => {
    if (e.target === btnOpenAdd) openModal(modalAdd);
    if (e.target === btnOpenDel) openModal(modalDel);
    if (e.target.hasAttribute('data-ap-close')) {
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

  // --- Submit "Agregar" -> crea <li> con tu estructura y lo inserta
  formAdd.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = inputAddNombre.value.trim();
    if (!nombre) { inputAddNombre.focus(); return; }

    const li = document.createElement('li');
    li.className = 'administrar_platos_main_platos_lista_item';
    li.innerHTML = `
      <span>${nombre}</span>
      <label>
        <input type="checkbox" class="administrar_platos_main_platos_lista_item_checkbox">
        <span>habilitar</span>
      </label>
      <select class="administrar_platos_main_lista_item_dias" disabled>
        <option value="">Día…</option>
        <option value="lu">Lunes</option>
        <option value="ma">Martes</option>
        <option value="mi">Miércoles</option>
        <option value="ju">Jueves</option>
        <option value="vi">Viernes</option>
      </select>
    `;
    ul.appendChild(li);

    inputAddNombre.value = '';
    closeModal(modalAdd);
  });

  // --- Confirmar borrado -> elimina TODOS los que estén tildados
  btnConfirmDel.addEventListener('click', () => {
    const marcados = ul.querySelectorAll('.administrar_platos_main_platos_lista_item_checkbox:checked');
    if (!marcados.length) { alert('No hay platos marcados para borrar.'); return; }
    marcados.forEach(chk => chk.closest('.administrar_platos_main_platos_lista_item').remove());
    closeModal(modalDel);
  });
