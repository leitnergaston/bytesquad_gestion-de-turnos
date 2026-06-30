import { irA } from '../navigation.js';
import { poblarSelect } from '../utils.js';

let grillaData = {
    agendas: [],
    turnos: []
};

export async function iniciarGrillaDiaria() {
    // Populate select
    try {
        const resp = await fetch('/api/profesionales');
        const profs = await resp.json();
        poblarSelect('grilla-profesional', profs.map(p => ({
            value: p.id_profesional, text: `${p.nombre} ${p.apellido}`
        })));
    } catch(e) { console.error(e); }
    
    document.getElementById('grilla-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('contenedor-grilla-diaria').innerHTML = '<p class="ayuda-texto">Seleccione un profesional y una fecha para ver su grilla horaria. Arrastre los turnos ocupados a los horarios libres para reprogramarlos rápidamente.</p>';
    irA('grilla-diaria');
}

window.cargarGrillaDiaria = async () => {
    const profId = parseInt(document.getElementById('grilla-profesional').value);
    const fecha = document.getElementById('grilla-fecha').value;
    
    if(!profId || !fecha) {
        alert("Seleccione profesional y fecha.");
        return;
    }
    
    const contenedor = document.getElementById('contenedor-grilla-diaria');
    contenedor.innerHTML = '<p>Cargando grilla...</p>';
    
    try {
        const [agendasResp, turnosResp] = await Promise.all([
            fetch(`/api/agendas?id_profesional=${profId}`),
            fetch('/api/turnos')
        ]);
        const agendas = await agendasResp.json();
        const todosTurnos = await turnosResp.json();
        
        // Formatear turnos
        const turnos = todosTurnos.map(t => ({
            ...t,
            fecha: new Date(t.fecha).toISOString().split('T')[0],
            hora: t.hora.substring(0, 5)
        })).filter(t => t.id_profesional === profId && t.fecha === fecha && t.estado !== 'cancelado');
        
        grillaData.agendas = agendas;
        grillaData.turnos = turnos;
        
        const agendaDia = agendas.find(a => a.fecha_atencion.substring(0, 10) === fecha);
        
        if(!agendaDia || !agendaDia.horarios || agendaDia.horarios.length === 0) {
            contenedor.innerHTML = '<div class="empty-state">El profesional no atiende en esta fecha o no tiene horarios configurados.</div>';
            return;
        }
        
        const horariosDisp = agendaDia.horarios.map(h => h.substring(0, 5));
        horariosDisp.sort();
        
        renderizarGrilla(horariosDisp, turnos);
    } catch(e) {
        console.error(e);
        contenedor.innerHTML = '<p class="msg-error">Error al cargar la grilla.</p>';
    }
}

function renderizarGrilla(horarios, turnos) {
    const contenedor = document.getElementById('contenedor-grilla-diaria');
    
    let html = '<div class="grilla-horaria-visual" style="display:flex; flex-direction:column; gap:0.5rem; background: var(--color-superficie); padding: 1rem; border-radius: 1rem; border: 1px solid var(--color-borde);">';
    
    horarios.forEach(hora => {
        const turno = turnos.find(t => t.hora === hora);
        
        if(turno) {
            // Ocupado - Draggable
            html += `
                <div class="slot-horario ocupado" data-hora="${hora}" style="display:flex; align-items:center; padding: 0.75rem; background: var(--color-primario-suave); border-left: 4px solid var(--color-primario); border-radius: 0.5rem;">
                    <div style="font-weight:bold; width: 60px;">${hora}</div>
                    <div draggable="true" ondragstart="window.dragStartTurno(event, ${turno.id_turno})" style="flex:1; cursor: grab; background: white; padding: 0.5rem 1rem; border-radius: 0.5rem; box-shadow: var(--sombra-suave); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${turno.pac_nombre} ${turno.pac_apellido}</strong> 
                            <span style="color: var(--color-texto-secundario); font-size: 0.85em; margin-left: 0.5rem;">(DNI: ${turno.pac_dni})</span>
                        </div>
                        <span style="font-size: 1.2rem; color: #cbd5e1;">⋮⋮</span>
                    </div>
                </div>
            `;
        } else {
            // Libre - Drop target
            html += `
                <div class="slot-horario libre" data-hora="${hora}" 
                     ondragover="window.dragOverTurno(event)" 
                     ondrop="window.dropTurno(event, '${hora}')" 
                     ondragenter="this.style.background='#f1f5f9';"
                     ondragleave="this.style.background='white';"
                     style="display:flex; align-items:center; padding: 0.75rem; background: white; border: 1px dashed var(--color-borde); border-radius: 0.5rem; min-height: 50px; transition: background 0.2s;">
                    <div style="font-weight:bold; width: 60px; color: var(--color-texto-secundario);">${hora}</div>
                    <div style="flex:1; color: #94a3b8; font-style: italic;">Disponible (Suelte un turno aquí para reprogramar)</div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    contenedor.innerHTML = html;
}

window.dragStartTurno = (ev, id_turno) => {
    ev.dataTransfer.setData("text/plain", id_turno);
    ev.dataTransfer.effectAllowed = "move";
}

window.dragOverTurno = (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
}

window.dropTurno = async (ev, nuevaHora) => {
    ev.preventDefault();
    // Restablecer color (opcional, aunque se recarga)
    ev.currentTarget.style.background = 'white';
    
    const id_turno = ev.dataTransfer.getData("text/plain");
    if(!id_turno) return;
    
    const fecha = document.getElementById('grilla-fecha').value;
    
    if(confirm(`¿Desea reprogramar el turno ID ${id_turno} a las ${nuevaHora}?`)) {
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
                // Refrescar
                window.cargarGrillaDiaria();
            } else {
                alert("Error al reprogramar el turno.");
            }
        } catch(e) {
            alert("Error de conexión");
        }
    }
}
