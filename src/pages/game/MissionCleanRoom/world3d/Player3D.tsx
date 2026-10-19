import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ControlInput3D, PlayerState3D } from './ControlTypes';
import { ANIMATION_CONFIGS, AVATARS_3D, resolveClipName, type GameAvatar3D, type InteractionAnimationName } from './GameAvatar';
import { WORLD3D_CONFIG } from './world3dConstants';

interface Player3DProps {
  avatar: GameAvatar3D;
  /** Owned by the parent (GameWorld3D) so CameraRig/InteractionManager3D can also read position/rotation each frame. */
  groupRef: React.RefObject<THREE.Group | null>;
  inputRef: React.RefObject<ControlInput3D>;
  /** Same camera orbit angle CameraRig reads — movement is interpreted relative to it (Roblox-style: joystick "up" always means "the direction the camera is currently looking"). */
  yawRef: React.MutableRefObject<number>;
  initialPosition: THREE.Vector3;
  roomHalfSize: number;
  obstacles: THREE.Box3[];
  isCarrying: boolean;
  carriedItem?: React.ReactNode;
  /** Bump (any change, e.g. n+1) to request the avatar's one-shot Pickup animation. Resolved via
      resolveClipName (GameAvatar.ts) — an avatar without a real Pickup clip (Tiburón Boy/Dino Boy)
      plays a brief Idle cycle as a stand-in gesture instead, not an instant no-animation swap. */
  pickupTrigger: number;
  onPickupAttach: () => void;
  placeTrigger: number;
  onPlaceRelease: () => void;
  /** Fires once the active Pickup/Place action's 'finished' event reaches the mixer — GameWorld3D
      uses this to re-enable interaction. */
  onInteractionAnimDone: () => void;
  onStateChange?: (state: PlayerState3D) => void;
}

const { WALK_SPEED, RUN_SPEED, RUN_INPUT_THRESHOLD, TURN_DAMPING, GRAVITY, JUMP_VELOCITY, PLAYER_HALF_EXTENT } = WORLD3D_CONFIG;

// Module-level scratch objects — avoid per-frame allocation (same discipline as CameraRig).
const localForward = new THREE.Vector3(0, 0, 1); // this model's rigged "forward" faces local +Z (see CameraRig)
// -1, not +1: CameraRig positions the camera via idealOffset=(0,H,-D) + camera.lookAt(), and
// Three.js derives the camera's local +X (screen-right) as cross(worldUp, cameraBackward) — at
// yaw=0 that works out to world -X, not +X. Using +1 here made joystick/keyboard left-right
// exactly reversed (confirmed on-device); this constant must mirror the camera's real "right".
const localRight = new THREE.Vector3(-1, 0, 0);
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const worldMove = new THREE.Vector3();
const scratchHandPos = new THREE.Vector3();
const scratchHandQuat = new THREE.Quaternion();
const scratchRootQuat = new THREE.Quaternion();

/** Fraction into the Pickup/Place clip where the hands actually reach the item — matches the
    keyframe authored at frame 13 of 24 in rigging-scripts/add_interaction_clips.py. Attach/release
    fires here rather than at the clip's start/end so it's synced to the visual "grab" moment. */
const INTERACTION_EVENT_FRACTION = 13 / 24;
/** Name shared by all three hand-authored rigs (Gilbertito/Gael/Tutu — see rigging-scripts/) —
    development-character.glb (Tiburón Boy/Dino Boy) uses different bone names ('Hand.R'), so
    getObjectByName returns null for it and carriedItem falls back to the fixed floating offset,
    same as before this feature existed. */
const HAND_BONE_NAME = 'RightHand';
const FALLBACK_ITEM_OFFSET = new THREE.Vector3(0, 5.2, 0);

