import { irA } from '../navigation.js';

let secretariasCache = [];
let currentSecretariaId = null;

export function setupGestionSecretarias() {
    document.getElementById("form-gestion-secretaria").addEventListener("submit", guardarSecretaria);
    document.getElementById("btn-cancelar-sec").addEventListener("click", () => {
        cargarFormulario(null);
    });
}

export async function abrirGestionSecretarias() {
    await cargarSecretarias();
    cargarFormulario(null);
    irA("gestion-secretarias");
}

async function cargarSecretarias() {
    try {
        const resp = await fetch("/api/secretarias");
        secretariasCache = await resp.json();
        renderListaSecretarias();
    } catch(e) {
        console.error(e);
        alert("Error cargando secretarias.");
    }
}

function renderListaSecretarias() {
    const cont = document.getElementById("lista-secretarias");
    if (secretariasCache.length === 0) {
        cont.innerHTML = "<p class='empty-state'>No hay secretarias registradas.</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>DNI</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${secretariasCache.map(s => `
                    <tr>
                        <td>${s.dni}</td>
                        <td>${s.nombre} ${s.apellido}</td>
                        <td>
                            <span class="badge ${s.estado === 'activo' ? 'badge-primary' : 'badge-secondary'}">
                                ${s.estado.toUpperCase()}
                            </span>
                        </td>
                        <td class="acciones">
                            <button class="btn-accion-sm" onclick="window.editarSecretaria(${s.id_secretaria})">✏️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    cont.innerHTML = html;
}

window.editarSecretaria = (id) => {
    const sec = secretariasCache.find(s => s.id_secretaria === id);
    if (sec) cargarFormulario(sec);
}

function cargarFormulario(sec) {
    const form = document.getElementById("form-gestion-secretaria");
    const titulo = document.getElementById("secretaria-form-titulo");
    form.reset();

    if (sec) {
        currentSecretariaId = sec.id_secretaria;
        titulo.textContent = "✏️ Editando Secretaria";
        document.getElementById("sec-nombre").value = sec.nombre;
        document.getElementById("sec-apellido").value = sec.apellido;
        document.getElementById("sec-dni").value = sec.dni;
        document.getElementById("sec-estado").value = sec.estado;
    } else {
        currentSecretariaId = null;
        titulo.textContent = "➕ Nueva Secretaria";
    }
}

async function guardarSecretaria(e) {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById("sec-nombre").value.trim(),
        apellido: document.getElementById("sec-apellido").value.trim(),
        dni: document.getElementById("sec-dni").value.trim(),
        estado: document.getElementById("sec-estado").value,
        password: document.getElementById("sec-password").value.trim()
    };

    if (!datos.nombre || !datos.apellido || !datos.dni) {
        alert("Nombre, Apellido y DNI son obligatorios.");
        return;
    }

    if (!currentSecretariaId && !datos.password) {
        alert("La contraseña es obligatoria para nuevas secretarias.");
        return;
    }

    try {
        const method = currentSecretariaId ? "PUT" : "POST";
        const url = currentSecretariaId ? `/api/secretarias/${currentSecretariaId}` : `/api/secretarias`;

        const resp = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        const result = await resp.json();
        
        if (resp.ok) {
            alert(currentSecretariaId ? "Secretaria actualizada." : "Secretaria creada.");
            await cargarSecretarias();
            cargarFormulario(null);
        } else {
            alert("Error: " + result.error);
        }
    } catch(e) {
        console.error(e);
        alert("Error de conexión.");
    }
}
