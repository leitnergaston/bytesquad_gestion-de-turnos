import { irA, MESES } from '../navigation.js';
import { poblarSelect } from '../utils.js';
import { _generarCalendario, _generarGrillaHorarios } from '../components/calendar.js';
import { mostrarConfirmacion } from '../components/confirmation.js';

let selP = {}; // Estado de selección del paciente

export async function iniciarReserva() {
    window.currentDate = new Date();
    window.currentDate.setDate(1);
    selP = {};
    const cont = document.getElementById("contenedor-especialidades");
    cont.innerHTML = '<p>Cargando especialidades...</p>';
    irA("especialidades");

    try {
        const resp = await fetch('/api/especialidades');
        const especialidades = await resp.json();
        
        cont.innerHTML = especialidades.map(e => `
            <div class="tarjeta-avatar" onclick="window.elegirEspecialidad(${e.id_especialidad}, '${e.nombre_especialidad}')">
                <div class="circulo-imagen">${e.icono || '🩺'}</div>
                <span>${e.nombre_especialidad}</span>
            </div>
        `).join('');
    } catch (e) {
        cont.innerHTML = '<p class="msg-error">Error al cargar especialidades. Intente más tarde.</p>';
    }
}

window.elegirEspecialidad = async (id_especialidad, nombre_especialidad) => {
    selP.especialidadNombre = nombre_especialidad;
    selP.id_especialidad = id_especialidad;
    
    const cont = document.getElementById("contenedor-profesionales");
    cont.innerHTML = '<p>Cargando profesionales...</p>';
    irA("profesionales");

    try {
        const resp = await fetch('/api/profesionales');
        const profesionales = await resp.json();
        const filtrados = profesionales.filter(p => p.id_especialidad === id_especialidad);
        
        cont.innerHTML = filtrados.length > 0
            ? filtrados.map(p => `
                <div class="tarjeta-avatar" onclick="window.elegirProfesional(${p.id_profesional}, '${p.nombre}', '${p.apellido}')">
                    <div class="circulo-imagen">👨‍⚕️</div>
                    <span>${p.nombre} ${p.apellido}</span>
                </div>
            `).join('')
            : '<p class="empty-state">No hay profesionales para esta especialidad.</p>';
    } catch (e) {
        cont.innerHTML = '<p class="msg-error">Error al cargar profesionales.</p>';
    }
}

window.elegirProfesional = (profId, nombre, apellido) => {
    selP.id_profesional = profId;
    selP.profesionalNombre = `${nombre} ${apellido}`;
    generarCalendarioPaciente();
    irA("dias");
}

export async function generarCalendarioPaciente() {
    const year = window.currentDate.getFullYear();
    const month = window.currentDate.getMonth();
    document.querySelector("#pantalla-dias .calendario-titulo-texto").textContent = `${MESES[month]} ${year}`;
    
    document.getElementById("contenedor-calendario").innerHTML = "<p>Cargando días disponibles...</p>";

    try {
        const resp = await fetch(`/api/agendas?id_profesional=${selP.id_profesional}`);
        const agendas = await resp.json();
        
        // El formato de fecha devuelto es ISO. Convertimos a YYYY-MM-DD para el calendario
        const agendaDias = agendas.map(a => new Date(a.fecha_atencion).toISOString().split('T')[0]);
        // Guardamos las agendas en el objeto temporal para usarlas en los horarios
        selP.agendasProfesional = agendas;

        _generarCalendario(document.getElementById("contenedor-calendario"), year, month, agendaDias, (d, f) => elegirDia(d, f));
    } catch(e) {
        console.error(e);
        document.getElementById("contenedor-calendario").innerHTML = "<p class='msg-error'>Error al cargar días disponibles.</p>";
    }
}

