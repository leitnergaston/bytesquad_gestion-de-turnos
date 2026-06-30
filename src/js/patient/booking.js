import { irA, MESES } from "../navigation.js";
import { poblarSelect } from "../utils.js";
import {
  _generarCalendario,
  _generarGrillaHorarios,
} from "../components/calendar.js";
import { mostrarConfirmacion } from "../components/confirmation.js";

let selP = {}; // Estado de selección del paciente

export async function iniciarReserva() {
  window.currentDate = new Date();
  window.currentDate.setDate(1);
  selP = {};

  const patientData = sessionStorage.getItem("pacienteAuth");
  if (!patientData) {
    irA("login-paciente");
  } else {
    irA("busqueda-dual");
  }
}

window.verMisTurnos = async () => {
    const pData = JSON.parse(sessionStorage.getItem("pacienteAuth") || "{}");
    const id_paciente = pData.id_paciente;
    
    if(!id_paciente) return;
    
    irA("mis-turnos");
    const container = document.getElementById("lista-mis-turnos");
    container.innerHTML = '<p>Cargando turnos...</p>';
    
    try {
        const resp = await fetch(`/api/turnos?id_paciente=${id_paciente}`);
        const turnos = await resp.json();
        
        if (turnos.length === 0) {
            container.innerHTML = '<p class="empty-state">No tienes turnos registrados.</p>';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap: 1rem;">';
        turnos.forEach(t => {
            const dateObj = new Date(t.fecha);
            const fechaStr = dateObj.toLocaleDateString();
            const horaStr = t.hora.substring(0, 5);
            let badgeClass = "badge-secondary";
            if(t.estado === "confirmado") badgeClass = "badge-primary";
            if(t.estado === "cancelado") badgeClass = "badge-error";
            
            html += `
                <div style="background: var(--color-superficie); padding: 1.5rem; border-radius: 1rem; box-shadow: var(--sombra-suave); border-left: 4px solid var(--color-primario);">
                    <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1.2rem;">${fechaStr} a las ${horaStr} hs</h4>
                        <span class="badge ${badgeClass}">${t.estado.toUpperCase()}</span>
                    </div>
                    <div style="color: var(--color-texto-secundario);">
                        <p style="margin: 0.25rem 0;"><strong>Profesional:</strong> Dr. ${t.prof_nombre} ${t.prof_apellido}</p>
                        <p style="margin: 0.25rem 0;"><strong>Especialidad:</strong> ${t.especialidad_nombre}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch(e) {
        container.innerHTML = '<p class="msg-error">Error al cargar turnos.</p>';
    }
}

window.iniciarBusquedaPorMedico = () => {
  selP.modoBusqueda = 'medico';
  const cont = document.getElementById("contenedor-especialidades");
  cont.innerHTML = "<p>Cargando especialidades...</p>";
  irA("especialidades");

  fetch("/api/especialidades")
    .then((resp) => resp.json())
    .then((especialidades) => {
      cont.innerHTML = especialidades
        .map(
          (e) => `
            <div class="tarjeta-avatar" onclick="window.elegirEspecialidad(${e.id_especialidad}, '${e.nombre_especialidad}')">
                <div class="circulo-imagen">${e.icono || "🩺"}</div>
                <span>${e.nombre_especialidad}</span>
            </div>
        `,
        )
        .join("");
    })
    .catch((e) => {
      cont.innerHTML =
        '<p class="msg-error">Error al cargar especialidades.</p>';
    });
};

window.iniciarBusquedaPorFecha = () => {
  selP.modoBusqueda = 'fecha';
  generarCalendarioPacienteGeneral();
  irA("dias");
};

window.elegirEspecialidad = async (id_especialidad, nombre_especialidad) => {
  selP.especialidadNombre = nombre_especialidad;
  selP.id_especialidad = id_especialidad;

  const cont = document.getElementById("contenedor-profesionales");
  cont.innerHTML = "<p>Cargando profesionales...</p>";
  irA("profesionales");

  try {
    const resp = await fetch("/api/profesionales");
    const profesionales = await resp.json();
    const filtrados = profesionales.filter(
      (p) => p.id_especialidad === id_especialidad,
    );

    cont.innerHTML =
      filtrados.length > 0
        ? filtrados
            .map(
              (p) => `
                <div class="tarjeta-avatar" onclick="window.elegirProfesional(${p.id_profesional}, '${p.nombre}', '${p.apellido}')">
                    <div class="circulo-imagen">👨‍⚕️</div>
                    <span>${p.nombre} ${p.apellido}</span>
                </div>
            `,
            )
            .join("")
        : '<p class="empty-state">No hay profesionales para esta especialidad.</p>';
  } catch (e) {
    cont.innerHTML = '<p class="msg-error">Error al cargar profesionales.</p>';
  }
};

window.elegirProfesional = (profId, nombre, apellido) => {
  selP.id_profesional = profId;
  selP.profesionalNombre = `${nombre} ${apellido}`;
  
  if (selP.modoBusqueda === 'fecha') {
      elegirDia(selP.diaNum, selP.diaStr);
  } else {
      generarCalendarioPaciente();
      irA("dias");
  }
};

window.elegirProfesionalYBuscarEspecialidad = (profId, nombre, apellido, especialidad) => {
    selP.especialidadNombre = especialidad || 'Especialista';
    window.elegirProfesional(profId, nombre, apellido);
}

export async function recargarCalendarioPaciente() {
  if (selP.modoBusqueda === 'fecha') {
    return generarCalendarioPacienteGeneral();
  } else {
    return generarCalendarioPaciente();
  }
}

export async function generarCalendarioPacienteGeneral() {
  const year = window.currentDate.getFullYear();
  const month = window.currentDate.getMonth();
  document.querySelector(
    "#pantalla-dias .calendario-titulo-texto",
  ).textContent = `${MESES[month]} ${year}`;

  document.getElementById("contenedor-calendario").innerHTML =
    "<p>Cargando días disponibles...</p>";

  try {
    const agendasResp = await fetch(`/api/agendas`);
    const agendas = await agendasResp.json();
    
    // Check if there are agendas available for any professional
    const agendaDiasDisponibles = [...new Set(agendas.map(a => a.fecha_atencion.substring(0, 10)))];

    _generarCalendario(
      document.getElementById("contenedor-calendario"),
      year,
      month,
      agendaDiasDisponibles,
      (d, f) => {
          selP.diaNum = d;
          selP.diaStr = f;
          selP.dia = `${d} de ${MESES[window.currentDate.getMonth()]}`;
          verProfesionalesPorFecha(f);
      },
    );
  } catch (e) {
    console.error(e);
    document.getElementById("contenedor-calendario").innerHTML =
      "<p class='msg-error'>Error al cargar días disponibles.</p>";
  }
}

async function verProfesionalesPorFecha(fechaStr) {
    document.getElementById("titulo-fecha-profesionales").textContent = `Profesionales disponibles el ${selP.dia}`;
    const cont = document.getElementById("contenedor-fecha-profesionales");
    cont.innerHTML = "<p>Cargando profesionales...</p>";
    irA("fecha-profesionales");

    try {
        const [agendasResp, profResp, especialidadesResp] = await Promise.all([
            fetch(`/api/agendas`),
            fetch(`/api/profesionales`),
            fetch(`/api/especialidades`)
        ]);
        const agendas = await agendasResp.json();
        const profesionales = await profResp.json();
        const especialidades = await especialidadesResp.json();

        const agendasDia = agendas.filter(a => a.fecha_atencion.substring(0, 10) === fechaStr);
        const profIds = [...new Set(agendasDia.map(a => a.id_profesional))];
        
        const profsDia = profesionales.filter(p => profIds.includes(p.id_profesional));

        cont.innerHTML = profsDia.length > 0
            ? profsDia.map(p => {
                const esp = especialidades.find(e => e.id_especialidad === p.id_especialidad);
                const nombreEsp = esp ? esp.nombre_especialidad : 'Especialista';
                return `
                <div class="tarjeta-avatar" onclick="window.elegirProfesionalYBuscarEspecialidad(${p.id_profesional}, '${p.nombre}', '${p.apellido}', '${nombreEsp}')">
                    <div class="circulo-imagen">👨‍⚕️</div>
                    <div style="display: flex; flex-direction: column;">
                        <span>${p.nombre} ${p.apellido}</span>
                        <small style="color: var(--color-texto-secundario); font-size:0.85em;">${nombreEsp}</small>
                    </div>
                </div>
            `}).join("")
            : '<p class="empty-state">No hay profesionales disponibles para esta fecha.</p>';
    } catch (e) {
        cont.innerHTML = "<p class='msg-error'>Error al cargar profesionales.</p>";
    }
}

export async function generarCalendarioPaciente() {
  const year = window.currentDate.getFullYear();
  const month = window.currentDate.getMonth();
  document.querySelector(
    "#pantalla-dias .calendario-titulo-texto",
  ).textContent = `${MESES[month]} ${year}`;

  document.getElementById("contenedor-calendario").innerHTML =
    "<p>Cargando días disponibles...</p>";

  try {
    const [agendasResp, turnosResp] = await Promise.all([
      fetch(`/api/agendas?id_profesional=${selP.id_profesional}`),
      fetch(`/api/turnos`),
    ]);
    const agendas = await agendasResp.json();
    const turnos = await turnosResp.json();

    selP.agendasProfesional = agendas;

    const agendaDiasDisponibles = [];
    for (const a of agendas) {
      const fechaStr = a.fecha_atencion.substring(0, 10);
      const turnosDia = turnos.filter(
        (t) =>
          t.id_profesional === selP.id_profesional &&
          t.fecha === fechaStr &&
          t.estado !== "cancelado",
      );
      const ocupados = turnosDia.map((t) => t.hora.substring(0, 5));
      const configurados = a.horarios.map((h) => h.substring(0, 5));
      const libres = configurados.filter((h) => !ocupados.includes(h));

      if (libres.length > 0) {
        agendaDiasDisponibles.push(fechaStr);
      }
    }

    _generarCalendario(
      document.getElementById("contenedor-calendario"),
      year,
      month,
      agendaDiasDisponibles,
      (d, f) => elegirDia(d, f),
    );
  } catch (e) {
    console.error(e);
    document.getElementById("contenedor-calendario").innerHTML =
      "<p class='msg-error'>Error al cargar días disponibles.</p>";
  }
}

async function elegirDia(num, fechaStr) {
  if (selP.modoBusqueda !== 'fecha') {
      selP.dia = `${num} de ${MESES[window.currentDate.getMonth()]}`;
      selP.diaStr = fechaStr;
  }
  document.getElementById("titulo-fecha-elegida").textContent =
    `📅 ${selP.dia}`;

  document.getElementById("contenedor-horarios").innerHTML =
    "<p>Cargando horarios...</p>";
  irA("horarios");

  try {
    if (selP.modoBusqueda === 'fecha') {
        const agendasResp = await fetch(`/api/agendas?id_profesional=${selP.id_profesional}`);
        selP.agendasProfesional = await agendasResp.json();
    }

    const agendaStr = selP.agendasProfesional.find(
      (a) => a.fecha_atencion.substring(0, 10) === fechaStr,
    );
    let horariosDisponibles = agendaStr
      ? agendaStr.horarios.map((h) => h.substring(0, 5))
      : null;

    const resp = await fetch(`/api/turnos`);
    const turnosOcupadosData = await resp.json();
    const turnosEnEseDia = turnosOcupadosData.filter(
      (t) =>
        t.id_profesional === selP.id_profesional &&
        t.fecha === fechaStr &&
        t.estado !== "cancelado",
    );
    const horariosOcupados = turnosEnEseDia.map((t) => t.hora.substring(0, 5));

    _generarGrillaHorarios(
      document.getElementById("contenedor-horarios"),
      horariosDisponibles,
      horariosOcupados,
      (btn, hora) => elegirHorario(hora),
    );
  } catch (e) {
    console.error(e);
    document.getElementById("contenedor-horarios").innerHTML =
      "<p class='msg-error'>Error al cargar horarios.</p>";
  }
}

async function elegirHorario(hora) {
  selP.horario = hora;
  document.getElementById("resumen-turno").innerHTML = `
        <div class="resumen-item"><span>🔬</span><div><small>Especialidad</small><strong>${selP.especialidadNombre}</strong></div></div>
        <div class="resumen-item"><span>🩺</span><div><small>Especialista</small><strong>${selP.profesionalNombre}</strong></div></div>
        <div class="resumen-item"><span>📅</span><div><small>Fecha</small><strong>${selP.dia}</strong></div></div>
        <div class="resumen-item"><span>🕐</span><div><small>Horario</small><strong>${hora} hs.</strong></div></div>
    `;

  irA("datos");

  const pac = JSON.parse(sessionStorage.getItem("pacienteAuth"));
  
  const formHtml = `
    <div style="background: var(--color-superficie); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--color-borde); margin-bottom: 2rem;">
        <h4 style="margin-bottom: 1rem; color: var(--color-primario);">Confirmar sus Datos</h4>
        <p style="margin-bottom:0.5rem;"><strong>Paciente:</strong> ${pac.pac_nombre || ''} ${pac.pac_apellido || ''}</p>
        <p style="margin-bottom:0.5rem;"><strong>DNI:</strong> ${pac.username}</p>
        ${pac.pac_celular ? `<p style="margin-bottom:0.5rem;"><strong>Celular:</strong> ${pac.pac_celular}</p>` : ''}
        ${pac.pac_email ? `<p style="margin-bottom:0.5rem;"><strong>Email:</strong> ${pac.pac_email}</p>` : ''}
        <div class="form-grupo" style="margin-top: 1rem;">
            <label>Obra Social (Actual: ${pac.obra_social_nombre || 'No asignada'})</label>
            <select id="confirmar-obra-social"></select>
        </div>
        <p style="margin-top:1rem; font-size:0.9rem; color: var(--color-texto-secundario);">Al confirmar, la reserva quedará registrada a su nombre.</p>
    </div>
    <div class="acciones-form">
        <button id="btn-confirmar-reserva" class="btn-primario" onclick="window.finalizarReserva()">Confirmar Reserva</button>
        <button class="btn-secundario btn-cancelar">Cancelar</button>
    </div>
  `;
  
  const formContainer = document.getElementById("form-datos-paciente");
  if (formContainer) {
    formContainer.innerHTML = formHtml;
    // Populate select
    fetch('/api/obras_sociales')
        .then(res => res.json())
        .then(data => {
            const opciones = data.map(os => ({ value: os.id_obra_social, text: os.nombre }));
            import('../utils.js').then(module => {
                module.poblarSelect('confirmar-obra-social', opciones, pac.id_obra_social, 'Seleccione si desea cambiar');
                if (pac.id_obra_social) {
                    document.getElementById('confirmar-obra-social').value = pac.id_obra_social;
                }
            });
        })
        .catch(console.error);
  }
  
  document.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', cancelarReserva);
  });
}

window.finalizarReserva = async () => {
    const btn = document.getElementById("btn-confirmar-reserva");
    btn.textContent = "Confirmando...";
    btn.disabled = true;

    try {
        const pac = JSON.parse(sessionStorage.getItem("pacienteAuth"));
        const selectObraSocial = document.getElementById("confirmar-obra-social");
        const idObraSocial = selectObraSocial ? selectObraSocial.value : pac.id_obra_social;
        
        const payload = {
            id_profesional: selP.id_profesional,
            fecha: selP.diaStr,
            hora: selP.horario,
            paciente: {
                id_paciente: pac.id_paciente,
                id_obra_social: idObraSocial
            } // The backend /api/turnos/reservar uses the existing user when id_paciente is sent ?
        };

        const resp = await fetch("/api/turnos/reservar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (resp.ok) {
            if (idObraSocial) {
                pac.id_obra_social = idObraSocial;
                if (selectObraSocial && selectObraSocial.selectedIndex >= 0) {
                     pac.obra_social_nombre = selectObraSocial.options[selectObraSocial.selectedIndex].text;
                }
                sessionStorage.setItem("pacienteAuth", JSON.stringify(pac));
            }

            const infoParaConfirmacionUI = {
                pacienteNombre: `${pac.pac_nombre || ''} ${pac.pac_apellido || ''}`,
                profesional: selP.profesionalNombre,
                fechaDisplay: selP.dia,
                horario: selP.horario,
            };
            mostrarConfirmacion(infoParaConfirmacionUI, "inicio");
        } else {
            alert("Error al intentar realizar la reserva.");
            btn.textContent = "Confirmar Reserva";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Hubo un error de conexión.");
        btn.textContent = "Confirmar Reserva";
        btn.disabled = false;
    }
};

export function cancelarReserva() {
  selP = {};
  irA("inicio");
}
