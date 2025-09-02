

window.addEventListener("load", function(){
    document.getElementById('seccionDatosCrearCuenta').style.display="none";
    const fechaID = 'fechaDeNacimiento'
    document.getElementById(fechaID).type= 'text';

    document.getElementById(fechaID).addEventListener('blur',function(){

        document.getElementById(fechaID).type= 'text';

    });

    document.getElementById(fechaID).addEventListener('focus',function(){

        document.getElementById(fechaID).type= 'date';

    });
})

function activarSeccionDatosCrearCuenta(){
    document.getElementById('seccionDatosCrearCuenta').style.display="grid";
    document.getElementById('seccionDeRoles').style.display="none";
}

function activarSeccionDatosCrearCuentaContribuyente(){
    activarSeccionDatosCrearCuenta()

}

function activarSeccionDatosCrearCuentaAdministrador(){
    activarSeccionDatosCrearCuenta()
    document.getElementById('apellido').required= true;
    document.getElementById('fechaDeNacimiento').required= true;
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
            headers: { 'Content-Type': 'application/json' },
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