import { irA } from '../navigation.js';
import { poblarSelect, nombreCompleto } from '../utils.js';

let currentProfId = null;
let especialidadesCache = [];
let profesionalesCache = [];

export function setupGestionProfesionales() {
    document.getElementById('btn-agregar-profesional').addEventListener('click', () => toggleFormAgregarProfesional(true));
    document.getElementById('btn-cancelar-prof').addEventListener('click', () => toggleFormAgregarProfesional(false));
    
    document.getElementById('buscar-profesional-admin').addEventListener('input', (e) => {
        renderListaProfesionales(e.target.value);
    });

    document.getElementById('form-agregar-profesional').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarNuevoProfesional();
    });
}

export async function abrirGestionProfesionales() {
    document.getElementById('buscar-profesional-admin').value = '';
    await cargarEspecialidades();
    await renderizarListaProfesionales();
    toggleFormAgregarProfesional(false);
    irA("gestion-profesionales");
}

async function cargarEspecialidades() {
    try {
        const res = await fetch('/api/especialidades');
        if(res.ok) especialidadesCache = await res.json();
    } catch(e) { console.error(e); }
}

async function renderizarListaProfesionales() {
    const container = document.getElementById("lista-profesionales");
    container.innerHTML = '<p>Cargando profesionales...</p>';
    
    try {
        const resp = await fetch('/api/profesionales');
        if(!resp.ok) throw new Error("Network response was not ok");
        profesionalesCache = await resp.json();
        renderListaProfesionales();
    } catch (e) {
        container.innerHTML = '<p class="msg-error">Error al cargar la lista de profesionales.</p>';
        console.error(e);
    }
}

function renderListaProfesionales(filtro = '') {
    const container = document.getElementById("lista-profesionales");
    const term = filtro.toLowerCase().trim();
    
    const filtrados = profesionalesCache.filter(prof => {
        const full = `${prof.nombre} ${prof.apellido}`.toLowerCase();
        const dni = prof.dni ? String(prof.dni).toLowerCase() : '';
        return full.includes(term) || dni.includes(term);
    });
    
    container.innerHTML = filtrados.map(prof => {
        return `
            <div class="card-profesional">
                <div class="prof-avatar">👨‍⚕️</div>
                <div class="prof-info">
                    <strong>${prof.nombre} ${prof.apellido}</strong> <span style="color:#666; font-size:0.85em;">(DNI: ${prof.dni || '-'})</span>
                    <span>🔬 ${prof.nombre_especialidad || 'Sin especialidad'}</span>
                    <span>📧 ${prof.correo || 'Sin correo'}</span>
                </div>
                <div class="prof-acciones">
                    <button class="btn-accion-sm" onclick="window.editarProfesional(${prof.id_profesional})">✏️</button>
                    <button class="btn-accion-sm" onclick="window.editarAgendaDesdeProfesionales(${prof.id_profesional})">📅</button>
                    <button class="btn-accion-sm btn-rojo-sm" onclick="window.eliminarProfesional(${prof.id_profesional})">🗑️</button>
                </div>
            </div>
        `;
    }).join('') || '<p class="empty-state">No se encontraron profesionales.</p>';
}

function toggleFormAgregarProfesional(show, prof=null) {
    const formContainer = document.getElementById("form-agregar-profesional");
    const form = document.getElementById("form-agregar-profesional-form");
    const titulo = document.getElementById("prof-form-titulo");
    
    formContainer.style.display = show ? 'block' : 'none';
    if (show) {
        if (form) form.reset();
        const opcionesEsp = especialidadesCache.map(e => ({ value: e.id_especialidad, text: e.nombre_especialidad }));
        poblarSelect("nuevo-prof-especialidad", opcionesEsp);
        
        if (prof) {
            currentProfId = prof.id_profesional;
            if (titulo) titulo.textContent = "✏️ Editar Profesional";
            document.getElementById("nuevo-prof-nombre").value = prof.nombre;
            document.getElementById("nuevo-prof-apellido").value = prof.apellido;
            document.getElementById("nuevo-prof-dni").value = prof.dni || '';
            document.getElementById("nuevo-prof-celular").value = prof.celular || '';
            document.getElementById("nuevo-prof-mail").value = prof.correo || '';
            document.getElementById("nuevo-prof-especialidad").value = prof.id_especialidad;
        } else {
            currentProfId = null;
            if (titulo) titulo.textContent = "➕ Nuevo Profesional";
        }
    } else {
        currentProfId = null;
    }
}

window.editarProfesional = (id) => {
    const prof = profesionalesCache.find(p => p.id_profesional === id);
    if (prof) toggleFormAgregarProfesional(true, prof);
};

async function guardarNuevoProfesional() {
    const nuevo = {
        dni: document.getElementById("nuevo-prof-dni").value.trim(),
        nombre: document.getElementById("nuevo-prof-nombre").value.trim(),
        apellido: document.getElementById("nuevo-prof-apellido").value.trim(),
        id_especialidad: parseInt(document.getElementById("nuevo-prof-especialidad").value),
        celular: document.getElementById("nuevo-prof-celular").value.trim(),
        correo: document.getElementById("nuevo-prof-mail").value.trim(),
    };

    if (!nuevo.nombre || !nuevo.apellido) {
        alert("Nombre y Apellido son obligatorios.");
        return;
    }

    try {
        if (currentProfId) {
            const resp = await fetch(`/api/profesionales/${currentProfId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevo)
            });
            if(resp.ok) alert(`✅ ${nuevo.nombre} ${nuevo.apellido} actualizado exitosamente.`);
        } else {
            const resp = await fetch(`/api/profesionales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevo)
            });
            if(resp.ok) alert(`✅ ${nuevo.nombre} ${nuevo.apellido} agregado exitosamente.`);
        }
        await renderizarListaProfesionales();
        toggleFormAgregarProfesional(false);
    } catch(e) {
        alert("Error al guardar el profesional.");
        console.error(e);
    }
}

window.eliminarProfesional = async (id) => {
    const prof = profesionalesCache.find(p => p.id_profesional === id);
    if (prof && confirm(`¿Eliminar a ${prof.nombre} ${prof.apellido}? Esta acción no se puede deshacer.`)) {
        try {
            const resp = await fetch(`/api/profesionales/${id}`, { method: 'DELETE' });
            if(resp.ok) {
                await renderizarListaProfesionales();
            } else {
                alert("Error al eliminar profesional.");
            }
        } catch(e) {
            console.error(e);
            alert("Error al conectarse con el servidor.");
        }
    }
};
