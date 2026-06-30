import { irA } from './navigation.js';
import { mostrarDashboard } from './admin/dashboard.js';
import { mostrarAgendaProfesional } from './admin/profesionalesAgenda.js';

export function setupAuth() {
    document.getElementById('btn-login').addEventListener('click', procesarLogin);
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') procesarLogin();
    });
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
    document.getElementById('btn-prof-logout').addEventListener('click', cerrarSesion);
}

window.loginPaciente = async () => {
    const username = document.getElementById("login-paciente-dni").value.trim();
    const password = document.getElementById("login-paciente-password").value.trim();
    
    if (!username || !password) {
        alert("Por favor ingrese DNI y contraseña.");
        return;
    }

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.user.id_rol === 4 || data.user.id_paciente) {
                sessionStorage.setItem('pacienteAuth', JSON.stringify(data.user));
                irA("busqueda-dual");
            } else {
                alert("Esta cuenta no es de paciente.");
            }
        } else {
            const err = await resp.json();
            alert(err.error || "Datos incorrectos.");
        }
    } catch (e) {
        alert("Error de conexión.");
    }
};

window.registrarPaciente = async () => {
    const nombre = document.getElementById("reg-paciente-nombre").value.trim();
    const apellido = document.getElementById("reg-paciente-apellido").value.trim();
    const dni = document.getElementById("reg-paciente-dni").value.trim();
    const celular = document.getElementById("reg-paciente-celular").value.trim();
    const email = document.getElementById("reg-paciente-email").value.trim();
    const id_obra_social = document.getElementById("reg-paciente-obra-social").value;
    const password = document.getElementById("reg-paciente-password").value.trim();

    if (!nombre || !apellido || !dni || !password || !id_obra_social) {
        alert("Nombre, Apellido, DNI, Obra Social y Contraseña son obligatorios.");
        return;
    }

    try {
        const resp = await fetch('/api/registro-paciente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, dni, celular, email, password, id_obra_social })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            alert("Registro exitoso. Ahora puede ingresar.");
            document.getElementById("login-paciente-dni").value = dni;
            document.getElementById("login-paciente-password").value = "";
            irA("login-paciente");
        } else {
            alert(data.error || "Error en el registro.");
        }
    } catch (e) {
        alert("Error de conexión.");
    }
};

window.cerrarSesionPaciente = () => {
    sessionStorage.removeItem('pacienteAuth');
    window.irA('inicio');
};

export function intentarIngresoSecretaria() {
    const user = obtenerUsuarioLogueado();
    if (user) {
        if (user.id_rol === 1 || user.id_rol === 2) {
            mostrarDashboard();
        } else if (user.id_rol === 3) {
            mostrarAgendaProfesional();
        }
    } else {
        irA("login");
    }
}

export function obtenerUsuarioLogueado() {
    const uStr = localStorage.getItem('usuario');
    return uStr ? JSON.parse(uStr) : null;
}

async function procesarLogin() {
    const username = document.getElementById("login-usuario").value.trim();
    const password = document.getElementById("login-password").value.trim();
    
    if (!username || !password) {
        alert("Por favor ingrese usuario y contraseña.");
        return;
    }

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('usuario', JSON.stringify(data.user));
            
            // Acciones según el rol
            if (data.user.id_rol === 3) {
                // Médico / Profesional
                await mostrarAgendaProfesional();
            } else {
                // Admin o Secretaria
                await mostrarDashboard();
            }
        } else {
            const data = await resp.json();
            alert(data.error || "⚠️ Acceso Denegado");
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión al autenticar.");
    }
}

export function cerrarSesion() {
    localStorage.removeItem('usuario');
    irA("inicio");
}
