export interface GameScoreState {
  score: number;
  deliveries: number;
  timeRemaining: number;
  combo: number;
}

export interface PassengerMission {
  id: string;
  passengerName: string;
  passengerRole: string;
  avatarIcon: string;
  pickupLocationName: string;
  dropLocationName: string;
  pickupPos: { x: number; z: number };
  dropPos: { x: number; z: number };
  baseReward: number;
  timeBonus: number;
  isPickedUp: boolean;
}

export interface CollisionResult {
  hasPenalty: boolean;
  newTime: number;
  penaltySeconds: number;
  cooldownUntil: number;
}

export interface VehicleStats {
  maxSpeed: number;
  acceleration: number;
  braking: number;
  turnSpeed: number;
  grip: number;
}

export const BASE_VEHICLE_STATS: VehicleStats = {
  maxSpeed: 28, // km/h units in game space
  acceleration: 22,
  braking: 35,
  turnSpeed: 2.8,
  grip: 0.88,
};

export const UPGRADE_TIERS = {
  engine: [
    { level: 1, name: "Stock 175cc 2-Stroke", speedBoost: 0, cost: 0 },
    { level: 2, name: "Tuned Carburetor", speedBoost: 4, cost: 300 },
    { level: 3, name: "Turbo Nitro Chai Kit", speedBoost: 9, cost: 700 },
  ],
  tires: [
    { level: 1, name: "City Slicks", gripBonus: 0, cost: 0 },
    { level: 2, name: "Monsoon Deep Treads", gripBonus: 0.15, cost: 250 },
    { level: 3, name: "All-Weather Hydro-Grip", gripBonus: 0.3, cost: 600 },
  ],
  paintJobs: [
    { id: "classic", name: "Mumbai Classic (Green & Yellow)", primary: "#15803d", hood: "#eab308" },
    { id: "ocean", name: "Marine Drive Teal", primary: "#0f766e", hood: "#38bdf8" },
    { id: "maroon", name: "Bandra Sunset Maroon", primary: "#831843", hood: "#f59e0b" },
    { id: "golden", name: "Dadar Gold Star", primary: "#b45309", hood: "#fef08a" },
  ],
};

/**
 * Calculates delivery bonus points based on remaining mission time and distance
 */
export function calculateDeliveryReward(
  baseReward: number,
  timeTaken: number,
  expectedTime: number
): { points: number; bonusSeconds: number; comboBoost: number } {
  // Speed bonus if completed faster than expected
  const speedRatio = Math.max(0.5, Math.min(2.0, expectedTime / Math.max(timeTaken, 4)));
  const speedBonus = Math.round((speedRatio - 1) * 80);
  const points = Math.max(100, baseReward + Math.max(0, speedBonus));
  const bonusSeconds = 20;
  const comboBoost = 1;
  return { points, bonusSeconds, comboBoost };
}

/**
 * Computes collision penalty with a cooldown grace period
 */
export function handleVehicleCollision(
  currentTimeRemaining: number,
  nowTimestamp: number,
  lastCollisionTimestamp: number,
  cooldownDurationMs: number = 2000
): CollisionResult {
  if (nowTimestamp - lastCollisionTimestamp < cooldownDurationMs) {
    return {
      hasPenalty: false,
      newTime: currentTimeRemaining,
      penaltySeconds: 0,
      cooldownUntil: lastCollisionTimestamp + cooldownDurationMs,
    };
  }

  const penaltySeconds = 5;
  const newTime = Math.max(0, currentTimeRemaining - penaltySeconds);
  return {
    hasPenalty: true,
    newTime,
    penaltySeconds,
    cooldownUntil: nowTimestamp + cooldownDurationMs,
  };
}

/**
 * Calculates effective road friction when over puddles
 */
export function calculateGripFactor(
  isInPuddle: boolean,
  baseGrip: number,
  tireGripBonus: number
): number {
  const totalGrip = Math.min(1.0, baseGrip + tireGripBonus);
  if (!isInPuddle) {
    return totalGrip;
  }
  // Puddle reduces grip by 45%, but tire bonus counteracts it
  const puddleReduction = 0.45 * (1 - tireGripBonus * 0.8);
  return Math.max(0.2, totalGrip - puddleReduction);
}

/**
 * Calculates fuel/repair bonus at the petrol pump
 */
export function calculatePetrolBonus(
  currentScore: number,
  currentTime: number,
  lastVisitTime: number,
  nowTimestamp: number
): { pointsBonus: number; timeBonus: number; allowed: boolean } {
  // Can only refuel once every 30 seconds
  if (nowTimestamp - lastVisitTime < 30000) {
    return { pointsBonus: 0, timeBonus: 0, allowed: false };
  }
  return { pointsBonus: 120, timeBonus: 10, allowed: true };
}

/**
 * Check if player coordinate is within radius of target
 */
export function isInsideRadius(
  px: number,
  pz: number,
  tx: number,
  tz: number,
  radius: number
): boolean {
  const dx = px - tx;
  const dz = pz - tz;
  return dx * dx + dz * dz <= radius * radius;
}