/** Owns the player's movement/gravity/jump and the resulting locomotion animation — manual physics, no physics engine needed for one capsule vs. a handful of room boxes. */
const Player3D: React.FC<Player3DProps> = ({
  avatar, groupRef, inputRef, yawRef, initialPosition, roomHalfSize, obstacles,
  isCarrying, carriedItem, pickupTrigger, onPickupAttach, placeTrigger, onPlaceRelease, onInteractionAnimDone,
  onStateChange,
}) => {
  const { scene, animations } = useGLTF(avatar.modelUrl);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const velocityY = useRef(0);
  const grounded = useRef(true);
  const currentClip = useRef<string | null>(null);
  const currentState = useRef<PlayerState3D>('idle');
  const squashY = useRef(1);
  const handBoneRef = useRef<THREE.Object3D | null>(null);
  const carriedItemGroupRef = useRef<THREE.Group>(null);

  /** Non-null while a one-shot pickup/place clip is playing — freezes locomotion input and
      overrides the state machine below until `mixer`'s 'finished' event fires (see below). */
  const interactionAnim = useRef<'pickup' | 'place' | null>(null);
  const interactionEventFired = useRef(false);
  const lastPickupTrigger = useRef(pickupTrigger);
  const lastPlaceTrigger = useRef(placeTrigger);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    node.position.copy(initialPosition);
    node.scale.setScalar(avatar.scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const idleClip = avatar.animations.idle;
    actions[idleClip]?.reset().play();
    currentClip.current = idleClip;
  }, [actions, avatar.animations.idle]);

  useEffect(() => {
    handBoneRef.current = scene.getObjectByName(HAND_BONE_NAME) ?? null;
  }, [scene]);

  // resolveClipName always resolves to at least `idle` (a required field) — so unlike the earlier
  // version of this function, there's no "avatar has no clip" branch to special-case anymore.
  // Tiburón Boy/Dino Boy (no real Pickup/Place clips) now play a brief Idle cycle as a stand-in
  // gesture instead of skipping the animation entirely, same as a fully-rigged avatar would.
  const startInteractionAnim = (kind: 'pickup' | 'place', animName: InteractionAnimationName) => {
    const clipKey = resolveClipName(avatar.animations, animName, isCarrying);
    const action = actions[clipKey];
    if (!action) return; // defensive only — resolveClipName's own fallback chain shouldn't miss

    if (currentClip.current) actions[currentClip.current]?.fadeOut(0.1);
    const config = ANIMATION_CONFIGS[animName];
    action.reset();
    action.setLoop(config.loop ? THREE.LoopRepeat : THREE.LoopOnce, config.loop ? Infinity : 1);
    if (!config.loop) action.clampWhenFinished = true;
    action.fadeIn(0.1).play();
    currentClip.current = clipKey;
    interactionAnim.current = kind;
    interactionEventFired.current = false;
  };

  // Fires once the active Pickup/Place action actually finishes, per the mixer's own internal
  // time — not a hand-rolled elapsed-time counter. That distinction matters: this component caps
  // its own per-frame delta at 1/30s (see useFrame below) for physics stability, but drei's
  // useAnimations updates the mixer with the RAW frame delta every frame regardless. A separately
  // accumulated counter using the capped delta would drift behind the mixer's actual time on any
  // dropped frame (exactly the kind of hiccup this game's mobile targets are prone to), firing the
  // "done" callback late relative to what's already visually finished. Reading the event straight
  // from the mixer sidesteps that class of bug entirely.
  useEffect(() => {
    const handleFinished = (event: { action: THREE.AnimationAction }) => {
      if (!interactionAnim.current) return;
      if (event.action.getClip().name !== currentClip.current) return;
      interactionAnim.current = null;
      onInteractionAnimDone();
    };
    mixer.addEventListener('finished', handleFinished);
    return () => mixer.removeEventListener('finished', handleFinished);
  }, [mixer, onInteractionAnimDone]);

  useEffect(() => {
    if (pickupTrigger === lastPickupTrigger.current) return;
    lastPickupTrigger.current = pickupTrigger;
    startInteractionAnim('pickup', 'Pickup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupTrigger]);

  useEffect(() => {
    if (placeTrigger === lastPlaceTrigger.current) return;
    lastPlaceTrigger.current = placeTrigger;
    startInteractionAnim('place', 'Place');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeTrigger]);

  useFrame((_, rawDelta) => {
    const node = groupRef.current;
    if (!node) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const input = inputRef.current;

    velocityY.current -= GRAVITY * delta;

    const runningInteractionAnim = interactionAnim.current;
    if (runningInteractionAnim) {
      // Locked in a one-shot pickup/place animation: no movement/jump input, gravity still applies.
      input.jumpPressed = false;
      // action.time is the mixer's own per-action clock — always in sync with what's actually
      // rendering (see the 'finished'-listener comment above for why that matters). Completion
      // itself is handled by that listener, not here; this only watches for the mid-clip "grab"
      // moment (~55% in, see INTERACTION_EVENT_FRACTION).
      const action = currentClip.current ? actions[currentClip.current] : undefined;
      const clipDuration = action?.getClip().duration ?? 0;
      const frac = action && clipDuration > 0 ? action.time / clipDuration : 0;
      if (!interactionEventFired.current && frac >= INTERACTION_EVENT_FRACTION) {
        interactionEventFired.current = true;
        (runningInteractionAnim === 'pickup' ? onPickupAttach : onPlaceRelease)();
      }
    } else {
      if (input.jumpPressed && grounded.current) {
        velocityY.current = JUMP_VELOCITY;
        grounded.current = false;
        squashY.current = 1.2; // stretch on takeoff
      }
      input.jumpPressed = false; // edge-triggered: consume this frame's press
    }

    let nextY = node.position.y + velocityY.current * delta;
    if (nextY <= 0) {
      nextY = 0;
      if (velocityY.current < 0) squashY.current = 0.78; // squash on landing
      velocityY.current = 0;
      grounded.current = true;
    }
    node.position.y = nextY;

    squashY.current = THREE.MathUtils.damp(squashY.current, 1, 8, delta);
    node.scale.set(avatar.scale, avatar.scale * squashY.current, avatar.scale);

    // Input (moveX = strafe, moveZ = forward/back) is relative to the camera's current orbit
    // angle, not raw world axes — pushing "up" always means "the direction the camera is
    // looking", exactly like the joystick/right-stick relationship in Roblox-style games.
    const magnitude = runningInteractionAnim ? 0 : Math.hypot(input.moveX, input.moveZ);
    const isMoving = magnitude > 0.05;
    const running = input.running && magnitude >= RUN_INPUT_THRESHOLD;
    const speed = running ? RUN_SPEED : WALK_SPEED;

    if (isMoving) {
      const camYaw = yawRef.current;
      camForward.copy(localForward).applyEuler(new THREE.Euler(0, camYaw, 0));
      camRight.copy(localRight).applyEuler(new THREE.Euler(0, camYaw, 0));

      worldMove.set(0, 0, 0)
        .addScaledVector(camForward, -input.moveZ)
        .addScaledVector(camRight, input.moveX)
        .normalize()
        .multiplyScalar(speed * delta);

      const bound = roomHalfSize - PLAYER_HALF_EXTENT;
      const nextX = THREE.MathUtils.clamp(node.position.x + worldMove.x, -bound, bound);
      const nextZ = THREE.MathUtils.clamp(node.position.z + worldMove.z, -bound, bound);

      const testPoint = new THREE.Vector3(nextX, 0.5, nextZ);
      const blocked = grounded.current && obstacles.some((box) => box.containsPoint(testPoint));
      if (!blocked) {
        node.position.x = nextX;
        node.position.z = nextZ;
      }

      const targetYaw = Math.atan2(worldMove.x, worldMove.z);
      node.rotation.y = THREE.MathUtils.damp(node.rotation.y, targetYaw, TURN_DAMPING, delta);
    }

    if (!runningInteractionAnim) {
      const nextState: PlayerState3D = !grounded.current
        ? (velocityY.current > 0 ? 'jump' : 'fall')
        : isMoving
          ? (running ? 'run' : 'walk')
          : 'idle';

      if (nextState !== currentState.current) {
        currentState.current = nextState;
        onStateChange?.(nextState);
      }

      // Standing still while carrying uses the 'carry' hold-pose loop via resolveClipName (falls
      // back to idle for avatars without one, e.g. Tiburón Boy/Dino Boy — see GameAvatar.ts).
      // Walking/running while carrying still uses the plain locomotion clips today — Carry has no
      // leg cycle by design (README §19), so it only ever substitutes for idle, never walk/run;
      // the carried item just tracks the hand bone through them regardless (see below).
      const clipKey = nextState === 'fall'
        ? avatar.animations.jump
        : nextState === 'idle' && isCarrying
          ? resolveClipName(avatar.animations, 'Carry', true)
          : avatar.animations[nextState];
      if (clipKey !== currentClip.current) {
        if (currentClip.current) actions[currentClip.current]?.fadeOut(0.15);
        actions[clipKey]?.reset().fadeIn(0.15).play();
        currentClip.current = clipKey;
      }
    }

    // Carried item follows the hand bone (Gilbertito/Gael/Tutu) or a fixed offset above the head
    // (any avatar without a bone named 'RightHand', e.g. the Tiburón Boy/Dino Boy placeholder).
    const itemGroup = carriedItemGroupRef.current;
    if (itemGroup) {
      const bone = handBoneRef.current;
      if (bone) {
        bone.getWorldPosition(scratchHandPos);
        bone.getWorldQuaternion(scratchHandQuat);
        node.getWorldQuaternion(scratchRootQuat).invert();
        node.worldToLocal(scratchHandPos);
        itemGroup.position.copy(scratchHandPos);
        itemGroup.quaternion.copy(scratchRootQuat).multiply(scratchHandQuat);
      } else {
        itemGroup.position.copy(FALLBACK_ITEM_OFFSET);
        itemGroup.quaternion.identity();
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {carriedItem && <group ref={carriedItemGroupRef}>{carriedItem}</group>}
    </group>
  );
};

export default Player3D;

// Preload every distinct model URL referenced by the avatar roster (today, both point at the same placeholder).
new Set(Object.values(AVATARS_3D).map((avatar) => avatar.modelUrl)).forEach((url) => useGLTF.preload(url));
