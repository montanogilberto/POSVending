import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';
import type { ControlInput3D } from './ControlTypes';
import { WORLD3D_CONFIG } from './world3dConstants';

/**
 * 'pickup' | 'dropoff' | 'collectible' | 'door' are wired to actual behavior today.
 * 'inspect' | 'open' | 'talk' are declared now — costs nothing at runtime — so a
 * future level (open a drawer, inspect a toy, talk to an NPC) is a new
 * Interactable3D entry, not a rewrite of this InteractionManager.
 */
export type InteractionKind = 'pickup' | 'dropoff' | 'collectible' | 'door' | 'inspect' | 'open' | 'talk';

export interface Interactable3D {
  id: string;
  kind: InteractionKind;
  position: THREE.Vector3;
  promptText: string;
  isAvailable: boolean;
}

export interface PromptState {
  text: string;
  position: [number, number, number];
}

interface InteractionManager3DProps {
  playerGroupRef: React.RefObject<THREE.Group | null>;
  inputRef: React.RefObject<ControlInput3D>;
  interactables: Interactable3D[];
  onInteract: (interactable: Interactable3D) => void;
  onPromptChange: (prompt: PromptState | null) => void;
}

/** Finds the nearest available interactable in range each frame and consumes the edge-triggered interact press. */
const InteractionManager3D: React.FC<InteractionManager3DProps> = ({
  playerGroupRef, inputRef, interactables, onInteract, onPromptChange,
}) => {
  const nearestId = useRef<string | null>(null);

  useFrame(() => {
    const player = playerGroupRef.current;
    if (!player) return;
    const input = inputRef.current;

    let nearest: Interactable3D | null = null;
    let nearestDistance: number = WORLD3D_CONFIG.INTERACT_RADIUS;
    for (const candidate of interactables) {
      if (!candidate.isAvailable) continue;
      const distance = player.position.distanceTo(candidate.position);
      if (distance <= nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    if (nearest?.id !== nearestId.current) {
      nearestId.current = nearest?.id ?? null;
      onPromptChange(nearest
        ? { text: nearest.promptText, position: [nearest.position.x, nearest.position.y + 0.9, nearest.position.z] }
        : null);
    }

    if (input.interactPressed) {
      input.interactPressed = false;
      const active = interactables.find((candidate) => candidate.id === nearestId.current);
      if (active) onInteract(active);
    }
  });

  return null;
};

export default InteractionManager3D;
