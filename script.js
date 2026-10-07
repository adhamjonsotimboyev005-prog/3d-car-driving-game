import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const loadingScreen = document.getElementById('loadingScreen');
const menuPanel = document.getElementById('menuPanel');
const speedEl = document.getElementById('speed');
const gearEl = document.getElementById('gear');
const statusEl = document.getElementById('status');
const garageInfo = document.getElementById('garageInfo');
const garageStats = document.getElementById('garageStats');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaed8ff);
scene.fog = new THREE.Fog(0xaed8ff, 60, 500);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3.4, 9);

const clock = new THREE.Clock();

const world = {
  isPlaying: false,
  dayTime: 0.6,
  roadLength: 1800,
  roadWidth: 13,
  grassSize: 500,
};

const controls = {
  W: false,
  S: false,
  A: false,
  D: false,
  Space: false,
  Shift: false,
};

const touchInput = {
  gas: false,
  brake: false,
  left: false,
  right: false,
  nitro: false,
};

const carProfile = {
  name: 'Prototype Sport',
  price: 32000,
  maxSpeed: 210,
  power: 420,
  acceleration: 7.5,
  handling: 7.2,
  brake: 8.4,
  weight: 1320,
  fuel: 'Petrol',
  transmission: 'Automatic',
  category: 'Sport',
  color: 0xff5722,
};

const player = {
  mesh: null,
  speed: 0,
  steer: 0,
  velocity: 0,
  wheelMeshes: [],
  acceleration: carProfile.acceleration,
  maxSpeed: carProfile.maxSpeed,
  brakePower: carProfile.brake,
  handling: carProfile.handling,
};

const trafficCars = [];

function finishLoading() {
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 700);
  }, 500);
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x53655d, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
  sun.position.set(45, 80, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 300;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
}

function createGround() {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(500, world.roadLength),
    new THREE.MeshStandardMaterial({
      color: 0x5fa15d,
      roughness: 0.95,
      metalness: 0.04,
    })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  scene.add(grass);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(world.roadWidth, 0.14, world.roadLength),
    new THREE.MeshStandardMaterial({
      color: 0x2d2d34,
      roughness: 0.9,
      metalness: 0.14,
    })
  );
  road.position.y = 0.04;
  road.receiveShadow = true;
  scene.add(road);

  for (let z = -800; z <= 800; z += 18) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.02, 5),
      new THREE.MeshStandardMaterial({
        color: 0xf7e8a0,
        emissive: 0x342b00,
        emissiveIntensity: 0.3,
      })
    );
    line.position.set(0, 0.1, z);
    scene.add(line);
  }
}

function createCity() {
  for (let i = -40; i <= 40; i += 8) {
    const width = 7 + Math.random() * 12;
    const depth = 7 + Math.random() * 12;
    const height = 20 + Math.random() * 48;

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.08, 0.2, 0.55),
        roughness: 0.8,
        metalness: 0.18,
      })
    );

    const side = i % 2 === 0 ? 1 : -1;
    building.position.set(side * (24 + Math.random() * 18), height / 2, i * 18);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
  }
}

function createWheelMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.5,
    roughness: 0.7,
  });
}

function createCar(color = 0xff5722, scale = 1) {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.62,
    roughness: 0.25,
    envMapIntensity: 1,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2 * scale, 0.7 * scale, 4.5 * scale),
    bodyMaterial
  );
  body.position.y = 0.8 * scale;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6 * scale, 0.7 * scale, 2.2 * scale),
    new THREE.MeshStandardMaterial({
      color: 0xdfeaf9,
      metalness: 0.2,
      roughness: 0.2,
    })
  );
  cabin.position.set(0, 1.25 * scale, -0.2 * scale);
  cabin.castShadow = true;
  group.add(cabin);

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.8 * scale, 0.2 * scale, 1.2 * scale),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.6,
      roughness: 0.4,
    })
  );
  hood.position.set(0, 1.05 * scale, 1.55 * scale);
  group.add(hood);

  const headLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6f9ff,
    emissive: 0xfff7dc,
    emissiveIntensity: 1.5,
    metalness: 0.2,
    roughness: 0.2,
  });

  const leftHead = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scale, 0.18 * scale, 0.9 * scale), headLightMaterial);
  leftHead.position.set(-0.7 * scale, 0.96 * scale, 2.2 * scale);
  group.add(leftHead);

  const rightHead = leftHead.clone();
  rightHead.position.x = 0.7 * scale;
  group.add(rightHead);

  const brakeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3131,
    emissive: 0xff1d1d,
    emissiveIntensity: 1.2,
    metalness: 0.12,
    roughness: 0.2,
  });

  const leftBrake = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scale, 0.18 * scale, 0.8 * scale), brakeMaterial);
  leftBrake.position.set(-0.7 * scale, 0.92 * scale, -2.25 * scale);
  group.add(leftBrake);

  const rightBrake = leftBrake.clone();
  rightBrake.position.x = 0.7 * scale;
  group.add(rightBrake);

  const wheelGeo = new THREE.CylinderGeometry(0.42 * scale, 0.42 * scale, 0.35 * scale, 18);
  const wheelMat = createWheelMaterial();
  const wheelPositions = [
    [-1.15 * scale, 0.45 * scale, 1.45 * scale],
    [1.15 * scale, 0.45 * scale, 1.45 * scale],
    [-1.15 * scale, 0.45 * scale, -1.45 * scale],
    [1.15 * scale, 0.45 * scale, -1.45 * scale],
  ];

  const wheelMeshes = [];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    group.add(wheel);
    wheelMeshes.push(wheel);
  }

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  group.rotation.y = Math.PI;
  return { group, wheelMeshes };
}

