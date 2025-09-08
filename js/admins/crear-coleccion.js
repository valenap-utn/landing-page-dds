//JS para FUENTES y URLs
(function () {
    const tipoEl = document.getElementById('tipoFuente');
    const urlEl = document.getElementById('url');
    const addBtn = document.getElementById('addFuente');
    const cont = document.getElementById('fuentesContainer');
    const hidden = document.getElementById('fuentesHidden');
    if (!tipoEl || !urlEl || !addBtn || !cont || !hidden) return;

    const fuentes = []; // {tipo, url}

    // Normaliza: agrega https:// si falta y recorta espacios
    function normalizeUrl(v) {
        let s = (v || '').trim();
        if (!s) return '';
        if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
        try {
            s = new URL(s).href;
        } catch (e) { /* deja tal cual si no parsea */
        }
        return s;
    }

    const urlOk = v => /^https?:\/\/\S+\.\S+/.test(v); // simple pero útil

    function render() {
        cont.innerHTML = '';
        fuentes.forEach((f, i) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `<strong>${f.tipo}</strong> · ${f.url}
                        <button type="button" class="chip__remove" aria-label="Quitar fuente"><span aria-hidden="true">×</span></button>`;
            chip.querySelector('.chip__remove').addEventListener('click', () => {
                fuentes.splice(i, 1);
                render();
            });
            cont.appendChild(chip);
        });
        hidden.value = JSON.stringify(fuentes);
    }

    function validate() {
        const candidate = normalizeUrl(urlEl.value);
        const ok = urlOk(candidate);
        addBtn.disabled = !ok;
        urlEl.classList.toggle('is-invalid', urlEl.value.trim() !== '' && !ok);
        return ok;
    }

    // Autocorrección al salir del campo / pegar
    function autocorrect() {
        const normalized = normalizeUrl(urlEl.value);
        if (urlEl.value.trim() && urlEl.value !== normalized) {
            urlEl.value = normalized;
        }
        validate();
    }

    addBtn.addEventListener('click', () => {
        const tipo = (tipoEl.value || '').trim() || '—';
        const url = normalizeUrl(urlEl.value);

        if (!urlOk(url)) {
            urlEl.classList.add('is-invalid');
            urlEl.focus();
            return;
        }
        // evita duplicados por URL
        if (fuentes.some(f => f.url.toLowerCase() === url.toLowerCase())) {
            urlEl.value = '';
            validate();
            return;
        }
        fuentes.push({tipo, url});
        tipoEl.value = '';
        urlEl.value = '';
        validate();
        render();
    });

    urlEl.addEventListener('blur', autocorrect);
    urlEl.addEventListener('paste', setTimeout.bind(null, autocorrect, 0));
    urlEl.addEventListener('input', validate);
    urlEl.addEventListener('change', validate);
    urlEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBtn.click();
        }
    });

    validate();
    render();
})();

