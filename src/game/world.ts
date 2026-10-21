import * as THREE from 'three';

export interface TrafficCar {
  mesh: THREE.Group;
  type: 'taxi' | 'bus' | 'car' | 'scooter';
  path: { x: number; z: number }[];
  currentWaypointIdx: number;
  speed: number;
  length: number;
  width: number;
}

export interface PuddleObstacle {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Mesh;
}

export interface Pedestrian {
  mesh: THREE.Group;
  startX: number;
  startZ: number;
  dir: number;
  speed: number;
  dist: number;
  maxDist: number;
}

export interface WaypointLocation {
  id: string;
  name: string;
  area: string;
  pos: { x: number; z: number };
}

export const CITY_LOCATIONS: WaypointLocation[] = [
  { id: 'marine_drive', name: 'Marine Drive Promenade', area: 'South Mumbai', pos: { x: -38, z: -40 } },
  { id: 'dadar_market', name: 'Dadar Flower Market', area: 'Central Market', pos: { x: 38, z: -38 } },
  { id: 'crawford_bazaar', name: 'Crawford Spice Bazaar', area: 'Bazaar Street', pos: { x: 42, z: 35 } },
  { id: 'bandra_bandstand', name: 'Bandra Bandstand Cinema', area: 'West Suburbs', pos: { x: -36, z: 38 } },
  { id: 'toll_plaza', name: 'Eastern Express Toll Plaza', area: 'Highway Toll', pos: { x: 0, z: -55 } },
  { id: 'petrol_pump', name: 'Bharat Petrol Pump', area: 'Highway Fuel Stop', pos: { x: -25, z: 0 } },
  { id: 'churchgate_station', name: 'Churchgate Fast Food', area: 'Downtown', pos: { x: 0, z: 42 } },
  { id: 'chai_adda', name: 'Cutting Chai Adda', area: 'Market Corner', pos: { x: 18, z: 0 } },
];

export class MumbaiWorld {
  public scene: THREE.Scene;
  public collisionBoxes: THREE.Box3[] = [];
  public trafficList: TrafficCar[] = [];
  public puddles: PuddleObstacle[] = [];
  public pedestrians: Pedestrian[] = [];
  public rainParticles: THREE.Points;
  public rainSplashes: THREE.Points;
  public targetMarkerGroup: THREE.Group;
  public pointerArrow: THREE.Group;
  public petrolZone = { x: -25, z: 0, radius: 7 };

