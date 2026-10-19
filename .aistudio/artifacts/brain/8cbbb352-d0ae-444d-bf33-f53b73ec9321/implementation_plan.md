# Operation Ironpoint: Mobile Long-Press Rapid-Fire Fix

Fixing the mobile long-press rapid-fire bug where holding down the fire trigger stopped shooting after a single round due to React re-render cycle effect cleanups, and upgrading the trigger to Pointer Capture with long-press callout suppression.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Root Cause Identified**:
> In `App.tsx`, `onStatsUpdate` broadcasts updated ammunition/health to React state on weapon fire (e.g. ammo dropping from 30 to 29). This caused `App` to re-render, creating a new inline `onFire` function reference. `MobileControls` had `[onFire]` in its `useEffect` dependency array, which immediately executed the effect cleanup (`onFire(false)`), canceling weapon firing after the very first bullet!
>
> **The Fix**:
> 1. Decouple `onFire` and `onMoveVector` from effect re-triggers in `MobileControls` using stable ref bridges (`onFireRef = useRef(onFire)`) and empty dependency mount cycles (`[]`).
> 2. Stabilize callbacks in `App.tsx` using `useCallback`.
> 3. Implement Pointer Capture (`onPointerDown` + `setPointerCapture`) with `-webkit-touch-callout: none` and `contextmenu` suppression on the trigger button, preventing mobile browsers from interrupting long-press firing.

---

### 1. Overview & Technical Solution

#### Problem Analysis
- When holding down the fire button, the weapon fired exactly one shot.
- That shot reduced `ammo.currentMag`, causing `setAmmo` in `App.tsx`.
- The re-render created a new inline `onFire` closure, causing `MobileControls`'s `useEffect` to tear down and run its cleanup: `onFire(false)`.
- Consequently, `engine.isTouchFiring` was set back to `false` within 16 milliseconds, killing rapid fire while the finger remained on the screen.

#### Solution Architecture
1. **Ref Stabilization in `MobileControls.tsx`**:
   - Store callbacks in stable refs: `onFireRef.current = onFire; onMoveVectorRef.current = onMoveVector;`.
   - Run global touch/unmount cleanup strictly on mount/unmount (`useEffect(..., [])`), never during parent re-renders.
2. **Pointer Capture API & Callout Suppression**:
   - Modernize trigger button from touch-only to Pointer Events (`onPointerDown`, `onPointerUp`, `onPointerCancel`) with `e.currentTarget.setPointerCapture(e.pointerId)`.
   - Add `-webkit-touch-callout: none`, `-webkit-user-select: none`, and `onContextMenu={(e) => e.preventDefault()}` so iOS/Android long-press menus never intercept the hold.
3. **App-Level Callback Memoization**:
   - Wrap `onFire`, `onMoveVector`, and `onReload` in `useCallback` in `App.tsx`.

---

### 2. Verification Plan

1. **Compilation Check**: Run `compile_applet` and `lint_applet` to confirm zero errors.
2. **Rapid-Fire Hold Verification**:
   - Verify that pressing and holding the fire trigger on touch screens continuously fires the weapon through the entire 30-round magazine at ~10 rounds/sec without stopping.
   - Verify that simultaneously moving the virtual joystick does not interrupt or restart the firing stream.
   - Verify that releasing the trigger stops firing cleanly.
   - Verify that reloading and pressing again immediately resumes continuous automatic fire.
