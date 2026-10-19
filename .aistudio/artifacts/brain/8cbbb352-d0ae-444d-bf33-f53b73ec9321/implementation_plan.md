# Operation Ironpoint: Cross-Platform Mobile & Desktop Controls Update

Enhancing gameplay ergonomics across mobile touch devices and desktop keyboards by introducing Spacebar shooting on desktop, a responsive virtual joystick on the left for mobile, a tactical auto-aim system locking onto hostiles, a dedicated high-tactile fire trigger on the right, and an enforced landscape orientation experience for mobile devices.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following controls and UX decisions were confirmed in Phase 1:
> - **Desktop Spacebar Firing**: Pressing or holding `Space` triggers assault rifle fire alongside Left Mouse Click, enabling players using arrow keys or WASD to fire without needing mouse clicks.
> - **Mobile Virtual Joystick (Left)**: Fluid floating/anchored touch thumbstick on the left third of the screen with visual base and thumb knob for smooth 8-directional tactical movement.
> - **Mobile Auto-Aim & Right Trigger**: Touching the tactical trigger on the right locks soldier aim onto the nearest hostile within combat range and unloads the weapon. When no enemy is nearby, aim defaults to movement direction.
> - **Enforced Landscape Mode for Mobile**: Full landscape enforcement via CSS viewport media queries and a dedicated tactical "ROTATE DEVICE TO LANDSCAPE" overlay if a mobile device enters portrait orientation.

- **Confirmed Decision 1**: Clean, intuitive virtual touch controls styled with tactical cyan/amber telemetry that only render on touch-capable devices or narrow viewports to avoid desktop clutter.
- **Confirmed Decision 2**: Intelligent target prioritization for mobile auto-lock (evaluates Euclidean distance, line-of-sight angle, and enemy threat level, highlighting targeted hostile with a subtle tactical red reticle).

---

### 1. Overview & Core Concept

- **What It Does**: Streamlines the dual-stick combat loop across all form factors. Desktop players can choose between classic WASD + Mouse Aim/Click or Arrow Keys + Spacebar. Mobile players get an arcade twin-stick setup with a smooth left thumbstick, right tactile fire trigger with auto-lock, and mandatory landscape orientation.
- **Target Audience / Persona**: Mobile phone, tablet, laptop, and desktop gamers seeking frictionless, ergonomic control schemes tailored to their input hardware.
- **Key Value**: Guarantees accessible, responsive controls on any device without compromising the gritty military realism or tactical depth.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Desktop Keyboard & Mouse Flow**:
   - Players can move with WASD or Arrow Keys.
   - Players can fire by either holding Left Mouse Button or holding the `Space` bar.
   - Mouse reticle provides pinpoint 360-degree aiming.
2. **Mobile Landscape Experience**:
   - When opened in portrait on a mobile device, a high-contrast tactical HUD overlay instructs: *"COMBAT ENGAGEMENT REQUIRES LANDSCAPE ORIENTATION"* with a rotating device silhouette.
   - In landscape orientation, full gameplay occupies the screen.
   - Left side: Translucent floating tactical thumbstick with cyan reticle rings and position tracking.
   - Right side: Large, easily reachable tactical trigger button with brass bullet iconography and ammo status.
   - Aiming: Holding the trigger automatically acquires the nearest hostile drone or mech, snapping the soldier's rifle and rendering a targeting lock-on box over the enemy.
   - Mobile Reload Button: Quick-tap button adjacent to the fire trigger.

