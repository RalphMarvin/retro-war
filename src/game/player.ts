/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BulletPool } from './bullets';
import { ParticlePool } from './particles';
import { Weapon } from './weapon';

export class Player {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public speed: number = 220; // pixels per second
  public radius: number = 14; // collision radius (scaled down by 30%)

  // Aiming and orientation
  public aimAngle: number = 0;
  public currentAngle: number = 0;
  public rotationSpeed: number = 18; // radians per second lerp

  // Health and stats
  public health: number = 100;
  public maxHealth: number = 100;
  public isDead: boolean = false;
  public invulnerabilityTimer: number = 0;

  // Weapon
  public weapon: Weapon;

  // Walk cycle animation state
  public walkCycle: number = 0;
  public isMoving: boolean = false;
  public moveAngle: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.weapon = new Weapon();
  }

  public update(
    dt: number,
    input: {
      moveX: number;
      moveY: number;
      aimX: number;
      aimY: number;
      isFiring: boolean;
      wantsReload: boolean;
    },
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    onScreenShake: (intensity: number) => void
  ) {
    if (this.health <= 0) {
      this.isDead = true;
      return;
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    // 1. Movement calculation
    let mx = input.moveX;
    let my = input.moveY;
    const moveLen = Math.hypot(mx, my);

    if (moveLen > 0.05) {
      this.isMoving = true;
      mx /= moveLen;
      my /= moveLen;
      this.moveAngle = Math.atan2(my, mx);

      // Stride animation speed tied to velocity
      const currentSpeed = this.speed * Math.min(1, moveLen);
      this.vx = mx * currentSpeed;
      this.vy = my * currentSpeed;
      this.walkCycle += dt * 9.5;
    } else {
      this.isMoving = false;
      this.vx *= 0.7;
      this.vy *= 0.7;
      // Settle walk cycle smoothly
      this.walkCycle *= 0.85;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 2. Aiming & Smooth body rotation towards cursor/touch
    this.aimAngle = Math.atan2(input.aimY - this.y, input.aimX - this.x);

    // Shortest angular distance lerp
    let angleDiff = this.aimAngle - this.currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.currentAngle += angleDiff * Math.min(1, dt * this.rotationSpeed);

    // 3. Weapon upkeep
    this.weapon.update(dt);

    if (input.wantsReload) {
      this.weapon.startReload();
    }

    // 4. Firing
    if (input.isFiring) {
      this.weapon.shoot(this.x, this.y, this.currentAngle, bulletPool, particlePool, onScreenShake);
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.invulnerabilityTimer > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = 0.35; // brief immunity window
    if (this.health <= 0) {
      this.isDead = true;
    }
    return true;
  }

  public heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Procedural top-down soldier rendering with organic anatomy, gradients, and drop shadows
   */
  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Downscale soldier and weapon by 30%
    ctx.scale(0.70, 0.70);

    // 1. Drop shadow beneath the soldier on the bunker floor
    ctx.save();
    ctx.scale(1.15, 0.95);
    const groundShadow = ctx.createRadialGradient(0, 4, 6, 0, 4, 26);
    groundShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    groundShadow.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
    groundShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = groundShadow;
    ctx.beginPath();
    ctx.arc(0, 4, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Flash white on hit
    if (this.invulnerabilityTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.65;
    }

    // 2. Legs and combat boots (orientated along movement or facing)
    this.drawLegs(ctx);

    // 3. Upper body (torso, plate carrier, arms, weapon, helmet) oriented along aim angle
    ctx.rotate(this.currentAngle);

    // Body recoil jolt offset (kicks slightly backward on firing)
    const jolt = this.weapon.bodyJolt;
    ctx.translate(-jolt * 0.45, 0);

    // Draw tactical plate carrier torso
    this.drawTorso(ctx);

    // Draw arms holding the assault rifle
    this.drawArmsAndHands(ctx);

    // Draw the detailed assault rifle
    ctx.save();
    ctx.translate(14, 8); // position weapon in soldier's hands
    this.weapon.draw(ctx);
    ctx.restore();

    // Draw tactical ballistic helmet
    this.drawHelmet(ctx);

    ctx.restore();
  }

  /**
   * Procedural legs & boots with natural walking stride cycle
   */
  private drawLegs(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Legs face movement direction if moving, otherwise face aim direction
    const legHeading = this.isMoving ? this.moveAngle : this.currentAngle;
    ctx.rotate(legHeading);

    const stride = this.isMoving ? Math.sin(this.walkCycle) * 11 : 0;
    const sway = this.isMoving ? Math.cos(this.walkCycle) * 2.2 : 0;

    // Boot palette: tactical coyote tan & charcoal tread
    const bootColor = '#3c3426';
    const soleColor = '#1a1915';

    // Left Boot
    ctx.save();
    ctx.translate(stride, -10 + sway);
    this.renderBoot(ctx, bootColor, soleColor);
    ctx.restore();

    // Right Boot
    ctx.save();
    ctx.translate(-stride, 10 - sway);
    this.renderBoot(ctx, bootColor, soleColor);
    ctx.restore();

    ctx.restore();
  }

  private renderBoot(ctx: CanvasRenderingContext2D, bootColor: string, soleColor: string) {
    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    // Outer boot sole
    ctx.fillStyle = soleColor;
    ctx.beginPath();
    ctx.moveTo(10, -4.5);
    ctx.quadraticCurveTo(12, 0, 10, 4.5);
    ctx.lineTo(-7, 4.2);
    ctx.quadraticCurveTo(-9, 0, -7, -4.2);
    ctx.closePath();
    ctx.fill();

    // Upper boot leather
    const leatherGrad = ctx.createLinearGradient(-7, -4, 9, 4);
    leatherGrad.addColorStop(0, bootColor);
    leatherGrad.addColorStop(0.5, '#4d4232');
    leatherGrad.addColorStop(1, '#2c251a');
    ctx.fillStyle = leatherGrad;

    ctx.beginPath();
    ctx.moveTo(8.5, -3.5);
    ctx.quadraticCurveTo(10, 0, 8.5, 3.5);
    ctx.lineTo(-6, 3.2);
    ctx.quadraticCurveTo(-7.5, 0, -6, -3.2);
    ctx.closePath();
    ctx.fill();

    // Toe cap reinforcement line
    ctx.strokeStyle = '#18150f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -3.2);
    ctx.lineTo(4, 3.2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Tactical MOLLE plate carrier vest with pouches and camo shading
   */
  private drawTorso(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Tactical camo palette: olive drab & charcoal armor plates
    const vestGrad = ctx.createLinearGradient(-14, -14, 12, 14);
    vestGrad.addColorStop(0, '#354032'); // tactical olive
    vestGrad.addColorStop(0.4, '#445140');
    vestGrad.addColorStop(0.7, '#2d372a');
    vestGrad.addColorStop(1, '#1e241c');
    ctx.fillStyle = vestGrad;

    // Anatomical top-down torso shape (broad shoulders tapering to waist)
    ctx.beginPath();
    ctx.moveTo(-12, -15); // Left shoulder back
    ctx.quadraticCurveTo(-4, -17, 7, -13); // Left shoulder front
    ctx.lineTo(11, -7); // Chest left
    ctx.lineTo(11, 7); // Chest right
    ctx.lineTo(7, 13); // Right shoulder front
    ctx.quadraticCurveTo(-4, 17, -12, 15); // Right shoulder back
    ctx.quadraticCurveTo(-15, 0, -12, -15); // Back curve
    ctx.closePath();
    ctx.fill();

    // Molle chest plate detail
    const plateGrad = ctx.createLinearGradient(-6, -9, 8, 9);
    plateGrad.addColorStop(0, '#4b5946');
    plateGrad.addColorStop(1, '#283226');
    ctx.fillStyle = plateGrad;
    ctx.beginPath();
    ctx.roundRect(-4, -8, 12, 16, 2.5);
    ctx.fill();

    // MOLLE nylon webbing strips across chest
    ctx.strokeStyle = '#222920';
    ctx.lineWidth = 1.2;
    for (let x = -2; x <= 6; x += 2.8) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x, 6);
      ctx.stroke();
    }

    // Tactical mag pouches on front carrier
    ctx.fillStyle = '#222a20';
    ctx.fillRect(5, -6, 4.5, 3.5);
    ctx.fillRect(5, -1.8, 4.5, 3.5);
    ctx.fillRect(5, 2.5, 4.5, 3.5);

    // Shoulder epaulets / harness straps
    ctx.fillStyle = '#1c221a';
    ctx.fillRect(-8, -13, 5, 26);

    ctx.restore();
  }

  /**
   * Tactical arms and articulated shooting gloves gripping the assault rifle
   */
  private drawArmsAndHands(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Arm sleeves (olive tactical fabric)
    const armGrad = ctx.createLinearGradient(-6, -16, 18, 16);
    armGrad.addColorStop(0, '#3a4636');
    armGrad.addColorStop(1, '#283025');
    ctx.fillStyle = armGrad;
    ctx.strokeStyle = '#181e16';
    ctx.lineWidth = 1;

    // 1. Right Arm (trigger arm) bending forward to rifle pistol grip
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(8, 15, 12, 10);
    ctx.lineTo(12, 6);
    ctx.quadraticCurveTo(6, 10, 0, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Left Arm (support arm) extending forward to grip rifle handguard
    ctx.beginPath();
    ctx.moveTo(1, -12);
    ctx.quadraticCurveTo(14, -14, 26, -3);
    ctx.lineTo(24, 0);
    ctx.quadraticCurveTo(12, -9, 0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Tactical Gloves (charcoal composite with knuckle protection)
    ctx.fillStyle = '#1e2228';

    // Right hand on trigger grip
    ctx.beginPath();
    ctx.roundRect(11, 6, 4.5, 4, 1.2);
    ctx.fill();

    // Left hand gripping handguard
    ctx.beginPath();
    ctx.roundRect(24, -4, 5, 4.5, 1.2);
    ctx.fill();

    // Knuckle pads
    ctx.fillStyle = '#3f4752';
    ctx.fillRect(12, 7, 2.5, 1.2);
    ctx.fillRect(25, -3, 2.5, 1.2);

    ctx.restore();
  }

  /**
   * Top-down ballistic combat helmet with NVG mount and tactical rails
   */
  private drawHelmet(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Helmet shadow onto plate carrier
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // FAST High-Cut Ballistic Helmet dome
    const helmetGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 11);
    helmetGrad.addColorStop(0, '#5f6f59'); // highlight on crown
    helmetGrad.addColorStop(0.5, '#424e3e'); // tactical olive
    helmetGrad.addColorStop(0.85, '#2e372b');
    helmetGrad.addColorStop(1, '#1b211a'); // dark rim
    ctx.fillStyle = helmetGrad;

    ctx.beginPath();
    // Anatomical helmet oval
    ctx.ellipse(0, 0, 10.5, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // remove helmet shadow

    // Front NVG Wilcox shroud mount plate
    const nvgGrad = ctx.createLinearGradient(7, -3, 11, 3);
    nvgGrad.addColorStop(0, '#262d36');
    nvgGrad.addColorStop(1, '#12151a');
    ctx.fillStyle = nvgGrad;
    ctx.beginPath();
    ctx.moveTo(7.5, -3.2);
    ctx.lineTo(10.8, -2.4);
    ctx.lineTo(10.8, 2.4);
    ctx.lineTo(7.5, 3.2);
    ctx.closePath();
    ctx.fill();

    // Shroud locking notch
    ctx.fillStyle = '#0a0c0f';
    ctx.fillRect(8.5, -1.2, 1.8, 2.4);

    // ARC Accessory rails on left & right sides
    ctx.fillStyle = '#1e252e';
    ctx.fillRect(-2, -9.6, 6, 1.8);
    ctx.fillRect(-2, 7.8, 6, 1.8);

    // Goggle retention strap across rear
    ctx.strokeStyle = '#181e17';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-2, 0, 8.8, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();

    // Subtle tactical communications headset earcups
    ctx.fillStyle = '#14171a';
    ctx.beginPath();
    ctx.roundRect(-3, -10.5, 5.5, 2.4, 1);
    ctx.roundRect(-3, 8.1, 5.5, 2.4, 1);
    ctx.fill();

    ctx.restore();
  }
}
