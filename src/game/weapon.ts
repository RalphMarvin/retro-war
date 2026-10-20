/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundSynth } from './audio';
import { BulletPool } from './bullets';
import { ParticlePool } from './particles';
import { WeaponConfig, WeaponId } from './types';

/**
 * Tactical loadout definitions.
 * The rifle is a sustained-fire automatic; the sidearm is a hard-hitting semi-auto
 * that only cycles one round per trigger pull (no rapid fire).
 */
export const WEAPON_CONFIGS: Record<WeaponId, WeaponConfig> = {
  rifle: {
    id: 'rifle',
    name: 'M4A1 Tactical Carbine',
    shortName: 'M4A1',
    fireMode: 'auto',
    fireInterval: 0.1, // 10 rounds/sec sustained
    damage: 38,
    bulletSpeed: 22,
    baseSpread: 0.045,
    maxSpread: 0.12,
    spreadGain: 0.018,
    magCapacity: 30,
    startingReserve: 180,
    maxReserve: 360,
    ammoPickupAmount: 60,
    reloadDuration: 1.8,
    recoilKick: 8.5,
    bodyJolt: 4.5,
    screenShake: 2.2,
    muzzleForward: 38,
    muzzleSide: 8,
    gripOffset: { x: 14, y: 8 },
  },
  pistol: {
    id: 'pistol',
    name: 'MK23 Combat Sidearm',
    shortName: 'MK23',
    fireMode: 'semi',
    fireInterval: 0.16, // mechanical cycle limit between trigger pulls
    damage: 56,
    bulletSpeed: 25,
    baseSpread: 0.018,
    maxSpread: 0.07,
    spreadGain: 0.03,
    magCapacity: 12,
    startingReserve: 96,
    maxReserve: 180,
    ammoPickupAmount: 36,
    reloadDuration: 1.15,
    recoilKick: 6,
    bodyJolt: 3.2,
    screenShake: 1.6,
    muzzleForward: 24,
    muzzleSide: 6,
    gripOffset: { x: 16, y: 9 },
  },
};

export class Weapon {
  public readonly config: WeaponConfig;
  public readonly id: WeaponId;
  public name: string;
  public fireInterval: number;
  public fireCooldown: number = 0;
  public damage: number;
  public bulletSpeed: number;
  public baseSpread: number;
  public currentSpread: number;
  public maxSpread: number;

  // Magazine & Ammo state (persisted per weapon across swaps)
  public magCapacity: number;
  public currentMag: number;
  public reserveAmmo: number;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public reloadDuration: number;

  // Lifetime round counter — survives weapon switching
  public shotsFired: number = 0;

  // Recoil mechanics
  public recoilOffset: number = 0; // backward kick in pixels
  public maxRecoilKick: number;
  public recoilAngle: number = 0; // slight muzzle climb
  public bodyJolt: number = 0; // passed to player body

  // Semi-auto trigger discipline — must release before the next round
  private triggerLatched: boolean = false;

  // Sound reload stages flags
  private reloadStage1: boolean = false;
  private reloadStage2: boolean = false;
  private reloadStage3: boolean = false;

  constructor(id: WeaponId = 'rifle') {
    const config = WEAPON_CONFIGS[id];
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.fireInterval = config.fireInterval;
    this.damage = config.damage;
    this.bulletSpeed = config.bulletSpeed;
    this.baseSpread = config.baseSpread;
    this.currentSpread = config.baseSpread;
    this.maxSpread = config.maxSpread;
    this.magCapacity = config.magCapacity;
    this.currentMag = config.magCapacity;
    this.reserveAmmo = config.startingReserve;
    this.reloadDuration = config.reloadDuration;
    this.maxRecoilKick = config.recoilKick;
  }

  public get fireMode() {
    return this.config.fireMode;
  }

  public get shortName() {
    return this.config.shortName;
  }

