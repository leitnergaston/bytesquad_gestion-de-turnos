import { irA } from '../navigation.js';
import { poblarSelect } from '../utils.js';

let currentPacienteId = null;
let pacientesCache = [];
let obrasSocialesCache = [];

export function setupGestionPacientes() {
    document.getElementById('btn-nuevo-paciente').addEventListener('click', () => prepararFormPaciente());
    
    document.getElementById('buscar-paciente-admin').addEventListener('input', (e) => {
        renderizarListaPacientes(e.target.value);
    });

    document.getElementById('form-gestion-paciente').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarPaciente();
    });
    document.getElementById('btn-cancelar-paciente').addEventListener('click', () => {
        document.getElementById("form-paciente-container").style.display = 'none';
    });
}

export async function abrirGestionPacientes() {
    document.getElementById('buscar-paciente-admin').value = '';
    await cargarObrasSociales();
    await cargarFilaPacientes();
    document.getElementById("form-paciente-container").style.display = 'none';
    irA("gestion-pacientes");
}

async function cargarObrasSociales() {
    try {
        const res = await fetch('/api/obras_sociales');
        if (res.ok) obrasSocialesCache = await res.json();
    } catch (e) { console.error(e); }
}

async function cargarFilaPacientes() {
    try {
        const res = await fetch('/api/pacientes');
        if (res.ok) pacientesCache = await res.json();
        renderizarListaPacientes();
    } catch (e) {
        console.error(e);
        document.getElementById("tabla-pacientes-body").innerHTML = '<tr><td colspan="7" class="msg-error">Error al cargar pacientes</td></tr>';
    }
}

function renderizarListaPacientes(filtro = '') {
    const tbody = document.getElementById("tabla-pacientes-body");
    const term = filtro.toLowerCase().trim();
    
    const filtrados = pacientesCache.filter(p => {
        const full = `${p.nombre} ${p.apellido}`.toLowerCase();
        const dni = p.dni ? String(p.dni).toLowerCase() : '';
        return full.includes(term) || dni.includes(term);
    });

    tbody.innerHTML = filtrados.map(p => {
        return `
            <tr>
                <td>${p.id_paciente}</td>
                <td><strong>${p.nombre} ${p.apellido}</strong></td>
                <td>${p.dni}</td>
                <td>${p.celular || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>${p.obra_social_nombre || 'Particular'}</td>
                <td class="acciones">
                    <button class="btn-accion-sm" onclick="window.prepararEdicionPaciente(${p.id_paciente})">✏️</button>
                    <button class="btn-accion-sm btn-rojo-sm" onclick="window.eliminarPaciente(${p.id_paciente})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.prepararEdicionPaciente = (id) => {
    const paciente = pacientesCache.find(p => p.id_paciente === id);
    if (paciente) {
        prepararFormPaciente(paciente);
    }
}

function prepararFormPaciente(paciente = null) {
    const formContainer = document.getElementById("form-paciente-container");
    const form = document.getElementById("form-gestion-paciente");
    const titulo = document.getElementById("paciente-form-titulo");

    form.reset();
    const opcionesOS = obrasSocialesCache.map(os => ({ value: os.id_obra_social, text: os.nombre }));
    poblarSelect("pac-obra-social", opcionesOS);

    if (paciente) {
        currentPacienteId = paciente.id_paciente;
        titulo.textContent = "✏️ Editando Paciente";
        document.getElementById("pac-nombre").value = paciente.nombre;
        document.getElementById("pac-apellido").value = paciente.apellido;
        document.getElementById("pac-dni").value = paciente.dni;
        document.getElementById("pac-celular").value = paciente.celular || '';
        document.getElementById("pac-mail").value = paciente.email || '';
        document.getElementById("pac-obra-social").value = paciente.id_obra_social;
    } else {
        currentPacienteId = null;
        titulo.textContent = "➕ Nuevo Paciente";
    }

    formContainer.style.display = 'block';
}

async function guardarPaciente() {
    const datos = {
        nombre: document.getElementById("pac-nombre").value.trim(),
        apellido: document.getElementById("pac-apellido").value.trim(),
        dni: document.getElementById("pac-dni").value.trim(),
        celular: document.getElementById("pac-celular").value.trim(),
        email: document.getElementById("pac-mail").value.trim(),
        id_obra_social: parseInt(document.getElementById("pac-obra-social").value)
    };

    if (!datos.nombre || !datos.apellido || !datos.dni) {
        alert("Nombre, Apellido y DNI son obligatorios.");
        return;
    }

    try {
        if (currentPacienteId) { // Actualizar
            const resp = await fetch(`/api/pacientes/${currentPacienteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if(resp.ok) alert(`✅ Paciente actualizado exitosamente.`);
        } else { // Crear
            const resp = await fetch(`/api/pacientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if(resp.ok) alert(`✅ Paciente agregado exitosamente.`);
        }
        await cargarFilaPacientes();
        document.getElementById("form-paciente-container").style.display = 'none';
    } catch(e) {
        alert("Error al guardar el paciente.");
        console.error(e);
    }
}

window.eliminarPaciente = async (id) => {
    const paciente = pacientesCache.find(p => p.id_paciente === id);
    if (paciente && confirm(`¿Seguro que desea eliminar a ${paciente.nombre} ${paciente.apellido}?`)) {
        try {
            const resp = await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
            if(resp.ok) {
                await cargarFilaPacientes();
            } else {
                alert("Error al eliminar paciente.");
            }
        } catch(e) {
            console.error(e);
            alert("Error de conexión al servidor.");
        }
    }
};
