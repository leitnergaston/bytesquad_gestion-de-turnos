/* ============================================================
   TURNOSCLINIC — JAVASCRIPT
   ============================================================ */

// ==========================================
// BASE DE DATOS ESTÁTICA (simula backend)
// ==========================================

const especialidadesBD = [
    { nombre: "Cardiología",   icono: "🩺" },
    { nombre: "Dermatología",  icono: "🧴" },
    { nombre: "Kinesiología",  icono: "🦴" },
    { nombre: "Nutrición",     icono: "🥗" },
    { nombre: "Odontología",   icono: "🦷" },
    { nombre: "Pediatría",     icono: "🧸" }
];

const horariosBD = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "16:00", "16:30"
];

const obrasSociales = [
    "Particular", "OSDE", "Swiss Medical",
    "OSEP", "Galeno", "Medifé", "PAMI"
];

// Profesionales con especialidad asignada
let profesionalesBD = [
    { id: 1, nombre: "Martín",  apellido: "Abad",       dni: "20111222", especialidad: "Cardiología",  celular: "2614111222", mail: "m.abad@clinic.com",       genero: "M" },
    { id: 2, nombre: "Sofía",   apellido: "Castro",      dni: "27333444", especialidad: "Dermatología", celular: "2614333444", mail: "s.castro@clinic.com",     genero: "F" },
    { id: 3, nombre: "Julián",  apellido: "Domínguez",  dni: "28555666", especialidad: "Kinesiología", celular: "2614555666", mail: "j.dominguez@clinic.com",   genero: "M" },
    { id: 4, nombre: "Laura",   apellido: "Giménez",    dni: "31777888", especialidad: "Nutrición",    celular: "2614777888", mail: "l.gimenez@clinic.com",     genero: "F" },
    { id: 5, nombre: "Carlos",  apellido: "Fernández",  dni: "22999000", especialidad: "Odontología",  celular: "2614999000", mail: "c.fernandez@clinic.com",   genero: "M" },
    { id: 6, nombre: "Ana",     apellido: "López",       dni: "29123123", especialidad: "Pediatría",    celular: "2614123123", mail: "a.lopez@clinic.com",       genero: "F" }
];

// Pacientes registrados
let pacientesBD = [
    { id: 1, nombre: "Juan", apellido: "Pérez", dni: "30123456", celular: "2614123456", mail: "juan@example.com", obraSocial: "OSDE" }
];

// Turnos registrados
let turnosBD = [
    {
        id: "T-1001", pacienteId: 1, pacienteNombre: "Juan Pérez",
        profesional: "Martín Abad", especialidad: "Cardiología",
        fecha: "2026-07-06", fechaDisplay: "6 de Julio",
        horario: "09:00", obraSocial: "OSDE",
        notificarMail: true, estado: "Confirmado", creadoPor: "secretaria"
    }
];

// Agenda de cada profesional (días habilitados en Julio 2026)
let agendaProfesionales = {
    "Martín Abad":    ["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27"],
    "Sofía Castro":   ["2026-07-07", "2026-07-14", "2026-07-21", "2026-07-28"],
    "Julián Domínguez": ["2026-07-08", "2026-07-15", "2026-07-22"],
    "Laura Giménez":  ["2026-07-09", "2026-07-16", "2026-07-23"],
    "Carlos Fernández": ["2026-07-10", "2026-07-17", "2026-07-24"],
    "Ana López":      ["2026-07-06", "2026-07-13", "2026-07-20"]
};

// Contadores de IDs
let _contadorTurnos = 1002;
let _contadorPacientes = 2;
let _contadorProfesionales = 7;

function generarIdTurno()        { return "T-" + (_contadorTurnos++); }
function generarIdPaciente()     { return _contadorPacientes++; }
function generarIdProfesional()  { return _contadorProfesionales++; }

// Nombre completo de un profesional
function nombreCompleto(prof) { return `${prof.nombre} ${prof.apellido}`; }

// ==========================================
// ESTADO DE LA APP
// ==========================================

let secretariaLogueada = false;

// Selección del paciente al reservar
let selP = {
    especialidad: "",
    profesional: "",   // nombre completo
    dia: "",           // "6 de Julio"
    diaStr: "",        // "2026-07-06"
    horario: ""
};

// Selección de la secretaria al crear turno
let selS = {
    paciente: null,
    profesional: "",
    especialidad: "",
    dia: "",
    diaStr: "",
    horario: ""
};

// Estado de modificaciones en consulta de turnos
let modTemp = {};

// ==========================================
// ROUTER
// ==========================================