  public update(dt: number) {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    // Recover recoil smoothly
    this.recoilOffset = Math.max(0, this.recoilOffset - dt * 45);
    this.recoilAngle = Math.max(0, this.recoilAngle - dt * 25);
    this.bodyJolt = Math.max(0, this.bodyJolt - dt * 35);

    // Spread recovery
    if (this.currentSpread > this.baseSpread) {
      this.currentSpread = Math.max(this.baseSpread, this.currentSpread - dt * 0.15);
    }

    // Handle reload progression
    if (this.isReloading) {
      this.reloadTimer += dt;
      const progress = this.reloadTimer / this.reloadDuration;

      // Audio stage cues
      if (progress > 0.15 && !this.reloadStage1) {
        this.reloadStage1 = true;
        soundSynth.playReloadStage('eject');
      }
      if (progress > 0.55 && !this.reloadStage2) {
        this.reloadStage2 = true;
        soundSynth.playReloadStage('insert');
      }
      if (progress > 0.85 && !this.reloadStage3) {
        this.reloadStage3 = true;
        soundSynth.playReloadStage('cock');
      }

      if (this.reloadTimer >= this.reloadDuration) {
        this.completeReload();
      }
    }
  }

  /** Called when the fire input is fully released (resets the semi-auto trigger latch) */
  public releaseTrigger() {
    this.triggerLatched = false;
  }

  public startReload(): boolean {
    if (this.isReloading || this.currentMag === this.magCapacity || this.reserveAmmo <= 0) {
      return false;
    }
    this.isReloading = true;
    this.reloadTimer = 0;
    this.reloadStage1 = false;
    this.reloadStage2 = false;
    this.reloadStage3 = false;
    return true;
  }

