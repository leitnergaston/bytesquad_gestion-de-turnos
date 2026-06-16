import { irA } from '../navigation.js';

let turnosProfesional = [];

export async function mostrarAgendaProfesional() {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!user || !user.id_profesional) {
        alert("Error: No se encontró el médico asociado al usuario.");
        irA('inicio');
        return;
    }

    document.getElementById('prof-nombre-display').textContent = `Dr/a. ${user.profesional_nombre || user.username}`;
    
    // Obtener los turnos
    try {
        const resp = await fetch('/api/turnos');
        const todosLosTurnos = await resp.json();
        turnosProfesional = todosLosTurnos.filter(t => t.id_profesional === user.id_profesional);
        renderizarTurnosProfesional();
        irA('profesional-agenda');
    } catch (e) {
        console.error(e);
        document.getElementById('tabla-profesional-turnos-body').innerHTML = '<tr><td colspan="7" class="msg-error">Error al cargar turnos asignados.</td></tr>';
        irA('profesional-agenda');
    }
}

export function renderizarTurnosProfesional() {
    const year = window.currentDate.getFullYear();
    const month = window.currentDate.getMonth();
    
    document.getElementById('prof-mes-titulo').textContent = `${window.MESES[month]} ${year}`;
    const tbody = document.getElementById('tabla-profesional-turnos-body');
    
    const mesPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const turnosMes = turnosProfesional.filter(t => t.fecha.startsWith(mesPrefix));
    
    if (turnosMes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">☕️ No tiene turnos asignados para este mes.</td></tr>';
        return;
    }

    // Ordenar turnos por fecha hora
    turnosMes.sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    tbody.innerHTML = turnosMes.map(t => {
        const [y, m, d] = t.fecha.split('-');
        const fechaDisplay = `${d}/${m}`;
        const horaDisplay = t.hora.substring(0, 5);
        return `
            <tr>
                <td><strong>${fechaDisplay}</strong></td>
                <td><span class="badge-hora">${horaDisplay} hs</span></td>
                <td>${t.pac_nombre} ${t.pac_apellido}</td>
                <td>${t.pac_dni}</td>
                <td>
                   <div style="font-size: 0.85rem; color: #94a3b8;">
                      📞 ${t.celular || 'No tiene'} <br>
                      ✉️ ${t.email || 'No tiene'}
                   </div>
                </td>
                <td><span class="badge-os">${t.obra_social_nombre || 'Particular'}</span></td>
                <td><span class="badge-estado estado-${t.estado.toLowerCase()}">${t.estado}</span></td>
            </tr>
        `;
    }).join('');
}
