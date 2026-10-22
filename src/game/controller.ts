import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RickshawVehicle } from './rickshaw';
import { MumbaiWorld, CITY_LOCATIONS, WaypointLocation } from './world';
import {
  BASE_VEHICLE_STATS,
  calculateDeliveryReward,
  handleVehicleCollision,
  calculateGripFactor,
  calculatePetrolBonus,
  isInsideRadius,
  PassengerMission,
  VehicleStats,
} from './rules';
import { soundEngine } from './audio';

export interface GameHUDState {
  timeRemaining: number;
  score: number;
  deliveries: number;
  speedKmh: number;
  isPuddleSlipping: boolean;
  activeMission: PassengerMission | null;
  targetDistance: number;
  hasPassenger: boolean;
  nitroCharge: number;
  combo: number;
  isMuted: boolean;
  statusMessage: string | null;
}

const PASSENGER_NAMES = [
  { name: "Ramesh Dabbawala", role: "Tiffin Delivery", avatar: "🍱" },
  { name: "Ananya Sharma", role: "College Student", avatar: "🎒" },
  { name: "Dr. K. Mehta", role: "Hospital Surgeon", avatar: "🩺" },
  { name: "Priya Saree Shopper", role: "Market Vendor", avatar: "🛍️" },
  { name: "Vikram Malhotra", role: "Bollywood Assistant", avatar: "🎬" },
  { name: "Sunil Bandra Commuter", role: "Tech Office Exec", avatar: "💼" },
];

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public world: MumbaiWorld;
  public rickshaw: RickshawVehicle;

  // Game state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public timeRemaining: number = 90;
  public score: number = 0;
  public deliveries: number = 0;
  public combo: number = 1;
  public nitroCharge: number = 100;
  public activeMission: PassengerMission | null = null;
  public missionStartTime: number = 0;

  // Vehicle dynamic state
  public speed: number = 0; // forward/backward units per second
  public steerAngle: number = 0;
  public heading: number = Math.PI; // Rickshaw facing direction (radians)
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.25, 20); // Spawn in open road
  public isPuddleSlipping: boolean = false;

  // Collision & timers
  private lastCollisionTime: number = 0;
  private lastPetrolVisitTime: number = 0;
  private cameraTrauma: number = 0;

  // Stats & Upgrades
  public stats: VehicleStats = { ...BASE_VEHICLE_STATS };
  public tireBonus: number = 0;
  public engineBonus: number = 0;

  // Inputs
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    nitro: false,
  };

  // State hook callback for UI
  private onHUDUpdate?: (hud: GameHUDState) => void;
  private onGameOver?: (finalScore: number, deliveries: number) => void;
  private statusMessageTimer: number = 0;
  private currentStatusMessage: string | null = null;

  // Reusable vectors (Zero GC)
  private _camTarget = new THREE.Vector3();
  private _camLookDesired = new THREE.Vector3();
  private _camDesired = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    callbacks: {
      onHUDUpdate?: (hud: GameHUDState) => void;
      onGameOver?: (finalScore: number, deliveries: number) => void;
    }
  ) {
    this.onHUDUpdate = callbacks.onHUDUpdate;
    this.onGameOver = callbacks.onGameOver;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep monsoon dusk sky
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    this.camera.position.set(0, 5, 28);
    this._camTarget.set(
      this.position.x - Math.sin(this.heading) * 3,
      this.position.y + 1.2,
      this.position.z - Math.cos(this.heading) * 3
    );

    // 3. Renderer with ACES Filmic & PMREM
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Procedural Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    keyLight.position.set(45, 65, 30);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 160;
      const d = 50;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    // Cool blue hemisphere fill for monsoon ambiance
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.0);
    this.scene.add(hemiLight);

    // 5. Initialize World & Rickshaw
    this.world = new MumbaiWorld(this.scene);
    this.rickshaw = new RickshawVehicle();
    this.rickshaw.group.position.copy(this.position);
    this.rickshaw.group.rotation.y = this.heading;
    this.scene.add(this.rickshaw.group);

    // Window Resize Handling
    window.addEventListener('resize', this.onResize);

    // Pre-warm shaders
    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  public startGame() {
    this.isRunning = true;
    this.isPaused = false;
    this.timeRemaining = 90;
    this.score = 0;
    this.deliveries = 0;
    this.combo = 1;
    this.nitroCharge = 100;
    this.position.set(0, 0.25, 20);
    this.heading = Math.PI;
    this.speed = 0;
    this.steerAngle = 0;
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.brake = false;
    this.keys.nitro = false;
    this.rickshaw.setPassengerVisible(false);

    soundEngine.init();
    soundEngine.resume();

    this.spawnNextMission();
    this.setStatusMessage("Monsoon Rush Started! Pick up the passenger!");
  }

  public setStatusMessage(msg: string, duration: number = 3.0) {
    this.currentStatusMessage = msg;
    this.statusMessageTimer = duration;
  }

  public setUpgradeStats(speedBonus: number, gripBonus: number, paintPrimary?: string, paintHood?: string) {
    this.engineBonus = speedBonus;
    this.tireBonus = gripBonus;
    if (paintPrimary && paintHood) {
      this.rickshaw.setPaintJob(paintPrimary, paintHood);
    }
  }

  public spawnNextMission() {
    // Pick two distinct city locations
    const available = [...CITY_LOCATIONS];
    const pickupIdx = Math.floor(Math.random() * available.length);
    const pickupLoc = available.splice(pickupIdx, 1)[0];
    const dropIdx = Math.floor(Math.random() * available.length);
    const dropLoc = available[dropIdx];

    const pass = PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];

    this.activeMission = {
      id: `m_${Date.now()}`,
      passengerName: pass.name,
      passengerRole: pass.role,
      avatarIcon: pass.avatar,
      pickupLocationName: pickupLoc.name,
      dropLocationName: dropLoc.name,
      pickupPos: { x: pickupLoc.pos.x, z: pickupLoc.pos.z },
      dropPos: { x: dropLoc.pos.x, z: dropLoc.pos.z },
      baseReward: 200,
      timeBonus: 20,
      isPickedUp: false,
    };
    this.missionStartTime = Date.now();

    this.world.setMarkerTarget(this.activeMission.pickupPos.x, this.activeMission.pickupPos.z, true);
    this.rickshaw.setPassengerVisible(false);
  }

  public triggerHorn() {
    soundEngine.playHorn();
  }

  public resetVehicle() {
    // Reset to nearest open road center if stuck
    this.speed = 0;
    this.steerAngle = 0;
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.brake = false;
    this.keys.nitro = false;
    this.position.y = 0.25;
    // Snap to nearest main road grid
    if (Math.abs(this.position.x) > Math.abs(this.position.z)) {
      this.position.x = this.position.x > 0 ? 45 : -45;
    } else {
      this.position.z = this.position.z > 0 ? 45 : -45;
    }
    this.heading = 0;
    this.rickshaw.group.position.copy(this.position);
    this.rickshaw.group.rotation.set(0, this.heading, 0);
    this.setStatusMessage("Rickshaw repositioned on open road!");
  }

  public update(dt: number) {
    if (!this.isRunning || this.isPaused) return;

    // 1. Update Timer
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.isRunning = false;
      soundEngine.stopAll();
      if (this.onGameOver) {
        this.onGameOver(this.score, this.deliveries);
      }
      return;
    }

    // Status message countdown
    if (this.statusMessageTimer > 0) {
      this.statusMessageTimer -= dt;
      if (this.statusMessageTimer <= 0) {
        this.currentStatusMessage = null;
      }
    }

    // 2. Check Puddles for Slipping
    let inPuddle = false;
    for (const p of this.world.puddles) {
      if (isInsideRadius(this.position.x, this.position.z, p.x, p.z, p.radius)) {
        inPuddle = true;
        break;
      }
    }
    if (inPuddle && !this.isPuddleSlipping && Math.abs(this.speed) > 10) {
      soundEngine.playPuddleSplash();
    }
    this.isPuddleSlipping = inPuddle;

    const effectiveGrip = calculateGripFactor(inPuddle, this.stats.grip, this.tireBonus);

    // 3. Vehicle Physics Simulation
    const maxSpd = this.stats.maxSpeed + this.engineBonus;
    const accel = this.stats.acceleration;
    const brakeDecel = this.stats.braking;

    // Nitro Chai Boost
    let nitroMultiplier = 1.0;
    if (this.keys.forward && this.keys.nitro && this.nitroCharge > 0) {
      nitroMultiplier = 1.4;
      this.nitroCharge = Math.max(0, this.nitroCharge - dt * 25);
    } else if (this.nitroCharge < 100) {
      this.nitroCharge = Math.min(100, this.nitroCharge + dt * 4); // Slow recharge
    }

    if (this.keys.forward) {
      if (this.speed < 0) {
        // Shift cleanly from reverse to forward before applying throttle.
        this.speed = Math.min(0, this.speed + brakeDecel * dt);
      } else {
        this.speed = Math.min(maxSpd * nitroMultiplier, this.speed + accel * nitroMultiplier * dt);
      }
    } else if (this.keys.backward) {
      // The reverse control first slows forward motion, then selects reverse.
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - brakeDecel * 0.72 * dt);
      } else {
        this.speed = Math.max(-12, this.speed - accel * 0.45 * dt);
      }
    } else {
      // Rolling friction
      const friction = inPuddle ? 4 : 12;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - friction * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + friction * dt);
      }
    }

    // Handbrake / Braking
    if (this.keys.brake && Math.abs(this.speed) > 0.1) {
      const bSign = Math.sign(this.speed);
      this.speed -= bSign * brakeDecel * dt;
      if (Math.sign(this.speed) !== bSign) this.speed = 0;
    }

    // Steering
    const steerTarget = this.keys.left === this.keys.right ? 0 : this.keys.left ? -0.45 : 0.45;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, steerTarget, 12 * effectiveGrip, dt);

    if (Math.abs(this.speed) > 0.5) {
      // Turn rate increases with forward speed but decreases slightly at extreme speed
      const steerFactor = (this.speed / maxSpd) * this.stats.turnSpeed * (inPuddle ? 0.6 : 1.0);
      this.heading += this.steerAngle * steerFactor * dt;
    }

    // Vehicle stats and HUD use km/h; convert to world metres per second here.
    // The model's nose points along local -Z, so use that same forward vector
    // for movement, steering and the camera.
    const speedMps = this.speed / 3.6;
    const moveX = -Math.sin(this.heading) * speedMps * dt;
    const moveZ = -Math.cos(this.heading) * speedMps * dt;
    const previousX = this.position.x;
    const previousZ = this.position.z;
    const candidateX = THREE.MathUtils.clamp(previousX + moveX, -78, 78);
    const candidateZ = THREE.MathUtils.clamp(previousZ + moveZ, -78, 78);

    // Check an oriented rectangular footprint using its world-space AABB.
    const playerBox = new THREE.Box3();
    const otherBox = new THREE.Box3();
    const setOrientedBox = (box: THREE.Box3, x: number, z: number, width: number, length: number, yaw: number, height = 1.8) => {
      const halfX = Math.abs(Math.cos(yaw)) * width / 2 + Math.abs(Math.sin(yaw)) * length / 2;
      const halfZ = Math.abs(Math.sin(yaw)) * width / 2 + Math.abs(Math.cos(yaw)) * length / 2;
      box.setFromCenterAndSize(new THREE.Vector3(x, height / 2, z), new THREE.Vector3(halfX * 2, height, halfZ * 2));
    };
    const collidesAt = (x: number, z: number) => {
      setOrientedBox(playerBox, x, z, 1.4, 2.2, this.heading);
      if (this.world.collisionBoxes.some((obstacle) => playerBox.intersectsBox(obstacle))) return true;
      return this.world.trafficList.some((car) => {
        setOrientedBox(otherBox, car.mesh.position.x, car.mesh.position.z, car.width, car.length, car.mesh.rotation.y, 1.6);
        return playerBox.intersectsBox(otherBox);
      });
    };

    let hadHit = false;
    if (!collidesAt(candidateX, candidateZ)) {
      this.position.x = candidateX;
      this.position.z = candidateZ;
    } else {
      hadHit = true;
      // Resolve each axis independently so the rickshaw can slide along walls
      // and parked traffic instead of being thrown backward from a corner.
      this.position.x = previousX;
      this.position.z = previousZ;
      const axes: Array<'x' | 'z'> = Math.abs(moveX) >= Math.abs(moveZ) ? ['x', 'z'] : ['z', 'x'];
      for (const axis of axes) {
        const testX = axis === 'x' ? candidateX : this.position.x;
        const testZ = axis === 'z' ? candidateZ : this.position.z;
        if (!collidesAt(testX, testZ)) {
          this.position.x = testX;
          this.position.z = testZ;
        }
      }
      this.speed *= 0.28;
      this.cameraTrauma = Math.max(this.cameraTrauma, 0.45);
    }

    if (hadHit) {
      const now = Date.now();
      const colRes = handleVehicleCollision(this.timeRemaining, now, this.lastCollisionTime);
      if (colRes.hasPenalty) {
        this.timeRemaining = colRes.newTime;
        this.lastCollisionTime = now;
        this.cameraTrauma = 1.0;
        soundEngine.playCollision();
        this.setStatusMessage("Crash! -5 Seconds Penalty!", 2.0);
      }
    }

    // 5. Update Rickshaw Model in 3D
    this.rickshaw.group.position.copy(this.position);
    this.rickshaw.group.rotation.y = this.heading;
    this.rickshaw.updateAnimation(dt, this.speed, this.steerAngle);

    // Update sound engine pitch
    soundEngine.updateEnginePitch(this.speed / maxSpd, this.keys.forward);

    // 6. Mission Check: Pickup or Delivery
    if (this.activeMission) {
      const curTarget = this.activeMission.isPickedUp
        ? this.activeMission.dropPos
        : this.activeMission.pickupPos;

      const dist = Math.hypot(this.position.x - curTarget.x, this.position.z - curTarget.z);

      if (dist < 4.5 && Math.abs(this.speed) < 18) {
        if (!this.activeMission.isPickedUp) {
          // Passenger Picked Up!
          this.activeMission.isPickedUp = true;
          this.rickshaw.setPassengerVisible(true);
          soundEngine.playPickup();
          this.world.setMarkerTarget(this.activeMission.dropPos.x, this.activeMission.dropPos.z, false);
          this.setStatusMessage(`Picked up ${this.activeMission.passengerName}! Rush to ${this.activeMission.dropLocationName}!`);
        } else {
          // Passenger Delivered!
          const timeTaken = (Date.now() - this.missionStartTime) / 1000;
          const reward = calculateDeliveryReward(this.activeMission.baseReward, timeTaken, 20);
          this.score += reward.points * this.combo;
          this.timeRemaining += reward.bonusSeconds;
          this.deliveries += 1;
          this.combo += 1;
          soundEngine.playDeliverySuccess();
          this.setStatusMessage(`Delivered! +${reward.points} Pts & +${reward.bonusSeconds}s Time!`, 3.5);
          this.spawnNextMission();
        }
      }

      // Update World animations & marker target
      this.world.updateWorld(dt, this.position, curTarget);
    }

    // 7. Check Petrol Pump Refuel Pit
    if (isInsideRadius(this.position.x, this.position.z, this.world.petrolZone.x, this.world.petrolZone.z, this.world.petrolZone.radius)) {
      const now = Date.now();
      const pBonus = calculatePetrolBonus(this.score, this.timeRemaining, this.lastPetrolVisitTime, now);
      if (pBonus.allowed) {
        this.lastPetrolVisitTime = now;
        this.score += pBonus.pointsBonus;
        this.timeRemaining += pBonus.timeBonus;
        this.nitroCharge = 100;
        soundEngine.playPetrolChime();
        this.setStatusMessage("Bharat Petrol Pitstop: +120 Pts, +10s Time & Full Nitro!", 3.0);
      }
    }

    // 8. Third-Person Following Camera Rig
    // Camera placed behind and slightly above rickshaw, damped smoothly
    const camDist = 7.0;
    const camHeight = 3.6;
    this._camDesired.set(
      this.position.x + Math.sin(this.heading) * camDist,
      this.position.y + camHeight,
      this.position.z + Math.cos(this.heading) * camDist
    );

    // Apply trauma camera shake on collisions
    if (this.cameraTrauma > 0) {
      const shakeAmt = this.cameraTrauma * this.cameraTrauma * 0.35;
      this._camDesired.x += (Math.random() - 0.5) * shakeAmt;
      this._camDesired.y += (Math.random() - 0.5) * shakeAmt;
      this._camDesired.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.5);
    }

    // Smooth exponential damping
    this.camera.position.lerp(this._camDesired, 1 - Math.exp(-9 * dt));

    this._camLookDesired.set(
      this.position.x - Math.sin(this.heading) * 3,
      this.position.y + 1.2,
      this.position.z - Math.cos(this.heading) * 3
    );
    this._camTarget.lerp(this._camLookDesired, 1 - Math.exp(-11 * dt));
    this.camera.lookAt(this._camTarget);

    // 9. Emit HUD Updates
    if (this.onHUDUpdate && this.activeMission) {
      const curTarget = this.activeMission.isPickedUp
        ? this.activeMission.dropPos
        : this.activeMission.pickupPos;
      const targetDist = Math.round(
        Math.hypot(this.position.x - curTarget.x, this.position.z - curTarget.z)
      );

      this.onHUDUpdate({
        timeRemaining: Math.max(0, Math.ceil(this.timeRemaining)),
        score: this.score,
        deliveries: this.deliveries,
        speedKmh: Math.round(Math.abs(this.speed)),
        isPuddleSlipping: this.isPuddleSlipping,
        activeMission: this.activeMission,
        targetDistance: targetDist,
        hasPassenger: this.activeMission.isPickedUp,
        nitroCharge: Math.round(this.nitroCharge),
        combo: this.combo,
        isMuted: soundEngine.getMuted(),
        statusMessage: this.currentStatusMessage,
      });
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    soundEngine.stopAll();
    this.renderer.dispose();
  }
}
