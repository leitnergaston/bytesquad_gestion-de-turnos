export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function irA(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    const nueva = document.getElementById(`pantalla-${idPantalla}`);
    if (nueva) {
        nueva.classList.add('activa');
        window.scrollTo(0, 0);
    }

    // Actualizar dinámicamente el botón de login en el header
    const btn = document.getElementById('btn-header-login');
    if (btn) {
        const uStr = localStorage.getItem('usuario');
        if (uStr) {
            try {
                const user = JSON.parse(uStr);
                btn.innerHTML = `👤 ${user.username.toUpperCase()}`;
            } catch (e) {
                btn.innerHTML = `👤 Iniciar Sesión`;
            }
        } else {
            btn.innerHTML = `👤 Iniciar Sesión`;
        }
    }
}
window.irA = irA;

// Navegación calendarios
window.changeMonth = (dir, calendarType) => {
    // Avoid date skipping by setting the day to 1 before changing month
    window.currentDate.setDate(1);
    window.currentDate.setMonth(window.currentDate.getMonth() + dir);
    
    switch (calendarType) {
        case 'paciente':
            import('./patient/booking.js').then(module => module.recargarCalendarioPaciente());
            break;
        case 'secretaria':
            import('./admin/crearTurno.js').then(module => module.actualizarCalendarioSecretaria());
            break;
        case 'consulta':
            import('./admin/consultas.js').then(module => {
                module.renderConsultaTurnosMes();
            });
            break;
        case 'gestion-turno':
            import('./admin/consultas.js').then(module => {
                module.prepararModificacionTurno(window.currentEditingTurnoId, true);
            });
            break;
        case 'agenda-multiselect':
            import('./admin/agendas.js').then(module => module.inicializarConfigAgenda());
            break;
        case 'profesional':
            import('./admin/profesionalesAgenda.js').then(module => module.renderizarTurnosProfesional());
            break;
    }
};
