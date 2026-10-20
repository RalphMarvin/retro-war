/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { BattleFrame } from '../game/engine';

interface ThreeBattlefieldProps {
  frame: BattleFrame | null;
}

export const ThreeBattlefield: React.FC<ThreeBattlefieldProps> = ({ frame }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const worldRef = useRef<THREE.Group | null>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const enemyRefs = useRef<Map<string, THREE.Group>>(new Map());
  const pickupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071419');
    scene.fog = new THREE.Fog('#071419', 160, 900);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2000);
    camera.position.set(0, 180, 240);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0x9ce4ff, 0x0d1117, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x7dd3fc, 2.2);
    keyLight.position.set(180, 220, 140);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0xf97316, 18, 500, 2);
    accentLight.position.set(-100, 90, 100);
    scene.add(accentLight);

    const world = new THREE.Group();
    worldRef.current = world;
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(420, 480, 24, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0e1a22,
        roughness: 0.9,
        metalness: 0.15,
      })
    );
    floor.position.y = -10;
    floor.receiveShadow = true;
    world.add(floor);

    const arenaRing = new THREE.Mesh(
      new THREE.TorusGeometry(380, 14, 18, 100),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0f172a,
        metalness: 0.7,
        roughness: 0.35,
      })
    );
    arenaRing.rotation.x = Math.PI / 2;
    arenaRing.position.y = 0;
    world.add(arenaRing);

    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0ea5e9,
      metalness: 0.35,
      roughness: 0.45,
    });
    const playerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(16, 42, 8, 14), playerMaterial);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    playerMesh.position.set(0, 22, 0);
    world.add(playerMesh);
    playerRef.current = playerMesh;

    const resize = () => {
      const { clientWidth, clientHeight } = mountRef.current || { clientWidth: 0, clientHeight: 0 };
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (frame && worldRef.current) {
        const cameraTarget = new THREE.Vector3(
          frame.player.x - frame.cameraX,
          24,
          frame.player.y - frame.cameraY
        );

        const desiredCamera = new THREE.Vector3(
          cameraTarget.x + 150,
          180,
          cameraTarget.z + 210
        );

        camera.position.lerp(desiredCamera, 0.08);
        camera.lookAt(cameraTarget);

        const player = playerRef.current;
        if (player) {
          const target = new THREE.Vector3(
            frame.player.x - frame.cameraX,
            frame.player.health > 0 ? 20 : 8,
            frame.player.y - frame.cameraY
          );
          player.position.lerp(target, 0.18);
          player.rotation.y = -frame.player.angle + Math.PI / 2;
          player.scale.y = frame.player.isMoving ? 1.08 : 1;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      scene.clear();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!frame || !worldRef.current) return;

    const enemyMap = new Map<string, THREE.Group>();
    for (const enemy of frame.enemies) {
      if (!enemy.active) continue;
      const key = `${enemy.type}-${enemy.x.toFixed(1)}-${enemy.y.toFixed(1)}`;
      let group = enemyRefs.current.get(key);
      if (!group) {
        group = new THREE.Group();
        const body = new THREE.Mesh(
          enemy.type === 'mech'
            ? new THREE.BoxGeometry(28, 28, 28)
            : new THREE.OctahedronGeometry(16),
          new THREE.MeshStandardMaterial({
            color: enemy.type === 'mech' ? 0xf87171 : 0xfca5a5,
            emissive: enemy.type === 'mech' ? 0x7f1d1d : 0x450a0a,
            metalness: 0.4,
            roughness: 0.5,
          })
        );
        body.castShadow = true;
        body.position.y = enemy.type === 'mech' ? 14 : 18;
        group.add(body);

        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(enemy.type === 'mech' ? 4 : 3, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0xfff7ed,
            emissive: 0xf59e0b,
            emissiveIntensity: 2,
          })
        );
        eye.position.set(0, enemy.type === 'mech' ? 18 : 18, 13);
        group.add(eye);

        worldRef.current.add(group);
        enemyRefs.current.set(key, group);
      }
      group.position.set(enemy.x - frame.cameraX, enemy.type === 'mech' ? 14 : 18, enemy.y - frame.cameraY);
      group.rotation.y = Math.atan2(frame.player.y - enemy.y, frame.player.x - enemy.x);
      enemyMap.set(key, group);
    }

    for (const [key, mesh] of enemyRefs.current.entries()) {
      if (!enemyMap.has(key)) {
        worldRef.current.remove(mesh);
        enemyRefs.current.delete(key);
      }
    }

    const pickupMap = new Map<string, THREE.Group>();
    for (const pickup of frame.pickups) {
      const key = `${pickup.type}-${pickup.x.toFixed(1)}-${pickup.y.toFixed(1)}`;
      let group = pickupRefs.current.get(key);
      if (!group) {
        group = new THREE.Group();
        const core = new THREE.Mesh(
          new THREE.OctahedronGeometry(10),
          new THREE.MeshStandardMaterial({
            color: pickup.type === 'ammo' ? 0xfbbf24 : 0x4ade80,
            emissive: pickup.type === 'ammo' ? 0x78350f : 0x14532d,
            emissiveIntensity: 0.8,
            metalness: 0.45,
            roughness: 0.35,
          })
        );
        core.castShadow = true;
        group.add(core);
        worldRef.current.add(group);
        pickupRefs.current.set(key, group);
      }
      group.position.set(pickup.x - frame.cameraX, 18 + Math.sin(Date.now() * 0.005 + pickup.x) * 2, pickup.y - frame.cameraY);
      group.rotation.y += 0.08;
      pickupMap.set(key, group);
    }

    for (const [key, mesh] of pickupRefs.current.entries()) {
      if (!pickupMap.has(key)) {
        worldRef.current.remove(mesh);
        pickupRefs.current.delete(key);
      }
    }

    if (frame.flash.active && playerRef.current) {
      const flash = new THREE.PointLight(0xfbbf24, frame.flash.intensity * 18, 180, 2);
      flash.position.set(frame.flash.x - frame.cameraX, 20, frame.flash.y - frame.cameraY);
      worldRef.current.add(flash);
      setTimeout(() => worldRef.current?.remove(flash), 60);
    }
  }, [frame]);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

