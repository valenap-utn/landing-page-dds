// ---- Helpers de fechas y normalización (compatibles con tu stack) ----
function parseDateSmart(v){
    if(!v) return null;
    if(v instanceof Date) return v;
    const s = String(v).trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){ // ISO
        const d = new Date(`${s}T00:00:00`);
        return isNaN(d) ? null : d;
    }

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if(m){
        const [_, d, mo, y] = m;
        const dFix = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00`);
        return isNaN(dFix) ? null : dFix;
    }

    const d = new Date(s);
    return isNaN(d) ? null : d;
}

function toISO(d){
    if(!d) return null;
    // normalizamos a “fecha local” para evitar -1 día por TZ
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return local.toISOString().slice(0,10);
}

function formatDmy(iso){
    if(!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function normKey(k){
    return k.toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .toLowerCase().replace(/[^a-z0-9_]/g,'');
}
function pickKey(obj, candidates){
    const dict={}; Object.keys(obj).forEach(k=>dict[normKey(k)]=k);
    for(const c of candidates){
        const w = normKey(c);
        if(dict[w]) return dict[w];
    }
    return null;
}

// Mapea keys de cada fila del JSON
function inferKeyMap(row){
    const k=(c)=>pickKey(row,c);
    return {
        titulo:    k(['titulo','título','title','nombre']),
        desc:      k(['descripcion','descripción','description','detalle']),
        categoria: k(['categoria','categoría','category','tipo']),
        lat:       k(['lat','latitud','latitude']),
        long:      k(['long','lon','lng','longitud','longitude']),
        fecha:     k(['fecha del hecho','fecha','fechasuceso','fechaacontecimiento']),
        imagen:    k(['imagen','image','imagenurl'])
    };
}
function normalizeRow(row, map){
    const fecha = map.fecha ? parseDateSmart(row[map.fecha]) : null;
    return {
        titulo: String(row[map.titulo] ?? '').trim(),
        descripcion: String(row[map.desc] ?? '').trim(),
        categoria: String(row[map.categoria] ?? '').trim(),
        lat: row[map.lat] != null ? Number(String(row[map.lat]).replace(',','.')) : null,
        long: row[map.long]!= null ? Number(String(row[map.long]).replace(',','.')) : null,
        fechaISO: toISO(fecha),
        imagenUrl: row[map.imagen] || null
    };
}

// ---- Carga de una “Fuente” desde archivo JSON ----
async function loadFuenteFromJson(url, etiqueta='JSON local'){
    const res = await fetch(url);
    const arr = await res.json();
    if(!Array.isArray(arr) || !arr.length) return null;

    const map = inferKeyMap(arr[0]);
    const hechos = arr.map(r => normalizeRow(r, map));

    // info básica de la fuente
    return {
        id: `fuente-${btoa(url).replace(/=/g,'')}`,
        tipo: 'archivo',
        etiqueta,
        url,
        hechos
    };
}

// ---- Crea una “Colección” a partir de una o más fuentes ----
function buildColeccion({id, titulo, descripcion, fuentes}){
    // agrego todos los hechos que cumplen criterios base (p/ahora: no eliminados, fecha válida si existe)
    const hechos = fuentes.flatMap(f => f.hechos)
        .filter(h => h && (h.fechaISO ? true : true)); // placeholder de criterios

    // estadísticas
    const total = hechos.length;
    const fechas = hechos.map(h => h.fechaISO).filter(Boolean).sort();
    const first = fechas[0] || null;
    const last  = fechas[fechas.length-1] || null;

    // categorías únicas
    const cats = Array.from(new Set(hechos.map(h => h.categoria).filter(Boolean))).slice(0,6);

    return {
        id, titulo, descripcion, fuentes, total, first, last, categorias: cats
    };
}

// ---- Render de tarjeta de colección ----
function cardHTML(c){
    const fuentesList = c.fuentes.map(f => `
    <li><span >${f.etiqueta}</span> <a class="mm-link" href="${f.url}" target="_blank" rel="noreferrer">${f.url.split('/').pop()}</a></li>
  `).join('');

    const chipsCats = c.categorias.map(x=>`<li class="mm-chip">${x}</li>`).join('');

    return `
    <article class="mm-collection-card">
      <div class="mm-card-header">
        <img class="mm-card-icon" src="../components/coleccion.png" alt="">
        <div>
          <h3 class="mm-card-title">${c.titulo}</h3>
          <p class="mm-card-sub">${c.descripcion || 'Colección sin descripción.'}</p>
        </div>
      </div>

      <ul class="mm-meta">
        <li class="mm-chip">Hechos: ${c.total}</li>
        ${c.first ? `<li class="mm-chip">Desde: ${formatDmy(c.first)}</li>` : ''}
        ${c.last  ? `<li class="mm-chip">Hasta: ${formatDmy(c.last)}</li>`  : ''}
      </ul>

      ${chipsCats ? `<ul class="mm-meta" style="margin-top:6px">${chipsCats}</ul>` : ''}

      <div class="accordion mm-accordion" id="acc-${c.id}">
        <div class="accordion-item">
          <h2 class="accordion-header" id="h-${c.id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c-${c.id}">
              Fuentes
            </button>
          </h2>
          <div id="c-${c.id}" class="accordion-collapse collapse" aria-labelledby="h-${c.id}" data-bs-parent="#acc-${c.id}">
            <div class="accordion-body">
              <ul class="mm-sources">${fuentesList}</ul>
            </div>
          </div>
        </div>
      </div>

      <div class="mm-card-actions d-flex justify-content-between">
        <a class="mm-btn mm-btn-primary" href="nav-hechos.html?coleccion=${encodeURIComponent(c.id)}">Ver colección</a>
        <a class="mm-btn mm-btn-ghost" href="#" onclick="navigator.share ? navigator.share({title:'${c.titulo}', url: location.href + '?coleccion=${encodeURIComponent(c.id)}'}) : alert('Copiá el enlace y compartilo'); return false;">Compartir</a>
      </div>
    </article>
  `;
}

// ---- Inicialización: por ahora una colección armada desde tu JSON de prueba ----
(async function init(){
    const cont = document.getElementById('coleccionesList');
    cont.innerHTML = '<p class="text-muted">Cargando colecciones…</p>';

    try{
        // 1) cargamos una FUENTE desde tu archivo de prueba
        const fuente1 = await loadFuenteFromJson('../data/desastres_tecnologicos_argentina_20.json', 'Desastres tecnológicos (JSON)');

        if(!fuente1){
            cont.innerHTML = '<p class="text-danger">No se pudo cargar la fuente de prueba.</p>';
            return;
        }

        // 2) armamos la COLECCIÓN con esa(s) fuente(s)
        const coleccion = buildColeccion({
            id: 'desastres-tecnologicos',
            titulo: 'Desastres Tecnológicos en Argentina',
            descripcion: 'Hechos provenientes de la fuente de prueba importada por administradores.',
            fuentes: [fuente1]
        });

        // 3) pintamos
        cont.innerHTML = cardHTML(coleccion);

    }catch(e){
        console.error(e);
        cont.innerHTML = '<p class="text-danger">Ocurrió un error cargando colecciones.</p>';
    }
})();




