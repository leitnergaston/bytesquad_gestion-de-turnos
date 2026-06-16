import { irA } from './navigation.js';
import { setupAuth, intentarIngresoSecretaria } from './auth.js';
import { iniciarReserva, cancelarReserva, generarCalendarioPaciente } from './patient/booking.js';
import { mostrarDashboard } from './admin/dashboard.js';
import { abrirConsultaTurnos } from './admin/consultas.js';
import { abrirGestionPacientes, setupGestionPacientes } from './admin/pacientes.js';
import { abrirGestionProfesionales, setupGestionProfesionales } from './admin/profesionales.js';
import { abrirConfiguracionAgenda, setupConfiguracionAgenda } from './admin/agendas.js';
import { abrirCrearTurno } from './admin/crearTurno.js';
import { abrirGestionObrasSociales, setupObrasSociales } from './admin/obrasSociales.js';
import { abrirGestionEspecialidades, setupEspecialidades } from './admin/especialidades.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ========= VARIABLES GLOBALES =========
    window.currentDate = new Date(); // Usado por los calendarios
    window.MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // ========= NAVEGACIÓN PRINCIPAL =========
    document.getElementById('btn-reservar-turno').addEventListener('click', iniciarReserva);
    
    const btnHeaderLogin = document.getElementById('btn-header-login');
    if (btnHeaderLogin) {
        btnHeaderLogin.addEventListener('click', intentarIngresoSecretaria);
    }

    document.querySelectorAll('.btn-volver-inicio, #logo').forEach(btn => {
        btn.addEventListener('click', () => irA('inicio'));
    });
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', cancelarReserva);
    });
    
    // ========= FLUJO PACIENTE =========
    // La mayoría se inicia desde booking.js

    // ========= LOGIN Y DASHBOARD SECRETARIA =========
    setupAuth();
    document.getElementById('btn-dash-consultar').addEventListener('click', abrirConsultaTurnos);
    document.getElementById('btn-dash-profesionales').addEventListener('click', abrirGestionProfesionales);
    document.getElementById('btn-dash-agendas').addEventListener('click', abrirConfiguracionAgenda);
    document.getElementById('btn-dash-pacientes').addEventListener('click', abrirGestionPacientes);
    document.getElementById('btn-dash-nuevo-turno').addEventListener('click', abrirCrearTurno);
    document.getElementById('btn-dash-obras-sociales').addEventListener('click', abrirGestionObrasSociales);
    document.getElementById('btn-dash-especialidades').addEventListener('click', abrirGestionEspecialidades);
    document.querySelectorAll('.btn-volver-dash').forEach(btn => {
        btn.addEventListener('click', mostrarDashboard);
    });

    // ========= CONFIGURACIÓN DE MÓDULOS ADMIN =========
    setupGestionPacientes();
    setupGestionProfesionales();
    setupConfiguracionAgenda();
    setupObrasSociales();
    setupEspecialidades();

    // ========= INICIO =========
    irA('inicio');
});
