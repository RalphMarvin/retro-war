/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class BunkerTerrain {
  public width: number = 2600;
  public height: number = 2600;
  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;
  private decalCanvas: HTMLCanvasElement;
  private decalCtx: CanvasRenderingContext2D;

  constructor(width: number = 2600, height: number = 2600) {
    this.width = width;
    this.height = height;

    // 1. Static base bunker terrain canvas (rendered once)
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = width;
    this.terrainCanvas.height = height;
    const tCtx = this.terrainCanvas.getContext('2d', { alpha: false });
    if (!tCtx) throw new Error('Failed to create terrain canvas context');
    this.terrainCtx = tCtx;

    // 2. Dynamic persistent decals canvas (accumulates scorch marks & blast craters)
    this.decalCanvas = document.createElement('canvas');
    this.decalCanvas.width = width;
    this.decalCanvas.height = height;
    const dCtx = this.decalCanvas.getContext('2d');
    if (!dCtx) throw new Error('Failed to create decal canvas context');
    this.decalCtx = dCtx;

    this.renderBaseBunker();
  }

  /**
   * Generates realistic procedural bunker floor with concrete slabs, expansion seams,
   * fracture cracks, ventilation grates, and hazard caution stripes
   */
  private renderBaseBunker() {
    const ctx = this.terrainCtx;

    // 1. Dark distressed industrial concrete base
    ctx.fillStyle = '#181d24';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Concrete noise & texture grain
    const noiseCount = 14000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < noiseCount; i++) {
      const nx = Math.random() * this.width;
      const ny = Math.random() * this.height;
      const ns = 1 + Math.random() * 2.5;
      ctx.fillRect(nx, ny, ns, ns);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let i = 0; i < noiseCount; i++) {
      const nx = Math.random() * this.width;
      const ny = Math.random() * this.height;
      const ns = 1 + Math.random() * 3;
      ctx.fillRect(nx, ny, ns, ns);
    }

    // 3. Concrete Slab Grid (160x160px slabs)
    const slabSize = 160;
    const cols = Math.ceil(this.width / slabSize);
    const rows = Math.ceil(this.height / slabSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * slabSize;
        const y = r * slabSize;

        // Subtle slab shade variation
        const shadeVar = ((c * 17 + r * 31) % 7) - 3;
        const slabLuminance = 28 + shadeVar;
        ctx.fillStyle = `rgb(${slabLuminance - 2}, ${slabLuminance + 2}, ${slabLuminance + 7})`;
        ctx.fillRect(x + 2, y + 2, slabSize - 4, slabSize - 4);

        // Slab bevel highlight (top & left edges)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + slabSize - 2);
        ctx.lineTo(x + 2, y + 2);
        ctx.lineTo(x + slabSize - 2, y + 2);
        ctx.stroke();

        // Dark slab expansion joint seams
        ctx.strokeStyle = '#0e1216';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, slabSize, slabSize);

        // Slab corner anchor rivets
        ctx.fillStyle = '#0a0d10';
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, 2, 0, Math.PI * 2);
        ctx.arc(x + slabSize - 8, y + 8, 2, 0, Math.PI * 2);
        ctx.arc(x + 8, y + slabSize - 8, 2, 0, Math.PI * 2);
        ctx.arc(x + slabSize - 8, y + slabSize - 8, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Procedural Fracture Cracks across select concrete slabs
    ctx.strokeStyle = 'rgba(10, 14, 18, 0.75)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 45; i++) {
      let cx = 100 + Math.random() * (this.width - 200);
      let cy = 100 + Math.random() * (this.height - 200);
      let crackAngle = Math.random() * Math.PI * 2;
      const segments = 4 + Math.floor(Math.random() * 5);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < segments; s++) {
        crackAngle += (Math.random() - 0.5) * 0.9;
        const len = 12 + Math.random() * 18;
        cx += Math.cos(crackAngle) * len;
        cy += Math.sin(crackAngle) * len;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // 5. Heavy Hydraulic Hatch Gates & Hazard Caution Stripes
    this.renderHatchAndHazardZones(ctx);

    // 6. Perimeter Security Walls (Dark reinforced blast wall borders)
    ctx.fillStyle = '#0a0d10';
    const wallThick = 40;
    ctx.fillRect(0, 0, this.width, wallThick); // Top wall
    ctx.fillRect(0, this.height - wallThick, this.width, wallThick); // Bottom wall
    ctx.fillRect(0, 0, wallThick, this.height); // Left wall
    ctx.fillRect(this.width - wallThick, 0, wallThick, this.height); // Right wall

    // Wall warning stripe border
    this.renderCautionBorder(ctx, wallThick);
  }

  private renderHatchAndHazardZones(ctx: CanvasRenderingContext2D) {
    // 4 Hydraulic ventilation grates / launch hatches placed throughout bunker
    const hatchPositions = [
      { x: this.width * 0.3, y: this.height * 0.3 },
      { x: this.width * 0.7, y: this.height * 0.3 },
      { x: this.width * 0.3, y: this.height * 0.7 },
      { x: this.width * 0.7, y: this.height * 0.7 },
      { x: this.width * 0.5, y: this.height * 0.5 },
    ];

    for (const h of hatchPositions) {
      // Hatch pit recessed shadow
      ctx.fillStyle = '#080a0d';
      ctx.beginPath();
      ctx.roundRect(h.x - 70, h.y - 70, 140, 140, 8);
      ctx.fill();

      // Industrial metal grating louvers
      ctx.strokeStyle = '#1e252e';
      ctx.lineWidth = 3;
      for (let gy = h.y - 60; gy <= h.y + 60; gy += 10) {
        ctx.beginPath();
        ctx.moveTo(h.x - 60, gy);
        ctx.lineTo(h.x + 60, gy);
        ctx.stroke();
      }

      // Yellow/Black diagonal hazard caution framing
      this.drawHazardStripes(ctx, h.x - 85, h.y - 85, 170, 12, 'horizontal');
      this.drawHazardStripes(ctx, h.x - 85, h.y + 73, 170, 12, 'horizontal');
      this.drawHazardStripes(ctx, h.x - 85, h.y - 73, 12, 146, 'vertical');
      this.drawHazardStripes(ctx, h.x + 73, h.y - 73, 12, 146, 'vertical');
    }
  }

  private drawHazardStripes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    dir: 'horizontal' | 'vertical'
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Dark yellow backing
    ctx.fillStyle = '#b48a14';
    ctx.fillRect(x, y, w, h);

    // Diagonal black stripes
    ctx.fillStyle = '#14171c';
    const stripeW = 14;
    const total = w + h + stripeW * 2;
    for (let d = -stripeW * 2; d < total; d += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + stripeW, y);
      ctx.lineTo(x + d + stripeW - h, y + h);
      ctx.lineTo(x + d - h, y + h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private renderCautionBorder(ctx: CanvasRenderingContext2D, wallThick: number) {
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(wallThick + 2, wallThick + 2, this.width - wallThick * 2 - 4, this.height - wallThick * 2 - 4);
  }

  /**
   * Adds a permanent blast scorch decal to the bunker floor when an enemy is destroyed
   */
  public addScorch(x: number, y: number, isLarge: boolean = false) {
    const ctx = this.decalCtx;
    ctx.save();

    const radius = isLarge ? 48 + Math.random() * 16 : 28 + Math.random() * 10;

    // 1. Charcoal dark blast crater center
    const scorchGrad = ctx.createRadialGradient(x, y, 2, x, y, radius);
    scorchGrad.addColorStop(0, 'rgba(10, 12, 14, 0.9)');
    scorchGrad.addColorStop(0.35, 'rgba(18, 22, 26, 0.75)');
    scorchGrad.addColorStop(0.7, 'rgba(30, 36, 42, 0.35)');
    scorchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = scorchGrad;
    ctx.beginPath();
    // Jagged irregular blast perimeter
    const spikes = 12;
    for (let i = 0; i <= spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      const r = radius * (0.75 + Math.random() * 0.45);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 2. High-heat orange/amber residual thermal scorch specks
    if (isLarge) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (radius * 0.6);
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 1 + Math.random() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Permanent bullet impact pockmark
   */
  public addBulletPockmark(x: number, y: number) {
    const ctx = this.decalCtx;
    ctx.save();

    // Small dark hole
    ctx.fillStyle = 'rgba(10, 12, 15, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Chipped concrete rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.5, 2.8, 0, Math.PI * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws the visible slice of the bunker terrain + baked decals onto the active view
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ) {
    // Source rect clamped to terrain bounds
    const srcX = Math.max(0, Math.min(this.width - viewportWidth, cameraX));
    const srcY = Math.max(0, Math.min(this.height - viewportHeight, cameraY));

    // Draw base terrain
    ctx.drawImage(
      this.terrainCanvas,
      srcX,
      srcY,
      viewportWidth,
      viewportHeight,
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    // Draw accumulated scorch decals on top
    ctx.drawImage(
      this.decalCanvas,
      srcX,
      srcY,
      viewportWidth,
      viewportHeight,
      0,
      0,
      viewportWidth,
      viewportHeight
    );
  }

  public clearDecals() {
    this.decalCtx.clearRect(0, 0, this.width, this.height);
  }
}
