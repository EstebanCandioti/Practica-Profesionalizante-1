const modal = document.getElementById('horario_limite_modal');
const openBtn = document.querySelector('#horario-limite');
const form = document.getElementById('horario_limite_form');

function open(){ modal.hidden = false; trapFocus(); }
function close(){ modal.hidden = true; document.activeElement.blur(); }

// e indica el evento que se esta recibiendo al hacer click o tocar una tecla
document.addEventListener('click', (e)=>{
    if(e.target === openBtn) open();
    if(e.target.hasAttribute('data-close')) close();
});
document.addEventListener('keydown', (e)=>{ if(!modal.hidden && e.key === 'Escape') close(); });

// Validación rápida: exigir hh:mm
form.addEventListener('submit', (e)=>{
    const time = form.elements['cutoff'].value;
    if(!time){ e.preventDefault(); alert('Elegí una hora límite.'); }
});

// Accesibilidad básica: foco dentro del modal
function trapFocus(){
    const focusables = modal.querySelectorAll('button, [href], input, select');
    if(focusables.length){ focusables[0].focus(); }
}