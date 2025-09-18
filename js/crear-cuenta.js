document.addEventListener('DOMContentLoaded', () => {
    // ----- Pasos / progreso -----
    const TOTAL_STEPS = 2;
    let current = 1;

    const steps = [...document.querySelectorAll('.mm-step')];
    const dots = [...document.querySelectorAll('.mm-steps li')];
    const progressBar = document.getElementById('progressBar');

    function setProgress(n) {
        const pct = Math.round(((n - 1) / (TOTAL_STEPS - 1)) * 100);
        progressBar.style.width = pct + '%';
        dots.forEach(d => d.classList.toggle('is-active', Number(d.dataset.step) === n));
    }

    function gotoStep(n) {
        current = Math.max(1, Math.min(TOTAL_STEPS, n));
        steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === current));
        setProgress(current);
    }

    setProgress(1);

    // ----- Paso 1: roles -----
    const radiosRol = [...document.querySelectorAll('input[name="rol"]')];
    const btnNext1 = document.getElementById('btnNext1');

    function selectedRole() {
        const r = radiosRol.find(r => r.checked);
        return r ? r.value : '';
        // 'administrador' | 'contribuyente'
    }

    radiosRol.forEach(r => r.addEventListener('change', () => {
        btnNext1.disabled = !selectedRole();
    }));

    btnNext1?.addEventListener('click', () => {
        if (!selectedRole()) return;
        // Reglas extra para admin (como ya hacías):
        const isAdmin = selectedRole() === 'administrador';
        document.getElementById('apellido').required = isAdmin ? true : false;
        document.getElementById('fechaDeNacimiento').required = isAdmin ? true : false;

        gotoStep(2);
        const h2 = document.getElementById('seccionDatosCrearCuenta');
        h2?.focus?.();
    });

    // Botón volver paso 1 (tu HTML vuelve a iniciar-sesion; si querés volver al paso 1, usa gotoStep(1))
    const btnPrev2 = document.getElementById('btnPrev2');
    btnPrev2?.addEventListener('click', () => gotoStep(1));


    // ----- Fecha UX (focus/blur tipo text/date) -----
    const fechaID = 'fechaDeNacimiento';
    const fecha = document.getElementById(fechaID);
    if (fecha) {
        fecha.type = 'text';
        fecha.addEventListener('focus', () => fecha.type = 'date');
        fecha.addEventListener('blur', () => fecha.type = 'text');
    }

    // ----- Submit: crear cuenta + setear sesión -----
    const form = document.getElementById('form-usuario');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validación básica de todo el form visible
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const rol = selectedRole() || 'contribuyente';
        const data = {
            rol,
            nombre: (document.getElementById('nombre')?.value || '').trim(),
            apellido: (document.getElementById('apellido')?.value || '').trim(),
            fechaDeNacimiento: document.getElementById('fechaDeNacimiento')?.value || null,
            email: (document.getElementById('email')?.value || '').trim(),
            password: (document.getElementById('password')?.value || '').trim()
        };

        // (Opcional) llamado a tu backend real:
        // try {
        //   const resp = await fetch('/api/usuarios', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data)
        //   });
        //   if (!resp.ok) throw new Error(await resp.text() || resp.status);
        // } catch (err) {
        //   alert('Error al crear usuario: ' + err.message);
        //   return;
        // }

        // MOCK: al crear la cuenta, lo logueamos automáticamente
        const payload = {
            email: data.email || `${data.nombre || 'user'}@metamapa.local`,
            role: rol,
            name: `${data.nombre || ''} ${data.apellido || ''}`.trim()
        };
        if (window.MM && MM.setAuth) {
            MM.setAuth(payload, {remember: true}); // persiste en localStorage
        } else {
            // Fallback si falta commons.js
            localStorage.setItem('mm_auth', JSON.stringify({...payload, loggedIn: true, time: Date.now()}));
        }

        // Redirección según rol
        if (rol === 'administrador') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'main-gral.html';
        }
    });
});


//
// window.addEventListener("load", function(){
//     document.getElementById('seccionDatosCrearCuenta').style.display="none";
//     const fechaID = 'fechaDeNacimiento'
//     document.getElementById(fechaID).type= 'text';
//
//     document.getElementById(fechaID).addEventListener('blur',function(){
//
//         document.getElementById(fechaID).type= 'text';
//
//     });
//
//     document.getElementById(fechaID).addEventListener('focus',function(){
//
//         document.getElementById(fechaID).type= 'date';
//
//     });
// })

function activarSeccionDatosCrearCuenta() {
    document.getElementById('seccionDatosCrearCuenta').style.display = "grid";
    document.getElementById('seccionDeRoles').style.display = "none";
}

function activarSeccionDatosCrearCuentaContribuyente() {
    activarSeccionDatosCrearCuenta()

}

function activarSeccionDatosCrearCuentaAdministrador() {
    activarSeccionDatosCrearCuenta()
    document.getElementById('apellido').required = true;
    document.getElementById('fechaDeNacimiento').required = true;
}

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validación Bootstrap
    const form = e.currentTarget;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const data = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        // LocalDate en ISO "yyyy-MM-dd"
        fechaDeNacimiento: document.getElementById('fechaDeNacimiento').value,
        // Si tu backend espera rol por id:
        rolId: parseInt(document.getElementById('rolId').value, 10)
        // Si en cambio espera rol por nombre: rol: document.getElementById('rolId').selectedOptions[0].text
    };

    try {
        const resp = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (!resp.ok) {
            const msg = await resp.text();
            alert('Error al crear usuario: ' + msg);
            return;
        }

        // éxito
        alert('Usuario creado con éxito');
        form.reset();
        form.classList.remove('was-validated');
        // redirigí si querés:
        // window.location.href = '/login.html';
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
    }
});

