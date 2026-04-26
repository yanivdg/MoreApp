const app = {
    endpoints: {
        sbdb_query: "https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,a,e,i,om,w&sb-class=IEO",
        fireball: "https://ssd-api.jpl.nasa.gov/fireball.api?limit=20"
    },

    engine: {
        scene: null, camera: null, renderer: null, controls: null,
        clock: new THREE.Clock(), objects: []
    },

    init() {
        this.init3D();
        this.syncSpaceData();
    },

    init3D() {
        this.engine.scene = new THREE.Scene();
        this.engine.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.engine.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.engine.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('view-container').appendChild(this.engine.renderer.domElement);

        // Sun & Ambient Light
        const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
        this.engine.scene.add(sun);
        this.engine.scene.add(new THREE.PointLight(0xffffff, 2));

        // Setup Starfield
        const starGeo = new THREE.BufferGeometry();
        const starCoords = [];
        for(let i=0; i<10000; i++) starCoords.push((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
        this.engine.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.5})));

        // Spaceship Controls (Fly Mode)
        this.engine.camera.position.set(0, 5, 20);
        this.engine.controls = new THREE.FlyControls(this.engine.camera, this.engine.renderer.domElement);
        this.engine.controls.movementSpeed = 10;
        this.engine.controls.rollSpeed = 0.5;
        this.engine.controls.autoForward = false;
        this.engine.controls.dragToLook = false;

        this.animate();
    },

    async syncSpaceData() {
        const url = `https://corsproxy.io/?${encodeURIComponent(this.endpoints.sbdb_query)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            this.plotAsteroids(data);
        } catch (e) { console.error("Sync Failed", e); }
    },

    plotAsteroids(data) {
        const listContainer = document.getElementById('object-list');
        listContainer.innerHTML = "";
        
        data.data.forEach((row, index) => {
            const a = parseFloat(row[1]); // Semi-major axis
            const e = parseFloat(row[2]); // Eccentricity
            
            // Create Visual Asteroid
            const geo = new THREE.IcosahedronGeometry(Math.random() * 0.2 + 0.1, 0);
            const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const mesh = new THREE.Mesh(geo, mat);
            
            // Basic placement in orbit (simplified)
            const posX = a * 15 * (1 + e); 
            mesh.position.set(posX, 0, 0);
            
            this.engine.scene.add(mesh);
            this.engine.objects.push({ mesh, name: row[0] });

            // Add to Nav Menu
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.innerText = `LOCKED: ${row[0]}`;
            item.onclick = () => this.lockOn(mesh, row[0]);
            listContainer.appendChild(item);
        });
    },

    lockOn(target, name) {
        document.getElementById('hud-target').innerText = name;
        this.engine.camera.lookAt(target.position);
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.engine.clock.getDelta();
        this.engine.controls.update(delta);

        // Update HUD
        const pos = this.engine.camera.position;
        document.getElementById('hud-pos').innerText = 
            `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        
        this.engine.renderer.render(this.engine.scene, this.engine.camera);
    }
};

app.init();
