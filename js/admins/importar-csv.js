// --------- Helpers UI ----------
const dropzone   = document.getElementById('dropzone');
const fileInput  = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
const btnImport  = document.getElementById('btnImportar');
const btnSpin    = document.getElementById('btnSpinner');

dropzone.addEventListener('dragover', (e)=>{
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', ()=>{
    dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e)=>{
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if(e.dataTransfer.files && e.dataTransfer.files[0]){
        fileInput.files = e.dataTransfer.files;
        showFileName();
    }
});
dropzone.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', showFileName);

function showFileName(){
    const f = fileInput.files && fileInput.files[0];
    if(!f){
        fileNameEl.classList.add('d-none');
        btnImport.disabled = true;
        return;
    }
    if(!f.name.toLowerCase().endsWith('.csv')){
        alert('El archivo debe ser .csv');
        fileInput.value = '';
        btnImport.disabled = true;
        return;
    }
    fileNameEl.textContent = f.name;
    fileNameEl.classList.remove('d-none');
    btnImport.disabled = false;
}

// --------- POST a la API ----------
const form = document.getElementById('csvForm');

form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const file = fileInput.files[0];
    if(!file) return;

    const fd = new FormData();
    // Debe coincidir con @RequestParam("archivo")
    fd.append('archivo', file);

    btnImport.disabled = true;
    btnSpin.classList.remove('d-none');

    try{
        // ⚠️ Si el back corre en otro puerto/host, usá la URL completa:
        // const resp = await fetch('http://localhost:8080/api/hechos/importar', { method: 'POST', body: fd });
        const resp = await fetch('/api/hechos/importar', { method: 'POST', body: fd });

        const text = await resp.text(); // tu controller devuelve String
        showResultModal(resp.ok, text);

    }catch(err){
        showResultModal(false, 'No se pudo conectar con el servidor.');
    }finally{
        btnImport.disabled = false;
        btnSpin.classList.add('d-none');
    }
});

// --------- Modal resultado ----------
const resultModal = new bootstrap.Modal(document.getElementById('resultModal')); // <-- así
const modalTitle  = document.getElementById('modalTitle');
const modalBody   = document.getElementById('modalBody');
const modalVariant= document.getElementById('modalVariant');

function showResultModal(ok, message){
    modalTitle.textContent = ok ? '¡Tu archivo se ha importado con éxito!' : 'No se pudo importar el archivo';
    modalBody.textContent  = message || (ok ? 'Hechos importados correctamente.' : 'Revisá el formato del CSV.');
    modalVariant.classList.toggle('modal-success', ok);
    modalVariant.classList.toggle('modal-error', !ok);
    resultModal.show();
}

// Utilidad: limpiamos HTML si el servidor devolvió una página de error
function plainTextFromResponseBody(text) {
    // Si tiene tags HTML, los sacamos (simple, suficiente para páginas de error)
    const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped || 'Error desconocido';
}

async function readBodySmart(resp) {
    const ct = resp.headers.get('content-type') || '';
    const raw = await resp.text(); // tu endpoint devuelve String
    if (ct.includes('application/json')) {
        try {
            const data = JSON.parse(raw);
            return typeof data === 'string' ? data : (data.mensaje || JSON.stringify(data));
        } catch { /* cae a texto plano abajo */ }
    }
    return plainTextFromResponseBody(raw);
}

form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const file = fileInput.files[0];
    if(!file) return;

    const fd = new FormData();
    fd.append('archivo', file);   // debe coincidir con @RequestParam("archivo")

    btnImport.disabled = true;
    btnSpin.classList.remove('d-none');

    try {
        // Usa URL ABSOLUTA si back y front van en puertos distintos
        const resp = await fetch('/api/hechos/importar', { method:'POST', body: fd });

        const message = await readBodySmart(resp);

        // Mensajes más claros por status
        if (resp.ok) {
            showResultModal(true, message || 'Importación exitosa.');
        } else {
            let friendly = message;
            if (resp.status === 404) friendly = 'No se encontró la ruta /api/hechos/importar (404). Verificá la URL y que el back esté corriendo.';
            if (resp.status === 400) friendly = 'El servidor rechazó el archivo (400). ¿Es un CSV válido?';
            if (resp.status === 415) friendly = 'Tipo de archivo no soportado (415). Subí un .csv.';
            if (resp.status >= 500) friendly = 'Error del servidor (5xx). Revisá logs del backend.';
            showResultModal(false, friendly);
        }
    } catch (err) {
        showResultModal(false, 'No se pudo conectar con el servidor. ¿Está levantado el backend? ¿CORS habilitado?');
    } finally {
        btnImport.disabled = false;
        btnSpin.classList.add('d-none');
    }
});
