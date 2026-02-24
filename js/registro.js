import { registrarUsuario } from "./servicio.js";

// ============================================
// FUNCIONES HELPER PARA MODAL
// ============================================

function mostrarModalExito(titulo, mensaje) {
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
  
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--exito";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--exito";
  
  modal.classList.add("show");
}

function mostrarModalError(titulo, mensaje) {
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
  
  tituloEl.className = "modal-confirmacion_titulo modal-confirmacion_titulo--error";
  btnEl.className = "modal-confirmacion_btn modal-confirmacion_btn--error";
  
  modal.classList.add("show");
}

function cerrarModal() {
  const modal = document.getElementById("modal-confirmacion");
  if (modal) {
    modal.classList.remove("show");
  }
}

function inicializarModalConfirmacion() {
  const btnModal = document.getElementById("modal-btn");
  const backdropModal = document.querySelector(".modal-confirmacion_backdrop");
  
  if (btnModal) {
    btnModal.addEventListener("click", cerrarModal);
  }
  
  if (backdropModal) {
    backdropModal.addEventListener("click", cerrarModal);
  }
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modal-confirmacion");
      if (modal && modal.classList.contains("show")) {
        cerrarModal();
      }
    }
  });
}

// ============================================
// LOGICA DE REGISTRO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("form-registro");
  
  if (!formulario) {
    console.error("Formulario de registro no encontrado");
    return;
  }

  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Obtener días seleccionados
    const diasSeleccionados = [];
    ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"].forEach(dia => {
      const checkbox = document.getElementById(`dia-${dia.toLowerCase()}`);
      if (checkbox && checkbox.checked) {
        diasSeleccionados.push(dia);
      }
    });
    
    // Validar que haya al menos 1 día
    if (diasSeleccionados.length === 0) {
      mostrarModalError(
        "Días de asistencia requeridos",
        "Debes seleccionar al menos un día de asistencia a la oficina"
      );
      return;
    }
    
    // Validar contraseña
    const password = document.getElementById("password").value;
    if (password.length < 6) {
      mostrarModalError(
        "Contraseña inválida",
        "La contraseña debe tener al menos 6 caracteres"
      );
      return;
    }
    
    // Preparar datos
    const datos = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: password,
      telefono: document.getElementById("telefono").value.trim(),
      direccion: document.getElementById("direccion").value.trim(),
      usuarioRestaurante: false, // SIEMPRE false en registro público
      diasAsistencia: diasSeleccionados
    };
    
    // Deshabilitar botón mientras se procesa
    const btnSubmit = formulario.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Registrando...";
    
    try {
      await registrarUsuario(datos);
      
      // Éxito
      mostrarModalExito(
        "¡Registro exitoso!",
        "Tu cuenta ha sido creada. Redirigiendo al login..."
      );
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 2000);
      
    } catch (error) {
      console.error("Error en registro:", error);
      
      // Extraer mensaje del error
      let mensajeError = "Ocurrió un error al registrar tu cuenta. Intentá nuevamente.";
      
      if (error.message) {
        mensajeError = error.message;
      }
      
      // Mensajes específicos comunes
      if (mensajeError.toLowerCase().includes("email")) {
        mensajeError = "El email ya está registrado o no es válido";
      } else if (mensajeError.toLowerCase().includes("password")) {
        mensajeError = "La contraseña no cumple con los requisitos mínimos";
      }
      
      mostrarModalError("Error en el registro", mensajeError);
      
      // Re-habilitar botón
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginal;
    }
  });
  
  // Inicializar modal
  inicializarModalConfirmacion();
});