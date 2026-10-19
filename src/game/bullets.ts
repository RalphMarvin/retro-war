/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Bullet {
  public active: boolean = false;
  public x: number = 0;
  public y: number = 0;
  public prevX: number = 0;
  public prevY: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public speed: number = 18;
  public damage: number = 25;
  public life: number = 1.2;
  public maxLife: number = 1.2;
  public owner: 'player' | 'enemy' = 'player';
  public length: number = 22; // elongated tracer streak

  public reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 18;
    this.damage = 25;
    this.life = 1.2;
    this.maxLife = 1.2;
    this.owner = 'player';
    this.length = 22;
  }

  public init(
    x: number,
    y: number,
    angle: number,
    speed: number = 19,
    damage: number = 34,
    owner: 'player' | 'enemy' = 'player'
  ) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.prevX = x - Math.cos(angle) * 10;
    this.prevY = y - Math.sin(angle) * 10;
    this.speed = speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.life = 1.2;
    this.maxLife = 1.2;
    this.owner = owner;
    this.length = owner === 'player' ? 24 : 16;
  }

  public update(dt: number): boolean {
    if (!this.active) return false;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    return true;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;

    const angle = Math.atan2(this.vy, this.vx);
    const tailX = this.x - Math.cos(angle) * this.length;
    const tailY = this.y - Math.sin(angle) * this.length;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Broad outer atmospheric glow
    const outerGrad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
    if (this.owner === 'player') {
      outerGrad.addColorStop(0, 'rgba(255, 100, 0, 0)');
      outerGrad.addColorStop(0.5, 'rgba(255, 140, 20, 0.45)');
      outerGrad.addColorStop(1, 'rgba(255, 200, 80, 0.9)');
    } else {
      outerGrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
      outerGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.5)');
      outerGrad.addColorStop(1, 'rgba(254, 202, 202, 0.9)');
    }

    ctx.strokeStyle = outerGrad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // 2. High-intensity incandescent tracer streak core
    const coreGrad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
    if (this.owner === 'player') {
      coreGrad.addColorStop(0, 'rgba(255, 150, 0, 0)');
      coreGrad.addColorStop(0.6, 'rgba(255, 230, 150, 0.85)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
    } else {
      coreGrad.addColorStop(0, 'rgba(255, 50, 50, 0)');
      coreGrad.addColorStop(0.6, 'rgba(255, 160, 160, 0.85)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
    }

    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX + Math.cos(angle) * 4, tailY + Math.sin(angle) * 4);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // 3. Bullet head tip highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class BulletPool {
  private pool: Bullet[] = [];

  constructor(size: number = 150) {
    for (let i = 0; i < size; i++) {
      this.pool.push(new Bullet());
    }
  }

  public spawn(
    x: number,
    y: number,
    angle: number,
    speed: number = 19,
    damage: number = 34,
    owner: 'player' | 'enemy' = 'player'
  ): Bullet | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].init(x, y, angle, speed, damage, owner);
        return this.pool[i];
      }
    }
    // Recycle oldest if pool full
    const oldest = this.pool[0];
    oldest.init(x, y, angle, speed, damage, owner);
    return oldest;
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

  public getActiveBullets(): Bullet[] {
    return this.pool.filter((b) => b.active);
  }

  public clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].reset();
    }
  }
}
