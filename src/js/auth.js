import { irA } from './navigation.js';
import { mostrarDashboard } from './admin/dashboard.js';

let secretariaLogueada = false;

export function setupAuth() {
    document.getElementById('btn-login').addEventListener('click', procesarLogin);
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') procesarLogin();
    });
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
}

export function intentarIngresoSecretaria() {
    if (secretariaLogueada) {
        mostrarDashboard();
    } else {
        irA("login");
    }
}

function procesarLogin() {
    const user = document.getElementById("login-usuario").value;
    const pass = document.getElementById("login-password").value;
    if (user === "admin" && pass === "123") {
        secretariaLogueada = true;
        mostrarDashboard();
    } else {
        alert("⚠️ Acceso Denegado");
    }
}

function cerrarSesion() {
    secretariaLogueada = false;
    irA("inicio");
}
