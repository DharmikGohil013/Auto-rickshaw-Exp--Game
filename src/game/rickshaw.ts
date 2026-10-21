import * as THREE from 'three';

export interface RickshawConfig {
  primaryColor?: string; // e.g. '#15803d'
  hoodColor?: string;    // e.g. '#eab308'
}

export class RickshawVehicle {
  public group: THREE.Group;
  public frontForkGroup: THREE.Group;
  public frontWheel: THREE.Mesh;
  public rearLeftWheel: THREE.Mesh;
  public rearRightWheel: THREE.Mesh;
  public wiperGroup: THREE.Group;
  public headlightMesh: THREE.Mesh;
  public headlightLight: THREE.SpotLight;
  public headlightTarget: THREE.Object3D;
  public contactShadow: THREE.Mesh;

  // Materials saved for runtime customizations/color changes
  public bodyMaterial: THREE.MeshStandardMaterial;
  public hoodMaterial: THREE.MeshStandardMaterial;
  public canvasMaterial: THREE.MeshStandardMaterial;

  // Passenger back seat anchor
  public passengerMount: THREE.Group;
  public passengerMesh: THREE.Group | null = null;

  constructor(config: RickshawConfig = {}) {
    this.group = new THREE.Group();

    const primaryColor = config.primaryColor || '#15803d'; // Mumbai green
    const hoodColor = config.hoodColor || '#eab308';       // Iconic yellow

    // Shared Materials
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryColor),
      roughness: 0.35,
      metalness: 0.3,
    });

    this.hoodMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hoodColor),
      roughness: 0.4,
      metalness: 0.2,
    });

    this.canvasMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#926d48'), // Warm khaki canvas hood
      roughness: 0.85,
      metalness: 0.05,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.9,
      metalness: 0.1,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transmission: 0.8,
      opacity: 0.5,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false,
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x543216, // Brown leatherette
      roughness: 0.7,
      metalness: 0.1,
    });

    const yellowLightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfde047,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    const amberLightMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.9,
    });

    // 1. Lower Chassis & Cabin Body (Composite 3-12 parts)
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.45, 2.3);
    const chassis = new THREE.Mesh(chassisGeo, this.bodyMaterial);
    chassis.position.set(0, 0.42, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.group.add(chassis);

    // Side decorative white/silver stripes on rear fenders
    const stripeGeo = new THREE.BoxGeometry(1.42, 0.04, 1.2);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.position.set(0, 0.45, 0.4);
    this.group.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe2.position.set(0, 0.35, 0.4);
    this.group.add(stripe2);

    // Front Nose / Cowling (Tapered front cabin)
    const noseGeo = new THREE.CylinderGeometry(0.5, 0.65, 0.7, 8);
    const nose = new THREE.Mesh(noseGeo, this.bodyMaterial);
    nose.position.set(0, 0.55, -1.05);
    nose.rotation.y = Math.PI / 4;
    nose.castShadow = true;
    this.group.add(nose);

    // Front Upper Windshield Frame & Yellow Brow
    const browGeo = new THREE.BoxGeometry(1.18, 0.35, 0.4);
    const brow = new THREE.Mesh(browGeo, this.hoodMaterial);
    brow.position.set(0, 1.05, -0.85);
    brow.castShadow = true;
    this.group.add(brow);

    // Windshield Glass
    const windshieldGeo = new THREE.PlaneGeometry(1.1, 0.55);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.28, -0.72);
    windshield.rotation.x = 0.22;
    this.group.add(windshield);

    // Windshield Wiper
    this.wiperGroup = new THREE.Group();
    this.wiperGroup.position.set(0, 1.05, -0.66);
    const wiperBladeGeo = new THREE.BoxGeometry(0.02, 0.45, 0.02);
    const wiperBlade = new THREE.Mesh(wiperBladeGeo, rubberMat);
    wiperBlade.position.set(0, 0.22, 0);
    this.wiperGroup.add(wiperBlade);
    this.group.add(this.wiperGroup);

    // Roof & Canvas Awning (Khaki fabric arched top)
    const roofArches = new THREE.Group();
    const roofTopGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.8, 12, 1, false, 0, Math.PI);
    const roofTop = new THREE.Mesh(roofTopGeo, this.canvasMaterial);
    roofTop.rotation.z = Math.PI / 2;
    roofTop.rotation.y = Math.PI / 2;
    roofTop.position.set(0, 1.62, 0.15);
    roofTop.castShadow = true;
    roofArches.add(roofTop);

    // Front yellow roof cap
    const roofCapGeo = new THREE.BoxGeometry(1.28, 0.12, 0.6);
    const roofCap = new THREE.Mesh(roofCapGeo, this.hoodMaterial);
    roofCap.position.set(0, 1.65, -0.75);
    roofArches.add(roofCap);
    this.group.add(roofArches);

    // Rear Canvas Flap
    const flapGeo = new THREE.BoxGeometry(1.3, 0.9, 0.05);
    const rearFlap = new THREE.Mesh(flapGeo, this.canvasMaterial);
    rearFlap.position.set(0, 1.15, 1.08);
    this.group.add(rearFlap);

    // Interior Seats
    // Driver seat
    const driverSeatGeo = new THREE.BoxGeometry(0.55, 0.16, 0.45);
    const driverSeat = new THREE.Mesh(driverSeatGeo, seatMat);
    driverSeat.position.set(0, 0.68, -0.3);
    this.group.add(driverSeat);

    // Passenger bench in rear
    const passSeatGeo = new THREE.BoxGeometry(1.22, 0.2, 0.55);
    const passSeat = new THREE.Mesh(passSeatGeo, seatMat);
    passSeat.position.set(0, 0.72, 0.65);
    this.group.add(passSeat);

    const passBackGeo = new THREE.BoxGeometry(1.22, 0.5, 0.1);
    const passBack = new THREE.Mesh(passBackGeo, seatMat);
    passBack.position.set(0, 1.0, 0.95);
    this.group.add(passBack);

    // Passenger Mount anchor point
    this.passengerMount = new THREE.Group();
    this.passengerMount.position.set(0, 0.82, 0.65);
    this.group.add(this.passengerMount);

    // Steering Column & Handlebars
    const handleColGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5);
    const handleCol = new THREE.Mesh(handleColGeo, chromeMat);
    handleCol.position.set(0, 0.8, -0.65);
    handleCol.rotation.x = -0.3;
    this.group.add(handleCol);

    const handleBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.58);
    const handleBar = new THREE.Mesh(handleBarGeo, rubberMat);
    handleBar.position.set(0, 0.95, -0.72);
    handleBar.rotation.z = Math.PI / 2;
    this.group.add(handleBar);

    // Grab rails / open doorway borders
    const grabRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7);
    const leftRail = new THREE.Mesh(grabRailGeo, chromeMat);
    leftRail.position.set(-0.68, 1.0, 0.25);
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(grabRailGeo, chromeMat);
    rightRail.position.set(0.68, 1.0, 0.25);
    this.group.add(rightRail);

    // 2. Headlight & Indicators
    const headlampGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16);
    this.headlightMesh = new THREE.Mesh(headlampGeo, yellowLightMat);
    this.headlightMesh.position.set(0, 0.65, -1.35);
    this.headlightMesh.rotation.x = Math.PI / 2;
    this.group.add(this.headlightMesh);

    // Chrome Bezel around headlight
    const bezelGeo = new THREE.TorusGeometry(0.14, 0.025, 8, 16);
    const bezel = new THREE.Mesh(bezelGeo, chromeMat);
    bezel.position.set(0, 0.65, -1.41);
    this.group.add(bezel);

    // Turn Indicators
    const leftAmber = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), amberLightMat);
    leftAmber.position.set(-0.45, 0.65, -1.25);
    this.group.add(leftAmber);

    const rightAmber = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), amberLightMat);
    rightAmber.position.set(0.45, 0.65, -1.25);
    this.group.add(rightAmber);

    // Headlight SpotLight
    this.headlightLight = new THREE.SpotLight(0xfff5cc, 2.5, 28, Math.PI / 5, 0.4, 1.2);
    this.headlightLight.position.set(0, 0.65, -1.35);
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.1, -12);
    this.group.add(this.headlightLight);
    this.group.add(this.headlightTarget);
    this.headlightLight.target = this.headlightTarget;

    // 3. Wheels & Suspensions
    // Front Wheel Assembly (Turns with steering!)
    this.frontForkGroup = new THREE.Group();
    this.frontForkGroup.position.set(0, 0.24, -1.2);

    const forkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45);
    const forkLeft = new THREE.Mesh(forkGeo, chromeMat);
    forkLeft.position.set(-0.1, 0.1, 0);
    this.frontForkGroup.add(forkLeft);
    const forkRight = new THREE.Mesh(forkGeo, chromeMat);
    forkRight.position.set(0.1, 0.1, 0);
    this.frontForkGroup.add(forkRight);

    // Front Mudguard
    const mudguardGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10, 1, false, 0, Math.PI);
    const mudguard = new THREE.Mesh(mudguardGeo, this.bodyMaterial);
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.08, 0);
    this.frontForkGroup.add(mudguard);

    // Front Wheel
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 16);
    this.frontWheel = new THREE.Mesh(wheelGeo, rubberMat);
    this.frontWheel.rotation.z = Math.PI / 2;
    this.frontWheel.castShadow = true;
    this.frontForkGroup.add(this.frontWheel);

    const hubcapGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
    const hubcap = new THREE.Mesh(hubcapGeo, chromeMat);
    hubcap.rotation.z = Math.PI / 2;
    this.frontForkGroup.add(hubcap);

    this.group.add(this.frontForkGroup);

    // Rear Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16);
    this.rearLeftWheel = new THREE.Mesh(rearWheelGeo, rubberMat);
    this.rearLeftWheel.position.set(-0.68, 0.26, 0.65);
    this.rearLeftWheel.rotation.z = Math.PI / 2;
    this.rearLeftWheel.castShadow = true;
    this.group.add(this.rearLeftWheel);

    this.rearRightWheel = new THREE.Mesh(rearWheelGeo, rubberMat);
    this.rearRightWheel.position.set(0.68, 0.26, 0.65);
    this.rearRightWheel.rotation.z = Math.PI / 2;
    this.rearRightWheel.castShadow = true;
    this.group.add(this.rearRightWheel);

    // Rear Mudguards
    const rearMudguardGeo = new THREE.BoxGeometry(0.24, 0.18, 0.58);
    const leftArch = new THREE.Mesh(rearMudguardGeo, this.bodyMaterial);
    leftArch.position.set(-0.68, 0.38, 0.65);
    this.group.add(leftArch);

    const rightArch = new THREE.Mesh(rearMudguardGeo, this.bodyMaterial);
    rightArch.position.set(0.68, 0.38, 0.65);
    this.group.add(rightArch);

    // Exhaust Pipe with Chrome Finish
    const exhaustGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust.position.set(-0.45, 0.18, 1.15);
    exhaust.rotation.x = Math.PI / 2;
    this.group.add(exhaust);

    // Soft Radial Contact Shadow Grounding
    const shadowGeo = new THREE.PlaneGeometry(2.0, 3.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.set(0, 0.02, 0);
    this.group.add(this.contactShadow);
  }

  public setPaintJob(primaryHex: string, hoodHex: string) {
    this.bodyMaterial.color.set(primaryHex);
    this.hoodMaterial.color.set(hoodHex);
  }

  public setPassengerVisible(visible: boolean, passengerType: string = 'commuter') {
    if (visible && !this.passengerMesh) {
      // Build charming low-poly passenger figure sitting in back
      const passGroup = new THREE.Group();

      // Shirt / Kurta
      const shirtColors = [0x3b82f6, 0xec4899, 0xf59e0b, 0x10b981];
      const shirtMat = new THREE.MeshStandardMaterial({
        color: shirtColors[Math.floor(Math.random() * shirtColors.length)],
        roughness: 0.7,
      });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), shirtMat);
      torso.position.set(0, 0.22, 0);
      passGroup.add(torso);

      // Head
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x935f3d, roughness: 0.6 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMat);
      head.position.set(0, 0.52, 0);
      passGroup.add(head);

      // Monsoon Umbrella tucked beside passenger!
      const umbrellaGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
      const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
      const umbrella = new THREE.Mesh(umbrellaGeo, umbrellaMat);
      umbrella.position.set(0.28, 0.25, 0.05);
      umbrella.rotation.z = -0.2;
      passGroup.add(umbrella);

      this.passengerMesh = passGroup;
      this.passengerMount.add(passGroup);
    } else if (!visible && this.passengerMesh) {
      this.passengerMount.remove(this.passengerMesh);
      this.passengerMesh = null;
    }
  }

  public updateAnimation(dt: number, speed: number, steerAngle: number) {
    // Steer front wheel fork
    this.frontForkGroup.rotation.y = THREE.MathUtils.damp(
      this.frontForkGroup.rotation.y,
      -steerAngle,
      12,
      dt
    );

    // Rotate wheels proportional to linear speed
    const wheelRotDelta = (speed * dt) / 0.24;
    this.frontWheel.rotation.x += wheelRotDelta;
    this.rearLeftWheel.rotation.x += wheelRotDelta;
    this.rearRightWheel.rotation.x += wheelRotDelta;

    // Body roll / tilt when cornering (rickshaws lean slightly outward)
    const targetRoll = (steerAngle * speed) * 0.015;
    this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, targetRoll, 8, dt);

    // Windshield wiper wipe cycle (monsoon rain active)
    const wiperTime = Date.now() * 0.007;
    this.wiperGroup.rotation.z = Math.sin(wiperTime) * 0.75;
  }
}
