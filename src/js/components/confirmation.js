import { irA } from '../navigation.js';
import { mostrarDashboard } from '../admin/dashboard.js';

export function mostrarConfirmacion(turno, destino) {
    document.getElementById("conf-paciente").textContent = turno.pacienteNombre;
    document.getElementById("conf-profesional").textContent = turno.profesional;
    document.getElementById("conf-fecha").textContent = `${turno.fechaDisplay} (${turno.horario} hs)`;
    
    const btn = document.getElementById("btn-conf-aceptar");
    
    // Clonar y reemplazar el botón para eliminar listeners antiguos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
        if (destino === 'secretaria-menu') {
            mostrarDashboard();
        } else {
            irA(destino);
        }
    });
    
    irA("confirmacion");
}
