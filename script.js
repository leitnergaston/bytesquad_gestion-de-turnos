// LÓGICA JAVASCRIPT
        // 1. BASE DE DATOS MEJORADA (Array de Objetos para enseñar estructuración)
        const datosBD = {
            especialidades: [
                { nombre: "Cardiología", icono: "🫀" },
                { nombre: "Dermatología", icono: "🧴" },
                { nombre: "Kinesiología", icono: "🦴" },
                { nombre: "Nutrición", icono: "🥗" },
                { nombre: "Odontología", icono: "🦷" },
                { nombre: "Pediatría", icono: "🧸" }
            ],
            profesionales: [
                { nombre: "Martín Abad", genero: "M" },
                { nombre: "Sofía Castro", genero: "F" },
                { nombre: "Julián Domínguez", genero: "M" },
                { nombre: "Laura Giménez", genero: "F" }
            ],
            horarios: [
                "09:00", "09:30", "10:00", "10:30", 
                "11:00", "11:30", "16:00", "16:30"
            ]
        };

        // 2. AGENDA DINÁMICA (Aquí se guardan las fechas de atención de cada médico - Formato: YYYY-MM-DD)
        // Para el ejemplo, ya tienen algunos días pre-cargados en el mes de Julio 2026.
        let agendaProfesionales = {
            "Martín Abad": ["2026-07-06", "2026-07-13", "2026-07-20"],
            "Sofía Castro": ["2026-07-07", "2026-07-14", "2026-07-21"],
            "Julián Domínguez": ["2026-07-08", "2026-07-15", "2026-07-22"],
            "Laura Giménez": ["2026-07-09", "2026-07-16", "2026-07-23"]
        };

        let seleccionUsuario = { especialidad: "", profesional: "", dia: "", horario: "" };

        // Función enrutadora
        function irA(nombrePantalla) {
            const pantallas = document.querySelectorAll('.pantalla');
            pantallas.forEach(p => p.classList.remove('activa'));
            const pantallaDestino = document.getElementById('pantalla-' + nombrePantalla);
            if(pantallaDestino) pantallaDestino.classList.add('activa');
        }

        // ==========================================
        // LÓGICA DE SEGURIDAD (LOGIN SECRETARÍA)
        // ==========================================
        
        let secretariaLogueada = false; // Estado global de la sesión

        function intentarIngresoSecretaria() {
            if (secretariaLogueada) {
                // Si ya inició sesión antes, entra directo al menú
                irA('secretaria-menu');
            } else {
                // Si no, le pedimos credenciales
                document.getElementById('login-usuario').value = '';
                document.getElementById('login-password').value = '';
                irA('login');
            }
        }

        function procesarLogin() {
            const usuarioIngresado = document.getElementById('login-usuario').value;
            const passwordIngresado = document.getElementById('login-password').value;

            // Validamos las credenciales solicitadas (admin / 123)
            if (usuarioIngresado === 'admin' && passwordIngresado === '123') {
                secretariaLogueada = true;
                irA('secretaria-menu');
            } else {
                alert('⚠️ Acceso Denegado: Usuario o contraseña incorrectos.');
            }
        }

        function cerrarSesion() {
            secretariaLogueada = false; // Destruimos la sesión
            alert('🔒 Sesión cerrada correctamente.');
            irA('inicio');
        }

        // ==========================================
        // LÓGICA DE PACIENTES
        // ==========================================
        
        function iniciarReserva() {
            seleccionUsuario = { especialidad: "", profesional: "", dia: "", horario: "" };
            const contenedor = document.getElementById('contenedor-especialidades');
            contenedor.innerHTML = ""; 
            
            // Usamos los emojis configurados en los objetos de especialidad
            datosBD.especialidades.forEach(esp => {
                const tarjeta = `
                    <div class="tarjeta-avatar" onclick="elegirEspecialidad('${esp.nombre}')">
                        <div class="circulo-imagen">${esp.icono}</div>
                        <span>${esp.nombre}</span>
                    </div>`;
                contenedor.innerHTML += tarjeta;
            });
            irA('especialidades');
        }

        function elegirEspecialidad(especialidad) {
            seleccionUsuario.especialidad = especialidad;
            const contenedor = document.getElementById('contenedor-profesionales');
            contenedor.innerHTML = "";
            
            // Asignamos avatar genérico según el género
            datosBD.profesionales.forEach(prof => {
                const iconoDoctor = prof.genero === "M" ? "👨‍⚕️" : "👩‍⚕️";
                const titulo = prof.genero === "M" ? "Dr." : "Dra.";
                const tarjeta = `
                    <div class="tarjeta-avatar" onclick="elegirProfesional('${prof.nombre}')">
                        <div class="circulo-imagen">${iconoDoctor}</div>
                        <span>${titulo} ${prof.nombre}</span>
                    </div>`;
                contenedor.innerHTML += tarjeta;
            });
            irA('profesionales');
        }

        function elegirProfesional(nombreProfesional) {
            seleccionUsuario.profesional = nombreProfesional;
            generarCalendarioPaciente();
            irA('dias');
        }

        function generarCalendarioPaciente() {
            const contenedor = document.getElementById('contenedor-calendario');
            contenedor.innerHTML = "";
            
            // Espacios vacíos para que el mes empiece el día correcto (Ejemplo miércoles)
            for(let i=0; i<2; i++) {
                contenedor.innerHTML += `<div class="celda-dia" style="background: transparent;"></div>`;
            }

            // Generar los 31 días y consultar si están en la Agenda del profesional
            const agendaDelMedico = agendaProfesionales[seleccionUsuario.profesional] || [];

            for(let dia=1; dia<=31; dia++) {
                // Formatear el día a YYYY-MM-DD para compararlo con la agenda
                const diaFormateado = dia < 10 ? `0${dia}` : dia;
                const fechaStr = `2026-07-${diaFormateado}`;
                
                // Si la fecha existe en el array del médico, el botón está disponible
                if (agendaDelMedico.includes(fechaStr)) {
                    contenedor.innerHTML += `<div class="celda-dia disponible" onclick="elegirDia(${dia}, '${fechaStr}')">${dia}</div>`;
                } else {
                    contenedor.innerHTML += `<div class="celda-dia">${dia}</div>`;
                }
            }
        }

        function elegirDia(numeroDia, fechaStr) {
            seleccionUsuario.dia = `${numeroDia} de Julio`;
            document.getElementById('titulo-fecha-elegida').innerText = `Día elegido: ${seleccionUsuario.dia}`;
            
            const contenedor = document.getElementById('contenedor-horarios');
            contenedor.innerHTML = "";
            
            datosBD.horarios.forEach(hora => {
                const boton = `<button class="btn btn-secundario" style="background: white; border: 2px solid #E5E7EB; border-radius: 15px;" onclick="elegirHorario('${hora}')">${hora}</button>`;
                contenedor.innerHTML += boton;
            });
            irA('horarios');
        }

        function elegirHorario(hora) {
            seleccionUsuario.horario = hora;
            document.getElementById('resumen-turno').innerHTML = `
                🩺 <b>Especialista:</b> ${seleccionUsuario.profesional}<br>
                📅 <b>Agendado para:</b> ${seleccionUsuario.dia} a las ${hora} hs.
            `;
            irA('datos');
        }

        function finalizarReserva() {
            const dni = document.getElementById('dni').value;
            const celular = document.getElementById('celular').value;

            if (dni === "" || celular === "") {
                alert("Por favor completa tu DNI y Celular.");
                return; 
            }
            alert(`¡Genial! 🎉\n\nTu turno está reservado con ${seleccionUsuario.profesional}. Te esperamos el ${seleccionUsuario.dia} a las ${seleccionUsuario.horario} hs.`);
            
            document.getElementById('dni').value = ""; document.getElementById('celular').value = "";
            irA('inicio');
        }

        // ==========================================
        // LÓGICA DE SECRETARÍA: CONFIGURAR AGENDA
        // ==========================================

        function abrirConfiguracionAgenda() {
            const select = document.getElementById('agenda-profesional');
            select.innerHTML = '<option value="">Seleccione profesional...</option>';
            datosBD.profesionales.forEach(prof => {
                select.innerHTML += `<option value="${prof.nombre}">${prof.nombre}</option>`;
            });
            document.getElementById('contenedor-dias-agenda').innerHTML = "<p style='color:#9CA3AF;'>Seleccione un médico arriba.</p>";
            irA('agenda');
        }

        function renderizarDiasAgenda() {
            const profesional = document.getElementById('agenda-profesional').value;
            const contenedor = document.getElementById('contenedor-dias-agenda');
            
            if (!profesional) {
                contenedor.innerHTML = "<p style='color:#9CA3AF;'>Seleccione un médico arriba.</p>";
                return;
            }

            const fechasAsignadas = agendaProfesionales[profesional] || [];
            
            if (fechasAsignadas.length === 0) {
                contenedor.innerHTML = "<p style='color:#EF4444;'>No hay días asignados. El médico no aparecerá disponible para los pacientes.</p>";
                return;
            }

            // Ordenamos las fechas para que se vean prolijas
            fechasAsignadas.sort();
            
            contenedor.innerHTML = "";
            fechasAsignadas.forEach(fecha => {
                // Mostramos solo el día para que sea fácil de leer (Ej: corta "2026-07-15" a "15")
                const soloDia = fecha.split('-')[2];
                contenedor.innerHTML += `
                    <div class="badge-dia">
                        ${soloDia}/07 
                        <button onclick="eliminarDiaAgenda('${profesional}', '${fecha}')" title="Quitar día">✖</button>
                    </div>`;
            });
        }

        function agregarDiaAgenda() {
            const profesional = document.getElementById('agenda-profesional').value;
            const fechaInput = document.getElementById('agenda-fecha').value;

            if (!profesional) { alert("Seleccione un profesional primero."); return; }
            if (!fechaInput) { alert("Seleccione una fecha del calendario."); return; }

            // Si el médico no tiene array creado, lo creamos
            if (!agendaProfesionales[profesional]) {
                agendaProfesionales[profesional] = [];
            }

            // Evitamos duplicados
            if (agendaProfesionales[profesional].includes(fechaInput)) {
                alert("Ese día ya está asignado al profesional.");
                return;
            }

            agendaProfesionales[profesional].push(fechaInput);
            document.getElementById('agenda-fecha').value = ""; // Limpiamos el input
            renderizarDiasAgenda(); // Volvemos a dibujar las pastillas
        }

        function eliminarDiaAgenda(profesional, fechaStr) {
            // Buscamos la posición de la fecha en el array y la borramos
            const index = agendaProfesionales[profesional].indexOf(fechaStr);
            if (index > -1) {
                agendaProfesionales[profesional].splice(index, 1);
            }
            renderizarDiasAgenda();
        }

        // ==========================================
        // LÓGICA DE SECRETARÍA: TURNO RÁPIDO
        // ==========================================

        let horarioRapidoSeleccionado = "";

        function abrirTurnoRapido() {
            const select = document.getElementById('select-profesional-rapido');
            select.innerHTML = '<option value="">Seleccione profesional...</option>';
            datosBD.profesionales.forEach(prof => {
                select.innerHTML += `<option value="${prof.nombre}">${prof.nombre}</option>`;
            });
            
            document.getElementById('buscador-rapido').value = "";
            document.getElementById('mensaje-autocompletado').style.display = "none";
            document.getElementById('fecha-rapida').value = "";
            document.getElementById('motivo-turno').value = "";
            document.getElementById('grilla-horarios-rapida').style.display = "none";
            document.getElementById('mensaje-seleccionar-fecha').style.display = "block";
            horarioRapidoSeleccionado = "";
            
            irA('secretaria');
        }

        function simularAutocompletar() {
            const input = document.getElementById('buscador-rapido').value;
            const mensaje = document.getElementById('mensaje-autocompletado');
            if (input.length >= 3) mensaje.style.display = "block";
            else mensaje.style.display = "none";
        }

        function generarGrillaRapida() {
            const grilla = document.getElementById('grilla-horarios-rapida');
            const mensaje = document.getElementById('mensaje-seleccionar-fecha');
            const fechaSeleccionada = document.getElementById('fecha-rapida').value;
            
            if (!fechaSeleccionada) {
                grilla.style.display = "none"; mensaje.style.display = "block"; return;
            }

            grilla.style.display = "grid"; mensaje.style.display = "none";
            grilla.innerHTML = ""; horarioRapidoSeleccionado = "";

            datosBD.horarios.forEach((hora) => {
                // 30% probabilidad de que esté ocupado para evitar el RF-03 (Requerimiento Ficticio)
                const estaOcupado = Math.random() < 0.3; 
                if (estaOcupado) {
                    grilla.innerHTML += `<button class="btn btn-secundario hora-ocupada" disabled title="Turno ocupado">${hora}</button>`;
                } else {
                    grilla.innerHTML += `<button class="btn btn-secundario" style="background: white; border: 2px solid #E5E7EB; border-radius: 15px;" onclick="seleccionarHorarioRapido(this, '${hora}')">${hora}</button>`;
                }
            });
        }

        function seleccionarHorarioRapido(botonClickeado, hora) {
            horarioRapidoSeleccionado = hora;
            const botones = document.getElementById('grilla-horarios-rapida').querySelectorAll('button:not(.hora-ocupada)');
            botones.forEach(b => {
                b.style.backgroundColor = "white"; b.style.borderColor = "#E5E7EB"; b.style.color = "var(--color-texto-oscuro)";
            });
            botonClickeado.style.backgroundColor = "var(--color-principal)";
            botonClickeado.style.borderColor = "var(--color-principal)";
            botonClickeado.style.color = "white";
        }

        function guardarTurnoRapido() {
            const paciente = document.getElementById('buscador-rapido').value;
            const profesional = document.getElementById('select-profesional-rapido').value;
            const fecha = document.getElementById('fecha-rapida').value;
            const enviaWpp = document.getElementById('recordatorio-wpp').checked;

            if (!paciente || !profesional || !fecha || !horarioRapidoSeleccionado) {
                alert("⚠️ Faltan datos (Paciente, Médico, Fecha o elegir Hora)."); return;
            }

            let msjFinal = `✅ TURNO GUARDADO\n\nPaciente: ${paciente}\nMédico: ${profesional}\nFecha y Hora: ${fecha} - ${horarioRapidoSeleccionado} hs.`;
            if (enviaWpp) msjFinal += `\n\n📲 Recordatorio automático enviado.`;

            alert(msjFinal);
            irA('secretaria-menu');
        }