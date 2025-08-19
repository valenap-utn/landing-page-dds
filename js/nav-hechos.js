// ====== CONFIG ======
/* Para trabajar con el JSON local de prueba => DATA_URL apuntando al .json.
 * Para usar el backend, cambiar a: const DATA_URL = '/api/hechos';
 */
const DATA_URL = '../data/desastres_tecnologicos_argentina_20.json';

// Punto de vista por defecto (Argentina)
const FALLBACK_CENTER = [-38.4, -63.6];
const FALLBACK_ZOOM   = 5;

// ====== UTILIDADES ======
const $ = (sel) => document.querySelector(sel);
const exists = (el) => !!(el && el instanceof HTMLElement);

// Normaliza claves para buscarlas sin acentos/espacios
function normKey(k) {
    return k
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}

// Detecta la key a usar según candidatos (p.ej. ['lat','latitude','latitud'])
function pickKey(obj, candidates) {
    const dict = {};
    for (const k of Object.keys(obj)) dict[normKey(k)] = k;
    for (const c of candidates) {
        const want = normKey(c);
        if (dict[want]) return dict[want];
    }
    return null;
}

// Parse de fecha flexible: ISO, dd/mm/aaaa, dd-mm-aaaa, etc.
function parseDateSmart(v) {
    if (!v) return null;
    if (v instanceof Date) return v;

    const s = String(v).trim();

    // ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const [_, d, mo, y] = m;
        const iso = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
        const parsed = new Date(iso);
        return isNaN(parsed) ? null : parsed;
    }

    const d = new Date(s);
    return isNaN(d) ? null : d;
}

// Convierte cualquier número a float (o null)
function toNum(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

// ====== NORMALIZACIÓN DE HECHOS ======
/** Intenta mapear cualquier objeto "hecho" en:
 * { id, titulo, categoria, fecha, lat, long }
 */
function normalizeHecho(row, inferredMap = null) {
    const map = inferredMap || inferKeyMap(row);

    const id     = row[map.id] ?? row[map.id] ?? null;
    const titulo = row[map.titulo] ?? '';
    const cat    = row[map.categoria] ?? '';
    const fecha  = row[map.fecha] ?? null;
    const lat    = row[map.lat] ?? row[map.latitude];
    const lon    = row[map.long] ?? row[map.longitude];

    return {
        id:     id != null ? String(id) : '',
        titulo: String(titulo || '').trim(),
        categoria: String(cat || '').trim(),
        fecha: (() => {
            const dt = parseDateSmart(fecha);
            return dt ? dt.toISOString().slice(0,10) : null; // ISO corto YYYY-MM-DD
        })(),
        lat: toNum(lat),
        long: toNum(lon)
    };
}

// Detecta mapeo de claves a partir de una fila
function inferKeyMap(row) {
    const key = (cands) => pickKey(row, cands);

    return {
        id:       key(['id','codigo','identificador']),
        titulo:   key(['titulo','título','title','nombre']),
        categoria:key(['categoria','categoría','category','tipo']),
        fecha:     key([
            'fecha', 'fecha acontecimiento', 'fechaacontecimiento',
            'fecha carga', 'fechacarga', 'date',
            'fecha del hecho', 'fecha_del_hecho', 'fechasuceso', 'fechaevento'
        ]),
        lat:      key(['lat','latitud','latitude']),
        long:     key(['long','lon','lng','longitud','longitude'])
    };
}

// Normaliza una lista heterogénea
function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    const map = list.length ? inferKeyMap(list[0]) : null;
    return list.map(r => normalizeHecho(r, map))
        .filter(h => h.lat != null && h.long != null); // solo con coordenadas
}


// Pobla dinámicamente el <select id="fCategoria">
function populateCategoryFilter(hechos) {
    const sel = document.getElementById('fCategoria');
    if (!sel) return;

    // guardamos la primera opción (placeholder)
    const first = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (first) sel.appendChild(first);

    const cats = Array.from(new Set(
        hechos.map(h => h.categoria).filter(Boolean)
    )).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));

    for (const c of cats) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    }
}