//JS para CRITERIOS de PERTENENCIA
(function () {
    const tipoSel = document.getElementById('critTipo');
    const wrap = document.getElementById('critValorWrap');
    const addBtn = document.getElementById('addCriterio');
    const chips = document.getElementById('criteriosChips');
    const hidden = document.getElementById('criteriosHidden');
    if (!tipoSel || !wrap || !addBtn || !chips || !hidden) return;

    const criterios = []; // { tipo, label, ...valores }

    const todayISO = () => new Date().toISOString().slice(0, 10);

    // --- configuraciones por tipo ---
    const CFG = {
        CATEGORIA: {
            label: 'Categoría',
            render() {
                wrap.innerHTML = `
          <label class="mm-label" for="critValorCategoria">Valor</label>
          <select id="critValorCategoria" class="mm-input">
            <option value="" disabled selected>Seleccioná una categoría…</option>
            <option value="EVENTO_SANITARIO">Evento sanitario</option>
            <option value="CONTAMINACION">Contaminación</option>
            <option value="DERRAME">Derrame</option>
          </select>
        `;
            },
            read() {
                const el = document.getElementById('critValorCategoria');
                return el && el.value ? {value: el.value, text: el.options[el.selectedIndex].text} : null;
            }
        },

        TITULO: {
            label: 'Título contiene',
            render() {
                wrap.innerHTML = `
          <label class="mm-label" for="critValorText">Valor</label>
          <input id="critValorText" class="mm-input" placeholder="Ej: 'río', 'incendio'…" />
          <small class="mm-help">Mínimo 3 caracteres.</small>
        `;
            },
            read() {
                const el = document.getElementById('critValorText');
                const v = (el?.value || '').trim();
                if (v.length < 3) {
                    el?.classList.add('is-invalid');
                    return null;
                }
                el.classList.remove('is-invalid');
                return {value: v};
            }
        },

        UBICACION: {
            label: 'Ubicación',
            render() {
                wrap.innerHTML = `
          <label class="mm-label" for="critValorUbic">Valor</label>
          <input id="critValorUbic" class="mm-input" placeholder="Provincia / Ciudad / zona…" />
        `;
            },
            read() {
                const el = document.getElementById('critValorUbic');
                const v = (el?.value || '').trim();
                if (!v) {
                    el?.classList.add('is-invalid');
                    return null;
                }
                el.classList.remove('is-invalid');
                return {value: v};
            }
        },

        // === FECHAS segun lo que hablamos ===
        FECHAACONTECIMIENTO: singleDateCfg('Fecha de acontecimiento'),
        FECHACARGA: cargaTodayCfg('Fecha de carga')
    };

    // fecha exacta (un solo input)
    function singleDateCfg(label) {
        return {
            label,
            render() {
                wrap.innerHTML = `
          <label class="mm-label" for="critFechaUnica">${label}</label>
          <input id="critFechaUnica" type="date" class="mm-input">
        `;
            },
            read() {
                const el = document.getElementById('critFechaUnica');
                const v = el?.value || '';
                if (!v) {
                    el?.classList.add('is-invalid');
                    return null;
                }
                el.classList.remove('is-invalid');
                return {fecha: v};
            }
        };
    }

    // fecha de carga = hoy (solo informativo en UI)
    function cargaTodayCfg(label) {
        return {
            label,
            render() {
                const hoy = todayISO();
                wrap.innerHTML = `
          <label class="mm-label">${label}</label>
          <input type="date" class="mm-input" value="${hoy}" disabled>
          <small class="mm-help">Se toma automáticamente la fecha actual (el backend debería confirmarla).</small>
        `;
            },
            read() {
                return {fecha: todayISO()};
            }
        };
    }

    // --- hooks UI ---
    tipoSel.addEventListener('change', () => {
        const cfg = CFG[tipoSel.value];
        if (cfg) cfg.render();
    });

    addBtn.addEventListener('click', () => {
        const tipo = tipoSel.value;
        const cfg = CFG[tipo];
        if (!cfg) return;

        const val = cfg.read();
        if (!val) return;

        const label = buildLabel(cfg.label, val);
        criterios.push({tipo, label, ...val});
        renderChips();
        persist();
    });

    function buildLabel(base, val) {
        if ('text' in val) return `${base}: ${val.text}`;
        if ('value' in val) return `${base}: ${val.value}`;
        if ('fecha' in val) return `${base}: ${val.fecha}`;
        // fallback por si en el futuro hay rango
        if ('desde' in val || 'hasta' in val) {
            const a = val.desde || '—';
            const b = val.hasta || '—';
            return `${base}: ${a} → ${b}`;
        }
        return base;
    }

    function renderChips() {
        const cont = document.getElementById('criteriosChips');
        cont.innerHTML = '';
        criterios.forEach((c, i) => {
            const chip = document.createElement('span');
            chip.className = 'mm-chip';
            chip.innerHTML = `<b>${c.label}</b>
        <button type="button" class="chip__remove" aria-label="Quitar criterio">
          <span aria-hidden="true">×</span>
        </button>`;
            chip.querySelector('.chip__remove').addEventListener('click', () => {
                criterios.splice(i, 1);
                renderChips();
                persist();
            });
            cont.appendChild(chip);
        });
    }

    function persist() {
        hidden.value = JSON.stringify(criterios);
    }

    // estado inicial sugerido
    CFG.TITULO.render();
})();