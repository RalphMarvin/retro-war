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

export interface WeaponStats {
  fireRate: number; // rounds per second (~10)
  damage: number;
  spread: number; // radians
  bulletSpeed: number;
  magazineCapacity: number;
  reloadTimeMs: number;
}

export interface AmmoState {
  currentMag: number;
  reserve: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
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
