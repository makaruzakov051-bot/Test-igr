import * as THREE from 'three';
import { WeaponData, WEAPONS, HIT_ZONES, DifficultyLevel, GameState, CALIBERS } from './GameData';
import { audioSystem } from './Audio';

// ============ RAGDOLL SYSTEM ============
interface RagdollPart {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  mass: number;
  grounded: boolean;
  constraint?: { target: RagdollPart; offset: THREE.Vector3; axis: THREE.Vector3 };
}

interface Enemy {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  alive: boolean;
  type: 'crawler' | 'tall' | 'brute';
  ragdoll: RagdollPart[] | null;
  hitZones: Map<string, THREE.Mesh>;
  lastAttackTime: number;
  state: 'idle' | 'chase' | 'attack' | 'dead';
  legDamage: number;
  armDamage: number;
  weapon?: THREE.Mesh;
}

interface Bullet {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  caliber: string;
  life: number;
  trail: THREE.Line;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface LootDrop {
  mesh: THREE.Group;
  position: THREE.Vector3;
  type: 'weapon' | 'ammo' | 'medkit';
  id: string;
  name: string;
  quantity: number;
  bobPhase: number;
}

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  // Player
  private playerPos: THREE.Vector3;
  private playerVel: THREE.Vector3;
  private playerYaw: number = 0;
  private playerPitch: number = 0;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private isSprinting = false;
  private isJumping = false;
  private playerOnGround = true;
  
  // Weapon
  private weaponMesh: THREE.Group | null = null;
  private currentWeapon: WeaponData | null = null;
  private lastShotTime = 0;
  private isReloading = false;
  private reloadStartTime = 0;
  private muzzleFlash: THREE.PointLight | null = null;
  private ammoInMag: number = 0;
  private isShooting = false;
  
  // Enemies
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private lootDrops: LootDrop[] = [];
  private onLootPickup: ((loot: { type: string; id: string; name: string; quantity: number }) => void) | null = null;
  
  // Companion
  private companionMesh: THREE.Group | null = null;
  private companionPos: THREE.Vector3;
  private companionHP: number = 80;
  private companionMaxHP: number = 80;
  private companionTarget: Enemy | null = null;
  private companionLastShot: number = 0;
  private companionState: 'follow' | 'combat' | 'healing' = 'follow';
  
  // Level
  private levelObjects: THREE.Mesh[] = [];
  private colliders: THREE.Box3[] = [];
  
  // Pause
  private isPaused: boolean = false;
  
  // Callbacks
  private onStateUpdate: ((state: Partial<GameState>) => void) | null = null;
  private onHitMarker: ((zone: string, damage: number) => void) | null = null;
  private onKill: (() => void) | null = null;
  private onDamage: ((amount: number) => void) | null = null;
  
  // Difficulty
  private difficulty: DifficultyLevel | null = null;
  
  // Raycaster
  private raycaster: THREE.Raycaster;
  
  // Pointer lock
  private isLocked: boolean = false;
  
