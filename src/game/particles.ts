/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundSynth } from './audio';

export type ParticleType =
  | 'spark'
  | 'smoke'
  | 'shell'
  | 'muzzle_flash'
  | 'shockwave'
  | 'debris';

export class Particle {
  public active: boolean = false;
  public type: ParticleType = 'spark';
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public angularVelocity: number = 0;
  public life: number = 1.0;
  public maxLife: number = 1.0;
  public size: number = 2;
  public endSize: number = 4;
  public color: string = '#ff941a';
  public alpha: number = 1.0;
  public drag: number = 0.98;
  public bounces: number = 0;
  public groundDecalCallback: ((x: number, y: number, angle: number) => void) | null = null;

  public reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.size = 2;
    this.endSize = 4;
    this.alpha = 1.0;
    this.drag = 0.98;
    this.bounces = 0;
    this.groundDecalCallback = null;
  }

  public update(dt: number): boolean {
    if (!this.active) return false;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }

    const progress = 1 - this.life / this.maxLife;

    // Movement
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);

    // Rotation
    this.angle += this.angularVelocity * dt * 60;

    // Type specific mechanics
    if (this.type === 'shell') {
      // Shell physics: slow down, bounce sound once
      const speed = Math.hypot(this.vx, this.vy);
      if (speed < 0.6 && this.bounces === 0) {
        this.bounces++;
        soundSynth.playShellClink();
      }
      this.alpha = Math.max(0, this.life / this.maxLife);
    } else if (this.type === 'smoke') {
      this.size = this.size + (this.endSize - this.size) * progress;
      this.alpha = Math.max(0, (1 - progress) * 0.4);
    } else if (this.type === 'shockwave') {
      this.size = this.size + (this.endSize - this.size) * progress;
      this.alpha = Math.max(0, (1 - progress) * 0.75);
    } else if (this.type === 'spark') {
      this.alpha = Math.max(0, this.life / this.maxLife);
    } else if (this.type === 'debris') {
      this.alpha = Math.max(0, this.life / this.maxLife);
    } else if (this.type === 'muzzle_flash') {
      this.alpha = Math.max(0, this.life / this.maxLife);
    }

    return true;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    if (!this.active || this.alpha <= 0.01) return;

    ctx.save();

    if (this.type === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.size * this.alpha);
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      // Elongated spark streak along velocity
      ctx.lineTo(this.x - this.vx * 1.8, this.y - this.vy * 1.8);
      ctx.stroke();
    } else if (this.type === 'muzzle_flash') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Starburst with warm glow
      const flashSize = this.size * (0.8 + Math.random() * 0.4);
      const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, flashSize * 1.6);
      gradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 200, 70, 0.9)');
      gradient.addColorStop(0.7, 'rgba(255, 100, 20, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, flashSize * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Sharp starburst spikes
      ctx.fillStyle = 'rgba(255, 245, 210, 0.95)';
      ctx.beginPath();
      // Forward long spike
      ctx.moveTo(flashSize * 2.2, 0);
      ctx.lineTo(flashSize * 0.3, -flashSize * 0.4);
      ctx.lineTo(0, -flashSize * 1.3);
      ctx.lineTo(-flashSize * 0.3, -flashSize * 0.3);
      ctx.lineTo(-flashSize * 0.8, 0);
      ctx.lineTo(-flashSize * 0.3, flashSize * 0.3);
      ctx.lineTo(0, flashSize * 1.3);
      ctx.lineTo(flashSize * 0.3, flashSize * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'shell') {
      // Ejected brass casing
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.alpha;

      // Realistic brass metallic gradient
      const brassGrad = ctx.createLinearGradient(-3, -1.2, 3, 1.2);
      brassGrad.addColorStop(0, '#785b19');
      brassGrad.addColorStop(0.3, '#ffd45e');
      brassGrad.addColorStop(0.6, '#e0aa28');
      brassGrad.addColorStop(1, '#664c12');

      ctx.fillStyle = brassGrad;
      // Cylindrical casing shape
      ctx.beginPath();
      ctx.roundRect(-3.5, -1.3, 7, 2.6, 0.8);
      ctx.fill();

      // Primer rim indentation
      ctx.fillStyle = '#4a370e';
      ctx.fillRect(-3.5, -1.3, 1.2, 2.6);
    } else if (this.type === 'smoke') {
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.alpha;

      const smokeGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, this.size);
      smokeGrad.addColorStop(0, 'rgba(80, 85, 90, 0.6)');
      smokeGrad.addColorStop(0.5, 'rgba(50, 55, 60, 0.3)');
      smokeGrad.addColorStop(1, 'rgba(25, 30, 35, 0)');

      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shockwave') {
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.alpha;
      ctx.strokeStyle = 'rgba(255, 170, 70, 0.85)';
      ctx.lineWidth = Math.max(1, 3 * (1 - this.life / this.maxLife));
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'debris') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(-this.size, -this.size * 0.6);
      ctx.lineTo(this.size * 0.8, -this.size * 0.4);
      ctx.lineTo(this.size * 0.4, this.size);
      ctx.lineTo(-this.size * 0.7, this.size * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParticlePool {
  private pool: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 400) {
    this.maxParticles = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push(new Particle());
    }
  }

  public get(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].reset();
        this.pool[i].active = true;
        return this.pool[i];
      }
    }
    // If pool is exhausted, steal the oldest (lowest life)
    let oldest = this.pool[0];
    for (let i = 1; i < this.pool.length; i++) {
      if (this.pool[i].life < oldest.life) {
        oldest = this.pool[i];
      }
    }
    oldest.reset();
    oldest.active = true;
    return oldest;
  }

  public emitMuzzleFlash(x: number, y: number, angle: number) {
    const p = this.get();
    if (!p) return;
    p.type = 'muzzle_flash';
    p.x = x;
    p.y = y;
    p.angle = angle;
    p.size = 18;
    p.maxLife = 0.05; // 2-3 frames
    p.life = 0.05;
  }

  public emitShell(x: number, y: number, weaponAngle: number) {
    const p = this.get();
    if (!p) return;
    p.type = 'shell';
    // Eject to the right side of the rifle (relative to facing direction)
    const sideAngle = weaponAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.35;
    const speed = 2.4 + Math.random() * 1.8;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(sideAngle) * speed - Math.cos(weaponAngle) * 0.6;
    p.vy = Math.sin(sideAngle) * speed - Math.sin(weaponAngle) * 0.6;
    p.angle = Math.random() * Math.PI * 2;
    p.angularVelocity = (Math.random() - 0.5) * 0.65;
    p.maxLife = 1.4;
    p.life = 1.4;
    p.drag = 0.94;
  }

  public emitImpactSparks(x: number, y: number, normalAngle: number, count: number = 7) {
    for (let i = 0; i < count; i++) {
      const p = this.get();
      if (!p) break;
      p.type = 'spark';
      p.x = x;
      p.y = y;
      const angle = normalAngle + (Math.random() - 0.5) * 1.6;
      const speed = 3.5 + Math.random() * 5.0;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 1.6 + Math.random() * 1.2;
      p.color = Math.random() > 0.4 ? '#ffbe3b' : '#ffffff';
      p.maxLife = 0.12 + Math.random() * 0.15;
      p.life = p.maxLife;
      p.drag = 0.92;
    }

    // Small smoke puff on impact
    const smoke = this.get();
    if (smoke) {
      smoke.type = 'smoke';
      smoke.x = x;
      smoke.y = y;
      smoke.vx = (Math.random() - 0.5) * 0.6;
      smoke.vy = (Math.random() - 0.5) * 0.6;
      smoke.size = 4;
      smoke.endSize = 14;
      smoke.maxLife = 0.35;
      smoke.life = 0.35;
      smoke.drag = 0.95;
    }
  }

  public emitExplosion(x: number, y: number, isLarge: boolean = false) {
    // 1. Shockwave ring
    const ring = this.get();
    if (ring) {
      ring.type = 'shockwave';
      ring.x = x;
      ring.y = y;
      ring.size = 4;
      ring.endSize = isLarge ? 80 : 50;
      ring.maxLife = isLarge ? 0.35 : 0.25;
      ring.life = ring.maxLife;
    }

    // 2. High-intensity sparks
    const sparkCount = isLarge ? 28 : 16;
    for (let i = 0; i < sparkCount; i++) {
      const p = this.get();
      if (!p) break;
      p.type = 'spark';
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * (isLarge ? 9 : 6);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2 + Math.random() * 1.5;
      p.color = Math.random() > 0.3 ? '#ff841a' : '#ffe177';
      p.maxLife = 0.2 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.drag = 0.94;
    }

    // 3. Shrapnel debris chunks
    const debrisCount = isLarge ? 10 : 5;
    for (let i = 0; i < debrisCount; i++) {
      const d = this.get();
      if (!d) break;
      d.type = 'debris';
      d.x = x;
      d.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4.5;
      d.vx = Math.cos(angle) * speed;
      d.vy = Math.sin(angle) * speed;
      d.size = 2.5 + Math.random() * 2;
      d.color = Math.random() > 0.5 ? '#2d333b' : '#d97706';
      d.angle = Math.random() * Math.PI * 2;
      d.angularVelocity = (Math.random() - 0.5) * 0.4;
      d.maxLife = 0.5 + Math.random() * 0.4;
      d.life = d.maxLife;
      d.drag = 0.92;
    }

    // 4. Smoke billows
    const smokeCount = isLarge ? 6 : 3;
    for (let i = 0; i < smokeCount; i++) {
      const s = this.get();
      if (!s) break;
      s.type = 'smoke';
      s.x = x + (Math.random() - 0.5) * 12;
      s.y = y + (Math.random() - 0.5) * 12;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.5;
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
      s.size = 8;
      s.endSize = isLarge ? 36 : 24;
      s.maxLife = 0.4 + Math.random() * 0.3;
      s.life = s.maxLife;
      s.drag = 0.92;
    }
  }

  public update(dt: number) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
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

  public clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].reset();
    }
  }
}