function createPlayerCar() {
  const { group, wheelMeshes } = createCar(carProfile.color, 1);
  group.position.set(0, 0, 5);
  scene.add(group);

  player.mesh = group;
  player.wheelMeshes = wheelMeshes;
  player.maxSpeed = carProfile.maxSpeed;
  player.acceleration = carProfile.acceleration;
  player.brakePower = carProfile.brake;
  player.handling = carProfile.handling;
}

function createTrafficCar(color = 0x2a9d8f, z = -120) {
  const { group, wheelMeshes } = createCar(color, 0.9);
  const side = Math.random() > 0.5 ? 1 : -1;
  group.position.set(side * (3 + Math.random() * 3), 0, z);
  scene.add(group);

  trafficCars.push({
    mesh: group,
    wheelMeshes,
    speed: 18 + Math.random() * 28,
  });
}

function createTraffic() {
  for (let i = 0; i < 14; i++) {
    const color = new THREE.Color().setHSL(Math.random(), 0.6, 0.52).getHex();
    createTrafficCar(color, -180 - i * 28);
  }
}

function setSceneTheme() {
  const brightness = 0.25 + world.dayTime * 0.7;
  scene.background = new THREE.Color().setHSL(0.58, 0.52, brightness * 0.7 + 0.15);
  scene.fog.color = scene.background.clone();
}

function updatePlayerPhysics(delta) {
  const car = player;
  if (!car.mesh) return;

  const accelInput = controls.W || touchInput.gas;
  const brakeInput = controls.S || touchInput.brake;
  const leftInput = controls.A || touchInput.left;
  const rightInput = controls.D || touchInput.right;
  const nitroInput = controls.Shift || touchInput.nitro;

  if (accelInput) {
    car.velocity += car.acceleration * delta * 22;
  } else {
    car.velocity *= 0.986;
  }

  if (brakeInput) {
    car.velocity -= car.brakePower * delta * 18;
  }

  if (nitroInput) {
    car.velocity += 16 * delta;
  }

  car.velocity = THREE.MathUtils.clamp(car.velocity, -30, car.maxSpeed / 2.5 + 30);

  if (leftInput) {
    car.steer -= 0.035 * (1 + Math.abs(car.velocity) / 60);
  } else if (rightInput) {
    car.steer += 0.035 * (1 + Math.abs(car.velocity) / 60);
  } else {
    car.steer *= 0.85;
  }

  car.steer = THREE.MathUtils.clamp(car.steer, -1, 1);

  const forwardMove = car.velocity * delta * 0.8;
  car.mesh.position.z -= forwardMove;
  car.mesh.position.x += car.steer * Math.min(1.2, Math.abs(car.velocity) / 70) * delta * 10;
  car.mesh.position.x = THREE.MathUtils.clamp(car.mesh.position.x, -8, 8);

  car.mesh.rotation.z = -car.steer * 0.14 * (Math.min(1, Math.abs(car.velocity) / 55));
  car.mesh.rotation.y = car.steer * 0.32;

  if (car.wheelMeshes.length) {
    const spin = car.velocity * 0.25;
    car.wheelMeshes.forEach((wheel) => {
      wheel.rotation.x -= spin * delta * 8;
    });
  }

  camera.position.x += (car.mesh.position.x - camera.position.x) * 0.07;
  camera.position.y = 3.8;
  camera.position.z = car.mesh.position.z + 8.5;
  camera.lookAt(car.mesh.position.x, 1, car.mesh.position.z - 18);

  const speedKmh = Math.abs(car.velocity) * 3.6;
  speedEl.textContent = `${Math.round(speedKmh)} km/h`;
  gearEl.textContent = speedKmh > 25 ? 'D' : 'N';
  statusEl.textContent = world.isPlaying ? 'Free Drive' : 'Paused';
}

