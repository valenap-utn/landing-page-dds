// Mock: si no usás fetch, pegá el JSON arriba y usalo directo.
// const data = null;
const data = '../../data/solicitudes-eliminacion.json';

(function(){
    const listEl = document.querySelector('.mm-requests');
    const segBtns = Array.from(document.querySelectorAll('.mm-seg__btn'));
    const searchEl = document.getElementById('searchBox');
    if(!listEl || !segBtns.length || !searchEl) return;

    if(!listEl || !segBtns.length || !searchEl) return;

    let payload = { solicitudes: [] };
    let state = { filter: 'TODAS', q: '' };

    // cargar datos
    // (async function load(){
    //     if (data) {
    //         payload = data;
    //     } else {
    //         try {
    //             const res = await fetch('/data/solicitudes-eliminacion.json'); // ajustá la ruta
    //             payload = await res.json();
    //         } catch (e) {
    //             console.warn('No se pudo cargar el JSON, usando vacío.', e);
    //             payload = { solicitudes: [] };
    //         }
    //     }
    //     renderAll();
    // })();
    (async function load(){
        try{
            const res = await fetch(data, { cache:'no-store' });
            payload = await res.json();
        }catch(e){
            console.warn('No se pudo cargar el JSON:', e);
            payload = { solicitudes: [] };
        }
        renderAll();
    })();

    // listeners filtro
    segBtns.forEach(btn=>{
        btn.addEventListener('click', ()=>{
            segBtns.forEach(b=>{ b.classList.remove('is-active'); b.setAttribute('aria-selected','false'); });
            btn.classList.add('is-active'); btn.setAttribute('aria-selected','true');
            state.filter = btn.dataset.filter || 'TODAS';
            renderAll();
        });
    });

    // búsqueda (con micro-debounce)
    let t;
    searchEl.addEventListener('input', ()=>{
        clearTimeout(t);
        t = setTimeout(()=>{ state.q = (searchEl.value||'').trim().toLowerCase(); renderAll(); }, 120);
    });

    function renderAll(){
        // contadores
        const all = payload.solicitudes;
        const counts = {
            TOTAL: all.length,
            PENDIENTE: all.filter(s=>s.estado==='PENDIENTE').length,
            APROBADA:  all.filter(s=>s.estado==='APROBADA').length,
            RECHAZADA: all.filter(s=>s.estado==='RECHAZADA').length
        };
        setText('#count-todas', counts.TOTAL);
        setText('#count-pend',  counts.PENDIENTE);
        setText('#count-apr',   counts.APROBADA);
        setText('#count-rech',  counts.RECHAZADA);

        // filtrar
        let rows = all.slice();
        if (state.filter !== 'TODAS') rows = rows.filter(s=>s.estado===state.filter);
        if (state.q) {
            rows = rows.filter(s=>{
                const t = (s.hecho?.titulo || '').toLowerCase();
                const j = (s.justificacion || '').toLowerCase();
                return t.includes(state.q) || j.includes(state.q);
            });
        }

        renderList(rows);
    }

    function renderList(items){
        listEl.innerHTML = '';
        if(!items.length){
            listEl.innerHTML = `
        <li class="mm-req" style="text-align:center; color:#6b7f90;">
          No hay solicitudes que coincidan.
        </li>`;
            return;
        }

        items.forEach(s=>{
            const li = document.createElement('li');
            li.className = 'mm-req';
            li.dataset.id = s.id;

            const estado = badgeFor(s.estado);
            li.innerHTML = `
        <div class="mm-req__header">
          <div>
            <h3 class="mm-req__title m-0">Solicitud #${escapeHTML(s.id.replace('SL-',''))}</h3>
            <div class="mm-req__meta">
              <span class="badge ${estado.cls}">${estado.txt}</span>
              <span class="badge badge-neutral">Creado por ${escapeHTML(s.creado_por?.nombre || 'Anónimo')}</span>
            </div>
          </div>
          <div class="mm-req__actions">
            <button class="mm-btn mm-btn--round mm-btn--approve" aria-label="Aprobar solicitud"><i class="fa-solid fa-check"></i></button>
            <button class="mm-btn mm-btn--round mm-btn--reject"  aria-label="Rechazar solicitud"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <div class="mm-req__body">
          <p class="m-0"><strong>Justificación:</strong> ${escapeHTML(s.justificacion || '—')}</p>
          <p class="m-0"><strong>Hecho referenciado:</strong> <a class="blue-link" href="${s.hecho?.url || '#'}">${escapeHTML(s.hecho?.titulo || '—')}</a></p>
        </div>
      `;

            // acciones demo: “resuelven” y re-renderizan
            li.querySelector('.mm-btn--approve')?.addEventListener('click', ()=>resolveAndRerender(s.id,'APROBADA'));
            li.querySelector('.mm-btn--reject') ?.addEventListener('click', ()=>resolveAndRerender(s.id,'RECHAZADA'));

            listEl.appendChild(li);
        });
    }

    function resolveAndRerender(id, nuevoEstado){
        // demo: actualizamos en memoria y refrescamos (acá iría tu llamada al backend)
        const item = payload.solicitudes.find(x=>x.id===id);
        if(item){ item.estado = nuevoEstado; }
        // mini animación
        const el = listEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
        if(el){
            el.style.transition='opacity .2s, transform .2s';
            el.style.opacity='0'; el.style.transform='translateY(-4px)';
            setTimeout(()=>{ renderAll(); }, 200);
        } else {
            renderAll();
        }
    }

    function badgeFor(estado){
        switch(estado){
            case 'PENDIENTE': return { txt:'Pendiente', cls:'badge-brand' };
            case 'APROBADA':  return { txt:'Aprobada',  cls:'badge-neutral' };
            case 'RECHAZADA': return { txt:'Rechazada', cls:'badge-neutral' };
            default:          return { txt:estado,      cls:'badge-neutral' };
        }
    }
    function setText(sel, v){ const el = document.querySelector(sel); if(el) el.textContent = v; }
    function escapeHTML(str){ return (str||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
})();