// ====== DATOS ======
let HECHOS = [];

async function loadData() {
    try {
        const res = await fetch(DATA_URL, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Si la API devuelve { data: [...] } o similar, adaptamos:
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        HECHOS = normalizeList(arr);
    } catch (e) {
        console.error('No se pudieron cargar los hechos:', e);
        HECHOS = []; // fallback vacío
    }
}

// ====== MAPA ======
let map, markersLayer;

function initMap() {
    map = L.map('map', {
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
        scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// ====== POP-UP del MAPA ======

function popupHtml(h){
    return `
    <div class="mm-popup">
      <strong>${h.titulo}</strong><br/>
      <small>Categoría:</small> ${h.categoria || '-'}<br/>
      <small>Fecha:</small> ${h.fecha || '-'}
      <div class="mt-2">
        <a class="mm-link" href="hecho-completo.html?id=${encodeURIComponent(h.id)}">
          Ver más...
        </a>
      </div>
    </div>
  `;
}

function render(list) {
    markersLayer.clearLayers();
    const latlngs = [];

    list.forEach(h => {
        if (h.lat == null || h.long == null) return;
        latlngs.push([h.lat, h.long]);
        L.marker([h.lat, h.long], { title: `${h.id} - ${h.titulo}` })
            .bindPopup(popupHtml(h))
            .addTo(markersLayer);
    });

    const info = document.getElementById('resultInfo');
    info.textContent = `${list.length} resultado${list.length!==1?'s':''}`;

    latlngs.length
        ? map.fitBounds(latlngs, { padding: [20,20] })
        : map.setView([-38.4,-63.6], 5);
}

// ====== FILTROS ======
// function getFilters() {
//     const cat   = $('#fCategoria')?.value || '';
//     const d1Str = $('#fDesde')?.value || '';
//     const d2Str = $('#fHasta')?.value || '';
//
//     const d1 = d1Str ? parseDateSmart(d1Str) : null;
//     const d2 = d2Str ? parseDateSmart(d2Str) : null;
//
//     return { cat, d1, d2 };
// }

// Obtiene filtros y ajusta “hasta” al fin del día (inclusivo)
function getFilters() {
    const cat   = document.getElementById('fCategoria')?.value || '';
    const d1Str = document.getElementById('fDesde')?.value || '';
    const d2Str = document.getElementById('fHasta')?.value || '';

    const d1 = d1Str ? parseDateSmart(d1Str) : null;
    const d2 = d2Str ? parseDateSmart(d2Str) : null;

    if (d1) d1.setHours(0,0,0,0);
    if (d2) d2.setHours(23,59,59,999); // inclusivo

    return { cat, d1, d2 };
}

function applyFilters() {
    const { cat, d1, d2 } = getFilters();

    const list = HECHOS.filter(h => {
        if (cat && h.categoria !== cat) return false;

        if (d1 || d2) {
            const fh = h.fecha ? new Date(h.fecha) : null;
            if (!fh) return false;
            if (d1 && fh < d1) return false;
            if (d2 && fh > d2) return false;
        }

        return true;
    });

    render(list);
}

function clearFilters() {
    if ($('#fCategoria')) $('#fCategoria').value = '';
    if ($('#fDesde'))     $('#fDesde').value = '';
    if ($('#fHasta'))     $('#fHasta').value = '';
    render(HECHOS);
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await loadData();
    populateCategoryFilter(HECHOS);
    render(HECHOS);

    // Botones
    if ($('#btnAplicar')) $('#btnAplicar').addEventListener('click', applyFilters);
    if ($('#btnLimpiar')) $('#btnLimpiar').addEventListener('click', clearFilters);

    // Enter para aplicar
    ['#fCategoria','#fDesde','#fHasta'].forEach(sel => {
        const el = $(sel);
        if (!exists(el)) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }
        });
    });
});
