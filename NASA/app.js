const app = {
    // 1. Pure JPL Endpoints
    endpoints: {
        cad: "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=15LD&date-min=now&sort=dist",
        fireball: "https://ssd-api.jpl.nasa.gov/fireball.api?limit=50",
        nhats: "https://ssd-api.jpl.nasa.gov/nhats.api?dv=6&dur=360&stay=8&launch=2020-2045&h=26&occ=7",
        sentry: "https://ssd-api.jpl.nasa.gov/sentry.api",
        scout: "https://ssd-api.jpl.nasa.gov/scout.api",
        sb_sat: "https://ssd-api.jpl.nasa.gov/sb_sat.api",
        sbdb_query: "https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,epoch,e,a,q,i,om,w&sb-class=IEO",
        sbdb: "https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=2015ab",
        sb_radar: "https://ssd-api.jpl.nasa.gov/sb_radar.api",
        sb_ident: "https://ssd-api.jpl.nasa.gov/sb_ident.api?sb-kind=a&mpc-code=568&obs-time=2026-04-26_00:00:00&vmag-lim=20&fov-ra-lim=10-10-00,10-20-00&fov-dec-lim=10-00-00,10-30-00",
        horizons: "https://ssd-api.jpl.nasa.gov/horizons.api?format=json&COMMAND='499'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='2026-01-01'&STOP_TIME='2026-01-20'&STEP_SIZE='1%20d'&QUANTITIES='1,9,20,23,24,29'",
        lookup: "https://ssd-api.jpl.nasa.gov/horizons_lookup.api?sstr=2004%20MN4"
    },

    init() {
        this.setupNavigation();
        this.refresh('cad'); // Start with Close Approaches
        this.updateStatus("Public Access Mode", "text-success");
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const sectionId = link.getAttribute('data-section');
                
                // UI Management
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
                
                const target = document.getElementById(`section-${sectionId}`);
                if (target) {
                    target.classList.remove('d-none');
                    this.refresh(sectionId);
                }
            });
        });
    },

    async refresh(type) {
        const out = document.getElementById(`${type}-out`);
        if (!out) return;
        
        const finalUrl = this.endpoints[type];
        
        // Using corsproxy.io as the middleman
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
        
        out.innerHTML = `<div class="p-4 text-center text-info">📡 Requesting Data from JPL...</div>`;
        
        try {
            const res = await fetch(proxiedUrl);
            const data = await res.json();
            
            this.render(type, data);
            this.updateStatus(`${type.toUpperCase()} Synchronized`, "text-info");
        } catch (err) {
            console.error(err);
            out.innerHTML = `<div class="p-4 text-danger">⚠️ Connection Failed. The proxy might be busy.</div>`;
            this.updateStatus("Link Lost", "text-danger");
        }
    },

    render(type, data) {
        const out = document.getElementById(`${type}-out`);
        let html = `<table class="table table-dark table-jpl table-striped"><thead><tr>`;

        // 1. Render Table for Field-based data
        if (['cad', 'sbdb_query', 'fireball', 'sb_radar'].includes(type)) {
            const fields = data.fields || ["Data"];
            fields.forEach(f => html += `<th>${f}</th>`);
            html += `</tr></thead><tbody>`;
            data.data?.slice(0, 50).forEach(row => {
                html += `<tr>${row.map(c => `<td>${c || '-'}</td>`).join('')}</tr>`;
            });
        } 
        // 2. Render Table for List-based data
        else if (['scout', 'sb_sat', 'nhats', 'lookup'].includes(type)) {
            const list = data.data || data.list || [];
            if (list.length > 0) {
                Object.keys(list[0]).forEach(k => html += `<th>${k}</th>`);
                html += `</tr></thead><tbody>`;
                list.slice(0, 50).forEach(o => {
                    html += `<tr>${Object.values(o).map(v => `<td>${(typeof v === 'object') ? '...' : v}</td>`).join('')}</tr>`;
                });
            }
        } 
        // 3. Special Renderers
        else if (type === 'horizons') {
            html = `<pre style="color:#0f0; background:#000; padding:15px; font-size:0.85rem;">${data.result}</pre>`;
        } 
        else if (type === 'sbdb') {
            html = `<div class="p-3"><h4>${data.object?.fullname}</h4><ul class="list-group list-group-flush">`;
            for (let [k,v] of Object.entries(data.orbit || {})) {
                if (typeof v !== 'object') html += `<li class="list-group-item bg-dark text-white-50">${k}: ${v}</li>`;
            }
            html += `</ul></div>`;
        } 
        else {
            html = `<pre class="text-info p-3">${JSON.stringify(data, null, 2)}</pre>`;
        }

        out.innerHTML = (['horizons', 'sbdb'].includes(type)) ? html : html + "</tbody></table>";
    },

    updateStatus(msg, color) {
        const s = document.getElementById('api-status');
        if (s) { s.innerText = msg; s.className = `status-msg bg-dark text-center ${color}`; }
    }
};

app.init();
