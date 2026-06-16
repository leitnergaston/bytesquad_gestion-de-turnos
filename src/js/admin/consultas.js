import { irA } from '../navigation.js';
import { _generarCalendario, _generarGrillaHorarios } from '../components/calendar.js';

let modTemp = {}; // Objeto temporal para la modificación de turnos
let turnosCache = []; // Caché de turnos

export async function abrirConsultaTurnos() {
    window.currentDate = new Date(); // Resetear a fecha actual
    await cargarTurnos();
    renderConsultaTurnosMes();
    irA("consulta-turnos");
}

async function cargarTurnos() {
    try {
        const resp = await fetch('/api/turnos');
        const data = await resp.json();
        // Aseguramos formato YYYY-MM-DD sin tiempo
        turnosCache = data.map(t => ({
            ...t,
            fecha: new Date(t.fecha).toISOString().split('T')[0],
            hora: t.hora.substring(0, 5)
        }));
    } catch(e) {
        console.error("Error al cargar turnos", e);
    }
}

export function renderConsultaTurnosMes() {
    const year = window.currentDate.getFullYear();
    const month = window.currentDate.getMonth();
    document.getElementById("consulta-mes-titulo").textContent = `${window.MESES[month]} ${year}`;

    const wrapper = document.getElementById("tabla-mensual-turnos-wrapper");
    
    const turnosDelMes = turnosCache.filter(t => {
        const [y, m] = t.fecha.split('-');
        return parseInt(y) === year && parseInt(m) - 1 === month;
    });

    if (turnosDelMes.length === 0) {
        wrapper.innerHTML = `<div class="empty-state">No hay turnos registrados para ${window.MESES[month]} ${year}.</div>`;
        return;
    }

    turnosDelMes.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    wrapper.innerHTML = `
        <table class="tabla-moderna">
            <thead>
                <tr>
                    <th>Fecha</th><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Estado</th><th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${turnosDelMes.map(t => `
                    <tr>
                        <td>${t.fecha.split('-')[2]}/${t.fecha.split('-')[1]}</td>
                        <td>${t.hora}</td>
                        <td>${t.pac_nombre} ${t.pac_apellido}</td>
                        <td>${t.prof_nombre} ${t.prof_apellido}</td>
                        <td><span class="badge-estado estado-${t.estado.toLowerCase()}">${t.estado}</span></td>
                        <td class="acciones"><button class="btn-accion-sm" onclick="window.prepararModificacionTurno(${t.id_turno})">✏️</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.prepararModificacionTurno = async (turnoId, keepMonth = false) => {
    window.currentEditingTurnoId = turnoId; 
    const turnoBase = turnosCache.find(t => t.id_turno === turnoId);
    if (!turnoBase) { alert("Error: Turno no encontrado."); return; }
    
    modTemp = { turnoOriginal: { ...turnoBase }, nuevoDiaStr: null, nuevoHorario: null };

    if (!keepMonth) {
        const [y, m, d] = turnoBase.fecha.split('-');
        window.currentDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    
    document.getElementById('mod-turno-id').textContent = turnoBase.id_turno;
    document.getElementById('mod-turno-paciente').textContent = `${turnoBase.pac_nombre} ${turnoBase.pac_apellido}`;
    document.getElementById('mod-turno-profesional').textContent = `${turnoBase.prof_nombre} ${turnoBase.prof_apellido} (${turnoBase.nombre_especialidad})`;
    
    // Convertir a base para dar formato YYYY-MM-DD a vista humana si se desea
    const [y, m, d] = turnoBase.fecha.split("-");
    const fechaOriginalDisp = `${d} de ${window.MESES[parseInt(m)-1]}`;
    document.getElementById('mod-turno-fecha-hora').textContent = `${fechaOriginalDisp} (${turnoBase.hora.substring(0, 5)} hs)`;

    const year = window.currentDate.getFullYear(), month = window.currentDate.getMonth();
    document.querySelector("#pantalla-gestion-turno .calendario-titulo-texto").textContent = `${window.MESES[month]} ${year}`;
    const calCont = document.getElementById("mod-calendario-container");
    
    try {
        const resp = await fetch(`/api/agendas?id_profesional=${turnoBase.id_profesional}`);
        const agendas = await resp.json();
        
        // Filtrar días que tengan al menos un horario libre (excluyendo este turno que se está reprogramando)
        const agendaDiasDisponibles = [];
        for (const a of agendas) {
            const fechaStr = a.fecha_atencion.substring(0, 10);
            const turnosDia = turnosCache.filter(t => 
                t.id_profesional === turnoBase.id_profesional && 
                t.fecha === fechaStr && 
                t.estado !== 'cancelado' &&
                t.id_turno !== turnoBase.id_turno
            );
            const ocupados = turnosDia.map(t => t.hora.substring(0, 5));
            const configurados = a.horarios.map(h => h.substring(0, 5));
            const libres = configurados.filter(h => !ocupados.includes(h));
            
            if (libres.length > 0) {
                agendaDiasDisponibles.push(fechaStr);
            }
        }
        
        _generarCalendario(calCont, year, month, agendaDiasDisponibles, (d, fechaStr) => {
            modTemp.nuevoDiaStr = fechaStr;
            modTemp.nuevoDiaDisplay = `${d} de ${window.MESES[month]}`;
            const hrCont = document.getElementById("mod-horarios-container");
            hrCont.innerHTML = '';
            
            const agendaDia = agendas.find(a => a.fecha_atencion.substring(0, 10) === fechaStr);
            const horariosDisp = agendaDia ? agendaDia.horarios.map(h => h.substring(0, 5)) : null;
            
            const turnosOcupadosData = turnosCache.filter(t => 
                t.id_profesional === turnoBase.id_profesional && 
                t.fecha === fechaStr && 
                t.estado !== 'cancelado' &&
                t.id_turno !== turnoId
            );
            const horariosOcup = turnosOcupadosData.map(t => t.hora);
            
            _generarGrillaHorarios(hrCont, horariosDisp, horariosOcup, (btn, hora) => {
                modTemp.nuevoHorario = hora;
            });
        });
        
        document.getElementById("mod-horarios-container").innerHTML = '<p class="empty-state">Seleccione un día para ver horarios.</p>';
        irA('gestion-turno');
    } catch(e) {
        console.error(e);
        alert("Error cargando disponibilidad del profesional.");
    }
}

window.guardarCambiosTurno = async () => {
    const { turnoOriginal, nuevoDiaStr, nuevoHorario } = modTemp;
    if (!nuevoDiaStr || !nuevoHorario) {
        alert("Para reprogramar, debe seleccionar un nuevo día Y un nuevo horario.");
        return;
    }

    try {
        const resp = await fetch(`/api/turnos/${turnoOriginal.id_turno}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: nuevoDiaStr,
                hora: nuevoHorario,
                estado: "modificado"
            })
        });
        
        if (resp.ok) {
            alert(`Turno ${turnoOriginal.id_turno} reprogramado.`);
            await cargarTurnos();
            renderConsultaTurnosMes();
            irA('consulta-turnos');
        } else {
            alert("Error al reprogramar el turno.");
        }
    } catch(e) {
        alert("Error de conexión");
        console.error(e);
    }
}

window.cancelarTurnoDesdeGestion = async () => {
    const { turnoOriginal } = modTemp;
    if (confirm(`¿Está seguro que desea cancelar el turno N° ${turnoOriginal.id_turno}?`)) {
        try {
            const resp = await fetch(`/api/turnos/${turnoOriginal.id_turno}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: "cancelado" })
            });

            if (resp.ok) {
                alert(`Turno ${turnoOriginal.id_turno} ha sido cancelado.`);
                await cargarTurnos();
                renderConsultaTurnosMes();
                irA('consulta-turnos');
            } else {
                alert("Error al cancelar el turno.");
            }
        } catch(e) {
            alert("Error de conexión");
            console.error(e);
        }
    }
};
