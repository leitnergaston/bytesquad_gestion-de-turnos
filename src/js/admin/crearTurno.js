import { irA } from '../navigation.js';
import { _generarCalendario, _generarGrillaHorarios } from '../components/calendar.js';
import { poblarSelect } from '../utils.js';
import { mostrarConfirmacion } from '../components/confirmation.js';

let selS = {};

export function abrirCrearTurno() {
    window.currentDate = new Date();
    selS = { paciente: null };
    document.getElementById("sec-buscar-dni").value = "";
    document.getElementById("sec-resultado-busqueda").innerHTML = "";
    document.getElementById("sec-form-crear-paciente").style.display = "none";
    document.getElementById("sec-form-turno").style.display = "none";
    irA("secretaria-crear");
}

window.buscarPacienteSecretaria = async () => {
    const dni = document.getElementById("sec-buscar-dni").value.trim();
    const res = document.getElementById("sec-resultado-busqueda");
    if (!dni) { res.innerHTML = '<div class="msg-error">Ingrese un DNI.</div>'; return; }
    
    try {
        const resp = await fetch('/api/pacientes');
        const pacientes = await resp.json();
        const p = pacientes.find(pac => pac.dni === dni);
        
        if (p) {
            selS.paciente = p;
            res.innerHTML = `<div class="paciente-encontrado"><span>✅ Paciente:</span><strong>${p.nombre} ${p.apellido}</strong></div>`;
            _mostrarFormTurnoSecretaria();
        } else {
            selS.paciente = { dni }; // Solo DNI guardado temporalmente
            res.innerHTML = `<div class="paciente-no-encontrado"><span>❌ Paciente no encontrado.</span><button class="btn-sm" onclick="window.mostrarFormCrearPaciente('${dni}')">+ Nuevo</button></div>`;
            document.getElementById("sec-form-turno").style.display = "none";
        }
    } catch(e) {
        console.error(e);
        res.innerHTML = '<div class="msg-error">Error al buscar el paciente.</div>';
    }
}

window.mostrarFormCrearPaciente = async (dni) => {
    const form = document.getElementById("sec-form-crear-paciente");
    form.style.display = "block";
    document.getElementById("sec-dni-nuevo").value = dni || '';
    
    try {
        const r = await fetch('/api/obras_sociales');
        const osList = await r.json();
        const opcionesOS = osList.map(os => ({ value: os.id_obra_social, text: os.nombre }));
        poblarSelect("sec-obra-social-nuevo", opcionesOS);
    } catch(e) {}
}

window.ocultarFormCrearPaciente = () => {
    document.getElementById("sec-form-crear-paciente").style.display = "none";
}

window.crearPacienteSecretaria = () => {
    const nuevo = {
        nombre: document.getElementById("sec-nombre").value.trim(), 
        apellido: document.getElementById("sec-apellido").value.trim(), 
        dni: document.getElementById("sec-dni-nuevo").value.trim(),
        celular: document.getElementById("sec-celular").value.trim(),
        email: document.getElementById("sec-mail").value.trim(), 
        id_obra_social: parseInt(document.getElementById("sec-obra-social-nuevo").value)
    };
    if (!nuevo.nombre || !nuevo.apellido || !nuevo.dni) { alert("Nombre, apellido y DNI son obligatorios."); return; }
    
    // No lo guardamos todavía en la tabla, lo dejamos en memoria
    // La reserva del turno lo creará / upserteará en nuestro endpoint especial /api/turnos/reservar
    selS.paciente = nuevo;
    document.getElementById("sec-resultado-busqueda").innerHTML = `<div class="paciente-encontrado"><span>✅ Paciente a crear:</span><strong>${nuevo.nombre} ${nuevo.apellido}</strong></div>`;
    ocultarFormCrearPaciente();
    _mostrarFormTurnoSecretaria();
}