  // Shared road dimensions
  private roadWidth = 14;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildGroundAndRoads();
    this.buildBuildingsAndMarkets();
    this.buildTollPlaza();
    this.buildPetrolPump();
    this.buildStreetFurniture();
    this.buildPuddles();
    this.spawnTraffic();
    this.spawnPedestrians();
    this.setupRainSystem();
    this.setupTargetMarkers();
  }

  private buildGroundAndRoads() {
    // 1. Vast Terrain Base
    const groundGeo = new THREE.PlaneGeometry(320, 320);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark wet soil/concrete
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Asphalt Road Network with Procedural Canvas Texture
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const ctx = roadCanvas.getContext('2d')!;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle noise for wet asphalt grain
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    // White dashed center line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.setLineDash([48, 36]);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Yellow outer lane edges
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, 512);
    ctx.moveTo(492, 0);
    ctx.lineTo(492, 512);
    ctx.stroke();

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.colorSpace = THREE.SRGBColorSpace;

    // High specular wet road material
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.25, // Wet sheen
      metalness: 0.2,
    });

    const createRoadSegment = (w: number, l: number, x: number, z: number, rotY: number = 0, repeats = 6) => {
      const tex = roadTex.clone();
      tex.repeat.set(1, repeats);
      const mat = roadMat.clone();
      mat.map = tex;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rotY;
      mesh.position.set(x, 0.02, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // Main Outer Perimeter Loop
    // North Highway (z = -45)
    createRoadSegment(this.roadWidth, 140, 0, -45, Math.PI / 2, 10);
    // South Street (z = 45)
    createRoadSegment(this.roadWidth, 140, 0, 45, Math.PI / 2, 10);
    // West Avenue (x = -45)
    createRoadSegment(this.roadWidth, 140, -45, 0, 0, 10);
    // East Avenue (x = 45)
    createRoadSegment(this.roadWidth, 140, 45, 0, 0, 10);

    // Cross Intersections (Connecting the loop inside)
    // Central East-West Boulevard (z = 0)
    createRoadSegment(this.roadWidth, 100, 0, 0, Math.PI / 2, 7);
    // Central North-South Avenue (x = 0)
    createRoadSegment(this.roadWidth, 100, 0, 0, 0, 7);

    // Sidewalk Kerbs & Pavements (Elevated slightly by 0.14m)
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.7,
      metalness: 0.1,
    });

    const createSidewalkBlock = (w: number, l: number, x: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, l), sidewalkMat);
      mesh.position.set(x, 0.11, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // 4 Quad Inner city sidewalk islands
    createSidewalkBlock(28, 28, -22, -22);
    createSidewalkBlock(28, 28, 22, -22);
    createSidewalkBlock(28, 28, -22, 22);
    createSidewalkBlock(28, 28, 22, 22);

    // Outer Sidewalks
    createSidewalkBlock(160, 12, 0, -58);
    createSidewalkBlock(160, 12, 0, 58);
    createSidewalkBlock(12, 160, -58, 0);
    createSidewalkBlock(12, 160, 58, 0);
  }

  private buildBuildingsAndMarkets() {
    // Vibrant Indian City Architecture:
    // Colourful facades: Saffron, Turquoise, Coral Pink, Royal Blue, Mustard, Terracotta
    const facadeColors = [
      0xf97316, 0x06b6d4, 0xf43f5e, 0x3b82f6, 0xeab308, 0xd97706, 0x10b981, 0x8b5cf6,
    ];

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.15,
      metalness: 0.8,
    });

    const awningColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];

    const createShopBuilding = (
      w: number,
      h: number,
      d: number,
      x: number,
      z: number,
      colorHex: number,
      signText: string,
      hasAwning: boolean = true
    ) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0, z);

      // Main Structure
      const bMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.65,
        metalness: 0.15,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      body.position.set(0, h / 2, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      bGroup.add(body);

      // Parapet Roof Trim
      const roofTrim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
      );
      roofTrim.position.set(0, h + 0.2, 0);
      bGroup.add(roofTrim);

      // Ground Floor Shop Awning
      if (hasAwning) {
        const awnCol = awningColors[Math.floor(Math.random() * awningColors.length)];
        const awnMat = new THREE.MeshStandardMaterial({ color: awnCol, roughness: 0.6 });
        const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.1, 1.4), awnMat);
        awning.position.set(0, 2.8, d / 2 + 0.65);
        awning.rotation.x = 0.25;
        bGroup.add(awning);
      }

      // Shop Signboard
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 64;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, 256, 64);
      sCtx.fillStyle = '#facc15';
      sCtx.fillRect(4, 4, 248, 56);
      sCtx.fillStyle = '#7c2d12';
      sCtx.font = 'bold 22px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(signText, 128, 32);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.75, 1.0), signMat);
      signMesh.position.set(0, 3.4, d / 2 + 0.05);
      bGroup.add(signMesh);

      // Windows grid
      const floors = Math.floor(h / 3);
      for (let f = 1; f < floors; f++) {
        const y = f * 3 + 1.2;
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.4, 0.1), windowMat);
        win.position.set(0, y, d / 2 + 0.05);
        bGroup.add(win);
      }

      this.scene.add(bGroup);

      // Add to collision bounding boxes
      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w + 0.4, h, d + 0.4));
      this.collisionBoxes.push(box);
    };

    // Inner Core Buildings (Chai shop, Vada Pav stall, etc.)
    // Quad 1 (Top-Left)
    createShopBuilding(10, 11, 10, -22, -22, facadeColors[0], 'MUMBAI CHAI TAPRI');
    // Quad 2 (Top-Right: Dadar Market zone)
    createShopBuilding(10, 12, 10, 22, -22, facadeColors[1], 'DADAR SAREE BAZAAR');
    // Quad 3 (Bottom-Left)
    createShopBuilding(10, 14, 10, -22, 22, facadeColors[2], 'RAJ MANDIR TALKIES');
    // Quad 4 (Bottom-Right: Crawford Market)
    createShopBuilding(10, 10, 10, 22, 22, facadeColors[3], 'CRAWFORD DRY FRUITS');

    // Outer Skyline Buildings along the avenues
    // North Row
    createShopBuilding(14, 16, 12, -35, -68, facadeColors[4], 'HOTEL TAJ LUXE');
    createShopBuilding(14, 18, 12, 35, -68, facadeColors[5], 'APOLLO PHARMACY');

    // South Row
    createShopBuilding(16, 15, 12, -35, 68, facadeColors[6], 'BANDRA VADA PAV');
    createShopBuilding(16, 20, 12, 35, 68, facadeColors[7], 'METRO ELECTRONICS');

    // East Row (Market Street)
    createShopBuilding(12, 12, 14, 68, -25, facadeColors[2], 'SPICE DEPOT');
    createShopBuilding(12, 14, 14, 68, 25, facadeColors[1], 'MUMBAI SWEET MART');

    // West Row (Marine Drive / Sea View)
    createShopBuilding(12, 18, 14, -68, -25, facadeColors[0], 'SEAFRONT CAFE');
    createShopBuilding(12, 15, 14, -68, 25, facadeColors[5], 'COASTAL JEWELLERS');

    // Market Carts & Fruit Stalls in Dadar Market zone (around x: 22 to 38, z: -35 to -15)
    this.buildMarketStall(32, -30, 0xf59e0b, 'Fresh Mangoes');
    this.buildMarketStall(32, -20, 0xef4444, 'Flower Garlands');
    this.buildMarketStall(32, -10, 0x10b981, 'Coconut Water');
  }

  private buildMarketStall(x: number, z: number, canopyColor: number, label: string) {
    const stallGroup = new THREE.Group();
    stallGroup.position.set(x, 0, z);

    // Wooden Table Cart
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.4), tableMat);
    table.position.set(0, 0.42, 0);
    stallGroup.add(table);

    // Canopy Poles
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
    [-0.95, 0.95].forEach((px) => {
      [-0.55, 0.55].forEach((pz) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8), poleMat);
        pole.position.set(px, 1.1, pz);
        stallGroup.add(pole);
      });
    });

    // Striped Canopy
    const cMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 4), cMat);
    canopy.position.set(0, 2.1, 0);
    canopy.rotation.y = Math.PI / 4;
    stallGroup.add(canopy);

    this.scene.add(stallGroup);

    // Collision Box for cart
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(x, 0.9, z), new THREE.Vector3(2.4, 1.8, 1.6));
    this.collisionBoxes.push(box);
  }

  private buildTollPlaza() {
    // Toll Booth along the North Highway (z = -54, x = 0)
    const tollGroup = new THREE.Group();
    tollGroup.position.set(0, 0, -54);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });

    // Large Overhead Toll Gantry
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 2.5), blueMat);
    gantry.position.set(0, 4.5, 0);
    tollGroup.add(gantry);

    // Support Pillars
    [-7.5, 7.5].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.5), metalMat);
      pillar.position.set(px, 2.25, 0);
      tollGroup.add(pillar);
    });

    // Central Toll Island & Booth
    const boothBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 4.0), yellowMat);
    boothBase.position.set(0, 0.2, 0);
    tollGroup.add(boothBase);

    const boothCabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 2.0), yellowMat);
    boothCabin.position.set(0, 1.4, 0);
    tollGroup.add(boothCabin);

    // Toll Banner Sign
    const tollCanvas = document.createElement('canvas');
    tollCanvas.width = 256;
    tollCanvas.height = 64;
    const tCtx = tollCanvas.getContext('2d')!;
    tCtx.fillStyle = '#1e3a8a';
    tCtx.fillRect(0, 0, 256, 64);
    tCtx.fillStyle = '#ffffff';
    tCtx.font = 'bold 22px sans-serif';
    tCtx.textAlign = 'center';
    tCtx.fillText('MUMBAI TOLL PLAZA', 128, 38);
    const signTex = new THREE.CanvasTexture(tollCanvas);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.2), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(0, 4.5, 1.3);
    tollGroup.add(signMesh);

    this.scene.add(tollGroup);

    // Collision Box for center booth only (vehicles pass on left/right lanes)
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(0, 1.2, -54), new THREE.Vector3(1.6, 2.6, 3.8));
    this.collisionBoxes.push(box);
  }

  private buildPetrolPump() {
    // Petrol Pump (x: -25, z: 0)
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(-25, 0, 0);

    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Indian Oil Blue
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.3 }); // Orange trim

    // Large Station Canopy Roof
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 9), canopyMat);
    canopyRoof.position.set(0, 4.5, 0);
    pumpGroup.add(canopyRoof);

    // Support Columns
    [-3.8, 3.8].forEach((px) => {
      [-3.2, 3.2].forEach((pz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.5), whiteMat);
        col.position.set(px, 2.25, pz);
        pumpGroup.add(col);
      });
    });

    // Dual Fuel Dispensers
    [-1.8, 1.8].forEach((pz) => {
      const dispenser = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.7), orangeMat);
      dispenser.position.set(0, 0.9, pz);
      pumpGroup.add(dispenser);

      // Hose nozzle
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7), whiteMat);
      nozzle.position.set(0.45, 1.0, pz);
      pumpGroup.add(nozzle);
    });

    // Glowing Station Signboard
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = '#0284c7';
    pCtx.fillRect(0, 0, 256, 64);
    pCtx.fillStyle = '#f97316';
    pCtx.beginPath();
    pCtx.arc(40, 32, 20, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.fillStyle = '#ffffff';
    pCtx.font = 'bold 20px sans-serif';
    pCtx.fillText('BHARAT PETROL', 70, 38);
    const signTex = new THREE.CanvasTexture(pCanvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 4.5, 4.55);
    pumpGroup.add(sign);

    // Glowing ground circle for Refuel Zone
    const refuelRingGeo = new THREE.RingGeometry(3.5, 4.0, 32);
    const refuelRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(refuelRingGeo, refuelRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 0);
    pumpGroup.add(ring);

    this.scene.add(pumpGroup);

    // Collision boxes for fuel pumps
    const box1 = new THREE.Box3();
    box1.setFromCenterAndSize(new THREE.Vector3(-25, 0.9, -1.8), new THREE.Vector3(1.0, 2.0, 1.0));
    this.collisionBoxes.push(box1);

    const box2 = new THREE.Box3();
    box2.setFromCenterAndSize(new THREE.Vector3(-25, 0.9, 1.8), new THREE.Vector3(1.0, 2.0, 1.0));
    this.collisionBoxes.push(box2);
  }

  private buildStreetFurniture() {
    // Palm trees & Warm streetlights along sidewalks
    const palmPositions = [
      { x: -38, z: -38 }, { x: -38, z: 38 }, { x: 38, z: 38 }, { x: 38, z: -38 },
      { x: -52, z: -15 }, { x: -52, z: 15 }, { x: 52, z: -15 }, { x: 52, z: 15 },
      { x: -15, z: -52 }, { x: 15, z: -52 }, { x: -15, z: 52 }, { x: 15, z: 52 },
    ];

    palmPositions.forEach((pos) => {
      this.createPalmTree(pos.x, pos.z);
    });

    // Streetlights with warm monsoon evening glow
    const lightPositions = [
      { x: -8, z: -38 }, { x: 8, z: -38 }, { x: -8, z: 38 }, { x: 8, z: 38 },
      { x: -38, z: -8 }, { x: -38, z: 8 }, { x: 38, z: -8 }, { x: 38, z: 8 },
    ];

    lightPositions.forEach((pos) => {
      this.createStreetlight(pos.x, pos.z);
    });
  }

  private createPalmTree(x: number, z: number) {
    const palmGroup = new THREE.Group();
    palmGroup.position.set(x, 0, z);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 5, 8), trunkMat);
    trunk.position.set(0, 2.5, 0);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    palmGroup.add(trunk);

    // Fronds (Tropical Palm Leaves)
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 4), frondMat);
      frond.position.set(Math.cos(angle) * 1.2, 4.8, Math.sin(angle) * 1.2);
      frond.rotation.y = angle;
      frond.rotation.x = Math.PI / 2.8;
      palmGroup.add(frond);
    }

    this.scene.add(palmGroup);

    // Trunk collision box
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(0.8, 5, 0.8));
    this.collisionBoxes.push(box);
  }

  private createStreetlight(x: number, z: number) {
    const lightGroup = new THREE.Group();
    lightGroup.position.set(x, 0, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.2), metalMat);
    lamp.position.set(0, 2.6, 0);
    lamp.castShadow = true;
    lightGroup.add(lamp);

    // Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), metalMat);
    arm.position.set(0, 5.1, 0.5);
    lightGroup.add(arm);

    // Emissive Lantern head
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.5,
    });
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.25, 8), lanternMat);
    lantern.position.set(0, 4.95, 1.0);
    lightGroup.add(lantern);

    // Point Light for monsoon puddles illumination
    const warmLight = new THREE.PointLight(0xfde047, 1.2, 16, 1.5);
    warmLight.position.set(0, 4.9, 1.0);
    lightGroup.add(warmLight);

    this.scene.add(lightGroup);

    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(0.5, 5, 0.5));
    this.collisionBoxes.push(box);
  }

  private buildPuddles() {
    // Puddle locations placed strategically along turns and straightaways
    const puddleSpots = [
      { x: -18, z: -45, radius: 2.8 },
      { x: 22, z: -45, radius: 2.5 },
      { x: 45, z: -18, radius: 3.0 },
      { x: 45, z: 22, radius: 2.6 },
      { x: -45, z: 18, radius: 2.9 },
      { x: 0, z: -20, radius: 2.5 },
      { x: 0, z: 24, radius: 2.7 },
      { x: 22, z: 0, radius: 2.8 },
    ];

    const puddleCanvas = document.createElement('canvas');
    puddleCanvas.width = 128;
    puddleCanvas.height = 128;
    const pCtx = puddleCanvas.getContext('2d')!;
    const grad = pCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    grad.addColorStop(0.7, 'rgba(30, 41, 59, 0.8)');
    grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 128, 128);

    const puddleTex = new THREE.CanvasTexture(puddleCanvas);
    const puddleMat = new THREE.MeshStandardMaterial({
      map: puddleTex,
      transparent: true,
      roughness: 0.05, // Mirror like water puddle
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    puddleSpots.forEach((spot) => {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(spot.radius, 16), puddleMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(spot.x, 0.035, spot.z);
      this.scene.add(mesh);
      this.puddles.push({
        x: spot.x,
        z: spot.z,
        radius: spot.radius,
        mesh,
      });
    });
  }

  private spawnTraffic() {
    // Spawn 8 vehicles: 3 Kaali-Peeli Mumbai Taxis, 2 Red BEST Buses, 2 Hatchbacks, 1 Scooter
    const loopWaypoints = [
      { x: -45, z: -45 },
      { x: 45, z: -45 },
      { x: 45, z: 45 },
      { x: -45, z: 45 },
    ];

    const innerLoop = [
      { x: 0, z: -45 },
      { x: 45, z: 0 },
      { x: 0, z: 45 },
      { x: -45, z: 0 },
    ];

    const carConfigs: { type: 'taxi' | 'bus' | 'car' | 'scooter'; path: { x: number; z: number }[]; offset: number; speed: number }[] = [
      { type: 'taxi', path: loopWaypoints, offset: 0, speed: 12 },
      { type: 'bus', path: loopWaypoints, offset: 0.25, speed: 9 },
      { type: 'taxi', path: loopWaypoints, offset: 0.5, speed: 13 },
      { type: 'car', path: loopWaypoints, offset: 0.75, speed: 11 },
      { type: 'bus', path: innerLoop, offset: 0.1, speed: 8 },
      { type: 'taxi', path: innerLoop, offset: 0.35, speed: 12 },
      { type: 'car', path: innerLoop, offset: 0.6, speed: 11 },
      { type: 'scooter', path: innerLoop, offset: 0.85, speed: 14 },
    ];

    carConfigs.forEach((cfg) => {
      const carGroup = this.createTrafficVehicleMesh(cfg.type);
      const startWp = Math.floor(cfg.offset * cfg.path.length);
      carGroup.position.set(cfg.path[startWp].x, 0, cfg.path[startWp].z);
      this.scene.add(carGroup);

      this.trafficList.push({
        mesh: carGroup,
        type: cfg.type,
        path: cfg.path,
        currentWaypointIdx: startWp,
        speed: cfg.speed,
        length: cfg.type === 'bus' ? 6.5 : (cfg.type === 'scooter' ? 1.6 : 3.6),
        width: cfg.type === 'bus' ? 2.4 : (cfg.type === 'scooter' ? 0.8 : 1.8),
      });
    });
  }

  private createTrafficVehicleMesh(type: 'taxi' | 'bus' | 'car' | 'scooter'): THREE.Group {
    const group = new THREE.Group();

    if (type === 'taxi') {
      // Iconic Mumbai "Kaali-Peeli" Taxi (Black body, Bright Yellow roof)
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.4, metalness: 0.2 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.2 });

      // Lower body
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 3.8), blackMat);
      lower.position.set(0, 0.45, 0);
      lower.castShadow = true;
      group.add(lower);

      // Yellow Cabin & Roof
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), yellowMat);
      cab.position.set(0, 0.95, -0.15);
      cab.castShadow = true;
      group.add(cab);

      // Taxi roof light
      const roofLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), yellowMat);
      roofLight.position.set(0, 1.3, -0.15);
      group.add(roofLight);
    } else if (type === 'bus') {
      // Iconic Red BEST Bus
      const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

      // Lower body
      const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6.8), redMat);
      busBody.position.set(0, 1.4, 0);
      busBody.castShadow = true;
      group.add(busBody);

      // Roof stripe
      const busRoof = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.25, 6.82), whiteMat);
      busRoof.position.set(0, 2.55, 0);
      group.add(busRoof);

      // Front destination board (e.g. "ROUTE 33 - COLABA")
      const boardCanvas = document.createElement('canvas');
      boardCanvas.width = 128;
      boardCanvas.height = 32;
      const bCtx = boardCanvas.getContext('2d')!;
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(0, 0, 128, 32);
      bCtx.fillStyle = '#facc15';
      bCtx.font = 'bold 13px sans-serif';
      bCtx.fillText('33 DADAR', 10, 22);
      const bTex = new THREE.CanvasTexture(boardCanvas);
      const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: bTex }));
      bMesh.position.set(0, 2.2, -3.42);
      group.add(bMesh);
    } else if (type === 'scooter') {
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 1.6), blueMat);
      body.position.set(0, 0.35, 0);
      group.add(body);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7), new THREE.MeshStandardMaterial({ color: 0x111827 }));
      handle.position.set(0, 0.75, -0.6);
      handle.rotation.z = Math.PI / 2;
      group.add(handle);
    } else {
      // White/Silver City Car
      const carMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 });
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3.6), carMat);
      lower.position.set(0, 0.45, 0);
      lower.castShadow = true;
      group.add(lower);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.8), carMat);
      upper.position.set(0, 0.9, -0.1);
      upper.castShadow = true;
      group.add(upper);
    }

    return group;
  }

  private spawnPedestrians() {
    // Sidewalk pedestrians with umbrellas
    const spots = [
      { x: -35, z: -20, dir: 1, dist: 18 },
      { x: 35, z: -22, dir: 1, dist: 16 },
      { x: 22, z: 35, dir: -1, dist: 20 },
      { x: -22, z: 35, dir: -1, dist: 15 },
      { x: -54, z: 0, dir: 1, dist: 25 },
      { x: 54, z: 5, dir: -1, dist: 22 },
    ];

    const umbrellaColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0x8b5cf6];

    spots.forEach((sp) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(sp.x, 0, sp.z);

      // Person
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x935f3d, roughness: 0.7 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1), shirtMat);
      body.position.set(0, 0.65, 0);
      pGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
      head.position.set(0, 1.3, 0);
      pGroup.add(head);

      // Colorful Monsoon Umbrella held overhead
      const uColor = umbrellaColors[Math.floor(Math.random() * umbrellaColors.length)];
      const uMat = new THREE.MeshStandardMaterial({ color: uColor, roughness: 0.4, side: THREE.DoubleSide });
      const umbrellaDome = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 12), uMat);
      umbrellaDome.position.set(0, 1.7, 0);
      pGroup.add(umbrellaDome);

      const uPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      uPole.position.set(0, 1.45, 0);
      pGroup.add(uPole);

      this.scene.add(pGroup);

      this.pedestrians.push({
        mesh: pGroup,
        startX: sp.x,
        startZ: sp.z,
        dir: sp.dir,
        speed: 1.2 + Math.random() * 0.6,
        dist: 0,
        maxDist: sp.dist,
      });
    });
  }

  private setupRainSystem() {
    // 3,000 Rain streaks falling through the scene
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Semi-translucent rain streak material
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);

    // Ground splash rings
    const splashCount = 400;
    const splashGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(splashCount * 3);
    for (let i = 0; i < splashCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 120;
      sPos[i * 3 + 1] = 0.04;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    splashGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.45,
      transparent: true,
      opacity: 0.5,
    });
    this.rainSplashes = new THREE.Points(splashGeo, splashMat);
    this.scene.add(this.rainSplashes);
  }

  private setupTargetMarkers() {
    // Glowing Pickup / Delivery Zone Cylinder
    this.targetMarkerGroup = new THREE.Group();

    // Inner glowing vertical cylinder beacon
    const beaconGeo = new THREE.CylinderGeometry(2.4, 2.4, 12, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 6;
    this.targetMarkerGroup.add(beacon);

    // Outer rotating concentric ring on ground
    const ringGeo = new THREE.RingGeometry(2.2, 2.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.targetMarkerGroup.add(ring);

    this.scene.add(this.targetMarkerGroup);

    // Floating Directional 3D Arrow above rickshaw
    this.pointerArrow = new THREE.Group();
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      })
    );
    arrowCone.rotation.x = Math.PI / 2;
    this.pointerArrow.add(arrowCone);

    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.3 })
    );
    arrowShaft.position.z = 0.8;
    arrowShaft.rotation.x = Math.PI / 2;
    this.pointerArrow.add(arrowShaft);

    this.scene.add(this.pointerArrow);
  }

  public setMarkerTarget(x: number, z: number, isPickup: boolean) {
    this.targetMarkerGroup.position.set(x, 0, z);
    const beacon = this.targetMarkerGroup.children[0] as THREE.Mesh;
    const ring = this.targetMarkerGroup.children[1] as THREE.Mesh;
    const col = isPickup ? 0x10b981 : 0xf59e0b; // Green for pickup, Gold for dropoff
    (beacon.material as THREE.MeshBasicMaterial).color.set(col);
    (ring.material as THREE.MeshBasicMaterial).color.set(col);
  }

  public updateWorld(dt: number, rickshawPos: THREE.Vector3, targetPos: { x: number; z: number }) {
    // 1. Update Rain Particles Falling
    const rPositions = this.rainParticles.geometry.attributes.position.array as Float32Array;
    const fallSpeed = 38 * dt;
    for (let i = 1; i < rPositions.length; i += 3) {
      rPositions[i] -= fallSpeed;
      if (rPositions[i] < 0) {
        rPositions[i] = 45;
        // Keep rain centered around player so it's always dense around camera
        rPositions[i - 1] = rickshawPos.x + (Math.random() - 0.5) * 80;
        rPositions[i + 1] = rickshawPos.z + (Math.random() - 0.5) * 80;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;

    // 2. Rotate Beacon Ring & Float
    const ring = this.targetMarkerGroup.children[1];
    ring.rotation.z += 1.5 * dt;

    // 3. Update Floating Pointer Arrow
    this.pointerArrow.position.set(rickshawPos.x, rickshawPos.y + 2.8, rickshawPos.z);
    // Point arrow towards mission target in X-Z plane
    const dx = targetPos.x - rickshawPos.x;
    const dz = targetPos.z - rickshawPos.z;
    const angle = Math.atan2(dx, dz);
    this.pointerArrow.rotation.y = angle;
    // Gentle bobbing motion
    this.pointerArrow.position.y += Math.sin(Date.now() * 0.005) * 0.15;

    // 4. Update Traffic Navigation
    this.trafficList.forEach((car) => {
      const targetWp = car.path[car.currentWaypointIdx];
      const cdx = targetWp.x - car.mesh.position.x;
      const cdz = targetWp.z - car.mesh.position.z;
      const dist = Math.hypot(cdx, cdz);

      if (dist < 2.0) {
        car.currentWaypointIdx = (car.currentWaypointIdx + 1) % car.path.length;
      } else {
        const moveDist = Math.min(dist, car.speed * dt);
        car.mesh.position.x += (cdx / dist) * moveDist;
        car.mesh.position.z += (cdz / dist) * moveDist;
        // Smoothly rotate car facing path
        const targetRot = Math.atan2(cdx, cdz);
        car.mesh.rotation.y = THREE.MathUtils.damp(car.mesh.rotation.y, targetRot, 8, dt);
      }
    });

    // 5. Update Pedestrians Walking
    this.pedestrians.forEach((ped) => {
      ped.dist += ped.speed * dt;
      if (ped.dist > ped.maxDist) {
        ped.dist = 0;
        ped.dir = -ped.dir;
      }
      ped.mesh.position.z += ped.dir * ped.speed * dt;
      // Gentle walking bob
      ped.mesh.position.y = Math.abs(Math.sin(ped.dist * 4)) * 0.1;
      ped.mesh.rotation.y = ped.dir > 0 ? 0 : Math.PI;
    });
  }
}
