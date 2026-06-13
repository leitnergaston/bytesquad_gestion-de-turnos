// ========================================================================
// EMULACIÓN DE TABLAS DE BASE DE DATOS (MySQL / Flask Relacional)
// ========================================================================

// Nivel 1 (Maestras Básicas)
export let especialidadTabla = [];
export let obra_socialTabla = [];
export let rolTabla = [];

// Nivel 2 (Actores)
export let profesionalTabla = [];
export let pacienteTabla = [];
export let usuario_adminTabla = [];

// Nivel 3 (Negocio y Transacciones Core)
export let agenda_profesionalTabla = [];
export let turnoTabla = [];

// Generador de IDs simulando AUTO_INCREMENT (PKs)
export function generarId(tablaStr) {
    if (tablaStr === 'turno') return turnoTabla.length ? Math.max(...turnoTabla.map(t => t.id_turno)) + 1 : 1;
    if (tablaStr === 'paciente') return pacienteTabla.length ? Math.max(...pacienteTabla.map(p => p.id_paciente)) + 1 : 1;
    if (tablaStr === 'profesional') return profesionalTabla.length ? Math.max(...profesionalTabla.map(p => p.id_profesional)) + 1 : 1;
    if (tablaStr === 'agenda') return agenda_profesionalTabla.length ? Math.max(...agenda_profesionalTabla.map(a => a.id_agenda)) + 1 : 1;
    return new Date().getTime();
}

// Helpers que simulan JOINs de la base de datos (facilita la integración actual)
export function getTurnosDetallados() {
    return turnoTabla.map(t => {
        const pac = pacienteTabla.find(p => p.id_paciente === t.id_paciente);
        const prof = profesionalTabla.find(p => p.id_profesional === t.id_profesional);
        const esp = especialidadTabla.find(e => e.id_especialidad === prof.id_especialidad);
        const os = obra_socialTabla.find(o => o.id_obra_social === pac.id_obra_social);

        return {
            id_turno: t.id_turno,
            fecha: t.fecha,
            hora: t.hora,
            estado: t.estado,
            pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}` : 'Desconocido',
            pacienteDni: pac?.dni,
            profesionalNombre: prof ? `${prof.nombre} ${prof.apellido}` : 'Desconocido',
            id_profesional: t.id_profesional,
            especialidadNombre: esp?.nombre_especialidad,
            obraSocialNombre: os?.nombre || 'Particular'
        };
    });
}
