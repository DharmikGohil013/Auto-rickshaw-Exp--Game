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

    const awningColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];

    const createShopBuilding = (
      w: number,
      h: number,
      d: number,
      x: number,
      z: number,
      colorHex: number,
      signText: string,
      hasAwning: boolean = true,
      facingYaw: number = 0
    ) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0, z);
      // The local +Z facade is the street-facing side. Rotate whole buildings
      // on the east/west and south blocks so their entrances face the road.
      bGroup.rotation.y = facingYaw;

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

      // A stepped parapet and a small rooftop water tank give the skyline a
      // more recognizable Mumbai low-rise silhouette.
      const parapetMat = new THREE.MeshStandardMaterial({ color: 0xf1eadf, roughness: 0.82 });
      const parapetHeight = 0.75;
      const parapetY = h + 0.72;
      [
        [w + 0.3, parapetHeight, 0.32, 0, parapetY, -d / 2 + 0.12],
        [w + 0.3, parapetHeight, 0.32, 0, parapetY, d / 2 - 0.12],
        [0.32, parapetHeight, d - 0.2, -w / 2 + 0.12, parapetY, 0],
        [0.32, parapetHeight, d - 0.2, w / 2 - 0.12, parapetY, 0],
      ].forEach(([pw, ph, pd, px, py, pz]) => {
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), parapetMat);
        parapet.position.set(px, py, pz);
        bGroup.add(parapet);
      });

      const tankMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.25 });
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.35, 12), tankMat);
      tank.position.set(w * 0.27, h + 1.55, -d * 0.2);
      tank.castShadow = true;
      bGroup.add(tank);
      const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 12), parapetMat);
      tankCap.position.set(tank.position.x, h + 2.28, tank.position.z);
      bGroup.add(tankCap);

      // Ground Floor Shop Awning
      if (hasAwning) {
        const awnCol = awningColors[Math.floor(Math.random() * awningColors.length)];
        const awnMat = new THREE.MeshStandardMaterial({ color: awnCol, roughness: 0.6 });
        const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.1, 1.4), awnMat);
        awning.position.set(0, 2.8, d / 2 + 0.65);
        awning.rotation.x = 0.25;
        bGroup.add(awning);
      }

      // Shopfront: a recessed central entrance and bright display windows
      // make ground floors read as real street-level businesses.
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.72 });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.35 });
      const displayMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0c4a6e,
        emissiveIntensity: 0.55,
        roughness: 0.28,
        metalness: 0.25,
      });
      const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, 2.2, 0.12), doorMat);
      door.position.set(0, 1.12, d / 2 + 0.1);
      bGroup.add(door);
      [-1, 1].forEach((side) => {
        const display = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 1.7, 0.12), displayMat);
        display.position.set(side * w * 0.3, 1.15, d / 2 + 0.11);
        bGroup.add(display);
        const displayFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, 1.92, 0.16), trimMat);
        displayFrame.position.set(side * w * 0.3, 1.15, d / 2 + 0.07);
        // Keep the frame behind the glass while letting the pane remain visible.
        bGroup.add(displayFrame);
        display.position.z += 0.1;
      });

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

      // Upper-floor windows in paired bays with pale frames, sills and narrow
      // balcony rails. Warm panes vary by floor to suggest lived-in buildings.
      const floors = Math.floor(h / 3);
      const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.68 });
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.45 });
      const litWindowMats = [0xfde68a, 0x7dd3fc, 0x1e293b].map((color) => new THREE.MeshStandardMaterial({
        color,
        emissive: color === 0x1e293b ? 0x000000 : color,
        emissiveIntensity: color === 0x1e293b ? 0 : 0.22,
        roughness: 0.28,
        metalness: 0.15,
      }));
      for (let f = 1; f < floors; f++) {
        const y = f * 3 + 1.2;
        [-1, 1].forEach((side, bay) => {
          const wx = side * w * 0.23;
          const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 1.45, 0.12), litWindowMats[(f + bay) % litWindowMats.length]);
          glass.position.set(wx, y, d / 2 + 0.08);
          bGroup.add(glass);

          const frame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.29, 1.62, 0.1), windowFrameMat);
          frame.position.set(wx, y, d / 2 + 0.015);
          bGroup.add(frame);
          glass.position.z += 0.09;

          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.48, 0.06), windowFrameMat);
          mullion.position.set(wx, y, d / 2 + 0.2);
          bGroup.add(mullion);

          const sill = new THREE.Mesh(new THREE.BoxGeometry(w * 0.31, 0.14, 0.34), trimMat);
          sill.position.set(wx, y - 0.84, d / 2 + 0.17);
          bGroup.add(sill);

          const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, 0.08, 0.08), balconyMat);
          balconyRail.position.set(wx, y - 0.46, d / 2 + 0.47);
          bGroup.add(balconyRail);
          [-1, 0, 1].forEach((post) => {
            const railPost = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.07), balconyMat);
            railPost.position.set(wx + post * w * 0.14, y - 0.72, d / 2 + 0.47);
            bGroup.add(railPost);
          });
        });
      }

      this.scene.add(bGroup);

      // Add to collision bounding boxes
      const box = new THREE.Box3();
      const rotated = Math.abs(Math.sin(facingYaw)) > 0.5;
      box.setFromCenterAndSize(
        new THREE.Vector3(x, h / 2, z),
        new THREE.Vector3((rotated ? d : w) + 0.8, h, (rotated ? w : d) + 0.8)
      );
      this.collisionBoxes.push(box);
    };

    // Inner Core Buildings (Chai shop, Vada Pav stall, etc.)
    // Quad 1 (Top-Left)
    createShopBuilding(10, 11, 10, -22, -22, facadeColors[0], 'MUMBAI CHAI TAPRI');
    // Quad 2 (Top-Right: Dadar Market zone)
    createShopBuilding(10, 12, 10, 22, -22, facadeColors[1], 'DADAR SAREE BAZAAR');
    // Quad 3 (Bottom-Left)
    createShopBuilding(10, 14, 10, -22, 22, facadeColors[2], 'RAJ MANDIR TALKIES', true, Math.PI);
    // Quad 4 (Bottom-Right: Crawford Market)
    createShopBuilding(10, 10, 10, 22, 22, facadeColors[3], 'CRAWFORD DRY FRUITS', true, Math.PI);

    // Outer Skyline Buildings along the avenues
    // North Row
    createShopBuilding(14, 16, 12, -35, -68, facadeColors[4], 'HOTEL TAJ LUXE');
    createShopBuilding(14, 18, 12, 35, -68, facadeColors[5], 'APOLLO PHARMACY');

    // South Row
    createShopBuilding(16, 15, 12, -35, 68, facadeColors[6], 'BANDRA VADA PAV', true, Math.PI);
    createShopBuilding(16, 20, 12, 35, 68, facadeColors[7], 'METRO ELECTRONICS', true, Math.PI);

    // East Row (Market Street)
    createShopBuilding(12, 12, 14, 68, -25, facadeColors[2], 'SPICE DEPOT', true, -Math.PI / 2);
    createShopBuilding(12, 14, 14, 68, 25, facadeColors[1], 'MUMBAI SWEET MART', true, -Math.PI / 2);

    // West Row (Marine Drive / Sea View)
    createShopBuilding(12, 18, 14, -68, -25, facadeColors[0], 'SEAFRONT CAFE', true, Math.PI / 2);
    createShopBuilding(12, 15, 14, -68, 25, facadeColors[5], 'COASTAL JEWELLERS', true, Math.PI / 2);

    // Market Carts & Fruit Stalls in Dadar Market zone (around x: 22 to 38, z: -35 to -15)
    this.buildMarketStall(32, -30, 0xf59e0b, 'Fresh Mangoes');
    this.buildMarketStall(32, -20, 0xef4444, 'Flower Garlands');
    this.buildMarketStall(32, -10, 0x10b981, 'Coconut Water');
  }

  private buildMarketStall(x: number, z: number, canopyColor: number, label: string) {
    const stallGroup = new THREE.Group();
    stallGroup.position.set(x, 0, z);

    // Sturdy timber cart with a visible counter lip and painted paneling.
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.4), tableMat);
    table.position.set(0, 0.42, 0);
    stallGroup.add(table);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0xd6a66f, roughness: 0.68 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.12, 1.47), counterMat);
    counter.position.set(0, 0.86, 0);
    stallGroup.add(counter);

    const cartWheelMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.88 });
    const cartHubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.72, roughness: 0.28 });
    [-1, 1].forEach((side) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 12), cartWheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.08, 0.28, 0.48);
      stallGroup.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 10), cartHubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(side * 1.08, 0.28, 0.48);
      stallGroup.add(hub);
    });

    const produceColors = canopyColor === 0xf59e0b
      ? [0xfbbf24, 0xfb923c, 0x65a30d]
      : canopyColor === 0xef4444
        ? [0xec4899, 0xfda4af, 0xfef08a]
        : [0x22c55e, 0x84cc16, 0x16a34a];
    produceColors.forEach((color, index) => {
      const produceMat = new THREE.MeshStandardMaterial({ color, roughness: 0.42 });
      for (let fruit = 0; fruit < 7; fruit++) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), produceMat);
        sphere.scale.set(1, 0.83, 0.92);
        sphere.position.set(-0.65 + index * 0.65 + (Math.random() - 0.5) * 0.18, 1.03 + Math.floor(fruit / 4) * 0.13, (fruit % 4 - 1.5) * 0.22);
        stallGroup.add(sphere);
      }
    });

    // Canopy poles and crossbars support the pitched striped fabric roof.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
    [-0.95, 0.95].forEach((px) => {
      [-0.55, 0.55].forEach((pz) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.05, 8), poleMat);
        pole.position.set(px, 1.62, pz);
        pole.castShadow = true;
        stallGroup.add(pole);
      });
    });
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.12, 8), poleMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.53, 0);
    stallGroup.add(crossbar);

    // Two roof planes form a proper ridge instead of a pointed pyramid.
    const cMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.5 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.62 });
    [-1, 1].forEach((side) => {
      const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.83), cMat);
      roofPanel.position.set(0, 2.62, side * 0.34);
      roofPanel.rotation.x = side * 0.26;
      roofPanel.castShadow = true;
      stallGroup.add(roofPanel);
      for (let stripe = 0; stripe < 7; stripe++) {
        const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.83), stripeMat);
        stripeMesh.position.set(-0.96 + stripe * 0.32, 2.68, side * 0.34);
        stripeMesh.rotation.x = side * 0.26;
        stallGroup.add(stripeMesh);
      }
    });

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const signCtx = signCanvas.getContext('2d')!;
    signCtx.fillStyle = '#78350f';
    signCtx.fillRect(0, 0, 256, 64);
    signCtx.fillStyle = '#fff7ed';
    signCtx.font = 'bold 26px sans-serif';
    signCtx.textAlign = 'center';
    signCtx.textBaseline = 'middle';
    signCtx.fillText(label.toUpperCase(), 128, 32, 238);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
    sign.position.set(0, 1.52, 0.73);
    stallGroup.add(sign);

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

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.78,
      clearcoat: 0.8, clearcoatRoughness: 0.15,
    });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.86 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.24 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.35, roughness: 0.4 });
    const headlampMat = new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xfde047, emissiveIntensity: 0.65 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });

    const addBox = (size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const addWheel = (x: number, z: number, radius: number, width: number) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), rubberMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, radius, z);
      tire.castShadow = true;
      group.add(tire);
      [-1, 1].forEach((side) => {
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.47, radius * 0.47, 0.035, 12), hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(x + side * (width / 2 + 0.018), radius, z);
        group.add(hub);
      });
    };

    const addCarDetails = (width: number, length: number, colorMat: THREE.Material, cabinMat: THREE.Material, height = 0.95) => {
      addBox([width, 0.48, length], [0, 0.46, 0], colorMat);
      addBox([width * 0.88, 0.14, length * 0.96], [0, 0.73, 0], darkMat); // rocker trim
      addBox([width * 0.82, height * 0.63, length * 0.48], [0, 0.96, -0.2], cabinMat);
      addBox([width * 0.76, 0.08, length * 0.5], [0, 1.29, -0.2], colorMat); // roof cap

      // Windshield, rear glass, and distinct side windows.
      addBox([width * 0.7, height * 0.42, 0.035], [0, 1.02, -0.2 - length * 0.24 - 0.02], glassMat);
      addBox([width * 0.7, height * 0.38, 0.035], [0, 1.02, -0.2 + length * 0.24 + 0.02], glassMat);
      [-1, 1].forEach((side) => {
        addBox([0.035, height * 0.38, length * 0.4], [side * (width * 0.445), 1.01, -0.18], glassMat);
        addBox([0.08, 0.1, length * 0.44], [side * (width * 0.44), 0.72, -0.18], hubMat);
        addBox([0.12, 0.08, 0.42], [side * (width * 0.53), 0.9, -length * 0.34], darkMat); // mirrors
      });
      [-1, 1].forEach((side) => {
        const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), headlampMat);
        headlamp.position.set(side * width * 0.34, 0.56, -length * 0.51);
        group.add(headlamp);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.08), tailMat);
        tail.position.set(side * width * 0.34, 0.58, length * 0.51);
        group.add(tail);
      });
      addBox([width * 0.72, 0.12, 0.1], [0, 0.34, -length * 0.51], hubMat); // front bumper
      addBox([width * 0.72, 0.12, 0.1], [0, 0.34, length * 0.51], hubMat); // rear bumper
      const wheelZ = length * 0.32;
      [-1, 1].forEach((side) => {
        addWheel(side * (width * 0.51), -wheelZ, 0.37, 0.2);
        addWheel(side * (width * 0.51), wheelZ, 0.37, 0.2);
      });
    };

    if (type === 'taxi') {
      // Mumbai Kaali-Peeli proportions: black body, bright yellow cab and roof.
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.36, metalness: 0.28 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32, metalness: 0.18 });
      addCarDetails(1.8, 3.8, blackMat, yellowMat, 0.95);
      addBox([1.65, 0.12, 0.16], [0, 1.45, -0.2], yellowMat);
      addBox([0.48, 0.13, 0.34], [0, 1.52, -0.2], yellowMat); // roof taxi sign
      addBox([0.72, 0.18, 0.06], [0, 0.55, -1.94], darkMat); // grille
    } else if (type === 'bus') {
      // BEST city bus, with a tall glazed passenger cabin and three axles.
      const redMat = new THREE.MeshStandardMaterial({ color: 0xc92e32, roughness: 0.48, metalness: 0.12 });
      const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.6 });
      addBox([2.4, 2.15, 6.6], [0, 1.35, 0], redMat);
      addBox([2.3, 0.16, 6.48], [0, 2.43, 0], creamMat);
      addBox([2.42, 0.15, 6.62], [0, 0.38, 0], darkMat); // lower chassis
      addBox([2.1, 0.78, 0.06], [0, 1.75, -3.34], glassMat);
      addBox([1.25, 0.3, 0.05], [0, 2.3, -3.36], darkMat); // destination display
      addBox([1.3, 0.15, 0.08], [0, 1.04, -3.36], darkMat); // front grille
      [-1, 1].forEach((side) => {
        [-2.15, -0.75, 0.65, 2.0].forEach((z) => {
          addBox([0.035, 0.68, 1.05], [side * 1.205, 1.73, z], glassMat);
          addBox([0.05, 0.08, 1.1], [side * 1.22, 2.12, z], creamMat);
        });
        addWheel(side * 1.22, -2.25, 0.52, 0.24);
        addWheel(side * 1.22, 0.15, 0.52, 0.24);
        addWheel(side * 1.22, 2.35, 0.52, 0.24);
        [-1, 1].forEach((lampSide) => {
          const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), headlampMat);
          headlamp.position.set(lampSide * 0.82, 0.88, -3.36);
          group.add(headlamp);
        });
      });
      const boardCanvas = document.createElement('canvas');
      boardCanvas.width = 256;
      boardCanvas.height = 64;
      const bCtx = boardCanvas.getContext('2d')!;
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(0, 0, 256, 64);
      bCtx.fillStyle = '#fde68a';
      bCtx.font = 'bold 34px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('33  DADAR', 128, 32);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.29), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(boardCanvas) }));
      board.position.set(0, 2.3, -3.39);
      group.add(board);
    } else if (type === 'scooter') {
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.2 });
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.68 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
      addWheel(0, -0.62, 0.32, 0.13);
      addWheel(0, 0.62, 0.32, 0.13);
      addBox([0.42, 0.34, 0.82], [0, 0.48, 0.03], blueMat);
      addBox([0.38, 0.12, 0.55], [0, 0.79, 0.18], seatMat);
      const steeringStem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.72, 10), stemMat);
      steeringStem.position.set(0, 0.75, -0.46);
      steeringStem.rotation.x = -0.22;
      group.add(steeringStem);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10), darkMat);
      handle.position.set(0, 1.12, -0.54);
      handle.rotation.z = Math.PI / 2;
      group.add(handle);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), headlampMat);
      lamp.position.set(0, 0.9, -0.67);
      group.add(lamp);
    } else {
      // Compact silver hatchback with clear cabin, trim, lamps, and road wheels.
      const carMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.42 });
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x25647b, roughness: 0.26, metalness: 0.3 });
      addCarDetails(1.8, 3.6, carMat, cabinMat, 0.88);
      addBox([0.72, 0.14, 0.06], [0, 0.55, -1.84], darkMat);
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
      const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.72 });

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 8), shirtMat);
      body.position.set(0, 0.88, 0);
      pGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
      head.position.set(0, 1.43, 0);
      pGroup.add(head);

      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.163, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
      hair.position.set(0, 1.47, 0);
      pGroup.add(hair);

      // Simple articulated proportions: shoulders, hands, legs and shoes.
      [-1, 1].forEach((side) => {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 3, 6), shirtMat);
        arm.position.set(side * 0.25, 0.91, 0.04);
        arm.rotation.z = side * -0.2;
        pGroup.add(arm);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skinMat);
        hand.position.set(side * 0.31, 0.64, 0.1);
        pGroup.add(hand);

        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 3, 6), trouserMat);
        leg.position.set(side * 0.11, 0.3, 0.02);
        pGroup.add(leg);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.27), shoeMat);
        shoe.position.set(side * 0.11, 0.055, -0.04);
        pGroup.add(shoe);
      });

      // Colorful Monsoon Umbrella held overhead
      const uColor = umbrellaColors[Math.floor(Math.random() * umbrellaColors.length)];
      const uMat = new THREE.MeshStandardMaterial({ color: uColor, roughness: 0.4, side: THREE.DoubleSide });
      const umbrellaDome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), uMat);
      umbrellaDome.position.set(0, 1.82, 0);
      pGroup.add(umbrellaDome);

      const uPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      uPole.position.set(0, 1.48, 0);
      pGroup.add(uPole);

      const umbrellaRibMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.4 });
      for (let rib = 0; rib < 8; rib++) {
        const angle = (rib / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.67, 5), umbrellaRibMat);
        spoke.position.set(Math.cos(angle) * 0.33, 1.88, Math.sin(angle) * 0.33);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.y = -angle;
        pGroup.add(spoke);
      }

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
      new THREE.ConeGeometry(0.28, 0.9, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    arrowCone.rotation.x = Math.PI / 2;
    this.pointerArrow.add(arrowCone);

    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.3 })
    );
    arrowShaft.position.z = 0.6;
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
    this.pointerArrow.position.set(rickshawPos.x, rickshawPos.y + 3.4, rickshawPos.z);
    // Point arrow towards mission target in X-Z plane
    const dx = targetPos.x - rickshawPos.x;
    const dz = targetPos.z - rickshawPos.z;
    const angle = Math.atan2(dx, dz);
    this.pointerArrow.rotation.y = angle;
    // Gentle bobbing motion
    this.pointerArrow.position.y += Math.sin(Date.now() * 0.005) * 0.12;

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