#### Visual Identity & Theme
- **Tactical Virtual Controls**:
  - Joystick base: Translucent circular HUD ring (`rgba(6, 182, 212, 0.15)`) with cyan boundary notches.
  - Joystick knob: Glowing cyan tactical hub (`#06b6d4`) with smooth dampening.
  - Fire Trigger: Heavy circular trigger button with amber/red glow, ammo counter indicator, and haptic-style depression animation.
  - Target Lock Reticle: In-world HUD bracket drawn over currently locked hostile in red (`#ef4444`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Virtual Joystick over Device Gyroscope**
  - *Chosen Approach*: Implement a dedicated, reliable on-screen virtual joystick on the left rather than relying on inconsistent browser gyroscope permissions or calibration drifts.
  - *Why*: Eliminates permission denials on iOS Safari, provides precise 360-degree directional speed control, and prevents screen-glare issues caused by tilting the device during play.

- **Decision 2: Tactical Auto-Aim for Mobile Trigger**
  - *Chosen Approach*: When holding the mobile trigger, the operative automatically tracks the closest active hostile. Players can also tap/drag to manually direct aim if desired.
  - *Why*: Solves the classic mobile twin-stick problem where aiming and firing simultaneously on touch glass obscures the screen.

- **Decision 3: Keyboard Spacebar Integration**
  - *Chosen Approach*: Map the `Space` key to continuous firing alongside mouse left-click, while preventing default browser page scroll.
  - *Why*: Allows single-hand or two-hand keyboard setups (e.g. Left Hand on WASD/Space, or Right Hand on Arrows/Space).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GameContainer (React)                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                OrientationWatcher & Device Detect                │  │
│  │  - Window aspect ratio & matchMedia('(orientation: portrait)')   │  │
│  │  - Shows PortraitOverlay on mobile portrait                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                      │                                 │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   MobileTouchHUD     │  │           CanvasViewport (2D)          │  │
│  │  - Left Virtual Stick│  │  - Desktop Input (WASD, Arrows, Space) │  │
│  │  - Right Fire Trigger│  │  - Auto-Aim Engine (Find closest enemy)│  │
│  │  - Quick Reload btn  │  │  - Target Lock Reticle Rendering       │  │
│  └──────────────────────┘  └────────────────────────────────────────┘  │
│                                      │                                 │
│  ┌───────────────────────────────────▼──────────────────────────────┐  │
│  │                         GameEngine Core                          │  │
│  │  - keys[' '] triggers weapon.shoot() continuous                  │  │
│  │  - touchMove vector drives player movement                       │  │
│  │  - autoAim target overrides aimAngle when firing on mobile       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Implementation Changes
1. `src/game/engine.ts`:
   - Add `keys[' ']` (Space bar) handler with `e.preventDefault()`.
   - Implement `findClosestHostile(playerX, playerY)`: iterates active enemies, returns target position and enemy reference.
   - Add `isMobileMode` flag and mobile auto-aim snapping logic when firing via mobile trigger.
   - Render tactical lock-on reticle over targeted enemy on canvas.
2. `src/components/MobileControls.tsx`:
   - Left-zone touch thumbstick: dynamic touch origin, clamped radius (50px), continuous vector dispatch.
   - Right-zone fire trigger: touchstart sets `isFiring = true`, touchend sets `false`.
   - Reload button: quick reload trigger.
3. `src/components/PortraitOverlay.tsx`:
   - Detects `isMobile && isPortrait` and displays high-tech landscape orientation prompt.
4. `src/components/TacticalHUD.tsx`:
   - Update control legend to reflect Spacebar firing and mobile touch controls.

---

### 5. Verification Plan

1. **Compilation Check**: Run `compile_applet` and `lint_applet` to confirm zero syntax or typing errors.
2. **Desktop Controls Verification**:
   - Verify pressing Space bar continuously fires the assault rifle.
   - Verify arrow keys + Space bar allows full combat movement without mouse clicks.
   - Verify WASD + Space bar works seamlessly.
3. **Mobile & Touch Verification**:
   - Verify left virtual stick moves operative smoothly in 8 directions.
   - Verify right trigger fires rifle and automatically locks onto nearest hostile drone/mech.
   - Verify lock-on reticle highlights current target.
   - Verify portrait rotation warning displays properly when screen height > screen width on mobile devices.
