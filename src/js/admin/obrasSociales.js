import { irA } from '../navigation.js';

let obrasSocialesCache = [];
let currentOSId = null;

export async function abrirGestionObrasSociales() {
    ocultarFormOS();
    await cargarObrasSociales();
    renderListaObrasSociales();
    irA('gestion-obras-sociales');
}

export async function cargarObrasSociales() {
    try {
        const resp = await fetch('/api/obras_sociales');
        obrasSocialesCache = await resp.json();
    } catch(e) {
        console.error(e);
    }
}

export function renderListaObrasSociales() {
    const q = document.getElementById('buscar-os-admin').value.toLowerCase().trim();
    const tbody = document.getElementById('tabla-os-body');
    
    const filtradas = obrasSocialesCache.filter(os => 
        os.nombre.toLowerCase().includes(q) || String(os.id_obra_social).includes(q)
    );

    if (filtradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No se encontraron obras sociales.</td></tr>';
        return;
    }

    tbody.innerHTML = filtradas.map(os => `
        <tr>
            <td>#${os.id_obra_social}</td>
            <td><strong>${os.nombre}</strong></td>
            <td class="acciones">
                <button class="btn-accion-sm" onclick="window.editarObraSocial(${os.id_obra_social}, '${os.nombre}')">✏️</button>
                <button class="btn-accion-sm btn-rojo-sm" onclick="window.eliminarObraSocial(${os.id_obra_social})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

export function mostrarFormCrearOS() {
    currentOSId = null;
    document.getElementById('os-form-titulo').textContent = '➕ Nueva Obra Social';
    document.getElementById('os-nombre-input').value = '';
    document.getElementById('form-gestion-os').style.display = 'block';
}

window.editarObraSocial = (id, nombre) => {
    currentOSId = id;
    document.getElementById('os-form-titulo').textContent = '✏️ Editar Obra Social';
    document.getElementById('os-nombre-input').value = nombre;
    document.getElementById('form-gestion-os').style.display = 'block';
};

window.eliminarObraSocial = async (id) => {
    if (confirm("¿Está seguro que desea eliminar esta Obra Social?")) {
        try {
            const resp = await fetch(`/api/obras_sociales/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                alert("Obra Social eliminada exitosamente.");
                await abrirGestionObrasSociales();
            } else {
                const data = await resp.json();
                alert(data.error || "Error al eliminar Obra Social.");
            }
        } catch(e) {
            console.error(e);
            alert("Error al conectar con el servidor.");
        }
    }
};

export function ocultarFormOS() {
    document.getElementById('form-gestion-os').style.display = 'none';
    document.getElementById('os-nombre-input').value = '';
}

export function setupObrasSociales() {
    document.getElementById('btn-agregar-os').addEventListener('click', mostrarFormCrearOS);
    document.getElementById('btn-cancelar-os').addEventListener('click', ocultarFormOS);
    
    document.getElementById('buscar-os-admin').addEventListener('input', renderListaObrasSociales);
    
    document.getElementById('form-os-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('os-nombre-input').value.trim();
        if (!nombre) return;

        try {
            let resp;
            if (currentOSId) {
                // Editar
                resp = await fetch(`/api/obras_sociales/${currentOSId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre })
                });
            } else {
                // Crear
                resp = await fetch('/api/obras_sociales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre })
                });
            }

            if (resp.ok) {
                alert("Guardado correctamente.");
                ocultarFormOS();
                await abrirGestionObrasSociales();
            } else {
                const data = await resp.json();
                alert(data.error || "Error al guardar Obra Social.");
            }
        } catch(e) {
            console.error(e);
            alert("Error al conectar con el servidor.");
        }
    });
}
