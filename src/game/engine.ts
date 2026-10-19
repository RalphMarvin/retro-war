/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundSynth } from './audio';
import { BulletPool } from './bullets';
import { Enemy, EnemyPool } from './enemy';
import { ParticlePool } from './particles';
import { Player } from './player';
import { BunkerTerrain } from './terrain';
import { AmmoState, GameState, PickupItem, PlayerStats } from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Subsystems
  public terrain: BunkerTerrain;
  public player: Player;
  public bulletPool: BulletPool;
  public enemyPool: EnemyPool;
  public particlePool: ParticlePool;

  // Pickups
  public pickups: PickupItem[] = [];
  private nextPickupId: number = 1;

  // Viewport & Camera
  public width: number = 0;
  public height: number = 0;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public screenShake: number = 0;

  // Dynamic light flash
  public muzzleLightTimer: number = 0;
  public muzzleLightPos: { x: number; y: number } = { x: 0, y: 0 };

  // Game Loop
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  public gameState: GameState = 'TITLE';

  // Stats
  public stats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    score: 0,
    kills: 0,
    dronesDestroyed: 0,
    mechsDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1,
    survivalTimeSec: 0,
  };

  // Wave Spawner
  public waveTimer: number = 0;
  public enemiesToSpawnInWave: number = 0;
  public waveSpawnInterval: number = 1.2;
  public spawnCooldown: number = 0;
  public waveClearNoticeTimer: number = 0;

  // Input states
  public keys: { [key: string]: boolean } = {};
  public mousePos: { x: number; y: number } = { x: 0, y: 0 }; // screen coordinates
  public isMouseDown: boolean = false;
  public touchMove: { x: number; y: number } = { x: 0, y: 0 };
  public touchAim: { x: number; y: number } | null = null;
  public isTouchFiring: boolean = false;
  public isMobileMode: boolean = false;
  public lockedEnemy: Enemy | null = null;

  // UI Event Callback
  public onStatsUpdate: ((stats: PlayerStats, ammo: AmmoState) => void) | null = null;
  public onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    this.terrain = new BunkerTerrain(2600, 2600);
    this.player = new Player(1300, 1300);
    this.bulletPool = new BulletPool(180);
    this.enemyPool = new EnemyPool(60);
    this.particlePool = new ParticlePool(450);

    this.initInputs();
    this.resize();
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.parentElement?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.keys['space'] = true;
      }
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'r' && this.gameState === 'PLAYING') {
        this.player.weapon.startReload();
      }
      if (e.key === 'Escape' && (this.gameState === 'PLAYING' || this.gameState === 'PAUSED')) {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.keys['space'] = false;
      }
      this.keys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });
  }

  public startGame() {
    this.gameState = 'PLAYING';
    this.onStateChange?.(this.gameState);

    // Explicitly reset all firing and input states so redeploy never auto-fires
    this.isTouchFiring = false;
    this.isMouseDown = false;
    this.keys = {};
    this.touchMove = { x: 0, y: 0 };
    this.touchAim = null;
    this.lockedEnemy = null;
    this.screenShake = 0;
    this.muzzleLightTimer = 0;

    // Reset everything
    this.terrain.clearDecals();
    this.bulletPool.clear();
    this.enemyPool.clear();
    this.particlePool.clear();
    this.pickups = [];

    this.player = new Player(1300, 1300);
    this.stats = {
      health: 100,
      maxHealth: 100,
      score: 0,
      kills: 0,
      dronesDestroyed: 0,
      mechsDestroyed: 0,
      shotsFired: 0,
      shotsHit: 0,
      wave: 1,
      survivalTimeSec: 0,
    };

    this.startWave(1);
    this.lastTime = performance.now();

    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  public togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.lastTime = performance.now();
    }
    this.onStateChange?.(this.gameState);
  }

  private startWave(waveNum: number) {
    this.stats.wave = waveNum;
    // Wave formula: 5 + wave * 3 hostiles
    this.enemiesToSpawnInWave = 4 + waveNum * 3;
    this.waveSpawnInterval = Math.max(0.6, 1.4 - waveNum * 0.08);
    this.spawnCooldown = 0.5;
    this.waveClearNoticeTimer = 2.5;
  }

  private loop(currentTime: number) {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.1); // clamp to prevent delta spike

    if (this.gameState === 'PLAYING') {
      this.update(dt);
    }

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number) {
    this.stats.survivalTimeSec += dt;

    // 1. Gather movement input
    let moveX = 0;
    let moveY = 0;
    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Combine with virtual stick if active
    if (Math.hypot(this.touchMove.x, this.touchMove.y) > 0.05) {
      moveX = this.touchMove.x;
      moveY = this.touchMove.y;
    }

    const zoom = this.isMobileMode ? 0.80 : 1.0;
    const viewW = this.width / zoom;
    const viewH = this.height / zoom;

    // World aim position
    let aimWorldX = this.cameraX + this.mousePos.x / zoom;
    let aimWorldY = this.cameraY + this.mousePos.y / zoom;

    if (this.touchAim) {
      aimWorldX = this.player.x + this.touchAim.x * 200;
      aimWorldY = this.player.y + this.touchAim.y * 200;
    }

    const wantsFire = this.isMouseDown || !!this.keys['space'] || this.isTouchFiring;

    // Mobile Tactical Auto-Lock Aiming:
    // Only lock onto active hostiles currently visible within the camera viewport frame!
    if (this.isMobileMode || this.isTouchFiring) {
      const camLeft = this.cameraX;
      const camRight = this.cameraX + viewW;
      const camTop = this.cameraY;
      const camBottom = this.cameraY + viewH;

      let closestEnemy: Enemy | null = null;
      let closestDist = Infinity;
      const activeEnemies = this.enemyPool.getActiveEnemies();
      for (const e of activeEnemies) {
        // Hostile must be within visible screen frame
        const inFrame =
          e.x >= camLeft - e.radius &&
          e.x <= camRight + e.radius &&
          e.y >= camTop - e.radius &&
          e.y <= camBottom + e.radius;

        if (inFrame) {
          const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
          if (d < closestDist) {
            closestDist = d;
            closestEnemy = e;
          }
        }
      }
      this.lockedEnemy = closestEnemy;

      if (closestEnemy) {
        aimWorldX = closestEnemy.x;
        aimWorldY = closestEnemy.y;
      } else if (Math.hypot(this.player.vx, this.player.vy) > 10) {
        // Aim in movement heading if no hostile in frame
        aimWorldX = this.player.x + this.player.vx;
        aimWorldY = this.player.y + this.player.vy;
      }
    } else {
      this.lockedEnemy = null;
    }

    // Track shots fired
    const magBefore = this.player.weapon.currentMag;

    // Update Player
    this.player.update(
      dt,
      {
        moveX,
        moveY,
        aimX: aimWorldX,
        aimY: aimWorldY,
        isFiring: wantsFire,
        wantsReload: !!this.keys['r'],
      },
      this.bulletPool,
      this.particlePool,
      (intensity) => {
        this.screenShake = Math.min(7, this.screenShake + intensity);
        this.muzzleLightTimer = 0.06;
        this.muzzleLightPos = { x: this.player.x, y: this.player.y };
      }
    );

    if (this.player.weapon.currentMag < magBefore) {
      this.stats.shotsFired++;
    }

    // Clamp player to bunker walls
    const wallMargin = 55;
    this.player.x = Math.max(wallMargin, Math.min(this.terrain.width - wallMargin, this.player.x));
    this.player.y = Math.max(wallMargin, Math.min(this.terrain.height - wallMargin, this.player.y));

    // 2. Camera tracking player with smooth easing adjusted for zoom
    const targetCamX = this.player.x - viewW / 2;
    const targetCamY = this.player.y - viewH / 2;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 10);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 10);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 14);
    }

    // Muzzle light timer
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= dt;
    }

    // 3. Update Subsystems
    this.bulletPool.update(dt);
    this.particlePool.update(dt);
    this.enemyPool.update(dt, this.player.x, this.player.y, this.bulletPool, this.particlePool);

    // 4. Wave & Enemy Spawning
    this.handleSpawning(dt);

    // 5. Collisions (Bullets -> Enemies, Enemies -> Player, Pickups -> Player)
    this.handleCollisions();

    // 6. Upkeep Pickups
    this.updatePickups(dt);

    // 7. Check Player Death
    if (this.player.isDead) {
      this.gameState = 'GAME_OVER';
      this.onStateChange?.(this.gameState);
    }

    // Broadcast stats for Tactical HUD
    this.stats.health = this.player.health;
    this.onStatsUpdate?.(this.stats, {
      currentMag: this.player.weapon.currentMag,
      reserve: this.player.weapon.reserveAmmo,
      isReloading: this.player.weapon.isReloading,
      reloadProgress: this.player.weapon.reloadTimer / this.player.weapon.reloadDuration,
    });
  }

  private handleSpawning(dt: number) {
    if (this.waveClearNoticeTimer > 0) {
      this.waveClearNoticeTimer -= dt;
    }

    this.spawnCooldown -= dt;

    if (this.enemiesToSpawnInWave > 0 && this.spawnCooldown <= 0) {
      this.spawnCooldown = this.waveSpawnInterval;
      this.enemiesToSpawnInWave--;

      // Spawn at perimeter outside player's viewport
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(this.width, this.height) * 0.75 + 100;
      let sx = this.player.x + Math.cos(angle) * spawnDist;
      let sy = this.player.y + Math.sin(angle) * spawnDist;

      // Clamp inside arena bounds
      sx = Math.max(90, Math.min(this.terrain.width - 90, sx));
      sy = Math.max(90, Math.min(this.terrain.height - 90, sy));

      // 25% chance of Heavy Mech on wave 2+, scaling up
      const isMech = this.stats.wave >= 2 && Math.random() < Math.min(0.45, 0.15 + this.stats.wave * 0.05);
      const enemyType = isMech ? 'mech' : 'drone';

      const waveMultiplier = 1 + (this.stats.wave - 1) * 0.12;
      this.enemyPool.spawn(sx, sy, enemyType, waveMultiplier);
    }

    // Check if wave cleared
    const activeEnemies = this.enemyPool.getActiveEnemies();
    if (this.enemiesToSpawnInWave === 0 && activeEnemies.length === 0) {
      this.startWave(this.stats.wave + 1);
    }
  }

  private handleCollisions() {
    const bullets = this.bulletPool.getActiveBullets();
    const enemies = this.enemyPool.getActiveEnemies();

    // 1. Bullets vs Enemies
    for (const b of bullets) {
      if (b.owner !== 'player') continue;

      for (const e of enemies) {
        if (!e.active) continue;
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist <= e.radius + 6) {
          // Bullet hit
          this.stats.shotsHit++;
          const angle = Math.atan2(b.vy, b.vx);
          const killed = e.takeDamage(b.damage, angle, this.particlePool, (deadEnemy) => {
            this.handleEnemyKilled(deadEnemy);
          });

          // Deactivate bullet
          b.active = false;

          // Screen shake on hit
          this.screenShake = Math.min(5, this.screenShake + 1.2);
          break;
        }
      }

      // Bullets hitting perimeter blast walls
      if (
        b.active &&
        (b.x < 45 || b.x > this.terrain.width - 45 || b.y < 45 || b.y > this.terrain.height - 45)
      ) {
        b.active = false;
        const hitAngle = Math.atan2(b.vy, b.vx);
        this.particlePool.emitImpactSparks(b.x, b.y, hitAngle + Math.PI, 5);
        this.terrain.addBulletPockmark(b.x, b.y);
        soundSynth.playHitSound(true);
      }
    }

    // 2. Enemies vs Player (Melee collision)
    for (const e of enemies) {
      if (!e.active) continue;
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (dist < this.player.radius + e.radius) {
        const damaged = this.player.takeDamage(e.damage);
        if (damaged) {
          this.screenShake = Math.min(9, this.screenShake + 5);
          soundSynth.playHitSound(true);
          // Push player back
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          this.player.x += Math.cos(angle) * 8;
          this.player.y += Math.sin(angle) * 8;
        }
      }
    }

    // 3. Player vs Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < this.player.radius + p.radius) {
        if (p.type === 'ammo') {
          this.player.weapon.addAmmo(60);
          soundSynth.playPickup();
        } else if (p.type === 'health') {
          this.player.heal(35);
          soundSynth.playPickup();
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  private handleEnemyKilled(deadEnemy: Enemy) {
    this.stats.kills++;
    if (deadEnemy.type === 'drone') {
      this.stats.dronesDestroyed++;
      this.stats.score += 150;
    } else {
      this.stats.mechsDestroyed++;
      this.stats.score += 450;
    }

    // Stamp permanent scorch mark onto terrain canvas
    this.terrain.addScorch(deadEnemy.x, deadEnemy.y, deadEnemy.type === 'mech');

    // 22% chance to drop tactical ammo or medkit supply
    if (Math.random() < 0.22) {
      const isHealth = this.player.health < 65 && Math.random() < 0.5;
      this.pickups.push({
        id: this.nextPickupId++,
        type: isHealth ? 'health' : 'ammo',
        x: deadEnemy.x,
        y: deadEnemy.y,
        radius: 16,
        life: 25,
        pulseTimer: 0,
      });
    }
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.pulseTimer += dt * 4;
      if (p.life <= 0) {
        this.pickups.splice(i, 1);
      }
    }
  }

  /**
   * Main Render Pipeline
   */
  private render() {
    const ctx = this.ctx;
    const zoom = this.isMobileMode ? 0.80 : 1.0;
    const viewW = this.width / zoom;
    const viewH = this.height / zoom;

    // Clear
    ctx.fillStyle = '#0a0d10';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 1.5;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 1.5;
      ctx.translate(shakeX, shakeY);
    }

    // Apply Camera Zoom scaling on mobile
    ctx.scale(zoom, zoom);

    // 1. Draw bunker terrain and permanent scorch decals
    this.terrain.draw(ctx, this.cameraX, this.cameraY, viewW, viewH);

    // Apply Camera transform for actors and dynamic objects
    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // 2. Dynamic light flash on the floor around the player when weapon fires
    if (this.muzzleLightTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const flashAlpha = Math.min(1, this.muzzleLightTimer / 0.06);
      const lightRadius = 140;
      const lightGrad = ctx.createRadialGradient(
        this.muzzleLightPos.x,
        this.muzzleLightPos.y,
        10,
        this.muzzleLightPos.x,
        this.muzzleLightPos.y,
        lightRadius
      );
      lightGrad.addColorStop(0, `rgba(255, 230, 160, ${0.45 * flashAlpha})`);
      lightGrad.addColorStop(0.5, `rgba(255, 140, 40, ${0.25 * flashAlpha})`);
      lightGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(this.muzzleLightPos.x, this.muzzleLightPos.y, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Tactical Pickups (Ammo crates & Field Medkits)
    this.drawPickups(ctx);

    // 4. Draw Hostile Enemies (Drones & Heavy Mechs)
    this.enemyPool.draw(ctx);

    // 4.5. Draw Tactical Auto-Aim Target Lock on locked hostile
    if (this.lockedEnemy && this.lockedEnemy.active) {
      this.drawTargetLock(ctx, this.lockedEnemy);
    }

    // 5. Draw Player Soldier
    this.player.draw(ctx);

    // 6. Draw Bullets (Glowing Tracers)
    this.bulletPool.draw(ctx);

    // 7. Draw Particles (Muzzle Flashes, Brass Shells, Sparks, Explosions)
    this.particlePool.draw(ctx);

    ctx.restore(); // remove camera translate

    // 8. In-world Tactical Crosshair Cursor
    this.drawCrosshair(ctx);

    ctx.restore(); // remove screen shake
  }

  private drawTargetLock(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.12;
    const size = (enemy.radius + 7) * pulse;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    const corner = 6;

    // 4 corner targeting brackets
    ctx.beginPath();
    // Top-left
    ctx.moveTo(-size, -size + corner);
    ctx.lineTo(-size, -size);
    ctx.lineTo(-size + corner, -size);
    // Top-right
    ctx.moveTo(size - corner, -size);
    ctx.lineTo(size, -size);
    ctx.lineTo(size, -size + corner);
    // Bottom-left
    ctx.moveTo(-size, size - corner);
    ctx.lineTo(-size, size);
    ctx.lineTo(-size + corner, size);
    // Bottom-right
    ctx.moveTo(size - corner, size);
    ctx.lineTo(size, size);
    ctx.lineTo(size, size - corner);
    ctx.stroke();

    // Center lock pip
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Lock text
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET LOCK', 0, -size - 4);

    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const p of this.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Pulse aura
      const pulse = 1 + Math.sin(p.pulseTimer) * 0.18;
      const isAmmo = p.type === 'ammo';
      const color = isAmmo ? '#eab308' : '#22c55e';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse);
      aura.addColorStop(0, isAmmo ? 'rgba(234, 179, 8, 0.45)' : 'rgba(34, 197, 94, 0.45)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Crate container
      ctx.fillStyle = isAmmo ? '#292211' : '#13281c';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-10, -10, 20, 20, 3);
      ctx.fill();
      ctx.stroke();

      // Icon on crate
      if (isAmmo) {
        // Bullet ammo cartridge icon
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2, -6, 4, 10);
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.lineTo(0, -9);
        ctx.lineTo(2, -6);
        ctx.closePath();
        ctx.fill();
      } else {
        // Medical cross
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
      }

      ctx.restore();
    }
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    if (this.gameState !== 'PLAYING') return;
    if (this.isMobileMode && !this.isMouseDown) return;

    const zoom = this.isMobileMode ? 0.80 : 1.0;
    const x = this.mousePos.x / zoom;
    const y = this.mousePos.y / zoom;
    const spread = this.player.weapon.currentSpread * 140;

    ctx.save();
    ctx.strokeStyle = '#06b6d4'; // tactical cyan
    ctx.lineWidth = 1.4;

    // Center targeting pip
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Outer dynamic spread brackets reacting to recoil
    const gap = 6 + spread;
    const len = 7;

    ctx.beginPath();
    // Top
    ctx.moveTo(x, y - gap - len);
    ctx.lineTo(x, y - gap);
    // Bottom
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + gap + len);
    // Left
    ctx.moveTo(x - gap - len, y);
    ctx.lineTo(x - gap, y);
    // Right
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + len, y);
    ctx.stroke();

    // Reloading indicator around crosshair
    if (this.player.weapon.isReloading) {
      const pct = this.player.weapon.reloadTimer / this.player.weapon.reloadDuration;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
    }

    ctx.restore();
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
