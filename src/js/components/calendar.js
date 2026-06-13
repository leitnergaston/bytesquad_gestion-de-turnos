import { horariosBD } from '../config.js';

export function _generarCalendario(container, year, month, clickableDates, clickHandler, mode = 'single', preSelected = []) {
    container.innerHTML = "";
    
    // `getDay()` devuelve 0 para domingo, 1 para lunes, etc. Necesitamos que lunes sea 0.
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    // Celdas vacías para el offset inicial
    for (let i = 0; i < offset; i++) {
        container.innerHTML += '<div></div>';
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const celda = document.createElement('div');
        celda.className = 'celda-dia';
        celda.textContent = d;

        if (clickableDates && clickableDates.includes(fechaStr)) {
            celda.classList.add('disponible');

            if (mode === 'multi' && preSelected.includes(fechaStr)) {
                celda.classList.add('seleccionado');
            }
            
            celda.onclick = () => {
                if (mode === 'single') {
                    // Deseleccionar el previamente seleccionado
                    container.querySelectorAll('.celda-dia.seleccionada').forEach(c => c.classList.remove('seleccionada'));
                    // Seleccionar el nuevo
                    celda.classList.add('seleccionada');
                }
                // Ejecutar el handler con el día, el string de fecha y el elemento HTML
                clickHandler(d, fechaStr, celda);
            };
        }
        container.appendChild(celda);
    }
}

export function _generarGrillaHorarios(container, horariosDisponibles, horariosOcupados, clickHandler) {
    container.innerHTML = "";
    
    // Si no se proveyó una agenda específica, podría usar un default o fallback
    const horarios = horariosDisponibles || horariosBD; 
    
    horarios.forEach(hora => {
        const ocupado = horariosOcupados && horariosOcupados.includes(hora);
        
        const btn = document.createElement('button');
        btn.className = 'btn-hora';
        btn.textContent = hora;

        if (ocupado) {
            btn.classList.add('hora-ocupada');
            btn.disabled = true;
        } else {
            btn.onclick = () => {
                container.querySelectorAll('.btn-hora.seleccionada-hora').forEach(b => b.classList.remove('seleccionada-hora'));
                btn.classList.add('seleccionada-hora');
                clickHandler(btn, hora);
            };
        }
        container.appendChild(btn);
    });

    if (container.innerHTML === '') {
        container.innerHTML = '<p class="empty-state">No hay horarios disponibles.</p>';
    }
}
