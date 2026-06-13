export function nombreCompleto(persona) {
    return `${persona.nombre} ${persona.apellido}`;
}

export function poblarSelect(elemento, opciones, valorSeleccionado = null, primerItem = null) {
    const el = typeof elemento === 'string' ? document.getElementById(elemento) : elemento;
    if (!el) return;
    
    el.innerHTML = '';

    if (primerItem) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = primerItem;
        el.appendChild(opt);
    }

    opciones.forEach(op => {
        const opt = document.createElement('option');
        
        // Si la opción es un objeto con estructura { value, text }
        if (op && typeof op === 'object' && op.value !== undefined) {
            opt.value = op.value;
            opt.textContent = op.text;
            if (op.value == valorSeleccionado) opt.selected = true;
        } else {
            opt.value = op;
            opt.textContent = op;
            if (op == valorSeleccionado) opt.selected = true;
        }
        
        el.appendChild(opt);
    });
}

