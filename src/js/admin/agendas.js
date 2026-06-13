import { irA } from '../navigation.js';
import { horariosBD } from '../config.js';
import { poblarSelect } from '../utils.js';
import { _generarCalendario } from '../components/calendar.js';

let seleccionDiasTemp = [];
let seleccionHorariosTemp = [];
let currentProfId = null;
let profesionalesCache = [];

export function setupConfiguracionAgenda() {
    document.getElementById('agenda-profesional').addEventListener('change', inicializarConfigAgenda);
}

export async function abrirConfiguracionAgenda() {
    const sel = document.getElementById("agenda-profesional");
    poblarSelect(sel, [], null, "Cargando...");
    
    try {
        const resp = await fetch('/api/profesionales');
        if (resp.ok) {
            profesionalesCache = await resp.json();
            const profOptions = profesionalesCache.map(p => ({ value: p.id_profesional, text: `${p.nombre} ${p.apellido}` }));
            poblarSelect(sel, profOptions, null, "Seleccione profesional...");
        }
    } catch(e) {
        console.error("Error al cargar profesionales", e);
        poblarSelect(sel, [], null, "Error al cargar");
    }

    document.getElementById("agenda-dias-seccion").style.display = "none";
    document.getElementById("agenda-horarios-seccion").style.display = "none";
    document.getElementById("agenda-resumen-seccion").style.display = "none";
    irA("agenda");
}

export async function inicializarConfigAgenda() {
    const profValor = document.getElementById("agenda-profesional").value;
    const diasSeccion = document.getElementById("agenda-dias-seccion");
    const horariosSeccion = document.getElementById("agenda-horarios-seccion");
    const resumenSeccion = document.getElementById("agenda-resumen-seccion");

    if (!profValor) {
        diasSeccion.style.display = "none";
        horariosSeccion.style.display = "none";
        resumenSeccion.style.display = "none";
        return;
    }

    currentProfId = parseInt(profValor);
    
    try {
        const res = await fetch(`/api/agendas?id_profesional=${currentProfId}`);
        const agendaProf = await res.json();
        
        // El backend devuelve fechas en formato ISO con hora (ej: "2026-07-06T00:00:00.000Z"), formatear a YYYY-MM-DD
        seleccionDiasTemp = agendaProf.map(a => new Date(a.fecha_atencion).toISOString().split('T')[0]);
        
        let horariosGlobales = [];
        agendaProf.forEach(a => horariosGlobales.push(...(a.horarios || [])));
        
        // Quitar la parte de segundos si la API devuelve "09:00:00" en lugar de "09:00"
        horariosGlobales = horariosGlobales.map(h => h.substring(0, 5));
        
        seleccionHorariosTemp = horariosGlobales.length > 0 ? [...new Set(horariosGlobales)] : [...horariosBD];
        
        diasSeccion.style.display = "block";
        horariosSeccion.style.display = "block";
        resumenSeccion.style.display = "block";

        renderizarCalendarioMultiselect();
        renderizarGrillaHorariosCheckbox();
        renderizarResumenAgenda();
    } catch(e) {
        console.error("Error al cargar agenda", e);
        alert("Error al cargar la agenda del profesional.");
    }
}

function renderizarCalendarioMultiselect() {
    const year = window.currentDate.getFullYear();
    const month = window.currentDate.getMonth();
    document.querySelector("#pantalla-agenda .calendario-titulo-texto").textContent = `${window.MESES[month]} ${year}`;

    const container = document.getElementById("calendario-multiselect-dias");
    const allDaysInMonthForAgenda = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
        const d = i + 1;
        const dd = String(d).padStart(2, '0');
        const mm = String(month + 1).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    });

    _generarCalendario(container, year, month, allDaysInMonthForAgenda, (d, fechaStr, el) => {
        el.classList.toggle('seleccionado');
        toggleDiaSeleccion(fechaStr);
    }, 'multi', seleccionDiasTemp);
}


function toggleDiaSeleccion(fechaStr) {
    const idx = seleccionDiasTemp.indexOf(fechaStr);
    if (idx > -1) {
        seleccionDiasTemp.splice(idx, 1);
    } else {
        seleccionDiasTemp.push(fechaStr);
    }
}

window.limpiarSeleccionDias = () => {
    const year = window.currentDate.getFullYear();
    const month = window.currentDate.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    seleccionDiasTemp = seleccionDiasTemp.filter(d => !d.startsWith(monthPrefix));
    renderizarCalendarioMultiselect();
}

window.guardarDiasSeleccionados = async () => {
    if (!currentProfId) return;
    
    try {
        const payload = {
            id_profesional: currentProfId,
            dias: seleccionDiasTemp,
            horarios: seleccionHorariosTemp
        };

        const resp = await fetch("/api/agendas/replace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            renderizarResumenAgenda();
            alert("Agenda guardada exitosamente.");
        } else {
            alert("Error al guardar la agenda.");
        }
    } catch(e) {
        console.error("Error saving agenda:", e);
        alert("Error de conexión al guardar agenda.");
    }
}

function renderizarGrillaHorariosCheckbox() {
    const contenedor = document.getElementById("grilla-horarios-checkbox");
    contenedor.innerHTML = horariosBD.map(hora => {
        const isSelected = seleccionHorariosTemp.includes(hora);
        return `
            <label class="horario-checkbox ${isSelected ? 'seleccionado' : ''}">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleHorarioSeleccion(this, '${hora}')">
                <span>${hora}</span>
            </label>
        `;
    }).join('');
}

window.toggleHorarioSeleccion = (checkbox, hora) => {
    checkbox.parentElement.classList.toggle('seleccionado');
    const idx = seleccionHorariosTemp.indexOf(hora);
    if (idx > -1) {
        seleccionHorariosTemp.splice(idx, 1);
    } else {
        seleccionHorariosTemp.push(hora);
    }
}

window.limpiarSeleccionHorarios = () => {
    seleccionHorariosTemp = [];
    renderizarGrillaHorariosCheckbox();
}

// Reuse saving logic
window.guardarHorariosSeleccionados = window.guardarDiasSeleccionados;

function renderizarResumenAgenda() {
    if (!currentProfId) return;
    const diasContainer = document.getElementById("contenedor-dias-agenda");
    const diasAsignados = [...seleccionDiasTemp].sort();
    
    diasContainer.innerHTML = diasAsignados.length === 0 ? `<p class="empty-state">Sin días asignados</p>` 
        : diasAsignados.map(f => `<div class="badge-resumen">${f.split('-')[2]}/${f.split('-')[1]}</div>`).join('');

    const horariosContainer = document.getElementById("contenedor-horarios-agenda");
    const horariosAsignados = [...seleccionHorariosTemp].sort();
    horariosContainer.innerHTML = horariosAsignados.length === 0 ? `<p class="empty-state">Sin horarios asignados</p>`
        : horariosAsignados.map(h => `<div class="badge-resumen">${h}</div>`).join('');
}

window.editarAgendaDesdeProfesionales = (id_prof) => {
    abrirConfiguracionAgenda();
    const sel = document.getElementById("agenda-profesional");
    sel.value = id_prof;
    // Disparar el evento change manualmente para cargar la data
    const event = new Event('change');
    sel.dispatchEvent(event);
};