function updateTraffic(delta) {
  for (const traffic of trafficCars) {
    traffic.mesh.position.z += traffic.speed * delta;

    if (traffic.mesh.position.z > 240) {
      traffic.mesh.position.z = -240;
      const side = Math.random() > 0.5 ? 1 : -1;
      traffic.mesh.position.x = side * (2.5 + Math.random() * 5);
    }

    if (traffic.wheelMeshes) {
      const spin = traffic.speed * 0.2;
      traffic.wheelMeshes.forEach((wheel) => {
        wheel.rotation.x -= spin * delta * 8;
      });
    }
  }
}

function updateWorld() {
  world.dayTime += 0.00018;
  if (world.dayTime > 1) world.dayTime = 0;
  setSceneTheme();
}

function bindMenuActions() {
  document.querySelectorAll('.menuBtn').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      world.isPlaying = mode === 'play' || mode === 'race';
      menuPanel.style.display = mode === 'play' ? 'none' : 'flex';

      if (mode === 'garage') {
        garageInfo.style.display = 'block';
        garageStats.innerHTML = `
          <div>Name: ${carProfile.name}</div>
          <div>Price: $${carProfile.price}</div>
          <div>Top Speed: ${carProfile.maxSpeed} km/h</div>
          <div>Power: ${carProfile.power} hp</div>
          <div>0-100: ${carProfile.acceleration}s</div>
          <div>Fuel: ${carProfile.fuel}</div>
          <div>Transmission: ${carProfile.transmission}</div>
        `;
      } else {
        garageInfo.style.display = 'none';
      }
    });
  });
}

function bindKeyEvents() {
  const setKey = (code, pressed) => {
    if (code === 'KeyW') controls.W = pressed;
    if (code === 'KeyS') controls.S = pressed;
    if (code === 'KeyA') controls.A = pressed;
    if (code === 'KeyD') controls.D = pressed;
    if (code === 'Space') controls.Space = pressed;
    if (code === 'ShiftLeft' || code === 'ShiftRight') controls.Shift = pressed;
  };

  document.addEventListener('keydown', (event) => setKey(event.code, true));
  document.addEventListener('keyup', (event) => setKey(event.code, false));
}

function bindTouchControls() {
  const gasBtn = document.getElementById('gasBtn');
  const brakeBtn = document.getElementById('brakeBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const nitroBtn = document.getElementById('nitroBtn');

  const setButtonState = (button, key, value) => {
    const handle = () => {
      if (key === 'gas') touchInput.gas = value;
      if (key === 'brake') touchInput.brake = value;
      if (key === 'left') touchInput.left = value;
      if (key === 'right') touchInput.right = value;
      if (key === 'nitro') touchInput.nitro = value;
    };

    button.addEventListener('pointerdown', handle);
    button.addEventListener('pointerup', () => {
      if (key === 'gas') touchInput.gas = false;
      if (key === 'brake') touchInput.brake = false;
      if (key === 'left') touchInput.left = false;
      if (key === 'right') touchInput.right = false;
      if (key === 'nitro') touchInput.nitro = false;
    });
    button.addEventListener('pointerleave', () => {
      if (key === 'gas') touchInput.gas = false;
      if (key === 'brake') touchInput.brake = false;
      if (key === 'left') touchInput.left = false;
      if (key === 'right') touchInput.right = false;
      if (key === 'nitro') touchInput.nitro = false;
    });
  };

  setButtonState(gasBtn, 'gas', true);
  setButtonState(brakeBtn, 'brake', true);
  setButtonState(leftBtn, 'left', true);
  setButtonState(rightBtn, 'right', true);
  setButtonState(nitroBtn, 'nitro', true);
}

function animate() {
  const delta = clock.getDelta();

  updateWorld();

  if (world.isPlaying) {
    updatePlayerPhysics(delta);
    updateTraffic(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function init() {
  addLights();
  createGround();
  createCity();
  createPlayerCar();
  createTraffic();
  bindMenuActions();
  bindKeyEvents();
  bindTouchControls();
  finishLoading();
  animate();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
