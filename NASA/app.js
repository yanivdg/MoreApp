const StarSurfer = {
    endpoint: "https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,a,e,i,om,w&sb-class=IEO",
    proxy: "https://corsproxy.io/?",
    
    engine: {
        clock: new THREE.Clock(),
        objects: []
    },

    async init() {
        this.setupScene();
        this.createStars();
        await this.loadNASAData();
        this.animate();
    },

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Lighting - Deep Space Dimness
        const sunLight = new THREE.PointLight(0xffffff, 2, 2000);
        this.scene.add(sunLight);
        this.scene.add(new THREE.AmbientLight(0x222222));

        // Ship Controls (Fly like a spaceship)
        this.controls = new THREE.FlyControls(this.camera, this.renderer.domElement);
        this.controls.movementSpeed = 50; 
        this.controls.rollSpeed = 0.5;
        this.controls.dragToLook = false;
        
        this.camera.position.set(0, 10, 100);
    },

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCoords = [];
        for(let i=0; i<15000; i++) {
            starCoords.push((Math.random()-0.5)*3000, (Math.random()-0.5)*3000, (Math.random()-0.5)*3000);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.7}));
        this.scene.add(stars);
    },

    async loadNASAData() {
        const log = document.getElementById('data-log');
        try {
            const res = await fetch(this.proxy + encodeURIComponent(this.endpoint));
            const json = await res.json();
            
            document.getElementById('s-val').innerText = "OBJECTS DETECTED";
            log.innerHTML = `Connected. Mapping ${json.count} targets...`;

            // Transform Table Rows into 3D Space Objects
            json.data.forEach((row, i) => {
                const name = row[0];
                const a = parseFloat(row[1]); // semi-major axis
                const e = parseFloat(row[2]); // eccentricity
                
                // Create a procedurally generated asteroid mesh
                const geom = new THREE.IcosahedronGeometry(Math.random() * 2 + 1, 1);
                const mat = new THREE.MeshStandardMaterial({ 
                    color: 0x666666, 
                    flatShading: true,
                    roughness: 1
                });
                const asteroid = new THREE.Mesh(geom, mat);
                
                // Spread them out in the "Deep Space" surfing lane
                // We use the orbital 'a' to determine distance from center
                const distance = a * 200;
                const angle = (i / json.data.length) * Math.PI * 2;
                
                asteroid.position.set(
                    Math.cos(angle) * distance,
                    (Math.random() - 0.5) * 50, // Slight vertical jitter
                    Math.sin(angle) * distance
                );
                
                asteroid.userData = { name: name };
                this.scene.add(asteroid);
                this.engine.objects.push(asteroid);

                log.innerHTML += `<br>Spawned: ${name}`;
            });
        } catch (err) {
            log.innerHTML = "📡 LINK ERROR: Use a different proxy or check connection.";
        }
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.engine.clock.getDelta();
        
        this.controls.update(delta);

        // Update HUD
        const pos = this.camera.position;
        document.getElementById('v-val').innerText = (this.controls.movementSpeed).toFixed(1);
        document.getElementById('c-val').innerText = `${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`;

        // Rotate Asteroids for visual effect
        this.engine.objects.forEach(obj => {
            obj.rotation.x += 0.01;
            obj.rotation.y += 0.01;
        });

        this.renderer.render(this.scene, this.camera);
    }
};

StarSurfer.init();