  // Animation
  private animationId: number = 0;
  private container: HTMLElement | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    
    this.playerPos = new THREE.Vector3(0, 1.7, 0);
    this.playerVel = new THREE.Vector3();
    this.companionPos = new THREE.Vector3(-2, 1.7, -2);
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // Disabled for performance
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8; // Brighter to compensate for no shadows
  }

  init(container: HTMLElement, difficulty: DifficultyLevel) {
    this.container = container;
    this.difficulty = difficulty;
    
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    
    // Init audio
    audioSystem.init();
    
    this.setupScene();
    this.buildLevel();
    this.setupLighting();
    this.setupWeapon();
    this.setupCompanion();
    this.spawnEnemies();
    this.setupControls();
    this.setupResize();
    
    this.animate();
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x2a2a3f);
    this.scene.fog = new THREE.FogExp2(0x2a2a3f, 0.003); // Very minimal fog for open world
  }

  private flashlight: THREE.SpotLight | null = null;
  private flashlightOn = true;
  
  private setupLighting() {
    // Very bright ambient for open world visibility
    const ambient = new THREE.AmbientLight(0x445566, 1.2);
    this.scene.add(ambient);
    
    // Hemisphere light for better overall visibility
    const hemi = new THREE.HemisphereLight(0x556677, 0x333333, 0.8);
    this.scene.add(hemi);
    
    // Moon light — very bright, NO shadows for performance
    const moon = new THREE.DirectionalLight(0x7799cc, 0.8);
    moon.position.set(50, 80, 30);
    moon.castShadow = false; // Disabled for performance
    this.scene.add(moon);
    
    // === FLASHLIGHT (SpotLight attached to camera) ===
    this.flashlight = new THREE.SpotLight(0xffeedd, 5, 60, Math.PI / 5, 0.4, 1.2);
    this.flashlight.position.set(0.2, -0.15, -0.3);
    this.flashlight.target.position.set(0, 0, -10);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);
    
    // Secondary fill light on camera (so player always sees something)
    const playerLight = new THREE.PointLight(0x8899aa, 1.0, 15, 1.5);
    playerLight.position.set(0, 0, 0);
    this.camera.add(playerLight);
    
    // Hanging lights (bare bulbs on wires) — OPTIMIZED: only 15 lights, no shadows
    const lightPositions = [
      // Central area
      [5, 3.5, 5], [-5, 3.5, -5], [10, 3.5, -3], [-8, 3.5, 8],
      [0, 3.5, 12], [-12, 3.5, -10], [20, 3.5, 15],
      // North
      [0, 3.5, -40], [20, 3.5, -50],
      // East
      [45, 3.5, 0], [50, 3.5, 20],
      // West
      [-45, 3.5, 0], [-50, 3.5, 25],
      // South
      [0, 3.5, 45], [20, 3.5, 50],
    ];
    
    lightPositions.forEach(([x, y, z]) => {
      // Wire
      const wireGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 4);
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(x, y + 0.5, z);
      this.scene.add(wire);
      
      // Bulb
      const bulbGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, y, z);
      this.scene.add(bulb);
      
      // Point light — NO shadows for performance
      const light = new THREE.PointLight(0xffaa44, 2.5, 20, 1.5);
      light.position.set(x, y, z);
      light.castShadow = false; // Critical for performance
      this.scene.add(light);
    });
    
    // Muzzle flash light (attached to camera)
    this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 12, 2);
    this.camera.add(this.muzzleFlash);
    this.muzzleFlash.position.set(0.3, -0.2, -1);
    this.scene.add(this.camera);
  }
  
  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    if (this.flashlight) {
      this.flashlight.visible = this.flashlightOn;
    }
  }

  private buildLevel() {
    // Ground - wet concrete (200x200 map)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a4a, roughness: 0.85, metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    // Don't add ground to colliders — it's flat, handled by Y check
    
    // Panel buildings (Soviet blocks) - LARGE MAP (200x200)
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.85 });
    
    // === CENTRAL DISTRICT (near spawn) ===
    // Building 1 - parking structure (low, wide)
    this.createBuilding(-15, 0, -15, 12, 4, 10, buildingMat);
    // Building 2 - tall apartment block (9 floors)
    this.createBuilding(15, 0, -20, 10, 12, 8, buildingMat);
    // Building 3 - another block
    this.createBuilding(-20, 0, 15, 8, 9, 12, buildingMat);
    // Building 4 - medium block
    this.createBuilding(20, 0, 15, 10, 6, 10, buildingMat);
    
    // === ENTERABLE BUILDING (with interior) ===
    this.createEnterableBuilding(0, 0, -10);
    
    // === NORTH DISTRICT ===
    // Building 5 - distant tower
    this.createBuilding(0, 0, -50, 8, 15, 8, buildingMat);
    // Building 6 - ruins
    this.createBuilding(-40, 0, -30, 6, 3, 6, darkMat);
    // Building 7 - apartment block
    this.createBuilding(35, 0, -45, 10, 10, 10, buildingMat);
    // Building 8 - small house
    this.createBuilding(-30, 0, -50, 6, 4, 6, buildingMat);
    
    // === EAST DISTRICT ===
    // Building 9 - factory
    this.createBuilding(50, 0, -10, 15, 6, 12, buildingMat);
    // Building 10 - warehouse
    this.createBuilding(45, 0, 20, 12, 5, 8, buildingMat);
    // Building 11 - tower block
    this.createBuilding(55, 0, -35, 8, 12, 8, buildingMat);
    
    // === WEST DISTRICT ===
    // Building 12 - apartment complex
    this.createBuilding(-50, 0, -10, 10, 8, 10, buildingMat);
    // Building 13 - low buildings
    this.createBuilding(-45, 0, 25, 8, 4, 12, buildingMat);
    // Building 14 - ruins
    this.createBuilding(-55, 0, 0, 6, 2, 6, darkMat);
    
    // === SOUTH DISTRICT ===
    // Building 15 - large block
    this.createBuilding(0, 0, 50, 12, 10, 10, buildingMat);
    // Building 16 - twin towers
    this.createBuilding(-25, 0, 55, 8, 14, 8, buildingMat);
    this.createBuilding(25, 0, 55, 8, 14, 8, buildingMat);
    // Building 17 - garage
    this.createBuilding(0, 0, 40, 10, 3, 6, buildingMat);
    
    // === FAR DISTRICTS ===
    // Building 18-20 - distant blocks
    this.createBuilding(70, 0, 0, 10, 8, 10, buildingMat);
    this.createBuilding(-70, 0, -40, 8, 6, 8, buildingMat);
    this.createBuilding(0, 0, -70, 10, 10, 10, buildingMat);
    
    // Minimal walls for open world - only essential structures
    // Small walls near enterable building for context
    this.createWall(-6, 0, -5, 0.3, 3, 5, darkMat);
    this.createWall(6, 0, -5, 0.3, 3, 5, darkMat);
    
    // Concrete barriers / tank traps — fewer for more open world (only 10)
    for (let i = 0; i < 10; i++) {
      const barrierGeo = new THREE.BoxGeometry(2, 1, 0.5);
      const barrier = new THREE.Mesh(barrierGeo, concreteMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 50; // spread across map
      barrier.position.set(
        Math.cos(angle) * dist,
        0.5,
        Math.sin(angle) * dist
      );
      barrier.rotation.y = Math.random() * Math.PI;
      this.scene.add(barrier);
      // Don't add to colliders - decorative only for open world
      this.levelObjects.push(barrier);
    }
    
    // Abandoned cars — fewer for open world (only 6)
    const carColors = [0x2a3a2a, 0x3a2a2a, 0x2a2a3a, 0x3a3a2a, 0x4a3a2a];
    for (let i = 0; i < 6; i++) {
      const carMat = new THREE.MeshStandardMaterial({ 
        color: carColors[i % carColors.length], roughness: 0.7, metalness: 0.3 
      });
      const carGroup = new THREE.Group();
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), carMat);
      carBody.position.y = 0.6;
      carGroup.add(carBody);
      const carTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2), carMat);
      carTop.position.y = 1.2;
      carTop.position.z = -0.3;
      carGroup.add(carTop);
      
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 40;
      carGroup.position.set(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist
      );
      carGroup.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(carGroup);
      // Don't add to colliders - decorative for open world
    }
    
    // Rubble/debris — minimal for open world (only 15, no colliders)
    for (let i = 0; i < 15; i++) {
      const size = 0.2 + Math.random() * 0.6;
      const rubbleGeo = new THREE.BoxGeometry(size, size * 0.5, size * 0.8);
      const rubble = new THREE.Mesh(rubbleGeo, new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(0.15 + Math.random() * 0.1, 0.15 + Math.random() * 0.1, 0.15 + Math.random() * 0.1), roughness: 1.0 
      }));
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 70;
      rubble.position.set(
        Math.cos(angle) * dist,
        size * 0.25,
        Math.sin(angle) * dist
      );
      rubble.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
      this.scene.add(rubble);
      // No colliders - decorative only
    }
    
    // Pipes along walls
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, 8 + Math.random() * 4, 8);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(
        -8 + Math.random() * 16,
        2 + Math.random(),
        -8 + Math.random() * 16
      );
      pipe.rotation.z = Math.PI / 2;
      this.scene.add(pipe);
    }
    
    // Barrels — fewer for open world (only 8, no colliders)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7 });
    const barrelMat2 = new THREE.MeshStandardMaterial({ color: 0x2a4a3a, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12);
      const barrel = new THREE.Mesh(barrelGeo, Math.random() > 0.5 ? barrelMat : barrelMat2);
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 60;
      barrel.position.set(
        Math.cos(angle) * dist,
        0.45,
        Math.sin(angle) * dist
      );
      this.scene.add(barrel);
      // No colliders - decorative only
    }
    
    // Rain particles
    this.createRain();
    
    // Puddles (reflective ground patches) — spread across map
    for (let i = 0; i < 40; i++) {
      const puddleGeo = new THREE.CircleGeometry(0.5 + Math.random() * 2.5, 16);
      const puddleMat = new THREE.MeshStandardMaterial({ 
        color: 0x111122, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.6 
      });
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 80;
      puddle.position.set(Math.cos(angle) * dist, 0.01, Math.sin(angle) * dist);
      this.scene.add(puddle);
    }
    
    // Graffiti-like stains on walls (dark patches)
    const stainMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const stainGeo = new THREE.PlaneGeometry(1 + Math.random() * 2, 0.5 + Math.random());
      const stain = new THREE.Mesh(stainGeo, stainMat);
      stain.position.set(
        Math.random() * 20 - 10,
        1 + Math.random() * 2,
        -7.8
      );
      this.scene.add(stain);
    }
  }

  private createEnterableBuilding(x: number, y: number, z: number) {
    const w = 12, h = 4, d = 10;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(w, d);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, y + 0.01, z);
    this.scene.add(floor);
    
    // Ceiling
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, y + h, z);
    this.scene.add(ceiling);
    
    // Back wall (solid)
    const backWallGeo = new THREE.BoxGeometry(w, h, 0.3);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(x, y + h/2, z - d/2);
    this.scene.add(backWall);
    this.colliders.push(new THREE.Box3().setFromObject(backWall));
    
    // Left wall (solid)
    const sideWallGeo = new THREE.BoxGeometry(0.3, h, d);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(x - w/2, y + h/2, z);
    this.scene.add(leftWall);
    this.colliders.push(new THREE.Box3().setFromObject(leftWall));
    
    // Right wall (solid)
    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(x + w/2, y + h/2, z);
    this.scene.add(rightWall);
    this.colliders.push(new THREE.Box3().setFromObject(rightWall));
    
    // Front wall with WIDE door opening (3 sections)
    const doorWidth = 3; // Wider door for easier entry
    const doorHeight = 3; // Taller door
    const sideWidth = (w - doorWidth) / 2;
    
    // Left section of front wall
    const frontLeftGeo = new THREE.BoxGeometry(sideWidth, h, 0.3);
    const frontLeft = new THREE.Mesh(frontLeftGeo, wallMat);
    frontLeft.position.set(x - w/2 + sideWidth/2, y + h/2, z + d/2);
    this.scene.add(frontLeft);
    this.colliders.push(new THREE.Box3().setFromObject(frontLeft));
    
    // Right section of front wall
    const frontRight = new THREE.Mesh(frontLeftGeo, wallMat);
    frontRight.position.set(x + w/2 - sideWidth/2, y + h/2, z + d/2);
    this.scene.add(frontRight);
    this.colliders.push(new THREE.Box3().setFromObject(frontRight));
    
    // Top section above door
    const topGeo = new THREE.BoxGeometry(doorWidth, h - doorHeight, 0.3);
    const topSection = new THREE.Mesh(topGeo, wallMat);
    topSection.position.set(x, y + doorHeight + (h - doorHeight)/2, z + d/2);
    this.scene.add(topSection);
    this.colliders.push(new THREE.Box3().setFromObject(topSection));
    
    // Interior furniture - SIMPLE table (no legs for performance)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8 });
    const tableTopGeo = new THREE.BoxGeometry(2, 0.8, 1);
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.set(x - 3, y + 0.4, z - 2);
    this.scene.add(tableTop);
    
    // Simple chair (single box)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
    const chairGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    const chair1 = new THREE.Mesh(chairGeo, chairMat);
    chair1.position.set(x - 3, y + 0.4, z - 1);
    this.scene.add(chair1);
    
    // Shelf on back wall
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
    const shelfGeo = new THREE.BoxGeometry(3, 0.1, 0.4);
    const shelf1 = new THREE.Mesh(shelfGeo, shelfMat);
    shelf1.position.set(x + 3, y + 2, z - d/2 + 0.2);
    this.scene.add(shelf1);
    
    // Interior lighting - ONE hanging lamp (no shadows)
    const lampBulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    const lampBulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
    lampBulb.position.set(x, y + h - 0.5, z);
    this.scene.add(lampBulb);
    
    const interiorLight = new THREE.PointLight(0xffdd88, 3.0, 15, 1.5);
    interiorLight.position.set(x, y + h - 0.5, z);
    interiorLight.castShadow = false; // No shadows for performance
    this.scene.add(interiorLight);
  }
  
  private createBuilding(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, y + h / 2, z);
    this.scene.add(building);
    this.colliders.push(new THREE.Box3().setFromObject(building));
    this.levelObjects.push(building);
    
    // Windows (dark holes) - only front side for performance
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x050510 });
    const windowGeo = new THREE.PlaneGeometry(1, 1.2);
    for (let wy = 2; wy < h - 1; wy += 3) {
      for (let wx = -w/2 + 2; wx < w/2 - 1; wx += 2.5) {
        // Front only
        const win1 = new THREE.Mesh(windowGeo, windowMat);
        win1.position.set(x + wx, y + wy, z + d/2 + 0.01);
        this.scene.add(win1);
      }
    }
  }

  private createWall(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y + h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push(new THREE.Box3().setFromObject(wall));
    this.levelObjects.push(wall);
  }

  private createRain() {
    const rainCount = 1000; // Reduced from 3000 for performance
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = Math.random() * 80 - 40;
      positions[i + 1] = Math.random() * 30;
      positions[i + 2] = Math.random() * 80 - 40;
    }
    
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMat = new THREE.PointsMaterial({ 
      color: 0x8899aa, size: 0.05, transparent: true, opacity: 0.3 
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.name = 'rain';
    this.scene.add(rain);
  }

  private setupWeapon() {
    this.currentWeapon = WEAPONS[0]; // ТТ
    this.ammoInMag = this.currentWeapon.magSize;
    
    this.weaponMesh = new THREE.Group();
    
    // Simple pistol model
    const bodyGeo = new THREE.BoxGeometry(0.04, 0.12, 0.22);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.weaponMesh.add(body);
    
    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.15, 6);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.15);
    this.weaponMesh.add(barrel);
    
    // Grip
    const gripGeo = new THREE.BoxGeometry(0.035, 0.1, 0.04);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.1, 0.05);
    grip.rotation.x = 0.2;
    this.weaponMesh.add(grip);
    
    this.weaponMesh.position.set(0.25, -0.2, -0.4);
    this.camera.add(this.weaponMesh);
  }

  switchWeapon(weapon: WeaponData) {
    if (this.weaponMesh) {
      this.camera.remove(this.weaponMesh);
    }
    this.currentWeapon = weapon;
    this.ammoInMag = weapon.magSize;
    this.isReloading = false;
    this.setupWeaponVisual(weapon);
  }

  private setupWeaponVisual(weapon: WeaponData) {
    this.weaponMesh = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    
    let bodyW = 0.04, bodyH = 0.12, bodyD = 0.22;
    let posZ = -0.4, posY = -0.2, posX = 0.25;
    
    if (weapon.type === 'rifle' || weapon.type === 'smg') {
      bodyW = 0.05; bodyH = 0.08; bodyD = 0.55;
      posZ = -0.5; posY = -0.25; posX = 0.2;
    } else if (weapon.type === 'shotgun') {
      bodyW = 0.05; bodyH = 0.07; bodyD = 0.6;
      posZ = -0.5; posY = -0.25; posX = 0.2;
    } else if (weapon.type === 'sniper' || weapon.type === 'dmr') {
      bodyW = 0.04; bodyH = 0.08; bodyD = 0.7;
      posZ = -0.55; posY = -0.25; posX = 0.2;
    } else if (weapon.type === 'mg') {
      bodyW = 0.06; bodyH = 0.1; bodyD = 0.65;
      posZ = -0.5; posY = -0.28; posX = 0.2;
    } else if (weapon.type === 'melee') {
      bodyW = 0.02; bodyH = 0.25; bodyD = 0.03;
      posZ = -0.35; posY = -0.15; posX = 0.3;
    }
    
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.weaponMesh.add(body);
    
    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.01, 0.01, bodyD * 0.6, 6);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, bodyH * 0.3, -bodyD * 0.6);
    this.weaponMesh.add(barrel);
    
    this.weaponMesh.position.set(posX, posY, posZ);
    this.camera.add(this.weaponMesh);
  }

  private setupCompanion() {
    this.companionMesh = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.8, 3, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    this.companionMesh.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x5a5a4a, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    this.companionMesh.add(head);
    
    // Weapon in hand
    const gunGeo = new THREE.BoxGeometry(0.03, 0.03, 0.2);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.3, 1.1, -0.2);
    this.companionMesh.add(gun);
    
    // Position companion on ground (y=0, model parts are offset upward)
    this.companionPos.set(-2, 0, -2);
    this.companionMesh.position.copy(this.companionPos);
    this.scene.add(this.companionMesh);
  }

  private spawnEnemies() {
    const count = this.difficulty ? this.difficulty.enemyCount : 5;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 20 + Math.random() * 40; // Further spawn for bigger map
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      
      const type = Math.random() < 0.6 ? 'crawler' : (Math.random() < 0.7 ? 'tall' : 'brute');
      this.createEnemy(x, z, type);
    }
  }

  private createEnemy(x: number, z: number, type: 'crawler' | 'tall' | 'brute') {
    const group = new THREE.Group();
    const hitZones = new Map<string, THREE.Mesh>();
    
    let bodyColor = 0x8a7a6a;
    let scale = 1.0;
    let health = 80;
    let speed = 4; // Faster for bigger map
    
    if (type === 'crawler') {
      bodyColor = 0x9a8a7a;
      scale = 0.7;
      health = 50;
      speed = 6; // Very fast
    } else if (type === 'brute') {
      bodyColor = 0x5a4a3a;
      scale = 1.5;
      health = 200;
      speed = 3; // Slow but tough
    }
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.15 * scale, 6, 6); // Reduced segments
    const headMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = type === 'crawler' ? 0.5 : 1.6 * scale;
    head.name = 'head';
    group.add(head);
    hitZones.set('head', head);
    
    // Torso
    const torsoGeo = new THREE.CapsuleGeometry(0.2 * scale, 0.5 * scale, 3, 6); // Reduced segments
    const torsoMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = type === 'crawler' ? 0.3 : 1.1 * scale;
    torso.name = 'chest';
    group.add(torso);
    hitZones.set('chest', torso);
    
    // Stomach
    const stomachGeo = new THREE.CapsuleGeometry(0.15 * scale, 0.2 * scale, 3, 6);
    const stomach = new THREE.Mesh(stomachGeo, torsoMat);
    stomach.position.y = type === 'crawler' ? 0.15 : 0.7 * scale;
    stomach.name = 'stomach';
    group.add(stomach);
    hitZones.set('stomach', stomach);
    
    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.06 * scale, 0.4 * scale, 3, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
    
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.3 * scale, type === 'crawler' ? 0.3 : 1.0 * scale, 0);
    leftArm.name = 'arm';
    group.add(leftArm);
    hitZones.set('leftArm', leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.3 * scale, type === 'crawler' ? 0.3 : 1.0 * scale, 0);
    rightArm.name = 'arm';
    group.add(rightArm);
    hitZones.set('rightArm', rightArm);
    
    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.08 * scale, 0.5 * scale, 3, 6);
    
    const leftLeg = new THREE.Mesh(legGeo, armMat);
    leftLeg.position.set(-0.12 * scale, type === 'crawler' ? 0.1 : 0.35 * scale, 0);
    leftLeg.name = 'leg';
    group.add(leftLeg);
    hitZones.set('leftLeg', leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, armMat);
    rightLeg.position.set(0.12 * scale, type === 'crawler' ? 0.1 : 0.35 * scale, 0);
    rightLeg.name = 'leg';
    group.add(rightLeg);
    hitZones.set('rightLeg', rightLeg);
    
    // Eyes (glowing)
    const eyeGeo = new THREE.SphereGeometry(0.03 * scale, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.05 * scale, type === 'crawler' ? 0.55 : 1.65 * scale, -0.12 * scale);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.05 * scale, type === 'crawler' ? 0.55 : 1.65 * scale, -0.12 * scale);
    group.add(rightEye);
    
    group.position.set(x, 0, z);
    this.scene.add(group);
    
    const healthMult = this.difficulty ? this.difficulty.healthMult : 1;
    
    const enemy: Enemy = {
      group,
      health: health * healthMult,
      maxHealth: health * healthMult,
      speed: speed,
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      alive: true,
      type,
      ragdoll: null,
      hitZones,
      lastAttackTime: 0,
      state: 'idle',
      legDamage: 0,
      armDamage: 0,
    };
    
    this.enemies.push(enemy);
  }

  private killEnemy(enemy: Enemy, hitDir: THREE.Vector3, force: number) {
    enemy.alive = false;
    enemy.state = 'dead';
    
    // Create ragdoll from body parts
    enemy.ragdoll = [];
    const parts = ['head', 'chest', 'stomach', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const masses = { head: 3, chest: 8, stomach: 5, leftArm: 2, rightArm: 2, leftLeg: 3, rightLeg: 3 };
    
    parts.forEach(partName => {
      const mesh = enemy.hitZones.get(partName);
      if (mesh) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        
        // Remove from group, add to scene
        enemy.group.remove(mesh);
        mesh.position.copy(worldPos);
        this.scene.add(mesh);
        
        // Calculate velocity based on hit direction and force
        const vel = hitDir.clone().multiplyScalar(force * (1 / masses[partName as keyof typeof masses]));
        vel.y += 2 + Math.random() * 3; // upward kick
        
        enemy.ragdoll!.push({
          mesh,
          velocity: vel,
          angularVel: new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
          ),
          mass: masses[partName as keyof typeof masses],
          grounded: false,
        });
      }
    });
    
    // Remove the group
    this.scene.remove(enemy.group);
    
    // Death sound
    audioSystem.playEnemyDeath();
    
    // Spawn loot
    this.spawnLoot(enemy.position.clone());
    
    if (this.onKill) this.onKill();
  }
  
  private spawnLoot(position: THREE.Vector3) {
    // Random loot chance
    const rareChance = this.difficulty ? this.difficulty.rareLootChance : 0.2;
    const roll = Math.random();
    
    let lootType: 'weapon' | 'ammo' | 'medkit' = 'ammo';
    let lootId = '9x19';
    let lootName = 'Патроны';
    let lootQty = 10;
    
    if (roll < 0.1) {
      // Weapon drop (rare)
      const possibleWeapons = WEAPONS.filter(w => w.type !== 'melee');
      const weapon = possibleWeapons[Math.floor(Math.random() * possibleWeapons.length)];
      lootType = 'weapon';
      lootId = weapon.id;
      lootName = weapon.name;
      lootQty = 1;
    } else if (roll < 0.3) {
      // Medkit
      lootType = 'medkit';
      lootId = 'bandage';
      lootName = 'Бинт';
      lootQty = 1;
    } else if (roll < 0.5) {
      // Rare ammo
      const rareAmmo = ['5.45x39', '7.62x39', '12ga', '7.62x54R'];
      lootId = rareAmmo[Math.floor(Math.random() * rareAmmo.length)];
      lootName = CALIBERS[lootId]?.name || lootId;
      lootQty = Math.floor(5 + Math.random() * 15);
    } else {
      // Common ammo
      const commonAmmo = ['9x19', '7.62x25'];
      lootId = commonAmmo[Math.floor(Math.random() * commonAmmo.length)];
      lootName = CALIBERS[lootId]?.name || lootId;
      lootQty = Math.floor(10 + Math.random() * 20);
    }
    
    // Create loot mesh
    const group = new THREE.Group();
    
    // Glowing box — bigger and brighter
    const boxGeo = new THREE.BoxGeometry(0.4, 0.2, 0.3);
    const color = lootType === 'weapon' ? 0xff8800 : lootType === 'medkit' ? 0x00ff44 : 0xffcc00;
    const boxMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    group.add(box);
    
    // Glow — bigger (no PointLight for performance)
    const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);
    
    group.position.copy(position);
    group.position.y = 0.3;
    this.scene.add(group);
    
    this.lootDrops.push({
      mesh: group,
      position: group.position.clone(),
      type: lootType,
      id: lootId,
      name: lootName,
      quantity: lootQty,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
  
  private updateLoot(dt: number) {
    const pickupDist = 2.5; // Slightly larger pickup range
    const time = Date.now() * 0.001;
    
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const loot = this.lootDrops[i];
      
      // Bob animation
      loot.mesh.position.y = 0.3 + Math.sin(time * 2 + loot.bobPhase) * 0.1;
      loot.mesh.rotation.y += dt * 1.5;
      
      // Check pickup
      const dist = this.playerPos.distanceTo(loot.position);
      if (dist < pickupDist) {
        // Pickup!
        if (this.onLootPickup) {
          this.onLootPickup({
            type: loot.type,
            id: loot.id,
            name: loot.name,
            quantity: loot.quantity,
          });
        }
        
        this.scene.remove(loot.mesh);
        this.lootDrops.splice(i, 1);
      }
    }
  }

  private updateRagdolls(dt: number) {
    const gravity = -15;
    
    this.enemies.forEach(enemy => {
      if (!enemy.ragdoll) return;
      
      enemy.ragdoll.forEach(part => {
        if (!part.grounded) {
          // Apply gravity
          part.velocity.y += gravity * dt;
          
          // Update position
          part.mesh.position.add(part.velocity.clone().multiplyScalar(dt));
          
          // Apply rotation
          part.mesh.rotation.x += part.angularVel.x * dt;
          part.mesh.rotation.y += part.angularVel.y * dt;
          part.mesh.rotation.z += part.angularVel.z * dt;
          
          // Ground collision
          if (part.mesh.position.y < 0.1) {
            part.mesh.position.y = 0.1;
            part.velocity.y *= -0.3; // bounce
            part.velocity.x *= 0.7; // friction
            part.velocity.z *= 0.7;
            part.angularVel.multiplyScalar(0.8);
            
            if (Math.abs(part.velocity.y) < 0.5) {
              part.grounded = true;
              part.velocity.set(0, 0, 0);
              part.angularVel.set(0, 0, 0);
            }
          }
          
          // Collider collisions
          this.colliders.forEach(box => {
            const partBox = new THREE.Box3().setFromCenterAndSize(
              part.mesh.position,
              new THREE.Vector3(0.3, 0.3, 0.3)
            );
            if (box.intersectsBox(partBox)) {
              part.velocity.multiplyScalar(-0.5);
              part.mesh.position.add(part.velocity.clone().multiplyScalar(dt * 2));
            }
          });
        }
      });
    });
  }

  private shoot() {
    if (!this.currentWeapon || this.isReloading) return;
    if (this.ammoInMag <= 0) {
      this.reload();
      return;
    }
    
    const now = Date.now();
    const fireInterval = 60000 / this.currentWeapon.fireRate;
    if (now - this.lastShotTime < fireInterval) return;
    
    this.lastShotTime = now;
    this.ammoInMag--;
    
    // Sound
    audioSystem.playGunshot(this.currentWeapon.caliber);
    
    // Muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlash.intensity = 3;
      setTimeout(() => { if (this.muzzleFlash) this.muzzleFlash.intensity = 0; }, 50);
    }
    
    // Weapon recoil animation
    if (this.weaponMesh) {
      this.weaponMesh.rotation.x -= this.currentWeapon.recoil * 2;
      this.weaponMesh.position.z += 0.02;
      setTimeout(() => {
        if (this.weaponMesh) {
          this.weaponMesh.rotation.x *= 0.5;
          this.weaponMesh.position.z -= 0.01;
        }
      }, 50);
    }
    
    // Camera recoil
    this.playerPitch += this.currentWeapon.recoil * 0.5;
    
    // Raycast for hit detection
    const spread = this.currentWeapon.spread * (this.isSprinting ? 2 : 1);
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -1
    );
    direction.applyQuaternion(this.camera.quaternion);
    direction.normalize();
    
    this.raycaster.set(this.camera.position, direction);
    this.raycaster.far = this.currentWeapon.range;
    
    // Check enemy hits
    let hitEnemy = false;
    let closestDist = Infinity;
    let closestZone = 'chest';
    let closestEnemy: Enemy | null = null;
    
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      
      for (const [zone, mesh] of enemy.hitZones) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        const dist = this.camera.position.distanceTo(worldPos);
        
        if (dist < closestDist) {
          const toEnemy = worldPos.clone().sub(this.camera.position).normalize();
          const dot = direction.dot(toEnemy);
          const hitRadius = zone === 'head' ? 0.2 : 0.35;
          const angle = Math.acos(Math.min(1, dot));
          
          if (angle < hitRadius / dist && dist < this.currentWeapon!.range) {
            closestDist = dist;
            closestZone = zone.includes('Leg') || zone.includes('leg') ? 'leg' :
                         zone.includes('Arm') || zone.includes('arm') ? 'arm' :
                         zone === 'head' ? 'head' :
                         zone === 'stomach' ? 'stomach' : 'chest';
            closestEnemy = enemy;
            hitEnemy = true;
          }
        }
      }
    }
    
    if (hitEnemy && closestEnemy) {
      const zoneMult = HIT_ZONES[closestZone as keyof typeof HIT_ZONES] || 1.0;
      const damage = this.currentWeapon.damage * zoneMult;
      
      closestEnemy.health -= damage;
      
      // Zone effects
      if (closestZone === 'leg') {
        closestEnemy.legDamage += 1;
        closestEnemy.speed *= 0.7;
      }
      if (closestZone === 'arm') {
        closestEnemy.armDamage += 1;
      }
      
      // Hit marker callback
      if (this.onHitMarker) this.onHitMarker(closestZone, damage);
      
      // Sound
      if (closestZone === 'head') {
        audioSystem.playHeadshot();
      } else {
        audioSystem.playHit();
      }
      
      // Blood particles
      this.spawnBlood(closestEnemy.group.position.clone().add(new THREE.Vector3(0, 1, 0)));
      
      // Kill check
      if (closestEnemy.health <= 0) {
        const hitDir = direction.clone();
        const force = this.currentWeapon.damage * 0.3;
        
        if (closestZone === 'head') {
          // Head shot - fly backward
          hitDir.y = 0.5;
          this.killEnemy(closestEnemy, hitDir, force * 2);
        } else if (closestZone === 'leg') {
          // Leg shot - fall to knees
          this.killEnemy(closestEnemy, new THREE.Vector3(0, -1, 0).add(hitDir.clone().multiplyScalar(0.3)), force * 0.5);
        } else {
          this.killEnemy(closestEnemy, hitDir, force);
        }
      }
    }
    
    // Create bullet trail
    this.createBulletTrail(this.camera.position.clone(), direction);
    
    // Update state
    if (this.onStateUpdate) {
      this.onStateUpdate({ ammoInMag: this.ammoInMag });
    }
  }

  private createBulletTrail(origin: THREE.Vector3, direction: THREE.Vector3) {
    const end = origin.clone().add(direction.clone().multiplyScalar(this.currentWeapon?.range || 100));
    const points = [origin, end];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    
    setTimeout(() => {
      this.scene.remove(line);
      geo.dispose();
      mat.dispose();
    }, 100);
  }

  private spawnBlood(position: THREE.Vector3) {
    for (let i = 0; i < 4; i++) { // Reduced from 8
      const geo = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0x880000 });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);
      this.scene.add(particle);
      
      this.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2,
          (Math.random() - 0.5) * 3
        ),
        life: 0.5, // Reduced from 1.0
        maxLife: 0.5,
      });
    }
  }

  private reload() {
    if (!this.currentWeapon || this.isReloading) return;
    if (this.currentWeapon.type === 'melee') return;
    
    const caliber = this.currentWeapon.caliber;
    const reserve = (this as any)._ammoReserve?.[caliber] || 0;
    if (reserve <= 0 || this.ammoInMag >= this.currentWeapon.magSize) return;
    
    this.isReloading = true;
    this.reloadStartTime = Date.now();
    
    setTimeout(() => {
      if (!this.currentWeapon) return;
      const needed = this.currentWeapon.magSize - this.ammoInMag;
      const available = Math.min(needed, reserve);
      this.ammoInMag += available;
      if ((this as any)._ammoReserve) {
        (this as any)._ammoReserve[caliber] -= available;
      }
      this.isReloading = false;
      if (this.onStateUpdate) {
        this.onStateUpdate({ ammoInMag: this.ammoInMag });
      }
    }, this.currentWeapon.reloadTime);
  }

  setAmmoReserve(reserve: Record<string, number>) {
    (this as any)._ammoReserve = reserve;
  }

  private enemySpawnTimer = 0;
  private waveNumber = 1;
  private onWaveUpdate: ((wave: number, enemiesLeft: number) => void) | null = null;
  
  private updateEnemies(dt: number) {
    const now = Date.now();
    const damageMult = this.difficulty ? this.difficulty.damageMult : 1;
    
    // Count alive enemies
    const aliveCount = this.enemies.filter(e => e.alive).length;
    
    // Wave system - spawn new enemies
    this.enemySpawnTimer += dt;
    if (aliveCount < 3 && this.enemySpawnTimer > 5) {
      this.enemySpawnTimer = 0;
      this.waveNumber++;
      
      // Spawn new wave
      const spawnCount = Math.min(3 + Math.floor(this.waveNumber / 2), 8);
      for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 30; // Further spawn for bigger map
        const x = this.playerPos.x + Math.cos(angle) * dist;
        const z = this.playerPos.z + Math.sin(angle) * dist;
        const type = Math.random() < 0.5 ? 'crawler' : (Math.random() < 0.7 ? 'tall' : 'brute');
        this.createEnemy(x, z, type);
      }
      
      if (this.onWaveUpdate) {
        this.onWaveUpdate(this.waveNumber, this.enemies.filter(e => e.alive).length);
      }
    }
    
    // Update wave info periodically
    if (this.onWaveUpdate && Math.random() < 0.01) {
      this.onWaveUpdate(this.waveNumber, aliveCount);
    }
    
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      
      const distToPlayer = enemy.position.distanceTo(this.playerPos);
      const distToCompanion = enemy.position.distanceTo(this.companionPos);
      
      // AI state machine
      if (distToPlayer < 50 || distToCompanion < 30) {
        enemy.state = 'chase';
      }
      
      if (enemy.state === 'chase') {
        // Decide target - prefer closer one, but sometimes target companion
        const target = (distToPlayer < distToCompanion || Math.random() > 0.3) 
          ? this.playerPos : this.companionPos;
        const dir = target.clone().sub(enemy.position).normalize();
        dir.y = 0;
        
        // Speed affected by leg damage
        const speedMult = Math.max(0.3, 1 - enemy.legDamage * 0.25);
        
        // Crawlers are faster but less accurate
        const typeSpeedMult = enemy.type === 'crawler' ? 1.3 : enemy.type === 'brute' ? 0.7 : 1.0;
        
        // Strafe occasionally
        const strafe = Math.sin(now * 0.002 + enemy.position.x) * 0.3;
        const strafeDir = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(strafe);
        
        enemy.velocity.lerp(
          dir.multiplyScalar(enemy.speed * speedMult * typeSpeedMult).add(strafeDir), 
          0.08
        );
        
        // Сохраняем старую позицию для проверки коллизий
        const oldPos = enemy.position.clone();
        enemy.position.add(enemy.velocity.clone().multiplyScalar(dt));
        enemy.position.y = 0;
        
        // Проверяем коллизии и корректируем позицию
        const correctedPos = this.checkNPCCollision(enemy.position);
        enemy.position.copy(correctedPos);
        
        // Если застряли, возвращаемся
        if (enemy.position.distanceTo(oldPos) < 0.01 && enemy.velocity.length() > 0.1) {
          enemy.position.copy(oldPos);
          enemy.velocity.set(0, 0, 0);
        }
        
        enemy.group.position.copy(enemy.position);
        
        // Face target
        enemy.group.lookAt(target.x, enemy.group.position.y, target.z);
        
        // Crawlers animate differently (low to ground)
        if (enemy.type === 'crawler') {
          enemy.group.position.y = Math.sin(now * 0.008) * 0.05;
        }
        
        // Attack in melee range
        const attackRange = enemy.type === 'brute' ? 2.5 : 1.8;
        if (distToPlayer < attackRange || distToCompanion < attackRange) {
          const attackCooldown = enemy.type === 'brute' ? 2000 : 1200;
          if (now - enemy.lastAttackTime > attackCooldown) {
            enemy.lastAttackTime = now;
            const baseDmg = enemy.type === 'brute' ? 30 : (enemy.type === 'crawler' ? 12 : 15);
            const dmg = baseDmg * damageMult;
            
            if (distToPlayer < attackRange && this.onDamage) {
              this.onDamage(dmg);
            }
            if (distToCompanion < attackRange) {
              this.companionHP -= dmg;
              if (this.companionHP <= 0) {
                this.companionHP = 0;
                this.companionState = 'healing';
              }
            }
          }
        }
      }
    });
  }

  private updateCompanion(dt: number) {
    if (!this.companionMesh) return;
    
    const distToPlayer = this.companionPos.distanceTo(this.playerPos);
    
    // Follow player
    if (this.companionState === 'follow') {
      if (distToPlayer > 5) {
        const dir = this.playerPos.clone().sub(this.companionPos).normalize();
        dir.y = 0;
        const oldPos = this.companionPos.clone();
        this.companionPos.add(dir.multiplyScalar(4 * dt));
        this.companionPos.y = 0; // Keep on ground
        
        // Проверка коллизий
        const correctedPos = this.checkNPCCollision(this.companionPos);
        this.companionPos.copy(correctedPos);
        
        // Если застряли, пробуем обойти
        if (this.companionPos.distanceTo(oldPos) < 0.01) {
          const avoidDir = new THREE.Vector3(-dir.z, 0, dir.x);
          this.companionPos.add(avoidDir.multiplyScalar(2 * dt));
          const correctedPos2 = this.checkNPCCollision(this.companionPos);
          this.companionPos.copy(correctedPos2);
        }
      }
      
      // Check for nearby enemies to engage
      let closestEnemy: Enemy | null = null;
      let closestDist = 20;
      
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = enemy.position.distanceTo(this.companionPos);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy) {
        this.companionState = 'combat';
        this.companionTarget = closestEnemy;
      }
    }
    
    // Combat
    if (this.companionState === 'combat') {
      if (this.companionTarget && this.companionTarget.alive) {
        const dist = this.companionTarget.position.distanceTo(this.companionPos);
        
        // Move to cover distance
        if (dist < 5) {
          const away = this.companionPos.clone().sub(this.companionTarget.position).normalize();
          away.y = 0;
          const oldPos = this.companionPos.clone();
          this.companionPos.add(away.multiplyScalar(3 * dt));
          this.companionPos.y = 0;
          
          // Проверка коллизий
          const correctedPos = this.checkNPCCollision(this.companionPos);
          this.companionPos.copy(correctedPos);
          
          // Если застряли, пробуем в сторону
          if (this.companionPos.distanceTo(oldPos) < 0.01) {
            const strafeDir = new THREE.Vector3(-away.z, 0, away.x);
            this.companionPos.add(strafeDir.multiplyScalar(2 * dt));
            const correctedPos2 = this.checkNPCCollision(this.companionPos);
            this.companionPos.copy(correctedPos2);
          }
        } else if (dist > 15) {
          const toward = this.companionTarget.position.clone().sub(this.companionPos).normalize();
          toward.y = 0;
          const oldPos = this.companionPos.clone();
          this.companionPos.add(toward.multiplyScalar(3 * dt));
          this.companionPos.y = 0;
          
          // Проверка коллизий
          const correctedPos = this.checkNPCCollision(this.companionPos);
          this.companionPos.copy(correctedPos);
          
          // Если застряли, пробуем в сторону
          if (this.companionPos.distanceTo(oldPos) < 0.01) {
            const strafeDir = new THREE.Vector3(-toward.z, 0, toward.x);
            this.companionPos.add(strafeDir.multiplyScalar(2 * dt));
            const correctedPos2 = this.checkNPCCollision(this.companionPos);
            this.companionPos.copy(correctedPos2);
          }
        }
        
        // Shoot (burst fire - AI economy)
        const now = Date.now();
        if (now - this.companionLastShot > 500) {
          this.companionLastShot = now;
          
          // Hit check with accuracy
          const accuracy = this.difficulty ? this.difficulty.aiAccuracy : 0.7;
          if (Math.random() < accuracy * 0.5) {
            const damage = 20;
            this.companionTarget.health -= damage;
            
            if (this.companionTarget.health <= 0) {
              const dir = this.companionTarget.position.clone().sub(this.companionPos).normalize();
              this.killEnemy(this.companionTarget, dir, 5);
              this.companionTarget = null;
              this.companionState = 'follow';
            }
          }
        }
        
        // Face target
        if (this.companionMesh && this.companionTarget) {
          this.companionMesh.lookAt(this.companionTarget.position.x, 1, this.companionTarget.position.z);
        }
      } else {
        this.companionState = 'follow';
        this.companionTarget = null;
      }
    }
    
    // Self-heal when low HP
    if (this.companionHP < this.companionMaxHP * 0.3 && this.companionState !== 'healing') {
      this.companionState = 'healing';
    }
    
    if (this.companionState === 'healing') {
      // Move away from combat
      const awayFromEnemies = new THREE.Vector3();
      this.enemies.forEach(e => {
        if (e.alive) {
          awayFromEnemies.add(this.companionPos.clone().sub(e.position).normalize());
        }
      });
      awayFromEnemies.y = 0;
      awayFromEnemies.normalize();
      
      const oldPos = this.companionPos.clone();
      this.companionPos.add(awayFromEnemies.multiplyScalar(3 * dt));
      this.companionPos.y = 0; // Keep on ground
      
      // Проверка коллизий
      const correctedPos = this.checkNPCCollision(this.companionPos);
      this.companionPos.copy(correctedPos);
      
      // Если застряли, пробуем в сторону
      if (this.companionPos.distanceTo(oldPos) < 0.01) {
        const strafeDir = new THREE.Vector3(-awayFromEnemies.z, 0, awayFromEnemies.x);
        this.companionPos.add(strafeDir.multiplyScalar(2 * dt));
        const correctedPos2 = this.checkNPCCollision(this.companionPos);
        this.companionPos.copy(correctedPos2);
      }
      
      // Heal over time
      this.companionHP = Math.min(this.companionMaxHP, this.companionHP + 5 * dt);
      
      if (this.companionHP > this.companionMaxHP * 0.7) {
        this.companionState = 'follow';
      }
    }
    
    this.companionMesh.position.copy(this.companionPos);
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.velocity.y -= 10 * dt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.life -= dt;
      
      if (p.mesh.position.y < 0) {
        p.velocity.y = 0;
        p.velocity.x *= 0.5;
        p.velocity.z *= 0.5;
      }
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateRain() {
    const rain = this.scene.getObjectByName('rain') as THREE.Points;
    if (!rain) return;
    
    const positions = rain.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= 0.3;
      if (positions[i + 1] < 0) {
        positions[i + 1] = 25 + Math.random() * 5;
        positions[i] = this.playerPos.x + Math.random() * 80 - 40;
        positions[i + 2] = this.playerPos.z + Math.random() * 80 - 40;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }

  private onLockChange: ((locked: boolean) => void) | null = null;
  
  private setupControls() {
    document.addEventListener('keydown', (e) => {
      // Allow movement even without pointer lock
      switch (e.code) {
        case 'KeyW': this.moveForward = true; break;
        case 'KeyS': this.moveBackward = true; break;
        case 'KeyA': this.moveLeft = true; break;
        case 'KeyD': this.moveRight = true; break;
        case 'ShiftLeft': this.isSprinting = true; break;
        case 'Space':
          if (this.playerOnGround) {
            this.playerVel.y = 6;
            this.playerOnGround = false;
          }
          break;
        case 'KeyR': this.reload(); break;
        case 'KeyF': this.toggleFlashlight(); break;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.moveForward = false; break;
        case 'KeyS': this.moveBackward = false; break;
        case 'KeyA': this.moveLeft = false; break;
        case 'KeyD': this.moveRight = false; break;
        case 'ShiftLeft': this.isSprinting = false; break;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      const sens = ((this as any)._sensitivity || 2.0) * 0.001;
      this.playerYaw -= e.movementX * sens;
      const invertY = (this as any)._invertY ? 1 : -1;
      this.playerPitch += e.movementY * sens * invertY;
      this.playerPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.playerPitch));
    });
    
    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;
      if (e.button === 0) {
        this.isShooting = true;
        this.shoot();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isShooting = false;
    });
    
    // Pointer lock
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.renderer.domElement;
      if (this.onLockChange) this.onLockChange(this.isLocked);
    });
  }
  
  setLockCallback(cb: (locked: boolean) => void) {
    this.onLockChange = cb;
  }
  
  getIsLocked(): boolean {
    return this.isLocked;
  }
  
  setFOV(fov: number) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
  
  setSensitivity(sens: number) {
    (this as any)._sensitivity = sens;
  }
  
  setInvertY(invert: boolean) {
    (this as any)._invertY = invert;
  }
  
  // Allow external look input (for mobile/touch)
  look(dx: number, dy: number) {
    this.playerYaw -= dx * 0.003;
    this.playerPitch -= dy * 0.003;
    this.playerPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.playerPitch));
  }
  
  setMove(input: { forward: boolean; backward: boolean; left: boolean; right: boolean; sprint: boolean }) {
    this.moveForward = input.forward;
    this.moveBackward = input.backward;
    this.moveLeft = input.left;
    this.moveRight = input.right;
    this.isSprinting = input.sprint;
  }
  
  startShooting() {
    this.isShooting = true;
    this.shoot();
  }
  
  stopShooting() {
    this.isShooting = false;
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      if (!this.container) return;
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  private updatePlayer(dt: number) {
    // Camera rotation
    const euler = new THREE.Euler(this.playerPitch, this.playerYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
    
    // Movement
    const speed = this.isSprinting ? 10 : 5; // Faster for bigger map
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.playerYaw, 0))
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.playerYaw, 0))
    );
    
    const moveDir = new THREE.Vector3();
    if (this.moveForward) moveDir.add(forward);
    if (this.moveBackward) moveDir.sub(forward);
    if (this.moveRight) moveDir.add(right);
    if (this.moveLeft) moveDir.sub(right);
    
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(speed);
    }
    
    // Apply gravity
    this.playerVel.y -= 15 * dt;
    
    // New position
    const newPos = this.playerPos.clone();
    newPos.x += moveDir.x * dt;
    newPos.z += moveDir.z * dt;
    newPos.y += this.playerVel.y * dt;
    
    // Ground collision
    if (newPos.y < 1.7) {
      newPos.y = 1.7;
      this.playerVel.y = 0;
      this.playerOnGround = true;
    }
    
    // World collision — try X and Z separately for sliding
    const testBoxX = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(newPos.x, this.playerPos.y, this.playerPos.z),
      new THREE.Vector3(0.6, 1.7, 0.6)
    );
    let blockedX = false;
    for (const collider of this.colliders) {
      if (testBoxX.intersectsBox(collider)) {
        blockedX = true;
        break;
      }
    }
    
    const testBoxZ = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.playerPos.x, this.playerPos.y, newPos.z),
      new THREE.Vector3(0.6, 1.7, 0.6)
    );
    let blockedZ = false;
    for (const collider of this.colliders) {
      if (testBoxZ.intersectsBox(collider)) {
        blockedZ = true;
        break;
      }
    }
    
    // Apply movement only on non-blocked axes (wall sliding)
    if (!blockedX) {
      this.playerPos.x = newPos.x;
    }
    if (!blockedZ) {
      this.playerPos.z = newPos.z;
    }
    this.playerPos.y = newPos.y;
    
    // Emergency push-out if stuck inside a collider
    const stuckBox = new THREE.Box3().setFromCenterAndSize(
      this.playerPos, new THREE.Vector3(0.6, 1.7, 0.6)
    );
    for (const collider of this.colliders) {
      if (stuckBox.intersectsBox(collider)) {
        // Push player away from collider center
        const colliderCenter = new THREE.Vector3();
        collider.getCenter(colliderCenter);
        const pushDir = this.playerPos.clone().sub(colliderCenter);
        pushDir.y = 0;
        if (pushDir.length() < 0.01) pushDir.set(1, 0, 0);
        pushDir.normalize().multiplyScalar(0.5);
        this.playerPos.add(pushDir);
        break;
      }
    }
    
    this.camera.position.copy(this.playerPos);
    
    // Weapon sway
    if (this.weaponMesh) {
      const targetRotX = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight 
        ? Math.sin(Date.now() * 0.005) * 0.01 : 0;
      this.weaponMesh.rotation.x += (targetRotX - this.weaponMesh.rotation.x) * 0.1;
      
      // Return from recoil
      this.weaponMesh.rotation.x *= 0.9;
      this.weaponMesh.position.z += (-0.4 - this.weaponMesh.position.z) * 0.1;
    }
    
    // Auto-fire for automatic weapons
    if (this.isShooting && this.currentWeapon?.automatic) {
      this.shoot();
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const dt = Math.min(this.clock.getDelta(), 0.05);
    
    // Только обновляем логику если не на паузе
    if (!this.isPaused) {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateCompanion(dt);
      this.updateRagdolls(dt);
      this.updateParticles(dt);
      this.updateLoot(dt);
      this.updateRain();
    }
    
    // Рендерим всегда (чтобы видеть UI)
    this.renderer.render(this.scene, this.camera);
  }

  // Public API
  setCallbacks(callbacks: {
    onStateUpdate?: (state: Partial<GameState>) => void;
    onHitMarker?: (zone: string, damage: number) => void;
    onKill?: () => void;
    onDamage?: (amount: number) => void;
    onLootPickup?: (loot: { type: string; id: string; name: string; quantity: number }) => void;
    onWaveUpdate?: (wave: number, enemiesLeft: number) => void;
  }) {
    this.onStateUpdate = callbacks.onStateUpdate || null;
    this.onHitMarker = callbacks.onHitMarker || null;
    this.onKill = callbacks.onKill || null;
    this.onDamage = callbacks.onDamage || null;
    this.onLootPickup = callbacks.onLootPickup || null;
    this.onWaveUpdate = callbacks.onWaveUpdate || null;
  }

  getPlayerPos(): THREE.Vector3 {
    return this.playerPos.clone();
  }

  getCompanionHP(): number {
    return this.companionHP;
  }

  getAmmoInMag(): number {
    return this.ammoInMag;
  }

  setAmmoInMag(amount: number) {
    this.ammoInMag = amount;
  }

  getCurrentWeapon(): WeaponData | null {
    return this.currentWeapon;
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    if (this.container && this.renderer.domElement.parentElement) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
  
  // Пауза
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    this.isPaused = false;
  }
  
  isGamePaused(): boolean {
    return this.isPaused;
  }
  
  // Проверка коллизий для NPC
  private checkNPCCollision(position: THREE.Vector3, radius: number = 0.4): THREE.Vector3 {
    const newPos = position.clone();
    const npcBox = new THREE.Box3().setFromCenterAndSize(
      newPos,
      new THREE.Vector3(radius * 2, 1.7, radius * 2)
    );
    
    // Проверяем X и Z отдельно для скольжения вдоль стен
    const testBoxX = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(newPos.x, position.y, position.z),
      new THREE.Vector3(radius * 2, 1.7, radius * 2)
    );
    let blockedX = false;
    for (const collider of this.colliders) {
      if (testBoxX.intersectsBox(collider)) {
        blockedX = true;
        break;
      }
    }
    
    const testBoxZ = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, position.y, newPos.z),
      new THREE.Vector3(radius * 2, 1.7, radius * 2)
    );
    let blockedZ = false;
    for (const collider of this.colliders) {
      if (testBoxZ.intersectsBox(collider)) {
        blockedZ = true;
        break;
      }
    }
    
    // Применяем движение только по незаблокированным осям
    if (blockedX) newPos.x = position.x;
    if (blockedZ) newPos.z = position.z;
    
    return newPos;
  }
}
