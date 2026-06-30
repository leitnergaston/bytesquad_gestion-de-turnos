import { irA } from '../navigation.js';

export async function mostrarDashboard() {
    // 1. Validar acceso por rol
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    const rol = user.id_rol; // 1 = Administrador, 2 = Secretaria

    const btnProfs = document.getElementById('btn-dash-profesionales');
    const btnOS = document.getElementById('btn-dash-obras-sociales');
    const btnEsp = document.getElementById('btn-dash-especialidades');
    const btnSec = document.getElementById('btn-dash-secretarias');

    if (rol === 1) {
        // Administrador ve todos los botones
        if (btnProfs) btnProfs.style.display = 'flex';
        if (btnOS) btnOS.style.display = 'flex';
        if (btnEsp) btnEsp.style.display = 'flex';
        if (btnSec) btnSec.style.display = 'flex';
    } else {
        // Secretaria NO ve profesionales, obras sociales ni especialidades
        if (btnProfs) btnProfs.style.display = 'none';
        if (btnOS) btnOS.style.display = 'none';
        if (btnEsp) btnEsp.style.display = 'none';
        if (btnSec) btnSec.style.display = 'none';
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    const cont = document.getElementById('dash-proximos-turnos');
    cont.innerHTML = '<p>Cargando dashboard...</p>';
    
    try {
        const [respTurnos, respPac, respProf] = await Promise.all([
            fetch('/api/turnos'),
            fetch('/api/pacientes'),
            fetch('/api/profesionales')
        ]);
        
        const dTurnos = await respTurnos.json();
        const pacientes = await respPac.json();
        const profesionales = await respProf.json();
        
        const turnosHoy = dTurnos.filter(t => t.fecha === hoyStr && t.estado !== 'Cancelado');
        
        document.getElementById('dash-stat-pacientes').textContent = pacientes.length;
        document.getElementById('dash-stat-profesionales').textContent = profesionales.length;
        document.getElementById('dash-stat-turnos-hoy').textContent = turnosHoy.length;

        if (turnosHoy.length === 0) {
            cont.innerHTML = '<div class="empty-state">☕️ No hay turnos para hoy.</div>';
        } else {
            cont.innerHTML = turnosHoy
                .sort((a,b) => a.hora.localeCompare(b.hora))
                .map(t => `
                    <div class="turno-item">
                        <div class="turno-item-hora">${t.hora.substring(0,5)}</div>
                        <div class="turno-item-info">
                            <strong>${t.pac_nombre} ${t.pac_apellido}</strong>
                            <span>${t.prof_nombre} ${t.prof_apellido}</span>
                        </div>
                        <span class="badge-estado estado-${t.estado.toLowerCase()}">${t.estado}</span>
                    </div>
                `).join('');
        }
    } catch(e) {
        console.error(e);
        cont.innerHTML = '<div class="msg-error">Error al cargar dashboard</div>';
    }

    irA('secretaria-menu');
}

export async function buscarPacienteSecretaria() {
    const query = document.getElementById("busqueda-paciente").value.toLowerCase().trim();
    if (query.length < 3) return;

    const contenedor = document.getElementById("resultados-busqueda");
    contenedor.innerHTML = '<p>Buscando...</p>';

    try {
        const respPac = await fetch('/api/pacientes');
        const pacientes = await respPac.json();
        const res = pacientes.filter(p => 
            p.dni.includes(query) || 
            p.apellido.toLowerCase().includes(query) || 
            p.nombre.toLowerCase().includes(query)
        );

        if (res.length > 0) {
            contenedor.innerHTML = res.map(p => {
                return `
                    <div class="resultado-item flex-between" style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <div><strong>${p.nombre} ${p.apellido}</strong> (DNI: ${p.dni}) - OS: ${p.nombre_obra_social || 'Particular'}</div>
                        <button class="btn-principal" onclick="window.seleccionarPacienteEnviadoParaTurno(${p.id_paciente})">Asignar Turno</button>
                    </div>
                `;
            }).join('');
        } else {
            contenedor.innerHTML = `
                <div class="empty-state">
                   <p>Paciente no encontrado.</p>
                   <button class="btn-secundario" onclick="window.mostrarFormCrearPaciente()">➕ Crear Paciente Rápido</button>
                </div>
            `;
        }
    } catch(e) {
        contenedor.innerHTML = '<div class="msg-error">Error en la búsqueda</div>';
    }
}

window.seleccionarPacienteEnviadoParaTurno = (id) => {
    alert(`Paciente ID ${id} seleccionado. Usa el menú "Crear Turno Manual".`);
};

window.mostrarFormCrearPaciente = () => {
    document.getElementById("form-creacion-rapida-paciente").style.display = 'block';
};

window.ocultarFormCrearPaciente = () => {
    document.getElementById("form-creacion-rapida-paciente").style.display = 'none';
};

window.crearPacienteSecretaria = async () => {
    const nombre = document.getElementById("rapido-nombre").value.trim();
    const apellido = document.getElementById("rapido-apellido").value.trim();
    const dni = document.getElementById("rapido-dni").value.trim();
    
    if(!nombre || !apellido || !dni) {
         alert("Complete nombre, apellido y DNI.");
         return;
    }

    try {
        const payload = { nombre, apellido, dni, celular: '', correo: '', id_obra_social: 1 };
        const resp = await fetch("/api/pacientes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            alert(`Paciente ${nombre} ${apellido} creado.`);
            window.ocultarFormCrearPaciente();
            
            document.getElementById("rapido-nombre").value = '';
            document.getElementById("rapido-apellido").value = '';
            document.getElementById("rapido-dni").value = '';
            
            document.getElementById("busqueda-paciente").value = dni;
            buscarPacienteSecretaria();
        } else {
            alert("El DNI ya existe o hubo un error al crear.");
        }
    } catch(e) {
         alert("Error de conexión al crear paciente.");
    }
};

export function setupDashboard() {
    window.buscarPacienteSecretaria = buscarPacienteSecretaria;
}
