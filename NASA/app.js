const MobileSurfer = {
    candidates: [
        { id: "J1234+5678", ra: 188.61, dec: 56.51, catalog: "Chandra", energy: 80 },
        { id: "J0534+2200", ra: 83.63, dec: 22.01, catalog: "XMM-Newton", energy: 60 }
    ],

    input: { move: {x:0, y:0}, look: {x:0, y:0} },

    init() {
        this.setupScene();
        this.setupTouch();
        this.spawnObjects();
        this.animate();
    },

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        this.camera.position.z = 500;
        
        // Starfield for speed reference
        const starGeo = new THREE.BufferGeometry();
        const stars = [];
        for(let i=0; i<10000; i++) stars.push((Math.random()-0.5)*5000, (Math.random()-0.5)*5000, (Math.random()-0.5)*5000);
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
        this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0x4444ff, size: 1})));
    },

    setupTouch() {
        const handleJoy = (id, type) => {
            const el = document.getElementById(id);
            const knob = document.getElementById(id[0] + '-knob');
            
            const onTouch = (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width/2;
                const centerY = rect.top + rect.height/2;
                
                // Calculate distance from center (-1 to 1)
                const dx = (touch.clientX - centerX) / (rect.width/2);
                const dy = (touch.clientY - centerY) / (rect.height/2);
                
                this.input[type] = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
                knob.style.transform = `translate(${this.input[type].x * 30}px, ${this.input[type].y * 30}px)`;
            };

            const onEnd = () => {
                this.input[type] = {x:0, y:0};
                knob.style.transform = `translate(0,0)`;
            };

            el.addEventListener('touchstart', onTouch);
            el.addEventListener('touchmove', onTouch);
            el.addEventListener('touchend', onEnd);
        };

        handleJoy('left-joy', 'move');
        handleJoy('right-joy', 'look');
    },

    spawnObjects() {
        this.objects = [];
        this.candidates.forEach(c => {
            const phi = (90 - c.dec) * (Math.PI / 180);
            const theta = (c.ra) * (Math.PI / 180);
            const dist = 1000 + Math.random()*1000;

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(c.energy/5, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
            );
            mesh.position.set(dist * Math.sin(phi) * Math.cos(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.sin(theta));
            this.scene.add(mesh);
            this.objects.push(mesh);
        });
    },

    animate() {
        requestAnimationFrame(() => this.animate());

        // 1. Handle Movement (Left Stick)
        // Y moves forward/backward, X strafes
        this.camera.translateZ(this.input.move.y * -5); 
        this.camera.translateX(this.input.move.x * 5);

        // 2. Handle Rotation (Right Stick)
        this.camera.rotation.y -= this.input.look.x * 0.03;
        this.camera.rotation.x -= this.input.look.y * 0.03;

        document.getElementById('c-val').innerText = `${Math.round(this.camera.position.x)},${Math.round(this.camera.position.z)}`;
        this.renderer.render(this.scene, this.camera);
    }
};

MobileSurfer.init();
