export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function irA(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    const nueva = document.getElementById(`pantalla-${idPantalla}`);
    if (nueva) {
        nueva.classList.add('activa');
        window.scrollTo(0, 0);
    }
}
window.irA = irA;

// Navegación calendarios
window.changeMonth = (dir, calendarType) => {
    window.currentDate.setMonth(window.currentDate.getMonth() + dir);
    
    switch (calendarType) {
        case 'paciente':
            import('./patient/booking.js').then(module => module.generarCalendarioPaciente());
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
    }
};