async function _mostrarFormTurnoSecretaria() {
    const form = document.getElementById("sec-form-turno");
    form.style.display = "block";

    try {
        const r1 = await fetch('/api/especialidades');
        const espList = await r1.json();
        const opcionesEsp = espList.map(e => ({ value: e.id_especialidad, text: e.nombre_especialidad }));
        poblarSelect("sec-especialidad", opcionesEsp, "", "Seleccione especialidad...");
        
        const r2 = await fetch('/api/obras_sociales');
        const osList = await r2.json();
        const opcionesOS = osList.map(os => ({ value: os.id_obra_social, text: os.nombre }));
        poblarSelect("sec-obra-social", opcionesOS, selS.paciente?.id_obra_social);
    } catch(e) {
        console.error(e);
    }
    
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.actualizarProfesionalesSecretaria = async () => {
    const id_especialidad = parseInt(document.getElementById("sec-especialidad").value);
    document.getElementById("sec-profesional").innerHTML = "<option>Cargando...</option>";
    
    try {
        const resp = await fetch(`/api/profesionales?id_especialidad=${id_especialidad}`);
        let profesionales = await resp.json();
        if (id_especialidad) {
            profesionales = profesionales.filter(p => p.id_especialidad === id_especialidad); // Doble validación si el endpoint los trae todos
        }
        
        const opcionesProf = profesionales.map(p => ({ value: p.id_profesional, text: `${p.nombre} ${p.apellido}` }));
        poblarSelect("sec-profesional", opcionesProf, "", "Seleccione profesional...");
        actualizarCalendarioSecretaria();
    } catch(e) {
        poblarSelect("sec-profesional", [], "", "Error al cargar");
    }
}

export async function actualizarCalendarioSecretaria() {
    const profValor = document.getElementById("sec-profesional").value;
    const id_profesional = parseInt(profValor);
    
    selS.id_profesional = id_profesional;
    selS.profesionalNombre = document.getElementById("sec-profesional").options[document.getElementById("sec-profesional").selectedIndex]?.text;
    
    const calWrap = document.getElementById("sec-calendario-wrapper");
    calWrap.style.display = profValor ? "block" : "none";
    if (!profValor) return;
    
    const year = window.currentDate.getFullYear(), month = window.currentDate.getMonth();
    document.querySelector("#pantalla-secretaria-crear .calendario-titulo-texto").textContent = `${window.MESES[month]} ${year}`;
    const cont = document.getElementById("sec-contenedor-calendario");
    cont.innerHTML = "Cargando...";
    
    try {
        const [agendasResp, turnosResp] = await Promise.all([
            fetch(`/api/agendas?id_profesional=${id_profesional}`),
            fetch(`/api/turnos`)
        ]);
        const agendas = await agendasResp.json();
        const turnos = await turnosResp.json();
        selS.agendasProfesional = agendas;
        
        // Filtrar días que tengan al menos un horario libre (no ocupado)
        const agendaDiasDisponibles = [];
        for (const a of agendas) {
            const fechaStr = a.fecha_atencion.substring(0, 10);
            const turnosDia = turnos.filter(t => 
                t.id_profesional === id_profesional && 
                t.fecha === fechaStr && 
                t.estado !== 'cancelado'
            );
            const ocupados = turnosDia.map(t => t.hora.substring(0, 5));
            const configurados = a.horarios.map(h => h.substring(0, 5));
            const libres = configurados.filter(h => !ocupados.includes(h));
            
            if (libres.length > 0) {
                agendaDiasDisponibles.push(fechaStr);
            }
        }
            
        _generarCalendario(cont, year, month, agendaDiasDisponibles, (d, f) => elegirDiaSecretaria(d, f));
    } catch(e) {
        cont.innerHTML = "Error loading agendas.";
        console.error(e);
    }
}
window.actualizarCalendarioSecretaria = actualizarCalendarioSecretaria;

async function elegirDiaSecretaria(num, fechaStr) {
    selS.dia = `${num} de ${window.MESES[window.currentDate.getMonth()]}`;
    selS.diaStr = fechaStr;
    const hrWrap = document.getElementById("sec-horarios-wrapper");
    hrWrap.style.display = "block";
    const grilla = document.getElementById("sec-grilla-horarios");
    
    try {
        const agendaStr = selS.agendasProfesional.find(a => a.fecha_atencion.substring(0, 10) === fechaStr);
        let horariosDisponibles = agendaStr ? agendaStr.horarios.map(h => h.substring(0, 5)) : null;

        const resp = await fetch(`/api/turnos`);
        const turnosData = await resp.json();
        const turnosEnEseDia = turnosData.filter(t => 
            t.id_profesional === selS.id_profesional && 
            t.fecha === fechaStr && 
            t.estado !== 'cancelado'
        );
        const horariosOcupados = turnosEnEseDia.map(t => t.hora.substring(0, 5));

        _generarGrillaHorarios(grilla, horariosDisponibles, horariosOcupados, (btn, hora) => {
            selS.horario = hora;
        });
    } catch(e) {
        grilla.innerHTML = "Error cargando turnos";
    }
}

window.guardarTurnoSecretaria = async () => {
    if (!selS.paciente || !selS.id_profesional || !selS.diaStr || !selS.horario) { 
        alert("Faltan datos para crear el turno."); 
        return; 
    }
    
    selS.paciente.id_obra_social = parseInt(document.getElementById("sec-obra-social").value); // Actualizar OS del paciente con el seleccionado en combobox principal si difiere

    try {
        const payload = {
            id_profesional: selS.id_profesional,
            fecha: selS.diaStr,
            hora: selS.horario,
            paciente: selS.paciente
        };

        const resp = await fetch("/api/turnos/reservar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            const infoParaConfirmacionUI = {
                pacienteNombre: `${selS.paciente.nombre} ${selS.paciente.apellido}`,
                profesional: selS.profesionalNombre,
                fechaDisplay: selS.dia,
                horario: selS.horario
            };
            mostrarConfirmacion(infoParaConfirmacionUI, "secretaria-menu");
        } else {
            alert("Error al intentar realizar la reserva.");
        }
    } catch (e) {
        console.error(e);
        alert("Hubo un error de conexión.");
    }
};
