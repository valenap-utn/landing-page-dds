/* ---------- Helpers DOM ---------- */
const qs  = (sel, root = document) => root.querySelector(sel);
const set = (sel, value) => { const el = qs(sel); if (el) el.textContent = value; };

/* ---------- Fechas sin desfasajes por zona horaria ---------- */

// Crea un Date a medianoche LOCAL (no UTC)
function dateFromYMDLocal(iso /* 'YYYY-MM-DD' */) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight
}

// Devuelve 'YYYY-MM-DD' leyendo componentes LOCALES
function toISO(d) {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Acepta ISO o dd/mm/aaaa y devuelve Date (local)
function parseDateSmart(v) {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;

    const s = String(v).trim();

    // ISO estricta: YYYY-MM-DD => crear LOCAL (no new Date(s) que es UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return dateFromYMDLocal(s);
    }

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) {
        const [_, d, mo, y] = m;
        const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
        return dateFromYMDLocal(iso);
    }

    // Último intento: que lo resuelva JS. (puede traer hora → igual NO usamos toISOString)
    const d = new Date(s);
    return isNaN(d) ? null : d;
}

// Para mostrar en UI
function formatDmy(iso /* 'YYYY-MM-DD' */) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/* ---------- Mapear claves flexibles ---------- */
function normKey(k){return k.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_]/g,'');}

function pickKey(obj, cands){
    const dict={}; Object.keys(obj).forEach(k=>dict[normKey(k)]=k);
    for(const c of cands){const w=normKey(c); if(dict[w]) return dict[w];}
    return null;
}

function inferKeyMap(row){
    const k=(c)=>pickKey(row,c);
    return {
        id:        k(['id','codigo','identificador']),
        titulo:    k(['titulo','título','title','nombre']),
        desc:      k(['descripcion','descripción','description','detalle']),
        categoria: k(['categoria','categoría','category','tipo']),
        fecha:     k(['fecha','fecha del hecho','fecha_del_hecho','fechasuceso','fechaacontecimiento','date']),
        fechaCarga:k(['fechacarga','fecha de carga','fecha_carga']),
        lat:       k(['lat','latitud','latitude']),
        long:      k(['long','lon','lng','longitud','longitude']),
        origen:    k(['origen','fuente']),
        creador:   k(['creador','usuario','autor']),
        roles:     k(['roles','permisos']),
        etiquetas: k(['etiquetas','tags','palabrasclave']),
        media:     k(['media','multimedia'])
    };
}

function normalizeHecho(row, map){
    const fh = map.fecha ? parseDateSmart(row[map.fecha]) : null;
    const fc = map.fechaCarga ? parseDateSmart(row[map.fechaCarga]) : null;

    // media flexible
    let media = row[map.media] || {};
    if (typeof media === 'string') media = { imagenUrl: media };

    // Soportar "Imagen"/"Image" como atajo
    const imagenCruda = row.imagenUrl || row.Imagen || row.Image || row.image;

    // si el id no viene, lo dejamos vacío (se completa en fallback)
    return {
        id:           row[map.id] != null ? String(row[map.id]) : '',
        titulo:       String(row[map.titulo] ?? '').trim(),
        descripcion:  String(row[map.desc]   ?? '').trim(),
        categoria:    String(row[map.categoria] ?? '').trim(),
        fecha:        toISO(fh),
        fechaCarga:   toISO(fc),
        lat:          row[map.lat]  != null ? Number(String(row[map.lat]).replace(',','.'))  : null,
        long:         row[map.long] != null ? Number(String(row[map.long]).replace(',','.')) : null,
        origen:       row[map.origen]  ?? null,
        creador:      row[map.creador] ?? null,
        roles:        Array.isArray(row[map.roles])     ? row[map.roles]     : [],
        etiquetas:    Array.isArray(row[map.etiquetas]) ? row[map.etiquetas] : [],
        media: {
            imagenUrl: (media.imagenUrl || imagenCruda) ?? null,
            videoUrl:   media.videoUrl  || row.videoUrl || null
        }
    };
}