  public cancelReload() {
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  private completeReload() {
    const needed = this.magCapacity - this.currentMag;
    const toLoad = Math.min(needed, this.reserveAmmo);
    this.currentMag += toLoad;
    this.reserveAmmo -= toLoad;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public addAmmo(amount: number) {
    this.reserveAmmo = Math.min(this.config.maxReserve, this.reserveAmmo + amount);
  }

  public canShoot(): boolean {
    return !this.isReloading && this.currentMag > 0 && this.fireCooldown <= 0;
  }

  public reset() {
    this.currentMag = this.config.magCapacity;
    this.reserveAmmo = this.config.startingReserve;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.currentSpread = this.baseSpread;
    this.recoilOffset = 0;
    this.recoilAngle = 0;
    this.bodyJolt = 0;
    this.shotsFired = 0;
    this.triggerLatched = false;
  }

  public shoot(
    playerX: number,
    playerY: number,
    aimAngle: number,
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    onScreenShake: (intensity: number) => void,
    triggerEdge: boolean = true
  ): boolean {
    if (this.isReloading) {
      return false;
    }

    // Semi-automatic discipline: one round per discrete trigger pull
    if (this.fireMode === 'semi') {
      if (this.triggerLatched && !triggerEdge) {
        return false;
      }
      if (triggerEdge) {
        this.triggerLatched = false;
      }
    }

    if (this.currentMag <= 0) {
      if (this.fireCooldown <= 0) {
        soundSynth.playDryFire();
        this.fireCooldown = 0.25;
        this.startReload();
      }
      return false;
    }

    if (this.fireCooldown > 0) {
      return false;
    }

    // Spend bullet
    this.currentMag--;
    this.shotsFired++;
    this.fireCooldown = this.fireInterval;
    if (this.fireMode === 'semi') {
      this.triggerLatched = true;
    }

    // Apply recoil
    this.recoilOffset = this.maxRecoilKick;
    this.recoilAngle = (Math.random() - 0.5) * (this.id === 'pistol' ? 0.06 : 0.04);
    this.bodyJolt = this.config.bodyJolt;
    this.currentSpread = Math.min(this.maxSpread, this.currentSpread + this.config.spreadGain);

    // Muzzle tip world coordinates
    const sideOffset = this.config.muzzleSide;
    const forwardOffset = this.config.muzzleForward - this.recoilOffset;
    const cos = Math.cos(aimAngle);
    const sin = Math.sin(aimAngle);
    const perpCos = Math.cos(aimAngle + Math.PI / 2);
    const perpSin = Math.sin(aimAngle + Math.PI / 2);

    const muzzleX = playerX + cos * forwardOffset + perpCos * sideOffset;
    const muzzleY = playerY + sin * forwardOffset + perpSin * sideOffset;

    // Ejection port position for brass casing
    const portDrop = this.id === 'pistol' ? 10 : 16;
    const portX = playerX + cos * (forwardOffset - portDrop) + perpCos * (sideOffset + 4);
    const portY = playerY + sin * (forwardOffset - portDrop) + perpSin * (sideOffset + 4);

    // Spread angle
    const shotAngle = aimAngle + (Math.random() - 0.5) * this.currentSpread;

    // Spawn bullet tracer
    bulletPool.spawn(muzzleX, muzzleY, shotAngle, this.bulletSpeed, this.damage, 'player');

    // Muzzle starburst flash
    particlePool.emitMuzzleFlash(muzzleX, muzzleY, shotAngle);

    // Eject spinning brass shell
    particlePool.emitShell(portX, portY, aimAngle);

    // Gunshot audio tuned per weapon
    soundSynth.playGunshot(this.id);

    // Subtle screen shake
    onScreenShake(this.config.screenShake);

    // Auto-reload on empty if reserve available
    if (this.currentMag === 0 && this.reserveAmmo > 0) {
      setTimeout(() => this.startReload(), 120);
    }

    return true;
  }

  /**
   * Procedural drawing of the weapon in local coordinate space:
   * Origin (0,0) is the mount point near shoulder/hands, pointing along +X
   */
  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Apply recoil displacement and reload tilt
    const currentRecoil = this.recoilOffset;
    const reloadTilt = this.isReloading
      ? Math.sin((this.reloadTimer / this.reloadDuration) * Math.PI) * 0.28
      : 0;

    ctx.translate(-currentRecoil, 0);
    ctx.rotate(this.recoilAngle + reloadTilt);

    if (this.id === 'pistol') {
      this.drawPistol(ctx);
    } else {
      this.drawRifle(ctx);
    }

    ctx.restore(); // restore transform
  }

  /**
   * Compact top-down combat sidearm: slide, polymer frame, rail, tritium sights.
   */
  private drawPistol(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 2.5;

    // 1. Polymer frame / grip angled back from the trigger guard
    const gripGrad = ctx.createLinearGradient(-5, 1, -1, 10);
    gripGrad.addColorStop(0, '#20252b');
    gripGrad.addColorStop(1, '#101317');
    ctx.fillStyle = gripGrad;
    ctx.beginPath();
    ctx.moveTo(-3.5, 1.5);
    ctx.lineTo(1.5, 1.5);
    ctx.lineTo(0, 10.5);
    ctx.lineTo(-5.5, 9.5);
    ctx.closePath();
    ctx.fill();

    // Stippled grip texture
    ctx.fillStyle = '#2f3741';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-4 - i * 0.35, 3.4 + i * 1.7, 4.2, 0.8);
    }

    // Magazine baseplate
    ctx.fillStyle = '#394250';
    ctx.fillRect(-5.6, 9.2, 5.8, 1.6);

    // 2. Trigger guard
    ctx.strokeStyle = '#191d22';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(3, 3.6, 3.2, Math.PI * 0.1, Math.PI * 0.95);
    ctx.stroke();

    // Trigger blade
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(2.4, 1.6, 1.2, 2.6);

