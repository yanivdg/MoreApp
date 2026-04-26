/**
 * JPL Mission Control Application Logic - Key Aware
 */

const app = {
    // 1. API Base Endpoints (Without the key attached)
    endpoints: {
        cad: "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=15LD&date-min=now&sort=dist",
        mdesign: "https://ssd-api.jpl.nasa.gov/mdesign.api?lim=100&crit=1&year=2025,2026,2027,2028,2029&sb-group=neo",
        sentry: "https://ssd-api.jpl.nasa.gov/sentry.api",
        time: "https://ssd-api.jpl.nasa.gov/jd_cal.api"
    },

    init() {
        this.setupNavigation();
        // Load the key from LocalStorage if the user saved it before
        const savedKey = localStorage.getItem('jpl_nasa_key');
        if (savedKey) {
            document.getElementById('user-api-key').value = savedKey;
        }
        
        this.refresh('cad'); 
        this.updateStatus("System Ready", "text-success");
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const sectionId = e.target.getAttribute('data-section');
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
                document.getElementById(`section-${sectionId}`).classList.remove('d-none');
                this.refresh(sectionId);
            });
        });
    },

async refresh(type) {
    const out = document.getElementById(`${type}-out`);
    if (!out) return;

    const userKey = document.getElementById('user-api-key').value.trim() || 'DEMO_KEY';
    localStorage.setItem('jpl_nasa_key', userKey);
    
    const baseUrl = this.endpoints[type];
    if (!baseUrl) return;
    
    const finalUrl = baseUrl.includes('?') ? `${baseUrl}&api_key=${userKey}` : `${baseUrl}?api_key=${userKey}`;

    // --- FIX: WRAP THE URL IN A PROXY ---
    // This tells the proxy to go get the data and give it back to your GitHub site
    const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;

    out.innerHTML = `<div class="p-4 text-center text-info">📡 Routing through Proxy...</div>`;
    
    try {
        const response = await fetch(proxiedUrl);
        const proxyData = await response.json();
        
        // allorigins wraps the actual data inside a 'contents' string
        const data = JSON.parse(proxyData.contents);

        this.render(type, data);
        this.updateStatus(`${type.toUpperCase()} Synchronized`, "text-info");
    } catch (err) {
        console.error(err);
        out.innerHTML = `<div class="p-4 text-danger">⚠️ CORS/Connection Error. Proxy might be throttled.</div>`;
        this.updateStatus("Link Lost", "text-danger");
    }
},
    
    ,

    render(type, data) {
        const out = document.getElementById(`${type}-out`);
        let html = "";

        if (type === 'cad') {
            html = `<table class="table table-dark table-jpl"><thead><tr><th>Object</th><th>Date</th><th>Dist (LD)</th><th>V-rel</th></tr></thead><tbody>`;
            data.data?.slice(0, 40).forEach(r => {
                html += `<tr><td>${r[0]}</td><td>${r[3]}</td><td>${parseFloat(r[4]).toFixed(2)}</td><td>${r[7]} km/s</td></tr>`;
            });
        } 
        else if (type === 'mdesign') {
            html = `<table class="table table-dark table-jpl"><thead><tr><th>Designation</th><th>Launch</th><th>V-inf</th><th>TOF</th></tr></thead><tbody>`;
            data.data?.slice(0, 40).forEach(r => {
                html += `<tr><td class="text-info fw-bold">${r[1]}</td><td>${r[4]}</td><td>${r[2]} km/s</td><td>${r[6]} days</td></tr>`;
            });
        }
        else if (type === 'sentry') {
            html = `<table class="table table-dark table-jpl"><thead><tr><th>Object</th><th>Range</th><th>Prob %</th></tr></thead><tbody>`;
            data.data?.slice(0, 40).forEach(o => {
                html += `<tr><td class="text-danger">${o.des}</td><td>${o.range}</td><td>${(o.ip*100).toFixed(5)}%</td></tr>`;
            });
        }

        out.innerHTML = html + "</tbody></table>";
    },

    async convertTime(mode) {
        const userKey = document.getElementById('user-api-key').value.trim() || 'DEMO_KEY';
        let params = "";
        if (mode === 'toJD') params = `?cd=${encodeURIComponent(document.getElementById('cd-input').value)}`;
        else params = `?jd=${document.getElementById('jd-input').value}&format=s`;

        try {
            const res = await fetch(`${this.endpoints.time}${params}&api_key=${userKey}`);
            const data = await res.json();
            if (mode === 'toJD') document.getElementById('jd-res').innerText = data.jd || "Error";
            else document.getElementById('cd-res').innerText = data.cd || "Error";
        } catch (e) { console.error(e); }
    },

    updateStatus(msg, colorClass) {
        const status = document.getElementById('api-status');
        if (status) {
            status.innerText = msg;
            status.className = `status-msg bg-dark text-center border border-secondary ${colorClass}`;
        }
    }
};

app.init();
