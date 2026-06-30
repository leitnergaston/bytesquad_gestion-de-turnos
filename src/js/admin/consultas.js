import { irA } from '../navigation.js';

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
                ${turnosDelMes.map(t => {
                    let estadoFinal = t.estado.toLowerCase();
                    const turnoDate = new Date(`${t.fecha}T${t.hora}`);
                    if (turnoDate < new Date() && estadoFinal === 'confirmado') {
                        estadoFinal = 'finalizado';
                    }

                    return `
                    <tr>
                        <td>${t.fecha.split('-')[2]}/${t.fecha.split('-')[1]}</td>
                        <td>${t.hora.substring(0,5)}</td>
                        <td>${t.pac_nombre} ${t.pac_apellido}</td>
                        <td>${t.prof_nombre} ${t.prof_apellido}</td>
                        <td><span class="badge-estado estado-${estadoFinal}">${estadoFinal}</span></td>
                        <td class="acciones">
                            ${estadoFinal === 'finalizado' || estadoFinal === 'cancelado' ? 
                                `<span style="color:var(--color-texto-secundario)">-</span>` : 
                                `<button class="btn-accion-sm" onclick="window.prepararModificacionTurno(${t.id_turno})">✏️</button>
                                 <button class="btn-accion-sm" onclick="window.cancelarTurnoDesdeGestion(${t.id_turno})">❌</button>`}
                        </td>
                    </tr>
                    `}).join('')}
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

    const inputFecha = document.getElementById('mod-fecha-grilla');
    inputFecha.value = turnoBase.fecha.split('T')[0];
    
    inputFecha.onchange = () => {
        window.renderizarGrillaModificacion(turnoBase);
    };

    window.renderizarGrillaModificacion(turnoBase);
    irA('gestion-turno');
}

window.renderizarGrillaModificacion = async (turnoBase) => {
    const contenedor = document.getElementById('mod-grilla-diaria-container');
    const fecha = document.getElementById('mod-fecha-grilla').value;
    contenedor.innerHTML = '<p>Cargando grilla...</p>';

    try {
        const [agendasResp, turnosResp] = await Promise.all([
            fetch(`/api/agendas?id_profesional=${turnoBase.id_profesional}`),
            fetch('/api/turnos')
        ]);
        const agendas = await agendasResp.json();
        const todosTurnos = await turnosResp.json();

        const turnosDelDia = todosTurnos.map(t => ({
            ...t,
            fechaStr: new Date(t.fecha).toISOString().split('T')[0],
            horaStr: t.hora.substring(0, 5)
        })).filter(t => t.id_profesional === turnoBase.id_profesional && t.fechaStr === fecha && t.estado !== 'cancelado');

        const agendaDia = agendas.find(a => a.fecha_atencion.substring(0, 10) === fecha);
        
        if(!agendaDia || !agendaDia.horarios || agendaDia.horarios.length === 0) {
            contenedor.innerHTML = '<div class="empty-state">El profesional no atiende en esta fecha o no tiene horarios configurados.</div>';
            return;
        }

        const horariosDisp = agendaDia.horarios.map(h => h.substring(0, 5));
        horariosDisp.sort();

        let html = '<div class="grilla-horaria-visual" style="display:flex; flex-direction:column; gap:0.5rem; background: var(--color-superficie); padding: 1rem; border-radius: 1rem; border: 1px solid var(--color-borde);">';
        
        horariosDisp.forEach(hora => {
            const turnoOcupante = turnosDelDia.find(t => t.horaStr === hora);
            
            if (turnoOcupante) {
                // If it's the turn we're editing, make it draggable and distinct!
                if (turnoOcupante.id_turno === turnoBase.id_turno) {
                    html += `
                        <div class="slot-horario actual" data-hora="${hora}" style="display:flex; align-items:center; padding: 0.75rem; background: var(--color-exito-suave); border-left: 4px solid var(--color-exito); border-radius: 0.5rem;">
                            <div style="font-weight:bold; width: 60px; color: var(--color-texto);">${hora}</div>
                            <div draggable="true" ondragstart="window.dragStartModTurno(event, ${turnoBase.id_turno})" style="flex:1; cursor: grab; background: var(--color-fondo); padding: 0.5rem 1rem; border-radius: 0.5rem; box-shadow: var(--sombra-suave); display:flex; justify-content:space-between; align-items:center; border: 2px solid var(--color-exito); color: var(--color-texto);">
                                <div>
                                    <strong>${turnoOcupante.pac_nombre} ${turnoOcupante.pac_apellido} (Este Turno)</strong> 
                                </div>
                                <span style="font-size: 1.2rem; color: var(--color-texto-secundario);">⋮⋮</span>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="slot-horario ocupado" data-hora="${hora}" style="display:flex; align-items:center; padding: 0.75rem; background: var(--color-error-suave); border-left: 4px solid var(--color-error); border-radius: 0.5rem; opacity: 0.8;">
                            <div style="font-weight:bold; width: 60px; color: var(--color-texto);">${hora}</div>
                            <div style="flex:1; padding: 0.5rem 1rem; color: var(--color-texto-secundario);">
                                Ocupado (${turnoOcupante.pac_nombre} ${turnoOcupante.pac_apellido})
                            </div>
                        </div>
                    `;
                }
            } else {
                html += `
                    <div class="slot-horario libre" data-hora="${hora}" 
                         ondragover="window.dragOverModTurno(event)" 
                         ondrop="window.dropModTurno(event, '${hora}', ${turnoBase.id_turno})" 
                         ondragenter="this.style.background='var(--color-primario-suave)';"
                         ondragleave="this.style.background='var(--color-superficie)';"
                         style="display:flex; align-items:center; padding: 0.75rem; background: var(--color-superficie); border: 1px dashed var(--color-borde); border-radius: 0.5rem; min-height: 50px; transition: background 0.2s;">
                        <div style="font-weight:bold; width: 60px; color: var(--color-texto-secundario);">${hora}</div>
                        <div style="flex:1; color: var(--color-texto-secundario); font-style: italic;">Disponible (Suelte aquí para reprogramar)</div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        contenedor.innerHTML = html;

    } catch (e) {
        console.error(e);
        contenedor.innerHTML = '<p class="msg-error">Error al cargar la grilla.</p>';
    }
}

window.dragStartModTurno = (ev, id_turno) => {
    ev.dataTransfer.setData("text/plain", id_turno);
    ev.dataTransfer.effectAllowed = "move";
}

window.dragOverModTurno = (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}

window.dropModTurno = async (ev, nuevaHora, id_turno_base) => {
    ev.preventDefault();
    ev.currentTarget.style.background = 'white';
    
    const id_turno = ev.dataTransfer.getData("text/plain");
    if(id_turno != id_turno_base) return;
    
    const fecha = document.getElementById('mod-fecha-grilla').value;
    
    if(confirm(`¿Desea reprogramar el turno a las ${nuevaHora}?`)) {
        try {
            const resp = await fetch(`/api/turnos/${id_turno}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: fecha,
                    hora: nuevaHora,
                    estado: "modificado"
                })
            });
            if(resp.ok) {
                alert("Turno reprogramado exitosamente.");
                await cargarTurnos();
                renderConsultaTurnosMes();
                irA('consulta-turnos');
            } else {
                alert("Error al reprogramar el turno.");
            }
        } catch(e) {
            alert("Error de conexión");
        }
    }
}

window.guardarCambiosTurno = async () => {
    // This button is hidden in the UI because drag & drop handles the save.
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