function irA(nombre) {
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const dest = document.getElementById("pantalla-" + nombre);
    if (dest) {
        dest.classList.add("activa");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function cancelarReserva() {
    selP = { especialidad: "", profesional: "", dia: "", diaStr: "", horario: "" };
    irA("inicio");
}

function cancelarOperacionSecretaria() {
    selS = { paciente: null, profesional: "", especialidad: "", dia: "", diaStr: "", horario: "" };
    irA("secretaria-menu");
}

// ==========================================
// SEGURIDAD / LOGIN
// ==========================================

function intentarIngresoSecretaria() {
    if (secretariaLogueada) {
        irA("secretaria-menu");
    } else {
        document.getElementById("login-usuario").value = "";
        document.getElementById("login-password").value = "";
        irA("login");
    }
}

function procesarLogin() {
    const u = document.getElementById("login-usuario").value.trim();
    const p = document.getElementById("login-password").value;
    if (u === "admin" && p === "123") {
        secretariaLogueada = true;
        irA("secretaria-menu");
    } else {
        alert("⚠️ Acceso Denegado: usuario o contraseña incorrectos.");
    }
}

function cerrarSesion() {
    secretariaLogueada = false;
    irA("inicio");
}

// ==========================================
// PACIENTES — FLUJO DE RESERVA
// ==========================================

function iniciarReserva() {
    selP = { especialidad: "", profesional: "", dia: "", diaStr: "", horario: "" };
    const c = document.getElementById("contenedor-especialidades");
    c.innerHTML = "";
    especialidadesBD.forEach(e => {
        c.innerHTML += `
            <div class="tarjeta-avatar" onclick="elegirEspecialidad('${e.nombre}')">
                <div class="circulo-imagen">${e.icono}</div>
                <span>${e.nombre}</span>
            </div>`;
    });
    irA("especialidades");
}

function elegirEspecialidad(nombre) {
    selP.especialidad = nombre;
    const c = document.getElementById("contenedor-profesionales");
    c.innerHTML = "";

    const filtrados = profesionalesBD.filter(p => p.especialidad === nombre);
    if (filtrados.length === 0) {
        c.innerHTML = `<p style="color:var(--color-texto-claro);text-align:center;grid-column:1/-1;padding:30px;">
            No hay profesionales disponibles para esta especialidad.</p>`;
    } else {
        filtrados.forEach(prof => {
            const icono = prof.genero === "M" ? "👨‍⚕️" : "👩‍⚕️";
            const titulo = prof.genero === "M" ? "Dr." : "Dra.";
            c.innerHTML += `
                <div class="tarjeta-avatar" onclick="elegirProfesional(${prof.id})">
                    <div class="circulo-imagen">${icono}</div>
                    <span>${titulo} ${prof.nombre} ${prof.apellido}</span>
                </div>`;
        });
    }
    irA("profesionales");
}

function elegirProfesional(profId) {
    const prof = profesionalesBD.find(p => p.id === profId);
    if (!prof) return;
    selP.profesional = nombreCompleto(prof);
    generarCalendarioPaciente();
    irA("dias");
}

function generarCalendarioPaciente() {
    const c = document.getElementById("contenedor-calendario");
    c.innerHTML = "";
    // Julio 2026 empieza miércoles → offset 2
    for (let i = 0; i < 2; i++) c.innerHTML += `<div class="celda-dia" style="background:transparent;"></div>`;

    const agenda = agendaProfesionales[selP.profesional] || [];
    for (let d = 1; d <= 31; d++) {
        const dd = d < 10 ? `0${d}` : `${d}`;
        const fechaStr = `2026-07-${dd}`;
        if (agenda.includes(fechaStr)) {
            c.innerHTML += `<div class="celda-dia disponible" onclick="elegirDia(${d}, '${fechaStr}')">${d}</div>`;
        } else {
            c.innerHTML += `<div class="celda-dia">${d}</div>`;
        }
    }
}

function elegirDia(num, fechaStr) {
    selP.dia    = `${num} de Julio`;
    selP.diaStr = fechaStr;

    document.getElementById("titulo-fecha-elegida").innerText = `📅 ${selP.dia}`;

    const c = document.getElementById("contenedor-horarios");
    c.innerHTML = "";
    horariosBD.forEach(hora => {
        const ocupado = turnosBD.some(t =>
            t.profesional === selP.profesional &&
            t.fecha === fechaStr &&
            t.horario === hora &&
            t.estado !== "Cancelado"
        );
        if (ocupado) {
            c.innerHTML += `<button class="btn-hora hora-ocupada" disabled>${hora}</button>`;
        } else {
            c.innerHTML += `<button class="btn-hora" onclick="elegirHorario('${hora}')">${hora}</button>`;
        }
    });
    irA("horarios");
}

function elegirHorario(hora) {
    selP.horario = hora;

    // Resumen para la pantalla de datos
    document.getElementById("resumen-turno").innerHTML = `
        <div class="resumen-item">
            <span class="resumen-emoji">🔬</span>
            <div><small>Especialidad</small><strong>${selP.especialidad}</strong></div>
        </div>
        <div class="resumen-item">
            <span class="resumen-emoji">🩺</span>
            <div><small>Especialista</small><strong>${selP.profesional}</strong></div>
        </div>
        <div class="resumen-item">
            <span class="resumen-emoji">📅</span>
            <div><small>Fecha</small><strong>${selP.dia}</strong></div>
        </div>
        <div class="resumen-item">
            <span class="resumen-emoji">🕐</span>
            <div><small>Horario</small><strong>${hora} hs.</strong></div>
        </div>`;

    // Cargar obras sociales
    poblarSelect("datos-obra-social", obrasSociales);
    irA("datos");
}

function finalizarReserva() {
    const nombre    = document.getElementById("datos-nombre").value.trim();
    const apellido  = document.getElementById("datos-apellido").value.trim();
    const dni       = document.getElementById("datos-dni").value.trim();
    const celular   = document.getElementById("datos-celular").value.trim();
    const mail      = document.getElementById("datos-mail").value.trim();
    const obraSocial = document.getElementById("datos-obra-social").value;
    const notificar  = document.getElementById("datos-notificar").checked;

    if (!nombre || !apellido || !dni || !celular || !mail) {
        alert("⚠️ Por favor completá todos los campos obligatorios (*).");
        return;
    }

    // Buscar o crear paciente por DNI
    let paciente = pacientesBD.find(p => p.dni === dni);
    if (!paciente) {
        paciente = { id: generarIdPaciente(), nombre, apellido, dni, celular, mail, obraSocial };
        pacientesBD.push(paciente);
    }

    const turno = {
        id: generarIdTurno(),
        pacienteId: paciente.id,
        pacienteNombre: `${nombre} ${apellido}`,
        profesional: selP.profesional,
        especialidad: selP.especialidad,
        fecha: selP.diaStr,
        fechaDisplay: selP.dia,
        horario: selP.horario,
        obraSocial,
        notificarMail: notificar,
        estado: "Confirmado",
        creadoPor: "paciente"
    };
    turnosBD.push(turno);

    // Limpiar campos
    ["datos-nombre", "datos-apellido", "datos-dni", "datos-celular", "datos-mail"]
        .forEach(id => { document.getElementById(id).value = ""; });

    mostrarConfirmacion(turno, "inicio");
}

// ==========================================
// CONFIRMACIÓN
// ==========================================

function mostrarConfirmacion(turno, destinoAceptar) {
    document.getElementById("conf-numero").textContent     = turno.id;
    document.getElementById("conf-paciente").textContent   = turno.pacienteNombre;
    document.getElementById("conf-especialidad").textContent = turno.especialidad;
    document.getElementById("conf-profesional").textContent  = turno.profesional;
    document.getElementById("conf-fecha").textContent      = turno.fechaDisplay;
    document.getElementById("conf-horario").textContent    = `${turno.horario} hs.`;
    document.getElementById("conf-obra").textContent       = turno.obraSocial;

    document.getElementById("btn-conf-aceptar").onclick = () => irA(destinoAceptar);
    irA("confirmacion");
}

// ==========================================
// SECRETARÍA — MENU
// ==========================================

function abrirCrearTurno() {
    selS = { paciente: null, profesional: "", especialidad: "", dia: "", diaStr: "", horario: "" };

    // Limpiar toda la pantalla
    document.getElementById("sec-buscar-dni").value = "";
    document.getElementById("sec-resultado-busqueda").innerHTML = "";
    document.getElementById("sec-form-crear-paciente").style.display = "none";
    document.getElementById("sec-form-turno").style.display = "none";
    document.getElementById("sec-calendario-wrapper").style.display = "none";
    document.getElementById("sec-horarios-wrapper").style.display = "none";
    ["sec-nombre","sec-apellido","sec-dni","sec-celular","sec-mail"]
        .forEach(id => { document.getElementById(id).value = ""; });

    irA("secretaria-crear");
}

function abrirConsultaTurnos() {
    document.getElementById("buscar-dni-turnos").value = "";
    document.getElementById("resultado-turnos").innerHTML = "";
    irA("consulta-turnos");
}

// ==========================================
// SECRETARÍA — BUSCAR / CREAR PACIENTE
// ==========================================

function buscarPacienteSecretaria() {
    const dni = document.getElementById("sec-buscar-dni").value.trim();
    const resultadoDiv = document.getElementById("sec-resultado-busqueda");
    const formCrear    = document.getElementById("sec-form-crear-paciente");
    const formTurno    = document.getElementById("sec-form-turno");

    if (!dni) {
        resultadoDiv.innerHTML = `<div class="msg-error">Ingrese un DNI para buscar.</div>`;
        return;
    }

    const paciente = pacientesBD.find(p => p.dni === dni);

    if (paciente) {
        selS.paciente = paciente;
        resultadoDiv.innerHTML = `
            <div class="paciente-encontrado">
                <span>✅ Paciente encontrado:</span>
                <strong>${paciente.nombre} ${paciente.apellido}</strong>
                <span>DNI ${paciente.dni}</span>
                <span>· ${paciente.obraSocial}</span>
            </div>`;
        formCrear.style.display = "none";
        _mostrarFormTurnoSecretaria();
    } else {
        selS.paciente = null;
        resultadoDiv.innerHTML = `
            <div class="paciente-no-encontrado">
                <span>❌ No se encontró el DNI ${dni} en el sistema.</span>
                <button class="btn-sm" onclick="mostrarFormCrearPaciente()">+ Crear Paciente</button>
            </div>`;
        formTurno.style.display = "none";
    }
}

function mostrarFormCrearPaciente() {
    const form = document.getElementById("sec-form-crear-paciente");
    form.style.display = "block";
    poblarSelect("sec-obra-social-nuevo", obrasSociales);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ocultarFormCrearPaciente() {
    document.getElementById("sec-form-crear-paciente").style.display = "none";
}

function crearPacienteSecretaria() {
    const nombre     = document.getElementById("sec-nombre").value.trim();
    const apellido   = document.getElementById("sec-apellido").value.trim();
    const dni        = document.getElementById("sec-dni").value.trim();
    const celular    = document.getElementById("sec-celular").value.trim();
    const mail       = document.getElementById("sec-mail").value.trim();
    const obraSocial = document.getElementById("sec-obra-social-nuevo").value;

    if (!nombre || !apellido || !dni || !celular || !mail) {
        alert("⚠️ Completá todos los campos del paciente."); return;
    }
    if (pacientesBD.find(p => p.dni === dni)) {
        alert("Ya existe un paciente con ese DNI."); return;
    }

    const nuevo = { id: generarIdPaciente(), nombre, apellido, dni, celular, mail, obraSocial };
    pacientesBD.push(nuevo);
    selS.paciente = nuevo;

    document.getElementById("sec-resultado-busqueda").innerHTML = `
        <div class="paciente-encontrado">
            <span>✅ Paciente creado:</span>
            <strong>${nuevo.nombre} ${nuevo.apellido}</strong>
            <span>DNI ${nuevo.dni}</span>
            <span>· ${nuevo.obraSocial}</span>
        </div>`;
    document.getElementById("sec-form-crear-paciente").style.display = "none";
    _mostrarFormTurnoSecretaria();
}

function _mostrarFormTurnoSecretaria() {
    const form = document.getElementById("sec-form-turno");
    form.style.display = "block";

    // Poblar especialidades
    const selEsp = document.getElementById("sec-especialidad");
    selEsp.innerHTML = '<option value="">Seleccione especialidad...</option>';
    especialidadesBD.forEach(e => {
        selEsp.innerHTML += `<option value="${e.nombre}">${e.icono} ${e.nombre}</option>`;
    });

    // Poblar obra social (preseleccionar la del paciente si existe)
    poblarSelect("sec-obra-social", obrasSociales);
    if (selS.paciente && selS.paciente.obraSocial) {
        document.getElementById("sec-obra-social").value = selS.paciente.obraSocial;
    }

    // Reset profesionales y calendario
    document.getElementById("sec-profesional").innerHTML = '<option value="">Seleccione profesional...</option>';
    document.getElementById("sec-calendario-wrapper").style.display = "none";
    document.getElementById("sec-horarios-wrapper").style.display = "none";
    selS.dia = ""; selS.diaStr = ""; selS.horario = "";

    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function actualizarProfesionalesSecretaria() {
    const especialidad = document.getElementById("sec-especialidad").value;
    const selProf = document.getElementById("sec-profesional");

    selProf.innerHTML = '<option value="">Seleccione profesional...</option>';
    document.getElementById("sec-calendario-wrapper").style.display = "none";
    document.getElementById("sec-horarios-wrapper").style.display = "none";
    selS.horario = ""; selS.dia = ""; selS.diaStr = "";

    if (!especialidad) return;

    profesionalesBD
        .filter(p => p.especialidad === especialidad)
        .forEach(prof => {
            const titulo = prof.genero === "M" ? "Dr." : "Dra.";
            selProf.innerHTML += `<option value="${nombreCompleto(prof)}">${titulo} ${prof.nombre} ${prof.apellido}</option>`;
        });
}

function actualizarCalendarioSecretaria() {
    const profesional = document.getElementById("sec-profesional").value;
    selS.profesional = profesional;
    selS.dia = ""; selS.diaStr = ""; selS.horario = "";
    document.getElementById("sec-horarios-wrapper").style.display = "none";

    if (!profesional) {
        document.getElementById("sec-calendario-wrapper").style.display = "none";
        return;
    }

    document.getElementById("sec-calendario-wrapper").style.display = "block";
    _generarCalendario("sec-contenedor-calendario", profesional, "elegirDiaSecretaria");
    document.getElementById("sec-calendario-wrapper").scrollIntoView({ behavior: "smooth", block: "start" });
}

function elegirDiaSecretaria(num, fechaStr, el) {
    selS.dia = `${num} de Julio`;
    selS.diaStr = fechaStr;
    selS.horario = "";

    _marcarDiaSeleccionado("sec-contenedor-calendario", el);
    _generarGrillaHorarios("sec-grilla-horarios", selS.profesional, fechaStr, null, "elegirHorarioSecretaria");
    document.getElementById("sec-horarios-wrapper").style.display = "block";
    document.getElementById("sec-horarios-wrapper").scrollIntoView({ behavior: "smooth", block: "start" });
}

function elegirHorarioSecretaria(btn, hora) {
    selS.horario = hora;
    _marcarHoraSeleccionada("sec-grilla-horarios", btn);
}

function guardarTurnoSecretaria() {
    if (!selS.paciente)                   { alert("⚠️ Identificá un paciente primero."); return; }
    if (!document.getElementById("sec-especialidad").value) { alert("⚠️ Seleccioná una especialidad."); return; }
    if (!selS.profesional)                { alert("⚠️ Seleccioná un profesional."); return; }
    if (!selS.dia)                        { alert("⚠️ Seleccioná un día."); return; }
    if (!selS.horario)                    { alert("⚠️ Seleccioná un horario."); return; }

    const obraSocial = document.getElementById("sec-obra-social").value;
    const notificar  = document.getElementById("sec-notificar").checked;
    const p = selS.paciente;

    const turno = {
        id: generarIdTurno(),
        pacienteId: p.id,
        pacienteNombre: `${p.nombre} ${p.apellido}`,
        profesional: selS.profesional,
        especialidad: document.getElementById("sec-especialidad").value,
        fecha: selS.diaStr,
        fechaDisplay: selS.dia,
        horario: selS.horario,
        obraSocial,
        notificarMail: notificar,
        estado: "Confirmado",
        creadoPor: "secretaria"
    };
    turnosBD.push(turno);

    selS = { paciente: null, profesional: "", especialidad: "", dia: "", diaStr: "", horario: "" };
    mostrarConfirmacion(turno, "secretaria-menu");
}

// ==========================================
// SECRETARÍA — CONSULTA DE TURNOS
// ==========================================

function buscarTurnosPaciente() {
    const dni = document.getElementById("buscar-dni-turnos").value.trim();
    const resultadoDiv = document.getElementById("resultado-turnos");

    if (!dni) {
        resultadoDiv.innerHTML = `<div class="msg-error">Ingrese un DNI para buscar.</div>`;
        return;
    }

    const paciente = pacientesBD.find(p => p.dni === dni);
    if (!paciente) {
        resultadoDiv.innerHTML = `
            <div class="paciente-no-encontrado" style="margin-top:16px;">
                <span>❌ No se encontró ningún paciente con DNI ${dni}.</span>
            </div>`;
        return;
    }

    const turnos = turnosBD.filter(t => t.pacienteId === paciente.id);

    let html = `
        <div class="paciente-encontrado" style="margin-top:16px;margin-bottom:20px;">
            <span>Paciente:</span>
            <strong>${paciente.nombre} ${paciente.apellido}</strong>
            <span>DNI ${paciente.dni}</span>
            <span>· ${paciente.obraSocial}</span>
        </div>`;

    if (turnos.length === 0) {
        html += `<p style="text-align:center;color:var(--color-texto-claro);padding:20px 0;">
            Este paciente no tiene turnos registrados.</p>`;
    } else {
        html += `<div class="tabla-turnos">`;
        turnos.forEach(t => {
            const cl = t.estado === "Confirmado" ? "estado-confirmado"
                     : t.estado === "Cancelado"  ? "estado-cancelado"
                     : "estado-modificado";
            html += `
                <div class="fila-turno" id="row-${t.id}">
                    <div class="turno-info">
                        <span class="turno-fecha">📅 ${t.fechaDisplay} — ${t.horario} hs.</span>
                        <span class="turno-medico">🩺 ${t.profesional}</span>
                        <span class="turno-esp">🔬 ${t.especialidad}</span>
                        <span class="badge-estado ${cl}">${t.estado}</span>
                    </div>
                    <div class="turno-acciones">
                        ${t.estado !== "Cancelado" ? `
                            <button class="btn-accion btn-modificar" onclick="prepararModificacion('${t.id}')">✏️ Modificar</button>
                            <button class="btn-accion btn-cancelar-turno" onclick="cancelarTurno('${t.id}')">✖ Cancelar</button>
                        ` : `<span style="color:#9CA3AF;font-size:13px;font-weight:700;">Turno cancelado</span>`}
                    </div>
                    <div class="form-modificacion" id="mod-${t.id}" style="display:none;"></div>
                </div>`;
        });
        html += `</div>`;
    }

    resultadoDiv.innerHTML = html;
}

function prepararModificacion(turnoId) {
    const turno = turnosBD.find(t => t.id === turnoId);
    if (!turno) return;

    // Ocultar otras modificaciones abiertas
    document.querySelectorAll(".form-modificacion").forEach(f => f.style.display = "none");

    modTemp[turnoId] = { dia: "", diaStr: "", horario: "" };

    const divMod = document.getElementById(`mod-${turnoId}`);
    divMod.style.display = "block";
    divMod.innerHTML = `
        <p style="font-weight:900;color:var(--color-principal);margin:0 0 14px;">
            ✏️ Seleccioná nueva fecha y horario para este turno</p>
        <div class="calendario" style="margin-bottom:14px;">
            <div class="calendario-titulo" style="font-size:15px;">Julio 2026</div>
            <div class="dias-semana">
                <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
            </div>
            <div class="dias-numeros" id="modcal-${turnoId}"></div>
        </div>
        <div class="grilla-horas" style="display:none;" id="modhoras-${turnoId}"></div>
        <div class="nav-inferior" style="margin-top:14px;">
            <button class="btn btn-gris" onclick="cancelarModificacion('${turnoId}')">Cancelar</button>
            <button class="btn btn-verde" onclick="guardarModificacion('${turnoId}')">💾 Guardar Cambios</button>
        </div>`;

    // Generar calendario
    _generarCalendario(`modcal-${turnoId}`, turno.profesional, `elegirDiaModificacion`, turnoId);
    divMod.scrollIntoView({ behavior: "smooth", block: "start" });
}

function elegirDiaModificacion(num, fechaStr, el, turnoId) {
    modTemp[turnoId].dia    = `${num} de Julio`;
    modTemp[turnoId].diaStr = fechaStr;
    modTemp[turnoId].horario = "";

    _marcarDiaSeleccionado(`modcal-${turnoId}`, el);

    const turno = turnosBD.find(t => t.id === turnoId);
    _generarGrillaHorarios(
        `modhoras-${turnoId}`,
        turno.profesional,
        fechaStr,
        turnoId,          // excluir este turno al chequear ocupados
        `elegirHoraModificacion`,
        turnoId
    );
    document.getElementById(`modhoras-${turnoId}`).style.display = "grid";
}

function elegirHoraModificacion(btn, hora, turnoId) {
    modTemp[turnoId].horario = hora;
    _marcarHoraSeleccionada(`modhoras-${turnoId}`, btn);
}

function guardarModificacion(turnoId) {
    const tmp = modTemp[turnoId];
    if (!tmp || !tmp.dia || !tmp.horario) {
        alert("⚠️ Seleccioná una nueva fecha y horario."); return;
    }
    const turno = turnosBD.find(t => t.id === turnoId);
    turno.fecha        = tmp.diaStr;
    turno.fechaDisplay = tmp.dia;
    turno.horario      = tmp.horario;
    turno.estado       = "Modificado";
    delete modTemp[turnoId];

    buscarTurnosPaciente(); // Refrescar la vista
}

function cancelarModificacion(turnoId) {
    const div = document.getElementById(`mod-${turnoId}`);
    if (div) { div.style.display = "none"; div.innerHTML = ""; }
    delete modTemp[turnoId];
}

function cancelarTurno(turnoId) {
    if (!confirm("¿Confirmar la cancelación de este turno?")) return;
    const turno = turnosBD.find(t => t.id === turnoId);
    if (turno) {
        turno.estado = "Cancelado";
        buscarTurnosPaciente();
    }
}

// ==========================================
// SECRETARÍA — CONFIGURAR AGENDA
// ==========================================

function abrirConfiguracionAgenda() {
    const sel = document.getElementById("agenda-profesional");
    sel.innerHTML = '<option value="">Seleccione profesional...</option>';
    profesionalesBD.forEach(prof => {
        sel.innerHTML += `<option value="${nombreCompleto(prof)}">${prof.nombre} ${prof.apellido} · ${prof.especialidad}</option>`;
    });
    document.getElementById("contenedor-dias-agenda").innerHTML = `<p style="color:#9CA3AF;">Seleccione un médico arriba.</p>`;
    irA("agenda");
}

function renderizarDiasAgenda() {
    const profesional = document.getElementById("agenda-profesional").value;
    const c = document.getElementById("contenedor-dias-agenda");

    if (!profesional) {
        c.innerHTML = `<p style="color:#9CA3AF;">Seleccione un médico arriba.</p>`;
        return;
    }
    const fechas = agendaProfesionales[profesional] || [];
    if (fechas.length === 0) {
        c.innerHTML = `<p style="color:#EF4444;font-weight:700;">No hay días asignados. El médico no aparecerá en el calendario.</p>`;
        return;
    }
    c.innerHTML = "";
    [...fechas].sort().forEach(f => {
        const dia = f.split("-")[2];
        c.innerHTML += `
            <div class="badge-dia">
                ${dia}/07
                <button onclick="eliminarDiaAgenda('${profesional}', '${f}')" title="Quitar día">✖</button>
            </div>`;
    });
}

function agregarDiaAgenda() {
    const profesional = document.getElementById("agenda-profesional").value;
    const fecha       = document.getElementById("agenda-fecha").value;
    if (!profesional) { alert("Seleccione un profesional."); return; }
    if (!fecha)       { alert("Seleccione una fecha."); return; }

    if (!agendaProfesionales[profesional]) agendaProfesionales[profesional] = [];
    if (agendaProfesionales[profesional].includes(fecha)) { alert("Ese día ya está asignado."); return; }

    agendaProfesionales[profesional].push(fecha);
    document.getElementById("agenda-fecha").value = "";
    renderizarDiasAgenda();
}

function eliminarDiaAgenda(profesional, fechaStr) {
    const idx = agendaProfesionales[profesional].indexOf(fechaStr);
    if (idx > -1) agendaProfesionales[profesional].splice(idx, 1);
    renderizarDiasAgenda();
}

// ==========================================
// SECRETARÍA — GESTIÓN DE PROFESIONALES
// ==========================================

function abrirGestionProfesionales() {
    document.getElementById("form-agregar-profesional").style.display = "none";
    renderizarListaProfesionales();
    irA("gestion-profesionales");
}

function renderizarListaProfesionales() {
    const c = document.getElementById("lista-profesionales");
    if (profesionalesBD.length === 0) {
        c.innerHTML = `<p style="color:var(--color-texto-claro);text-align:center;padding:30px;">No hay profesionales registrados.</p>`;
        return;
    }
    c.innerHTML = "";
    profesionalesBD.forEach(prof => {
        const icono  = prof.genero === "M" ? "👨‍⚕️" : "👩‍⚕️";
        const titulo = prof.genero === "M" ? "Dr." : "Dra.";
        c.innerHTML += `
            <div class="card-profesional">
                <div class="prof-avatar">${icono}</div>
                <div class="prof-info">
                    <strong>${titulo} ${prof.nombre} ${prof.apellido}</strong>
                    <span>🔬 ${prof.especialidad}</span>
                    <span>📧 ${prof.mail}</span>
                    <span>📱 ${prof.celular}</span>
                </div>
                <div class="prof-acciones">
                    <button class="btn-accion btn-modificar" onclick="editarAgendaDesdeProfesionales('${nombreCompleto(prof)}')">📅 Agenda</button>
                    <button class="btn-accion btn-cancelar-turno" onclick="eliminarProfesional(${prof.id})">🗑️ Eliminar</button>
                </div>
            </div>`;
    });
}

function toggleFormAgregarProfesional() {
    const form = document.getElementById("form-agregar-profesional");
    const visible = form.style.display !== "none";
    form.style.display = visible ? "none" : "block";

    if (!visible) {
        // Poblar especialidades en el form
        const sel = document.getElementById("nuevo-prof-especialidad");
        sel.innerHTML = "";
        especialidadesBD.forEach(e => sel.innerHTML += `<option value="${e.nombre}">${e.nombre}</option>`);
        // Limpiar campos
        ["nuevo-prof-nombre","nuevo-prof-apellido","nuevo-prof-dni","nuevo-prof-celular","nuevo-prof-mail"]
            .forEach(id => { document.getElementById(id).value = ""; });
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function guardarNuevoProfesional() {
    const nombre      = document.getElementById("nuevo-prof-nombre").value.trim();
    const apellido    = document.getElementById("nuevo-prof-apellido").value.trim();
    const dni         = document.getElementById("nuevo-prof-dni").value.trim();
    const especialidad = document.getElementById("nuevo-prof-especialidad").value;
    const celular     = document.getElementById("nuevo-prof-celular").value.trim();
    const mail        = document.getElementById("nuevo-prof-mail").value.trim();
    const genero      = document.getElementById("nuevo-prof-genero").value;

    if (!nombre || !apellido || !dni || !celular || !mail) {
        alert("⚠️ Completá todos los campos obligatorios."); return;
    }
    if (profesionalesBD.find(p => p.dni === dni)) {
        alert("Ya existe un profesional con ese DNI."); return;
    }

    const nuevo = { id: generarIdProfesional(), nombre, apellido, dni, especialidad, celular, mail, genero };
    profesionalesBD.push(nuevo);

    // Inicializar agenda vacía
    if (!agendaProfesionales[nombreCompleto(nuevo)]) {
        agendaProfesionales[nombreCompleto(nuevo)] = [];
    }

    document.getElementById("form-agregar-profesional").style.display = "none";
    renderizarListaProfesionales();

    const titulo = genero === "M" ? "Dr." : "Dra.";
    alert(`✅ ${titulo} ${nombre} ${apellido} agregado/a exitosamente al sistema.`);
}

function eliminarProfesional(id) {
    const prof = profesionalesBD.find(p => p.id === id);
    if (!prof) return;
    const titulo = prof.genero === "M" ? "Dr." : "Dra.";
    if (!confirm(`¿Eliminar a ${titulo} ${prof.nombre} ${prof.apellido}? Esta acción no se puede deshacer.`)) return;

    profesionalesBD = profesionalesBD.filter(p => p.id !== id);
    renderizarListaProfesionales();
}

function editarAgendaDesdeProfesionales(nomProf) {
    // Navegar a agenda con ese profesional preseleccionado
    abrirConfiguracionAgenda();
    const sel = document.getElementById("agenda-profesional");
    sel.value = nomProf;
    renderizarDiasAgenda();
}

// ==========================================
// UTILIDADES COMPARTIDAS
// ==========================================

// Llenar un <select> con un array de strings
function poblarSelect(id, arr) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    arr.forEach(v => sel.innerHTML += `<option value="${v}">${v}</option>`);
}

// Genera el grid del calendario de Julio 2026 para un profesional dado
// fnClick: nombre de la función a llamar. Si pasás turnoId, se lo agrega como argumento.
function _generarCalendario(contenedorId, profesional, fnClick, turnoId) {
    const c = document.getElementById(contenedorId);
    c.innerHTML = "";
    for (let i = 0; i < 2; i++) c.innerHTML += `<div class="celda-dia" style="background:transparent;"></div>`;

    const agenda = agendaProfesionales[profesional] || [];
    for (let d = 1; d <= 31; d++) {
        const dd = d < 10 ? `0${d}` : `${d}`;
        const fStr = `2026-07-${dd}`;
        if (agenda.includes(fStr)) {
            const extra = turnoId !== undefined ? `, '${turnoId}'` : "";
            c.innerHTML += `<div class="celda-dia disponible" onclick="${fnClick}(${d}, '${fStr}', this${extra})">${d}</div>`;
        } else {
            c.innerHTML += `<div class="celda-dia">${d}</div>`;
        }
    }
}

// Genera la grilla de horarios para un profesional en una fecha dada
// excludeTurnoId: si se provee, ese turno no cuenta como ocupado (útil al modificar)
// fnClick: nombre de función. Extra: argumento adicional al final (ej turnoId).
function _generarGrillaHorarios(contenedorId, profesional, fechaStr, excludeTurnoId, fnClick, extraArg) {
    const c = document.getElementById(contenedorId);
    c.innerHTML = "";
    horariosBD.forEach(hora => {
        const ocupado = turnosBD.some(t =>
            (excludeTurnoId ? t.id !== excludeTurnoId : true) &&
            t.profesional === profesional &&
            t.fecha === fechaStr &&
            t.horario === hora &&
            t.estado !== "Cancelado"
        );
        if (ocupado) {
            c.innerHTML += `<button class="btn-hora hora-ocupada" disabled>${hora}</button>`;
        } else {
            const extra = extraArg !== undefined ? `, '${extraArg}'` : "";
            c.innerHTML += `<button class="btn-hora" onclick="${fnClick}(this, '${hora}'${extra})">${hora}</button>`;
        }
    });
}

function _marcarDiaSeleccionado(contenedorId, el) {
    document.querySelectorAll(`#${contenedorId} .celda-dia.disponible`)
        .forEach(c => c.classList.remove("seleccionada"));
    el.classList.add("seleccionada");
}

function _marcarHoraSeleccionada(contenedorId, btn) {
    document.querySelectorAll(`#${contenedorId} .btn-hora:not(.hora-ocupada)`)
        .forEach(b => b.classList.remove("seleccionada-hora"));
    btn.classList.add("seleccionada-hora");
}