/* ---------- Carga del hecho (API + fallback JSON) ---------- */
async function fetchHechoById(id){
    // API real
    try{
        const r = await fetch(`/api/hechos/${encodeURIComponent(id)}`);
        if(r.ok){
            const h = await r.json();
            // si tu API ya usa estas keys, devolvemos directo:
            if (h && h.id) return h;
        }
    }catch{}

    // Fallback JSON local
    const res = await fetch('../data/desastres_tecnologicos_argentina_20.json');
    const arr = await res.json();
    if(!Array.isArray(arr) || !arr.length) return null;

    const map = inferKeyMap(arr[0]);
    const norm = arr.map(r => normalizeHecho(r,map));

    // Demo: si no tienen ID, creamos uno por índice
    norm.forEach((h,i)=>{ if(!h.id) h.id = String(i+1); });

    return norm.find(h => h.id === String(id)) || null;
}

/* ---------- Render UI ---------- */
function renderMedia(h){
    const wrap = qs('#mediaWrap');
    wrap.innerHTML = '';
    if(h?.media?.videoUrl){
        wrap.innerHTML = `<div class="ratio ratio-16x9"><iframe src="${h.media.videoUrl}" allowfullscreen></iframe></div>`;
        return;
    }
    if(h?.media?.imagenUrl){
        wrap.innerHTML = `<img src="${h.media.imagenUrl}" alt="Imagen del hecho"/>`;
    }
}

function renderRoles(roles){
    const cont = qs('#hRoles');
    cont.innerHTML = '';
    (roles||[]).forEach(r=>{
        const span = document.createElement('span');
        span.className = 'mm-badge-soft mm-badge';
        span.textContent = r;
        cont.appendChild(span);
    });
}

function renderTags(tags){
    const ul = qs('#hTags');
    ul.innerHTML = '';
    (tags||[]).forEach(t=>{
        const li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
    });
}

function initMap(h){
    const mapDiv = qs('#mapDetalle');
    if (!mapDiv) return;

    const Leaf = window.L;
    if (!Leaf) {
        mapDiv.innerHTML = '<div class="text-muted p-4">Mapa no disponible.</div>';
        console.warn('Leaflet no está cargado (window.L es undefined)');
        return;
    }

    // if (typeof L === 'undefined'){
    //     mapDiv.innerHTML = '<div class="text-muted p-4">Mapa no disponible (Leaflet no cargado).</div>';
    //     return;
    // }

    if (h.lat != null && h.long != null) {
        const map = Leaf.map('mapDetalle', {
            center: [h.lat, h.long],
            zoom: 12,
            scrollWheelZoom: true
        });
        Leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        Leaf.marker([h.lat, h.long]).addTo(map)
            .bindPopup(h.titulo || `Hecho #${h.id}`)
            .openPopup();
    } else {
        mapDiv.innerHTML = '<div class="text-muted p-4">Sin coordenadas para mostrar mapa.</div>';
    }
}

/* ---------- Init ---------- */
(async function init(){
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { set('#hTitulo','Hecho no encontrado'); return; }

    const h = await fetchHechoById(id);
    if (!h) { set('#hTitulo','Hecho no encontrado'); return; }

    // Título / bajada
    set('#hTitulo',      h.titulo || `Hecho #${h.id}`);
    set('#hBajada',      h.categoria ? `Categoría: ${h.categoria}` : '—');

    // Meta
    set('#hCategoria',   h.categoria || '—');
    set('#hFecha',       formatDmy(h.fecha));
    set('#hFechaCarga',  formatDmy(h.fechaCarga));
    set('#hLat',         (h.lat ?? '—'));
    set('#hLong',        (h.long ?? '—'));
    set('#hOrigen',      h.origen || '—');

    // Texto
    set('#hDescripcion', h.descripcion || 'Sin descripción.');

    // Creador + roles + etiquetas
    if (qs('#hCreador')) {
        const creadorTxt = typeof h.creador === 'string'
            ? h.creador
            : (h.creador?.nombre || '—');
        set('#hCreador', creadorTxt);
    }
    renderRoles(h.roles);
    renderTags(h.etiquetas);

    // Media y mapa
    renderMedia(h);
    initMap(h);

    // Acciones demo
    const btnReportar = qs('#btnReportar');
    if (btnReportar) btnReportar.addEventListener('click', ()=> alert('Gracias por tu reporte. Nuestro equipo lo revisará.'));
    const btnEliminar = qs('#btnEliminar');
    if (btnEliminar) btnEliminar.addEventListener('click', ()=> alert('Solicitud enviada. Un moderador la evaluará.'));
})();