const app = {
    // ... your existing endpoints ...
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
        horizons: "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='2006-01-01'&STOP_TIME='2006-01-20'&STEP_SIZE='1%20d'&QUANTITIES='1,9,20,23,24,29'",
        lookup: "https://ssd.jpl.nasa.gov/api/horizons_lookup.api?sstr=2004%20MN4"
    },

    // 3D Engine State
    engine: {
        scene: null, camera: null, renderer: null, asteroids: []
    },

    init() {
        this.setupNavigation();
        this.init3D(); // Initialize Space View
        this.refresh('cad'); 
        this.updateStatus("Public Access Mode", "text-success");
    },

    init3D() {
        const container = document.getElementById('space-viewport');
        if (!container) return;

        this.engine.scene = new THREE.Scene();
        this.engine.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.engine.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.engine.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.engine.renderer.domElement);

        // Add Sun (Center)
        const sunGeo = new THREE.SphereGeometry(1, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        this.engine.scene.add(new THREE.Mesh(sunGeo, sunMat));

        this.engine.camera.position.set(0, 20, 30);
        this.engine.camera.lookAt(0, 0, 0);

        const animate = () => {
            requestAnimationFrame(animate);
            this.engine.asteroids.forEach(a => {
                a.rotation.y += 0.01;
                // Optional: Update position based on orbital time
            });
            this.engine.renderer.render(this.engine.scene, this.engine.camera);
        };
        animate();
    },

    async refresh(type) {
        const out = document.getElementById(`${type}-out`);
        if (!out) return;
        
        const finalUrl = this.endpoints[type];
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
        
        out.innerHTML = `<div class="p-4 text-center text-info">📡 Requesting Data from JPL...</div>`;
        
        try {
            const res = await fetch(proxiedUrl);
            const data = await res.json();
            
            this.render(type, data);
            
            // HOOK: Update 3D Space if data contains orbital elements
            if (type === 'sbdb_query') this.plotAsteroids(data);
            if (type === 'fireball') this.plotFireballs(data);

            this.updateStatus(`${type.toUpperCase()} Synchronized`, "text-info");
        } catch (err) {
            console.error(err);
            out.innerHTML = `<div class="p-4 text-danger">⚠️ Connection Failed.</div>`;
            this.updateStatus("Link Lost", "text-danger");
        }
    },

    // 3D Logic: Plotting Asteroids from SBDB Query
    plotAsteroids(data) {
        // Clear old asteroids
        this.engine.asteroids.forEach(a => this.engine.scene.remove(a));
        this.engine.asteroids = [];

        const fields = data.fields;
        data.data.slice(0, 100).forEach(row => {
            const a = parseFloat(row[fields.indexOf('a')]); // Semi-major axis
            const e = parseFloat(row[fields.indexOf('e')]); // Eccentricity
            const i = parseFloat(row[fields.indexOf('i')]); // Inclination

            // Create a simple orbital path
            const curve = new THREE.EllipseCurve(0, 0, a * 10, a * 10 * (1 - e), 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.3 });
            const orbit = new THREE.Line(geometry, material);
            
            orbit.rotation.x = Math.PI / 2;
            orbit.rotation.z = THREE.MathUtils.degToRad(i);
            
            this.engine.scene.add(orbit);
            this.engine.asteroids.push(orbit);
        });
    },

    // ... (Your existing render() code remains here) ...
    render(type, data) {
        // Use the same render code you provided
        const out = document.getElementById(`${type}-out`);
        let html = `<table class="table table-dark table-jpl table-striped"><thead><tr>`;

        if (['cad', 'sbdb_query', 'fireball', 'sb_radar'].includes(type)) {
            const fields = data.fields || ["Data"];
            fields.forEach(f => html += `<th>${f}</th>`);
            html += `</tr></thead><tbody>`;
            data.data?.slice(0, 50).forEach(row => {
                html += `<tr>${row.map(c => `<td>${c || '-'}</td>`).join('')}</tr>`;
            });
        } 
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
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const sectionId = link.getAttribute('data-section');
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
    }
};

app.init();
