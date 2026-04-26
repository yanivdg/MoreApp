/**
 * JPL Mission Control - Full Application Logic
 * Comprehensive Small-Body & Planetary Data Hub
 */

const app = {
    // 1. API Endpoints
    endpoints: {
        cad: "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=15LD&date-min=now&sort=dist",
        fireball: "https://ssd-api.jpl.nasa.gov/fireball.api?limit=50",
        nhats: "https://ssd-api.jpl.nasa.gov/nhats.api?dv=6&dur=360&stay=8&launch=2020-2045&h=26&occ=7",
        sentry: "https://ssd-api.jpl.nasa.gov/sentry.api",
        scout: "https://ssd-api.jpl.nasa.gov/scout.api", // Unconfirmed NEAs
        sb_sat: "https://ssd-api.jpl.nasa.gov/sb_sat.api", // Planetary Satellites
        sbdb_query: "https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,epoch,e,a,q,i,om,w&sb-class=IEO",
        sbdb: "https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=2015ab", // Object Details
        sb_radar: "https://ssd-api.jpl.nasa.gov/sb_radar.api", // Radar observed asteroids
        sb_ident: "https://ssd-api.jpl.nasa.gov/sb_ident.api?sb-kind=a&mpc-code=568&obs-time=2026-04-26_00:00:00&vmag-lim=20&fov-ra-lim=10-10-00,10-20-00&fov-dec-lim=10-00-00,10-30-00",
        horizons: "https://ssd-api.jpl.nasa.gov/horizons.api?format=json&COMMAND='499'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='2026-01-01'&STOP_TIME='2026-01-20'&STEP_SIZE='1%20d'&QUANTITIES='1,9,20,23,24,29'",
        lookup: "https://ssd-api.jpl.nasa.gov/horizons_lookup.api?sstr=2004%20MN4"
    },

    // 2. Initialization
    init() {
        this.setupNavigation();
        
        // Restore API Key from LocalStorage if it exists
        const savedKey = localStorage.getItem('jpl_nasa_key');
        if (savedKey) {
            const keyInput = document.getElementById('user-api-key');
            if (keyInput) keyInput.value = savedKey;
        }

        // Default landing data
        this.refresh('cad');
        this.updateStatus("System Online", "text-success");
    },

    // 3. Navigation setup
    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const sectionId = e.currentTarget.getAttribute('data-section');
                
                // Update UI active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Switch sections
                document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
                const targetSection = document.getElementById(`section-${sectionId}`);
                if (targetSection) targetSection.classList.remove('d-none');

                // Auto-refresh data for the section
                this.refresh(sectionId);
            });
        });
    },

    // 4. Data Fetching with CORS Proxy & Optional API Key
    async refresh(type) {
        const out = document.getElementById(`${type}-out`);
        if (!out) return;

        const userKey = document.getElementById('user-api-key').value.trim();
        if (userKey) localStorage.setItem('jpl_nasa_key', userKey);
        
        let finalUrl = this.endpoints[type];
        if (!finalUrl) return;

        // Clean URL Logic: Only append api_key if provided
        if (userKey && userKey !== "") {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += `${separator}api_key=${userKey}`;
        }

        // Proxy to bypass CORS on GitHub Pages
        const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;

        out.innerHTML = `<div class="p-4 text-center text-info"><div class="spinner-border spinner-border-sm mb-2"></div><br>Querying JPL ${type.toUpperCase()}...</div>`;
        
        try {
            const response = await fetch(proxiedUrl);
            const proxyData = await response.json();
            
            if (!proxyData.contents) throw new Error("No data returned from proxy.");
            
            const data = JSON.parse(proxyData.contents);

            // Handle NASA error codes
            if (data.code && data.code === "400") {
                out.innerHTML = `<div class="p-4 text-warning">⚠️ API Error: ${data.message}</div>`;
                return;
            }

            this.render(type, data);
            this.updateStatus(`${type.toUpperCase()} Synchronized`, "text-info");
        } catch (err) {
            console.error("Fetch Error:", err);
            out.innerHTML = `<div class="p-4 text-danger">⚠️ Connection Failed. Check CORS proxy or API endpoint.</div>`;
            this.updateStatus("Link Lost", "text-danger");
        }
    },

    // 5. Specialized Renderers
    render(type, data) {
        const out = document.getElementById(`${type}-out`);
        let html = `<table class="table table-dark table-jpl"><thead><tr>`;

        // Type A: Standard array with "fields" and "data" (CAD, Fireball, SBDB Query, Radar)
        if (type === 'cad' || type === 'sbdb_query' || type === 'fireball' || type === 'sb_radar') {
            const fields = data.fields || ["Result"];
            fields.forEach(f => html += `<th>${f}</th>`);
            html += `</tr></thead><tbody>`;
            if (data.data) {
                data.data.slice(0, 50).forEach(row => {
                    html += `<tr>${row.map(cell => `<td>${cell || '-'}</td>`).join('')}</tr>`;
                });
            } else {
                html += `<tr><td colspan="${fields.length}">No data found.</td></tr>`;
            }
        } 
        // Type B: Object Arrays (Scout, Satellites, NHATS, Lookup)
        else if (type === 'scout' || type === 'sb_sat' || type === 'nhats' || type === 'lookup') {
            const list = data.data || data.list || [];
            if (list.length > 0) {
                Object.keys(list[0]).forEach(key => html += `<th>${key}</th>`);
                html += `</tr></thead><tbody>`;
                list.slice(0, 50).forEach(obj => {
                    html += `<tr>${Object.values(obj).map(v => `<td>${(typeof v === 'object' && v !== null) ? '...' : v}</td>`).join('')}</tr>`;
                });
            } else {
                html += `<tr><td>No results found.</td></tr>`;
            }
        }
        // Type C: Single Object Detail (SBDB)
        else if (type === 'sbdb') {
            html = `<div class="p-3"><h4>${data.object?.fullname || 'Object Detail'}</h4><ul class="list-group list-group-flush bg-dark">`;
            if (data.orbit) {
                for (const [key, value] of Object.entries(data.orbit)) {
                    if (typeof value !== 'object') html += `<li class="list-group-item bg-dark text-white-50 small">${key}: ${value}</li>`;
                }
            }
            html += `</ul></div>`;
        }
        // Type D: Raw Text Reports (Horizons)
        else if (type === 'horizons') {
            html = `<div class="p-3">
                <h5 class="text-accent">Horizons Ephemeris Output</h5>
                <pre style="color: #33ff33; font-size: 0.75rem; background: #000; padding: 15px; border: 1px solid #1a5abf; overflow-x: auto;">${data.result || 'No report generated.'}</pre>
            </div>`;
        }
        // Type E: Default Fallback (Sentry, Ident)
        else {
            html = `<div class="p-3"><h5 class="text-info">Raw Response</h5><pre class="text-info" style="font-size:0.7rem; background: #050b18;">${JSON.stringify(data, null, 2)}</pre></div>`;
        }

        out.innerHTML = (type === 'sbdb' || type === 'horizons') ? html : html + "</tbody></table>";
    },

    // 6. Utility: Status Update
    updateStatus(msg, colorClass) {
        const status = document.getElementById('api-status');
        if (status) {
            status.innerText = msg;
            status.className = `status-msg bg-dark text-center border border-secondary ${colorClass}`;
        }
    }
};

// Start Application
app.init();