    // 3. Slide (main upper body)
    const slideGrad = ctx.createLinearGradient(-5, -3.4, 20, 2.4);
    slideGrad.addColorStop(0, '#2a3039');
    slideGrad.addColorStop(0.45, '#48515e');
    slideGrad.addColorStop(1, '#1d222a');
    ctx.fillStyle = slideGrad;
    ctx.beginPath();
    ctx.roundRect(-5.5, -3.4, 25, 5.6, 1.2);
    ctx.fill();

    // Slide serrations at the rear
    ctx.fillStyle = '#141820';
    for (let x = -4.5; x <= 0.5; x += 1.6) {
      ctx.fillRect(x, -3.2, 0.9, 5.2);
    }

    // Ejection port with brass glint
    ctx.fillStyle = '#0f1216';
    ctx.fillRect(5.5, -3.4, 5.5, 2);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(6.6, -2.9, 3, 1.1);

    // 4. Barrel crown / muzzle
    ctx.fillStyle = '#5b6673';
    ctx.fillRect(19.5, -2.2, 3.2, 3.2);
    ctx.fillStyle = '#0c0f13';
    ctx.beginPath();
    ctx.arc(22.4, -0.6, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // 5. Accessory rail under the dust cover
    ctx.fillStyle = '#232a33';
    ctx.fillRect(10, 2.1, 9, 1.8);
    ctx.fillStyle = '#121519';
    for (let x = 11; x <= 17.5; x += 2.2) {
      ctx.fillRect(x, 2.1, 0.9, 1.8);
    }

    // 6. Tritium night sights
    ctx.fillStyle = '#0d1014';
    ctx.fillRect(-3.5, -5.2, 2.6, 2);
    ctx.fillRect(16.5, -5, 2, 1.8);

    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(-2.2, -4.2, 0.7, 0, Math.PI * 2);
    ctx.arc(17.5, -4.1, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Full-size tactical assault carbine.
   */
  private drawRifle(ctx: CanvasRenderingContext2D) {
    // 1. Rifle Drop Shadow onto operative body / ground
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    // 2. Tactical Crane Stock (collapsible stock with cheek rest)
    const stockGrad = ctx.createLinearGradient(-18, -4, -4, 4);
    stockGrad.addColorStop(0, '#15181c');
    stockGrad.addColorStop(0.5, '#282f38');
    stockGrad.addColorStop(1, '#1b1e22');
    ctx.fillStyle = stockGrad;

    ctx.beginPath();
    ctx.moveTo(-18, -3.5);
    ctx.lineTo(-7, -2.5);
    ctx.lineTo(-7, 3);
    ctx.lineTo(-14, 4.5);
    ctx.lineTo(-18, 3.5);
    ctx.closePath();
    ctx.fill();

    // Stock buttpad rubber ridges
    ctx.fillStyle = '#0d0f12';
    for (let i = -3; i <= 3; i += 2) {
      ctx.fillRect(-18.5, i - 0.5, 1.5, 1.2);
    }

    // Buffer tube connector
    ctx.fillStyle = '#3a424d';
    ctx.fillRect(-7, -1.6, 5, 3.2);

    // 3. Lower & Upper Receiver (Gunmetal and matte black alloy)
    const recGrad = ctx.createLinearGradient(-2, -5, 14, 5);
    recGrad.addColorStop(0, '#242a33');
    recGrad.addColorStop(0.5, '#3b434f');
    recGrad.addColorStop(1, '#1d2229');
    ctx.fillStyle = recGrad;

    ctx.beginPath();
    ctx.moveTo(-2, -3.8);
    ctx.lineTo(13, -3.8);
    ctx.lineTo(13, 3.2);
    ctx.lineTo(6, 3.6);
    ctx.lineTo(-2, 3.2);
    ctx.closePath();
    ctx.fill();

    // Ejection port dust cover & brass chamber detail
    ctx.fillStyle = '#111417';
    ctx.fillRect(1, -3.8, 6.5, 2.2);
    ctx.fillStyle = '#d4af37'; // golden brass glimpsed inside
    ctx.fillRect(2.5, -3.2, 3.5, 1.2);

    // 4. Curved STANAG 30-round assault magazine
    const magGrad = ctx.createLinearGradient(4, 2, 9, 13);
    magGrad.addColorStop(0, '#1f252c');
    magGrad.addColorStop(0.6, '#313a45');
    magGrad.addColorStop(1, '#15191e');
    ctx.fillStyle = magGrad;

    ctx.beginPath();
    // Curved banana mag profile
    ctx.moveTo(3.8, 2.8);
    ctx.lineTo(8.2, 2.8);
    ctx.quadraticCurveTo(11.5, 8.5, 12.8, 13.5);
    ctx.lineTo(8.2, 14.2);
    ctx.quadraticCurveTo(7.0, 9.2, 3.8, 2.8);
    ctx.closePath();
    ctx.fill();

    // Stamped magazine reinforcement ribs
    ctx.strokeStyle = '#121518';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6.5, 5.5);
    ctx.lineTo(9.5, 6.5);
    ctx.moveTo(7.5, 8.5);
    ctx.lineTo(10.5, 9.5);
    ctx.moveTo(8.5, 11.5);
    ctx.lineTo(11.5, 12.2);
    ctx.stroke();

    // Pistol grip
    const gripGrad = ctx.createLinearGradient(-3, 2, -1, 9);
    gripGrad.addColorStop(0, '#181b1f');
    gripGrad.addColorStop(1, '#2a313b');
    ctx.fillStyle = gripGrad;
    ctx.beginPath();
    ctx.moveTo(-2, 2.5);
    ctx.lineTo(1.5, 2.5);
    ctx.lineTo(-0.5, 8.5);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();

    // 5. Tactical Quad-Rail Handguard
    const hgGrad = ctx.createLinearGradient(13, -3.5, 29, 3.5);
    hgGrad.addColorStop(0, '#2b323d');
    hgGrad.addColorStop(0.5, '#424c5a');
    hgGrad.addColorStop(1, '#262d37');
    ctx.fillStyle = hgGrad;

    ctx.beginPath();
    ctx.roundRect(13, -3.4, 15, 6.8, 1);
    ctx.fill();

    // Picatinny rail texture slots
    ctx.fillStyle = '#171a1f';
    for (let x = 14; x <= 26; x += 2.5) {
      ctx.fillRect(x, -3.4, 1.2, 6.8);
    }

    // 6. Barrel & Flash Hider
    const barrelGrad = ctx.createLinearGradient(28, -1.8, 40, 1.8);
    barrelGrad.addColorStop(0, '#4f5966');
    barrelGrad.addColorStop(0.5, '#7a8594');
    barrelGrad.addColorStop(1, '#373e47');
    ctx.fillStyle = barrelGrad;

    // Fluted barrel segment
    ctx.fillRect(28, -1.6, 9, 3.2);

    // Birdcage flash hider with muzzle ports
    ctx.fillStyle = '#1f242b';
    ctx.beginPath();
    ctx.moveTo(37, -2.4);
    ctx.lineTo(41, -2.0);
    ctx.lineTo(41, 2.0);
    ctx.lineTo(37, 2.4);
    ctx.closePath();
    ctx.fill();

    // Muzzle slots
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(38, -2.2, 1.5, 4.4);

    // 7. Tactical Holographic Optic / Red Dot Sight
    ctx.fillStyle = '#14181c';
    ctx.beginPath();
    ctx.roundRect(3, -7.5, 9, 3.8, 1);
    ctx.fill();

    // Optic glass lens reflection
    const lensGrad = ctx.createLinearGradient(4, -7.2, 11, -4.2);
    lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    lensGrad.addColorStop(1, 'rgba(14, 116, 144, 0.2)');
    ctx.fillStyle = lensGrad;
    ctx.fillRect(4, -6.8, 7, 2.5);

    // Glowing illuminated red reticle dot
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(7.5, -5.5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // remove shadow
  }
}


