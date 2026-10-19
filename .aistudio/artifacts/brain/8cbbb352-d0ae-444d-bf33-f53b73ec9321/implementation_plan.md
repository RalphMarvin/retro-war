# Operation Ironpoint: iOS Orientation, Rapid Fire Restoration & 30% Actor Downscaling

Addressing iOS-specific browser constraints, restoring rapid automatic fire on mobile touchscreens through independent touch identifier tracking, and scaling down the operative soldier, weapon, and cybernetic enemies by 30% for improved mobile spatial navigation.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following issues and adjustments will be resolved:
> - **iOS Landscape Button Fix**: iOS WebKit does not support programmatic `screen.orientation.lock()` or element fullscreen APIs. The non-functional button will be replaced with clear instructions to physically rotate the device (with a check to disable iOS Control Center Orientation Lock) and a `"Continue in Portrait"` bypass button so iOS users are never trapped on that screen.
> - **Continuous Rapid Fire Restoration**: Multi-touch isolation between the left movement stick and right fire trigger. The previous global `touchend` listener prematurely terminated fire when the movement stick was adjusted or lifted. We will track the trigger's unique `touch.identifier` so holding the trigger guarantees continuous ~10 rounds/sec automatic fire while maneuvering.
> - **30% Actor Downscaling**: Scale down the soldier, assault rifle, Cyber Drones, and Heavy Combat Mechs by 30% (`0.70x` factor) to give ample tactical room on mobile screens.

---

### 1. Overview & Core Concept

- **What It Fixes**: Eliminates dead buttons on iOS devices, fixes the multi-touch conflict that halted automatic weapon fire while moving, and reduces operative and enemy physical footprint by 30% to expand maneuvering margins in the bunker arena.
- **Key Value**: Delivers frictionless, responsive twin-stick military gunplay on iPhone and iPad browsers without artificial blockers or firing interruptions.

---

### 2. Technical Architecture & Key Changes

#### 1. Multi-Touch Trigger & Rapid Fire (`src/components/MobileControls.tsx`):
- Store `triggerTouchIdRef = useRef<number | null>(null)` separately from `stickTouchIdRef`.
- `onTouchStart` on the trigger saves the specific touch identifier and triggers continuous firing: `onFire(true)`.
- `onTouchMove` checks if the touch identifier is still active.
- Only when `onTouchEnd` or `onTouchCancel` matching the trigger's specific identifier fires does it call `onFire(false)`.
- Releasing or moving the left virtual joystick will **never** interrupt or stop the weapon from firing.

#### 2. iOS Landscape Orientation Experience (`src/components/PortraitOverlay.tsx`):
- Remove the broken `requestFullscreen` / `screen.orientation.lock` call that fails silently on iOS.
- Render clean visual guidance:
  - Animated device rotation glyph.
  - Tactical hint: *"Please physically turn your device sideways (ensure Orientation Lock in iOS Control Center is toggled off)."*
  - Add a `"Dismiss & Play in Portrait"` action button so iOS players can jump straight into the action immediately if preferred.

#### 3. 30% Downscaling for Player, Weapons, and Enemies:
- In `Player.draw(ctx)`: apply `ctx.scale(0.70, 0.70)` to the soldier and assault rifle. Adjust collision radius to `14px` (`20 * 0.7`).
- In `Enemy.draw(ctx)`: apply `ctx.scale(0.70, 0.70)` to Cyber Drones and Heavy Combat Mechs. Adjust collision radiuses to `12px` (drone) and `18px` (mech).
- This creates 30% more clearance around obstacles, bullets, and walls, making mobile combat significantly more fluid and readable.

---

### 3. Verification Plan

1. **Compilation Check**: Run `compile_applet` and `lint_applet` to ensure zero typing or build regressions.
2. **Rapid Fire Verification**:
   - Verify that holding the fire trigger unleashes continuous rapid automatic fire at ~10 rounds/sec.
   - Verify that moving, releasing, and repositioning the left movement thumbstick does NOT interrupt weapon firing.
3. **Actor Scale Verification**:
   - Verify operative soldier, weapon, Cyber Drones, and Heavy Mechs are visually 30% smaller on screen.
4. **iOS Orientation Screen Verification**:
   - Verify that the portrait overlay provides clean rotation instructions and an instant bypass button without non-functional API triggers.