async function elegirDia(num, fechaStr) {
    selP.dia = `${num} de ${MESES[window.currentDate.getMonth()]}`;
    selP.diaStr = fechaStr;
    document.getElementById("titulo-fecha-elegida").textContent = `📅 ${selP.dia}`;
    
    document.getElementById("contenedor-horarios").innerHTML = "<p>Cargando horarios...</p>";
    irA("horarios");

    try {
        // Encontrar los horarios disponibles para esta agenda específica
        // Comparando contra las fechas devueltas (que traen info temporal como "T00:00:00.000Z")
        const agendaStr = selP.agendasProfesional.find(a => new Date(a.fecha_atencion).toISOString().split('T')[0] === fechaStr);
        // Si no hay agendaDia específica, mandamos null, lo que hará el fallback
        let horariosDisponibles = agendaStr ? agendaStr.horarios.map(h => h.substring(0, 5)) : null;

        // Cargar turnos ocupados
        const resp = await fetch(`/api/turnos`);
        const turnosOcupadosData = await resp.json();
        const turnosEnEseDia = turnosOcupadosData.filter(t => 
            t.id_profesional === selP.id_profesional && 
            new Date(t.fecha).toISOString().split('T')[0] === fechaStr && 
            t.estado !== 'cancelado'
        );
        const horariosOcupados = turnosEnEseDia.map(t => t.hora.substring(0, 5));

        _generarGrillaHorarios(document.getElementById("contenedor-horarios"), horariosDisponibles, horariosOcupados, (btn, hora) => elegirHorario(hora));
    } catch(e) {
        console.error(e);
        document.getElementById("contenedor-horarios").innerHTML = "<p class='msg-error'>Error al cargar horarios.</p>";
    }
}

async function elegirHorario(hora) {
    selP.horario = hora;
    document.getElementById("resumen-turno").innerHTML = `
        <div class="resumen-item"><span>🔬</span><div><small>Especialidad</small><strong>${selP.especialidadNombre}</strong></div></div>
        <div class="resumen-item"><span>🩺</span><div><small>Especialista</small><strong>${selP.profesionalNombre}</strong></div></div>
        <div class="resumen-item"><span>📅</span><div><small>Fecha</small><strong>${selP.dia}</strong></div></div>
        <div class="resumen-item"><span>🕐</span><div><small>Horario</small><strong>${hora} hs.</strong></div></div>
    `;
    
    irA("datos");
    
    // Cargar selector de obras sociales
    try {
        const resp = await fetch('/api/obras_sociales');
        const osList = await resp.json();
        const opcionesOS = osList.map(os => ({ value: os.id_obra_social, text: os.nombre }));
        poblarSelect("datos-obra-social", opcionesOS);
    } catch (e) {
        console.error(e);
    }
}

window.finalizarReserva = async () => {
    const form = {
        nombre: document.getElementById("datos-nombre").value.trim(),
        apellido: document.getElementById("datos-apellido").value.trim(),
        dni: document.getElementById("datos-dni").value.trim(),
        celular: document.getElementById("datos-celular").value.trim(),
        email: document.getElementById("datos-mail").value.trim(),
        id_obra_social: parseInt(document.getElementById("datos-obra-social").value)
    };
    if (!form.nombre || !form.apellido || !form.dni) { 
        alert("Nombre, apellido y DNI son obligatorios."); 
        return; 
    }

    try {
        const payload = {
            id_profesional: selP.id_profesional,
            fecha: selP.diaStr,
            hora: selP.horario,
            paciente: form
        };

        const resp = await fetch("/api/turnos/reservar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            // Limpiar campos del formulario
            document.getElementById("datos-nombre").value = '';
            document.getElementById("datos-apellido").value = '';
            document.getElementById("datos-dni").value = '';
            document.getElementById("datos-celular").value = '';
            document.getElementById("datos-mail").value = '';

            // Objeto temporal solo para mostrar la confirmación UI
            const infoParaConfirmacionUI = {
                pacienteNombre: `${form.nombre} ${form.apellido}`,
                profesional: selP.profesionalNombre,
                fechaDisplay: selP.dia,
                horario: selP.horario
            };
            mostrarConfirmacion(infoParaConfirmacionUI, "inicio");
        } else {
            alert("Error al intentar realizar la reserva.");
        }
    } catch (e) {
        console.error(e);
        alert("Hubo un error de conexión.");
    }
}

export function cancelarReserva() {
    selP = {};
    irA("inicio");
}
