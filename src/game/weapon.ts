/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundSynth } from './audio';
import { BulletPool } from './bullets';
import { ParticlePool } from './particles';

export class Weapon {
  public name: string = 'M4A1 Tactical Carbine';
  public fireRate: number = 10; // rounds/sec (0.10s interval)
  public fireInterval: number = 0.10;
  public fireCooldown: number = 0;
  public damage: number = 38;
  public bulletSpeed: number = 22;
  public baseSpread: number = 0.045; // slight tactical spread
  public currentSpread: number = 0.045;
  public maxSpread: number = 0.12;

  // Magazine & Ammo state
  public magCapacity: number = 30;
  public currentMag: number = 30;
  public reserveAmmo: number = 180;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public reloadDuration: number = 1.8; // seconds

  // Recoil mechanics
  public recoilOffset: number = 0; // backward kick in pixels
  public maxRecoilKick: number = 8.5;
  public recoilAngle: number = 0; // slight muzzle climb
  public bodyJolt: number = 0; // passed to player body

  // Sound reload stages flags
  private reloadStage1: boolean = false;
  private reloadStage2: boolean = false;
  private reloadStage3: boolean = false;

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

  private completeReload() {
    const needed = this.magCapacity - this.currentMag;
    const toLoad = Math.min(needed, this.reserveAmmo);
    this.currentMag += toLoad;
    this.reserveAmmo -= toLoad;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public addAmmo(amount: number) {
    this.reserveAmmo = Math.min(360, this.reserveAmmo + amount);
  }

  public canShoot(): boolean {
    return !this.isReloading && this.currentMag > 0 && this.fireCooldown <= 0;
  }

  public shoot(
    playerX: number,
    playerY: number,
    aimAngle: number,
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    onScreenShake: (intensity: number) => void
  ): boolean {
    if (this.isReloading) {
      return false;
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
    this.fireCooldown = this.fireInterval;

    // Apply recoil
    this.recoilOffset = this.maxRecoilKick;
    this.recoilAngle = (Math.random() - 0.5) * 0.04;
    this.bodyJolt = 4.5;
    this.currentSpread = Math.min(this.maxSpread, this.currentSpread + 0.018);

    // Muzzle tip world coordinates (scaled by 0.70 to align with 30% downscaled soldier)
    const sideOffset = 8 * 0.70;
    const forwardOffset = (38 - this.recoilOffset) * 0.70;
    const cos = Math.cos(aimAngle);
    const sin = Math.sin(aimAngle);
    const perpCos = Math.cos(aimAngle + Math.PI / 2);
    const perpSin = Math.sin(aimAngle + Math.PI / 2);

    const muzzleX = playerX + cos * forwardOffset + perpCos * sideOffset;
    const muzzleY = playerY + sin * forwardOffset + perpSin * sideOffset;

    // Ejection port position for brass casing
    const portX = playerX + cos * (forwardOffset - 11.2) + perpCos * (sideOffset + 2.8);
    const portY = playerY + sin * (forwardOffset - 11.2) + perpSin * (sideOffset + 2.8);

    // Spread angle
    const shotAngle = aimAngle + (Math.random() - 0.5) * this.currentSpread;

    // Spawn bullet tracer
    bulletPool.spawn(muzzleX, muzzleY, shotAngle, this.bulletSpeed, this.damage, 'player');

    // Muzzle starburst flash
    particlePool.emitMuzzleFlash(muzzleX, muzzleY, shotAngle);

    // Eject spinning brass shell
    particlePool.emitShell(portX, portY, aimAngle);

    // Gunshot audio
    soundSynth.playGunshot();

    // Subtle screen shake
    onScreenShake(2.2);

    // Auto-reload on empty if reserve available
    if (this.currentMag === 0 && this.reserveAmmo > 0) {
      setTimeout(() => this.startReload(), 120);
    }

    return true;
  }

  /**
   * Procedural drawing of the assault rifle in local coordinate space:
   * Origin (0,0) is rifle mount point near shoulder/hands, pointing along +X
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
    ctx.restore(); // restore transform
  }
}
