import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeliveryReward,
  handleVehicleCollision,
  calculateGripFactor,
  calculatePetrolBonus,
  isInsideRadius,
  BASE_VEHICLE_STATS,
} from './rules.ts';

test('calculateDeliveryReward grants base points plus speed bonus and extra seconds', () => {
  const resultFast = calculateDeliveryReward(200, 8, 16);
  assert.equal(resultFast.bonusSeconds, 20);
  assert.ok(resultFast.points >= 200, 'Fast delivery should grant bonus points');

  const resultSlow = calculateDeliveryReward(200, 25, 10);
  assert.equal(resultSlow.points, 200, 'Base reward retained when slower');
  assert.equal(resultSlow.bonusSeconds, 20);
});

test('handleVehicleCollision applies 5-second penalty and enforces cooldown', () => {
  const initialTime = 60;
  const t0 = 10000;

  // First collision
  const res1 = handleVehicleCollision(initialTime, t0, 0, 2000);
  assert.equal(res1.hasPenalty, true);
  assert.equal(res1.newTime, 55);
  assert.equal(res1.penaltySeconds, 5);
  assert.equal(res1.cooldownUntil, 12000);

  // Subsequent hit within cooldown window (1.5s later)
  const res2 = handleVehicleCollision(res1.newTime, t0 + 1500, t0, 2000);
  assert.equal(res2.hasPenalty, false);
  assert.equal(res2.newTime, 55, 'Time should not decrease again during cooldown');

  // Hit after cooldown expires (2.1s later)
  const res3 = handleVehicleCollision(res1.newTime, t0 + 2100, t0, 2000);
  assert.equal(res3.hasPenalty, true);
  assert.equal(res3.newTime, 50, 'Penalty reapplied after cooldown');
});

test('calculateGripFactor reduces grip in puddles and respects tire upgrade bonus', () => {
  const normalGrip = calculateGripFactor(false, BASE_VEHICLE_STATS.grip, 0);
  assert.equal(normalGrip, 0.88);

  const puddleGripStock = calculateGripFactor(true, BASE_VEHICLE_STATS.grip, 0);
  assert.ok(puddleGripStock < normalGrip, 'Puddles should reduce traction');

  const puddleGripUpgraded = calculateGripFactor(true, BASE_VEHICLE_STATS.grip, 0.3);
  assert.ok(
    puddleGripUpgraded > puddleGripStock,
    'Upgraded tires should maintain higher traction in puddles'
  );
});

test('calculatePetrolBonus only allows refueling after cooldown interval', () => {
  const t0 = 100000;
  const bonus1 = calculatePetrolBonus(500, 45, 0, t0);
  assert.equal(bonus1.allowed, true);
  assert.equal(bonus1.timeBonus, 10);
  assert.equal(bonus1.pointsBonus, 120);

  const bonus2 = calculatePetrolBonus(620, 55, t0, t0 + 15000);
  assert.equal(bonus2.allowed, false, 'Should be throttled within 30s');
});

test('isInsideRadius accurately detects coordinate bounds', () => {
  assert.equal(isInsideRadius(10, 10, 10, 10, 3), true);
  assert.equal(isInsideRadius(12, 10, 10, 10, 3), true);
  assert.equal(isInsideRadius(20, 20, 0, 0, 5), false);
});
