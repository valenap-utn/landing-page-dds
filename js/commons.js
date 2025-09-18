(function () {
    window.MM = window.MM || {};
    const KEY = 'mm_auth';

    const normalizeRole = (r) => {
        const x = String(r || '').trim().toUpperCase();
        if (x.startsWith('ADMIN')) return 'ADMIN';
        if (x.startsWith('CONTRI')) return 'CONTRIBUYENTE';
        if (x.startsWith('VISU')) return 'VISUALIZADOR';
        return x || 'VISUALIZADOR';
    };

    function read(store) {
        try {
            const raw = store.getItem(KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (obj?.loggedIn) {
                obj.role = normalizeRole(obj.role);
                return obj;
            }
        } catch (e) {
        }
        return null;
    }

    MM.getAuth = function () {
        return read(localStorage) || read(sessionStorage) || {loggedIn: false, role: 'VISUALIZADOR'};
    };

    // persist = 'local' | 'session'
    MM.setAuth = function (data, persist = 'local') {
        const payload = {
            loggedIn: !!data?.loggedIn,
            userId: data?.userId ?? null,
            email: data?.email ?? null,
            role: normalizeRole(data?.role),
            ts: Date.now()
        };
        try {
            localStorage.removeItem(KEY);
            sessionStorage.removeItem(KEY);
            (persist === 'session' ? sessionStorage : localStorage)
                .setItem(KEY, JSON.stringify(payload));
        } catch (e) {
        }
        return payload;
    };

    MM.clearAuth = function () {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
    };
})();

