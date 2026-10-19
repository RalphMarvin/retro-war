# Operation Ironpoint: 100% Mobile Optimization & Viewport Refinement

Refining Operation Ironpoint to be 100% mobile-first in landscape orientation by resolving touch state persistence on redeployment, embedding miniaturized vitals and ammunition indicators into an ultra-thin top telemetry bar, zooming out the camera to expand combat visibility and downscale operative size, and restricting tactical auto-lock exclusively to hostiles visible within the on-screen frame.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following gameplay mechanics and UX refinements were confirmed in Phase 1:
> - **Redeploy Firing State Reset**: Ensure `isTouchFiring`, `isMouseDown`, `touchMove`, and trigger state are completely cleared when the player dies and redeploys, preventing the assault rifle from firing autonomously until deliberately pressed.
> - **Miniaturized Inline Top Bar**: Consolidate operative vitals, health bar, M4A1 ammunition count, quick-reload trigger, combat score, and wave indicator into an ultra-thin (~32px) top telemetry bar, eliminating bulky bottom HUD cards to maximize screen real estate.
> - **Camera Zoom-Out & Operative Scaling**: Apply a ~0.82x camera zoom on mobile devices, making the operative smaller and revealing ~25% more surrounding bunker arena to spot encroaching drones earlier.
> - **In-Frame Auto-Aim Only**: Restrict auto-lock acquisition strictly to hostiles located within the active camera viewport bounds (`[cameraX, cameraX + viewportWidth]` and `[cameraY, cameraY + viewportHeight]`), preventing weapon lock onto off-screen targets.

---

### 1. Overview & Core Concept

- **What It Delivers**: A mobile-native tactical combat experience in landscape mode. The field of view is expanded, the operative and enemies have greater tactical breathing room, the UI never obstructs thumb movement or trigger firing, and weapon targeting only locks onto visible threats.
- **Target Audience / Form Factor**: Mobile players holding phones in landscape grip (left thumb for 360-degree movement joystick, right thumb for tactical trigger and quick reload).

---

### 2. User Experience & Visual Design

#### Key User Flows & Visual Layout
1. **Ultra-Thin Tactical Top Bar**:
   - Single-row header (~30-32px height) with dark slate backing (`rgba(10, 13, 16, 0.85)`).
   - Left Zone: Operative designation, micro segmented health bar with numerical HP.
   - Center Zone: Combat wave and score with monospace tabular figures (`font-mono tabular-nums`).
   - Right Zone: Compact ammo badge (`30 / 180`), embedded mini reload button, and audio mute toggle.
2. **Clear Combat Field**:
   - Bottom corners reserved strictly for the Left Virtual Joystick and Right Fire Trigger.
   - Zero bulky cards or overlapping meters in the lower half of the screen.
3. **Camera Zoom & In-Frame Target Acquisition**:
   - Canvas scales world coordinates by `0.82x` on mobile landscape, providing wider perimeter visibility.
   - When holding the trigger, the operative only targets hostiles whose coordinates reside inside the current screen frame. Off-screen drones remain un-targeted until they breach the visible perimeter.
4. **Clean Redeployment Cycle**:
   - Tapping `"Redeploy Operative"` resets all input states immediately. The soldier stands at the ready with zero unintended auto-fire.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Miniaturized Inline Top Bar vs Bottom Gauges**
  - *Chosen Approach*: Embed health and ammunition into the top bar and remove the bottom left/right HUD cards on mobile.
  - *Why*: In mobile landscape mode, vertical height is extremely tight (~360-400px). Bottom cards collide with thumbs and cover incoming enemies. Embedding meters in a thin top bar keeps all telemetry visible while leaving 90% of the screen unobstructed.

- **Decision 2: Camera Viewport Zoom vs Individual Actor Downscaling**
  - *Chosen Approach*: Apply a global camera zoom (`0.82x`) in the 2D render loop.
  - *Why*: Uniformly scales the operative, weapons, tracers, enemies, and concrete terrain, naturally expanding the player's field of view without desynchronizing physics, projectile speeds, or collision radiuses.

- **Decision 3: Strict Viewport Bound Checking for Auto-Aim**
  - *Chosen Approach*: Compute camera world coordinates `[camLeft, camRight, camTop, camBottom]` and filter candidate targets using `isInViewport(enemy)`.
  - *Why*: Prevents erratic weapon rotation snapping towards distant off-screen hostiles, ensuring the player always understands and sees exactly what they are engaging.

---

### 4. Technical Architecture & Implementation Steps

```
┌────────────────────────────────────────────────────────────────────────┐
│                        100% Mobile Tactical HUD                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [Vitals: 100 HP ■■■■]  [WAVE 3 · 4,250 PTS]  [M4A1: 30/180 ↻] [🔊] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│                      Canvas Viewport (Zoom: 0.82x)                     │
│               Camera Bounds: [camX .. camX + W / 0.82]                 │
│                                                                        │
│   (On-Screen Hostile) ────► [TARGET LOCK] (Auto-Locked)                │
│   (Off-Screen Hostile) ───► [IGNORED until entering frame]             │
│                                                                        │
│ ┌──────────────────────┐                      ┌──────────────────────┐ │
│ │ Left Virtual Joystick│                      │  Right Fire Trigger  │ │
│ │ (Smooth 360° Move)   │                      │  (Tap/Hold to Shoot) │ │
│ └──────────────────────┘                      └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Code Changes
1. `src/game/engine.ts`:
   - `startGame()`: Explicitly clear `this.isTouchFiring = false; this.isMouseDown = false; this.keys = {}; this.touchMove = {x: 0, y: 0}; this.lockedEnemy = null;`.
   - `render()`: Apply `ctx.scale(zoom, zoom)` where `zoom = this.isMobileMode ? 0.82 : 1.0` and adjust camera centering so player remains centered.
   - `update(dt)`: Filter candidate targets for auto-aim using:
     ```ts
     const camLeft = this.cameraX;
     const camRight = this.cameraX + this.width / zoom;
     const camTop = this.cameraY;
     const camBottom = this.cameraY + this.height / zoom;
     const inFrame = e.x >= camLeft && e.x <= camRight && e.y >= camTop && e.y <= camBottom;
     ```
2. `src/components/TacticalHUD.tsx`:
   - Redesign top bar into a slim 30px telemetry bar containing inline health bar, ammo display, and reload button.
   - Remove redundant bottom cards on mobile to clear the entire combat zone.
3. `src/components/MobileControls.tsx`:
   - Add reset listener / state clearing so trigger button never gets stuck down across deaths/restarts.

---

### 5. Verification Plan

1. **Compilation & Typing**: Run `compile_applet` and `lint_applet` to confirm zero issues.
2. **Redeploy State Verification**:
   - Verify dying and clicking `"Redeploy Operative"` starts the game with weapon idle, no automatic shooting.
3. **Viewport & Sizing Verification**:
   - Verify soldier, enemies, and bunker arena appear scaled down with 25% wider visible perimeter.
   - Verify the top bar occupies minimal vertical space and leaves the arena completely clear.
4. **Auto-Aim Frame Boundary Verification**:
   - Verify hostiles outside the camera frame are not locked on.
   - Verify target lock immediately acquires hostiles the moment they cross into the visible frame.
