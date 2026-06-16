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
