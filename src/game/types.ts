/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2 {
  x: number;
  y: number;
}

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type EnemyType = 'drone' | 'mech';

export type WeaponId = 'rifle' | 'pistol';

export type FireMode = 'auto' | 'semi';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  shortName: string;
  fireMode: FireMode;
  fireInterval: number; // seconds between rounds
  damage: number;
  bulletSpeed: number;
  baseSpread: number;
  maxSpread: number;
  spreadGain: number;
  magCapacity: number;
  startingReserve: number;
  maxReserve: number;
  ammoPickupAmount: number;
  reloadDuration: number;
  recoilKick: number;
  bodyJolt: number;
  screenShake: number;
  muzzleForward: number;
  muzzleSide: number;
  gripOffset: { x: number; y: number };
}

export interface WeaponStats {
  fireRate: number; // rounds per second (~10)
  damage: number;
  spread: number; // radians
  bulletSpeed: number;
  magazineCapacity: number;
  reloadTimeMs: number;
}

export interface WeaponAmmo {
  currentMag: number;
  magCapacity: number;
  reserve: number;
}

export interface AmmoState {
  weaponId: WeaponId;
  weaponName: string;
  weaponShortName: string;
  fireMode: FireMode;
  currentMag: number;
  magCapacity: number;
  reserve: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  isSwapping: boolean;
  loadout: Record<WeaponId, WeaponAmmo>;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  score: number;
  kills: number;
  dronesDestroyed: number;
  mechsDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  wave: number;
  survivalTimeSec: number;
}

export interface PickupItem {
  id: number;
  type: 'ammo' | 'health';
  x: number;
  y: number;
  radius: number;
  life: number;
  pulseTimer: number;
}
