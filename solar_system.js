const planetslist = 
{
  Mercury:0,
  Venus:1,
  Earth:2,
  Mars:3,
  Jupiter:4,
  Saturn:5,
  Uranus:6,
  Neptune:7
};
// Create a clock
var clock = new THREE.Clock();
clock.start();

// Adjust the rotation speed based on window width
var windowWidth = window.innerWidth;
var baseWindowWidth = 1920; // Base window width for reference
var rotationSpeedFactor = windowWidth / baseWindowWidth;

// Create the scene and camera
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

// Create the renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a texture loader
var sunGeometry = new THREE.SphereGeometry(8, 32, 32);
var textureLoaderSun = new THREE.TextureLoader();
// Load the texture
var sunTexture = textureLoaderSun.load('./images/sun_texture.jpg');
// Create the material with the texture
var sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
// Create the sun
var sun = new THREE.Mesh(sunGeometry, sunMaterial);
// Add the sun to the scene
scene.add(sun);

// Define the planets
var planets = [
  { name: 'Mercury', distance: 0.39*10, speed: 4.15, size: 0.350826743, texture: './images/mercury_texture.jpg' },
  { name: 'Venus', distance: 0.72*10, speed: 1.63, size: 0.870165349, texture: './images/venus_texture.jpg' },
  { name: 'Earth', distance: 1.00*10, speed: 1, size: 1, texture: './images/earth_texture.jpg' },
  { name: 'Mars', distance: 1.52*10, speed: 0.53, size: 0.9, texture: './images/mars_texture.jpg' },
  { name: 'Jupiter', distance: 5.2*10, speed: 0.08, size: 4, texture: './images/jupiter_texture.jpg' },
  { name: 'Saturn', distance: 9.53*10, speed: 0.03, size: 3.5, texture: './images/saturn_texture.jpg' },
  { name: 'Neptune', distance: 30.07*10, speed: 0.006, size: 2.5, texture: './images/nep_text.jpg' },
  { name: 'Uranus', distance: 19.19*10, speed: 0.01, size: 2.4, texture: './images/uranus_texture.jpg' }
];

/*
// Create the planet
var planetGeometry = new THREE.SphereGeometry(1, 32, 32);
// Load the texture
var textureLoaderPlanet = new THREE.TextureLoader();
var planetTexture = textureLoaderPlanet.load('./images/earth_texture.jpg'); // replace with your texture path
var planetMaterial = new THREE.MeshBasicMaterial({map: planetTexture});
var planet = new THREE.Mesh(planetGeometry, planetMaterial);
planet.position.x = 10;
scene.add(planet);
*/


// Create the planets
for (var i = 0; i < planets.length; i++) {
  var planetInfo = planets[i];
  var geometry = new THREE.SphereGeometry(planetInfo.size, 32, 32);
  var texture = new THREE.TextureLoader().load(planetInfo.texture);
  var material = new THREE.MeshBasicMaterial({ map: texture });
  var planet = new THREE.Mesh(geometry, material);
  //planet.userData = { speed: planetInfo.speed, distance: planetInfo.distance };
  planet.userData = { 
    speed: planetInfo.speed * rotationSpeedFactor, // Adjust the speed of rotation around the sun
    distance: planetInfo.distance, // Adjust the distance from the sun
    initialRotation: Math.random() * Math.PI * 2 // Randomize initial rotation
  };
   // If the planet is Saturn, add a ring
  if (planetInfo.name === 'Saturn') {
    var ringGeometry = new THREE.RingGeometry(1.5 * planetInfo.size, 2 * planetInfo.size, 32);
    var ringTexture = new THREE.TextureLoader().load('./images/saturn_ring.jpg');
    var ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide });
    var ring = new THREE.Mesh(ringGeometry, ringMaterial);
    planet.add(ring);
  }
  scene.add(planet);
}

// Animation
var animate = function () {
    requestAnimationFrame(animate);
    // Rotate the sun
    sun.rotation.y += 0.01;
    // Rotate the planet around the sun
    /*
    planet.position.x = 10 * Math.cos(Date.now() / 2000);
    planet.position.z = 10 * Math.sin(Date.now() / 2000);
    */
    
    // Rotate the planets around the sun
      for (var i = 0; i < scene.children.length; i++) 
      {
            var object = scene.children[i];
            if (object instanceof THREE.Mesh && object !== sun) 
            {
              // Increase the elapsed time value to speed up the animation
              var time = clock.getElapsedTime() * 2; // Adjust the factor as needed
              // Adjust the rotation speed around the sun
              var speed = object.userData.speed;
              // Update position based on adjusted speed
              //object.position.x = sun.position.x + object.userData.distance * Math.cos(time * object.userData.speed);
              //object.position.z = sun.position.z + object.userData.distance * Math.sin(time * object.userData.speed);
              object.position.x = sun.position.x + object.userData.distance * Math.cos(time * speed);
              object.position.z = sun.position.z + object.userData.distance * Math.sin(time * speed);
            }
      }
    renderer.render(scene, camera);
};

animate();

// Adjust rotation speed when window is resized
window.addEventListener('resize', function () {
  windowWidth = window.innerWidth;
  rotationSpeedFactor = windowWidth / baseWindowWidth;
});

