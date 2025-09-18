// ===== Estado general =====
const TOTAL_STEPS = 3;
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
    if (current === 2) applyDescRules();
    const h = document.querySelector(`.mm-step[data-step="${current}"] h2`);
    h?.focus?.();
    if (current === 1) setTimeout(() => map.invalidateSize(), 200);
    window.scrollTo({top: document.querySelector('.mm-form').offsetTop - 20, behavior: 'smooth'});
}

// ===== Paso 1: mapa =====
const map = L.map('map', {center: [-38.4, -63.6], zoom: 5, scrollWheelZoom: true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'}).addTo(map);
const markersLayer = L.layerGroup().addTo(map);

const latEl = document.getElementById('lat');
const lngEl = document.getElementById('lng');
const btnNext1 = document.getElementById('btnNext1');
const locPreview = document.getElementById('locPreview');
const locText = document.getElementById('locText');

function setLocation(latlng) {
    markersLayer.clearLayers();
    L.marker(latlng).addTo(markersLayer);
    latEl.value = latlng.lat.toFixed(6);
    lngEl.value = latlng.lng.toFixed(6);
    locText.textContent = `Lat: ${latEl.value} · Lng: ${lngEl.value}`;
    locPreview.hidden = false;
    btnNext1.disabled = false;
}

map.on('click', e => setLocation(e.latlng));
document.getElementById('btnReubicar')?.addEventListener('click', () => {
    btnNext1.disabled = true;
    locPreview.hidden = true;
    markersLayer.clearLayers();
});

// Avance/retroceso
document.getElementById('btnNext1')?.addEventListener('click', () => {
    if (!latEl.value || !lngEl.value) return;
    gotoStep(2);
});

// ===== Paso 2: datos (valida antes de avanzar) =====
const form = document.getElementById('form-hecho');
const btnPrev2 = document.getElementById('btnPrev2');
const btnNext2 = document.getElementById('btnNext2');

btnPrev2?.addEventListener('click', () => gotoStep(1));

// --- Reglas de descripción según sesión ---
const desc = document.getElementById('descripcion');
const counter = document.getElementById('descCounter');

function applyDescRules(){
    const auth   = (window.MM && MM.getAuth) ? MM.getAuth() : { loggedIn:false, role:'VISUALIZADOR' };
    const isAnon = !auth.loggedIn || auth.role === 'VISUALIZADOR';

    // Siempre requerida; el mínimo depende del rol
    desc.required = true;
    if (isAnon) {
        desc.setAttribute('minlength', '500');
    } else {
        desc.removeAttribute('minlength'); // logueado: sin mínimo
    }
    // Refresca el contador con el formato correcto
    const len = (desc.value || '').trim().length;
    counter.textContent = isAnon ? `${len} / 500` : `${len}`;
}

// Contador dinámico (respeta si hay mínimo o no)
desc?.addEventListener('input', () => {
    const auth   = (window.MM && MM.getAuth) ? MM.getAuth() : { loggedIn:false, role:'VISUALIZADOR' };
    const isAnon = !auth.loggedIn || auth.role === 'VISUALIZADOR';
    const len = (desc.value || '').trim().length;
    counter.textContent = isAnon ? `${len} \/ 500` : `${len}`;
});

btnNext2?.addEventListener('click', () => {
    const scope = document.querySelector('.mm-step[data-step="2"]');
    const inputs = [...scope.querySelectorAll('input, select, textarea')];

    let ok = true;
    inputs.forEach(el => {
        if (!el.checkValidity()) {
            el.reportValidity();
            ok = false;
        }
    });
    if (ok) gotoStep(3);
});

// ===== Paso 3: multimedia opcional =====
const drop = document.getElementById('dropzone');
const input = document.getElementById('mediaInput');
const preview = document.getElementById('mediaPreview');
const btnPrev3 = document.getElementById('btnPrev3');

let MEDIA_FILES = [];

btnPrev3?.addEventListener('click', () => gotoStep(2));

function renderMedia() {
    preview.innerHTML = '';
    MEDIA_FILES.forEach((file, i) => {
        const card = document.createElement('div');
        card.className = 'mm-media-card';
        const isImg = file.type.startsWith('image/');
        const url = URL.createObjectURL(file);
        card.innerHTML = `
        ${isImg
            ? `<img src="${url}" alt="${file.name}">`
            : `<video src="${url}" muted></video>`}
        <button type="button" class="mm-media-remove" aria-label="Quitar">&times;</button>
        <span class="mm-media-name" title="${file.name}">${file.name}</span>
      `;
        card.querySelector('.mm-media-remove').addEventListener('click', () => {
            MEDIA_FILES.splice(i, 1);
            renderMedia();
        });
        preview.appendChild(card);
    });
}

function addFiles(files) {
    for (const f of files) {
        if (!/^image\/|^video\//.test(f.type)) continue;
        MEDIA_FILES.push(f);
    }
    renderMedia();
}

drop?.addEventListener('click', () => input.click());
drop?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
    }
});
input?.addEventListener('change', (e) => addFiles(e.target.files));

['dragover', 'dragenter'].forEach(ev =>
    drop?.addEventListener(ev, e => {
        e.preventDefault();
        drop.classList.add('is-drag');
    })
);
['dragleave', 'drop'].forEach(ev =>
    drop?.addEventListener(ev, e => {
        e.preventDefault();
        drop.classList.remove('is-drag');
    })
);
drop?.addEventListener('drop', e => addFiles(e.dataTransfer.files));

// ===== Envío del formulario (multimedia opcional) =====
form?.addEventListener('submit', (e) => {
    // Validación global mínima:
    if (!latEl.value || !lngEl.value) {
        e.preventDefault();
        gotoStep(1);
        return;
    }
    if (!form.checkValidity()) {
        e.preventDefault();
        gotoStep(2);
        return;
    }

    // Ejemplo de envío con FormData (AJUSTAR endpoint)
    e.preventDefault(); // quitá esto cuando tengas backend
    const fd = new FormData(form);
    MEDIA_FILES.forEach((f, i) => fd.append('media[]', f, f.name));

    // fetch('/api/hechos', { method:'POST', body: fd })
    //   .then(r => r.ok ? alert('Hecho enviado ✅') : alert('Error al enviar'))
    //   .catch(()=> alert('Error de red'));

    console.log('Form listo para enviar', Object.fromEntries(fd.entries()), MEDIA_FILES);
    alert('Simulación: Hecho enviado ✅');
});

// (opcional) permitir retroceder clickeando los “steps” solo hacia atrás
dots.forEach(li => {
    li.addEventListener('click', () => {
        const n = Number(li.dataset.step);
        if (n < current) gotoStep(n);
    });
});

