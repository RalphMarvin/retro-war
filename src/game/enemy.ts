/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundSynth } from './audio';
import { BulletPool } from './bullets';
import { ParticlePool } from './particles';
import { EnemyType } from './types';

export class Enemy {
  public active: boolean = false;
  public type: EnemyType = 'drone';
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public speed: number = 130;
  public radius: number = 18;

  public health: number = 75;
  public maxHealth: number = 75;
  public damage: number = 15;

  public hitFlashTimer: number = 0;
  public animTimer: number = 0;
  public attackCooldown: number = 0;

  // Drone specific
  public rotorAngle: number = 0;
  public flockOffset: number = 0;

  // Mech specific
  public treadCycle: number = 0;

  public reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.speed = 130;
    this.radius = 18;
    this.health = 75;
    this.maxHealth = 75;
    this.damage = 15;
    this.hitFlashTimer = 0;
    this.animTimer = 0;
    this.attackCooldown = 0;
    this.flockOffset = (Math.random() - 0.5) * 1.2;
    this.treadCycle = 0;
  }

  public init(x: number, y: number, type: EnemyType = 'drone', waveMultiplier: number = 1.0) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.type = type;
    this.animTimer = Math.random() * 10;
    this.flockOffset = (Math.random() - 0.5) * 1.2;
    this.hitFlashTimer = 0;

    if (type === 'drone') {
      // Fast, agile autonomous quad-rotor drone: takes 2-3 rifle hits
      this.radius = 17;
      this.speed = (135 + Math.random() * 30) * Math.min(1.4, 0.95 + waveMultiplier * 0.05);
      this.health = Math.round(75 * waveMultiplier);
      this.maxHealth = this.health;
      this.damage = 12;
    } else {
      // Heavy Combat Mech: armored front mantlet, dual autocannons: takes 6-8 rifle hits
      this.radius = 26;
      this.speed = (80 + Math.random() * 20) * Math.min(1.3, 0.9 + waveMultiplier * 0.04);
      this.health = Math.round(230 * waveMultiplier);
      this.maxHealth = this.health;
      this.damage = 25;
    }
  }

  public takeDamage(
    amount: number,
    bulletAngle: number,
    particlePool: ParticlePool,
    onKilled: (enemy: Enemy) => void
  ): boolean {
    if (!this.active) return false;

    this.health -= amount;
    this.hitFlashTimer = 0.09; // flash white

    // Impact sparks emitting back towards bullet origin
    const sparkAngle = bulletAngle + Math.PI;
    particlePool.emitImpactSparks(this.x, this.y, sparkAngle, this.type === 'mech' ? 9 : 6);
    soundSynth.playHitSound(this.type === 'mech');

    // Knockback
    const knockback = this.type === 'mech' ? 1.8 : 3.6;
    this.x += Math.cos(bulletAngle) * knockback;
    this.y += Math.sin(bulletAngle) * knockback;

    if (this.health <= 0) {
      this.die(particlePool, onKilled);
      return true; // fatal
    }

    return false;
  }

  public die(particlePool: ParticlePool, onKilled: (enemy: Enemy) => void) {
    if (!this.active) return;
    this.active = false;

    const isLarge = this.type === 'mech';
    particlePool.emitExplosion(this.x, this.y, isLarge);
    soundSynth.playExplosion(isLarge);

    onKilled(this);
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    bulletPool: BulletPool,
    particlePool: ParticlePool
  ) {
    if (!this.active) return;

    this.animTimer += dt;
    this.rotorAngle += dt * 38; // fast spin for drone rotors

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    // Direction vector towards player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      const baseAngle = Math.atan2(dy, dx);

      // Cyber drone has slight sinusoidal flanking motion to feel autonomous
      let targetAngle = baseAngle;
      if (this.type === 'drone') {
        targetAngle += Math.sin(this.animTimer * 2.8 + this.flockOffset) * 0.28;
      }

      // Smooth turn towards target
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angle += angleDiff * Math.min(1, dt * (this.type === 'drone' ? 8 : 4.5));

      // Move along forward angle
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.type === 'mech') {
        this.treadCycle += dt * 7.5;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Drop shadow onto bunker floor
    ctx.save();
    const shadowSize = this.type === 'mech' ? 32 : 22;
    const shadowGrad = ctx.createRadialGradient(0, 4, 4, 0, 4, shadowSize);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 4, shadowSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(this.angle);

    // Hit flash: pure white overlay
    const isFlashing = this.hitFlashTimer > 0;

    if (this.type === 'drone') {
      this.drawCyberDrone(ctx, isFlashing);
    } else {
      this.drawHeavyMech(ctx, isFlashing);
    }

    ctx.restore();

    // Health bar above enemy when damaged
    if (this.health < this.maxHealth) {
      this.drawHealthBar(ctx);
    }
  }

  /**
   * Procedural Cyber Drone:
   * Hexagonal carbon-composite chassis, 4 ducted rotor arms with spinning vector blades,
   * glowing red cyclops optic with laser scanner pulse
   */
  private drawCyberDrone(ctx: CanvasRenderingContext2D, isFlashing: boolean) {
    if (isFlashing) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 1. 4 Rotor Boom Arms (carbon fiber diagonal struts)
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-13, -13);
    ctx.lineTo(13, 13);
    ctx.moveTo(-13, 13);
    ctx.lineTo(13, -13);
    ctx.stroke();

    // 2. Ducted Rotor Pods with spinning blades
    const podPositions = [
      { x: -14, y: -14 },
      { x: 14, y: -14 },
      { x: 14, y: 14 },
      { x: -14, y: 14 },
    ];

    for (const pod of podPositions) {
      ctx.save();
      ctx.translate(pod.x, pod.y);

      // Ducted housing ring
      const ringGrad = ctx.createLinearGradient(-5, -5, 5, 5);
      ringGrad.addColorStop(0, '#434c56');
      ringGrad.addColorStop(1, '#1b2026');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Spinning rotor blade blur
      ctx.rotate(this.rotorAngle);
      ctx.fillStyle = 'rgba(160, 175, 190, 0.45)';
      ctx.fillRect(-5.5, -0.9, 11, 1.8);
      ctx.fillRect(-0.9, -5.5, 1.8, 11);

      // Center rotor hub
      ctx.fillStyle = '#0f1216';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Central Hexagonal Fuselage Chassis (Metallic gunmetal with faceted chamfers)
    const bodyGrad = ctx.createLinearGradient(-10, -9, 12, 9);
    bodyGrad.addColorStop(0, '#38424d');
    bodyGrad.addColorStop(0.5, '#4f5b69');
    bodyGrad.addColorStop(1, '#232a32');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(13, 0); // Front nose point
    ctx.lineTo(6, -9);
    ctx.lineTo(-9, -8);
    ctx.lineTo(-12, 0); // Tail
    ctx.lineTo(-9, 8);
    ctx.lineTo(6, 9);
    ctx.closePath();
    ctx.fill();

    // Armor panel seams
    ctx.strokeStyle = '#181e24';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Forward armor cowl
    ctx.fillStyle = '#20252b';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(4, -5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();

    // 4. Glowing Red Autonomous Sensor Optic (Cyclops Eye with pulse)
    const eyePulse = 0.85 + Math.sin(this.animTimer * 6) * 0.15;

    // Red lens aura glow
    const glowGrad = ctx.createRadialGradient(5, 0, 1, 5, 0, 8);
    glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
    glowGrad.addColorStop(0.5, 'rgba(220, 38, 38, 0.5)');
    glowGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(5, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Core sensor aperture
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, 0, 1.8 * eyePulse, 0, Math.PI * 2);
    ctx.fill();

    // Red sensor ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(5, 0, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Procedural Heavy Combat Mech:
   * Heavy armored walker chassis with dual heavy autocannons, sloped frontal mantlet shields,
   * hydraulic actuator pistons, and dual crimson targeting sensor slits
   */
  private drawHeavyMech(ctx: CanvasRenderingContext2D, isFlashing: boolean) {
    if (isFlashing) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-24, -20, 48, 40, 6);
      ctx.fill();
      return;
    }

    // 1. Dual Armored Autocannon Barrels on left and right flanks
    const cannonGrad = ctx.createLinearGradient(0, -2, 28, 2);
    cannonGrad.addColorStop(0, '#2d333a');
    cannonGrad.addColorStop(0.5, '#4b5563');
    cannonGrad.addColorStop(1, '#1e2329');
    ctx.fillStyle = cannonGrad;

    // Left cannon
    ctx.fillRect(4, -18, 24, 4.5);
    // Left muzzle brake
    ctx.fillStyle = '#111418';
    ctx.fillRect(25, -19.5, 4, 7.5);

    // Right cannon
    ctx.fillStyle = cannonGrad;
    ctx.fillRect(4, 13.5, 24, 4.5);
    // Right muzzle brake
    ctx.fillStyle = '#111418';
    ctx.fillRect(25, 12, 4, 7.5);

    // 2. Heavy Armored Tracks / Leg Walker Pods
    const treadStep = Math.sin(this.treadCycle) * 3.5;
    ctx.fillStyle = '#1a1f26';
    // Left tread pod
    ctx.beginPath();
    ctx.roundRect(-20 + treadStep, -23, 30, 8, 2);
    ctx.fill();
    // Right tread pod
    ctx.beginPath();
    ctx.roundRect(-20 - treadStep, 15, 30, 8, 2);
    ctx.fill();

    // Tread segment lines
    ctx.fillStyle = '#0f1217';
    for (let x = -17; x <= 6; x += 4.5) {
      ctx.fillRect(x + treadStep, -23, 1.6, 8);
      ctx.fillRect(x - treadStep, 15, 1.6, 8);
    }

    // 3. Central Reinforced Hull Chassis
    const hullGrad = ctx.createLinearGradient(-18, -16, 18, 16);
    hullGrad.addColorStop(0, '#374151');
    hullGrad.addColorStop(0.4, '#4b5563');
    hullGrad.addColorStop(0.8, '#2b333e');
    hullGrad.addColorStop(1, '#1f242b');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(19, 0); // Front nose apex
    ctx.lineTo(14, 14);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-14, -16);
    ctx.closePath();
    ctx.fill();

    // 4. Sloped Frontal Mantlet Shield Armor Plates
    const shieldGrad = ctx.createLinearGradient(0, -12, 16, 12);
    shieldGrad.addColorStop(0, '#475569');
    shieldGrad.addColorStop(0.5, '#64748b');
    shieldGrad.addColorStop(1, '#334155');
    ctx.fillStyle = shieldGrad;

    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.lineTo(16, -9);
    ctx.lineTo(18, 0);
    ctx.lineTo(16, 9);
    ctx.lineTo(2, 12);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Rear engine exhaust vents with amber heat glow
    ctx.fillStyle = '#111827';
    ctx.fillRect(-16, -8, 4, 16);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.fillRect(-15, -6, 2, 4);
    ctx.fillRect(-15, 2, 2, 4);

    // 5. Dual Crimson Targeting Visor Slits
    const visorPulse = 0.8 + Math.sin(this.animTimer * 5) * 0.2;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 5 * visorPulse;

    ctx.fillRect(8, -6, 5, 2.2);
    ctx.fillRect(8, 3.8, 5, 2.2);

    ctx.shadowBlur = 0;
  }

  /**
   * Floating health bar above damaged hostiles
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const barWidth = this.type === 'mech' ? 36 : 24;
    const barHeight = 3.5;
    const barY = this.y - this.radius - 8;
    const barX = this.x - barWidth / 2;

    // Background track
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Health fill (red to orange)
    const pct = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = this.type === 'mech' ? '#f59e0b' : '#ef4444';
    ctx.fillRect(barX, barY, barWidth * pct, barHeight);

    ctx.restore();
  }
}

export class EnemyPool {
  private pool: Enemy[] = [];

  constructor(size: number = 60) {
    for (let i = 0; i < size; i++) {
      this.pool.push(new Enemy());
    }
  }

  public spawn(
    x: number,
    y: number,
    type: EnemyType = 'drone',
    waveMultiplier: number = 1.0
  ): Enemy | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].init(x, y, type, waveMultiplier);
        return this.pool[i];
      }
    }
    return null;
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    bulletPool: BulletPool,
    particlePool: ParticlePool
  ) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt, playerX, playerY, bulletPool, particlePool);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx);
      }
    }
  }

  public getActiveEnemies(): Enemy[] {
    return this.pool.filter((e) => e.active);
  }

  public clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].reset();
    }
  }
}
