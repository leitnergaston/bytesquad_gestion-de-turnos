import { irA } from '../navigation.js';

let especialidadesCache = [];
let currentEspId = null;

export async function abrirGestionEspecialidades() {
    ocultarFormEsp();
    await cargarEspecialidades();
    renderListaEspecialidades();
    irA('gestion-especialidades');
}

export async function cargarEspecialidades() {
    try {
        const resp = await fetch('/api/especialidades');
        especialidadesCache = await resp.json();
    } catch(e) {
        console.error(e);
    }
}

export function renderListaEspecialidades() {
    const q = document.getElementById('buscar-esp-admin').value.toLowerCase().trim();
    const tbody = document.getElementById('tabla-esp-body');
    
    const filtradas = especialidadesCache.filter(esp => 
        esp.nombre_especialidad.toLowerCase().includes(q) || String(esp.id_especialidad).includes(q)
    );

    if (filtradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No se encontraron especialidades.</td></tr>';
        return;
    }

    tbody.innerHTML = filtradas.map(esp => `
        <tr>
            <td>#${esp.id_especialidad}</td>
            <td style="font-size: 1.5rem; text-align: center;">${esp.icono || '🩺'}</td>
            <td><strong>${esp.nombre_especialidad}</strong></td>
            <td class="acciones">
                <button class="btn-accion-sm" onclick="window.editarEspecialidad(${esp.id_especialidad}, '${esp.nombre_especialidad}', '${esp.icono || '🩺'}')">✏️</button>
                <button class="btn-accion-sm btn-rojo-sm" onclick="window.eliminarEspecialidad(${esp.id_especialidad})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

export function mostrarFormCrearEsp() {
    currentEspId = null;
    document.getElementById('esp-form-titulo').textContent = '➕ Nueva Especialidad';
    document.getElementById('esp-nombre-input').value = '';
    document.getElementById('esp-icono-input').value = '🩺';
    document.getElementById('form-gestion-esp').style.display = 'block';
}

window.editarEspecialidad = (id, nombre, icono) => {
    currentEspId = id;
    document.getElementById('esp-form-titulo').textContent = '✏️ Editar Especialidad';
    document.getElementById('esp-nombre-input').value = nombre;
    document.getElementById('esp-icono-input').value = icono || '🩺';
    document.getElementById('form-gestion-esp').style.display = 'block';
};

window.eliminarEspecialidad = async (id) => {
    if (confirm("¿Está seguro que desea eliminar esta Especialidad?")) {
        try {
            const resp = await fetch(`/api/especialidades/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                alert("Especialidad eliminada exitosamente.");
                await abrirGestionEspecialidades();
            } else {
                const data = await resp.json();
                alert(data.error || "Error al eliminar Especialidad.");
            }
        } catch(e) {
            console.error(e);
            alert("Error al conectar con el servidor.");
        }
    }
};

export function ocultarFormEsp() {
    document.getElementById('form-gestion-esp').style.display = 'none';
    document.getElementById('esp-nombre-input').value = '';
    document.getElementById('esp-icono-input').value = '🩺';
}

export function setupEspecialidades() {
    document.getElementById('btn-agregar-esp').addEventListener('click', mostrarFormCrearEsp);
    document.getElementById('btn-cancelar-esp').addEventListener('click', ocultarFormEsp);
    
    document.getElementById('buscar-esp-admin').addEventListener('input', renderListaEspecialidades);
    
    document.getElementById('form-esp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre_especialidad = document.getElementById('esp-nombre-input').value.trim();
        const icono = document.getElementById('esp-icono-input').value.trim();
        if (!nombre_especialidad) return;

        try {
            let resp;
            if (currentEspId) {
                // Editar
                resp = await fetch(`/api/especialidades/${currentEspId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre_especialidad, icono })
                });
            } else {
                // Crear
                resp = await fetch('/api/especialidades', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre_especialidad, icono })
                });
            }

            if (resp.ok) {
                alert("Especialidad guardada correctamente.");
                ocultarFormEsp();
                await abrirGestionEspecialidades();
            } else {
                const data = await resp.json();
                alert(data.error || "Error al guardar especialidad.");
            }
        } catch(e) {
            console.error(e);
            alert("Error al conectar con el servidor.");
        }
    });
}