// ===== Helpers de alertas =====
function showAlert(msg) {
    const box = document.getElementById('formAlert');
    if (!box) return;
    box.textContent = msg;
    box.classList.remove('d-none');
}

function clearAlert() {
    const box = document.getElementById('formAlert');
    if (!box) return;
    box.classList.add('d-none');
    box.textContent = '';
}

function markInvalid(el, msg = '') {
    if (!el) return;
    el.classList.add('is-invalid');
    el.classList.remove('is-valid');
    if (msg) el.setCustomValidity(msg);
    // Si querés tooltip nativo:
    // el.reportValidity();
}

function markValid(el) {
    if (!el) return;
    el.classList.remove('is-invalid');
    el.classList.add('is-valid');
    el.setCustomValidity('');
}

// ===== Vinculá estos listeners en tu DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', () => {
    const form   = document.getElementById('form-usuario');
    const email  = document.getElementById('email');
    const pass   = document.getElementById('password');
    const nombre = document.getElementById('nombre');
    const apellido = document.getElementById('apellido');
    const fNac   = document.getElementById('fechaDeNacimiento');

    // Validación en vivo (email)
    email?.addEventListener('input', () => {
        if (!email.value.trim()) {
            markInvalid(email, 'Ingresá un email.');
        } else if (email.validity.typeMismatch) {
            markInvalid(email, 'Formato de email inválido.');
        } else {
            markValid(email);
        }
        clearAlert();
    });

    // Validación en vivo (password)
    pass?.addEventListener('input', () => {
        if (!pass.value.trim()) {
            markInvalid(pass, 'Ingresá una contraseña.');
        } else if (pass.value.length < 8) {
            markInvalid(pass, 'La contraseña debe tener al menos 8 caracteres.');
        } else {
            markValid(pass);
        }
        clearAlert();
    });

    // Validación en vivo (nombre)
    nombre?.addEventListener('input', () => {
        if (!nombre.value.trim()) markInvalid(nombre, 'Ingresá tu nombre.');
        else markValid(nombre);
        clearAlert();
    });

    // Apellido/fecha solo los exijo si rol = administrador (se controla en submit)

    // ===== Submit con chequeos y mensajes claros =====
    form?.addEventListener('submit', (e) => {
        clearAlert();
        let errores = [];

        // Rol
        const rol = (document.querySelector('input[name="rol"]:checked')?.value) || '';
        if (!rol) {
            errores.push('Elegí un rol.');
        }

        // Nombre
        if (!nombre?.value.trim()) {
            errores.push('Ingresá tu nombre.');
            markInvalid(nombre, 'Ingresá tu nombre.');
        } else markValid(nombre);

        // Email
        if (!email?.value.trim()) {
            errores.push('Ingresá un email.');
            markInvalid(email, 'Ingresá un email.');
        } else if (email.validity.typeMismatch) {
            errores.push('Formato de email inválido.');
            markInvalid(email, 'Formato de email inválido.');
        } else markValid(email);

        // Password
        if (!pass?.value.trim()) {
            errores.push('Ingresá una contraseña.');
            markInvalid(pass, 'Ingresá una contraseña.');
        } else if (pass.value.length < 8) {
            errores.push('La contraseña debe tener al menos 8 caracteres.');
            markInvalid(pass, 'La contraseña debe tener al menos 8 caracteres.');
        } else markValid(pass);

        // Si rol = administrador, apellido + fecha obligatorios
        // if (rol === 'administrador' || rol === 'contribuyente') {
        //     if (!apellido?.value.trim()) {
        //         errores.push('El apellido es obligatorio.');
        //         markInvalid(apellido, 'Ingresá tu apellido.');
        //     } else markValid(apellido);
        //
        //     if (!fNac?.value) {
        //         errores.push('La fecha de nacimiento es obligatoria.');
        //         markInvalid(fNac, 'Ingresá tu fecha de nacimiento.');
        //     } else markValid(fNac);
        // } else {
        //     // Si no es admin o contribuyente, limpio estados si existieran
        //     apellido && apellido.classList.remove('is-invalid','is-valid');
        //     fNac && fNac.classList.remove('is-invalid','is-valid');
        // }

        // Si hay errores, no enviamos y mostramos banner + foco en el primero
        if (errores.length) {
            e.preventDefault();
            form.classList.add('was-validated');
            showAlert('Revisá el formulario: ' + errores[0]); // Mostramos el primero (podemos concatenar todos si queremos)
            const firstInvalid = form.querySelector('.is-invalid, :invalid');
            firstInvalid?.focus?.();
            return;
        }

        // Si todo OK, dejá seguir (tu lógica de alta + MM.setAuth + redirect)
        // Nota: si usás fetch al backend y hacés e.preventDefault(), recordá mostrar error en showAlert si el POST falla.
    });
});
