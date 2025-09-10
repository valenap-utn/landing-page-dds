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
        const [y,m,d] = s.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt) ? null : dt;
    }

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const [_, d, mo, y] = m;
        const dt = new Date(Number(y), Number(mo) - 1, Number(d));
        return isNaN(dt) ? null : dt;
    }

    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
}

// Retorna 'YYYY-MM-DD' usando campos locales (sin shift de TZ)
function toISOStrLocal(date) {
    if (!(date instanceof Date) || isNaN(date)) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Normaliza cualquier valor de fecha a 'YYYY-MM-DD'
function toISOShortFromAny(v) {
    if (!v && v !== 0) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ya viene iso corto
    const dt = parseDateSmart(s);
    return toISOStrLocal(dt);
}

// Convierte cualquier número a float (o null)
function toNum(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

// ====== NORMALIZACIÓN DE HECHOS ======
/** Intenta mapear cualquier objeto "hecho" en:
 * {
 *      id, titulo, descripcion, categoria,
 *      fechaAcontecimiento (YYYY-MM-DD) | null,
 *      fechaCreacion (YYYY-MM-DD) | null,
 *      lat, long
 * }
 */

// Detecta mapeo de claves a partir de una fila
function inferKeyMap(row) {
    const key = (cands) => pickKey(row, cands);
    return {
        id:       key(['id','codigo','identificador']),
        titulo:   key(['titulo','título','title','nombre']),
        descripcion: key(['descripcion','descripción','description','detalle','resumen']),
        categoria:key(['categoria','categoría','category','tipo']),
        // Separadas:
        fechaAcontecimiento: key([
            'fecha acontecimiento','fecha_del_hecho','fecha del hecho','fechasuceso',
            'fechaevento','fecha evento','acontecimiento','f. acontecimiento'
        ]),
        fechaCreacion: key([
            'fecha carga','fechacarga','fecha creacion','fecha creación','fecha_de_creacion',
            'fecha_de_creación','created_at','create_date'
        ]),
        // Fallback genérico si sólo hay una 'fecha'
        fecha:     key(['fecha','date','fecha evento','fecha suceso']),
        lat:      key(['lat','latitud','latitude']),
        long:     key(['long','lon','lng','longitud','longitude'])
    };
}

function normalizeHecho(row, inferredMap = null) {
    const map = inferredMap || inferKeyMap(row);

    const id     = row[map.id] ?? null;
    const titulo = row[map.titulo] ?? '';
    const desc   = row[map.descripcion] ?? '';
    const cat    = row[map.categoria] ?? '';

    // const fecha  = row[map.fecha] ?? null;

    // Fuentes de fechas (ante ausencia, hace fallback a 'fecha')
    const faconRaw = (map.fechaAcontecimiento && row[map.fechaAcontecimiento]) ?? row[map.fecha];
    const fcreaRaw = (map.fechaCreacion       && row[map.fechaCreacion])       ?? row[map.fecha];

    const fechaAcontecimiento = toISOShortFromAny(faconRaw);
    const fechaCreacion       = toISOShortFromAny(fcreaRaw);

    const lat = row[map.lat];
    const lon = row[map.long];

    return {
        id:     id != null ? String(id) : '',
        titulo: String(titulo || '').trim(),
        descripcion: String(desc || '').trim(),
        categoria: String(cat || '').trim(),
        fechaAcontecimiento,
        fechaCreacion,
        lat: toNum(lat),
        long: toNum(lon)
    };
}

// Normaliza una lista heterogénea
function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    const map = list.length ? inferKeyMap(list[0]) : null;
    return list
        .map(r => normalizeHecho(r, map))
        .filter(h => h.lat != null && h.long != null);
}


// Pobla dinámicamente el <select id="fCategoria">
function populateCategoryFilter(hechos) {
    const sel = $('#fCategoria');
    if (!sel) return;

    const first = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (first) sel.appendChild(first);

    const cats = Array.from(new Set(hechos.map(h => h.categoria).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));

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
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        HECHOS = normalizeList(arr);
    } catch (e) {
        console.error('No se pudieron cargar los hechos:', e);
        HECHOS = [];
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
    window.map = map; // para invalidateSize desde otros scripts

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// ====== POP-UP del MAPA ======
function popupHtml(h){
    const fecha = h.fechaAcontecimiento || h.fechaCreacion || '-';
    return `
    <div class="mm-popup">
      <strong>${h.titulo || '(sin título)'}</strong><br/>
      <small>Categoría:</small> ${h.categoria || '-'}<br/>
      <small>Fecha:</small> ${fecha}
      <div class="mt-2">
        <a class="mm-link" href="hecho-completo.html?id=${encodeURIComponent(h.id)}">
          Ver más...
        </a>
      </div>
    </div>`;
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

    const info = $('#resultInfo');
    if (info) info.textContent = `${list.length} resultado${list.length!==1?'s':''}`;

    latlngs.length
        ? map.fitBounds(latlngs, { padding: [20,20] })
        : map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);
}


// ====== FILTROS ======
const inRangeISO = (iso, from, to) => {
    if (!iso) return false;
    if (from && iso < from) return false;
    if (to   && iso > to)   return false;
    return true;
};

// Obtiene filtros y ajusta “hasta” al fin del día (inclusivo)
function getFilters() {
    const cat   = $('#fCategoria')?.value || '';
    const aD    = $('#fAcontDesde')?.value || '';     // YYYY-MM-DD
    const aH    = $('#fAcontHasta')?.value || '';
    const cD    = $('#fCreacionDesde')?.value || '';
    const cH    = $('#fCreacionHasta')?.value || '';
    const query = ($('#fTexto')?.value || '').trim().toLowerCase();

    return { cat, aD, aH, cD, cH, query };
}

function applyFilters() {
    const { cat, aD, aH, cD, cH, query } = getFilters();

    const list = HECHOS.filter(h => {
        if (cat && h.categoria !== cat) return false;

        if (aD || aH) {
            if (!inRangeISO(h.fechaAcontecimiento, aD || null, aH || null)) return false;
        }
        if (cD || cH) {
            if (!inRangeISO(h.fechaCreacion, cD || null, cH || null)) return false;
        }

        if (query) {
            const hay = `${h.titulo} ${h.descripcion || ''}`.toLowerCase();
            if (!hay.includes(query)) return false;
        }
        return true;
    });

    render(list);
    setTimeout(() => map.invalidateSize(), 200);
}

function clearFilters() {
    const ids = ['#fCategoria','#fAcontDesde','#fAcontHasta','#fCreacionDesde','#fCreacionHasta','#fTexto'];
    ids.forEach(sel => { const el = $(sel); if (exists(el)) el.value = ''; });
    render(HECHOS);
    setTimeout(() => map.invalidateSize(), 200);
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await loadData();
    populateCategoryFilter(HECHOS);
    render(HECHOS);

    // Botones
    $('#btnAplicar')?.addEventListener('click', applyFilters);
    $('#btnLimpiar')?.addEventListener('click', clearFilters);

    // Enter aplica
    ['#fCategoria','#fAcontDesde','#fAcontHasta','#fCreacionDesde','#fCreacionHasta','#fTexto']
        .forEach(sel => $(sel)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }
        }));

    // Recalcular mapa al abrir/cerrar “Más filtros”
    document.querySelector('.mm-adv')?.addEventListener('toggle', () => {
        setTimeout(() => map.invalidateSize(), 220);
    });
});
